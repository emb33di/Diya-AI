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
   */
  static async createFreshDraftVersion(
    essayId: string,
    currentDocument: SemanticDocument,
    versionName?: string,
    versionDescription?: string
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the next version number
    const { data: maxVersion } = await supabase
      .from('essay_versions')
      .select('version_number')
      .eq('essay_id', essayId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (maxVersion?.version_number || 0) + 1;

    // Deactivate all existing active versions for this essay
    await supabase
      .from('essay_versions')
      .update({ is_active: false })
      .eq('essay_id', essayId)
      .eq('is_active', true);

    // Create a new semantic document for this version (without comments)
    const newSemanticDocument: SemanticDocument = {
      id: crypto.randomUUID(),
      title: currentDocument.title,
      blocks: currentDocument.blocks, // Copy current content
      metadata: {
        ...currentDocument.metadata,
        version: nextVersion,
        essayId,
        isReadOnly: false // This version is editable
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save the new semantic document
    await semanticDocumentService.saveDocument(newSemanticDocument);

    // Create the new version entry
    const { data: version, error } = await supabase
      .from('essay_versions')
      .insert({
        essay_id: essayId,
        user_id: user.id,
        version_number: nextVersion,
        content: {
          blocks: currentDocument.blocks,
          metadata: newSemanticDocument.metadata
        },
        version_name: versionName || `Version ${nextVersion}`,
        version_description: versionDescription || 'Fresh draft without previous comments',
        is_active: true,
        semantic_document_id: newSemanticDocument.id
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating fresh draft version:', error);
      throw error;
    }

    return version.id;
  }

  /**
   * Create a version with AI feedback
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

    // Get the next version number
    const { data: maxVersion } = await supabase
      .from('essay_versions')
      .select('version_number')
      .eq('essay_id', essayId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (maxVersion?.version_number || 0) + 1;

    // Deactivate all existing active versions for this essay
    await supabase
      .from('essay_versions')
      .update({ is_active: false })
      .eq('essay_id', essayId)
      .eq('is_active', true);

    // Create the new version
    const { data: version, error } = await supabase
      .from('essay_versions')
      .insert({
        essay_id: essayId,
        user_id: user.id,
        version_number: nextVersion,
        essay_content: essayContent,
        essay_title: essayTitle || null,
        essay_prompt: essayPrompt || null,
        version_name: `Version ${nextVersion} (with AI Feedback)`,
        is_fresh_draft: false,
        has_ai_feedback: true,
        is_active: true,
        ai_model: aiModel,
        total_comments: totalComments,
        overall_comments: overallComments,
        inline_comments: inlineComments,
        opening_sentence_comments: openingSentenceComments,
        transition_comments: transitionComments,
        paragraph_specific_comments: paragraphSpecificComments,
        average_confidence_score: averageConfidenceScore || null,
        average_quality_score: averageQualityScore || null
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating AI feedback version:', error);
      throw error;
    }

    return version.id;
  }

  /**
   * Get all versions for an essay
   */
  static async getEssayVersions(essayId: string): Promise<EssayVersion[]> {
    const { data: versions, error } = await supabase
      .from('essay_versions')
      .select('*')
      .eq('essay_id', essayId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching essay versions:', error);
      throw error;
    }

    return versions || [];
  }

  /**
   * Get the active version for an essay
   */
  static async getActiveVersion(essayId: string): Promise<EssayVersion | null> {
    const { data: version, error } = await supabase
      .from('essay_versions')
      .select('*')
      .eq('essay_id', essayId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching active version:', error);
      throw error;
    }

    return version;
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
