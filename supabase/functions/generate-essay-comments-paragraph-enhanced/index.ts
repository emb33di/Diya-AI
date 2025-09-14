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
  paragraphIndex?: number; // Track which paragraph this comment is about
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
    paragraphResults: Array<{
      paragraphIndex: number;
      paragraphText: string;
      comments: AIComment[];
      success: boolean;
      error?: string;
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

// Function to find character positions of a paragraph within the full essay
// This function calculates positions based on paragraph order rather than text search
function findParagraphPositions(paragraphText: string, fullEssay: string, paragraphIndex: number, allParagraphs: string[]): { start: number; end: number } {
  // Calculate cumulative position based on paragraph index
  let start = 0
  
  // Sum up the lengths of all previous paragraphs plus their separators
  for (let i = 0; i < paragraphIndex; i++) {
    start += allParagraphs[i].length
    // Add separator length (double newline = 2 characters)
    if (i < paragraphIndex - 1) {
      start += 2
    }
  }
  
  const end = start + paragraphText.length
  
  // Validate that the calculated position makes sense
  if (start >= fullEssay.length) {
    console.warn(`Calculated start position ${start} exceeds essay length ${fullEssay.length}`)
    return { start: 0, end: paragraphText.length }
  }
  
  if (end > fullEssay.length) {
    console.warn(`Calculated end position ${end} exceeds essay length ${fullEssay.length}`)
    return { start, end: fullEssay.length }
  }
  
  return { start, end }
}

async function analyzeIndividualParagraph(
  paragraphText: string, 
  paragraphIndex: number, 
  totalParagraphs: number, 
  essayPrompt: string,
  fullEssay: string
): Promise<{ comments: AIComment[]; success: boolean; error?: string }> {
  
  if (!GEMINI_API_KEY) {
    return {
      comments: [],
      success: false,
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  const paragraphPosition = getParagraphPosition(paragraphIndex, totalParagraphs)
  // Note: This function doesn't have access to allParagraphs, so we'll use a simplified approach
  const positions = { start: 0, end: paragraphText.length } // Simplified for individual paragraph analysis

  const prompt = PARAGRAPH_ANALYSIS_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{paragraph}', paragraphText)
    .replace('{paragraphIndex}', paragraphIndex.toString())
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
      maxOutputTokens: 1024, // Smaller for individual paragraphs
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

    // Convert to our format with text-based selection and paragraph tracking
    const comments: AIComment[] = parsedResponse.comments.map((comment: any) => {
      // Prioritize anchorText from AI response
      let anchorText = comment.anchorText || '';
      
      // Validate that anchorText exists and is meaningful
      if (!anchorText || anchorText.trim().length < 3) {
        console.warn(`Invalid or missing anchorText for comment: ${comment.commentText}`);
        // Use first sentence of paragraph as fallback
        const firstSentence = paragraphText.split('.')[0].trim();
        anchorText = firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
      }
      
      // Clean the anchor text
      anchorText = anchorText.trim();
      
      // Create a placeholder textSelection - the frontend will find the actual position using anchorText
      // We still need to provide some position data for the database, but it won't be used for highlighting
      const placeholderPos = positions.start + Math.min(50, paragraphText.length);
      
      return {
        textSelection: {
          start: { pos: positions.start, path: [0] },
          end: { pos: placeholderPos, path: [0] }
        },
        anchorText,
        commentText: comment.commentText || '',
        commentType: comment.commentType || 'suggestion',
        confidenceScore: comment.confidenceScore || 0.5,
        commentCategory: 'inline',
        commentSubcategory: 'paragraph-specific',
        paragraphIndex
      };
    })

    return {
      comments,
      success: true
    }

  } catch (error) {
    console.error(`Error analyzing paragraph ${paragraphIndex}:`, error)
    return {
      comments: [],
      success: false,
      error: `Failed to analyze paragraph ${paragraphIndex}: ${error.message}`
    }
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
    agent_type: 'paragraph',
    paragraph_index: comment.paragraphIndex, // Store paragraph index
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

    // Split essay into paragraphs
    console.log(`Analyzing individual paragraphs for essay ${essayId}`)
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

    // Analyze each paragraph individually
    const paragraphResults = []
    const allComments: AIComment[] = []

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]
      
      // Skip very short paragraphs (less than 20 characters)
      if (paragraph.length < 20) {
        paragraphResults.push({
          paragraphIndex: i,
          paragraphText: paragraph,
          comments: [],
          success: true,
          error: 'Paragraph too short for analysis'
        })
        continue
      }

      console.log(`Analyzing paragraph ${i + 1}/${paragraphs.length}`)
      
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
        error: result.error
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

    const response: EssayCommentResponse = {
      success: totalComments > 0,
      comments: allComments,
      message: `Analyzed ${paragraphs.length} paragraphs, generated ${totalComments} comments from ${successfulParagraphs} successful analyses`,
      essayId,
      structuredComments,
      paragraphAnalysis: {
        totalParagraphs: paragraphs.length,
        analyzedParagraphs: successfulParagraphs,
        paragraphResults
      }
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-essay-comments-paragraph-enhanced:', error)
    
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
