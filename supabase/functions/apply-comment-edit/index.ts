/**
 * Apply Comment Edit Edge Function
 * 
 * Handles accepting or rejecting grammar comment edits with surgical text replacement.
 * Updates document content and marks annotations as accepted/rejected.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplyEditRequest {
  documentId: string;
  annotationId: string;
  action: 'accept' | 'reject';
}

interface ApplyEditResponse {
  success: boolean;
  updatedContent?: string;
  message?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { documentId, annotationId, action }: ApplyEditRequest = await req.json();

    // Validate required fields
    if (!documentId || !annotationId || !action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: documentId, annotationId, and action are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['accept', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid action. Must be "accept" or "reject"' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Apply edit request: ${action} for annotation ${annotationId} in document ${documentId}`);

    // Get the annotation
    const { data: annotation, error: annotationError } = await supabaseClient
      .from('semantic_annotations')
      .select('*')
      .eq('id', annotationId)
      .eq('document_id', documentId)
      .single();

    if (annotationError || !annotation) {
      console.error('Annotation not found:', annotationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Annotation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow grammar comments for now
    if (annotation.metadata?.agentType !== 'grammar') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only grammar comments can be edited' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if annotation is already resolved
    if (annotation.resolved) {
      return new Response(
        JSON.stringify({ success: false, error: 'Annotation has already been resolved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'accept') {
      // Validate that we have the required fields for accepting
      const originalText = annotation.original_text || annotation.target_text;
      const suggestedReplacement = annotation.suggested_replacement;

      if (!originalText || !suggestedReplacement) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing original text or suggested replacement for accepting edit' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the document
      const { data: document, error: docError } = await supabaseClient
        .from('semantic_documents')
        .select('blocks, metadata')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        console.error('Document not found:', docError);
        return new Response(
          JSON.stringify({ success: false, error: 'Document not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find the block containing the annotation
      const targetBlock = document.blocks.find((block: any) => 
        block.annotations?.some((ann: any) => ann.id === annotationId)
      );

      if (!targetBlock) {
        return new Response(
          JSON.stringify({ success: false, error: 'Target block not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Perform text replacement
      const updatedContent = targetBlock.content.replace(originalText, suggestedReplacement);

      // Verify the replacement was successful
      if (updatedContent === targetBlock.content) {
        console.warn(`Text replacement failed: "${originalText}" not found in block content`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Text "${originalText}" not found in document. The text may have been modified.` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update the document blocks
      const updatedBlocks = document.blocks.map((block: any) => 
        block.id === targetBlock.id 
          ? { ...block, content: updatedContent }
          : block
      );

      // Save updated document
      const { error: updateError } = await supabaseClient
        .from('semantic_documents')
        .update({
          blocks: updatedBlocks,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (updateError) {
        console.error('Error updating document:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update document' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark annotation as accepted
      const { error: annotationUpdateError } = await supabaseClient
        .from('semantic_annotations')
        .update({
          resolved: true,
          action_type: 'accepted',
          replacement_applied_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', annotationId);

      if (annotationUpdateError) {
        console.error('Error updating annotation:', annotationUpdateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update annotation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response: ApplyEditResponse = {
        success: true,
        updatedContent,
        message: `Successfully replaced "${originalText}" with "${suggestedReplacement}"`
      };

      console.log(`Edit accepted: "${originalText}" → "${suggestedReplacement}"`);
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'reject') {
      // Mark annotation as rejected
      const { error: annotationUpdateError } = await supabaseClient
        .from('semantic_annotations')
        .update({
          action_type: 'rejected',
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', annotationId);

      if (annotationUpdateError) {
        console.error('Error updating annotation:', annotationUpdateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update annotation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response: ApplyEditResponse = {
        success: true,
        message: 'Comment rejected'
      };

      console.log(`Edit rejected for annotation ${annotationId}`);
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in apply-comment-edit:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
