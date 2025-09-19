import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Types for the request and response
interface EssayCommentRequest {
  essayId: string;
  essayContent: string;
  essayPrompt?: string;
  essayTitle?: string;
  userId: string;
}

interface EssayCheckpoint {
  id: string;
  essay_id: string;
  user_id: string;
  checkpoint_number: number;
  version_number: number;
  essay_content: string;
  essay_title?: string;
  essay_prompt?: string;
  ai_feedback_generated_at: string;
  ai_model: string;
  total_comments: number;
  overall_comments: number;
  inline_comments: number;
  opening_sentence_comments: number;
  transition_comments: number;
  paragraph_specific_comments: number;
  average_confidence_score: number;
  average_quality_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  commentSubcategory: 'opening' | 'body' | 'conclusion' | 'opening-sentence' | 'transition' | 'paragraph-specific' | 'paragraph-quality' | 'final-sentence';
  // Extended fields stored in database but not returned in API response
  agentType?: 'big-picture' | 'paragraph' | 'weaknesses' | 'strengths' | 'reconciliation' | 'tone' | 'clarity' | 'grammar_spelling' | 'editor_chief';
  paragraphIndex?: number;
  paragraphId?: string; // NEW: Paragraph ID for contextual anchoring
  transitionScore?: number;
  transitionScoreColor?: string;
  openingSentenceScore?: number;
  openingSentenceScoreColor?: string;
  paragraphQualityScore?: number;
  paragraphQualityScoreColor?: string;
  finalSentenceScore?: number;
  finalSentenceScoreColor?: string;
  // Score fields for the enhanced paragraph agent
  score?: number;
  scoreColor?: string;
  // Reconciliation fields
  reconciliationType?: 'reconciled' | 'strength-enhanced' | 'weakness-enhanced' | 'balanced';
  originalSource?: 'strength' | 'weakness' | 'both';
  // New organization fields
  commentNature?: 'strength' | 'weakness' | 'combined' | 'neutral';
  organizationCategory?: 'overall-strength' | 'overall-weakness' | 'overall-combined' | 'inline';
  reconciliationSource?: 'strength' | 'weakness' | 'both' | 'none';
  // Editor Chief specific fields
  priorityLevel?: 'high' | 'medium' | 'low';
  editorialDecision?: 'approve' | 'revise' | 'reject';
  impactAssessment?: 'admissions_boost' | 'neutral' | 'admissions_hurt';
  // Quality score for big picture agent (1-100 scale)
  qualityScore?: number;
}

interface AgentResponse {
  success: boolean;
  comments: AIComment[];
  error?: string;
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

// Import prompts
import { WEAKNESSES_PROMPT } from './prompts/weaknesses.ts'
import { STRENGTHS_PROMPT } from './prompts/strengths.ts'
import { PARAGRAPH_PROMPT } from './prompts/paragraph.ts'
import { RECONCILIATION_PROMPT } from './prompts/reconciliation.ts'

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

// Function to generate paragraph IDs for contextual anchoring
function generateParagraphIds(paragraphs: string[]): string[] {
  const timestamp = Date.now()
  return paragraphs.map((_, index) => `para_${timestamp}_${index}`)
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

// Comment Quality Validation System
interface CommentQualityMetrics {
  isValid: boolean;
  qualityScore: number; // 0-1
  issues: string[];
  priority: 'high' | 'medium' | 'low';
}

function validateCommentQuality(comment: AIComment, essayContent: string): CommentQualityMetrics {
  const issues: string[] = []
  let qualityScore = 1.0

  // 1. Validate anchor text (more lenient for paragraph-based comments)
  if (!comment.anchorText || comment.anchorText.trim().length === 0) {
    issues.push('Missing or empty anchor text')
    qualityScore -= 0.3
  } else if (comment.anchorText.startsWith('Paragraph ')) {
    // Paragraph-based comments are always valid
    // No penalty for paragraph references
  } else {
    // For other anchor texts, use flexible validation
    const normalizedAnchorText = comment.anchorText.trim().replace(/\s+/g, ' ')
    const normalizedEssayContent = essayContent.replace(/\s+/g, ' ')
    
    if (normalizedEssayContent.indexOf(normalizedAnchorText) === -1) {
      // Try partial matching for shorter anchor texts
      if (normalizedAnchorText.length > 10) {
        const partialMatch = normalizedAnchorText.substring(0, Math.min(20, normalizedAnchorText.length))
        if (normalizedEssayContent.indexOf(partialMatch) === -1) {
          issues.push('Anchor text not found in essay')
          qualityScore -= 0.2
        } else {
          // Partial match found, reduce penalty
          qualityScore -= 0.1
        }
      } else {
        issues.push('Anchor text not found in essay')
        qualityScore -= 0.2
      }
    }
  }

  // 2. Validate comment text quality
  if (!comment.commentText || comment.commentText.trim().length < 10) {
    issues.push('Comment text too short or empty')
    qualityScore -= 0.4
  } else if (comment.commentText.length > 500) {
    issues.push('Comment text too long')
    qualityScore -= 0.1
  }

  // 3. Validate comment specificity
  const vaguePhrases = ['good', 'bad', 'nice', 'interesting', 'could be better', 'needs work']
  const hasVagueLanguage = vaguePhrases.some(phrase => 
    comment.commentText.toLowerCase().includes(phrase)
  )
  if (hasVagueLanguage) {
    issues.push('Comment contains vague language')
    qualityScore -= 0.2
  }

  // 4. Validate text selection accuracy
  if (comment.textSelection) {
    const { start, end } = comment.textSelection
    if (start.pos < 0 || end.pos < start.pos || end.pos > essayContent.length) {
      issues.push('Invalid text selection positions')
      qualityScore -= 0.2
    }
  }

  // 5. Validate confidence score
  if (comment.confidenceScore < 0.3 || comment.confidenceScore > 1.0) {
    issues.push('Invalid confidence score')
    qualityScore -= 0.1
  }

  // 6. Check for actionable feedback (more flexible)
  const actionWords = ['try', 'consider', 'add', 'remove', 'change', 'revise', 'strengthen', 'clarify', 'improve', 'better', 'should', 'could', 'would', 'instead', 'rather']
  const hasActionableAdvice = actionWords.some(word => 
    comment.commentText.toLowerCase().includes(word)
  )
  if (!hasActionableAdvice) {
    issues.push('Comment lacks actionable advice')
    qualityScore -= 0.1  // Reduced penalty
  }

  // Determine priority based on quality score
  let priority: 'high' | 'medium' | 'low' = 'low'
  if (qualityScore < 0.5) priority = 'high'
  else if (qualityScore < 0.8) priority = 'medium'

  return {
    isValid: qualityScore >= 0.5,
    qualityScore: Math.max(0, qualityScore),
    issues,
    priority
  }
}

// Enhanced comment processing with quality validation
function processCommentsWithValidation(comments: AIComment[], essayContent: string): {
  validComments: AIComment[];
  invalidComments: AIComment[];
  qualityMetrics: CommentQualityMetrics[];
} {
  const validComments: AIComment[] = []
  const invalidComments: AIComment[] = []
  const qualityMetrics: CommentQualityMetrics[] = []

  for (const comment of comments) {
    const metrics = validateCommentQuality(comment, essayContent)
    qualityMetrics.push(metrics)

    if (metrics.isValid) {
      // Enhance comment with quality metadata
      const enhancedComment: AIComment = {
        ...comment,
        confidenceScore: Math.max(comment.confidenceScore, metrics.qualityScore)
      }
      validComments.push(enhancedComment)
    } else {
      invalidComments.push(comment)
      console.warn(`Invalid comment detected: ${metrics.issues.join(', ')}`)
    }
  }

  return { validComments, invalidComments, qualityMetrics }
}

// Strategic insights extraction
interface StrategicInsights {
  strengths: string[];
  weaknesses: string[];
  keyThemes: string[];
  strategicRecommendations: string[];
}

function extractStrategicInsights(weaknessesComments: AIComment[], strengthsComments: AIComment[]): StrategicInsights {
  const insights: StrategicInsights = {
    strengths: [],
    weaknesses: [],
    keyThemes: [],
    strategicRecommendations: []
  }

  // Extract weaknesses
  for (const comment of weaknessesComments) {
    const text = comment.commentText.toLowerCase()
    
    if (text.includes('**areas for improvement:**')) {
      const weaknessesSection = comment.commentText.split('**areas for improvement:**')[1] || ''
      if (weaknessesSection.trim()) {
        insights.weaknesses.push(weaknessesSection.trim())
      }
    }
    
    // Extract strategic recommendations from weaknesses
    const sentences = comment.commentText.split(/[.!?]+/).filter(s => s.trim().length > 0)
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase()
      
      if (lowerSentence.includes('should') || lowerSentence.includes('could') || 
          lowerSentence.includes('consider') || lowerSentence.includes('try')) {
        insights.strategicRecommendations.push(sentence.trim())
      }
    }
  }

  // Extract strengths
  for (const comment of strengthsComments) {
    const text = comment.commentText.toLowerCase()
    
    if (text.includes('**strengths:**')) {
      const strengthsSection = comment.commentText.split('**strengths:**')[1] || ''
      if (strengthsSection.trim()) {
        insights.strengths.push(strengthsSection.trim())
      }
    }
    
    // Extract key themes from strengths
    const sentences = comment.commentText.split(/[.!?]+/).filter(s => s.trim().length > 0)
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase()
      
      if (lowerSentence.includes('theme') || lowerSentence.includes('focus') || 
          lowerSentence.includes('message') || lowerSentence.includes('story')) {
        insights.keyThemes.push(sentence.trim())
      }
    }
  }

  return insights
}

// Comment prioritization system
function prioritizeComments(comments: AIComment[]): AIComment[] {
  return comments.sort((a, b) => {
    // Priority factors (higher score = higher priority)
    const getPriorityScore = (comment: AIComment): number => {
      let score = 0

      // High priority subcategories
      if (comment.commentSubcategory === 'opening-sentence') score += 3
      if (comment.commentSubcategory === 'transition') score += 2
      if (comment.commentSubcategory === 'paragraph-quality') score += 2.5
      if (comment.commentSubcategory === 'final-sentence') score += 2
      if (comment.commentSubcategory === 'paragraph-specific') score += 1

      // Comment type priority
      if (comment.commentType === 'critique') score += 2
      if (comment.commentType === 'suggestion') score += 1.5
      if (comment.commentType === 'praise') score += 0.5

      // Confidence score
      score += comment.confidenceScore

      // Comment length (more detailed = higher priority)
      score += Math.min(comment.commentText.length / 100, 1)

      return score
    }

    return getPriorityScore(b) - getPriorityScore(a)
  })
}




async function callEnhancedParagraphAgentWithContext(essayContent: string, essayPrompt?: string, cumulativeContext?: string): Promise<AgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  try {
    const allComments: AIComment[] = []
    let successfulAnalyses = 0

    // Split essay into paragraphs
    console.log('=== STARTING PARAGRAPH SPLITTING ===')
    console.log('Essay content length:', essayContent.length)
    console.log('Essay content type:', typeof essayContent)
    const paragraphs = splitIntoParagraphs(essayContent)
    const paragraphIds = generateParagraphIds(paragraphs)
    
    // Process the essay content to match the paragraph splitting logic
    const processedEssayContent = essayContent
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
    
    console.log(`=== PARAGRAPH SPLITTING COMPLETE ===`)
    console.log(`Split essay into ${paragraphs.length} paragraphs:`, paragraphs.map((p, i) => `Para ${i + 1}: "${p.substring(0, 50)}..."`))
    console.log(`Generated paragraph IDs:`, paragraphIds)
    console.log(`Processed essay content length: ${processedEssayContent.length}`)
    
    if (paragraphs.length === 0) {
      console.log('No paragraphs found, returning empty result')
      return {
        success: allComments.length > 0,
        comments: allComments,
      }
    }

    // Analyze paragraphs in parallel for better performance
    const totalParagraphs = paragraphs.length
    console.log(`Progress: 10% - Analyzing ${totalParagraphs} paragraphs with cumulative context...`)
    console.log(`Paragraph breakdown:`, paragraphs.map((p, i) => `Para ${i + 1}: ${p.length} chars`))
    
    // Process paragraphs in parallel (max 2 at a time to avoid API overload)
    const paragraphPromises = []
    const maxConcurrent = 2
    
    for (let i = 0; i < paragraphs.length; i += maxConcurrent) {
      const batch = paragraphs.slice(i, i + maxConcurrent)
      const batchPromises = batch.map(async (paragraph, batchIndex) => {
        const actualIndex = i + batchIndex
        
        // Process all paragraphs, but handle very short ones differently
        if (paragraph.length < 20) {
          console.log(`Processing short paragraph ${actualIndex + 1} (${paragraph.length} chars): "${paragraph}"`)
          // For very short paragraphs, create a minimal comment
          const paragraphPositions = findParagraphPositions(paragraph, processedEssayContent, actualIndex, paragraphs)
          const fallbackComment: AIComment = {
            textSelection: {
              start: { pos: paragraphPositions.start, path: [0] },
              end: { pos: paragraphPositions.end, path: [0] }
            },
            anchorText: paragraph.split('.')[0].trim().length > 50 ? paragraph.split('.')[0].trim().substring(0, 50) + '...' : paragraph.split('.')[0].trim(),
            commentText: "This paragraph is quite brief. Consider expanding with more specific details or examples to strengthen your argument.",
            commentType: 'suggestion',
            confidenceScore: 0.7,
            commentCategory: 'inline',
            commentSubcategory: 'paragraph-specific',
            paragraphIndex: actualIndex,
            agentType: 'paragraph'
          }
          console.log(`Generated fallback comment for short paragraph ${actualIndex + 1}`)
          return { comments: [fallbackComment], success: true, index: actualIndex }
        }

        const progressPercent = Math.round(10 + (actualIndex / totalParagraphs) * 30)
        console.log(`Progress: ${progressPercent}% - Analyzing paragraph ${actualIndex + 1}/${totalParagraphs} with cumulative context...`)
        
        // Prepare context for the paragraph analysis
        const previousParagraph = actualIndex > 0 ? paragraphs[actualIndex - 1] : ''
        const paragraphPosition = getParagraphPosition(actualIndex, paragraphs.length)
        
        // Create enhanced prompt with cumulative context
        const contextSection = cumulativeContext ? `
CUMULATIVE ANALYSIS CONTEXT:
${cumulativeContext}
` : 'No previous analysis context available'
        
        const enhancedPrompt = PARAGRAPH_PROMPT
          .replace('{paragraphIndex}', actualIndex.toString())
          .replace('{totalParagraphs}', paragraphs.length.toString())
          .replace('{paragraphPosition}', paragraphPosition)
          .replace('{previousParagraph}', previousParagraph)
          .replace('{strategicContext}', contextSection)
        
        // Analyze paragraph with cumulative context
        console.log(`Analyzing paragraph ${actualIndex + 1} with cumulative context:`, enhancedPrompt.substring(0, 200) + '...')
        
        try {
          // Add retry logic for paragraph analysis
          let paragraphResult: AgentResponse
          let retryCount = 0
          const maxRetries = 2
          
          // Use request queue for paragraph analysis
          paragraphResult = await requestQueue.add(() => callAgent(enhancedPrompt, paragraph, essayPrompt, 'paragraph'), `paragraph-${actualIndex + 1}`)
          console.log(`Paragraph ${actualIndex + 1} result:`, paragraphResult)
          console.log(`Paragraph ${actualIndex + 1} generated ${paragraphResult.comments?.length || 0} comments`)
          
          if (paragraphResult.success && paragraphResult.comments.length > 0) {
            // Enforce single comment constraint for paragraph agent
            if (paragraphResult.comments.length !== 1) {
              console.warn(`Paragraph agent returned ${paragraphResult.comments.length} comments for paragraph ${actualIndex + 1}, expected exactly 1. Taking first comment only.`)
              paragraphResult.comments = paragraphResult.comments.slice(0, 1)
            }
            
            // Find the position of this paragraph within the full essay
            const paragraphPositions = findParagraphPositions(paragraph, processedEssayContent, actualIndex, paragraphs)
            
            // Process and enhance comments - link to entire paragraph
            const enhancedComments: AIComment[] = paragraphResult.comments.map(comment => {
              return {
                ...comment,
                paragraphIndex: actualIndex,
                commentCategory: 'inline',
                commentSubcategory: comment.commentSubcategory || 'paragraph-specific',
                // Preserve specific anchor text from AI analysis
                anchorText: (comment.anchorText && comment.anchorText.trim().length >= 3) ? comment.anchorText.trim() : (paragraph.split('.')[0].trim().length > 50 ? paragraph.split('.')[0].trim().substring(0, 50) + '...' : paragraph.split('.')[0].trim()),
                textSelection: {
                  start: { pos: paragraphPositions.start, path: [0] },
                  end: { pos: paragraphPositions.end, path: [0] }
                },
                // Add scores for opening sentences, transitions, paragraph quality, and final sentences
                openingSentenceScore: comment.commentSubcategory === 'opening-sentence' ? comment.score : undefined,
                openingSentenceScoreColor: comment.commentSubcategory === 'opening-sentence' ? comment.scoreColor : undefined,
                transitionScore: comment.commentSubcategory === 'transition' ? comment.score : undefined,
                transitionScoreColor: comment.commentSubcategory === 'transition' ? comment.scoreColor : undefined,
                paragraphQualityScore: comment.commentSubcategory === 'paragraph-quality' ? comment.score : undefined,
                paragraphQualityScoreColor: comment.commentSubcategory === 'paragraph-quality' ? comment.scoreColor : undefined,
                finalSentenceScore: comment.commentSubcategory === 'final-sentence' ? comment.score : undefined,
                finalSentenceScoreColor: comment.commentSubcategory === 'final-sentence' ? comment.scoreColor : undefined
              }
            })
            console.log(`Generated ${paragraphResult.comments.length} comprehensive comments for paragraph ${actualIndex + 1}`)
            console.log(`Comment subcategories:`, paragraphResult.comments.map(c => c.commentSubcategory))
            return { comments: enhancedComments, success: true, index: actualIndex }
          } else {
            console.log(`No comments generated for paragraph ${actualIndex + 1}. Success: ${paragraphResult.success}, Comments: ${paragraphResult.comments?.length || 0}`)
            if (paragraphResult.error) {
              console.log(`Error for paragraph ${actualIndex + 1}:`, paragraphResult.error)
            }
            
            // Create fallback comment to ensure every paragraph gets at least one comment
            const paragraphPositions = findParagraphPositions(paragraph, processedEssayContent, actualIndex, paragraphs)
            const fallbackComment: AIComment = {
              textSelection: {
                start: { pos: paragraphPositions.start, path: [0] },
                end: { pos: paragraphPositions.end, path: [0] }
              },
              anchorText: paragraph.split('.')[0].trim().length > 50 ? paragraph.split('.')[0].trim().substring(0, 50) + '...' : paragraph.split('.')[0].trim(),
              commentText: "This paragraph could benefit from additional analysis. Consider reviewing the structure, flow, and clarity of your argument.",
              commentType: 'suggestion',
              confidenceScore: 0.6,
              commentCategory: 'inline',
              commentSubcategory: 'paragraph-specific',
              paragraphIndex: actualIndex,
              agentType: 'paragraph'
            }
            console.log(`Generated fallback comment for paragraph ${actualIndex + 1} due to AI analysis failure`)
            return { comments: [fallbackComment], success: true, index: actualIndex }
          }
        } catch (error) {
          console.error(`Error analyzing paragraph ${actualIndex + 1}:`, error)
          // Create error fallback comment
          const paragraphPositions = findParagraphPositions(paragraph, processedEssayContent, actualIndex, paragraphs)
          const errorComment: AIComment = {
            textSelection: {
              start: { pos: paragraphPositions.start, path: [0] },
              end: { pos: paragraphPositions.end, path: [0] }
            },
            anchorText: paragraph.split('.')[0].trim().length > 50 ? paragraph.split('.')[0].trim().substring(0, 50) + '...' : paragraph.split('.')[0].trim(),
            commentText: "This paragraph analysis encountered an error. Please review the structure and flow of your argument.",
            commentType: 'suggestion',
            confidenceScore: 0.5,
            commentCategory: 'inline',
            commentSubcategory: 'paragraph-specific',
            paragraphIndex: actualIndex,
            agentType: 'paragraph'
          }
          return { comments: [errorComment], success: false, index: actualIndex, error: error.message }
        }
      })
      
      paragraphPromises.push(...batchPromises)
    }
    
    // Wait for all paragraph analyses to complete with timeout
    console.log(`Progress: 15% - Waiting for ${paragraphPromises.length} paragraph analyses to complete...`)
    
    // Add timeout to prevent hanging (45 seconds max for paragraph analysis)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Paragraph analysis timeout after 45 seconds')), 45000)
    })
    
    const results = await Promise.race([
      Promise.all(paragraphPromises),
      timeoutPromise
    ]) as any[]
    
    // Process results and add to allComments
    results.forEach(result => {
      if (result.success && result.comments.length > 0) {
        allComments.push(...result.comments)
        successfulAnalyses++
      }
    })
    
    console.log(`Progress: 40% - Paragraph analysis complete`)

    return {
      success: allComments.length > 0,
      comments: allComments
    }

  } catch (error) {
    console.error('Error in enhanced paragraph agent with context:', error)
    return {
      success: false,
      comments: [],
      error: `Failed to analyze paragraphs: ${error.message}`
    }
  }
}

async function callEnhancedParagraphAgent(essayContent: string, essayPrompt?: string, strategicInsights?: StrategicInsights): Promise<AgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  try {
    const allComments: AIComment[] = []
    let successfulAnalyses = 0

    // Then analyze transitions between paragraphs
    const paragraphs = splitIntoParagraphs(essayContent)
    
    if (paragraphs.length === 0) {
      return {
        success: allComments.length > 0,
        comments: allComments,
      }
    }

    // Analyze each paragraph comprehensively (including transitions and opening sentences)
    const totalParagraphs = paragraphs.length
    console.log(`Progress: 10% - Analyzing ${totalParagraphs} paragraphs...`)
    console.log(`Paragraph breakdown:`, paragraphs.map((p, i) => `Para ${i + 1}: ${p.length} chars`))
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]
      
      // Process all paragraphs, but handle very short ones differently
      if (paragraph.length < 20) {
        console.log(`Processing short paragraph ${i + 1} (${paragraph.length} chars): "${paragraph}"`)
        // For very short paragraphs, create a minimal comment
        const paragraphPositions = findParagraphPositions(paragraph, processedEssayContent, i, paragraphs)
        const fallbackComment: AIComment = {
          textSelection: {
            start: { pos: paragraphPositions.start, path: [0] },
            end: { pos: paragraphPositions.end, path: [0] }
          },
          anchorText: paragraph.split('.')[0].trim().length > 50 ? paragraph.split('.')[0].trim().substring(0, 50) + '...' : paragraph.split('.')[0].trim(),
          commentText: "This paragraph is quite brief. Consider expanding with more specific details or examples to strengthen your argument.",
          commentType: 'suggestion',
          confidenceScore: 0.7,
          commentCategory: 'inline',
          commentSubcategory: 'paragraph-specific',
          paragraphIndex: i,
          agentType: 'paragraph'
        }
        allComments.push(fallbackComment)
        successfulAnalyses++
        console.log(`Generated fallback comment for short paragraph ${i + 1}`)
        continue
      }

      const progressPercent = Math.round(10 + (i / totalParagraphs) * 30)
      console.log(`Progress: ${progressPercent}% - Analyzing paragraph ${i + 1}/${totalParagraphs}...`)
      
      // Prepare context for the enhanced paragraph analysis
      const previousParagraph = i > 0 ? paragraphs[i - 1] : ''
      const paragraphPosition = getParagraphPosition(i, paragraphs.length)
      
      // Create enhanced prompt with context and strategic insights
      const strategicContext = strategicInsights ? `
STRENGTHS: ${strategicInsights.strengths.join('; ')}
WEAKNESSES: ${strategicInsights.weaknesses.join('; ')}
KEY THEMES: ${strategicInsights.keyThemes.join('; ')}
STRATEGIC RECOMMENDATIONS: ${strategicInsights.strategicRecommendations.join('; ')}
` : 'No strategic context available'
      
      const enhancedPrompt = PARAGRAPH_PROMPT
        .replace('{paragraphIndex}', i.toString())
        .replace('{totalParagraphs}', paragraphs.length.toString())
        .replace('{paragraphPosition}', paragraphPosition)
        .replace('{previousParagraph}', previousParagraph)
        .replace('{strategicContext}', strategicContext)
      
      // Analyze paragraph with enhanced context
      console.log(`Analyzing paragraph ${i + 1} with prompt:`, enhancedPrompt.substring(0, 200) + '...')
      const paragraphResult = await callAgent(enhancedPrompt, paragraph, essayPrompt, 'paragraph')
      console.log(`Paragraph ${i + 1} result:`, paragraphResult)
      
      if (paragraphResult.success && paragraphResult.comments.length > 0) {
        // Enforce single comment constraint for paragraph agent
        if (paragraphResult.comments.length !== 1) {
          console.warn(`Paragraph agent returned ${paragraphResult.comments.length} comments for paragraph ${i + 1}, expected exactly 1. Taking first comment only.`)
          paragraphResult.comments = paragraphResult.comments.slice(0, 1)
        }
        
        // Find the position of this paragraph within the full essay
        const paragraphPositions = findParagraphPositions(paragraph, processedEssayContent, i, paragraphs)
        
        // Process and enhance comments - link to entire paragraph
        const enhancedComments: AIComment[] = paragraphResult.comments.map(comment => {
          return {
            ...comment,
            paragraphIndex: i,
            paragraphId: paragraphIds[i], // NEW: Add paragraph ID for contextual anchoring
            commentCategory: 'inline',
            commentSubcategory: comment.commentSubcategory || 'paragraph-specific',
            // Preserve specific anchor text from AI analysis
            anchorText: (comment.anchorText && comment.anchorText.trim().length >= 3) ? comment.anchorText.trim() : (paragraph.split('.')[0].trim().length > 50 ? paragraph.split('.')[0].trim().substring(0, 50) + '...' : paragraph.split('.')[0].trim()),
            textSelection: {
              start: { pos: paragraphPositions.start, path: [0] },
              end: { pos: paragraphPositions.end, path: [0] }
            },
            // Add scores for opening sentences, transitions, paragraph quality, and final sentences
            openingSentenceScore: comment.commentSubcategory === 'opening-sentence' ? comment.score : undefined,
            openingSentenceScoreColor: comment.commentSubcategory === 'opening-sentence' ? comment.scoreColor : undefined,
            transitionScore: comment.commentSubcategory === 'transition' ? comment.score : undefined,
            transitionScoreColor: comment.commentSubcategory === 'transition' ? comment.scoreColor : undefined,
            paragraphQualityScore: comment.commentSubcategory === 'paragraph-quality' ? comment.score : undefined,
            paragraphQualityScoreColor: comment.commentSubcategory === 'paragraph-quality' ? comment.scoreColor : undefined,
            finalSentenceScore: comment.commentSubcategory === 'final-sentence' ? comment.score : undefined,
            finalSentenceScoreColor: comment.commentSubcategory === 'final-sentence' ? comment.scoreColor : undefined
          }
        })
        allComments.push(...enhancedComments)
        successfulAnalyses++
        console.log(`Generated ${paragraphResult.comments.length} comprehensive comments for paragraph ${i + 1}`)
        console.log(`Comment subcategories:`, paragraphResult.comments.map(c => c.commentSubcategory))
      } else {
        console.log(`No comments generated for paragraph ${i + 1}. Success: ${paragraphResult.success}, Comments: ${paragraphResult.comments?.length || 0}`)
        if (paragraphResult.error) {
          console.log(`Error for paragraph ${i + 1}:`, paragraphResult.error)
        }
        
        // Create fallback comment to ensure every paragraph gets at least one comment
        const paragraphPositions = findParagraphPositions(paragraph, processedEssayContent, i, paragraphs)
        const fallbackComment: AIComment = {
          textSelection: {
            start: { pos: paragraphPositions.start, path: [0] },
            end: { pos: paragraphPositions.end, path: [0] }
          },
          anchorText: paragraph.split('.')[0].trim().length > 50 ? paragraph.split('.')[0].trim().substring(0, 50) + '...' : paragraph.split('.')[0].trim(),
          commentText: "This paragraph could benefit from additional analysis. Consider reviewing the structure, flow, and clarity of your argument.",
          commentType: 'suggestion',
          confidenceScore: 0.6,
          commentCategory: 'inline',
          commentSubcategory: 'paragraph-specific',
          paragraphIndex: i,
          paragraphId: paragraphIds[i], // NEW: Add paragraph ID for contextual anchoring
          agentType: 'paragraph'
        }
        allComments.push(fallbackComment)
        successfulAnalyses++
        console.log(`Generated fallback comment for paragraph ${i + 1} due to AI analysis failure`)
      }
    }
    
    console.log(`Progress: 40% - Paragraph analysis complete`)

    return {
      success: allComments.length > 0,
      comments: allComments
    }

  } catch (error) {
    console.error('Error in enhanced paragraph agent:', error)
    return {
      success: false,
      comments: [],
      error: `Failed to analyze paragraphs: ${error.message}`
    }
  }
}

async function callEditorChiefAgent(essayContent: string, essayPrompt?: string, previousComments: AIComment[] = []): Promise<AgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  try {
    // Call the Editor Chief agent edge function
    const editorChiefUrl = `${supabaseUrl}/functions/v1/ai_agent_editor_chief`
    
    const response = await fetch(editorChiefUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        essayContent,
        essayPrompt,
        previousComments: previousComments.map(c => ({
          agent_type: c.agentType,
          comment_text: c.commentText
        }))
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Editor Chief API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(`Editor Chief agent failed: ${data.error || 'Unknown error'}`)
    }

    // Convert Editor Chief response to standard AgentResponse format
    const comments: AIComment[] = data.comments.map((comment: any) => ({
      textSelection: comment.text_selection || { start: { pos: 0, path: [] }, end: { pos: 0, path: [] } },
      anchorText: comment.anchor_text || '',
      commentText: comment.comment_text,
      commentType: comment.comment_type || 'suggestion',
      confidenceScore: comment.confidence_score || 0.9,
      commentCategory: comment.comment_category || 'overall',
      commentSubcategory: comment.comment_subcategory || 'body',
      agentType: 'editor_chief',
      priorityLevel: comment.priority_level,
      editorialDecision: comment.editorial_decision,
      impactAssessment: comment.impact_assessment
    }))

    return {
      success: true,
      comments
    }

  } catch (error) {
    console.error(`Error calling Editor Chief agent:`, error)
    return {
      success: false,
      comments: [],
      error: `Failed to call Editor Chief agent: ${error.message}`
    }
  }
}

async function callReconciliationAgent(essayContent: string, essayPrompt?: string, strengthsComments: AIComment[] = [], weaknessesComments: AIComment[] = []): Promise<AgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  // Format strengths and weaknesses comments for the prompt
  const strengthsText = strengthsComments.map((comment, index) => 
    `${index + 1}. "${comment.anchorText}" - ${comment.commentText}`
  ).join('\n')

  const weaknessesText = weaknessesComments.map((comment, index) => 
    `${index + 1}. "${comment.anchorText}" - ${comment.commentText}`
  ).join('\n')

  const formattedPrompt = RECONCILIATION_PROMPT
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', essayContent)
    .replace('{strengthsComments}', strengthsText || 'No strengths comments provided')
    .replace('{weaknessesComments}', weaknessesText || 'No weaknesses comments provided')

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
    console.log(`AI Response for reconciliation:`, responseText)
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`No JSON found in AI response for reconciliation:`, responseText)
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    console.log(`Parsed response for reconciliation:`, JSON.stringify(parsedResponse, null, 2))
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Convert to our format with proper text selection and agent type
    const comments: AIComment[] = parsedResponse.comments.map((comment: any) => {
      // Validate comment type against database constraints
      const validCommentTypes = ['suggestion', 'critique', 'praise', 'question'];
      const commentType = validCommentTypes.includes(comment.commentType) 
        ? comment.commentType 
        : 'suggestion';
      
      // Validate comment subcategory against database constraints
      const validSubcategories = ['opening', 'body', 'conclusion', 'opening-sentence', 'transition', 'paragraph-specific', 'paragraph-quality', 'final-sentence'];
      const commentSubcategory = validSubcategories.includes(comment.commentSubcategory) 
        ? comment.commentSubcategory 
        : 'paragraph-specific';
      
      // Handle anchor text
      let anchorText = comment.anchorText || '';
      if (!anchorText) {
        anchorText = 'Overall Essay Analysis';
      }
      
      // Create text selection - for overall comments, use a minimal selection
      let textSelection = comment.textSelection;
      if (!textSelection) {
        textSelection = {
          start: { pos: 0, path: [0] },
          end: { pos: 0, path: [0] }
        };
      }
      
      // Determine organization fields based on reconciliation type and original source
      const reconciliationType = comment.reconciliationType || 'balanced';
      const originalSource = comment.originalSource || 'both';
      
      let commentNature: 'strength' | 'weakness' | 'combined' | 'neutral' = 'combined';
      let organizationCategory: 'overall-strength' | 'overall-weakness' | 'overall-combined' | 'inline' = 'overall-combined';
      let reconciliationSource: 'strength' | 'weakness' | 'both' | 'none' = 'both';
      
      // Set comment nature based on reconciliation type
      if (reconciliationType === 'strength-enhanced') {
        commentNature = 'strength';
        organizationCategory = 'overall-strength';
        reconciliationSource = 'strength';
      } else if (reconciliationType === 'weakness-enhanced') {
        commentNature = 'weakness';
        organizationCategory = 'overall-weakness';
        reconciliationSource = 'weakness';
      } else if (reconciliationType === 'reconciled' || reconciliationType === 'balanced') {
        commentNature = 'combined';
        organizationCategory = 'overall-combined';
        reconciliationSource = originalSource;
      }
      
      return {
        textSelection,
        anchorText,
        commentText: comment.commentText || '',
        commentType: commentType,
        confidenceScore: comment.confidenceScore || 0.5,
        commentCategory: 'overall',
        commentSubcategory: commentSubcategory,
        agentType: 'reconciliation',
        // Add reconciliation metadata
        reconciliationType: reconciliationType,
        originalSource: originalSource,
        // Add organization fields
        commentNature: commentNature,
        organizationCategory: organizationCategory,
        reconciliationSource: reconciliationSource
      };
    })

    return {
      success: true,
      comments
    }

  } catch (error) {
    console.error(`Error in reconciliation agent:`, error)
    return {
      success: false,
      comments: [],
      error: `Failed to generate reconciliation comments: ${error.message}`
    }
  }
}

// Request Queue System to prevent API overload
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private running = 0
  private maxConcurrent = 2 // Only 2 requests at once
  private interval = 1500 // 1.5 seconds between requests
  private isProcessing = false

  async add<T>(request: () => Promise<T>, agentType: string = 'unknown'): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          console.log(`🚀 Executing ${agentType} request (${this.running + 1}/${this.maxConcurrent} running)`)
          const result = await request()
          console.log(`✅ ${agentType} request completed successfully`)
          resolve(result)
        } catch (error) {
          console.error(`❌ ${agentType} request failed:`, error.message)
          reject(error)
        }
      })
      this.process()
    })
  }

  private async process() {
    if (this.isProcessing) return
    this.isProcessing = true

    while (this.queue.length > 0 && this.running < this.maxConcurrent) {
      this.running++
      const request = this.queue.shift()!
      
      // Execute request without waiting
      request().finally(() => {
        this.running--
        // Wait before processing next request
        setTimeout(() => {
          this.isProcessing = false
          this.process()
        }, this.interval)
      })
    }
    
    this.isProcessing = false
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      running: this.running,
      maxConcurrent: this.maxConcurrent
    }
  }
}

// Global request queue instance
const requestQueue = new RequestQueue()

// Helper function to retry API calls with exponential backoff
async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  agentType: string = 'unknown'
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting ${agentType} agent call (attempt ${attempt}/${maxRetries})`)
      const result = await apiCall()
      return result
    } catch (error: any) {
      lastError = error
      
      // Check if it's a 503 error (API overload) and we have retries left
      if (error.message?.includes('503') && attempt < maxRetries) {
        const waitTime = attempt * 2000 // Exponential backoff: 2s, 4s, 6s
        console.warn(`API overload (503) on attempt ${attempt}, retrying in ${waitTime/1000} seconds...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      // If it's not a retryable error or we're out of retries, throw
      throw error
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}

async function callAgent(prompt: string, essayContent: string, essayPrompt?: string, agentType: 'big-picture' | 'paragraph' | 'weaknesses' | 'strengths' = 'big-picture'): Promise<AgentResponse> {
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      comments: [],
      error: 'GOOGLE_API_KEY not configured'
    }
  }

  const formattedPrompt = prompt
    .replace('{prompt}', essayPrompt || 'No specific prompt provided')
    .replace('{content}', essayContent)

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
    console.log(`AI Response for ${agentType}:`, responseText)
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`No JSON found in AI response for ${agentType}:`, responseText)
      throw new Error('No JSON found in AI response')
    }

    const parsedResponse = JSON.parse(jsonMatch[0])
    console.log(`Parsed response for ${agentType}:`, JSON.stringify(parsedResponse, null, 2))
    
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response')
    }

    // Allow multiple comments for weaknesses and strengths agents (2-4 expected)
    if ((agentType === 'weaknesses' || agentType === 'strengths') && parsedResponse.comments.length < 2) {
      console.warn(`${agentType} agent returned only ${parsedResponse.comments.length} comments, expected 2-4.`)
    } else if ((agentType === 'weaknesses' || agentType === 'strengths') && parsedResponse.comments.length > 4) {
      console.warn(`${agentType} agent returned ${parsedResponse.comments.length} comments, expected 2-4. Taking first 4 comments.`)
      parsedResponse.comments = parsedResponse.comments.slice(0, 4)
    }

    // Convert to our format with proper text selection and agent type
    const comments: AIComment[] = parsedResponse.comments.map((comment: any) => {
      // Validate comment type against database constraints
      const validCommentTypes = ['suggestion', 'critique', 'praise', 'question'];
      const commentType = validCommentTypes.includes(comment.commentType) 
        ? comment.commentType 
        : 'suggestion';
      
      // Validate comment subcategory against database constraints
      const validSubcategories = ['opening', 'body', 'conclusion', 'opening-sentence', 'transition', 'paragraph-specific', 'paragraph-quality', 'final-sentence'];
      const commentSubcategory = validSubcategories.includes(comment.commentSubcategory) 
        ? comment.commentSubcategory 
        : 'paragraph-specific';
      
      // Log if we had to fix invalid values
      if (comment.commentType && !validCommentTypes.includes(comment.commentType)) {
        console.warn(`Invalid comment type "${comment.commentType}" from ${agentType}, defaulting to "suggestion"`);
      }
      if (comment.commentSubcategory && !validSubcategories.includes(comment.commentSubcategory)) {
        console.warn(`Invalid comment subcategory "${comment.commentSubcategory}" from ${agentType}, defaulting to "paragraph-specific"`);
      }
      
      // Handle anchor text based on agent type
      let anchorText = comment.anchorText || '';
      if (!anchorText && (agentType === 'weaknesses' || agentType === 'strengths')) {
        // Use generic anchor text for overall comments
        anchorText = agentType === 'strengths' ? 'Overall Essay Strengths' : 'Overall Essay Areas for Improvement';
      } else if (agentType === 'paragraph' && anchorText) {
        // For paragraph comments, preserve the specific anchor text from AI
        anchorText = anchorText.trim();
      }
      
      // Create text selection - for overall comments, use a minimal selection to satisfy database constraints
      let textSelection = comment.textSelection;
      if (!textSelection) {
        if (agentType === 'weaknesses' || agentType === 'strengths') {
          // For overall comments, use a minimal selection at the beginning to satisfy NOT NULL constraint
          textSelection = {
            start: { pos: 0, path: [0] },
            end: { pos: 0, path: [0] }
          };
        } else {
          // For other comments, use provided positions or default
          textSelection = {
            start: { pos: comment.startPos || 0, path: [0] },
            end: { pos: comment.endPos || comment.startPos || 0, path: [0] }
          };
        }
      }
      
      return {
        textSelection,
        anchorText,
        commentText: comment.commentText || '',
        commentType: commentType,
        confidenceScore: comment.confidenceScore || 0.5,
        commentCategory: comment.commentCategory || (agentType === 'big-picture' || agentType === 'weaknesses' || agentType === 'strengths' ? 'overall' : 'inline'),
        commentSubcategory: commentSubcategory,
        agentType,
        qualityScore: comment.qualityScore // Include quality score for big picture agent
      };
    })

    return {
      success: true,
      comments
    }

  } catch (error) {
    console.error(`Error in ${agentType} agent:`, error)
    return {
      success: false,
      comments: [],
      error: `Failed to generate ${agentType} comments: ${error.message}`
    }
  }
}

// New specialized agent functions
async function callToneAgent(essayContent: string, essayPrompt?: string): Promise<AgentResponse> {
  try {
    console.log('Calling tone agent...')
    
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai_agent_tone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        essayContent,
        essayPrompt
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tone agent error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(`Tone agent failed: ${data.error || data.message}`)
    }

    // Convert the response to our AgentResponse format
    const comments: AIComment[] = data.comments.map((comment: any) => ({
      textSelection: {
        start: { pos: 0, path: [0] },
        end: { pos: 0, path: [0] }
      },
      anchorText: 'Overall Essay Tone',
      commentText: comment.comment_text,
      commentType: comment.comment_nature === 'strength' ? 'praise' : 'critique',
      confidenceScore: comment.confidence_score,
      commentCategory: comment.comment_category,
      commentSubcategory: 'body',
      agentType: 'tone' as const
    }))

    return {
      success: true,
      comments
    }
  } catch (error) {
    console.error('Error calling tone agent:', error)
    return {
      success: false,
      comments: [],
      error: `Failed to call tone agent: ${error.message}`
    }
  }
}

async function callClarityAgent(essayContent: string, essayPrompt?: string): Promise<AgentResponse> {
  try {
    console.log('Calling clarity agent...')
    
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai_agent_clarity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        essayContent,
        essayPrompt
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Clarity agent error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(`Clarity agent failed: ${data.error || data.message}`)
    }

    // Convert the response to our AgentResponse format
    const comments: AIComment[] = data.comments.map((comment: any) => ({
      textSelection: {
        start: { pos: comment.text_selection.start, path: [0] },
        end: { pos: comment.text_selection.end, path: [0] }
      },
      anchorText: essayContent.substring(comment.text_selection.start, comment.text_selection.end),
      commentText: comment.comment_text,
      commentType: 'suggestion',
      confidenceScore: comment.confidence_score,
      commentCategory: comment.comment_category,
      commentSubcategory: 'paragraph-specific',
      agentType: 'clarity' as const
    }))

    return {
      success: true,
      comments
    }
  } catch (error) {
    console.error('Error calling clarity agent:', error)
    return {
      success: false,
      comments: [],
      error: `Failed to call clarity agent: ${error.message}`
    }
  }
}

async function callGrammarSpellingAgent(essayContent: string, essayPrompt?: string): Promise<AgentResponse> {
  try {
    console.log('Calling grammar & spelling agent...')
    
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai_agent_grammar_spelling`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        essayContent,
        essayPrompt
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Grammar & spelling agent error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(`Grammar & spelling agent failed: ${data.error || data.message}`)
    }

    // Convert the response to our AgentResponse format
    const comments: AIComment[] = data.comments.map((comment: any) => ({
      textSelection: {
        start: { pos: comment.text_selection.start, path: [0] },
        end: { pos: comment.text_selection.end, path: [0] }
      },
      anchorText: essayContent.substring(comment.text_selection.start, comment.text_selection.end),
      commentText: comment.comment_text,
      commentType: 'suggestion',
      confidenceScore: comment.confidence_score,
      commentCategory: comment.comment_category,
      commentSubcategory: 'paragraph-specific',
      agentType: 'grammar_spelling' as const
    }))

    return {
      success: true,
      comments
    }
  } catch (error) {
    console.error('Error calling grammar & spelling agent:', error)
    return {
      success: false,
      comments: [],
      error: `Failed to call grammar & spelling agent: ${error.message}`
    }
  }
}

async function getNextCheckpointNumber(essayId: string, userId: string): Promise<number> {
  const { data: latestCheckpoint, error } = await supabase
    .from('essay_checkpoints')
    .select('checkpoint_number')
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .order('checkpoint_number', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Failed to get latest checkpoint: ${error.message}`)
  }

  return latestCheckpoint && latestCheckpoint.length > 0 
    ? latestCheckpoint[0].checkpoint_number + 1 
    : 1
}

async function getCurrentVersionNumber(essayId: string, userId: string): Promise<number> {
  const { data: latestCheckpoint, error } = await supabase
    .from('essay_checkpoints')
    .select('version_number')
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .order('version_number', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Failed to get latest version: ${error.message}`)
  }

  return latestCheckpoint && latestCheckpoint.length > 0 
    ? latestCheckpoint[0].version_number 
    : 1
}

async function shouldRunChangeDetection(essayId: string, userId: string): Promise<boolean> {
  const currentVersion = await getCurrentVersionNumber(essayId, userId)
  return currentVersion >= 2
}

async function callChangeDetectionFunction(essayId: string, essayContent: string, essayPrompt?: string, userId?: string): Promise<AgentResponse> {
  try {
    console.log('Calling change detection function...')
    
    // Call the change detection function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-essay-comments-paragraph-with-change-detection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        essayId,
        essayContent,
        essayPrompt,
        userId,
        skipExistingCheck: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Change detection function error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(`Change detection function failed: ${data.message}`)
    }

    // Convert the response to our AgentResponse format
    const comments: AIComment[] = data.comments.map((comment: any) => ({
      ...comment,
      agentType: 'paragraph' as const,
      commentCategory: comment.commentCategory || 'inline',
      commentSubcategory: comment.commentSubcategory || 'paragraph-specific'
    }))

    return {
      success: true,
      comments
    }
  } catch (error) {
    console.error('Error calling change detection function:', error)
    return {
      success: false,
      comments: [],
      error: `Failed to run change detection: ${error.message}`
    }
  }
}

async function deactivatePreviousCheckpoints(essayId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('essay_checkpoints')
    .update({ is_active: false })
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to deactivate previous checkpoints: ${error.message}`)
  }
}

async function updateExistingCheckpointWithAIFeedback(
  essayId: string, 
  userId: string, 
  comments: AIComment[],
  qualityMetrics: CommentQualityMetrics[]
): Promise<EssayCheckpoint> {
  // First, handle the case where there might be multiple active checkpoints
  // This can happen due to race conditions or constraint violations
  console.log(`Looking for active checkpoint for essay ${essayId}, user ${userId}`)
  
  // Get all active checkpoints (there should only be one, but handle multiple gracefully)
  const { data: activeCheckpoints, error: fetchError } = await supabase
    .from('essay_checkpoints')
    .select('*')
    .eq('essay_id', essayId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  if (fetchError) {
    throw new Error(`Failed to fetch active checkpoints: ${fetchError.message}`)
  }
  
  if (!activeCheckpoints || activeCheckpoints.length === 0) {
    console.warn(`No active checkpoint found for essay ${essayId}. Creating a new checkpoint.`)
    
    // Create a new checkpoint as fallback
    const dummyQualityMetrics = qualityMetrics.length > 0 ? qualityMetrics : comments.map(() => ({
      isValid: true,
      qualityScore: 0.8,
      issues: [],
      priority: 'medium' as const
    }))
    
    return await createCheckpoint(
      essayId,
      userId,
      '', // We don't have the essay content here, but the checkpoint will be updated
      comments,
      dummyQualityMetrics
    )
  }
  
  // If there are multiple active checkpoints, deactivate all but the most recent one
  if (activeCheckpoints.length > 1) {
    console.warn(`Found ${activeCheckpoints.length} active checkpoints for essay ${essayId}. Deactivating older ones.`)
    
    // Keep the most recent one active, deactivate the rest
    const checkpointToKeep = activeCheckpoints[0]
    const checkpointsToDeactivate = activeCheckpoints.slice(1)
    
    const { error: deactivateError } = await supabase
      .from('essay_checkpoints')
      .update({ is_active: false })
      .in('id', checkpointsToDeactivate.map(cp => cp.id))
    
    if (deactivateError) {
      console.error(`Failed to deactivate duplicate checkpoints: ${deactivateError.message}`)
      // Continue anyway, we'll use the most recent one
    } else {
      console.log(`Deactivated ${checkpointsToDeactivate.length} duplicate active checkpoints`)
    }
  }
  
  const activeCheckpoint = activeCheckpoints[0]

  // Calculate comment statistics
  const overallComments = comments.filter(c => c.commentCategory === 'overall').length
  const inlineComments = comments.filter(c => c.commentCategory === 'inline').length
  const openingSentenceComments = comments.filter(c => c.commentSubcategory === 'opening-sentence').length
  const transitionComments = comments.filter(c => c.commentSubcategory === 'transition').length
  const paragraphQualityComments = comments.filter(c => c.commentSubcategory === 'paragraph-quality').length
  const finalSentenceComments = comments.filter(c => c.commentSubcategory === 'final-sentence').length
  const paragraphSpecificComments = comments.filter(c => c.commentSubcategory === 'paragraph-specific').length
  
  // Calculate average scores
  const avgConfidenceScore = comments.reduce((sum, c) => sum + c.confidenceScore, 0) / comments.length
  const avgQualityScore = qualityMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / qualityMetrics.length
  
  // Update the existing checkpoint with AI feedback data
  const { error: updateError } = await supabase
    .from('essay_checkpoints')
    .update({
      has_ai_feedback: true,
      ai_feedback_generated_at: new Date().toISOString(),
      ai_model: 'gemini-2.5-flash-lite',
      total_comments: comments.length,
      overall_comments: overallComments,
      inline_comments: inlineComments,
      opening_sentence_comments: openingSentenceComments,
      transition_comments: transitionComments,
      paragraph_specific_comments: paragraphSpecificComments,
      average_confidence_score: avgConfidenceScore,
      average_quality_score: avgQualityScore,
      version_name: `Version ${activeCheckpoint.version_number} (with Diya comments)`
    })
    .eq('id', activeCheckpoint.id)
  
  if (updateError) {
    throw new Error(`Failed to update checkpoint with AI feedback: ${updateError.message}`)
  }
  
  // Return the updated checkpoint
  const { data: updatedCheckpoint, error: fetchUpdatedError } = await supabase
    .from('essay_checkpoints')
    .select('*')
    .eq('id', activeCheckpoint.id)
    .single()
  
  if (fetchUpdatedError) {
    throw new Error(`Failed to fetch updated checkpoint: ${fetchUpdatedError.message}`)
  }
  
  return updatedCheckpoint
}

async function createCheckpoint(
  essayId: string, 
  userId: string, 
  essayContent: string, 
  comments: AIComment[],
  qualityMetrics: CommentQualityMetrics[],
  essayTitle?: string, 
  essayPrompt?: string
): Promise<EssayCheckpoint> {
  // Calculate comment statistics
  const overallComments = comments.filter(c => c.commentCategory === 'overall').length
  const inlineComments = comments.filter(c => c.commentCategory === 'inline').length
  const openingSentenceComments = comments.filter(c => c.commentSubcategory === 'opening-sentence').length
  const transitionComments = comments.filter(c => c.commentSubcategory === 'transition').length
  const paragraphQualityComments = comments.filter(c => c.commentSubcategory === 'paragraph-quality').length
  const finalSentenceComments = comments.filter(c => c.commentSubcategory === 'final-sentence').length
  const paragraphSpecificComments = comments.filter(c => c.commentSubcategory === 'paragraph-specific').length
  
  // Calculate average scores
  const avgConfidenceScore = comments.reduce((sum, c) => sum + c.confidenceScore, 0) / comments.length
  const avgQualityScore = qualityMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / qualityMetrics.length
  
  // Use the new version management function
  const { data: checkpointId, error } = await supabase.rpc('create_ai_feedback_checkpoint', {
    essay_uuid: essayId,
    user_uuid: userId,
    essay_content: essayContent,
    essay_title: essayTitle || null,
    essay_prompt: essayPrompt || null,
    ai_model_param: 'gemini-2.5-flash-lite',
    total_comments_param: comments.length,
    overall_comments_param: overallComments,
    inline_comments_param: inlineComments,
    opening_sentence_comments_param: openingSentenceComments,
    transition_comments_param: transitionComments,
    paragraph_specific_comments_param: paragraphSpecificComments,
    average_confidence_score_param: avgConfidenceScore,
    average_quality_score_param: avgQualityScore
  })
  
  if (error) {
    throw new Error(`Failed to create AI feedback checkpoint: ${error.message}`)
  }
  
  // Get the created checkpoint
  const { data: checkpoint, error: fetchError } = await supabase
    .from('essay_checkpoints')
    .select('*')
    .eq('id', checkpointId)
    .single()
  
  if (fetchError) {
    throw new Error(`Failed to fetch created checkpoint: ${fetchError.message}`)
  }
  
  return checkpoint
}

// Function to get previous comments for context
async function getPreviousComments(essayId: string, userId: string): Promise<{
  previousComments: AIComment[];
  previousContext: string;
}> {
  try {
    // Get the most recent checkpoint with AI feedback
    const { data: latestCheckpoint, error: checkpointError } = await supabase
      .from('essay_checkpoints')
      .select('id, version_number, created_at')
      .eq('essay_id', essayId)
      .eq('user_id', userId)
      .eq('has_ai_feedback', true)
      .order('version_number', { ascending: false })
      .limit(1)

    if (checkpointError || !latestCheckpoint || latestCheckpoint.length === 0) {
      return { previousComments: [], previousContext: '' }
    }

    // Get comments from the previous checkpoint
    const { data: comments, error: commentsError } = await supabase
      .from('essay_comments')
      .select('*')
      .eq('checkpoint_id', latestCheckpoint[0].id)
      .eq('ai_generated', true)
      .order('created_at', { ascending: true })

    if (commentsError || !comments) {
      return { previousComments: [], previousContext: '' }
    }

    // Convert to AIComment format
    const previousComments: AIComment[] = comments.map(comment => ({
      textSelection: comment.text_selection,
      anchorText: comment.anchor_text,
      commentText: comment.comment_text,
      commentType: comment.comment_type,
      confidenceScore: comment.confidence_score,
      commentCategory: comment.comment_category,
      commentSubcategory: comment.comment_subcategory,
      agentType: comment.agent_type,
      paragraphIndex: comment.paragraph_index,
      transitionScore: comment.transition_score,
      transitionScoreColor: comment.transition_score_color,
      openingSentenceScore: comment.opening_sentence_score,
      openingSentenceScoreColor: comment.opening_sentence_score_color,
      paragraphQualityScore: comment.paragraph_quality_score,
      paragraphQualityScoreColor: comment.paragraph_quality_score_color,
      finalSentenceScore: comment.final_sentence_score,
      finalSentenceScoreColor: comment.final_sentence_score_color
    }))

    // Build context string for AI prompts
    let previousContext = `PREVIOUS AI FEEDBACK (Version ${latestCheckpoint[0].version_number}):\n\n`
    
    // Group comments by agent type for better context
    const strengthsComments = previousComments.filter(c => c.agentType === 'strengths')
    const weaknessesComments = previousComments.filter(c => c.agentType === 'weaknesses')
    const paragraphComments = previousComments.filter(c => c.agentType === 'paragraph')

    if (strengthsComments.length > 0) {
      previousContext += `STRENGTHS IDENTIFIED:\n`
      strengthsComments.forEach((comment, index) => {
        previousContext += `${index + 1}. ${comment.commentText}\n`
      })
      previousContext += `\n`
    }

    if (weaknessesComments.length > 0) {
      previousContext += `AREAS FOR IMPROVEMENT IDENTIFIED:\n`
      weaknessesComments.forEach((comment, index) => {
        previousContext += `${index + 1}. ${comment.commentText}\n`
      })
      previousContext += `\n`
    }

    if (paragraphComments.length > 0) {
      previousContext += `PARAGRAPH-SPECIFIC FEEDBACK:\n`
      paragraphComments.forEach((comment, index) => {
        previousContext += `${index + 1}. ${comment.commentText}\n`
      })
      previousContext += `\n`
    }

    previousContext += `IMPORTANT: Do not suggest reverting to previous versions. Build upon the existing feedback and suggest new improvements.`

    return { previousComments, previousContext }
  } catch (error) {
    console.error('Error getting previous comments:', error)
    return { previousComments: [], previousContext: '' }
  }
}

async function saveCommentsToDatabase(essayId: string, userId: string, comments: AIComment[], checkpointId: string): Promise<void> {
  const commentInserts = comments.map(comment => {
    // Ensure comment_category is valid (only 'overall' or 'inline' allowed)
    let validCommentCategory = comment.commentCategory
    if (!validCommentCategory || !['overall', 'inline'].includes(validCommentCategory)) {
      // Default based on agent type
      if (['weaknesses', 'strengths', 'reconciliation', 'tone'].includes(comment.agentType || '')) {
        validCommentCategory = 'overall'
      } else {
        validCommentCategory = 'inline'
      }
    }
    
    // Ensure comment_subcategory is valid
    let validCommentSubcategory = comment.commentSubcategory
    if (!validCommentSubcategory || !['opening', 'body', 'conclusion', 'opening-sentence', 'transition', 'paragraph-specific'].includes(validCommentSubcategory)) {
      validCommentSubcategory = 'body' // Default fallback
    }
    
    // Ensure organization_category is valid
    let validOrganizationCategory = comment.organizationCategory
    if (!validOrganizationCategory || !['overall-strength', 'overall-weakness', 'overall-combined', 'inline'].includes(validOrganizationCategory)) {
      // Default based on agent type
      if (['weaknesses', 'strengths', 'reconciliation', 'tone'].includes(comment.agentType || '')) {
        validOrganizationCategory = 'overall-combined'
      } else {
        validOrganizationCategory = 'inline'
      }
    }
    
    return {
      essay_id: essayId,
      user_id: userId,
      checkpoint_id: checkpointId, // Link to specific checkpoint
      text_selection: comment.textSelection,
      anchor_text: comment.anchorText,
      comment_text: comment.commentText,
      comment_type: comment.commentType,
      ai_generated: true,
      ai_model: 'gemini-2.5-flash-lite',
      confidence_score: comment.confidenceScore,
      resolved: false,
      agent_type: comment.agentType, // Store which agent generated this comment
      paragraph_index: comment.paragraphIndex, // Store paragraph index
      paragraph_id: comment.paragraphId, // NEW: Store paragraph ID for contextual anchoring
      transition_score: comment.transitionScore, // Store transition score
      transition_score_color: comment.transitionScoreColor, // Store transition score color
      comment_category: validCommentCategory, // Store comment category (validated)
      comment_subcategory: validCommentSubcategory, // Store comment subcategory (validated)
      // New organization fields
      comment_nature: comment.commentNature || 'neutral',
      organization_category: validOrganizationCategory,
      reconciliation_source: comment.reconciliationSource || 'none',
      reconciliation_type: comment.reconciliationType,
      original_source: comment.originalSource,
      quality_score: comment.qualityScore // Store quality score for big picture agent
    }
  })

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
    const { essayId, essayContent, essayPrompt, essayTitle, userId }: EssayCommentRequest = await req.json()

    // Validate required fields
    if (!essayId || !essayContent || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: essayId, essayContent, userId',
          comments: [],
          agentResults: {
            weaknesses: { success: false, comments: [] },
            strengths: { success: false, comments: [] },
            reconciliation: { success: false, comments: [] },
            tone: { success: false, comments: [] },
            clarity: { success: false, comments: [] },
            grammarSpelling: { success: false, comments: [] },
            paragraph: { success: false, comments: [] },
            changeDetection: { success: false, comments: [] },
            editorChief: { success: false, comments: [] }
          }
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
          comments: [],
          agentResults: {
            weaknesses: { success: false, comments: [] },
            strengths: { success: false, comments: [] },
            reconciliation: { success: false, comments: [] },
            tone: { success: false, comments: [] },
            clarity: { success: false, comments: [] },
            grammarSpelling: { success: false, comments: [] },
            paragraph: { success: false, comments: [] },
            changeDetection: { success: false, comments: [] },
            editorChief: { success: false, comments: [] }
          }
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
          comments: [],
          agentResults: {
            weaknesses: { success: false, comments: [] },
            strengths: { success: false, comments: [] },
            reconciliation: { success: false, comments: [] },
            tone: { success: false, comments: [] },
            clarity: { success: false, comments: [] },
            grammarSpelling: { success: false, comments: [] },
            paragraph: { success: false, comments: [] },
            changeDetection: { success: false, comments: [] },
            editorChief: { success: false, comments: [] }
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check for unresolved AI comments (excluding grammar comments)
    console.log(`Checking for unresolved AI comments for essay ${essayId}`)
    const { data: unresolvedComments, error: unresolvedError } = await supabase
      .from('essay_comments')
      .select('id, agent_type')
      .eq('essay_id', essayId)
      .eq('user_id', userId)
      .eq('ai_generated', true)
      .eq('resolved', false)
      .neq('agent_type', 'grammar_spelling')

    if (unresolvedError) {
      console.error('Error checking for unresolved comments:', unresolvedError)
    } else if (unresolvedComments && unresolvedComments.length > 0) {
      console.log(`Found ${unresolvedComments.length} unresolved AI comments. Blocking generation.`)
      return new Response(
        JSON.stringify({
          success: false,
          message: `You have ${unresolvedComments.length} unresolved AI comments. Please resolve or delete existing comments before generating new ones.`,
          comments: [],
          unresolvedCount: unresolvedComments.length,
          agentResults: {
            weaknesses: { success: false, comments: [] },
            strengths: { success: false, comments: [] },
            reconciliation: { success: false, comments: [] },
            tone: { success: false, comments: [] },
            clarity: { success: false, comments: [] },
            grammarSpelling: { success: false, comments: [] },
            paragraph: { success: false, comments: [] },
            changeDetection: { success: false, comments: [] },
            editorChief: { success: false, comments: [] }
          }
        }),
        {
          status: 409, // Conflict status code
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get current checkpoint number for this essay
    console.log(`Getting checkpoint number for essay ${essayId}`)
    const checkpointNumber = await getNextCheckpointNumber(essayId, userId)
    console.log(`Creating checkpoint ${checkpointNumber} for essay ${essayId}`)

    // Get previous comments for context (if any)
    console.log(`Getting previous comments for context...`)
    const { previousComments, previousContext } = await getPreviousComments(essayId, userId)
    console.log(`Found ${previousComments.length} previous comments`)
    
    // Run agents with parallel execution and reconciliation
    console.log(`Starting parallel analysis with reconciliation for essay ${essayId}`)
    console.log(`Progress: 0% - Initializing analysis...`)
    
    // Step 1: Run weaknesses and strengths agents in parallel
    console.log(`Progress: 10% - Running weaknesses and strengths analysis in parallel...`)
    
    const weaknessesPromptWithContext = previousContext ? 
      `${WEAKNESSES_PROMPT}\n\n${previousContext}` : 
      WEAKNESSES_PROMPT
    
    const strengthsPromptWithContext = previousContext ? 
      `${STRENGTHS_PROMPT}\n\n${previousContext}` : 
      STRENGTHS_PROMPT
    
    // Run both agents through request queue (controlled parallel execution)
    console.log(`📋 Adding weaknesses and strengths agents to queue`)
    console.log(`API Key configured: ${GEMINI_API_KEY ? 'YES' : 'NO'}`)
    
    const [weaknessesResult, strengthsResult] = await Promise.all([
      requestQueue.add(() => callAgent(weaknessesPromptWithContext, essayContent, essayPrompt, 'weaknesses'), 'weaknesses'),
      requestQueue.add(() => callAgent(strengthsPromptWithContext, essayContent, essayPrompt, 'strengths'), 'strengths')
    ])
    
    console.log(`Progress: 25% - Parallel analysis complete`)
    console.log(`Queue status:`, requestQueue.getStatus())
    console.log(`Weaknesses: ${weaknessesResult.success ? 'success' : 'failed'}, ${weaknessesResult.comments.length} comments`)
    console.log(`Strengths: ${strengthsResult.success ? 'success' : 'failed'}, ${strengthsResult.comments.length} comments`)
    
    // Log any errors from weaknesses/strengths agents
    if (!weaknessesResult.success) {
      console.error(`Weaknesses agent failed:`, weaknessesResult.error)
    }
    if (!strengthsResult.success) {
      console.error(`Strengths agent failed:`, strengthsResult.error)
    }
    
    // Step 2: Run reconciliation agent to resolve contradictions
    console.log(`Progress: 30% - Running reconciliation agent...`)
    console.log(`📋 Adding reconciliation agent to queue`)
    const reconciliationResult = await requestQueue.add(() => callReconciliationAgent(
      essayContent, 
      essayPrompt, 
      strengthsResult.comments, 
      weaknessesResult.comments
    ), 'reconciliation')
    
    console.log(`Progress: 40% - Reconciliation complete`)
    console.log(`Reconciliation: ${reconciliationResult.success ? 'success' : 'failed'}, ${reconciliationResult.comments.length} comments`)
    
    // Log any errors from reconciliation agent
    if (!reconciliationResult.success) {
      console.error(`Reconciliation agent failed:`, reconciliationResult.error)
    }
    
    // Build cumulative context from reconciled comments for paragraph analysis
    let cumulativeContext = previousContext ? `${previousContext}\n\n` : ''
    if (reconciliationResult.comments.length > 0) {
      cumulativeContext += `RECONCILED STRATEGIC ANALYSIS:\n`
      reconciliationResult.comments.forEach((comment, index) => {
        cumulativeContext += `${index + 1}. ${comment.commentText}\n`
      })
      cumulativeContext += `\n`
    }
    
    console.log(`Progress: 40% - Strategic analysis complete, cumulative context built`)
    console.log(`Cumulative context length: ${cumulativeContext.length} characters`)
    
    // Step 3: Run basic tone and grammar analysis locally
    console.log(`Progress: 45% - Running basic tone and grammar analysis...`)
    
    // Simple tone analysis prompt
    const tonePrompt = `Analyze the tone and voice of this college application essay. Provide 1-2 specific comments about tone, authenticity, or voice issues. Focus on whether the tone is appropriate for college admissions.

ESSAY PROMPT: ${essayPrompt || 'No specific prompt provided'}
ESSAY CONTENT: ${essayContent}

Provide feedback in this JSON format:
{
  "comments": [
    {
      "anchorText": "specific text from essay",
      "commentText": "specific tone/voice feedback",
      "commentType": "suggestion",
      "confidenceScore": 0.8,
      "commentCategory": "overall",
      "commentSubcategory": "body",
      "startPos": 0,
      "endPos": 100
    }
  ]
}`

    // Simple grammar analysis prompt  
    const grammarPrompt = `Analyze this college application essay for grammar, spelling, and writing mechanics. Provide 1-2 specific comments about grammar or writing issues.

ESSAY PROMPT: ${essayPrompt || 'No specific prompt provided'}
ESSAY CONTENT: ${essayContent}

Provide feedback in this JSON format:
{
  "comments": [
    {
      "anchorText": "specific text with grammar issue",
      "commentText": "specific grammar/writing feedback",
      "commentType": "suggestion",
      "confidenceScore": 0.8,
      "commentCategory": "inline",
      "commentSubcategory": "paragraph-specific",
      "startPos": 0,
      "endPos": 100
    }
  ]
}`

    // Run tone and grammar analysis through request queue
    console.log(`📋 Adding tone and grammar agents to queue`)
    const [toneResult, grammarSpellingResult] = await Promise.all([
      requestQueue.add(() => callAgent(tonePrompt, essayContent, essayPrompt, 'big-picture'), 'tone'),
      requestQueue.add(() => callAgent(grammarPrompt, essayContent, essayPrompt, 'big-picture'), 'grammar')
    ])
    
    // Create empty clarity result for now
    const clarityResult: AgentResponse = { success: true, comments: [] }
    
    console.log(`Progress: 50% - Basic analysis complete`)
    console.log(`Tone: ${toneResult.success ? 'success' : 'failed'}, ${toneResult.comments.length} comments`)
    console.log(`Grammar: ${grammarSpellingResult.success ? 'success' : 'failed'}, ${grammarSpellingResult.comments.length} comments`)
    console.log(`Clarity: skipped`)
    
    // Step 4: Run paragraph analysis (different approach based on version)
    let paragraphResult: AgentResponse = { success: false, comments: [] }
    let changeDetectionResult: AgentResponse = { success: false, comments: [] }
    const shouldRunChangeDetectionFlag = await shouldRunChangeDetection(essayId, userId)
    
    if (shouldRunChangeDetectionFlag) {
      // For version 2+: Use change detection function (only comments on changed paragraphs)
      console.log(`Progress: 55% - Running change detection analysis (version 2+)...`)
      changeDetectionResult = await callChangeDetectionFunction(essayId, essayContent, essayPrompt, userId)
      console.log(`Change detection result: ${changeDetectionResult.success ? 'success' : 'failed'}, ${changeDetectionResult.comments.length} comments`)
      
      // Set paragraphResult to changeDetectionResult for consistency
      paragraphResult = changeDetectionResult
    } else {
      // For version 1: Use regular paragraph analysis (comments on all paragraphs)
      console.log(`Progress: 55% - Running paragraph analysis with cumulative context (version 1)...`)
      paragraphResult = await callEnhancedParagraphAgentWithContext(essayContent, essayPrompt, cumulativeContext)
      console.log(`Paragraph analysis result: ${paragraphResult.success ? 'success' : 'failed'}, ${paragraphResult.comments.length} comments`)
    }
    
    console.log(`Progress: 80% - All analysis complete, running Editor in Chief...`)

    // Step 5: Run Editor in Chief agent for final assessment
    console.log(`📋 Adding Editor in Chief agent to queue`)
    const editorChiefResult = await callEditorChiefAgent(essayContent, essayPrompt, [
      ...weaknessesResult.comments,
      ...strengthsResult.comments,
      ...reconciliationResult.comments,
      ...toneResult.comments,
      ...grammarSpellingResult.comments,
      ...paragraphResult.comments
    ])
    
    console.log(`Progress: 85% - Editor in Chief analysis complete`)
    console.log(`Editor Chief: ${editorChiefResult.success ? 'success' : 'failed'}, ${editorChiefResult.comments.length} comments`)

    // Extract results
    const weaknessesResponse: AgentResponse = weaknessesResult
    const strengthsResponse: AgentResponse = strengthsResult
    const reconciliationResponse: AgentResponse = reconciliationResult
    const toneResponse: AgentResponse = toneResult
    const clarityResponse: AgentResponse = clarityResult
    const grammarSpellingResponse: AgentResponse = grammarSpellingResult
    const paragraphResponse: AgentResponse = paragraphResult
    const changeDetectionResponse: AgentResponse = changeDetectionResult
    const editorChiefResponse: AgentResponse = editorChiefResult

    // Combine all comments (include both raw strengths/weaknesses AND reconciliation)
    const allComments: AIComment[] = [
      ...weaknessesResponse.comments,  // Include raw weaknesses comments
      ...strengthsResponse.comments,   // Include raw strengths comments  
      ...reconciliationResponse.comments,  // Include reconciled comments
      ...toneResponse.comments,
      ...clarityResponse.comments,
      ...grammarSpellingResponse.comments,
      ...paragraphResponse.comments,
      ...editorChiefResponse.comments  // Include Editor Chief final assessment
    ]
    
    console.log(`Comment breakdown: ${weaknessesResponse.comments.length} weaknesses, ${strengthsResponse.comments.length} strengths, ${reconciliationResponse.comments.length} reconciled, ${paragraphResponse.comments.length} paragraph`)

    // Skip quality validation for now - focus on getting inline comments working
    console.log(`Progress: 60% - Processing ${allComments.length} comments...`)
    
    // Simple prioritization without quality validation
    const prioritizedComments = prioritizeComments(allComments)
    
    console.log(`Progress: 90% - Comment processing complete: ${prioritizedComments.length} comments`)

    // Save comments and update existing checkpoint
    console.log(`Progress: 95% - Saving comments and updating checkpoint...`)
    let checkpoint: EssayCheckpoint | null = null
    
    if (prioritizedComments.length > 0) {
      // Create dummy quality metrics for checkpoint
      const dummyQualityMetrics = prioritizedComments.map(() => ({
        isValid: true,
        qualityScore: 0.8,
        issues: [],
        priority: 'medium' as const
      }))
      
      // Try to update existing checkpoint with AI feedback, fallback to creating new one
      try {
        checkpoint = await updateExistingCheckpointWithAIFeedback(
          essayId, 
          userId, 
          prioritizedComments, 
          dummyQualityMetrics
        )
      } catch (error) {
        console.warn(`Failed to update existing checkpoint: ${error.message}. Creating new checkpoint instead.`)
        
        // Fallback: Create a new checkpoint
        checkpoint = await createCheckpoint(
          essayId,
          userId,
          essayContent,
          prioritizedComments,
          dummyQualityMetrics,
          essayTitle,
          essayPrompt
        )
      }
      
      // Save new comments to database with checkpoint ID (preserve previous comments)
      console.log(`Saving ${prioritizedComments.length} new comments for checkpoint ${checkpoint.id}`)
      await saveCommentsToDatabase(essayId, userId, prioritizedComments, checkpoint.id)
      
      console.log(`Updated checkpoint ${checkpoint.checkpoint_number} with ${prioritizedComments.length} new comments (preserved ${previousComments.length} previous comments)`)
    }
    
    console.log(`Progress: 100% - Analysis complete!`)

    // Determine overall success based on comments
    const overallSuccess = prioritizedComments.length > 0
    const successCount = (weaknessesResponse.success ? 1 : 0) + (strengthsResponse.success ? 1 : 0) + 
                        (toneResponse.success ? 1 : 0) + (clarityResponse.success ? 1 : 0) + 
                        (grammarSpellingResponse.success ? 1 : 0) + (paragraphResponse.success ? 1 : 0)
    
    // Organize prioritized comments into structured format
    const structuredComments = {
      overall: {
        reconciled: prioritizedComments.filter(c => c.commentCategory === 'overall' && c.agentType === 'reconciliation'),
        tone: prioritizedComments.filter(c => c.commentCategory === 'overall' && c.agentType === 'tone'),
        editorChief: prioritizedComments.filter(c => c.commentCategory === 'overall' && c.agentType === 'editor_chief'),
        opening: prioritizedComments.filter(c => c.commentCategory === 'overall' && c.commentSubcategory === 'opening'),
        body: prioritizedComments.filter(c => c.commentCategory === 'overall' && c.commentSubcategory === 'body'),
        conclusion: prioritizedComments.filter(c => c.commentCategory === 'overall' && c.commentSubcategory === 'conclusion')
      },
      inline: {
        clarity: prioritizedComments.filter(c => c.commentCategory === 'inline' && c.agentType === 'clarity'),
        grammarSpelling: prioritizedComments.filter(c => c.commentCategory === 'inline' && c.agentType === 'grammar_spelling'),
        editorChief: prioritizedComments.filter(c => c.commentCategory === 'inline' && c.agentType === 'editor_chief'),
        openingSentence: prioritizedComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'opening-sentence'),
        transitions: prioritizedComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'transition'),
        paragraphQuality: prioritizedComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'paragraph-quality'),
        finalSentence: prioritizedComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'final-sentence'),
        paragraphSpecific: prioritizedComments.filter(c => c.commentCategory === 'inline' && c.commentSubcategory === 'paragraph-specific')
      }
    }

    // Create enhanced response with checkpoint info
    const response = {
      success: overallSuccess,
      comments: prioritizedComments.map(comment => ({
        textSelection: comment.textSelection,
        anchorText: comment.anchorText,
        commentText: comment.commentText,
        commentType: comment.commentType,
        confidenceScore: comment.confidenceScore,
        commentCategory: comment.commentCategory,
        commentSubcategory: comment.commentSubcategory
      })),
      message: `Multi-agent analysis complete. Generated ${prioritizedComments.length} comments.`,
      essayId,
      structuredComments,
      agentResults: {
        weaknesses: {
          success: weaknessesResponse.success,
          comments: weaknessesResponse.comments,
          agentType: 'weaknesses',
          error: weaknessesResponse.error
        },
        strengths: {
          success: strengthsResponse.success,
          comments: strengthsResponse.comments,
          agentType: 'strengths',
          error: strengthsResponse.error
        },
        reconciliation: {
          success: reconciliationResponse.success,
          comments: reconciliationResponse.comments,
          agentType: 'reconciliation',
          error: reconciliationResponse.error
        },
        tone: {
          success: toneResponse.success,
          comments: toneResponse.comments,
          agentType: 'tone',
          error: toneResponse.error
        },
        clarity: {
          success: clarityResponse.success,
          comments: clarityResponse.comments,
          agentType: 'clarity',
          error: clarityResponse.error
        },
        grammarSpelling: {
          success: grammarSpellingResponse.success,
          comments: grammarSpellingResponse.comments,
          agentType: 'grammar_spelling',
          error: grammarSpellingResponse.error
        },
        paragraph: {
          success: paragraphResponse.success,
          comments: paragraphResponse.comments,
          agentType: 'paragraph',
          error: paragraphResponse.error
        },
        changeDetection: {
          success: shouldRunChangeDetectionFlag ? changeDetectionResponse.success : false,
          comments: shouldRunChangeDetectionFlag ? changeDetectionResponse.comments : [],
          agentType: 'paragraph',
          error: shouldRunChangeDetectionFlag ? changeDetectionResponse.error : 'Not run (version 1)'
        },
        editorChief: {
          success: editorChiefResponse.success,
          comments: editorChiefResponse.comments,
          agentType: 'editor_chief',
          error: editorChiefResponse.error
        }
      },
      checkpoint: checkpoint ? {
        id: checkpoint.id,
        checkpointNumber: checkpoint.checkpoint_number,
        totalComments: checkpoint.total_comments,
        overallComments: checkpoint.overall_comments,
        inlineComments: checkpoint.inline_comments,
        averageQualityScore: checkpoint.average_quality_score,
        createdAt: checkpoint.created_at
      } : null
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in generate-essay-comments-orchestrator:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
        comments: [],
        agentResults: {
          weaknesses: { success: false, comments: [], error: error.message },
          strengths: { success: false, comments: [], error: error.message },
          reconciliation: { success: false, comments: [], error: error.message },
          tone: { success: false, comments: [], error: error.message },
          clarity: { success: false, comments: [], error: error.message },
          grammarSpelling: { success: false, comments: [], error: error.message },
          paragraph: { success: false, comments: [], error: error.message },
          changeDetection: { success: false, comments: [], error: error.message }
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
