import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface ConversationResumeRequest {
  user_id: string;
}

interface ConversationResumeResponse {
  success: boolean;
  context?: string;
  session_count: number;
  conversations?: any[];
  message?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

// Conversation resume prompt
const CONVERSATION_RESUME_PROMPT = `You are an AI counselor helping a student resume their college application journey. Based on the following conversation history, generate a comprehensive context summary that will help the student continue their conversation naturally.

CONVERSATION HISTORY:
{conversations}

INSTRUCTIONS:
1. Analyze all previous conversations to understand the student's academic profile, interests, goals, and progress
2. Identify key themes, achievements, challenges, and aspirations mentioned across conversations
3. Create a natural, conversational context that summarizes where the student left off
4. Include relevant details about their school list, essay topics, deadlines, and application status
5. Make it feel like a natural continuation of previous sessions

RESPONSE FORMAT:
Generate a conversational context summary (not JSON) that:
- Summarizes the student's academic profile and interests
- Mentions their school list and application progress
- Highlights any key achievements or challenges discussed
- Sets up the conversation for continued counseling
- Feels natural and personalized

Keep it concise but comprehensive - aim for 2-3 paragraphs that capture the essence of their journey so far.`

async function generateConversationResumeContext(conversations: any[]): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Google API key not configured')
  }

  // Format conversations for the prompt
  const conversationText = conversations.map((conv, index) => 
    `Session ${index + 1} (${conv.created_at}):\n${conv.transcript || 'No transcript available'}\n`
  ).join('\n---\n\n')

  const prompt = CONVERSATION_RESUME_PROMPT.replace('{conversations}', conversationText)

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
          maxOutputTokens: 1024,
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

    return generatedText.trim()
  } catch (error) {
    console.error('Error generating conversation resume context:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id }: ConversationResumeRequest = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required field: user_id',
          session_count: 0
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user's previous conversations
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, transcript, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10) // Get last 10 conversations

    if (conversationsError) {
      throw new Error(`Failed to fetch conversations: ${conversationsError.message}`)
    }

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No previous conversations found',
          session_count: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate context from conversations
    const context = await generateConversationResumeContext(conversations)

    return new Response(
      JSON.stringify({
        success: true,
        context,
        session_count: conversations.length,
        conversations: conversations.map(conv => ({
          id: conv.id,
          created_at: conv.created_at,
          transcript_length: conv.transcript?.length || 0
        }))
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-conversation-resume-context:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error generating conversation resume context: ${error.message}`,
        session_count: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
