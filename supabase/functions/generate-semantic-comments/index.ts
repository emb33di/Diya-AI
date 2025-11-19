/**
 * Generate Semantic Comments Edge Function
 * 
 * AI-powered comment generation for semantic document blocks using specialized agents.
 * Integrates with existing tone, clarity, strengths, and weaknesses agents.
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

// Initialize Supabase client
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
  isAnonymous?: boolean; // If true, skip authentication and database storage
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

// Supabase client already initialized above

// Note: This function now uses specialized agents instead of a single generic prompt

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  };

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    const requestBody: AICommentRequest = await req.json();
    const { documentId, blocks, context, options, isAnonymous } = requestBody;

    // Handle anonymous requests (skip authentication and database storage)
    if (isAnonymous) {
      // Validate input
      if (!documentId || !blocks || blocks.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid request: documentId and blocks are required' 
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
        });
      }

      // Generate AI comments without storing in database
      const startTime = Date.now();
      const comments = await generateSpecializedSemanticComments(blocks, context, options, documentId, undefined);
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
    }

    // Authenticated flow - require authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authorization header required' 
      }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid authentication token' 
      }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    // Validate input
    if (!documentId || !blocks || blocks.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request: documentId and blocks are required' 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    // Check if unresolved AI comments already exist for this document (excluding grammar comments)
    const { data: existingComments } = await supabase
      .from('semantic_annotations')
      .select('*')
      .eq('document_id', documentId)
      .eq('author', 'ai')
      .neq('metadata->agentType', 'grammar')
      .eq('resolved', false);

    if (existingComments && existingComments.length > 0) {
      // Convert existing comments to semantic format
      const semanticComments: SemanticComment[] = existingComments.map(comment => ({
        targetBlockId: comment.block_id,
        targetText: comment.target_text,
        comment: comment.content,
        type: comment.type,
        confidence: comment.metadata?.confidence || 0.8,
        metadata: comment.metadata
      }));

      return new Response(JSON.stringify({
        success: true,
        comments: semanticComments,
        message: `Found ${semanticComments.length} unresolved AI comments. Please resolve or delete existing comments before generating new ones.`,
        metadata: {
          processingTime: 0,
          blocksAnalyzed: blocks.length,
          commentsGenerated: semanticComments.length
        }
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }

    // Generate AI comments using specialized agents
    const startTime = Date.now();
    const comments = await generateSpecializedSemanticComments(blocks, context, options, documentId, user.id);
    const processingTime = Date.now() - startTime;

    // Store comments in database
    if (comments.length > 0) {
      const annotationsToInsert = comments.map(comment => ({
        id: crypto.randomUUID(),
        document_id: documentId,
        block_id: comment.targetBlockId,
        type: comment.type,
        author: 'ai',
        content: comment.comment,
        target_text: comment.targetText,
        resolved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          confidence: comment.confidence,
          ...comment.metadata
        }
      }));

      const { error: insertError } = await supabase
        .from('semantic_annotations')
        .insert(annotationsToInsert);

      if (insertError) {
        console.error('Error storing AI comments:', insertError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to store AI comments'
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
        });
      }
    }

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
    console.error('Error in generate-semantic-comments:', error);
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      debug: {
        errorName: error.name,
        errorMessage: error.message
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
 */
async function generateSpecializedSemanticComments(
  blocks: DocumentBlock[], 
  context: any, 
  options?: any,
  documentId?: string,
  userId?: string
): Promise<SemanticComment[]> {
  
  console.log(`Generating specialized semantic comments for ${blocks.length} blocks`);
  
  // Convert blocks to essay content for existing agents
  const essayContent = blocks
    .sort((a, b) => a.position - b.position)
    .map(block => block.content)
    .join('\n\n');

  const allComments: SemanticComment[] = [];
  const collectedComments: OptimizedSemanticComment[] = [];

  try {
    // Step 1: Call weaknesses agent first
    console.log('Step 1: Calling weaknesses agent...');
    const weaknessesResult = await APIRetryManager.withRetry(
      () => callSemanticWeaknessesAgent(blocks, context, userId),
      'weaknesses'
    );
    let weaknessesComments: SemanticComment[] = [];
    
    if (weaknessesResult.success) {
      weaknessesComments = convertAgentCommentsToSemantic(weaknessesResult.comments, blocks, 'weaknesses');
      allComments.push(...weaknessesComments);
      console.log(`Weaknesses agent: ${weaknessesComments.length} comments`);
      
      // Collect for optimized context
      weaknessesComments.forEach(c => {
        collectedComments.push({
          comment: c.comment,
          agent_type: 'weaknesses',
          comment_nature: 'weakness'
        });
      });
    } else {
      console.error('Weaknesses agent failed:', weaknessesResult.error);
    }

    // Step 2: Call strengths agent with optimized context
    console.log('Step 2: Calling strengths agent with optimized context...');
    const strengthsContext = ContextOptimizer.createAgentSpecificContext(collectedComments, 'strengths', 400);
    console.log(`Strengths context size: ${ContextOptimizer.estimateTokens(strengthsContext)} tokens`);
    
    const strengthsResult = await APIRetryManager.withRetry(
      () => callSemanticStrengthsAgent(blocks, context, strengthsContext, userId),
      'strengths'
    );
    let strengthsComments: SemanticComment[] = [];
    
    if (strengthsResult.success) {
      strengthsComments = convertAgentCommentsToSemantic(strengthsResult.comments, blocks, 'strengths');
      allComments.push(...strengthsComments);
      console.log(`Strengths agent: ${strengthsComments.length} comments`);
      
      // Collect for optimized context
      strengthsComments.forEach(c => {
        collectedComments.push({
          comment: c.comment,
          agent_type: 'strengths',
          comment_nature: 'strength'
        });
      });
    } else {
      console.error('Strengths agent failed:', strengthsResult.error);
    }

    // Step 3: Call tone agent with optimized context
    console.log('Step 3: Calling tone agent with optimized context...');
    const toneContext = ContextOptimizer.createAgentSpecificContext(collectedComments, 'tone', 400);
    console.log(`Tone context size: ${ContextOptimizer.estimateTokens(toneContext)} tokens`);
    
    const toneResult = await APIRetryManager.withRetry(
      () => callSemanticToneAgent(blocks, context, toneContext),
      'tone'
    );
    let toneComments: SemanticComment[] = [];
    
    if (toneResult.success) {
      toneComments = convertAgentCommentsToSemantic(toneResult.comments, blocks, 'tone');
      allComments.push(...toneComments);
      console.log(`Tone agent: ${toneComments.length} comments`);
      
      // Collect for optimized context
      toneComments.forEach(c => {
        collectedComments.push({
          comment: c.comment,
          agent_type: 'tone',
          comment_nature: 'suggestion'
        });
      });
    } else {
      console.error('Tone agent failed:', toneResult.error);
    }

    // Step 4: Call clarity agent with optimized context
    console.log('Step 4: Calling clarity agent with optimized context...');
    const clarityContext = ContextOptimizer.createAgentSpecificContext(collectedComments, 'clarity', 400);
    console.log(`Clarity context size: ${ContextOptimizer.estimateTokens(clarityContext)} tokens`);
    
    const clarityResult = await APIRetryManager.withRetry(
      () => callSemanticClarityAgent(blocks, context, clarityContext),
      'clarity'
    );
    let clarityComments: SemanticComment[] = [];
    
    if (clarityResult.success) {
      clarityComments = convertAgentCommentsToSemantic(clarityResult.comments, blocks, 'clarity');
      allComments.push(...clarityComments);
      console.log(`Clarity agent: ${clarityComments.length} comments`);
      
      // Collect for optimized context
      clarityComments.forEach(c => {
        collectedComments.push({
          comment: c.comment,
          agent_type: 'clarity',
          comment_nature: 'weakness'
        });
      });
    } else {
      console.error('Clarity agent failed:', clarityResult.error);
    }

    // Step 5: Call big-picture agent with optimized cumulative context
    console.log('Step 5: Calling big-picture agent with optimized context...');
    const bigPictureContext = ContextOptimizer.createAgentSpecificContext(collectedComments, 'big-picture', 600);
    console.log(`Big-picture context size: ${ContextOptimizer.estimateTokens(bigPictureContext)} tokens`);
    
    const bigPictureResult = await APIRetryManager.withRetry(
      () => callSemanticBigPictureAgent(blocks, context, bigPictureContext, userId),
      'big-picture'
    );
    
    if (bigPictureResult.success) {
      const bigPictureComments = convertAgentCommentsToSemantic(bigPictureResult.comments, blocks, 'big-picture');
      allComments.push(...bigPictureComments);
      console.log(`Big-picture agent: ${bigPictureComments.length} comments`);
    } else {
      console.error('Big-picture agent failed:', bigPictureResult.error);
    }

    console.log(`Total semantic comments generated: ${allComments.length}`);
    return allComments;

  } catch (error) {
    console.error('Error generating specialized semantic comments:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return partial results if we have any comments
    if (allComments.length > 0) {
      console.log(`Returning ${allComments.length} partial comments despite error`);
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
 * Routes to MBA-specific agent if user is applying to MBA programs
 */
async function callSemanticStrengthsAgent(blocks: DocumentBlock[], context: any, cumulativeContext?: string, userId?: string): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  // Determine which agent to use based on user's program type
  let agentEndpoint = 'ai_agent_strengths'; // Default to regular agent
  
  if (userId) {
    const programType = await getUserProgramType(userId);
    if (programType === 'mba') {
      agentEndpoint = 'ai_agent_strengths_mba';
      console.log('Routing to MBA-specific strengths agent');
    } else {
      console.log('Routing to regular strengths agent for program type:', programType);
    }
  } else {
    console.log('No userId provided, using default strengths agent');
  }
  
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
 * Routes to MBA-specific agent if user is applying to MBA programs
 */
async function callSemanticWeaknessesAgent(blocks: DocumentBlock[], context: any, userId?: string): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  // Determine which agent to use based on user's program type
  let agentEndpoint = 'ai_agent_weaknesses'; // Default to regular agent
  
  if (userId) {
    const programType = await getUserProgramType(userId);
    if (programType === 'mba') {
      agentEndpoint = 'ai_agent_weaknesses_mba';
      console.log('Routing to MBA-specific weaknesses agent');
    } else {
      console.log('Routing to regular weaknesses agent for program type:', programType);
    }
  } else {
    console.log('No userId provided, using default weaknesses agent');
  }
  
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
 * Get user's program type from their profile
 */
async function getUserProgramType(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('applying_to')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user program type:', error);
      return null;
    }

    return data?.applying_to || null;
  } catch (error) {
    console.error('Error in getUserProgramType:', error);
    return null;
  }
}

/**
 * Call big-picture agent adapted for semantic blocks
 * Routes to MBA-specific agent if user is applying to MBA programs
 */
async function callSemanticBigPictureAgent(blocks: DocumentBlock[], context: any, cumulativeContext?: string, userId?: string): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  // Determine which agent to use based on user's program type
  let agentEndpoint = 'ai_agent_big_picture'; // Default to regular agent
  
  if (userId) {
    const programType = await getUserProgramType(userId);
    if (programType === 'mba') {
      agentEndpoint = 'ai_agent_big_picture_mba';
      console.log('Routing to MBA-specific big picture agent');
    } else {
      console.log('Routing to regular big picture agent for program type:', programType);
    }
  } else {
    console.log('No userId provided, using default big picture agent');
  }
  
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
