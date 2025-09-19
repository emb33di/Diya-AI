import { supabase } from '@/integrations/supabase/client';

// Types for comment positioning in TipTap editor
export interface TextSelection {
  start: {
    pos: number;
    path: number[];
  };
  end: {
    pos: number;
    path: number[];
  };
}

export interface CommentData {
  essayId: string;
  textSelection: TextSelection;
  anchorText: string;
  commentText: string;
  commentType: 'suggestion' | 'critique' | 'praise' | 'question';
  aiGenerated?: boolean;
  aiModel?: string;
  confidenceScore?: number;
}

export interface Comment {
  id: string;
  essay_id: string;
  user_id: string;
  text_selection: TextSelection;
  anchor_text: string;
  comment_text: string;
  comment_type: 'suggestion' | 'critique' | 'praise' | 'question';
  ai_generated: boolean;
  ai_model?: string;
  confidence_score?: number;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  // New fields added for enhanced comment system
  comment_category?: 'overall' | 'inline';
  comment_subcategory?: 'opening' | 'body' | 'conclusion' | 'opening-sentence' | 'transition' | 'paragraph-specific' | 'paragraph-quality' | 'final-sentence';
  agent_type?: 'big-picture' | 'paragraph' | 'weaknesses' | 'strengths' | 'reconciliation' | 'tone' | 'clarity' | 'grammar_spelling';
  paragraph_index?: number;
  transition_score?: number;
  transition_score_color?: string;
  opening_sentence_score?: number;
  opening_sentence_score_color?: string;
  paragraph_quality_score?: number;
  paragraph_quality_score_color?: string;
  final_sentence_score?: number;
  final_sentence_score_color?: string;
  // New fields for paragraph change detection
  isUnchangedParagraphFeedback?: boolean;
  existingCommentCount?: number;
  // Reconciliation fields
  reconciliation_type?: 'reconciled' | 'strength-enhanced' | 'weakness-enhanced' | 'balanced';
  original_source?: 'strength' | 'weakness' | 'both';
  // NEW: Contextual anchoring field
  paragraph_id?: string; // Unique identifier for the paragraph this comment refers to
  // New organization fields
  organization_category?: 'overall-strength' | 'overall-weakness' | 'inline';
  reconciliation_source?: 'strength' | 'weakness' | 'both' | 'none';
  chronological_position?: number;
  // User feedback for AI fine-tuning
  user_feedback_helpful?: boolean | null;
  // New fields for enhanced comment system
  comment_nature?: 'strength' | 'weakness' | 'combined' | 'neutral';
  // Quality score for big picture agent (1-100 scale)
  quality_score?: number;
  comment_quality_score?: number;
  is_duplicate?: boolean;
  duplicate_of_comment_id?: string;
  anchor_text_validated?: boolean;
  anchor_text_validation_error?: string;
  comment_priority?: number;
  generation_method?: 'ai' | 'fallback' | 'manual' | 'retry';
  retry_count?: number;
  generation_error?: string;
  is_fallback_comment?: boolean;
  fallback_reason?: string;
  ai_model_version?: string;
  prompt_hash?: string;
  generation_context?: any;
  generation_timestamp?: string;
  score?: number;
  score_color?: string;
}

export interface CommentThread {
  id: string;
  parent_comment_id: string;
  user_id: string;
  reply_text: string;
  created_at: string;
  updated_at: string;
}

export interface CreateThreadData {
  parentCommentId: string;
  replyText: string;
}

export class CommentService {
  // Validate anchor text exists in essay content
  static validateAnchorText(anchorText: string, essayContent: string): boolean {
    if (!anchorText || !essayContent) return false;
    
    // Clean the essay content the same way as the editor
    const cleanContent = essayContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Convert non-breaking spaces
      .replace(/&amp;/g, '&') // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    // Check if anchor text exists in the cleaned content
    const exists = cleanContent.toLowerCase().includes(anchorText.toLowerCase());
    
    if (!exists) {
      console.warn(`Anchor text validation failed: "${anchorText}" not found in essay content`);
    }
    
    return exists;
  }

  // Create a new comment with validation
  static async createComment(data: CommentData): Promise<Comment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Validate anchor text if provided
    if (data.anchorText && data.essayId) {
      try {
        // Get the current essay content for validation
        const { data: essay } = await supabase
          .from('essays')
          .select('content')
          .eq('id', data.essayId)
          .single();
        
        if (essay && !this.validateAnchorText(data.anchorText, essay.content)) {
          console.warn(`Comment creation: Anchor text "${data.anchorText}" not found in essay content`);
          // Don't fail the creation, but log the issue
        }
      } catch (error) {
        console.warn('Could not validate anchor text:', error);
        // Continue with comment creation even if validation fails
      }
    }

    const { data: comment, error } = await supabase
      .from('essay_comments')
      .insert({
        essay_id: data.essayId,
        user_id: user.id,
        text_selection: data.textSelection,
        anchor_text: data.anchorText,
        comment_text: data.commentText,
        comment_type: data.commentType,
        ai_generated: data.aiGenerated || false,
        ai_model: data.aiModel,
        confidence_score: data.confidenceScore
      })
      .select()
      .single();

    if (error) throw error;
    return comment;
  }

  // Get all comments for an essay (from current active checkpoint only)
  static async getCommentsForEssay(essayId: string): Promise<Comment[]> {
    try {
      // First, try to get the current active checkpoint
      const { data: activeCheckpoint, error: checkpointError } = await supabase
        .from('essay_checkpoints')
        .select('id')
        .eq('essay_id', essayId)
        .eq('is_active', true)
        .single();

      // Check for active checkpoint

      let query = supabase
        .from('essay_comments')
        .select(`
          id,
          essay_id,
          user_id,
          checkpoint_id,
          text_selection,
          anchor_text,
          comment_text,
          comment_type,
          ai_generated,
          ai_model,
          confidence_score,
          resolved,
          resolved_at,
          created_at,
          updated_at,
          comment_category,
          comment_subcategory,
          agent_type,
          paragraph_index,
          transition_score,
          transition_score_color,
          opening_sentence_score,
          opening_sentence_score_color,
          paragraph_quality_score,
          paragraph_quality_score_color,
          final_sentence_score,
          final_sentence_score_color,
        paragraph_id,
        user_feedback_helpful
      `)
        .eq('essay_id', essayId)
        .eq('resolved', false)
        .order('created_at', { ascending: true });

      // If we have an active checkpoint, filter by it
      if (activeCheckpoint && !checkpointError) {
        // Filter by checkpoint_id OR null (for legacy comments without checkpoint_id)
        query = query.or(`checkpoint_id.eq.${activeCheckpoint.id},checkpoint_id.is.null`);
      }

      const { data: comments, error } = await query;

      if (error) {
        console.error('Error fetching comments:', error);
        throw error;
      }
      return comments || [];
    } catch (error) {
      console.error('Error in getCommentsForEssay:', error);
      // Fallback: try to get comments without checkpoint filtering
      try {
        const { data: fallbackComments, error: fallbackError } = await supabase
          .from('essay_comments')
          .select('*')
          .eq('essay_id', essayId)
          .eq('resolved', false)
          .order('created_at', { ascending: true });

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }

        return fallbackComments || [];
      } catch (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        return [];
      }
    }
  }

  // Get all comments for an essay (including resolved, from current active checkpoint only)
  static async getAllCommentsForEssay(essayId: string): Promise<Comment[]> {
    try {
      // First, try to get the current active checkpoint
      const { data: activeCheckpoint, error: checkpointError } = await supabase
        .from('essay_checkpoints')
        .select('id')
        .eq('essay_id', essayId)
        .eq('is_active', true)
        .single();

      // Check for active checkpoint

      let query = supabase
        .from('essay_comments')
        .select(`
          id,
          essay_id,
          user_id,
          checkpoint_id,
          text_selection,
          anchor_text,
          comment_text,
          comment_type,
          ai_generated,
          ai_model,
          confidence_score,
          resolved,
          resolved_at,
          created_at,
          updated_at,
          comment_category,
          comment_subcategory,
          agent_type,
          paragraph_index,
          transition_score,
          transition_score_color,
          opening_sentence_score,
          opening_sentence_score_color,
          paragraph_quality_score,
          paragraph_quality_score_color,
          final_sentence_score,
          final_sentence_score_color,
        paragraph_id,
        user_feedback_helpful
      `)
        .eq('essay_id', essayId)
        .order('created_at', { ascending: true });

      // If we have an active checkpoint, filter by it
      if (activeCheckpoint && !checkpointError) {
        // Filter by checkpoint_id OR null (for legacy comments without checkpoint_id)
        query = query.or(`checkpoint_id.eq.${activeCheckpoint.id},checkpoint_id.is.null`);
      }

      const { data: comments, error } = await query;

      if (error) {
        console.error('Error fetching all comments:', error);
        throw error;
      }
      return comments || [];
    } catch (error) {
      console.error('Error in getAllCommentsForEssay:', error);
      // Fallback: try to get comments without checkpoint filtering
      try {
        const { data: fallbackComments, error: fallbackError } = await supabase
          .from('essay_comments')
          .select('*')
          .eq('essay_id', essayId)
          .order('created_at', { ascending: true });

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }

        console.log('Fallback retrieved all comments:', fallbackComments?.length || 0, 'comments');
        return fallbackComments || [];
      } catch (fallbackError) {
        console.error('Fallback query failed:', fallbackError);
        return [];
      }
    }
  }

  // Get comments from a specific checkpoint
  static async getCommentsForCheckpoint(essayId: string, checkpointId: string): Promise<Comment[]> {
    const { data: comments, error } = await supabase
      .from('essay_comments')
      .select(`
        id,
        essay_id,
        user_id,
        checkpoint_id,
        text_selection,
        anchor_text,
        comment_text,
        comment_type,
        ai_generated,
        ai_model,
        confidence_score,
        resolved,
        resolved_at,
        created_at,
        updated_at,
        comment_category,
        comment_subcategory,
        agent_type,
        paragraph_index,
        transition_score,
        transition_score_color,
        opening_sentence_score,
        opening_sentence_score_color,
        paragraph_quality_score,
        paragraph_quality_score_color,
        final_sentence_score,
        final_sentence_score_color
      `)
      .eq('essay_id', essayId)
      .eq('checkpoint_id', checkpointId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return comments || [];
  }

  // Get all comments for an essay across all checkpoints (for history comparison)
  static async getAllCommentsForEssayHistory(essayId: string): Promise<Comment[]> {
    const { data: comments, error } = await supabase
      .from('essay_comments')
      .select(`
        id,
        essay_id,
        user_id,
        checkpoint_id,
        text_selection,
        anchor_text,
        comment_text,
        comment_type,
        ai_generated,
        ai_model,
        confidence_score,
        resolved,
        resolved_at,
        created_at,
        updated_at,
        comment_category,
        comment_subcategory,
        agent_type,
        paragraph_index,
        transition_score,
        transition_score_color,
        opening_sentence_score,
        opening_sentence_score_color,
        paragraph_quality_score,
        paragraph_quality_score_color,
        final_sentence_score,
        final_sentence_score_color
      `)
      .eq('essay_id', essayId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return comments || [];
  }

  // Get a specific comment by ID
  static async getComment(commentId: string): Promise<Comment> {
    const { data: comment, error } = await supabase
      .from('essay_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (error) throw error;
    return comment;
  }

  // Update a comment
  static async updateComment(commentId: string, updates: Partial<CommentData>): Promise<Comment> {
    const { data: comment, error } = await supabase
      .from('essay_comments')
      .update({
        comment_text: updates.commentText,
        comment_type: updates.commentType,
        anchor_text: updates.anchorText,
        text_selection: updates.textSelection,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) throw error;
    return comment;
  }

  // Resolve a comment
  static async resolveComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('essay_comments')
      .update({ 
        resolved: true, 
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) throw error;
  }

  // Unresolve a comment
  static async unresolveComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('essay_comments')
      .update({ 
        resolved: false, 
        resolved_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) throw error;
  }

  // Delete a comment
  static async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('essay_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  }

  // Get AI-generated comments for an essay
  static async getAICommentsForEssay(essayId: string): Promise<Comment[]> {
    const { data: comments, error } = await supabase
      .from('essay_comments')
      .select(`
        id,
        essay_id,
        user_id,
        text_selection,
        anchor_text,
        comment_text,
        comment_type,
        ai_generated,
        ai_model,
        confidence_score,
        resolved,
        resolved_at,
        created_at,
        updated_at,
        comment_category,
        comment_subcategory,
        agent_type,
        paragraph_index,
        transition_score,
        transition_score_color,
        opening_sentence_score,
        opening_sentence_score_color,
        paragraph_quality_score,
        paragraph_quality_score_color,
        final_sentence_score,
        final_sentence_score_color
      `)
      .eq('essay_id', essayId)
      .eq('ai_generated', true)
      .eq('resolved', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return comments || [];
  }

  // Get user-generated comments for an essay
  static async getUserCommentsForEssay(essayId: string): Promise<Comment[]> {
    const { data: comments, error } = await supabase
      .from('essay_comments')
      .select('*')
      .eq('essay_id', essayId)
      .eq('ai_generated', false)
      .eq('resolved', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return comments || [];
  }

  // Comment Threads
  // Create a reply to a comment
  static async createThreadReply(data: CreateThreadData): Promise<CommentThread> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: thread, error } = await supabase
      .from('comment_threads')
      .insert({
        parent_comment_id: data.parentCommentId,
        user_id: user.id,
        reply_text: data.replyText
      })
      .select()
      .single();

    if (error) throw error;
    return thread;
  }

  // Get all replies for a comment
  static async getThreadReplies(commentId: string): Promise<CommentThread[]> {
    const { data: threads, error } = await supabase
      .from('comment_threads')
      .select('*')
      .eq('parent_comment_id', commentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return threads || [];
  }

  // Update a thread reply
  static async updateThreadReply(threadId: string, replyText: string): Promise<CommentThread> {
    const { data: thread, error } = await supabase
      .from('comment_threads')
      .update({
        reply_text: replyText,
        updated_at: new Date().toISOString()
      })
      .eq('id', threadId)
      .select()
      .single();

    if (error) throw error;
    return thread;
  }

  // Delete a thread reply
  static async deleteThreadReply(threadId: string): Promise<void> {
    const { error } = await supabase
      .from('comment_threads')
      .delete()
      .eq('id', threadId);

    if (error) throw error;
  }

  // Utility functions
  static async getCommentStats(essayId: string): Promise<{
    total: number;
    resolved: number;
    aiGenerated: number;
    userGenerated: number;
  }> {
    const { data: comments, error } = await supabase
      .from('essay_comments')
      .select('id, resolved, ai_generated')
      .eq('essay_id', essayId);

    if (error) throw error;

    const stats = {
      total: comments?.length || 0,
      resolved: comments?.filter(c => c.resolved).length || 0,
      aiGenerated: comments?.filter(c => c.ai_generated).length || 0,
      userGenerated: comments?.filter(c => !c.ai_generated).length || 0
    };

    return stats;
  }

  // Batch operations
  static async resolveMultipleComments(commentIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('essay_comments')
      .update({ 
        resolved: true, 
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', commentIds);

    if (error) throw error;
  }

  static async deleteMultipleComments(commentIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('essay_comments')
      .delete()
      .in('id', commentIds);

    if (error) throw error;
  }

  // User feedback methods for AI fine-tuning
  static async submitUserFeedback(commentId: string, isHelpful: boolean): Promise<void> {
    const { error } = await supabase
      .from('essay_comments')
      .update({ 
        user_feedback_helpful: isHelpful,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('ai_generated', true); // Only allow feedback on AI-generated comments

    if (error) throw error;
  }

  static async removeUserFeedback(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('essay_comments')
      .update({ 
        user_feedback_helpful: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) throw error;
  }

  static async getAICommentFeedbackStats(): Promise<{
    totalAIComments: number;
    helpfulCount: number;
    notHelpfulCount: number;
    noFeedbackCount: number;
    helpfulPercentage: number;
  }> {
    const { data, error } = await supabase.rpc('get_ai_comment_feedback_stats');

    if (error) throw error;

    return {
      totalAIComments: data[0]?.total_ai_comments || 0,
      helpfulCount: data[0]?.helpful_feedback_count || 0,
      notHelpfulCount: data[0]?.not_helpful_feedback_count || 0,
      noFeedbackCount: data[0]?.no_feedback_count || 0,
      helpfulPercentage: data[0]?.helpful_percentage || 0
    };
  }

  static async getAICommentFeedbackByAgent(): Promise<Array<{
    agentType: string;
    totalComments: number;
    helpfulCount: number;
    notHelpfulCount: number;
    helpfulPercentage: number;
  }>> {
    const { data, error } = await supabase.rpc('get_ai_comment_feedback_by_agent');

    if (error) throw error;

    return data.map((row: any) => ({
      agentType: row.agent_type,
      totalComments: row.total_comments,
      helpfulCount: row.helpful_count,
      notHelpfulCount: row.not_helpful_count,
      helpfulPercentage: row.helpful_percentage
    }));
  }
}
