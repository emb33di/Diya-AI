/**
 * Escalated Essays Service
 * 
 * Service layer for managing escalated essays in the founder portal.
 * Handles fetching escalated essays with student info and updating founder feedback.
 */

import { supabase } from '@/integrations/supabase/client';
import { SemanticDocument } from '@/types/semanticDocument';

export type EscalatedEssayStatus = 'pending' | 'in_review' | 'reviewed' | 'sent_back';

export interface EscalatedEssayComment {
  id: string;
  blockId: string;
  type: string;
  content: string;
  targetText?: string; // The selected text that the comment targets
  position?: {
    start: number;
    end: number;
  };
  created_at?: string;
}

export interface EscalatedEssay {
  id: string;
  essay_id: string;
  user_id: string;
  
  // Student info (from user_profiles join)
  student_name: string | null;
  student_email: string | null;
  
  // Essay snapshot data
  essay_title: string;
  essay_content: SemanticDocument; // JSONB - full semantic document
  essay_prompt: string | null;
  word_limit: string | null;
  word_count: number;
  character_count: number;
  
  // AI comments snapshot
  ai_comments_snapshot: EscalatedEssayComment[];
  
  // Reference
  semantic_document_id: string | null;
  
  // Status
  status: EscalatedEssayStatus;
  
  // Founder feedback
  founder_feedback: string | null;
  founder_edited_content: SemanticDocument | null;
  founder_comments: EscalatedEssayComment[]; // Deprecated: Use founder_comments table instead
  
  // Timestamps
  escalated_at: string;
  reviewed_at: string | null;
  sent_back_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EscalatedEssayListItem {
  id: string;
  essay_id: string;
  user_id: string;
  student_name: string | null;
  student_email: string | null;
  essay_title: string;
  status: EscalatedEssayStatus;
  escalated_at: string;
  word_count: number;
}

export interface UpdateEscalatedEssayData {
  status?: EscalatedEssayStatus;
  founder_feedback?: string | null;
  founder_edited_content?: SemanticDocument | null;
  founder_comments?: EscalatedEssayComment[]; // Deprecated: Use founder_comments table instead
}

export interface FounderComment {
  id: string;
  essay_id: string;
  escalation_id: string | null;
  block_id: string;
  type: string;
  content: string;
  target_text: string | null;
  position_start: number | null;
  position_end: number | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export class EscalatedEssaysService {
  /**
   * Fetch all escalated essays with student info for the founder dashboard
   * Includes join with user_profiles to get student name and email
   */
  static async fetchEscalatedEssays(
    filters?: {
      status?: EscalatedEssayStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<EscalatedEssayListItem[]> {
    try {
      // Verify user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Verify user is a founder (check profile)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_founder')
        .eq('user_id' as any, user.id)
        .maybeSingle();

      const profileData = profile as any;
      if (!profileData?.is_founder) {
        throw new Error('Access denied: Founder access required');
      }

      // Fetch escalated essays first
      let query = supabase
        .from('escalated_essays' as any)
        .select(`
          id,
          essay_id,
          user_id,
          essay_title,
          status,
          escalated_at,
          word_count
        `)
        .order('escalated_at' as any, { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status' as any, filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data: essaysData, error } = await query;

      if (error) {
        console.error('Error fetching escalated essays:', error);
        throw error;
      }

      if (!essaysData || essaysData.length === 0) {
        return [];
      }

      // Get unique user IDs
      const userIds = [...new Set(essaysData.map((item: any) => item.user_id))];

      // Fetch user profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email_address')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        // Continue without profile data rather than failing completely
      }

      // Create a map of user_id to profile data
      const profilesMap = new Map();
      (profilesData || []).forEach((profile: any) => {
        profilesMap.set(profile.user_id, profile);
      });

      // Transform data to combine essays with profile data
      const essays: EscalatedEssayListItem[] = essaysData.map((item: any) => {
        const profile = profilesMap.get(item.user_id);
        return {
          id: item.id,
          essay_id: item.essay_id,
          user_id: item.user_id,
          student_name: profile?.full_name || null,
          student_email: profile?.email_address || null,
          essay_title: item.essay_title,
          status: item.status as EscalatedEssayStatus,
          escalated_at: item.escalated_at,
          word_count: item.word_count || 0,
        };
      });

      return essays;
    } catch (error) {
      console.error('EscalatedEssaysService: Error fetching escalated essays', error);
      throw error;
    }
  }

  /**
   * Fetch a single escalated essay by ID with full details
   * Used for the review page
   */
  static async getEscalatedEssayById(escalationId: string): Promise<EscalatedEssay> {
    try {
      // Verify user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Verify user is a founder
      const { data: founderProfile } = await supabase
        .from('user_profiles')
        .select('is_founder')
        .eq('user_id' as any, user.id)
        .maybeSingle();

      const founderProfileData = founderProfile as any;
      if (!founderProfileData?.is_founder) {
        throw new Error('Access denied: Founder access required');
      }

      // Fetch escalated essay
      const { data: essayData, error: essayError } = await supabase
        .from('escalated_essays' as any)
        .select('*')
        .eq('id' as any, escalationId)
        .single();

      if (essayError) {
        console.error('Error fetching escalated essay:', essayError);
        throw essayError;
      }

      if (!essayData) {
        throw new Error('Escalated essay not found');
      }

      // Fetch user profile separately
      const { data: userProfileData } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email_address')
        .eq('user_id', (essayData as any).user_id)
        .maybeSingle();

      // Parse JSONB fields and transform to EscalatedEssay type
      const essayItem = essayData as any;
      const studentProfile = userProfileData as any;
      const essay: EscalatedEssay = {
        id: essayItem.id,
        essay_id: essayItem.essay_id,
        user_id: essayItem.user_id,
        student_name: studentProfile?.full_name || null,
        student_email: studentProfile?.email_address || null,
        essay_title: essayItem.essay_title,
        essay_content: essayItem.essay_content as SemanticDocument,
        essay_prompt: essayItem.essay_prompt,
        word_limit: essayItem.word_limit,
        word_count: essayItem.word_count || 0,
        character_count: essayItem.character_count || 0,
        ai_comments_snapshot: (essayItem.ai_comments_snapshot || []) as EscalatedEssayComment[],
        semantic_document_id: essayItem.semantic_document_id,
        status: essayItem.status as EscalatedEssayStatus,
        founder_feedback: essayItem.founder_feedback,
        founder_edited_content: essayItem.founder_edited_content as SemanticDocument | null,
        founder_comments: (essayItem.founder_comments || []) as EscalatedEssayComment[],
        escalated_at: essayItem.escalated_at,
        reviewed_at: essayItem.reviewed_at,
        sent_back_at: essayItem.sent_back_at,
        created_at: essayItem.created_at,
        updated_at: essayItem.updated_at,
      };

      return essay;
    } catch (error) {
      console.error('EscalatedEssaysService: Error fetching escalated essay', error);
      throw error;
    }
  }

  /**
   * Update escalated essay status and/or founder feedback
   * Automatically sets reviewed_at or sent_back_at timestamps when status changes
   */
  static async updateEscalatedEssay(
    escalationId: string,
    updates: UpdateEscalatedEssayData
  ): Promise<EscalatedEssay> {
    try {
      // Verify user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Verify user is a founder
      const { data: founderProfile } = await supabase
        .from('user_profiles')
        .select('is_founder')
        .eq('user_id' as any, user.id)
        .maybeSingle();

      const founderProfileData = founderProfile as any;
      if (!founderProfileData?.is_founder) {
        throw new Error('Access denied: Founder access required');
      }

      // Build update object
      const updateData: any = {
        ...updates,
      };

      // Auto-set timestamps based on status change
      if (updates.status === 'in_review') {
        // Don't overwrite reviewed_at if already set
        // Only set it if moving to in_review for the first time
      } else if (updates.status === 'reviewed') {
        updateData.reviewed_at = new Date().toISOString();
      } else if (updates.status === 'sent_back') {
        updateData.sent_back_at = new Date().toISOString();
        // Also set reviewed_at if not already set
        if (!updateData.reviewed_at) {
          // Fetch current essay to check if reviewed_at exists
          const { data: current } = await supabase
            .from('escalated_essays' as any)
            .select('reviewed_at')
            .eq('id' as any, escalationId)
            .single();
          
          const currentData = current as any;
          if (!currentData?.reviewed_at) {
            updateData.reviewed_at = new Date().toISOString();
          }
        }
      }

      // Update the escalated essay
      const { data: updatedEssayData, error: updateError } = await supabase
        .from('escalated_essays' as any)
        .update(updateData)
        .eq('id' as any, escalationId)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating escalated essay:', updateError);
        throw updateError;
      }

      if (!updatedEssayData) {
        throw new Error('Escalated essay not found after update');
      }

      // Fetch user profile separately
      const { data: userProfileData } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email_address')
        .eq('user_id', (updatedEssayData as any).user_id)
        .maybeSingle();

      // Transform response to EscalatedEssay type
      const essayItem = updatedEssayData as any;
      const studentProfile = userProfileData as any;
      const essay: EscalatedEssay = {
        id: essayItem.id,
        essay_id: essayItem.essay_id,
        user_id: essayItem.user_id,
        student_name: studentProfile?.full_name || null,
        student_email: studentProfile?.email_address || null,
        essay_title: essayItem.essay_title,
        essay_content: essayItem.essay_content as SemanticDocument,
        essay_prompt: essayItem.essay_prompt,
        word_limit: essayItem.word_limit,
        word_count: essayItem.word_count || 0,
        character_count: essayItem.character_count || 0,
        ai_comments_snapshot: (essayItem.ai_comments_snapshot || []) as EscalatedEssayComment[],
        semantic_document_id: essayItem.semantic_document_id,
        status: essayItem.status as EscalatedEssayStatus,
        founder_feedback: essayItem.founder_feedback,
        founder_edited_content: essayItem.founder_edited_content as SemanticDocument | null,
        founder_comments: (essayItem.founder_comments || []) as EscalatedEssayComment[],
        escalated_at: essayItem.escalated_at,
        reviewed_at: essayItem.reviewed_at,
        sent_back_at: essayItem.sent_back_at,
        created_at: essayItem.created_at,
        updated_at: essayItem.updated_at,
      };

      return essay;
    } catch (error) {
      console.error('EscalatedEssaysService: Error updating escalated essay', error);
      throw error;
    }
  }

  /**
   * Save founder feedback (overall feedback text)
   */
  static async saveFounderFeedback(
    escalationId: string,
    feedback: string
  ): Promise<EscalatedEssay> {
    return this.updateEscalatedEssay(escalationId, {
      founder_feedback: feedback,
    });
  }

  /**
   * Mark essay as in review
   */
  static async markInReview(escalationId: string): Promise<EscalatedEssay> {
    return this.updateEscalatedEssay(escalationId, {
      status: 'in_review',
    });
  }

  /**
   * Mark essay as reviewed
   */
  static async markReviewed(escalationId: string): Promise<EscalatedEssay> {
    return this.updateEscalatedEssay(escalationId, {
      status: 'reviewed',
    });
  }

  /**
   * Send essay back to student (sets status to sent_back)
   */
  static async sendBackToStudent(
    escalationId: string,
    feedback: string,
    founderComments?: EscalatedEssayComment[],
    editedContent?: SemanticDocument
  ): Promise<EscalatedEssay> {
    return this.updateEscalatedEssay(escalationId, {
      status: 'sent_back',
      founder_feedback: feedback,
      founder_comments: founderComments,
      founder_edited_content: editedContent,
    });
  }

  /**
   * Get count of escalated essays by status
   */
  static async getEscalatedEssayCounts(): Promise<{
    pending: number;
    in_review: number;
    reviewed: number;
    sent_back: number;
    total: number;
  }> {
    try {
      // Verify user is authenticated and is founder
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_founder')
        .eq('user_id' as any, user.id)
        .maybeSingle();

      const profileData = profile as any;
      if (!profileData?.is_founder) {
        throw new Error('Access denied: Founder access required');
      }

      // Get counts for each status
      const [pendingResult, inReviewResult, reviewedResult, sentBackResult, totalResult] = await Promise.all([
        supabase.from('escalated_essays' as any).select('id', { count: 'exact', head: true }).eq('status' as any, 'pending'),
        supabase.from('escalated_essays' as any).select('id', { count: 'exact', head: true }).eq('status' as any, 'in_review'),
        supabase.from('escalated_essays' as any).select('id', { count: 'exact', head: true }).eq('status' as any, 'reviewed'),
        supabase.from('escalated_essays' as any).select('id', { count: 'exact', head: true }).eq('status' as any, 'sent_back'),
        supabase.from('escalated_essays' as any).select('id', { count: 'exact', head: true }),
      ]);

      return {
        pending: pendingResult.count || 0,
        in_review: inReviewResult.count || 0,
        reviewed: reviewedResult.count || 0,
        sent_back: sentBackResult.count || 0,
        total: totalResult.count || 0,
      };
    } catch (error) {
      console.error('EscalatedEssaysService: Error getting counts', error);
      throw error;
    }
  }

  /**
   * Get escalated essay by essay_id (user-facing)
   * Returns escalation data if essay was escalated and sent back
   */
  static async getEscalationByEssayId(essayId: string): Promise<EscalatedEssay | null> {
    try {
      // Verify user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Verify the essay belongs to the user
      const { data: essayData } = await supabase
        .from('essays' as any)
        .select('user_id')
        .eq('id' as any, essayId)
        .maybeSingle();

      if (!essayData || (essayData as any).user_id !== user.id) {
        throw new Error('Access denied: You can only view escalations for your own essays');
      }

      // Fetch escalation where status = 'sent_back' (most recent one)
      const { data: escalationData, error: escalationError } = await supabase
        .from('escalated_essays' as any)
        .select('*')
        .eq('essay_id' as any, essayId)
        .eq('status' as any, 'sent_back')
        .order('sent_back_at' as any, { ascending: false })
        .limit(1)
        .maybeSingle();

      if (escalationError) {
        console.error('Error fetching escalation:', escalationError);
        throw escalationError;
      }

      if (!escalationData) {
        return null; // No escalation found with sent_back status
      }

      // Transform escalation data to EscalatedEssay type
      const essayItem = escalationData as any;
      const essay: EscalatedEssay = {
        id: essayItem.id,
        essay_id: essayItem.essay_id,
        user_id: essayItem.user_id,
        student_name: null, // Not needed for user view
        student_email: null, // Not needed for user view
        essay_title: essayItem.essay_title,
        essay_content: essayItem.essay_content as SemanticDocument,
        essay_prompt: essayItem.essay_prompt,
        word_limit: essayItem.word_limit,
        word_count: essayItem.word_count || 0,
        character_count: essayItem.character_count || 0,
        ai_comments_snapshot: (essayItem.ai_comments_snapshot || []) as EscalatedEssayComment[],
        semantic_document_id: essayItem.semantic_document_id,
        status: essayItem.status as EscalatedEssayStatus,
        founder_feedback: essayItem.founder_feedback,
        founder_edited_content: essayItem.founder_edited_content as SemanticDocument | null,
        founder_comments: (essayItem.founder_comments || []) as EscalatedEssayComment[],
        escalated_at: essayItem.escalated_at,
        reviewed_at: essayItem.reviewed_at,
        sent_back_at: essayItem.sent_back_at,
        created_at: essayItem.created_at,
        updated_at: essayItem.updated_at,
      };

      return essay;
    } catch (error) {
      console.error('EscalatedEssaysService: Error fetching escalation by essay ID', error);
      throw error;
    }
  }

  /**
   * Fetch founder comments for a specific essay
   * Used by users to view founder feedback on their essays
   */
  static async getFounderCommentsByEssayId(essayId: string): Promise<FounderComment[]> {
    try {
      // Verify user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Verify the essay belongs to the user
      const { data: essayData } = await supabase
        .from('essays' as any)
        .select('user_id')
        .eq('id' as any, essayId)
        .maybeSingle();

      if (!essayData || (essayData as any).user_id !== user.id) {
        throw new Error('Access denied: You can only view comments for your own essays');
      }

      // Fetch founder comments for this essay
      const { data: comments, error } = await supabase
        .from('founder_comments' as any)
        .select('*')
        .eq('essay_id' as any, essayId)
        .order('created_at' as any, { ascending: true });

      if (error) {
        console.error('Error fetching founder comments:', error);
        throw error;
      }

      return (comments || []).map((comment: any) => ({
        id: comment.id,
        essay_id: comment.essay_id,
        escalation_id: comment.escalation_id,
        block_id: comment.block_id,
        type: comment.type,
        content: comment.content,
        target_text: comment.target_text,
        position_start: comment.position_start,
        position_end: comment.position_end,
        resolved: comment.resolved,
        resolved_at: comment.resolved_at,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        metadata: comment.metadata || {}
      }));
    } catch (error) {
      console.error('EscalatedEssaysService: Error fetching founder comments', error);
      throw error;
    }
  }

  /**
   * Save founder comments to the founder_comments table
   * Replaces the old JSONB approach with a proper relational structure
   */
  static async saveFounderComments(
    essayId: string,
    escalationId: string,
    comments: EscalatedEssayComment[]
  ): Promise<void> {
    try {
      // Verify user is authenticated and is founder
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: founderProfile } = await supabase
        .from('user_profiles')
        .select('is_founder')
        .eq('user_id' as any, user.id)
        .maybeSingle();

      const founderProfileData = founderProfile as any;
      if (!founderProfileData?.is_founder) {
        throw new Error('Access denied: Founder access required');
      }

      // Delete existing comments for this escalation (to replace them)
      await supabase
        .from('founder_comments' as any)
        .delete()
        .eq('escalation_id' as any, escalationId);

      // Insert new comments
      if (comments.length > 0) {
        const commentsToInsert = comments.map(comment => ({
          id: comment.id,
          essay_id: essayId,
          escalation_id: escalationId,
          block_id: comment.blockId,
          type: comment.type,
          content: comment.content,
          target_text: comment.targetText || null, // Save the selected text context
          position_start: comment.position?.start ?? null,
          position_end: comment.position?.end ?? null,
          resolved: false,
          metadata: {}
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('founder_comments' as any)
          .insert(commentsToInsert as any)
          .select();

        if (insertError) {
          console.error('Error inserting founder comments:', insertError);
          throw insertError;
        }
      }
    } catch (error) {
      console.error('EscalatedEssaysService: Error saving founder comments', error);
      throw error;
    }
  }

  /**
   * Delete a founder comment from both founder_comments table and founder_edited_content
   */
  static async deleteFounderComment(
    commentId: string,
    escalationId: string,
    updatedDocument: SemanticDocument
  ): Promise<void> {
    try {
      console.log('[FOUNDER_DELETE_DEBUG] deleteFounderComment called in EscalatedEssaysService', {
        commentId,
        escalationId,
        documentBlocks: updatedDocument.blocks.length
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: founderProfile } = await supabase
        .from('user_profiles')
        .select('is_founder')
        .eq('user_id' as any, user.id)
        .maybeSingle();

      const founderProfileData = founderProfile as any;
      if (!founderProfileData?.is_founder) {
        throw new Error('Access denied: Founder access required');
      }

      // Step 1: Delete from founder_comments table
      const { error: deleteError } = await supabase
        .from('founder_comments' as any)
        .delete()
        .eq('id' as any, commentId);

      if (deleteError) {
        console.error('[FOUNDER_DELETE_DEBUG] Error deleting from founder_comments', deleteError);
        throw deleteError;
      }

      console.log('[FOUNDER_DELETE_DEBUG] Successfully deleted from founder_comments table', {
        commentId
      });

      // Step 2: Update founder_edited_content to remove the deleted annotation
      // This ensures the comment doesn't reappear on page reload
      try {
        await EscalatedEssaysService.updateEscalatedEssay(escalationId, {
          founder_edited_content: updatedDocument
        });
        console.log('[FOUNDER_DELETE_DEBUG] Successfully updated founder_edited_content', {
          commentId,
          escalationId
        });
      } catch (updateError) {
        console.error('[FOUNDER_DELETE_DEBUG] Error updating founder_edited_content', updateError);
        // Don't throw - comment is already deleted from founder_comments, this is just cleanup
        console.warn('[FOUNDER_DELETE_DEBUG] Comment deleted from founder_comments but failed to update founder_edited_content. Comment may reappear on reload.');
      }
    } catch (error) {
      console.error('[FOUNDER_DELETE_DEBUG] EscalatedEssaysService: Error deleting founder comment', error);
      throw error;
    }
  }

  /**
   * Update a founder comment in the founder_comments table
   */
  static async updateFounderComment(
    commentId: string,
    escalationId: string,
    updatedContent: string,
    updatedDocument: SemanticDocument
  ): Promise<void> {
    try {
      console.log('[FOUNDER_UPDATE_DEBUG] updateFounderComment called in EscalatedEssaysService', {
        commentId,
        escalationId,
        updatedContent: updatedContent.substring(0, 50)
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: founderProfile } = await supabase
        .from('user_profiles')
        .select('is_founder')
        .eq('user_id' as any, user.id)
        .maybeSingle();

      const founderProfileData = founderProfile as any;
      if (!founderProfileData?.is_founder) {
        throw new Error('Access denied: Founder access required');
      }

      // Step 1: Update the comment in founder_comments table
      const { error: updateError } = await supabase
        .from('founder_comments' as any)
        .update({
          content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id' as any, commentId)
        .eq('escalation_id' as any, escalationId);

      if (updateError) {
        console.error('[FOUNDER_UPDATE_DEBUG] Error updating founder_comments', updateError);
        throw updateError;
      }

      console.log('[FOUNDER_UPDATE_DEBUG] Successfully updated founder_comments table', {
        commentId
      });

      // Step 2: Update founder_edited_content to reflect the updated annotation
      try {
        await EscalatedEssaysService.updateEscalatedEssay(escalationId, {
          founder_edited_content: updatedDocument
        });
        console.log('[FOUNDER_UPDATE_DEBUG] Successfully updated founder_edited_content', {
          commentId,
          escalationId
        });
      } catch (updateError) {
        console.error('[FOUNDER_UPDATE_DEBUG] Error updating founder_edited_content', updateError);
        // Don't throw - comment is already updated in founder_comments, this is just cleanup
        console.warn('[FOUNDER_UPDATE_DEBUG] Comment updated in founder_comments but failed to update founder_edited_content. Changes may not persist on reload.');
      }
    } catch (error) {
      console.error('[FOUNDER_UPDATE_DEBUG] EscalatedEssaysService: Error updating founder comment', error);
      throw error;
    }
  }

  /**
   * Fetch founder comments for an escalation (founder view)
   */
  static async getFounderCommentsByEscalationId(escalationId: string): Promise<FounderComment[]> {
    try {
      // Verify user is authenticated and is founder
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: founderProfile } = await supabase
        .from('user_profiles')
        .select('is_founder')
        .eq('user_id' as any, user.id)
        .maybeSingle();

      const founderProfileData = founderProfile as any;
      if (!founderProfileData?.is_founder) {
        throw new Error('Access denied: Founder access required');
      }

      // Fetch founder comments for this escalation
      const { data: comments, error } = await supabase
        .from('founder_comments' as any)
        .select('*')
        .eq('escalation_id' as any, escalationId)
        .order('created_at' as any, { ascending: true });

      if (error) {
        console.error('Error fetching founder comments:', error);
        throw error;
      }

      return (comments || []).map((comment: any) => ({
        id: comment.id,
        essay_id: comment.essay_id,
        escalation_id: comment.escalation_id,
        block_id: comment.block_id,
        type: comment.type,
        content: comment.content,
        target_text: comment.target_text,
        position_start: comment.position_start,
        position_end: comment.position_end,
        resolved: comment.resolved,
        resolved_at: comment.resolved_at,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        metadata: comment.metadata || {}
      }));
    } catch (error) {
      console.error('EscalatedEssaysService: Error fetching founder comments', error);
      throw error;
    }
  }

  /**
   * Escalate an essay to the founder portal
   * Creates a snapshot of the current essay state including document content and AI comments
   */
  static async escalateEssay(
    essayId: string,
    essayTitle: string,
    essayContent: SemanticDocument,
    essayPrompt: string | null,
    wordLimit: string | null,
    semanticDocumentId: string | null
  ): Promise<{ id: string; success: boolean }> {
    try {
      // Verify user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Calculate word and character counts
      const wordCount = essayContent.blocks.reduce((total, block) => {
        const words = (block.content || '').split(/\s+/).filter(word => word.trim().length > 0);
        return total + words.length;
      }, 0);

      const characterCount = essayContent.blocks.reduce((total, block) => {
        return total + (block.content || '').length;
      }, 0);

      // Fetch current AI comments/annotations for this document
      let aiCommentsSnapshot: EscalatedEssayComment[] = [];
      if (semanticDocumentId) {
        const { data: annotations, error: annotationsError } = await supabase
          .from('semantic_annotations')
          .select('*')
          .eq('document_id', semanticDocumentId)
          .eq('author', 'ai')
          .order('created_at', { ascending: true });

        if (!annotationsError && annotations) {
          aiCommentsSnapshot = annotations.map((annotation: any) => ({
            id: annotation.id,
            blockId: annotation.block_id,
            type: annotation.type,
            content: annotation.content,
            position: annotation.target_text ? {
              start: 0, // Position info would need to be extracted from target_text if needed
              end: annotation.target_text.length
            } : undefined,
            created_at: annotation.created_at
          }));
        }
      }

      // Create escalation record
      const { data: escalatedEssay, error: insertError } = await supabase
        .from('escalated_essays' as any)
        .insert({
          essay_id: essayId,
          user_id: user.id,
          essay_title: essayTitle,
          essay_content: essayContent as any, // JSONB field
          essay_prompt: essayPrompt,
          word_limit: wordLimit,
          word_count: wordCount,
          character_count: characterCount,
          ai_comments_snapshot: aiCommentsSnapshot as any, // JSONB field
          semantic_document_id: semanticDocumentId,
          status: 'pending'
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error escalating essay:', insertError);
        throw insertError;
      }

      if (!escalatedEssay) {
        throw new Error('Failed to create escalation record');
      }

      return {
        id: escalatedEssay.id,
        success: true
      };
    } catch (error) {
      console.error('EscalatedEssaysService: Error escalating essay', error);
      throw error;
    }
  }
}

