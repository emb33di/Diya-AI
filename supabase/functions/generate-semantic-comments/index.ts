/**
 * Generate Semantic Comments Edge Function
 * 
 * AI-powered comment generation for semantic document blocks using specialized agents.
 * Integrates with existing tone, clarity, strengths, and weaknesses agents.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Note: This function now uses specialized agents instead of a single generic prompt

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requestBody: AICommentRequest = await req.json();
    const { documentId, blocks, context, options } = requestBody;

    // Validate input
    if (!documentId || !blocks || blocks.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request: documentId and blocks are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if AI comments already exist for this document
    const { data: existingComments } = await supabase
      .from('semantic_annotations')
      .select('id')
      .eq('document_id', documentId)
      .eq('author', 'ai');

    if (existingComments && existingComments.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'AI comments already exist for this document'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate AI comments using specialized agents
    const startTime = Date.now();
    const comments = await generateSpecializedSemanticComments(blocks, context, options);
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
          headers: { 'Content-Type': 'application/json' },
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
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in generate-semantic-comments:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

/**
 * Generate specialized semantic comments using existing edge functions
 */
async function generateSpecializedSemanticComments(
  blocks: DocumentBlock[], 
  context: any, 
  options?: any
): Promise<SemanticComment[]> {
  
  console.log(`Generating specialized semantic comments for ${blocks.length} blocks`);
  
  // Convert blocks to essay content for existing agents
  const essayContent = blocks
    .sort((a, b) => a.position - b.position)
    .map(block => block.content)
    .join('\n\n');

  const allComments: SemanticComment[] = [];

  try {
    // Call specialized agents in parallel
    const [toneResult, clarityResult, strengthsResult, weaknessesResult, bigPictureResult] = await Promise.allSettled([
      callSemanticToneAgent(blocks, context),
      callSemanticClarityAgent(blocks, context),
      callSemanticStrengthsAgent(blocks, context),
      callSemanticWeaknessesAgent(blocks, context),
      callSemanticBigPictureAgent(blocks, context)
    ]);

    // Process tone agent results
    if (toneResult.status === 'fulfilled' && toneResult.value.success) {
      const toneComments = convertAgentCommentsToSemantic(toneResult.value.comments, blocks, 'tone');
      allComments.push(...toneComments);
      console.log(`Tone agent: ${toneComments.length} comments`);
    } else {
      console.error('Tone agent failed:', toneResult.status === 'rejected' ? toneResult.reason : toneResult.value.error);
    }

    // Process clarity agent results
    if (clarityResult.status === 'fulfilled' && clarityResult.value.success) {
      const clarityComments = convertAgentCommentsToSemantic(clarityResult.value.comments, blocks, 'clarity');
      allComments.push(...clarityComments);
      console.log(`Clarity agent: ${clarityComments.length} comments`);
    } else {
      console.error('Clarity agent failed:', clarityResult.status === 'rejected' ? clarityResult.reason : clarityResult.value.error);
    }

    // Process strengths agent results
    if (strengthsResult.status === 'fulfilled' && strengthsResult.value.success) {
      const strengthsComments = convertAgentCommentsToSemantic(strengthsResult.value.comments, blocks, 'strengths');
      allComments.push(...strengthsComments);
      console.log(`Strengths agent: ${strengthsComments.length} comments`);
    } else {
      console.error('Strengths agent failed:', strengthsResult.status === 'rejected' ? strengthsResult.reason : strengthsResult.value.error);
    }

    // Process weaknesses agent results
    if (weaknessesResult.status === 'fulfilled' && weaknessesResult.value.success) {
      const weaknessesComments = convertAgentCommentsToSemantic(weaknessesResult.value.comments, blocks, 'weaknesses');
      allComments.push(...weaknessesComments);
      console.log(`Weaknesses agent: ${weaknessesComments.length} comments`);
    } else {
      console.error('Weaknesses agent failed:', weaknessesResult.status === 'rejected' ? weaknessesResult.reason : weaknessesResult.value.error);
    }

    // Process big-picture agent results
    if (bigPictureResult.status === 'fulfilled' && bigPictureResult.value.success) {
      const bigPictureComments = convertAgentCommentsToSemantic(bigPictureResult.value.comments, blocks, 'big-picture');
      allComments.push(...bigPictureComments);
      console.log(`Big-picture agent: ${bigPictureComments.length} comments`);
    } else {
      console.error('Big-picture agent failed:', bigPictureResult.status === 'rejected' ? bigPictureResult.reason : bigPictureResult.value.error);
    }

    console.log(`Total semantic comments generated: ${allComments.length}`);
    return allComments;

  } catch (error) {
    console.error('Error generating specialized semantic comments:', error);
    throw error;
  }
}

/**
 * Call tone agent adapted for semantic blocks
 */
async function callSemanticToneAgent(blocks: DocumentBlock[], context: any): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai_agent_tone`, {
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
    throw new Error(`Tone agent error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Call clarity agent adapted for semantic blocks
 */
async function callSemanticClarityAgent(blocks: DocumentBlock[], context: any): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai_agent_clarity`, {
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
    throw new Error(`Clarity agent error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Call strengths agent adapted for semantic blocks
 */
async function callSemanticStrengthsAgent(blocks: DocumentBlock[], context: any): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-essay-comments-orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      essayContent,
      essayPrompt: context.prompt,
      agentTypes: ['strengths']
    })
  });

  if (!response.ok) {
    throw new Error(`Strengths agent error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Call weaknesses agent adapted for semantic blocks
 */
async function callSemanticWeaknessesAgent(blocks: DocumentBlock[], context: any): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-essay-comments-orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      essayContent,
      essayPrompt: context.prompt,
      agentTypes: ['weaknesses']
    })
  });

  if (!response.ok) {
    throw new Error(`Weaknesses agent error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Call big-picture agent adapted for semantic blocks
 */
async function callSemanticBigPictureAgent(blocks: DocumentBlock[], context: any): Promise<any> {
  const essayContent = blocks.map(b => b.content).join('\n\n');
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-essay-comments-orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      essayContent,
      essayPrompt: context.prompt,
      agentTypes: ['big-picture']
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
        commentCategory: commentCategory
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

  // Try to extract a meaningful snippet from the block
  const words = blockContent.split(' ');
  if (words.length > 10) {
    return words.slice(0, 10).join(' ') + '...';
  }
  
  return blockContent.substring(0, 50) + '...';
}

/**
 * Map agent comment type to semantic comment type
 */
function mapAgentCommentType(agentComment: any, agentType: string): 'suggestion' | 'critique' | 'praise' | 'question' | 'comment' {
  const commentType = agentComment.comment_type || agentComment.commentType;
  
  if (commentType) {
    switch (commentType) {
      case 'suggestion': return 'suggestion';
      case 'critique': return 'critique';
      case 'praise': return 'praise';
      case 'question': return 'question';
      default: return 'comment';
    }
  }

  // Map based on agent type and comment nature
  const commentNature = agentComment.comment_nature || agentComment.commentNature;
  
  if (agentType === 'strengths' || commentNature === 'strength') {
    return 'praise';
  } else if (agentType === 'weaknesses' || commentNature === 'weakness') {
    return 'critique';
  } else if (agentType === 'tone' || agentType === 'clarity') {
    return 'suggestion';
  }

  return 'suggestion';
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
