import { supabase } from '@/integrations/supabase/client';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Create a new semantic document for this version (without comments)
    const newSemanticDocument: SemanticDocument = {
      id: crypto.randomUUID(),
      title: currentDocument.title,
      blocks: currentDocument.blocks, // Copy current content
      metadata: {
        ...currentDocument.metadata,
        essayId,
        isReadOnly: false // This version is editable
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save the new semantic document first
    await semanticDocumentService.saveDocument(newSemanticDocument);

    // Prepare version content
    const versionContent = {
      blocks: currentDocument.blocks,
      metadata: newSemanticDocument.metadata
    };

    // Use atomic database function to create version
    const { data: versionId, error } = await supabase.rpc('create_fresh_draft_essay_version', {
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
    const { data: { user } } = await supabase.auth.getUser();
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
          metadata: {
            wordCount: essayContent.split(' ').filter(w => w.length > 0).length,
            lastModified: new Date().toISOString()
          }
        }
      ],
      metadata: {
        totalWordCount: essayContent.split(' ').filter(w => w.length > 0).length,
        totalCharacterCount: essayContent.length,
        lastSaved: new Date().toISOString(),
        essayId,
        isReadOnly: true // AI feedback versions are read-only
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
    const { data: versionId, error } = await supabase.rpc('create_ai_feedback_essay_version', {
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

    return versionId;
  }

  /**
   * Get all versions for an essay
   * Uses database function for consistent ordering
   */
  static async getEssayVersions(essayId: string): Promise<EssayVersion[]> {
    const { data: versions, error } = await supabase.rpc('get_essay_versions', {
      essay_uuid: essayId
    });

    if (error) {
      console.error('Error fetching essay versions:', error);
      throw error;
    }

    return versions || [];
  }

  /**
   * Get the active version for an essay
   * Uses database function for reliable active version retrieval
   */
  static async getActiveVersion(essayId: string): Promise<EssayVersion | null> {
    const { data: versions, error } = await supabase.rpc('get_active_essay_version', {
      essay_uuid: essayId
    });

    if (error) {
      console.error('Error fetching active version:', error);
      throw error;
    }

    // Return the first (and only) active version, or null if none exists
    return versions && versions.length > 0 ? versions[0] : null;
  }

  /**
   * Switch to a specific version (make it active)
   * Uses atomic database function to prevent race conditions
   */
  static async switchToVersion(essayId: string, versionId: string): Promise<boolean> {
    const { data: success, error } = await supabase.rpc('switch_to_essay_version', {
      essay_uuid: essayId,
      version_uuid: versionId
    });

    if (error) {
      console.error('Error switching to version:', error);
      throw error;
    }

    return success;
  }

  /**
   * Get a specific version by ID
   */
  static async getVersion(versionId: string): Promise<EssayVersion | null> {
    const { data: version, error } = await supabase
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
    const { error } = await supabase
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
    const { error } = await supabase
      .from('essay_versions')
      .delete()
      .eq('id', versionId);

    if (error) {
      console.error('Error deleting version:', error);
      throw error;
    }
  }
}
