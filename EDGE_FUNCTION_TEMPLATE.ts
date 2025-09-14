import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the request and response
interface EssayCommentRequest {
  essayId: string;
  essayContent: string;
  essayPrompt?: string;
  userId: string;
}

interface AIComment {
  textSelection: {
    start: { pos: number; path: number[] };
    end: { pos: number; path: number[] };
  };
  anchorText: string;
  commentText: string;
  commentType: 'suggestion' | 'critique' | 'praise' | 'question';
  confidenceScore: number;
}

interface EssayCommentResponse {
  success: boolean;
  comments: AIComment[];
  message: string;
  essayId: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

// AI prompt for essay analysis
const ESSAY_ANALYSIS_PROMPT = `You are an expert college admissions counselor and essay reviewer. Analyze the following college application essay and provide specific, actionable feedback.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

INSTRUCTIONS:
1. Identify 3-5 specific sections of text that need improvement or deserve praise
2. For each section, provide:
   - The exact text excerpt (anchor text)
   - Specific feedback (suggestion, critique, praise, or question)
   - Confidence score (0.0-1.0)
   - Character positions for highlighting

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "anchorText": "exact text from essay",
      "commentText": "specific feedback",
      "commentType": "suggestion|critique|praise|question",
      "confidenceScore": 0.85,
      "startPos": 150,
      "endPos": 200
    }
  ]
}

FOCUS ON:
- Clarity and specificity
- Personal voice and authenticity
- Structure and flow
- Grammar and style
- Answering the prompt effectively
- Word choice and impact

Be constructive and specific. Avoid generic feedback.`

async function generateAIComments(essayContent: string, essayPrompt?: string): Promise<AIComment[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured')
  }

  const prompt = ESSAY_ANALYSIS_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', essayContent)

  const requestBody = {
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
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API')
    }

    const responseText = data.candidates[0].content.parts[0].text
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Convert to our format with proper text selection
    return parsedResponse.comments.map((comment: any, index: number) => ({
      textSelection: {
        start: { pos: comment.startPos || 0, path: [0] },
        end: { pos: comment.endPos || comment.startPos || 0, path: [0] }
      },
      anchorText: comment.anchorText || '',
      commentText: comment.commentText || '',
      commentType: comment.commentType || 'suggestion',
      confidenceScore: comment.confidenceScore || 0.5
    }))

  } catch (error) {
    console.error('Error generating AI comments:', error)
    throw new Error(`Failed to generate AI comments: ${error.message}`)
  }
}

async function checkExistingAIComments(essayId: string, userId: string): Promise<boolean> {
  const { data: existingComments, error } = await supabase
    .from('essay_comments')
    .select('id')
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .eq('ai_generated', true)
    .limit(1)

  if (error) {
    throw new Error(`Failed to check existing comments: ${error.message}`)
  }

  return existingComments && existingComments.length > 0
}

async function saveCommentsToDatabase(essayId: string, userId: string, comments: AIComment[]): Promise<void> {
  const commentInserts = comments.map(comment => ({
    essay_id: essayId,
    user_id: userId,
    text_selection: comment.textSelection,
    anchor_text: comment.anchorText,
    comment_text: comment.commentText,
    comment_type: comment.commentType,
    ai_generated: true,
    ai_model: 'gemini-1.5-flash',
    confidence_score: comment.confidenceScore,
    resolved: false
  }))

  const { error } = await supabase
    .from('essay_comments')
    .insert(commentInserts)

  if (error) {
    throw new Error(`Failed to save comments: ${error.message}`)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { essayId, essayContent, essayPrompt, userId }: EssayCommentRequest = await req.json()

    // Validate required fields
    if (!essayId || !essayContent || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: essayId, essayContent, userId',
          comments: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate essay content length
    if (essayContent.length < 50) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Essay content too short for meaningful analysis',
          comments: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Authentication required',
          comments: []
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if AI comments already exist for this essay
    console.log(`Checking for existing AI comments for essay ${essayId}`)
    const hasExistingAIComments = await checkExistingAIComments(essayId, userId)
    
    if (hasExistingAIComments) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'AI comments have already been generated for this essay. Each essay can only receive AI feedback once.',
          comments: []
        }),
        {
          status: 409, // Conflict status code
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate AI comments
    console.log(`Generating AI comments for essay ${essayId}`)
    const aiComments = await generateAIComments(essayContent, essayPrompt)

    // Save comments to database
    await saveCommentsToDatabase(essayId, userId, aiComments)

    const response: EssayCommentResponse = {
      success: true,
      comments: aiComments,
      message: `Generated ${aiComments.length} AI comments successfully`,
      essayId
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-essay-comments:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
        comments: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
