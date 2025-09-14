import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the request and response
interface EssayCommentRequest {
  essayId: string;
  essayContent: string;
  essayPrompt?: string;
  userId: string;
  skipExistingCheck?: boolean; // Allow orchestrator to bypass existing comment check
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
  paragraphIndex?: number; // Track which paragraph this comment is about
  isUnchangedParagraphFeedback?: boolean; // Flag for unchanged paragraph messages
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
  paragraphAnalysis?: {
    totalParagraphs: number;
    analyzedParagraphs: number;
    unchangedParagraphs: number;
    paragraphResults: Array<{
      paragraphIndex: number;
      paragraphText: string;
      comments: AIComment[];
      success: boolean;
      error?: string;
      isUnchanged?: boolean;
      skippedForUnchanged?: boolean;
    }>;
  };
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

// Enhanced Paragraph Agent Prompt - Individual paragraph analysis
const PARAGRAPH_ANALYSIS_PROMPT = `You are an expert writing coach specializing in individual paragraph analysis. Analyze the following paragraph from a college application essay and provide specific, actionable feedback.

ESSAY PROMPT:
{prompt}

PARAGRAPH CONTENT:
{paragraph}

PARAGRAPH CONTEXT:
- Paragraph {paragraphIndex} of {totalParagraphs}
- Position: {paragraphPosition} (opening/middle/concluding)

CRITICAL GUIDANCE:
- Do not make up any facts about the student or their experiences
- Be direct in guidance, not vague or general - provide specific, actionable feedback
- Focus on what is actually written, not assumptions

INSTRUCTIONS:
Focus on this specific paragraph's:
1. Hook effectiveness (if opening paragraph)
2. Topic sentence clarity and strength
3. Evidence integration and support
4. Sentence variety and flow within the paragraph
5. Word choice and precision
6. Paragraph coherence and organization
7. Transition effectiveness (if not opening paragraph)
8. Conclusion strength (if concluding paragraph)

SPECIFIC PARAGRAPH FOCUS AREAS:
- Is the paragraph focused on one thesis/theme or does it stray into different ideas?
- Does the paragraph follow "Show don't tell" principles effectively?
- Is the voice/tone of the essay preserved in this paragraph?

Provide 1-2 focused comments that address:
- What makes this paragraph effective or ineffective?
- How can this specific paragraph be improved?
- Are there structural or stylistic issues within this paragraph?

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "anchorText": "exact text from this paragraph that you want to highlight - be precise and copy the text exactly as it appears",
      "commentText": "specific feedback for this paragraph only",
      "commentType": "suggestion|critique|praise|question",
      "confidenceScore": 0.85
    }
  ]
}

IMPORTANT: 
- The "anchorText" must be the EXACT text from the paragraph that you want to comment on
- Copy the text precisely as it appears, including punctuation
- Do not include "startPos" or "endPos" - we will find the text automatically
- Choose meaningful phrases or sentences that clearly represent what you're commenting on

Focus on paragraph-specific improvements. Be precise about what works or doesn't work in this individual paragraph.`

// Function to split essay into paragraphs using consistent double line break logic
function splitIntoParagraphs(essayContent: string): string[] {
  console.log('Raw essay content:', essayContent.substring(0, 200) + '...')
  
  // First, handle HTML paragraph tags by converting them to double line breaks
  let processedContent = essayContent
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n') // Convert </p><p> to double line breaks
    .replace(/<p[^>]*>/gi, '') // Remove opening <p> tags
    .replace(/<\/p>/gi, '') // Remove closing </p> tags
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> tags to newlines
    .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
    .replace(/&nbsp;/g, ' ') // Convert non-breaking spaces
    .replace(/&amp;/g, '&') // Convert HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
  
  console.log('Processed content:', processedContent.substring(0, 200) + '...')
  
  // Split by double line breaks (consistent separator)
  const paragraphs = processedContent
    .split(/\n\s*\n/) // Split on double newlines with optional whitespace
    .map(p => p.trim()) // Remove leading/trailing whitespace
    .filter(p => p.length > 0) // Remove empty paragraphs
  
  console.log(`Split into ${paragraphs.length} paragraphs using double line breaks`)
  
  // If no paragraphs found, treat entire content as one paragraph
  if (paragraphs.length === 0 && processedContent.length > 0) {
    paragraphs.push(processedContent)
    console.log('Fallback: Using entire content as one paragraph')
  }
  
  console.log(`Final result: ${paragraphs.length} paragraphs`)
  return paragraphs
}

// Function to determine paragraph position
function getParagraphPosition(index: number, total: number): string {
  if (index === 0) return 'opening'
  if (index === total - 1) return 'concluding'
  return 'middle'
}

// Function to check if paragraph has changed from previous version
async function checkParagraphChange(essayId: string, checkpointId: string, paragraphIndex: number): Promise<{
  hasChanged: boolean;
  hasExistingComments: boolean;
  commentCount: number;
}> {
  try {
    // Get paragraph comparison data
    const { data: checkpoint, error: checkpointError } = await supabase
      .from('essay_checkpoints')
      .select('paragraph_changes')
      .eq('id', checkpointId)
      .single()

    if (checkpointError || !checkpoint?.paragraph_changes) {
      console.log('No paragraph comparison data available, assuming changed')
      return { hasChanged: true, hasExistingComments: false, commentCount: 0 }
    }

    const paragraphChanges = checkpoint.paragraph_changes
    const unchangedParagraphs = paragraphChanges.unchanged || []
    const hasChanged = !unchangedParagraphs.includes(paragraphIndex)

    if (!hasChanged) {
      // Check for existing comments on this paragraph
      const { data: comments, error: commentsError } = await supabase
        .from('essay_comments')
        .select('id')
        .eq('essay_id', essayId)
        .eq('checkpoint_id', checkpointId)
        .eq('paragraph_index', paragraphIndex)
        .eq('ai_generated', true)

      if (commentsError) {
        console.error('Error fetching existing comments:', commentsError)
        return { hasChanged, hasExistingComments: false, commentCount: 0 }
      }

      const commentCount = comments?.length || 0
      return { hasChanged, hasExistingComments: commentCount > 0, commentCount }
    }

    return { hasChanged, hasExistingComments: false, commentCount: 0 }
  } catch (error) {
    console.error('Error checking paragraph change:', error)
    return { hasChanged: true, hasExistingComments: false, commentCount: 0 }
  }
}

// Function to create unchanged paragraph feedback comment
function createUnchangedParagraphComment(
  paragraphText: string,
  hasExistingComments: boolean,
  commentCount: number,
  paragraphIndex: number
): AIComment {
  const message = hasExistingComments
    ? `It does not look like there was any change made to this paragraph. See older comments for further guidance. (${commentCount} previous comment${commentCount !== 1 ? 's' : ''} available)`
    : `It does not look like there was any change made to this paragraph. Consider revising this section to address the essay prompt more effectively.`

  return {
    textSelection: {
      start: { pos: 0, path: [0, 0] },
      end: { pos: paragraphText.length, path: [0, paragraphText.length] }
    },
    anchorText: paragraphText.substring(0, Math.min(50, paragraphText.length)) + (paragraphText.length > 50 ? '...' : ''),
    commentText: message,
    commentType: 'suggestion',
    confidenceScore: 1.0,
    commentCategory: 'inline',
    commentSubcategory: 'paragraph-specific',
    paragraphIndex,
    isUnchangedParagraphFeedback: true
  }
}

// Function to analyze individual paragraph with AI
async function analyzeIndividualParagraph(
  paragraph: string,
  paragraphIndex: number,
  totalParagraphs: number,
  essayPrompt: string,
  essayContent: string
): Promise<{ comments: AIComment[]; success: boolean; error?: string }> {
  if (!GEMINI_API_KEY) {
    return {
      comments: [],
      success: false,
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  try {
    const paragraphPosition = getParagraphPosition(paragraphIndex, totalParagraphs)
    
    const prompt = PARAGRAPH_ANALYSIS_PROMPT
      .replace('{prompt}', essayPrompt || 'No specific prompt provided')
      .replace('{paragraph}', paragraph)
      .replace('{paragraphIndex}', (paragraphIndex + 1).toString())
      .replace('{totalParagraphs}', totalParagraphs.toString())
      .replace('{paragraphPosition}', paragraphPosition)

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
        maxOutputTokens: 1024,
      }
    }

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
    const comments: AIComment[] = parsedResponse.comments.map((comment: any) => ({
      textSelection: {
        start: { pos: 0, path: [0, 0] },
        end: { pos: paragraph.length, path: [0, paragraph.length] }
      },
      anchorText: comment.anchorText || paragraph.substring(0, 50) + '...',
      commentText: comment.commentText,
      commentType: comment.commentType || 'suggestion',
      confidenceScore: comment.confidenceScore || 0.8,
      commentCategory: 'inline',
      commentSubcategory: 'paragraph-specific',
      paragraphIndex
    }))

    return { comments, success: true }
  } catch (error) {
    console.error(`Error analyzing paragraph ${paragraphIndex + 1}:`, error)
    return {
      comments: [],
      success: false,
      error: error.message
    }
  }
}

// Function to check for existing AI comments
async function checkExistingAIComments(essayId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('essay_comments')
    .select('id')
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .eq('ai_generated', true)
    .limit(1)

  if (error) {
    console.error('Error checking existing comments:', error)
    return false
  }

  return (data && data.length > 0)
}

// Function to save comments to database
async function saveCommentsToDatabase(essayId: string, userId: string, comments: AIComment[]): Promise<void> {
  if (comments.length === 0) return

  // Get the current active checkpoint
  const { data: checkpoint, error: checkpointError } = await supabase
    .from('essay_checkpoints')
    .select('id')
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (checkpointError || !checkpoint) {
    throw new Error('No active checkpoint found for this essay')
  }

  const commentRecords = comments.map(comment => ({
    essay_id: essayId,
    user_id: userId,
    checkpoint_id: checkpoint.id,
    text_selection: comment.textSelection,
    anchor_text: comment.anchorText,
    comment_text: comment.commentText,
    comment_type: comment.commentType,
    ai_generated: true,
    ai_model: 'gemini-2.5-flash-lite',
    confidence_score: comment.confidenceScore,
    paragraph_index: comment.paragraphIndex
  }))

  const { error } = await supabase
    .from('essay_comments')
    .insert(commentRecords)

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
    const { essayId, essayContent, essayPrompt, userId, skipExistingCheck }: EssayCommentRequest = await req.json()

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

    // Check for existing AI comments (skip if called from orchestrator)
    if (!skipExistingCheck) {
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
    }

    // Get current checkpoint ID for change detection
    let { data: checkpoint, error: checkpointError } = await supabase
      .from('essay_checkpoints')
      .select('id')
      .eq('essay_id', essayId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    // If no checkpoint exists, create one first
    if (checkpointError || !checkpoint) {
      console.log('No active checkpoint found, creating one...')
      
      // Create a fresh draft checkpoint first
      const { data: newCheckpointId, error: createError } = await supabase.rpc('create_fresh_draft_checkpoint', {
        essay_uuid: essayId,
        user_uuid: userId,
        essay_content: essayContent,
        essay_title: null,
        essay_prompt: essayPrompt || null,
        version_name_param: 'Initial Version'
      })

      if (createError || !newCheckpointId) {
        console.error('Failed to create checkpoint:', createError)
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to create checkpoint for this essay',
            comments: []
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Get the newly created checkpoint
      const { data: newCheckpoint, error: newCheckpointError } = await supabase
        .from('essay_checkpoints')
        .select('id')
        .eq('id', newCheckpointId)
        .single()

      if (newCheckpointError || !newCheckpoint) {
        console.error('Failed to retrieve new checkpoint:', newCheckpointError)
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to retrieve newly created checkpoint',
            comments: []
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      checkpoint = newCheckpoint
      console.log('Created new checkpoint:', checkpoint.id)
    }

    // Split essay into paragraphs
    console.log(`Analyzing individual paragraphs for essay ${essayId} with change detection`)
    const paragraphs = splitIntoParagraphs(essayContent)
    
    if (paragraphs.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Could not identify paragraphs in essay',
          comments: []
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Analyze each paragraph with change detection
    const paragraphResults = []
    const allComments: AIComment[] = []
    let unchangedParagraphs = 0

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]
      
      // Skip very short paragraphs (less than 20 characters)
      if (paragraph.length < 20) {
        paragraphResults.push({
          paragraphIndex: i,
          paragraphText: paragraph,
          comments: [],
          success: true,
          error: 'Paragraph too short for analysis',
          isUnchanged: false,
          skippedForUnchanged: false
        })
        continue
      }

      console.log(`Analyzing paragraph ${i + 1}/${paragraphs.length}`)
      
      // Check if paragraph has changed
      const changeInfo = await checkParagraphChange(essayId, checkpoint.id, i)
      
      if (!changeInfo.hasChanged) {
        // Paragraph unchanged - provide appropriate feedback
        unchangedParagraphs++
        const unchangedComment = createUnchangedParagraphComment(
          paragraph,
          changeInfo.hasExistingComments,
          changeInfo.commentCount,
          i
        )
        
        paragraphResults.push({
          paragraphIndex: i,
          paragraphText: paragraph,
          comments: [unchangedComment],
          success: true,
          isUnchanged: true,
          skippedForUnchanged: false
        })
        
        allComments.push(unchangedComment)
        continue
      }

      // Paragraph has changed - analyze with AI
      const result = await analyzeIndividualParagraph(
        paragraph,
        i,
        paragraphs.length,
        essayPrompt || '',
        essayContent
      )

      paragraphResults.push({
        paragraphIndex: i,
        paragraphText: paragraph,
        comments: result.comments,
        success: result.success,
        error: result.error,
        isUnchanged: false,
        skippedForUnchanged: false
      })

      allComments.push(...result.comments)
    }

    // Save comments to database
    if (allComments.length > 0) {
      await saveCommentsToDatabase(essayId, userId, allComments)
    }

    const successfulParagraphs = paragraphResults.filter(r => r.success).length
    const totalComments = allComments.length

    // Organize comments into structured format
    const structuredComments = {
      overall: {
        opening: allComments.filter(c => c.commentCategory === 'overall' && c.commentSubcategory === 'opening'),
        body: allComments.filter(c => c.commentCategory === 'overall' && c.commentSubcategory === 'body'),
        conclusion: allComments.filter(c => c.commentCategory === 'overall' && c.commentSubcategory === 'conclusion')
      },
      inline: {
        openingSentence: allComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'opening-sentence'),
        transitions: allComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'transition'),
        paragraphSpecific: allComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'paragraph-specific')
      }
    }

    // Convert to orchestrator format
    const response = {
      success: totalComments > 0,
      comments: allComments,
      message: `Analyzed ${paragraphs.length} paragraphs (${unchangedParagraphs} unchanged), generated ${totalComments} comments from ${successfulParagraphs} successful analyses`,
      essayId,
      structuredComments,
      // Add agentResults to match orchestrator format
      agentResults: {
        bigPicture: {
          success: false,
          comments: [],
          agentType: 'big-picture'
        },
        paragraph: {
          success: true,
          comments: allComments,
          agentType: 'paragraph'
        }
      },
      // Add checkpoint info if available
      checkpoint: null
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-essay-comments-paragraph-with-change-detection:', error)
    
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
