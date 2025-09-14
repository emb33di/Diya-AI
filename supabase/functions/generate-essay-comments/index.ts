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
  commentCategory: 'overall' | 'inline';
  commentSubcategory: 'opening' | 'body' | 'conclusion' | 'opening-sentence' | 'transition' | 'paragraph-specific';
}

interface EssayCommentResponse {
  success: boolean;
  comments: AIComment[];
  message: string;
  essayId: string;
  structuredComments: {
    overall: {
      opening: AIComment[];
      body: AIComment[];
      conclusion: AIComment[];
    };
    inline: {
      openingSentence: AIComment[];
      transitions: AIComment[];
      paragraphSpecific: AIComment[];
    };
  };
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// AI prompt for BIG PICTURE strategic essay analysis
const BIG_PICTURE_ANALYSIS_PROMPT = `You are an expert college admissions counselor specializing in strategic essay analysis. Analyze the following college application essay and provide exactly 3 overall comments: one for the opening, one for the body, and one for the conclusion.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

INSTRUCTIONS:
Provide exactly 3 overall comments that address:

1. OPENING COMMENT: Evaluate the opening paragraph(s) - how well does it set up the essay? Does it establish a clear thesis? Is it engaging?

2. BODY COMMENT: Evaluate the body paragraphs - how well do they develop the main argument? Are they well-organized and supported with evidence?

3. CONCLUSION COMMENT: Evaluate the conclusion - does it effectively wrap up the essay? Does it reinforce the main message?

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "anchorText": "opening paragraph text",
      "commentText": "strategic feedback on the opening",
      "commentType": "suggestion|critique|praise|question",
      "confidenceScore": 0.85,
      "commentCategory": "overall",
      "commentSubcategory": "opening",
      "startPos": 0,
      "endPos": 100
    },
    {
      "anchorText": "body paragraphs text",
      "commentText": "strategic feedback on the body",
      "commentType": "suggestion|critique|praise|question",
      "confidenceScore": 0.85,
      "commentCategory": "overall",
      "commentSubcategory": "body",
      "startPos": 100,
      "endPos": 200
    },
    {
      "anchorText": "conclusion paragraph text",
      "commentText": "strategic feedback on the conclusion",
      "commentType": "suggestion|critique|praise|question",
      "confidenceScore": 0.85,
      "commentCategory": "overall",
      "commentSubcategory": "conclusion",
      "startPos": 200,
      "endPos": 300
    }
  ]
}

Focus on strategic improvements that will have the biggest impact on admissions success.`

async function generateBigPictureComments(essayContent: string, essayPrompt?: string): Promise<AIComment[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured')
  }

  const prompt = BIG_PICTURE_ANALYSIS_PROMPT
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
      confidenceScore: comment.confidenceScore || 0.5,
      commentCategory: comment.commentCategory || 'overall',
      commentSubcategory: comment.commentSubcategory || 'body'
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
    ai_model: 'gemini-2.5-flash-lite',
    confidence_score: comment.confidenceScore,
    resolved: false,
    agent_type: 'big-picture', // Mark this as big picture agent
    comment_category: comment.commentCategory,
    comment_subcategory: comment.commentSubcategory
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

    // Generate Big Picture AI comments
    console.log(`Generating Big Picture AI comments for essay ${essayId}`)
    const aiComments = await generateBigPictureComments(essayContent, essayPrompt)

    // Save comments to database
    await saveCommentsToDatabase(essayId, userId, aiComments)

    // Organize comments into structured format
    const structuredComments = {
      overall: {
        opening: aiComments.filter(c => c.commentCategory === 'overall' && c.commentSubcategory === 'opening'),
        body: aiComments.filter(c => c.commentCategory === 'overall' && c.commentSubcategory === 'body'),
        conclusion: aiComments.filter(c => c.commentCategory === 'overall' && c.commentSubcategory === 'conclusion')
      },
      inline: {
        openingSentence: aiComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'opening-sentence'),
        transitions: aiComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'transition'),
        paragraphSpecific: aiComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'paragraph-specific')
      }
    }

    const response: EssayCommentResponse = {
      success: true,
      comments: aiComments,
      message: `Generated ${aiComments.length} Big Picture AI comments successfully`,
      essayId,
      structuredComments
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
