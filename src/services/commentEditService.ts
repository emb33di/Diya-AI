/**
 * Comment Edit Service
 * 
 * Service layer for applying comment edits (accept/reject) through the edge function.
 * Provides a clean interface for the frontend to interact with the apply-comment-edit function.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ApplyEditRequest {
  documentId: string;
  annotationId: string;
  action: 'accept' | 'reject';
}

export interface ApplyEditResponse {
  success: boolean;
  updatedContent?: string;
  message?: string;
  error?: string;
}

export class CommentEditService {
  /**
   * Apply a comment edit (accept or reject)
   */
  static async applyEdit(request: ApplyEditRequest): Promise<ApplyEditResponse> {
    try {
      console.log('CommentEditService: Applying edit', request);

      const { data, error } = await supabase.functions.invoke('apply-comment-edit', {
        body: request
      });

      if (error) {
        console.error('Error calling apply-comment-edit:', error);
        return {
          success: false,
          error: 'Action failed.'
        };
      }

      console.log('CommentEditService: Edit applied successfully', data);
      return data as ApplyEditResponse;
    } catch (error) {
      console.error('Error in CommentEditService.applyEdit:', error);
      return {
        success: false,
        error: 'Action failed.'
      };
    }
  }

  /**
   * Check if a comment can be edited (has suggested replacement)
   * Enhanced validation to ensure edit fields are valid
   */
  static canEditComment(annotation: any): boolean {
    const isGrammarComment = annotation.metadata?.agentType === 'grammar';
    const hasOriginalText = annotation.original_text || annotation.metadata?.originalText;
    const suggestedReplacement = annotation.suggested_replacement || annotation.metadata?.suggestedReplacement;
    const hasSuggestedReplacement = suggestedReplacement !== undefined; // Allow empty string for word removals
    const isNotResolved = !annotation.resolved;
    const hasValidEditFields = annotation.metadata?.hasValidEditFields !== false; // Default to true if not specified
    
    const canEdit = isGrammarComment && 
                   hasOriginalText && 
                   hasSuggestedReplacement && 
                   isNotResolved &&
                   hasValidEditFields;
    
    // Log validation details for debugging
    if (isGrammarComment && !canEdit) {
      console.debug('CommentEditService: Grammar comment cannot be edited:', {
        hasOriginalText: !!hasOriginalText,
        hasSuggestedReplacement: !!hasSuggestedReplacement,
        isNotResolved,
        hasValidEditFields,
        originalText: hasOriginalText,
        suggestedReplacement: suggestedReplacement
      });
    }
    
    return canEdit;
  }

  /**
   * Accept a grammar comment edit
   */
  static async acceptEdit(documentId: string, annotationId: string): Promise<ApplyEditResponse> {
    return this.applyEdit({
      documentId,
      annotationId,
      action: 'accept'
    });
  }

  /**
   * Reject a grammar comment edit
   */
  static async rejectEdit(documentId: string, annotationId: string): Promise<ApplyEditResponse> {
    return this.applyEdit({
      documentId,
      annotationId,
      action: 'reject'
    });
  }
}
