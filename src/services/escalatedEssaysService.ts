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

export interface EssaySummary {
  study_target: string;
  goals_background: string;
  strengths: string;
  weaknesses: string;
  grammar_mistakes: string;
  improvement_areas: string;
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
  
  // AI summary for founder
  ai_summary: EssaySummary | null;
  
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

interface EscalationSlotReservation {
  success: boolean;
  remaining_slots: number;
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
        ai_summary: (essayItem.ai_summary || null) as EssaySummary | null,
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
        ai_summary: (essayItem.ai_summary || null) as EssaySummary | null,
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
        ai_summary: (essayItem.ai_summary || null) as EssaySummary | null,
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
   * Fetch ALL escalations for a specific essay (for version management)
   * Returns all escalations that have been sent back, ordered by most recent first
   */
  static async getAllEscalationsByEssayId(essayId: string): Promise<EscalatedEssay[]> {
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

      // Fetch all escalations where status = 'sent_back', ordered by most recent first
      const { data: escalationDataList, error: escalationError } = await supabase
        .from('escalated_essays' as any)
        .select('*')
        .eq('essay_id' as any, essayId)
        .eq('status' as any, 'sent_back')
        .order('sent_back_at' as any, { ascending: false });

      if (escalationError) {
        console.error('Error fetching escalations:', escalationError);
        throw escalationError;
      }

      if (!escalationDataList || escalationDataList.length === 0) {
        return []; // No escalations found
      }

      // Transform escalation data to EscalatedEssay type
      const escalations: EscalatedEssay[] = escalationDataList.map((essayItem: any) => ({
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
        ai_summary: (essayItem.ai_summary || null) as EssaySummary | null,
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
      }));

      return escalations;
    } catch (error) {
      console.error('EscalatedEssaysService: Error fetching all escalations by essay ID', error);
      throw error;
    }
  }

  /**
   * Fetch founder comments for a specific escalation (by escalation ID)
   * Used when viewing a specific escalation version
   */
  static async getFounderCommentsByEscalationId(escalationId: string): Promise<FounderComment[]> {
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
   * Fetch founder comments for a specific escalation (user-facing)
   * Used when viewing a specific escalation version
   */
  static async getFounderCommentsByEscalationIdForUser(escalationId: string): Promise<FounderComment[]> {
    try {
      // Verify user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Verify the escalation belongs to the user
      const { data: escalationData } = await supabase
        .from('escalated_essays' as any)
        .select('user_id')
        .eq('id' as any, escalationId)
        .maybeSingle();

      if (!escalationData || (escalationData as any).user_id !== user.id) {
        throw new Error('Access denied: You can only view comments for your own escalations');
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
      console.error('EscalatedEssaysService: Error fetching founder comments by escalation ID', error);
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

      const commentsPayload = comments.map(comment => ({
        id: comment.id,
        blockId: comment.blockId,
        type: comment.type,
        content: comment.content,
        targetText: comment.targetText || null,
        positionStart: comment.position?.start ?? null,
        positionEnd: comment.position?.end ?? null,
        metadata: (comment as any).metadata || {},
        createdAt: comment.created_at || new Date().toISOString(),
      }));

      const { error: saveError } = await supabase.rpc('save_founder_comments', {
        p_essay_id: essayId,
        p_escalation_id: escalationId,
        p_comments: commentsPayload,
      } as any);

      if (saveError) {
        console.error('Error saving founder comments via RPC:', saveError);
        throw saveError;
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
        throw deleteError;
      }

      // Step 2: Update founder_edited_content to remove the deleted annotation
      // This ensures the comment doesn't reappear on page reload
      try {
        await EscalatedEssaysService.updateEscalatedEssay(escalationId, {
          founder_edited_content: updatedDocument
        });
      } catch (updateError) {
        // Don't throw - comment is already deleted from founder_comments, this is just cleanup
        // Comment may reappear on reload if update fails
      }
    } catch (error) {
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
   * Check if user is a Pro user
   */
  static async checkProUserStatus(userId: string): Promise<boolean> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('user_tier')
        .eq('user_id' as any, userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking Pro user status:', error);
        return false;
      }

      const profileData = profile as any;
      return profileData?.user_tier === 'Pro';
    } catch (error) {
      console.error('EscalatedEssaysService: Error checking Pro user status', error);
      return false;
    }
  }

  /**
   * Get or create escalation tracking record for a user
   */
  static async getOrCreateEscalationTracking(userId: string): Promise<{
    escalation_count: number;
    max_escalations: number;
    id: string;
  }> {
    try {
      // Try to get existing record
      const { data: existing, error: fetchError } = await supabase
        .from('user_escalation_tracking' as any)
        .select('*')
        .eq('user_id' as any, userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching escalation tracking:', fetchError);
        throw fetchError;
      }

      if (existing) {
        const existingData = existing as any;
        return {
          id: existingData.id,
          escalation_count: existingData.escalation_count || 0,
          max_escalations: existingData.max_escalations || 2,
        };
      }

      // Create new record if doesn't exist
      const { data: created, error: createError } = await supabase
        .from('user_escalation_tracking' as any)
        .insert({
          user_id: userId,
          escalation_count: 0,
          max_escalations: 2,
          subscription_started_at: new Date().toISOString(),
          last_reset_at: new Date().toISOString(),
        } as any)
        .select('*')
        .single();

      if (createError) {
        if ((createError as any).code === '23505') {
          const { data: existingAfterConflict } = await supabase
            .from('user_escalation_tracking' as any)
            .select('*')
            .eq('user_id' as any, userId)
            .maybeSingle();

          if (existingAfterConflict) {
            const conflictData = existingAfterConflict as any;
            return {
              id: conflictData.id,
              escalation_count: conflictData.escalation_count || 0,
              max_escalations: conflictData.max_escalations || 2,
            };
          }
        }

        console.error('Error creating escalation tracking:', createError);
        throw createError;
      }

      const createdData = created as any;
      return {
        id: createdData.id,
        escalation_count: createdData.escalation_count || 0,
        max_escalations: createdData.max_escalations || 2,
      };
    } catch (error) {
      console.error('EscalatedEssaysService: Error getting/creating escalation tracking', error);
      throw error;
    }
  }

  /**
   * Reserve an escalation slot for a user atomically by decrementing escalation_slots.
   * Returns success status and remaining slots.
   */
  static async reserveEscalationSlot(userId: string): Promise<EscalationSlotReservation> {
    try {
      const { data, error } = await supabase.rpc('decrement_escalation_slots', {
        p_user_id: userId,
      } as any);

      if (error) {
        console.error('Error reserving escalation slot:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId
        });
        
        // Provide more user-friendly error messages
        if (error.code === '42501') {
          throw new Error('Permission denied. Please ensure you are logged in.');
        } else if (error.message?.includes('Unauthorized')) {
          throw new Error('Unauthorized access. Please log in again.');
        } else {
          throw new Error(error.message || 'Failed to reserve escalation slot');
        }
      }

      const reservation = Array.isArray(data) ? (data[0] as EscalationSlotReservation | undefined) : undefined;

      if (!reservation) {
        console.error('EscalatedEssaysService: RPC returned empty result', { data, userId });
        throw new Error('Failed to reserve escalation slot: No data returned');
      }

      return reservation;
    } catch (error) {
      console.error('EscalatedEssaysService: Error reserving escalation slot', {
        error,
        userId,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Release an escalation slot for a user (used when escalation fails).
   * Restores the user's previous slot count without overwriting admin overrides.
   */
  static async releaseEscalationSlot(userId: string, expectedSlots?: number): Promise<void> {
    try {
      // Get current escalation_slots value
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles' as any)
        .select('escalation_slots')
        .eq('user_id' as any, userId)
        .single();

      if (fetchError) {
        console.error('Error fetching profile for slot release:', fetchError);
        throw fetchError;
      }

      const currentSlotsRaw = (profile as any)?.escalation_slots;

      if (currentSlotsRaw === null || currentSlotsRaw === undefined) {
        // If slots are null/undefined, nothing to restore; user is not eligible for slots.
        return;
      }

      const currentSlots = Number(currentSlotsRaw);

      // If we have an expected slot count (original before decrement), restore to at least that value.
      let newSlots: number;
      if (typeof expectedSlots === 'number' && !Number.isNaN(expectedSlots)) {
        newSlots = Math.max(currentSlots, expectedSlots);
      } else {
        newSlots = currentSlots + 1;
      }

      if (newSlots === currentSlots) {
        return; // No update needed.
      }

      const { error } = await supabase
        .from('user_profiles' as any)
        .update({
          escalation_slots: newSlots,
          updated_at: new Date().toISOString()
        })
        .eq('user_id' as any, userId);

      if (error) {
        console.error('Error releasing escalation slot:', error);
        throw error;
      }
    } catch (error) {
      console.error('EscalatedEssaysService: Error releasing escalation slot', error);
      throw error;
    }
  }

  /**
   * Get user escalation status (used/remaining/max) from user_profiles.escalation_slots
   */
  static async getUserEscalationStatus(): Promise<{
    used: number;
    remaining: number;
    max: number;
    canEscalate: boolean;
  }> {
    try {
      // Verify user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Check if user is Pro
      const isPro = await this.checkProUserStatus(user.id);
      if (!isPro) {
        return {
          used: 0,
          remaining: 0,
          max: 0,
          canEscalate: false,
        };
      }

      // Get escalation_slots from user_profiles
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles' as any)
        .select('escalation_slots')
        .eq('user_id' as any, user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile for escalation status:', profileError);
        throw profileError;
      }

      const max = 2;
      const remaining = (profile as any)?.escalation_slots ?? 0;
      const used = max - remaining;
      const canEscalate = remaining > 0;

      return {
        used: Math.max(0, used),
        remaining: Math.max(0, remaining),
        max,
        canEscalate,
      };
    } catch (error) {
      console.error('EscalatedEssaysService: Error getting user escalation status', error);
      throw error;
    }
  }

  /**
   * Strip AI comments from a SemanticDocument
   * Returns a clean copy with only non-AI annotations (user comments, founder comments)
   */
  static stripAIComments(document: SemanticDocument): SemanticDocument {
    return {
      ...document,
      blocks: document.blocks.map(block => ({
        ...block,
        annotations: (block.annotations || []).filter(ann => ann.author !== 'ai')
      })),
      updatedAt: new Date()
    };
  }

  /**
   * Generate AI summary for founder review
   * Analyzes the entire essay and provides structured feedback
   */
  static async generateFounderSummary(
    escalationId: string,
    essayContent: SemanticDocument,
    essayPrompt: string | null,
    userId: string
  ): Promise<void> {
    try {
      console.log('[FOUNDER_SUMMARY_SERVICE] Starting summary generation for escalation:', escalationId);
      
      // Combine all blocks into full essay content
      const fullEssayContent = essayContent.blocks
        .map(block => block.content?.trim())
        .filter(content => content && content.length > 0)
        .join('\n\n');

      if (!fullEssayContent || fullEssayContent.trim().length === 0) {
        console.log('[FOUNDER_SUMMARY_SERVICE] No essay content found for summarization');
        return;
      }

      console.log('[FOUNDER_SUMMARY_SERVICE] Essay content length:', fullEssayContent.length, 'characters');

      // Fetch user profile data for context
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('intended_majors, applying_to, career_interests, high_school_name, college_name')
        .eq('user_id', userId)
        .maybeSingle();

      const profile = profileData as any;
      
      // Build school/major context
      const schoolMajor = [
        profile?.intended_majors,
        profile?.applying_to ? `Applying to ${profile.applying_to}` : null
      ].filter(Boolean).join(' - ') || 'Not specified';

      // Build goals/background context
      const goalsBackground = [
        profile?.career_interests,
        profile?.high_school_name ? `From ${profile.high_school_name}` : null,
        profile?.college_name ? `Currently at ${profile.college_name}` : null
      ].filter(Boolean).join('. ') || 'Not specified';

      console.log('[FOUNDER_SUMMARY_SERVICE] User context:', { schoolMajor, goalsBackground });

      // Call the AI agent Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('[FOUNDER_SUMMARY_SERVICE] ERROR: No session found for AI summary generation');
        return;
      }

      // Get Supabase URL from environment or use default
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (supabase as any).supabaseUrl;
      
      if (!supabaseUrl) {
        console.error('[FOUNDER_SUMMARY_SERVICE] ERROR: Supabase URL not found');
        return;
      }

      console.log('[FOUNDER_SUMMARY_SERVICE] Calling Edge Function...');
      const response = await fetch(`${supabaseUrl}/functions/v1/ai_agent_founder_summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          essayContent: fullEssayContent,
          essayPrompt,
          schoolMajor,
          goalsBackground
        })
      });

      console.log('[FOUNDER_SUMMARY_SERVICE] Edge Function response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FOUNDER_SUMMARY_SERVICE] ERROR: Edge Function error:', response.status, errorText);
        return;
      }

      const result = await response.json();
      console.log('[FOUNDER_SUMMARY_SERVICE] Edge Function result:', {
        success: result.success,
        has_summary: !!result.summary,
        error: result.error || 'None'
      });

      if (!result.success || !result.summary) {
        console.log('[FOUNDER_SUMMARY_SERVICE] No summary generated:', result.error || 'Unknown error');
        return;
      }

      console.log('[FOUNDER_SUMMARY_SERVICE] Saving summary to database...');
      // Save summary to database
      const { error: updateError } = await supabase
        .from('escalated_essays' as any)
        .update({
          ai_summary: result.summary
        })
        .eq('id', escalationId);

      if (updateError) {
        console.error('[FOUNDER_SUMMARY_SERVICE] ERROR: Failed to save AI summary:', updateError);
      } else {
        console.log('[FOUNDER_SUMMARY_SERVICE] SUCCESS: AI summary saved to database');
      }
    } catch (error) {
      console.error('[FOUNDER_SUMMARY_SERVICE] ERROR: Exception during summary generation:', error);
      // Don't throw - this is a background process, shouldn't block escalation
    }
  }

  /**
   * Escalate an essay to the founder portal
   * Creates a snapshot of the current essay state including document content (WITHOUT AI comments)
   * Enforces Pro user requirement and escalation limits
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

      // 1. Check if user is Pro user
      const isPro = await this.checkProUserStatus(user.id);
      if (!isPro) {
        throw new Error('Expert review is only available for Pro users. Please upgrade to Pro to access this feature.');
      }

      let reservation: EscalationSlotReservation | null = null;

      try {
        reservation = await this.reserveEscalationSlot(user.id);

        if (!reservation.success) {
          throw new Error(
            'You have reached your escalation limit of 2. ' +
            'Your limit will reset on your next subscription cycle.'
          );
        }

        // Strip AI comments from essay content before saving
        // Founder should only see the essay text, not AI comments
        const cleanEssayContent = this.stripAIComments(essayContent);

        // Calculate word and character counts
        const wordCount = cleanEssayContent.blocks.reduce((total, block) => {
          const words = (block.content || '').split(/\s+/).filter(word => word.trim().length > 0);
          return total + words.length;
        }, 0);

        const characterCount = cleanEssayContent.blocks.reduce((total, block) => {
          return total + (block.content || '').length;
        }, 0);

        // Fetch current AI comments/annotations for this document (for snapshot only, not displayed)
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

        // Create escalation record with clean essay content (no AI comments)
        const { data: escalatedEssay, error: insertError } = await supabase
          .from('escalated_essays' as any)
          .insert({
            essay_id: essayId,
            user_id: user.id,
            essay_title: essayTitle,
            essay_content: cleanEssayContent as any, // JSONB field - NO AI COMMENTS
            essay_prompt: essayPrompt,
            word_limit: wordLimit,
            word_count: wordCount,
            character_count: characterCount,
            ai_comments_snapshot: aiCommentsSnapshot as any, // JSONB field (for reference only, not displayed)
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
        if (reservation?.success) {
          const expectedSlots = reservation.remaining_slots + 1;
          try {
            await this.releaseEscalationSlot(user.id, expectedSlots);
          } catch (releaseError) {
            console.error('Failed to release escalation slot after error:', releaseError);
          }
        }

        throw error;
      }
    } catch (error) {
      console.error('EscalatedEssaysService: Error escalating essay', error);
      throw error;
    }
  }
}

