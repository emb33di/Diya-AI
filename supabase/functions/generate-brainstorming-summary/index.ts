import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface BrainstormingRequest {
  conversation_id: string;
  user_id: string;
}

interface BrainstormingSummary {
  key_themes: string[];
  personal_stories: string[];
  essay_angles: string[];
  writing_prompts: string[];
  structure_suggestions: string[];
}

interface BrainstormingResponse {
  success: boolean;
  summary?: BrainstormingSummary;
  message: string;
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

// Brainstorming prompt
const BRAINSTORMING_PROMPT = `You are an expert college essay counselor. Based on the following conversation transcript, generate a comprehensive brainstorming summary to help the student develop their college essays.

CONVERSATION TRANSCRIPT:
{transcript}

INSTRUCTIONS:
1. Analyze the conversation to identify key themes, personal stories, and potential essay angles
2. Generate specific writing prompts that could help the student develop their essays
3. Provide structure suggestions for organizing their thoughts
4. Focus on authentic, personal content that would make compelling college essays

RESPONSE FORMAT (JSON only):
{
  "key_themes": [
    "Theme 1: Academic passion and research interests",
    "Theme 2: Leadership and community involvement",
    "Theme 3: Personal growth and challenges overcome"
  ],
  "personal_stories": [
    "Story about overcoming a specific challenge",
    "Story about a meaningful experience or relationship",
    "Story about discovering a passion or interest"
  ],
  "essay_angles": [
    "How your background shaped your perspective",
    "A moment that changed your worldview",
    "Your unique contribution to your community"
  ],
  "writing_prompts": [
    "Describe a time when you had to adapt to a difficult situation",
    "What is something you're passionate about and why?",
    "How have you grown as a person in the last few years?"
  ],
  "structure_suggestions": [
    "Start with a specific moment or scene",
    "Use dialogue to bring conversations to life",
    "End by connecting back to your future goals"
  ]
}

Focus on generating authentic, personal content that would help the student write compelling college essays.`

async function generateBrainstormingSummary(transcript: string): Promise<BrainstormingSummary> {
  if (!GEMINI_API_KEY) {
    throw new Error('Google API key not configured')
  }

  const prompt = BRAINSTORMING_PROMPT.replace('{transcript}', transcript)

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
    return {
      key_themes: parsed.key_themes || [],
      personal_stories: parsed.personal_stories || [],
      essay_angles: parsed.essay_angles || [],
      writing_prompts: parsed.writing_prompts || [],
      structure_suggestions: parsed.structure_suggestions || []
    }
  } catch (error) {
    console.error('Error generating brainstorming summary:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { conversation_id, user_id }: BrainstormingRequest = await req.json()

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

    // Generate brainstorming summary
    const summary = await generateBrainstormingSummary(conversation.transcript)

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        message: `Successfully generated brainstorming summary with ${summary.key_themes.length} themes`,
        conversation_id,
        user_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-brainstorming-summary:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error generating brainstorming summary: ${error.message}`,
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
