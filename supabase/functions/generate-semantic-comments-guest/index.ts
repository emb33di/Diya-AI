/**
 * Generate Semantic Comments Guest Edge Function
 * 
 * AI-powered comment generation for guest/anonymous users.
 * Simplified version without authentication or database storage.
 * Used for the Ivy Readiness Report preview feature.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Context optimization utilities
interface OptimizedSemanticComment {
  id?: string;
  comment: string;
  agent_type: string;
  comment_nature?: string;
  confidence_score?: number;
}

class ContextOptimizer {
  private static readonly CHARS_PER_TOKEN = 4;
  private static readonly TOKEN_LIMITS = {
    context: 800,
    total: 3000
  };

  static estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  static truncateToTokens(text: string, maxTokens: number): string {
    const currentTokens = this.estimateTokens(text);
    if (currentTokens <= maxTokens) return text;
    
    const ratio = maxTokens / currentTokens;
    const truncateLength = Math.floor(text.length * ratio * 0.95);
    return text.substring(0, truncateLength) + "\n\n[Context truncated for length]";
  }

  static summarizeComments(comments: OptimizedSemanticComment[], maxTokens: number = 400): string {
    if (!comments || comments.length === 0) {
      return "No previous agent context available";
    }

    // Group by agent type
    const grouped: Record<string, OptimizedSemanticComment[]> = {};
    comments.forEach(comment => {
      const type = comment.agent_type || 'unknown';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(comment);
    });
    
    // Create condensed summary
    const summaryParts: string[] = [];
    Object.entries(grouped).forEach(([agentType, commentList]) => {
      const keyPoints = commentList
        .slice(0, 2)
        .map(c => this.extractKeyPoint(c.comment))
        .filter(point => point.length > 0);
      
      if (keyPoints.length > 0) {
        summaryParts.push(`${agentType.toUpperCase()}: ${keyPoints.join('; ')}`);
      }
    });

    let summary = summaryParts.join('\n');
    
    // Truncate if needed
    if (this.estimateTokens(summary) > maxTokens) {
      summary = this.truncateToTokens(summary, maxTokens);
    }

    return summary;
  }

  private static extractKeyPoint(comment: string): string {
    if (!comment) return '';
    
    let cleaned = comment
      .replace(/^(You should|Consider|Try to|The essay|This paragraph)/i, '')
      .replace(/^[,.\s]+/, '')
      .trim();
    
    const firstSentence = cleaned.split('.')[0];
    if (firstSentence.length <= 50) {
      return firstSentence;
    }
    
    return cleaned.substring(0, 50).trim() + '...';
  }

  static createAgentSpecificContext(
    comments: OptimizedSemanticComment[], 
    targetAgent: string,
    maxTokens: number = 600
  ): string {
    const relevanceMap: Record<string, string[]> = {
      'strengths': ['weaknesses'], // Strengths agent needs weaknesses context
      'tone': ['weaknesses', 'strengths'],
      'clarity': ['weaknesses'],
      'big-picture': ['weaknesses', 'strengths', 'tone', 'clarity']
    };

    const relevantTypes = relevanceMap[targetAgent] || [];
    
    if (relevantTypes.length === 0) {
      return `No context needed for ${targetAgent} agent`;
    }

    const relevantComments = comments.filter(c => 
      relevantTypes.includes(c.agent_type)
    );

    return this.summarizeComments(relevantComments, maxTokens);
  }
}

// API retry manager
class APIRetryManager {
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly BASE_DELAY = 1000;
  private static readonly MAX_DELAY = 30000;

  static async withRetry<T>(
    apiCall: () => Promise<T>,
    agentType: string = 'unknown',
    maxRetries: number = this.DEFAULT_RETRIES
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 ${agentType} agent attempt ${attempt}/${maxRetries}`);
        const result = await apiCall();
        
        if (attempt > 1) {
          console.log(`✅ ${agentType} agent succeeded on attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || attempt === maxRetries) {
          console.error(`❌ ${agentType} agent failed permanently:`, error.message);
          throw error;
        }

        const delay = Math.min(
          this.BASE_DELAY * Math.pow(2, attempt - 1),
          this.MAX_DELAY
        );
        
        console.warn(`⚠️ ${agentType} agent failed (attempt ${attempt}), retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private static isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    
    return (
      message.includes('503') ||
      message.includes('overloaded') ||
      message.includes('429') ||
      message.includes('500') ||
      message.includes('timeout') ||
      message.includes('network')
    );
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize Supabase client (only for calling other edge functions)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Types for semantic document system
interface DocumentBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'list' | 'quote' | 'code' | 'divider';
  content: string;
  position: number;
  annotations: any[];
}

interface SemanticComment {
  targetBlockId: string;
  targetText?: string;
  comment: string;
  type: 'suggestion' | 'critique' | 'praise' | 'question' | 'comment';
  confidence: number;
  metadata?: {
    agentType?: 'tone' | 'clarity' | 'strengths' | 'weaknesses' | 'paragraph' | 'big-picture' | 'grammar';
    category?: 'overall' | 'inline';
    subcategory?: 'opening' | 'body' | 'conclusion' | 'opening-sentence' | 'transition' | 'paragraph-specific' | 'paragraph-quality' | 'final-sentence' | 'grammar';
    commentNature?: 'strength' | 'weakness' | 'suggestion';
    commentCategory?: 'overall-analysis' | 'tone' | 'clarity' | 'strengths' | 'areas-for-improvement' | 'paragraph-quality' | 'grammar';
    qualityScore?: number;
  };
}

interface AICommentRequest {
  documentId: string;
  blocks: DocumentBlock[];
  context: {
    prompt?: string;
    wordLimit?: number;
    schoolType?: 'undergraduate' | 'graduate' | 'mba';
    applicationDeadline?: string;
    targetSchools?: string[];
  };
  options?: {
    focusAreas?: ('opening' | 'body' | 'conclusion' | 'transitions' | 'overall')[];
    commentTypes?: string[];
    maxComments?: number;
    minConfidence?: number;
  };
}

interface AICommentResponse {
  success: boolean;
  comments: SemanticComment[];
  message?: string;
  metadata?: {
    processingTime: number;
    blocksAnalyzed: number;
    commentsGenerated: number;
  };
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  };

  console.log('[GUEST] ===== Edge Function Invoked =====');
  console.log('[GUEST] Request method:', req.method);
  console.log('[GUEST] Request URL:', req.url);
  console.log('[GUEST] Request headers:', Object.fromEntries(req.headers.entries()));

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log('[GUEST] Handling CORS preflight request');
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      console.error('[GUEST] Invalid method:', req.method);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    console.log('[GUEST] Parsing request body...');
    let requestBody: AICommentRequest;
    try {
      const bodyText = await req.text();
      console.log('[GUEST] Raw request body length:', bodyText.length);
      console.log('[GUEST] Raw request body (first 500 chars):', bodyText.substring(0, 500));
      
      requestBody = JSON.parse(bodyText);
      console.log('[GUEST] Parsed request body keys:', Object.keys(requestBody));
      console.log('[GUEST] Request body structure:', {
        hasDocumentId: !!requestBody.documentId,
        hasBlocks: !!requestBody.blocks,
        blocksType: Array.isArray(requestBody.blocks) ? 'array' : typeof requestBody.blocks,
        blocksLength: Array.isArray(requestBody.blocks) ? requestBody.blocks.length : 'N/A',
        hasContext: !!requestBody.context,
        hasOptions: !!requestBody.options
      });
    } catch (parseError) {
      console.error('[GUEST] Failed to parse request body:', parseError);
      console.error('[GUEST] Parse error details:', {
        message: parseError.message,
        name: parseError.name,
        stack: parseError.stack
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON in request body',
        debug: {
          parseError: parseError.message
        }
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    const { documentId, blocks, context, options } = requestBody;

    console.log('[GUEST] Extracted values:', {
      documentId: documentId ? `${documentId.substring(0, 20)}...` : 'MISSING',
      blocksCount: Array.isArray(blocks) ? blocks.length : 'NOT_ARRAY',
      contextKeys: context ? Object.keys(context) : 'MISSING',
      hasOptions: !!options
    });

    // Validate input
    if (!documentId) {
      console.error('[GUEST] Validation failed: documentId is missing');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request: documentId is required',
        debug: {
          receivedDocumentId: documentId,
          receivedBlocks: blocks ? (Array.isArray(blocks) ? blocks.length : 'not_array') : 'missing'
        }
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    if (!blocks) {
      console.error('[GUEST] Validation failed: blocks is missing');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request: blocks is required',
        debug: {
          receivedDocumentId: documentId,
          receivedBlocks: 'missing'
        }
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    if (!Array.isArray(blocks)) {
      console.error('[GUEST] Validation failed: blocks is not an array, type:', typeof blocks);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request: blocks must be an array',
        debug: {
          receivedDocumentId: documentId,
          blocksType: typeof blocks,
          blocksValue: JSON.stringify(blocks).substring(0, 200)
        }
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    if (blocks.length === 0) {
      console.error('[GUEST] Validation failed: blocks array is empty');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request: blocks array cannot be empty',
        debug: {
          receivedDocumentId: documentId,
          blocksLength: 0
        }
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    console.log('[GUEST] Validation passed, proceeding with comment generation');

    // Generate AI comments without storing in database
    console.log(`[GUEST] Generating semantic comments for ${blocks.length} blocks`);
    const startTime = Date.now();
    const comments = await generateSpecializedSemanticComments(blocks, context, options, documentId);
    const processingTime = Date.now() - startTime;

    const response: AICommentResponse = {
      success: true,
      comments,
      message: `Generated ${comments.length} AI comments`,
      metadata: {
        processingTime,
        blocksAnalyzed: blocks.length,
        commentsGenerated: comments.length
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    });

  } catch (error) {
    console.error('[GUEST] ===== ERROR IN EDGE FUNCTION =====');
    console.error('[GUEST] Error type:', error?.constructor?.name || typeof error);
    console.error('[GUEST] Error message:', error?.message || 'No message');
    console.error('[GUEST] Error name:', error?.name || 'No name');
    console.error('[GUEST] Error stack:', error?.stack || 'No stack');
    console.error('[GUEST] Error cause:', error?.cause || 'No cause');
    console.error('[GUEST] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(JSON.stringify({
      success: false,
      error: `Internal server error: ${errorMessage}`,
      debug: {
        errorName: errorName,
        errorMessage: errorMessage,
        errorStack: errorStack?.substring(0, 500), // Limit stack trace length
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
    });
  }
});

/**
 * Generate specialized semantic comments using individual agents in chronological order
 * Order: 1) weaknesses, 2) strengths (with weaknesses context), 3) tone (with cumulative context), 
 *        4) clarity (with cumulative context), 5) big-picture (with all context)
 * 
 * Note: For guest users, we always use the default (non-MBA) agents since we don't have user profile data
 */
async function generateSpecializedSemanticComments(
  blocks: DocumentBlock[], 
  context: any, 
  options?: any,
  documentId?: string
): Promise<SemanticComment[]> {
  
  console.log(`[GUEST] Generating specialized semantic comments for ${blocks.length} blocks`);
  
  // Convert blocks to essay content for existing agents
  const essayContent = blocks
    .sort((a, b) => a.position - b.position)
    .map(block => block.content)
    .join('\n\n');

  const allComments: SemanticComment[] = [];
  const collectedComments: OptimizedSemanticComment[] = [];

  try {
    // Step 1: Call weaknesses agent first
    console.log('[GUEST] Step 1: Calling weaknesses agent...');
    const weaknessesResult = await APIRetryManager.withRetry(
      () => callSemanticWeaknessesAgent(blocks, context),
      'weaknesses'
    );
    let weaknessesComments: SemanticComment[] = [];
    
    if (weaknessesResult.success) {
      weaknessesComments = convertAgentCommentsToSemantic(weaknessesResult.comments, blocks, 'weaknesses');
      allComments.push(...weaknessesComments);
      console.log(`[GUEST] Weaknesses agent: ${weaknessesComments.length} comments`);
      
      // Collect for optimized context
      weaknessesComments.forEach(c => {
        collectedComments.push({
          comment: c.comment,
          agent_type: 'weaknesses',
          comment_nature: 'weakness'
        });
      });
    } else {
      console.error('[GUEST] Weaknesses agent failed:', weaknessesResult.error);
    }

    // Step 2: Call strengths agent with optimized context
    console.log('[GUEST] Step 2: Calling strengths agent with optimized context...');
    const strengthsContext = ContextOptimizer.createAgentSpecificContext(collectedComments, 'strengths', 400);
    console.log(`[GUEST] Strengths context size: ${ContextOptimizer.estimateTokens(strengthsContext)} tokens`);
    
    const strengthsResult = await APIRetryManager.withRetry(
      () => callSemanticStrengthsAgent(blocks, context, strengthsContext),
      'strengths'
    );
    let strengthsComments: SemanticComment[] = [];
    
    if (strengthsResult.success) {
      strengthsComments = convertAgentCommentsToSemantic(strengthsResult.comments, blocks, 'strengths');
      allComments.push(...strengthsComments);
      console.log(`[GUEST] Strengths agent: ${strengthsComments.length} comments`);
      
      // Collect for optimized context
      strengthsComments.forEach(c => {
        collectedComments.push({
          comment: c.comment,
          agent_type: 'strengths',
          comment_nature: 'strength'
        });
      });
    } else {
      console.error('[GUEST] Strengths agent failed:', strengthsResult.error);
    }

    // Step 3: Call tone agent with optimized context
    console.log('[GUEST] Step 3: Calling tone agent with optimized context...');
    const toneContext = ContextOptimizer.createAgentSpecificContext(collectedComments, 'tone', 400);
    console.log(`[GUEST] Tone context size: ${ContextOptimizer.estimateTokens(toneContext)} tokens`);
    
    const toneResult = await APIRetryManager.withRetry(
      () => callSemanticToneAgent(blocks, context, toneContext),
      'tone'
    );
    let toneComments: SemanticComment[] = [];
    
    if (toneResult.success) {
      toneComments = convertAgentCommentsToSemantic(toneResult.comments, blocks, 'tone');
      allComments.push(...toneComments);
      console.log(`[GUEST] Tone agent: ${toneComments.length} comments`);
      
      // Collect for optimized context
      toneComments.forEach(c => {
        collectedComments.push({
          comment: c.comment,
          agent_type: 'tone',
          comment_nature: 'suggestion'
        });
      });
    } else {
      console.error('[GUEST] Tone agent failed:', toneResult.error);
    }

    // Step 4: Call clarity agent with optimized context
    console.log('[GUEST] Step 4: Calling clarity agent with optimized context...');
    const clarityContext = ContextOptimizer.createAgentSpecificContext(collectedComments, 'clarity', 400);
    console.log(`[GUEST] Clarity context size: ${ContextOptimizer.estimateTokens(clarityContext)} tokens`);
    
    const clarityResult = await APIRetryManager.withRetry(
      () => callSemanticClarityAgent(blocks, context, clarityContext),
      'clarity'
    );
    let clarityComments: SemanticComment[] = [];
    
    if (clarityResult.success) {
      clarityComments = convertAgentCommentsToSemantic(clarityResult.comments, blocks, 'clarity');
      allComments.push(...clarityComments);
      console.log(`[GUEST] Clarity agent: ${clarityComments.length} comments`);
      
      // Collect for optimized context
      clarityComments.forEach(c => {
        collectedComments.push({
          comment: c.comment,
          agent_type: 'clarity',
          comment_nature: 'weakness'
        });
      });
    } else {
      console.error('[GUEST] Clarity agent failed:', clarityResult.error);
    }

    // Step 5: Call big-picture agent with optimized cumulative context
    console.log('[GUEST] Step 5: Calling big-picture agent with optimized context...');
    const bigPictureContext = ContextOptimizer.createAgentSpecificContext(collectedComments, 'big-picture', 600);
    console.log(`[GUEST] Big-picture context size: ${ContextOptimizer.estimateTokens(bigPictureContext)} tokens`);
    
    const bigPictureResult = await APIRetryManager.withRetry(
      () => callSemanticBigPictureAgent(blocks, context, bigPictureContext),
      'big-picture'
    );
    
    if (bigPictureResult.success) {
      const bigPictureComments = convertAgentCommentsToSemantic(bigPictureResult.comments, blocks, 'big-picture');
      allComments.push(...bigPictureComments);
      console.log(`[GUEST] Big-picture agent: ${bigPictureComments.length} comments`);
    } else {
      console.error('[GUEST] Big-picture agent failed:', bigPictureResult.error);
    }

    console.log(`[GUEST] Total semantic comments generated: ${allComments.length}`);
    return allComments;

  } catch (error) {
    console.error('[GUEST] Error generating specialized semantic comments:', error);
    console.error('[GUEST] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return partial results if we have any comments
    if (allComments.length > 0) {
      console.log(`[GUEST] Returning ${allComments.length} partial comments despite error`);
      return allComments;
    }
    
    throw error;
  }
}

/**
 * Call tone agent adapted for semantic blocks
 */
async function callSemanticToneAgent(blocks: DocumentBlock[], context: any, cumulativeContext?: string): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai_agent_tone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      essayContent,
      essayPrompt: context.prompt,
      cumulativeContext
    })
  });

  if (!response.ok) {
    throw new Error(`Tone agent error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Call clarity agent adapted for semantic blocks
 */
async function callSemanticClarityAgent(blocks: DocumentBlock[], context: any, cumulativeContext?: string): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai_agent_clarity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      essayContent,
      essayPrompt: context.prompt,
      cumulativeContext
    })
  });

  if (!response.ok) {
    throw new Error(`Clarity agent error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Call strengths agent adapted for semantic blocks
 * For guest users, always use the default (non-MBA) agent
 */
async function callSemanticStrengthsAgent(blocks: DocumentBlock[], context: any, cumulativeContext?: string): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  // Always use default agent for guests (no user profile data available)
  const agentEndpoint = 'ai_agent_strengths';
  console.log('[GUEST] Using default strengths agent (no user profile data)');
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${agentEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      essayContent,
      essayPrompt: context.prompt,
      weaknessesContext: cumulativeContext
    })
  });

  if (!response.ok) {
    throw new Error(`Strengths agent error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Call weaknesses agent adapted for semantic blocks
 * For guest users, always use the default (non-MBA) agent
 */
async function callSemanticWeaknessesAgent(blocks: DocumentBlock[], context: any): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  // Always use default agent for guests (no user profile data available)
  const agentEndpoint = 'ai_agent_weaknesses';
  console.log('[GUEST] Using default weaknesses agent (no user profile data)');
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${agentEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      essayContent,
      essayPrompt: context.prompt
    })
  });

  if (!response.ok) {
    throw new Error(`Weaknesses agent error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Call big-picture agent adapted for semantic blocks
 * For guest users, always use the default (non-MBA) agent
 */
async function callSemanticBigPictureAgent(blocks: DocumentBlock[], context: any, cumulativeContext?: string): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  // Always use default agent for guests (no user profile data available)
  const agentEndpoint = 'ai_agent_big_picture';
  console.log('[GUEST] Using default big picture agent (no user profile data)');
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${agentEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      essayContent,
      essayPrompt: context.prompt,
      cumulativeContext
    })
  });

  if (!response.ok) {
    throw new Error(`Big-picture agent error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Convert agent comments to semantic format
 */
function convertAgentCommentsToSemantic(
  agentComments: any[], 
  blocks: DocumentBlock[], 
  agentType: 'tone' | 'clarity' | 'strengths' | 'weaknesses' | 'big-picture'
): SemanticComment[] {
  const semanticComments: SemanticComment[] = [];

  for (const agentComment of agentComments) {
    // Find the best matching block for this comment
    const targetBlock = findBestMatchingBlock(agentComment, blocks);
    if (!targetBlock) continue;

    // Extract target text from the comment
    const targetText = agentComment.anchor_text || agentComment.target_text || 
                      extractTargetTextFromComment(agentComment, targetBlock.content);

    // Map comment type
    const commentType = mapAgentCommentType(agentComment, agentType);

    // Map comment nature
    const commentNature = mapCommentNature(agentComment, agentType);
    
    // Map comment category for sidebar organization
    const commentCategory = mapCommentCategory(agentType, agentComment);

    const semanticComment: SemanticComment = {
      targetBlockId: targetBlock.id,
      targetText: targetText,
      comment: agentComment.comment_text || agentComment.commentText || agentComment.comment,
      type: commentType,
      confidence: agentComment.confidence_score || agentComment.confidenceScore || 0.8,
      metadata: {
        agentType: agentType,
        category: agentComment.comment_category || agentComment.commentCategory || 'inline',
        subcategory: agentComment.comment_subcategory || agentComment.commentSubcategory || 'paragraph-specific',
        commentNature: commentNature,
        commentCategory: commentCategory,
        qualityScore: agentComment.quality_score || agentComment.qualityScore // Preserve quality score from agents
      }
    };

    semanticComments.push(semanticComment);
  }

  return semanticComments;
}

/**
 * Find the best matching block for an agent comment
 */
function findBestMatchingBlock(agentComment: any, blocks: DocumentBlock[]): DocumentBlock | null {
  // Strategy 1: Use paragraph_id if available
  if (agentComment.paragraph_id || agentComment.paragraphId) {
    const block = blocks.find(b => b.id === agentComment.paragraph_id || b.id === agentComment.paragraphId);
    if (block) return block;
  }

  // Strategy 2: Use paragraph_index if available
  if (agentComment.paragraph_index !== null && agentComment.paragraph_index !== undefined) {
    const block = blocks[agentComment.paragraph_index];
    if (block) return block;
  }

  // Strategy 3: Try to match anchor_text with block content
  const anchorText = agentComment.anchor_text || agentComment.anchorText;
  if (anchorText) {
    const block = blocks.find(b => 
      b.content.toLowerCase().includes(anchorText.toLowerCase())
    );
    if (block) return block;
  }

  // Strategy 4: Use text selection if available
  if (agentComment.text_selection || agentComment.textSelection) {
    const selection = agentComment.text_selection || agentComment.textSelection;
    if (selection.start !== undefined && selection.end !== undefined) {
      // Find block that contains this text range
      let currentPos = 0;
      for (const block of blocks) {
        const blockEnd = currentPos + block.content.length;
        if (selection.start >= currentPos && selection.end <= blockEnd) {
          return block;
        }
        currentPos = blockEnd + 2; // +2 for newlines
      }
    }
  }

  // Strategy 5: For overall comments, use first block
  if (agentComment.comment_category === 'overall' || agentComment.commentCategory === 'overall') {
    return blocks[0] || null;
  }

  // Strategy 6: Fallback to first block
  return blocks[0] || null;
}

/**
 * Extract target text from comment
 */
function extractTargetTextFromComment(agentComment: any, blockContent: string): string | undefined {
  const anchorText = agentComment.anchor_text || agentComment.anchorText;
  if (anchorText && blockContent.includes(anchorText)) {
    return anchorText;
  }

  // Try to intelligently extract the relevant text based on the comment content
  const commentText = agentComment.comment_text || agentComment.commentText || agentComment.comment || '';
  
  // Look for quoted text in the comment (e.g., "'To bridge our divide' is a bit wordy")
  const quotedTextMatch = commentText.match(/['"]([^'"]+)['"]/);
  if (quotedTextMatch && quotedTextMatch[1]) {
    const quotedText = quotedTextMatch[1];
    // Check if this quoted text exists in the block content
    if (blockContent.toLowerCase().includes(quotedText.toLowerCase())) {
      return quotedText;
    }
  }
  
  // Look for text patterns that suggest specific phrases (e.g., "Consider replacing X with Y")
  const replacePatterns = [
    /consider replacing ['"]([^'"]+)['"] with/i,
    /instead of ['"]([^'"]+)['"],/i,
    /the phrase ['"]([^'"]+)['"]/i,
    /['"]([^'"]+)['"] could be/i,
    /['"]([^'"]+)['"] is/i
  ];
  
  for (const pattern of replacePatterns) {
    const match = commentText.match(pattern);
    if (match && match[1]) {
      const suggestedText = match[1];
      if (blockContent.toLowerCase().includes(suggestedText.toLowerCase())) {
        return suggestedText;
      }
    }
  }
  
  // Look for specific words or phrases mentioned in the comment
  const words = commentText.split(' ');
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = words.slice(i, i + 3).join(' ').replace(/[.,!?;:]/g, '');
    if (phrase.length > 3 && blockContent.toLowerCase().includes(phrase.toLowerCase())) {
      return phrase;
    }
  }
  
  // If comment mentions specific categories, try to find relevant text
  if (commentText.toLowerCase().includes('opening') || commentText.toLowerCase().includes('beginning')) {
    const sentences = blockContent.split(/[.!?]+/);
    if (sentences[0]) {
      return sentences[0].trim() + '.';
    }
  }
  
  if (commentText.toLowerCase().includes('concluding') || commentText.toLowerCase().includes('ending')) {
    const sentences = blockContent.split(/[.!?]+/);
    const lastSentence = sentences[sentences.length - 1];
    if (lastSentence && lastSentence.trim()) {
      return lastSentence.trim() + '.';
    }
  }
  
  // For transition comments, look for transitional phrases
  if (commentText.toLowerCase().includes('transition')) {
    const transitionWords = ['however', 'therefore', 'furthermore', 'moreover', 'additionally', 'consequently', 'to bridge', 'to resolve'];
    for (const word of transitionWords) {
      const index = blockContent.toLowerCase().indexOf(word.toLowerCase());
      if (index !== -1) {
        // Extract the sentence containing the transition
        const beforeText = blockContent.substring(0, index);
        const afterText = blockContent.substring(index);
        const sentenceEnd = afterText.indexOf('.') !== -1 ? afterText.indexOf('.') + 1 : Math.min(50, afterText.length);
        return afterText.substring(0, sentenceEnd);
      }
    }
  }

  // Fallback: Try to find the most relevant sentence based on comment keywords
  const sentences = blockContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const commentWords = commentText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  let bestSentence = '';
  let bestScore = 0;
  
  for (const sentence of sentences) {
    let score = 0;
    const sentenceLower = sentence.toLowerCase();
    for (const word of commentWords) {
      if (sentenceLower.includes(word)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence.trim();
    }
  }
  
  if (bestSentence && bestScore > 0) {
    return bestSentence + '.';
  }

  // Final fallback: Use first sentence or first 50 characters
  const firstSentence = blockContent.split(/[.!?]+/)[0];
  if (firstSentence && firstSentence.length > 10) {
    return firstSentence.trim() + '.';
  }
  
  return blockContent.substring(0, 50) + '...';
}

/**
 * Map agent comment type to semantic comment type
 * Maps based on agent type and comment nature to return appropriate annotation types
 */
function mapAgentCommentType(agentComment: any, agentType: string): 'suggestion' | 'critique' | 'praise' | 'comment' {
  // Check if comment has explicit type
  const explicitType = agentComment.comment_type || agentComment.commentType;
  if (explicitType) {
    switch (explicitType.toLowerCase()) {
      case 'praise': return 'praise';
      case 'critique': return 'critique';
      case 'suggestion': return 'suggestion';
      case 'comment': return 'comment';
      default: break;
    }
  }

  // Get comment nature to help determine type
  const commentNature = agentComment.comment_nature || agentComment.commentNature;

  // Map based on agent type and comment nature
  switch (agentType) {
    case 'strengths':
      // Strengths agent typically generates praise
      return commentNature === 'weakness' ? 'suggestion' : 'praise';
    
    case 'weaknesses':
      // Weaknesses agent typically generates critique
      return commentNature === 'strength' ? 'suggestion' : 'critique';
    
    case 'tone':
    case 'clarity':
    case 'big-picture':
    case 'paragraph':
    case 'grammar':
      // These agents typically generate suggestions
      return 'suggestion';
    
    default:
      // Fallback based on comment nature
      if (commentNature === 'strength') return 'praise';
      if (commentNature === 'weakness') return 'critique';
      return 'suggestion';
  }
}

/**
 * Map comment nature
 */
function mapCommentNature(agentComment: any, agentType: string): 'strength' | 'weakness' | 'suggestion' {
  const commentNature = agentComment.comment_nature || agentComment.commentNature;
  
  if (commentNature) {
    switch (commentNature) {
      case 'strength': return 'strength';
      case 'weakness': return 'weakness';
      case 'suggestion': return 'suggestion';
      default: return 'suggestion';
    }
  }

  // Map based on agent type
  switch (agentType) {
    case 'strengths': return 'strength';
    case 'weaknesses': return 'weakness';
    case 'tone':
    case 'clarity': return 'suggestion';
    default: return 'suggestion';
  }
}

/**
 * Map comment category for sidebar organization
 */
function mapCommentCategory(
  agentType: string, 
  agentComment: any
): 'overall-analysis' | 'tone' | 'clarity' | 'strengths' | 'areas-for-improvement' | 'paragraph-quality' | 'grammar' {
  // Check if comment has explicit category
  const explicitCategory = agentComment.comment_category_sidebar || agentComment.commentCategorySidebar;
  if (explicitCategory) {
    return explicitCategory;
  }

  // Map based on agent type
  switch (agentType) {
    case 'big-picture': return 'overall-analysis';
    case 'tone': return 'tone';
    case 'clarity': return 'clarity';
    case 'strengths': return 'strengths';
    case 'weaknesses': return 'areas-for-improvement';
    case 'paragraph': return 'paragraph-quality';
    case 'grammar': return 'grammar';
    default: 
      // Fallback based on comment nature
      const commentNature = agentComment.comment_nature || agentComment.commentNature;
      if (commentNature === 'strength') return 'strengths';
      if (commentNature === 'weakness') return 'areas-for-improvement';
      return 'clarity'; // Default fallback
  }
}

