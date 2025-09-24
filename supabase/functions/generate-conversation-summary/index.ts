import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface ConversationSummaryRequest {
  conversation_id: string;
  user_id: string;
  summary_type: 'brainstorming' | 'resume_context';
}

interface BrainstormingSummary {
  key_themes: string[];
  personal_stories: string[];
  essay_angles: string[];
  writing_prompts: string[];
  structure_suggestions: string[];
}

interface ResumeContextSummary {
  academic_achievements: string[];
  extracurricular_activities: string[];
  leadership_experience: string[];
  community_service: string[];
  work_experience: string[];
  personal_qualities: string[];
  career_interests: string[];
  unique_attributes: string[];
}

interface ConversationSummaryResponse {
  success: boolean;
  message: string;
  summary?: BrainstormingSummary | ResumeContextSummary;
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

// Brainstorming analysis prompt
const BRAINSTORMING_PROMPT = `You are an expert college admissions counselor specializing in essay brainstorming. Analyze the following conversation transcript and extract key information for essay writing.

CONVERSATION TRANSCRIPT:
{transcript}

INSTRUCTIONS:
Extract and organize the following information from the conversation:

1. **Key Themes**: 3-5 main themes or topics discussed
2. **Personal Stories**: Specific anecdotes, experiences, or stories mentioned
3. **Essay Angles**: Potential essay topics or approaches based on the conversation
4. **Writing Prompts**: Specific prompts or questions that could guide essay writing
5. **Structure Suggestions**: Recommendations for organizing essay content

RESPONSE FORMAT (JSON only):
{
  "key_themes": ["theme1", "theme2", "theme3"],
  "personal_stories": ["story1", "story2", "story3"],
  "essay_angles": ["angle1", "angle2", "angle3"],
  "writing_prompts": ["prompt1", "prompt2", "prompt3"],
  "structure_suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}

Focus on actionable insights that will help the student write compelling college essays.`

// Resume context analysis prompt
const RESUME_CONTEXT_PROMPT = `You are an expert college admissions counselor. Analyze the following conversation transcript and extract information relevant for resume building and college applications.

CONVERSATION TRANSCRIPT:
{transcript}

INSTRUCTIONS:
Extract and organize the following information from the conversation:

1. **Academic Achievements**: Grades, test scores, academic honors, coursework
2. **Extracurriculars**: Clubs, sports, hobbies, interests
3. **Leadership Experience**: Leadership roles, responsibilities, initiatives
4. **Community Service**: Volunteer work, community involvement, social impact
5. **Work Experience**: Jobs, internships, projects, entrepreneurial activities
6. **Personal Qualities**: Character traits, values, personality insights
7. **Career Interests**: Future goals, career aspirations, academic interests
8. **Unique Attributes**: Special talents, unique experiences, distinguishing factors

RESPONSE FORMAT (JSON only):
{
  "academic_achievements": ["achievement1", "achievement2"],
  "extracurricular_activities": ["activity1", "activity2"],
  "leadership_experience": ["experience1", "experience2"],
  "community_service": ["service1", "service2"],
  "work_experience": ["work1", "work2"],
  "personal_qualities": ["quality1", "quality2"],
  "career_interests": ["interest1", "interest2"],
  "unique_attributes": ["attribute1", "attribute2"]
}

Focus on concrete, specific information that can be used for resume building and college applications.`

async function generateConversationSummary(
  transcript: string, 
  summaryType: 'brainstorming' | 'resume_context'
): Promise<BrainstormingSummary | ResumeContextSummary> {
  if (!GEMINI_API_KEY) {
    throw new Error('Google API key not configured')
  }

  const prompt = summaryType === 'brainstorming' 
    ? BRAINSTORMING_PROMPT.replace('{transcript}', transcript)
    : RESUME_CONTEXT_PROMPT.replace('{transcript}', transcript)

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
    return parsed
  } catch (error) {
    console.error('Error generating conversation summary:', error)
    throw error
  }
}

async function saveSummaryToDatabase(
  userId: string,
  conversationId: string,
  summaryType: string,
  summary: BrainstormingSummary | ResumeContextSummary
): Promise<void> {
  try {
    const tableName = summaryType === 'brainstorming' ? 'brainstorming_summaries' : 'resume_context_summaries'
    
    // Check if summary already exists
    const { data: existing } = await supabase
      .from(tableName)
      .select('id')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .single()

    if (existing) {
      // Update existing summary
      const { error } = await supabase
        .from(tableName)
        .update({
          summary_data: summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (error) throw error
    } else {
      // Insert new summary
      const { error } = await supabase
        .from(tableName)
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          summary_data: summary,
          created_at: new Date().toISOString()
        })

      if (error) throw error
    }
  } catch (error) {
    console.error('Error saving summary to database:', error)
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { conversation_id, user_id, summary_type }: ConversationSummaryRequest = await req.json()

    if (!conversation_id || !user_id || !summary_type) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: conversation_id, user_id, summary_type',
          conversation_id: conversation_id || '',
          user_id: user_id || ''
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!['brainstorming', 'resume_context'].includes(summary_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid summary_type. Must be "brainstorming" or "resume_context"',
          conversation_id,
          user_id
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

    // Generate conversation summary
    const summary = await generateConversationSummary(
      conversation.transcript, 
      summary_type as 'brainstorming' | 'resume_context'
    )

    // Save summary to database
    await saveSummaryToDatabase(user_id, conversation_id, summary_type, summary)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully generated ${summary_type} summary`,
        summary,
        conversation_id,
        user_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-conversation-summary:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error generating summary: ${error.message}`,
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