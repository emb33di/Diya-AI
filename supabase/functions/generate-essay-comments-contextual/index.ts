import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the new contextual anchoring system
interface EssayParagraph {
  paragraphId: string; // e.g., 'para_uuid_12345'
  text: string;
}

interface AIInput {
  documentId: string;
  content: EssayParagraph[];
}

interface AICommentOutput {
  comment: string;
  paragraphId: string; // The ID of the paragraph this comment refers to
  anchorText: string;  // The exact substring from that paragraph's text to highlight
  commentType: 'suggestion' | 'critique' | 'praise' | 'question';
  confidenceScore: number;
  commentCategory: 'overall' | 'inline';
  commentSubcategory: 'opening' | 'body' | 'conclusion' | 'opening-sentence' | 'transition' | 'paragraph-specific' | 'paragraph-quality' | 'final-sentence';
  agentType?: 'big-picture' | 'paragraph' | 'weaknesses' | 'strengths' | 'reconciliation';
}

interface ContextualAICommentResponse {
  success: boolean;
  comments: AICommentOutput[];
  message: string;
  documentId: string;
}

interface EssayCommentRequest {
  essayId: string;
  essayContent: AIInput; // Now uses structured input
  essayPrompt?: string;
  essayTitle?: string;
  userId: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// NEW: Contextual Anchoring AI prompt
const CONTEXTUAL_ANCHORING_PROMPT = `You are an expert college admissions counselor specializing in strategic essay analysis. Analyze the following college application essay and provide targeted feedback using the new contextual anchoring system.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT (Structured with Paragraph IDs):
{content}

INSTRUCTIONS:
You will receive the essay content as a structured array of paragraphs, each with a unique paragraphId and text content. Your task is to:

1. Analyze each paragraph for potential improvements
2. For each comment you make, you MUST:
   - Use the exact paragraphId from the input
   - Provide the exact anchorText substring from that paragraph's text
   - Ensure the anchorText exists verbatim in the paragraph's text

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "comment": "Your feedback text here",
      "paragraphId": "para_1234567890_0",
      "anchorText": "exact text from the paragraph",
      "commentType": "suggestion|critique|praise|question",
      "confidenceScore": 0.85,
      "commentCategory": "overall|inline",
      "commentSubcategory": "opening|body|conclusion|opening-sentence|transition|paragraph-specific|paragraph-quality|final-sentence",
      "agentType": "paragraph"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Your response MUST be a valid JSON array of objects
- For each comment, you must provide the paragraphId from the input context
- The anchorText MUST be an exact substring from that paragraph's text
- Do not invent anchorText - use only text that exists in the paragraph
- Provide 3-5 targeted comments focusing on the most impactful improvements
- Focus on strategic improvements that will have the biggest impact on admissions success

Focus on:
- Opening paragraph engagement and thesis clarity
- Body paragraph development and evidence
- Conclusion effectiveness
- Transition quality
- Overall essay flow and coherence`

async function generateContextualAIComments(essayContent: AIInput, essayPrompt?: string): Promise<AICommentOutput[]> {
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured')
  }

  // Format the structured content for the prompt
  const formattedContent = essayContent.content.map((para, index) => 
    `Paragraph ${index + 1} (ID: ${para.paragraphId}):\n"${para.text}"`
  ).join('\n\n')

  const formattedPrompt = CONTEXTUAL_ANCHORING_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', formattedContent)

  const requestBody = {
    contents: [{
      parts: [{
        text: formattedPrompt
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
    console.log('AI Response for contextual anchoring:', responseText)
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', responseText)
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    console.log('Parsed contextual response:', JSON.stringify(parsedResponse, null, 2))
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Validate that all comments have required fields
    const validatedComments: AICommentOutput[] = parsedResponse.comments.map((comment: any, index: number) => {
      // Validate required fields
      if (!comment.comment || typeof comment.comment !== 'string') {
        throw new Error(`Comment ${index}: missing or invalid 'comment' field`)
      }
      if (!comment.paragraphId || typeof comment.paragraphId !== 'string') {
        throw new Error(`Comment ${index}: missing or invalid 'paragraphId' field`)
      }
      if (!comment.anchorText || typeof comment.anchorText !== 'string') {
        throw new Error(`Comment ${index}: missing or invalid 'anchorText' field`)
      }

      // Validate that the paragraphId exists in our input
      const paragraph = essayContent.content.find(p => p.paragraphId === comment.paragraphId)
      if (!paragraph) {
        throw new Error(`Comment ${index}: paragraphId '${comment.paragraphId}' not found in input`)
      }

      // Validate that anchorText exists in the paragraph
      if (!paragraph.text.includes(comment.anchorText)) {
        throw new Error(`Comment ${index}: anchorText '${comment.anchorText}' not found in paragraph '${comment.paragraphId}'`)
      }

      // Validate comment type
      const validTypes = ['suggestion', 'critique', 'praise', 'question']
      if (!validTypes.includes(comment.commentType)) {
        throw new Error(`Comment ${index}: invalid commentType '${comment.commentType}'`)
      }

      // Validate confidence score
      if (typeof comment.confidenceScore !== 'number' || 
          comment.confidenceScore < 0 || comment.confidenceScore > 1) {
        throw new Error(`Comment ${index}: invalid confidenceScore '${comment.confidenceScore}'`)
      }

      return {
        comment: comment.comment,
        paragraphId: comment.paragraphId,
        anchorText: comment.anchorText,
        commentType: comment.commentType,
        confidenceScore: comment.confidenceScore,
        commentCategory: comment.commentCategory || 'inline',
        commentSubcategory: comment.commentSubcategory || 'paragraph-specific',
        agentType: comment.agentType || 'paragraph'
      } as AICommentOutput
    })

    console.log(`Successfully generated ${validatedComments.length} contextual comments`)
    return validatedComments

  } catch (error) {
    console.error('Error in contextual AI comment generation:', error)
    throw new Error(`Failed to generate contextual AI comments: ${error.message}`)
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { essayId, essayContent, essayPrompt, essayTitle, userId }: EssayCommentRequest = await req.json()

    if (!essayId || !essayContent || !userId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: essayId, essayContent, userId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate that essayContent is structured properly
    if (!essayContent.content || !Array.isArray(essayContent.content)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid essayContent structure. Expected {content: EssayParagraph[]}' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Generating contextual AI comments for essay ${essayId} with ${essayContent.content.length} paragraphs`)

    // Generate AI comments using the new contextual anchoring system
    const aiComments = await generateContextualAIComments(essayContent, essayPrompt)

    // Convert to database format and save comments
    const commentsToSave = aiComments.map(comment => ({
      essay_id: essayId,
      user_id: userId,
      text_selection: {
        start: { pos: 0, path: [0, 0] }, // Will be updated by frontend
        end: { pos: 0, path: [0, 0] }
      },
      anchor_text: comment.anchorText,
      comment_text: comment.comment,
      comment_type: comment.commentType,
      ai_generated: true,
      ai_model: 'gemini-2.5-flash-lite',
      confidence_score: comment.confidenceScore,
      comment_category: comment.commentCategory,
      comment_subcategory: comment.commentSubcategory,
      agent_type: comment.agentType,
      // Store paragraph ID for contextual anchoring
      paragraph_id: comment.paragraphId
    }))

    // Save comments to database
    const { data: savedComments, error: saveError } = await supabase
      .from('essay_comments')
      .insert(commentsToSave)
      .select()

    if (saveError) {
      console.error('Error saving contextual comments:', saveError)
      throw new Error(`Failed to save comments: ${saveError.message}`)
    }

    console.log(`Successfully saved ${savedComments?.length || 0} contextual comments to database`)

    const response: ContextualAICommentResponse = {
      success: true,
      comments: aiComments,
      message: `Successfully generated ${aiComments.length} contextual AI comments`,
      documentId: essayId
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in contextual comment generation:', error)
    
    const errorResponse = {
      success: false,
      comments: [],
      message: `Failed to generate contextual AI comments: ${error.message}`,
      documentId: ''
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
