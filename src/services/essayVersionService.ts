import { supabase } from '@/integrations/supabase/client';
import { getAuthenticatedUser } from '@/utils/authHelper';
import { semanticDocumentService } from './semanticDocumentService';
import { SemanticDocument } from '@/types/semanticDocument';

export interface EssayVersion {
  id: string;
  essay_id: string;
  user_id: string;
  version_number: number;
  content: any; // JSONB content
  version_name?: string;
  version_description?: string;
  is_active: boolean;
  semantic_document_id: string; // Links to semantic document
  is_fresh_draft: boolean;
  has_ai_feedback: boolean;
  grammar_check_completed: boolean; // Tracks if grammar check has been completed for this version
  created_at: string;
  updated_at: string;
}

export class EssayVersionService {
  /**
   * Create a new fresh draft version (new version without comments)
   * Uses atomic database function to prevent race conditions
   */
  static async createFreshDraftVersion(
    essayId: string,
    currentDocument: SemanticDocument,
    versionName?: string,
    versionDescription?: string
  ): Promise<string> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Create a new semantic document for this version (without unresolved comments)
    const newSemanticDocument: SemanticDocument = {
      id: crypto.randomUUID(),
      title: currentDocument.title,
      blocks: currentDocument.blocks.map(block => ({
        ...block,
        annotations: (block.annotations || []).filter(a => a.resolved === true)
      })),
      metadata: {
        ...currentDocument.metadata,
        essayId
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save the new semantic document first
    await semanticDocumentService.saveDocument(newSemanticDocument);

    // Prepare version content
    const versionContent = {
      blocks: newSemanticDocument.blocks,
      metadata: newSemanticDocument.metadata
    };

    // Use atomic database function to create version
    const { data: versionIdRaw, error } = await supabase.rpc('create_fresh_draft_essay_version', {
      essay_uuid: essayId,
      user_uuid: user.id,
      semantic_document_uuid: newSemanticDocument.id,
      version_content: versionContent,
      version_name_param: versionName,
      version_description_param: versionDescription
    });

    if (error) {
      console.error('Error creating fresh draft version:', error);
      throw error;
    }

    // Read-only status no longer enforced for versions

    const versionId = versionIdRaw as unknown as string;
    return versionId;
  }

  /**
   * Create a new version that CLONES text and ALL comments (annotations)
   * New version remains editable and has_ai_feedback is FALSE.
   */
  static async createClonedVersionWithComments(
    essayId: string,
    currentDocument: SemanticDocument,
    versionName?: string,
    versionDescription?: string
  ): Promise<string> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Create a new semantic document for this version (preserve annotations)
    const newSemanticDocument: SemanticDocument = {
      id: crypto.randomUUID(),
      title: currentDocument.title,
      blocks: currentDocument.blocks.map(block => ({
        ...block,
        // Keep annotations exactly as-is to preserve inline highlights
        annotations: [...(block.annotations || [])]
      })),
      metadata: {
        ...currentDocument.metadata,
        essayId
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save the new semantic document first
    await semanticDocumentService.saveDocument(newSemanticDocument);

    // Also duplicate semantic_annotations from the current document to the new one
    // This ensures comments persist after refresh (loader pulls from semantic_annotations)
    try {
      const { data: existingAnnotations, error: loadAnnoError } = await (supabase as any)
        .from('semantic_annotations')
        .select('*')
        .eq('document_id', currentDocument.id);

      if (!loadAnnoError && Array.isArray(existingAnnotations) && existingAnnotations.length > 0) {
        // Prepare cloned annotations: new id, new document_id, keep block_id (block IDs are preserved)
        const cloned = existingAnnotations.map((a: any) => ({
          id: crypto.randomUUID(),
          document_id: newSemanticDocument.id,
          block_id: a.block_id,
          type: a.type,
          author: a.author,
          content: a.content,
          target_text: a.target_text,
          resolved: a.resolved ?? false,
          resolved_at: a.resolved_at ?? null,
          resolved_by: a.resolved_by ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Optional edit-action fields if present in schema
          action_type: a.action_type ?? 'none',
          suggested_replacement: a.suggested_replacement ?? null,
          original_text: a.original_text ?? null,
          metadata: a.metadata ?? null
        }));

        if (cloned.length > 0) {
          const { error: insertAnnoError } = await (supabase as any)
            .from('semantic_annotations')
            .insert(cloned);

          if (insertAnnoError) {
            console.warn('Warning: Failed to clone semantic annotations for new version:', insertAnnoError.message);
          }
        }
      } else if (loadAnnoError) {
        console.warn('Warning: Could not load existing annotations for cloning:', loadAnnoError.message);
      }
    } catch (e: any) {
      console.warn('Warning: Error cloning semantic annotations for new version:', e?.message || String(e));
    }

    // Prepare version content
    const versionContent = {
      blocks: newSemanticDocument.blocks,
      metadata: newSemanticDocument.metadata
    };

    // Use the fresh draft function so has_ai_feedback is false and new version becomes active
    const { data: versionIdRaw, error } = await supabase.rpc('create_fresh_draft_essay_version', {
      essay_uuid: essayId,
      user_uuid: user.id,
      semantic_document_uuid: newSemanticDocument.id,
      version_content: versionContent,
      version_name_param: versionName,
      version_description_param: versionDescription
    });

    if (error) {
      console.error('Error creating cloned version with comments:', error);
      throw error;
    }

    const versionId = versionIdRaw as unknown as string;
    return versionId;
  }

  /**
   * Create a new version with ONLY text content (no annotations, comments, or highlighting)
   * New version remains editable and has_ai_feedback is FALSE.
   */
  static async createCleanVersion(
    essayId: string,
    currentDocument: SemanticDocument,
    versionName?: string,
    versionDescription?: string
  ): Promise<string> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Create a new semantic document for this version (remove all annotations)
    const newSemanticDocument: SemanticDocument = {
      id: crypto.randomUUID(),
      title: currentDocument.title,
      blocks: currentDocument.blocks.map(block => ({
        ...block,
        // Remove all annotations to create a clean version
        annotations: []
      })),
      metadata: {
        ...currentDocument.metadata,
        essayId
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save the new semantic document first
    await semanticDocumentService.saveDocument(newSemanticDocument);

    // Do NOT duplicate semantic_annotations - this creates a clean version without comments
    // The document will have no annotations stored in the database

    // Prepare version content
    const versionContent = {
      blocks: newSemanticDocument.blocks,
      metadata: newSemanticDocument.metadata
    };

    // Use the fresh draft function so has_ai_feedback is false and new version becomes active
    const { data: versionIdRaw, error } = await supabase.rpc('create_fresh_draft_essay_version', {
      essay_uuid: essayId,
      user_uuid: user.id,
      semantic_document_uuid: newSemanticDocument.id,
      version_content: versionContent,
      version_name_param: versionName,
      version_description_param: versionDescription
    });

    if (error) {
      console.error('Error creating clean version:', error);
      throw error;
    }

    const versionId = versionIdRaw as unknown as string;
    return versionId;
  }

  /**
   * Create a version with AI feedback
   * Uses atomic database function to prevent race conditions
   */
  static async createAIFeedbackVersion(
    essayId: string,
    essayContent: string,
    essayTitle?: string,
    essayPrompt?: string,
    aiModel: string = 'gemini-2.5-flash-lite',
    totalComments: number = 0,
    overallComments: number = 0,
    inlineComments: number = 0,
    openingSentenceComments: number = 0,
    transitionComments: number = 0,
    paragraphSpecificComments: number = 0,
    averageConfidenceScore?: number,
    averageQualityScore?: number
  ): Promise<string> {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error('User not authenticated');

    // Create a semantic document for this version
    const semanticDocument: SemanticDocument = {
      id: crypto.randomUUID(),
      title: essayTitle || 'Essay with AI Feedback',
      blocks: [
        {
          id: `block_${Date.now()}`,
          type: 'paragraph',
          content: essayContent,
          position: 0,
          annotations: [],
          metadata: {
            wordCount: essayContent.split(' ').filter(w => w.length > 0).length
          }
        }
      ],
      metadata: {
        essayId
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save the semantic document
    await semanticDocumentService.saveDocument(semanticDocument);

    // Prepare version content
    const versionContent = {
      blocks: semanticDocument.blocks,
      metadata: semanticDocument.metadata
    };

    // Use atomic database function to create version with AI feedback
    const { data: versionIdRaw, error } = await supabase.rpc('create_ai_feedback_essay_version', {
      essay_uuid: essayId,
      user_uuid: user.id,
      semantic_document_uuid: semanticDocument.id,
      version_content: versionContent,
      essay_content_param: essayContent,
      essay_title_param: essayTitle,
      essay_prompt_param: essayPrompt,
      ai_model_param: aiModel,
      total_comments_param: totalComments,
      overall_comments_param: overallComments,
      inline_comments_param: inlineComments,
      opening_sentence_comments_param: openingSentenceComments,
      transition_comments_param: transitionComments,
      paragraph_specific_comments_param: paragraphSpecificComments,
      average_confidence_score_param: averageConfidenceScore,
      average_quality_score_param: averageQualityScore
    });

    if (error) {
      console.error('Error creating AI feedback version:', error);
      throw error;
    }

    const versionId = versionIdRaw as unknown as string;
    return versionId;
  }

  /**
   * Get all versions for an essay
   * Uses database function for consistent ordering
   */
  static async getEssayVersions(essayId: string): Promise<EssayVersion[]> {
    const { data: versionsRaw, error } = await supabase.rpc('get_essay_versions', {
      essay_uuid: essayId
    });

    if (error) {
      console.error('Error fetching essay versions:', error);
      throw error;
    }

    const versions = versionsRaw as unknown as EssayVersion[];
    return versions || [];
  }

  /**
   * Get the active version for an essay
   * Uses database function for reliable active version retrieval
   */
  static async getActiveVersion(essayId: string): Promise<EssayVersion | null> {
    const { data: versionsRaw, error } = await supabase.rpc('get_active_essay_version', {
      essay_uuid: essayId
    });

    if (error) {
      console.error('Error fetching active version:', error);
      throw error;
    }

    // Return the first (and only) active version, or null if none exists
    const versions = versionsRaw as unknown as EssayVersion[];
    return versions && versions.length > 0 ? versions[0] : null;
  }

  /**
   * Switch to a specific version (make it active)
   * Uses atomic database function to prevent race conditions
   * Also updates semantic documents to mark non-active versions as read-only
   */
  static async switchToVersion(essayId: string, versionId: string): Promise<boolean> {
    const { data: successRaw, error } = await supabase.rpc('switch_to_essay_version', {
      essay_uuid: essayId,
      version_uuid: versionId
    });

    if (error) {
      console.error('Error switching to version:', error);
      throw error;
    }

    // No read-only toggling across versions; older versions remain editable

    const success = Boolean(successRaw as unknown as boolean);
    return success;
  }

  // Read-only enforcement removed: keeping method stub as no-op for backward compatibility
  private static async updateVersionReadOnlyStatus(_essayId: string): Promise<void> {
    return;
  }

  /**
   * Mark a version as having AI feedback (controls read-only behavior in UI)
   */
  static async setHasAIFeedback(versionId: string, hasAI: boolean): Promise<void> {
    const { error } = await (supabase as any)
      .from('essay_versions')
      .update({ has_ai_feedback: hasAI, updated_at: new Date().toISOString() })
      .eq('id', versionId);

    if (error) {
      console.error('Error updating has_ai_feedback on version:', error);
      throw error;
    }
  }

  /**
   * Get a specific version by ID
   */
  static async getVersion(versionId: string): Promise<EssayVersion | null> {
    const { data: version, error } = await (supabase as any)
      .from('essay_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching version:', error);
      throw error;
    }

    return version;
  }

  /**
   * Load a specific version's semantic document (for viewing)
   */
  static async loadVersionDocument(versionId: string): Promise<SemanticDocument | null> {
    try {
      const version = await this.getVersion(versionId);
      if (!version) return null;

      const document = await semanticDocumentService.loadDocument(version.semantic_document_id);
      return document;
    } catch (error) {
      console.error('Error loading version document:', error);
      throw error;
    }
  }

  /**
   * Update version content
   */
  static async updateVersionContent(
    versionId: string,
    essayContent: string,
    essayTitle?: string
  ): Promise<void> {
    const { error } = await (supabase as any)
      .from('essay_versions')
      .update({
        essay_content: essayContent,
        essay_title: essayTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', versionId);

    if (error) {
      console.error('Error updating version content:', error);
      throw error;
    }
  }

  /**
   * Delete a version
   */
  static async deleteVersion(versionId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('essay_versions')
      .delete()
      .eq('id', versionId);

    if (error) {
      console.error('Error deleting version:', error);
      throw error;
    }
  }

  /**
   * Mark grammar check as completed for a version
   */
  static async markGrammarCheckCompleted(versionId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('essay_versions')
      .update({ 
        grammar_check_completed: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', versionId);

    if (error) {
      console.error('Error marking grammar check as completed:', error);
      throw error;
    }
  }

  /**
   * Check if grammar check has been completed for a version
   */
  static async hasGrammarCheckCompleted(versionId: string): Promise<boolean> {
    const { data, error } = await (supabase as any)
      .from('essay_versions')
      .select('grammar_check_completed')
      .eq('id', versionId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking grammar check completion:', error);
      throw error;
    }

    return data?.grammar_check_completed || false;
  }

  /**
   * Reset grammar check completion flag for a version (useful for testing or manual reset)
   */
  static async resetGrammarCheckCompletion(versionId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('essay_versions')
      .update({ 
        grammar_check_completed: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', versionId);

    if (error) {
      console.error('Error resetting grammar check completion:', error);
      throw error;
    }
  }
}
