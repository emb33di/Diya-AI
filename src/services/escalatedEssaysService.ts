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
  founder_comments: EscalatedEssayComment[];
  
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
  founder_comments?: EscalatedEssayComment[];
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

