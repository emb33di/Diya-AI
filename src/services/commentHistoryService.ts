import { supabase } from '@/integrations/supabase/client';
import { Comment } from './commentService';

export interface CommentHistoryComparison {
  currentVersion: {
    checkpointId: string;
    versionNumber: number;
    comments: Comment[];
    commentCount: number;
  };
  previousVersion: {
    checkpointId: string;
    versionNumber: number;
    comments: Comment[];
    commentCount: number;
  };
  improvements: {
    newComments: Comment[];
    resolvedComments: Comment[];
    improvedAreas: string[];
  };
  summary: {
    totalComments: number;
    newCommentsCount: number;
    resolvedCommentsCount: number;
    overallProgress: 'improving' | 'maintaining' | 'declining';
  };
}

export interface CheckpointCommentSummary {
  checkpointId: string;
  versionNumber: number;
  createdAt: string;
  commentCount: number;
  strengthsCount: number;
  weaknessesCount: number;
  paragraphCommentsCount: number;
  averageConfidenceScore: number;
}

export class CommentHistoryService {
  /**
   * Get comment history for an essay across all checkpoints
   */
  static async getCommentHistory(essayId: string): Promise<CheckpointCommentSummary[]> {
    try {
      // Get all checkpoints with AI feedback for this essay
      const { data: checkpoints, error: checkpointsError } = await supabase
        .from('essay_checkpoints')
        .select('id, version_number, created_at, has_ai_feedback')
        .eq('essay_id', essayId)
        .eq('has_ai_feedback', true)
        .order('version_number', { ascending: true });

      if (checkpointsError) {
        throw new Error(`Failed to get checkpoints: ${checkpointsError.message}`);
      }

      if (!checkpoints || checkpoints.length === 0) {
        return [];
      }

      // Get comments for each checkpoint
      const checkpointSummaries: CheckpointCommentSummary[] = [];
      
      for (const checkpoint of checkpoints) {
        const { data: comments, error: commentsError } = await supabase
          .from('essay_comments')
          .select('*')
          .eq('checkpoint_id', checkpoint.id)
          .eq('ai_generated', true);

        if (commentsError) {
          console.error(`Error getting comments for checkpoint ${checkpoint.id}:`, commentsError);
          continue;
        }

        const commentsList = comments || [];
        const strengthsCount = commentsList.filter(c => c.agent_type === 'strengths').length;
        const weaknessesCount = commentsList.filter(c => c.agent_type === 'weaknesses').length;
        const paragraphCommentsCount = commentsList.filter(c => c.agent_type === 'paragraph').length;
        const averageConfidenceScore = commentsList.length > 0 
          ? commentsList.reduce((sum, c) => sum + (c.confidence_score || 0), 0) / commentsList.length
          : 0;

        checkpointSummaries.push({
          checkpointId: checkpoint.id,
          versionNumber: checkpoint.version_number,
          createdAt: checkpoint.created_at,
          commentCount: commentsList.length,
          strengthsCount,
          weaknessesCount,
          paragraphCommentsCount,
          averageConfidenceScore: Math.round(averageConfidenceScore * 100) / 100
        });
      }

      return checkpointSummaries;
    } catch (error) {
      console.error('Error getting comment history:', error);
      throw new Error(`Failed to get comment history: ${error.message}`);
    }
  }

  /**
   * Compare comments between two checkpoints
   */
  static async compareCheckpoints(
    essayId: string, 
    currentCheckpointId: string, 
    previousCheckpointId: string
  ): Promise<CommentHistoryComparison> {
    try {
      // Get comments for both checkpoints
      const [currentComments, previousComments] = await Promise.all([
        this.getCommentsForCheckpoint(essayId, currentCheckpointId),
        this.getCommentsForCheckpoint(essayId, previousCheckpointId)
      ]);

      // Get checkpoint details
      const { data: currentCheckpoint, error: currentError } = await supabase
        .from('essay_checkpoints')
        .select('version_number')
        .eq('id', currentCheckpointId)
        .single();

      const { data: previousCheckpoint, error: previousError } = await supabase
        .from('essay_checkpoints')
        .select('version_number')
        .eq('id', previousCheckpointId)
        .single();

      if (currentError || previousError) {
        throw new Error('Failed to get checkpoint details');
      }

      // Analyze improvements
      const newComments = currentComments.filter(currentComment => 
        !previousComments.some(prevComment => 
          prevComment.anchor_text === currentComment.anchor_text &&
          prevComment.comment_text === currentComment.comment_text
        )
      );

      const resolvedComments = previousComments.filter(prevComment => 
        !currentComments.some(currentComment => 
          currentComment.anchor_text === prevComment.anchor_text &&
          currentComment.comment_text === prevComment.comment_text
        )
      );

      // Identify improved areas based on comment types and content
      const improvedAreas: string[] = [];
      const currentWeaknesses = currentComments.filter(c => c.agent_type === 'weaknesses').length;
      const previousWeaknesses = previousComments.filter(c => c.agent_type === 'weaknesses').length;
      
      if (currentWeaknesses < previousWeaknesses) {
        improvedAreas.push('Reduced weaknesses identified');
      }
      
      const currentStrengths = currentComments.filter(c => c.agent_type === 'strengths').length;
      const previousStrengths = previousComments.filter(c => c.agent_type === 'strengths').length;
      
      if (currentStrengths > previousStrengths) {
        improvedAreas.push('More strengths identified');
      }

      // Determine overall progress
      let overallProgress: 'improving' | 'maintaining' | 'declining' = 'maintaining';
      if (newComments.length > resolvedComments.length && currentWeaknesses <= previousWeaknesses) {
        overallProgress = 'improving';
      } else if (currentWeaknesses > previousWeaknesses) {
        overallProgress = 'declining';
      }

      return {
        currentVersion: {
          checkpointId: currentCheckpointId,
          versionNumber: currentCheckpoint.version_number,
          comments: currentComments,
          commentCount: currentComments.length
        },
        previousVersion: {
          checkpointId: previousCheckpointId,
          versionNumber: previousCheckpoint.version_number,
          comments: previousComments,
          commentCount: previousComments.length
        },
        improvements: {
          newComments,
          resolvedComments,
          improvedAreas
        },
        summary: {
          totalComments: currentComments.length,
          newCommentsCount: newComments.length,
          resolvedCommentsCount: resolvedComments.length,
          overallProgress
        }
      };
    } catch (error) {
      console.error('Error comparing checkpoints:', error);
      throw new Error(`Failed to compare checkpoints: ${error.message}`);
    }
  }

  /**
   * Get comments for a specific checkpoint
   */
  private static async getCommentsForCheckpoint(essayId: string, checkpointId: string): Promise<Comment[]> {
    const { data: comments, error } = await supabase
      .from('essay_comments')
      .select('*')
      .eq('essay_id', essayId)
      .eq('checkpoint_id', checkpointId)
      .eq('ai_generated', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get comments for checkpoint: ${error.message}`);
    }

    return comments || [];
  }

  /**
   * Get the latest checkpoint with AI feedback
   */
  static async getLatestAIFeedbackCheckpoint(essayId: string): Promise<string | null> {
    try {
      const { data: checkpoint, error } = await supabase
        .from('essay_checkpoints')
        .select('id')
        .eq('essay_id', essayId)
        .eq('has_ai_feedback', true)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      if (error || !checkpoint) {
        return null;
      }

      return checkpoint.id;
    } catch (error) {
      console.error('Error getting latest AI feedback checkpoint:', error);
      return null;
    }
  }

  /**
   * Get the previous checkpoint with AI feedback
   */
  static async getPreviousAIFeedbackCheckpoint(essayId: string, currentCheckpointId: string): Promise<string | null> {
    try {
      // Get current checkpoint version number
      const { data: currentCheckpoint, error: currentError } = await supabase
        .from('essay_checkpoints')
        .select('version_number')
        .eq('id', currentCheckpointId)
        .single();

      if (currentError || !currentCheckpoint) {
        return null;
      }

      // Get previous checkpoint
      const { data: previousCheckpoint, error: previousError } = await supabase
        .from('essay_checkpoints')
        .select('id')
        .eq('essay_id', essayId)
        .eq('has_ai_feedback', true)
        .lt('version_number', currentCheckpoint.version_number)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      if (previousError || !previousCheckpoint) {
        return null;
      }

      return previousCheckpoint.id;
    } catch (error) {
      console.error('Error getting previous AI feedback checkpoint:', error);
      return null;
    }
  }
}
