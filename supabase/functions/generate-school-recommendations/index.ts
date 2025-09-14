import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// School recommendation prompt
const SCHOOL_RECOMMENDATION_PROMPT = `You are an expert college admissions counselor. Based on the following conversation transcript, generate personalized school recommendations for the student.

CONVERSATION TRANSCRIPT:
{transcript}

INSTRUCTIONS:
1. Analyze the student's academic profile, interests, preferences, and goals from the conversation
2. Generate 8-12 school recommendations across different categories (reach, target, safety)
3. For each school, provide:
   - School name (exact official name)
   - School type (e.g., "Private University", "Public University", "Liberal Arts College")
   - Category (reach/target/safety based on student's profile)
   - Acceptance rate (if known)
   - School ranking (if known)
   - First round deadline (if known)
   - Brief notes explaining why this school fits the student
   - Student thesis (key reasons for recommendation)

RESPONSE FORMAT (JSON only):
{
  "recommendations": [
    {
      "school": "Harvard University",
      "school_type": "Private University",
      "category": "reach",
      "acceptance_rate": "3.4%",
      "school_ranking": "#3",
      "first_round_deadline": "January 1",
      "notes": "Strong academic program in your intended major with excellent research opportunities",
      "student_thesis": "Your academic achievements and research interests align well with Harvard's programs"
    }
  ]
}

Focus on schools that genuinely match the student's profile and interests.`

async function generateSchoolRecommendations(transcript: string): Promise<SchoolRecommendation[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('Google API key not configured')
  }

  const prompt = SCHOOL_RECOMMENDATION_PROMPT.replace('{transcript}', transcript)

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
      conversation_id: conversationId,
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

    // Generate school recommendations
    const recommendations = await generateSchoolRecommendations(conversation.transcript)

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