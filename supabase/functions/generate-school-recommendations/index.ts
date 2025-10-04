import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getUserProgramTypeFromProfile } from '../_shared/programTypeUtils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface SchoolRecommendationRequest {
  conversation_id: string;
  user_id: string;
}

interface SchoolRecommendation {
  school: string;
  school_type: string;
  category: 'reach' | 'target' | 'safety';
  acceptance_rate: string;
  school_ranking: string;
  first_round_deadline: string;
  notes: string;
  student_thesis: string;
}

interface SchoolRecommendationResponse {
  success: boolean;
  message: string;
  recommendations: SchoolRecommendation[];
  conversation_id: string;
  user_id: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

// School recommendation prompt template
const SCHOOL_RECOMMENDATION_PROMPT_TEMPLATE = `You are an expert {program_type} admissions counselor. Based on the following conversation transcript, generate personalized school recommendations for the student.

CONVERSATION TRANSCRIPT:
{transcript}

PROGRAM TYPE: {program_type}

INSTRUCTIONS:
1. Analyze the student's academic profile, interests, preferences, and goals from the conversation
2. Generate 8-12 {program_type} school recommendations across different categories (reach, target, safety)
3. For each school, provide:
   - School name (exact official name)
   - School type (must be one of: private, public, liberal_arts, research_university, community_college, technical_institute, ivy_league)
   - Category (reach/target/safety based on student's profile)
   - Acceptance rate (if known)
   - School ranking (if known)
   - First round deadline (if known)
   - Brief notes explaining why this school fits the student
   - Student thesis (key reasons for recommendation)

SPECIAL CONSIDERATIONS FOR {program_type}:
{program_specific_guidance}

RESPONSE FORMAT (JSON only):
{
  "recommendations": [
    {
      "school": "Harvard University",
      "school_type": "ivy_league",
      "category": "reach",
      "acceptance_rate": "3.4%",
      "school_ranking": "#3",
      "first_round_deadline": "January 1",
      "notes": "Strong academic program in your intended major with excellent research opportunities",
      "student_thesis": "Your academic achievements and research interests align well with Harvard's programs"
    }
  ]
}

Focus on schools that genuinely match the student's profile and interests for {program_type} applications.`

// Program-specific guidance for different application types
const PROGRAM_GUIDANCE = {
  'undergraduate': 'Focus on undergraduate programs, liberal arts education, research opportunities for undergraduates, campus culture, and academic fit. Consider factors like class size, professor accessibility, undergraduate research opportunities, and campus life.',
  'mba': 'Focus on MBA programs, business school rankings, career outcomes, alumni networks, and industry connections. Consider factors like GMAT/GRE scores, work experience, career goals, and program format (full-time, part-time, executive).',
  'llm': 'Focus on law school programs, legal specializations, bar exam pass rates, and career outcomes in law. Consider factors like LSAT scores, undergraduate GPA, legal interests, and career goals in the legal field.',
  'phd': 'Focus on doctoral programs, research opportunities, faculty advisors, funding availability, and academic reputation. Consider factors like research interests, GRE scores, academic background, and career goals in academia or research.',
  'masters': 'Focus on master\'s programs, specialized fields of study, research opportunities, and career advancement. Consider factors like GRE scores, undergraduate background, career goals, and program specialization.'
};

async function generateSchoolRecommendations(transcript: string, programType: string = 'undergraduate'): Promise<SchoolRecommendation[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('Google API key not configured')
  }

  const programSpecificGuidance = PROGRAM_GUIDANCE[programType as keyof typeof PROGRAM_GUIDANCE] || PROGRAM_GUIDANCE['undergraduate'];
  
  const prompt = SCHOOL_RECOMMENDATION_PROMPT_TEMPLATE
    .replace('{transcript}', transcript)
    .replace('{program_type}', programType)
    .replace('{program_specific_guidance}', programSpecificGuidance)

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
          temperature: 0.7,
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
    return parsed.recommendations || []
  } catch (error) {
    console.error('Error generating school recommendations:', error)
    throw error
  }
}

async function saveRecommendationsToDatabase(
  userId: string, 
  conversationId: string, 
  recommendations: SchoolRecommendation[]
): Promise<void> {
  try {
    // First, delete existing recommendations for this user
    await supabase
      .from('school_recommendations')
      .delete()
      .eq('student_id', userId)

    // Insert new recommendations
    const records = recommendations.map(rec => ({
      student_id: userId,
      school: rec.school,
      school_type: rec.school_type,
      category: rec.category,
      acceptance_rate: rec.acceptance_rate,
      school_ranking: rec.school_ranking,
      first_round_deadline: rec.first_round_deadline,
      notes: rec.notes,
      student_thesis: rec.student_thesis,
      created_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('school_recommendations')
      .insert(records)

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
  } catch (error) {
    console.error('Error saving recommendations to database:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { conversation_id, user_id }: SchoolRecommendationRequest = await req.json()

    if (!conversation_id || !user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: conversation_id, user_id',
          recommendations: [],
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
      .from('conversation_metadata')
      .select('transcript')
      .eq('conversation_id', conversation_id)
      .eq('user_id', user_id)
      .single()

    if (conversationError || !conversation) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Conversation not found or access denied',
          recommendations: [],
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
          recommendations: [],
          conversation_id,
          user_id
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user's program type
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('applying_to')
      .eq('user_id', user_id)
      .maybeSingle()

    if (profileError) {
      console.warn('Could not fetch user profile:', profileError.message)
    }

    // Use centralized mapping function
    const userProgramType = getUserProgramTypeFromProfile(userProfile, 'undergraduate')
    console.log(`Generating school recommendations for program type: ${userProgramType}`)

    // Generate school recommendations
    const recommendations = await generateSchoolRecommendations(conversation.transcript, userProgramType)

    if (recommendations.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No recommendations generated. Please try again.',
          recommendations: [],
          conversation_id,
          user_id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Save recommendations to database
    await saveRecommendationsToDatabase(user_id, conversation_id, recommendations)

    // Automatically sync regular decision deadlines for the new schools
    try {
      const { data: deadlineSyncData, error: deadlineSyncError } = await supabase.functions.invoke('auto-sync-deadlines', {
        body: { user_id },
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
        }
      })

      if (deadlineSyncError) {
        console.warn('Failed to auto-sync deadlines:', deadlineSyncError.message)
      } else {
        console.log('Auto-synced deadlines:', deadlineSyncData)
      }
    } catch (deadlineError) {
      console.warn('Error during auto-sync deadlines:', deadlineError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully generated ${recommendations.length} school recommendations`,
        recommendations,
        conversation_id,
        user_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-school-recommendations:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error generating recommendations: ${error.message}`,
        recommendations: [],
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