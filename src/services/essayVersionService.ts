import { supabase } from '@/integrations/supabase/client';

export interface EssayCheckpoint {
  id: string;
  essay_id: string;
  user_id: string;
  checkpoint_number: number;
  version_number: number;
  essay_content: string;
  essay_title?: string;
  essay_prompt?: string;
  version_name?: string;
  version_description?: string;
  is_fresh_draft: boolean;
  parent_checkpoint_id?: string;
  has_ai_feedback: boolean;
  is_active: boolean;
  
  // AI feedback metadata
  ai_feedback_generated_at?: string;
  ai_model?: string;
  total_comments: number;
  overall_comments: number;
  inline_comments: number;
  opening_sentence_comments: number;
  transition_comments: number;
  paragraph_specific_comments: number;
  
  // Quality metrics
  average_confidence_score?: number;
  average_quality_score?: number;
  
  created_at: string;
  updated_at: string;
}

export interface CreateFreshDraftData {
  essayId: string;
  essayContent: string;
  essayTitle?: string;
  essayPrompt?: string;
  versionName?: string;
}

export interface CreateAIFeedbackData {
  essayId: string;
  essayContent: string;
  essayTitle?: string;
  essayPrompt?: string;
  aiModel?: string;
  totalComments: number;
  overallComments: number;
  inlineComments: number;
  openingSentenceComments: number;
  transitionComments: number;
  paragraphSpecificComments: number;
  averageConfidenceScore?: number;
  averageQualityScore?: number;
}

export class EssayVersionService {
  // Get all versions for an essay
  static async getEssayVersions(essayId: string): Promise<EssayCheckpoint[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: versions, error } = await supabase
      .from('essay_checkpoints')
      .select('*')
      .eq('essay_id', essayId)
      .eq('user_id', user.id)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return versions || [];
  }

  // Get the active version for an essay
  static async getActiveVersion(essayId: string): Promise<EssayCheckpoint | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: version, error } = await supabase
      .from('essay_checkpoints')
      .select('*')
      .eq('essay_id', essayId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return version;
  }

  // Get a specific version by ID
  static async getVersionById(versionId: string): Promise<EssayCheckpoint> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: version, error } = await supabase
      .from('essay_checkpoints')
      .select('*')
      .eq('id', versionId)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return version;
  }

  // Create a new version (version without AI feedback)
  static async createFreshDraft(data: CreateFreshDraftData): Promise<EssayCheckpoint> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: checkpointId, error } = await supabase.rpc('create_fresh_draft_checkpoint', {
      essay_uuid: data.essayId,
      user_uuid: user.id,
      essay_content: data.essayContent,
      essay_title: data.essayTitle || null,
      essay_prompt: data.essayPrompt || null,
      version_name_param: data.versionName || null
    });

    if (error) {
      console.error('RPC Error creating new version:', error);
      throw new Error(`Failed to create new version: ${error.message}`);
    }

    if (!checkpointId) {
      throw new Error('No checkpoint ID returned from database');
    }

    // Update paragraph tracking for the new checkpoint
    try {
      await supabase.rpc('update_checkpoint_paragraph_tracking', {
        checkpoint_uuid: checkpointId
      });
    } catch (trackingError) {
      console.warn('Failed to update paragraph tracking:', trackingError);
      // Don't fail the entire operation if paragraph tracking fails
    }

    // Return the created checkpoint
    return this.getVersionById(checkpointId);
  }

  // Create a version with AI feedback
  static async createAIFeedbackVersion(data: CreateAIFeedbackData): Promise<EssayCheckpoint> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: checkpointId, error } = await supabase.rpc('create_ai_feedback_checkpoint', {
      essay_uuid: data.essayId,
      user_uuid: user.id,
      essay_content: data.essayContent,
      essay_title: data.essayTitle || null,
      essay_prompt: data.essayPrompt || null,
      ai_model_param: data.aiModel || 'gemini-2.5-flash-lite',
      total_comments_param: data.totalComments,
      overall_comments_param: data.overallComments,
      inline_comments_param: data.inlineComments,
      opening_sentence_comments_param: data.openingSentenceComments,
      transition_comments_param: data.transitionComments,
      paragraph_specific_comments_param: data.paragraphSpecificComments,
      average_confidence_score_param: data.averageConfidenceScore || null,
      average_quality_score_param: data.averageQualityScore || null
    });

    if (error) throw error;

    // Update paragraph tracking for the new checkpoint
    try {
      await supabase.rpc('update_checkpoint_paragraph_tracking', {
        checkpoint_uuid: checkpointId
      });
    } catch (trackingError) {
      console.warn('Failed to update paragraph tracking:', trackingError);
      // Don't fail the entire operation if paragraph tracking fails
    }

    // Return the created checkpoint
    return this.getVersionById(checkpointId);
  }

  // Switch to a specific version (make it active)
  static async switchToVersion(versionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, get the version to find the essay_id
    const version = await this.getVersionById(versionId);
    
    // Deactivate all versions for this essay
    const { error: deactivateError } = await supabase
      .from('essay_checkpoints')
      .update({ is_active: false })
      .eq('essay_id', version.essay_id)
      .eq('user_id', user.id);

    if (deactivateError) throw deactivateError;

    // Activate the selected version
    const { error: activateError } = await supabase
      .from('essay_checkpoints')
      .update({ is_active: true })
      .eq('id', versionId)
      .eq('user_id', user.id);

    if (activateError) throw activateError;
  }

  // Update version metadata
  static async updateVersionMetadata(
    versionId: string, 
    updates: {
      versionName?: string;
      versionDescription?: string;
    }
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('essay_checkpoints')
      .update(updates)
      .eq('id', versionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  // Delete a version (only if it's not the only version)
  static async deleteVersion(versionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the version to find the essay_id
    const version = await this.getVersionById(versionId);
    
    // Check if this is the only version
    const { data: versions, error: countError } = await supabase
      .from('essay_checkpoints')
      .select('id')
      .eq('essay_id', version.essay_id)
      .eq('user_id', user.id);

    if (countError) throw countError;

    if (versions && versions.length <= 1) {
      throw new Error('Cannot delete the only version of an essay');
    }

    // If this was the active version, activate the most recent remaining version
    if (version.is_active) {
      const { data: remainingVersions, error: remainingError } = await supabase
        .from('essay_checkpoints')
        .select('id')
        .eq('essay_id', version.essay_id)
        .eq('user_id', user.id)
        .neq('id', versionId)
        .order('version_number', { ascending: false })
        .limit(1);

      if (remainingError) throw remainingError;

      if (remainingVersions && remainingVersions.length > 0) {
        await this.switchToVersion(remainingVersions[0].id);
      }
    }

    // Delete the version
    const { error } = await supabase
      .from('essay_checkpoints')
      .delete()
      .eq('id', versionId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  // Get version history with comments count
  static async getVersionHistory(essayId: string): Promise<Array<EssayCheckpoint & { commentsCount: number }>> {
    const versions = await this.getEssayVersions(essayId);
    
    // Get comments count for each version
    const versionsWithComments = await Promise.all(
      versions.map(async (version) => {
        const { data: comments, error } = await supabase
          .from('essay_comments')
          .select('id')
          .eq('essay_id', essayId)
          .eq('ai_generated', true)
          .gte('created_at', version.created_at);

        if (error) {
          console.error('Error fetching comments for version:', error);
          return { ...version, commentsCount: 0 };
        }

        return {
          ...version,
          commentsCount: comments?.length || 0
        };
      })
    );

    return versionsWithComments;
  }

  // Check if an essay has any versions
  static async hasVersions(essayId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: versions, error } = await supabase
      .from('essay_checkpoints')
      .select('id')
      .eq('essay_id', essayId)
      .eq('user_id', user.id)
      .limit(1);

    if (error) throw error;
    return versions && versions.length > 0;
  }

  // Get the latest version that has AI feedback
  static async getLatestAIFeedbackVersion(essayId: string): Promise<EssayCheckpoint | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: version, error } = await supabase
      .from('essay_checkpoints')
      .select('*')
      .eq('essay_id', essayId)
      .eq('user_id', user.id)
      .eq('has_ai_feedback', true)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return version;
  }
}
