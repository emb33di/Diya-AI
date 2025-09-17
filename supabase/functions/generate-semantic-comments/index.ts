/**
 * Generate Semantic Comments Edge Function
 * 
 * AI-powered comment generation for semantic document blocks.
 * This replaces the old position-based system with stable block-based anchoring.
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
    agentType?: 'big-picture' | 'paragraph' | 'weaknesses' | 'strengths';
    category?: 'overall' | 'inline';
    subcategory?: 'opening' | 'body' | 'conclusion' | 'opening-sentence' | 'transition' | 'paragraph-specific' | 'paragraph-quality' | 'final-sentence';
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

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

// Semantic AI prompt for block-based analysis
const SEMANTIC_AI_PROMPT = `You are an expert college admissions counselor specializing in strategic essay analysis. Analyze the following college application essay structured as semantic blocks and provide targeted feedback using precise text anchoring.

ESSAY PROMPT:
{prompt}

ESSAY CONTENT (Structured Blocks):
{blocks}

INSTRUCTIONS:
You will receive the essay content as structured blocks, each with a unique blockId and text content. Your task is to:

1. Analyze each block for potential improvements
2. For each comment you make, you MUST:
   - Use the exact blockId from the input
   - Provide the exact targetText substring from that block's content
   - Ensure the targetText exists verbatim in the block's content
   - Choose meaningful text that clearly represents what you're analyzing

RESPONSE FORMAT (JSON only):
{
  "comments": [
    {
      "targetBlockId": "block_uuid_12345",
      "targetText": "exact text from the block",
      "comment": "Your feedback text here",
      "type": "suggestion|critique|praise|question",
      "confidence": 0.85,
      "metadata": {
        "agentType": "paragraph",
        "category": "inline",
        "subcategory": "opening-sentence|transition|paragraph-quality|final-sentence"
      }
    }
  ]
}

CRITICAL REQUIREMENTS:
- Your response MUST be a valid JSON array of objects
- For each comment, you must provide the targetBlockId from the input context
- The targetText MUST be an exact substring from that block's content
- Do not invent targetText - use only text that exists in the block
- Provide 3-5 targeted comments focusing on the most impactful improvements
- Focus on strategic improvements that will have the biggest impact on admissions success

Focus on:
- Opening paragraph engagement and thesis clarity
- Body paragraph development and evidence
- Conclusion effectiveness
- Transition quality
- Overall essay flow and coherence
- Specific word choices and sentence structure
- Argument strength and evidence quality

Be specific and actionable in your feedback.`;

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

    // Generate AI comments
    const startTime = Date.now();
    const comments = await generateSemanticAIComments(blocks, context, options);
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
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function generateSemanticAIComments(
  blocks: DocumentBlock[], 
  context: any, 
  options?: any
): Promise<SemanticComment[]> {
  
  if (!GEMINI_API_KEY) {
    throw new Error('Google API key not configured');
  }

  // Format blocks for AI analysis
  const blocksText = blocks
    .sort((a, b) => a.position - b.position)
    .map(block => `Block ID: ${block.id}\nType: ${block.type}\nContent: ${block.content}`)
    .join('\n\n');

  // Prepare the prompt
  const prompt = SEMANTIC_AI_PROMPT
    .replace('{prompt}', context.prompt || 'No specific prompt provided')
    .replace('{blocks}', blocksText);

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    
    // Parse JSON response
    let parsedResponse;
    try {
      // Extract JSON from response text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      parsedResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate and process comments
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      throw new Error('Invalid comment structure in AI response');
    }

    const comments: SemanticComment[] = parsedResponse.comments.map((comment: any, index: number) => {
      // Validate required fields
      if (!comment.targetBlockId || typeof comment.targetBlockId !== 'string') {
        throw new Error(`Comment ${index}: missing or invalid 'targetBlockId' field`);
      }
      
      if (!comment.comment || typeof comment.comment !== 'string') {
        throw new Error(`Comment ${index}: missing or invalid 'comment' field`);
      }

      // Validate that the targetBlockId exists in our input
      const targetBlock = blocks.find(b => b.id === comment.targetBlockId);
      if (!targetBlock) {
        throw new Error(`Comment ${index}: targetBlockId '${comment.targetBlockId}' not found in input`);
      }

      // Validate targetText if provided
      if (comment.targetText && typeof comment.targetText === 'string') {
        if (!targetBlock.content.includes(comment.targetText)) {
          throw new Error(`Comment ${index}: targetText '${comment.targetText}' not found in block '${comment.targetBlockId}'`);
        }
      }

      // Validate comment type
      const validTypes = ['suggestion', 'critique', 'praise', 'question', 'comment'];
      if (!comment.type || !validTypes.includes(comment.type)) {
        comment.type = 'suggestion'; // Default fallback
      }

      return {
        targetBlockId: comment.targetBlockId,
        targetText: comment.targetText || undefined,
        comment: comment.comment,
        type: comment.type,
        confidence: Math.max(0.5, Math.min(1.0, comment.confidence || 0.8)),
        metadata: {
          agentType: comment.metadata?.agentType || 'paragraph',
          category: comment.metadata?.category || 'inline',
          subcategory: comment.metadata?.subcategory || 'paragraph-specific'
        }
      };
    });

    return comments;

  } catch (error) {
    console.error('Error generating semantic AI comments:', error);
    throw error;
  }
}
