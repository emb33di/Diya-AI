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

// Paragraph Agent Prompt - Structural feedback
const PARAGRAPH_ANALYSIS_PROMPT = `You are an expert writing coach specializing in paragraph-level structural analysis. Analyze the following college application essay focusing on paragraph structure, transitions, and writing mechanics.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT:
{content}

INSTRUCTIONS:
Focus on PARAGRAPH-LEVEL elements:
1. Hook effectiveness and opening impact
2. Paragraph transitions and flow
3. Evidence integration and support
4. Sentence variety and structure
5. Word choice and precision
6. Grammar and style issues
7. Paragraph organization and coherence

Provide 3-4 structural comments that address:
- Are the paragraph hooks engaging and effective?
- Do transitions between ideas flow smoothly?
- Is evidence well-integrated and persuasive?
- Are there opportunities for better word choice or sentence structure?
- Are paragraphs well-organized and coherent?

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "anchorText": "exact text from essay (focused on specific paragraphs/sentences)",
      "commentText": "structural feedback focusing on paragraph-level improvements",
      "commentType": "suggestion|critique|praise|question",
      "confidenceScore": 0.85,
      "startPos": 150,
      "endPos": 200
    }
  ]
}

Focus on specific, actionable improvements to paragraph structure, transitions, evidence integration, and writing mechanics. Be precise about sentence-level improvements.`

async function generateParagraphComments(essayContent: string, essayPrompt?: string): Promise<AIComment[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured')
  }

  const prompt = PARAGRAPH_ANALYSIS_PROMPT
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
      commentCategory: 'inline',
      commentSubcategory: 'paragraph-specific'
    }))

  } catch (error) {
    console.error('Error generating paragraph comments:', error)
    throw new Error(`Failed to generate paragraph comments: ${error.message}`)
  }
}

async function checkExistingAIComments(essayId: string, userId: string): Promise<boolean> {
  const { data: existingComments, error } = await supabase
    .from('essay_comments')
    .select('id')
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .eq('ai_generated', true)
    .eq('agent_type', 'paragraph')
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
    agent_type: 'paragraph', // Mark this as paragraph agent
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

    // Check if paragraph AI comments already exist for this essay
    console.log(`Checking for existing paragraph AI comments for essay ${essayId}`)
    const hasExistingAIComments = await checkExistingAIComments(essayId, userId)
    
    if (hasExistingAIComments) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Paragraph AI comments have already been generated for this essay.',
          comments: []
        }),
        {
          status: 409, // Conflict status code
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate Paragraph AI comments
    console.log(`Generating Paragraph AI comments for essay ${essayId}`)
    const aiComments = await generateParagraphComments(essayContent, essayPrompt)

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
      message: `Generated ${aiComments.length} Paragraph AI comments successfully`,
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
    console.error('Error in generate-essay-comments-paragraph:', error)
    
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
