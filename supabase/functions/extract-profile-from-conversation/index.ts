import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface ProfileExtractionRequest {
  conversation_id: string;
  user_id: string;
}

interface ProfileData {
  academic_interests: string[];
  extracurricular_activities: string[];
  achievements: string[];
  challenges_overcome: string[];
  personal_values: string[];
  career_goals: string[];
  leadership_experience: string[];
  community_involvement: string[];
  hobbies: string[];
  personality_traits: string[];
}

interface ProfileExtractionResponse {
  success: boolean;
  message: string;
  conversation_id: string;
  user_id: string;
  profile_data?: ProfileData;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

// Profile extraction prompt
const PROFILE_EXTRACTION_PROMPT = `You are an expert college admissions counselor. Based on the following conversation transcript, extract comprehensive profile information about the student to help with their college applications.

CONVERSATION TRANSCRIPT:
{transcript}

INSTRUCTIONS:
1. Analyze the conversation to extract key information about the student's academic interests, activities, achievements, and personal qualities
2. Identify specific examples, stories, and details that could be used in college applications
3. Extract information across multiple categories to build a comprehensive profile
4. Focus on concrete, specific examples rather than general statements

RESPONSE FORMAT (JSON only):
{
  "academic_interests": [
    "Specific subject areas or fields of study mentioned",
    "Research interests or academic projects discussed"
  ],
  "extracurricular_activities": [
    "Clubs, sports, or activities mentioned",
    "Leadership roles or positions held"
  ],
  "achievements": [
    "Awards, honors, or recognitions mentioned",
    "Academic or personal accomplishments discussed"
  ],
  "challenges_overcome": [
    "Difficulties or obstacles the student has faced",
    "How they handled or overcame challenges"
  ],
  "personal_values": [
    "Core beliefs or principles mentioned",
    "What matters most to the student"
  ],
  "career_goals": [
    "Future career aspirations or plans",
    "Professional interests or goals"
  ],
  "leadership_experience": [
    "Times when the student took initiative or led others",
    "Leadership roles or responsibilities mentioned"
  ],
  "community_involvement": [
    "Volunteer work or community service mentioned",
    "Ways the student has given back to their community"
  ],
  "hobbies": [
    "Personal interests or activities outside of school",
    "Things the student enjoys doing for fun"
  ],
  "personality_traits": [
    "Character qualities or personality characteristics mentioned",
    "How others describe the student or how they describe themselves"
  ]
}

Extract specific, concrete examples from the conversation. If a category doesn't have relevant information, use an empty array.`

async function extractProfileFromConversation(transcript: string): Promise<ProfileData> {
  if (!GEMINI_API_KEY) {
    throw new Error('Google API key not configured')
  }

  const prompt = PROFILE_EXTRACTION_PROMPT.replace('{transcript}', transcript)

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText) {
      throw new Error('No content generated from Google API')
    }

    // Parse the JSON response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      academic_interests: parsed.academic_interests || [],
      extracurricular_activities: parsed.extracurricular_activities || [],
      achievements: parsed.achievements || [],
      challenges_overcome: parsed.challenges_overcome || [],
      personal_values: parsed.personal_values || [],
      career_goals: parsed.career_goals || [],
      leadership_experience: parsed.leadership_experience || [],
      community_involvement: parsed.community_involvement || [],
      hobbies: parsed.hobbies || [],
      personality_traits: parsed.personality_traits || []
    }
  } catch (error) {
    console.error('Error extracting profile from conversation:', error)
    throw error
  }
}

async function saveProfileToDatabase(userId: string, profileData: ProfileData): Promise<void> {
  try {
    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to check existing profile: ${fetchError.message}`)
    }

    const profileRecord = {
      user_id: userId,
      academic_interests: profileData.academic_interests,
      extracurricular_activities: profileData.extracurricular_activities,
      achievements: profileData.achievements,
      challenges_overcome: profileData.challenges_overcome,
      personal_values: profileData.personal_values,
      career_goals: profileData.career_goals,
      leadership_experience: profileData.leadership_experience,
      community_involvement: profileData.community_involvement,
      hobbies: profileData.hobbies,
      personality_traits: profileData.personality_traits,
      last_updated: new Date().toISOString()
    }

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(profileRecord)
        .eq('user_id', userId)

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert(profileRecord)

      if (insertError) {
        throw new Error(`Failed to create profile: ${insertError.message}`)
      }
    }
  } catch (error) {
    console.error('Error saving profile to database:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { conversation_id, user_id }: ProfileExtractionRequest = await req.json()

    if (!conversation_id || !user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: conversation_id, user_id',
          conversation_id: conversation_id || '',
          user_id: user_id || ''
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get conversation transcript
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('transcript')
      .eq('id', conversation_id)
      .eq('user_id', user_id)
      .single()

    if (conversationError || !conversation) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Conversation not found or access denied',
          conversation_id,
          user_id
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!conversation.transcript) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No transcript available for this conversation',
          conversation_id,
          user_id
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract profile information
    const profileData = await extractProfileFromConversation(conversation.transcript)

    // Save profile to database
    await saveProfileToDatabase(user_id, profileData)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile information extracted and saved successfully',
        conversation_id,
        user_id,
        profile_data: profileData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in extract-profile-from-conversation:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error extracting profile: ${error.message}`,
        conversation_id: '',
        user_id: ''
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
