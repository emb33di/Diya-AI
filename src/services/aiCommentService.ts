import { supabase } from '@/integrations/supabase/client';
import { EssayVersionService } from './essayVersionService';
import { EssayParagraph, AIInput, AICommentOutput, ContextualAICommentResponse } from '@/types/contextualAnchoring';

export interface AICommentRequest {
  essayId: string;
  essayContent: string;
  essayPrompt?: string;
  essayTitle?: string;
  userId: string;
}

export interface AICommentResponse {
  success: boolean;
  comments: Array<{
    textSelection: {
      start: { pos: number; path: number[] };
      end: { pos: number; path: number[] };
    };
    anchorText: string;
    commentText: string;
    commentType: 'suggestion' | 'critique' | 'praise' | 'question';
    confidenceScore: number;
    agentType?: 'big-picture' | 'paragraph';
  }>;
  message: string;
  essayId: string;
  checkpoint?: any; // The checkpoint created by the orchestrator
  agentResults?: {
    bigPicture: {
      success: boolean;
      comments: Array<{
        textSelection: {
          start: { pos: number; path: number[] };
          end: { pos: number; path: number[] };
        };
        anchorText: string;
        commentText: string;
        commentType: 'suggestion' | 'critique' | 'praise' | 'question';
        confidenceScore: number;
        agentType: 'big-picture';
      }>;
      agentType: 'big-picture';
      error?: string;
    };
    paragraph: {
      success: boolean;
      comments: Array<{
        textSelection: {
          start: { pos: number; path: number[] };
          end: { pos: number; path: number[] };
        };
        anchorText: string;
        commentText: string;
        commentType: 'suggestion' | 'critique' | 'praise' | 'question';
        confidenceScore: number;
        agentType: 'paragraph';
      }>;
      agentType: 'paragraph';
      error?: string;
    };
  };
}

export class AICommentService {
  /**
   * Check if AI comments already exist for an essay
   */
  static async hasExistingAIComments(essayId: string): Promise<boolean> {
    try {
      const { data: comments, error } = await supabase
        .from('essay_comments')
        .select('id')
        .eq('essay_id', essayId)
        .eq('ai_generated', true)
        .limit(1);

      if (error) {
        console.error('Error checking existing AI comments:', error);
        return false;
      }

      return comments && comments.length > 0;
    } catch (error) {
      console.error('Error checking existing AI comments:', error);
      return false;
    }
  }

  /**
   * Generate AI comments for an essay using the Multi-Agent Orchestrator
   */
  static async generateAIComments(request: AICommentRequest): Promise<AICommentResponse> {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the Multi-Agent Orchestrator (includes change detection for version 2+)
      const { data, error } = await supabase.functions.invoke('generate-essay-comments-orchestrator', {
        body: {
          essayId: request.essayId,
          essayContent: request.essayContent,
          essayPrompt: request.essayPrompt,
          essayTitle: request.essayTitle,
          userId: request.userId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data as AICommentResponse;
    } catch (error) {
      console.error('Error generating AI comments:', error);
      throw new Error(`Failed to generate AI comments: ${error.message}`);
    }
  }

  /**
   * Generate AI comments using the legacy single agent (for backward compatibility)
   */
  static async generateLegacyAIComments(request: AICommentRequest): Promise<AICommentResponse> {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the legacy Big Picture Agent Edge Function
      const { data, error } = await supabase.functions.invoke('generate-essay-comments', {
        body: {
          essayId: request.essayId,
          essayContent: request.essayContent,
          essayPrompt: request.essayPrompt,
          userId: request.userId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data as AICommentResponse;
    } catch (error) {
      console.error('Error generating legacy AI comments:', error);
      throw new Error(`Failed to generate legacy AI comments: ${error.message}`);
    }
  }

  /**
   * Generate AI comments and automatically save them to the database
   * The Edge Function handles the saving, so this just calls the generation
   */
  static async generateAndSaveAIComments(
    essayId: string,
    essayContent: string,
    essayPrompt?: string,
    essayTitle?: string
  ): Promise<AICommentResponse> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    return this.generateAIComments({
      essayId,
      essayContent,
      essayPrompt,
      essayTitle,
      userId: user.id
    });
  }

  /**
   * Generate AI comments for a new version (creates new version)
   */
  static async generateAICommentsForFreshDraft(
    essayId: string,
    essayContent: string,
    essayPrompt?: string,
    essayTitle?: string
  ): Promise<AICommentResponse> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First, create a new version checkpoint
    await EssayVersionService.createFreshDraft({
      essayId,
      essayContent,
      essayTitle,
      essayPrompt,
      versionName: 'New Version'
    });

    // Then generate AI comments (this will create another checkpoint with AI feedback)
    return this.generateAIComments({
      essayId,
      essayContent,
      essayPrompt,
      essayTitle,
      userId: user.id
    });
  }

  /**
   * Check if an essay has any versions with AI feedback
   */
  static async hasAIFeedbackVersions(essayId: string): Promise<boolean> {
    try {
      const latestAIFeedbackVersion = await EssayVersionService.getLatestAIFeedbackVersion(essayId);
      return latestAIFeedbackVersion !== null;
    } catch (error) {
      console.error('Error checking AI feedback versions:', error);
      return false;
    }
  }

  /**
   * Check if AI comment generation is available
   */
  static async isAIAvailable(): Promise<boolean> {
    try {
      // Simple health check - try to call the function with minimal data
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return false;
      }

      // We could add a simple health check endpoint, but for now just check auth
      return true;
    } catch (error) {
      console.error('AI service not available:', error);
      return false;
    }
  }

  /**
   * Filter comments by agent type
   */
  static filterCommentsByAgent(comments: AICommentResponse['comments'], agentType: 'big-picture' | 'paragraph'): AICommentResponse['comments'] {
    return comments.filter(comment => comment.agentType === agentType);
  }

  /**
   * Get agent-specific feedback summary
   */
  static getAgentSummary(response: AICommentResponse): {
    totalComments: number;
    bigPictureComments: number;
    paragraphComments: number;
    bigPictureSuccess: boolean;
    paragraphSuccess: boolean;
    errors: string[];
  } {
    const bigPictureComments = this.filterCommentsByAgent(response.comments, 'big-picture').length;
    const paragraphComments = this.filterCommentsByAgent(response.comments, 'paragraph').length;
    
    const errors: string[] = [];
    let bigPictureSuccess = true;
    let paragraphSuccess = true;

    if (response.agentResults) {
      if (!response.agentResults.bigPicture.success && response.agentResults.bigPicture.error) {
        bigPictureSuccess = false;
        errors.push(`Big Picture Agent: ${response.agentResults.bigPicture.error}`);
      }
      if (!response.agentResults.paragraph.success && response.agentResults.paragraph.error) {
        paragraphSuccess = false;
        errors.push(`Paragraph Agent: ${response.agentResults.paragraph.error}`);
      }
    }

    return {
      totalComments: response.comments.length,
      bigPictureComments,
      paragraphComments,
      bigPictureSuccess,
      paragraphSuccess,
      errors
    };
  }

  /**
   * List all checkpoints for an essay
   */
  static async listCheckpoints(essayId: string): Promise<any[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-essay-checkpoints', {
        body: {
          action: 'list',
          essayId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data.checkpoints || [];
    } catch (error) {
      console.error('Error listing checkpoints:', error);
      throw new Error(`Failed to list checkpoints: ${error.message}`);
    }
  }

  /**
   * Get a specific checkpoint with its comments
   */
  static async getCheckpoint(essayId: string, checkpointId?: string, checkpointNumber?: number): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-essay-checkpoints', {
        body: {
          action: 'get',
          essayId,
          checkpointId,
          checkpointNumber
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting checkpoint:', error);
      throw new Error(`Failed to get checkpoint: ${error.message}`);
    }
  }

  /**
   * Compare two checkpoints
   */
  static async compareCheckpoints(essayId: string, checkpointId?: string, checkpointNumber?: number): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-essay-checkpoints', {
        body: {
          action: 'compare',
          essayId,
          checkpointId,
          checkpointNumber
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error comparing checkpoints:', error);
      throw new Error(`Failed to compare checkpoints: ${error.message}`);
    }
  }

  /**
   * Restore a checkpoint (set it as active and update essay content)
   */
  static async restoreCheckpoint(essayId: string, checkpointId?: string, checkpointNumber?: number): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('manage-essay-checkpoints', {
        body: {
          action: 'restore',
          essayId,
          checkpointId,
          checkpointNumber
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error restoring checkpoint:', error);
      throw new Error(`Failed to restore checkpoint: ${error.message}`);
    }
  }

  /**
   * Generate AI comments with paragraph change detection
   * Uses the new change detection system to avoid re-analyzing unchanged paragraphs
   */
  static async generateCommentsWithChangeDetection(request: AICommentRequest): Promise<AICommentResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('generate-essay-comments-paragraph-with-change-detection', {
        body: {
          essayId: request.essayId,
          essayContent: request.essayContent,
          essayPrompt: request.essayPrompt,
          userId: request.userId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error generating comments with change detection:', error);
      throw new Error(`Failed to generate comments: ${error.message}`);
    }
  }

  /**
   * NEW: Generate AI comments using the Contextual Anchoring system
   * This method uses paragraph IDs for robust comment positioning
   */
  static async generateContextualAIComments(
    essayId: string,
    essayContent: string,
    essayPrompt?: string,
    essayTitle?: string
  ): Promise<ContextualAICommentResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Parse the essay content into structured paragraphs with IDs
      const paragraphs = this.parseEssayIntoParagraphs(essayContent);
      
      // Create the structured input for the AI
      const aiInput: AIInput = {
        documentId: essayId,
        content: paragraphs
      };

      // Call the new contextual anchoring edge function
      const { data, error } = await supabase.functions.invoke('generate-essay-comments-contextual', {
        body: {
          essayId,
          essayContent: aiInput,
          essayPrompt,
          essayTitle,
          userId: session.user.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data as ContextualAICommentResponse;
    } catch (error) {
      console.error('Error generating contextual AI comments:', error);
      throw new Error(`Failed to generate contextual AI comments: ${error.message}`);
    }
  }

  /**
   * Parse essay content into structured paragraphs with unique IDs
   * This is the pre-processing step that creates paragraph IDs
   */
  static parseEssayIntoParagraphs(essayContent: string): EssayParagraph[] {
    try {
      // Remove HTML tags and split into paragraphs
      const textContent = essayContent.replace(/<[^>]*>/g, '');
      
      // Split by double newlines or paragraph breaks
      const rawParagraphs = textContent
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      // Generate unique IDs for each paragraph
      const paragraphs: EssayParagraph[] = rawParagraphs.map((text, index) => ({
        paragraphId: `para_${Date.now()}_${index}`,
        text: text
      }));

      console.log(`Parsed essay into ${paragraphs.length} paragraphs with IDs:`, 
        paragraphs.map(p => ({ id: p.paragraphId, preview: p.text.substring(0, 50) + '...' })));

      return paragraphs;
    } catch (error) {
      console.error('Error parsing essay into paragraphs:', error);
      throw new Error('Failed to parse essay content into structured paragraphs');
    }
  }

  /**
   * Validate AI comment output to ensure it conforms to the expected structure
   */
  static validateAICommentOutput(comments: any[]): AICommentOutput[] {
    try {
      if (!Array.isArray(comments)) {
        throw new Error('AI response must be an array of comments');
      }

      return comments.map((comment, index) => {
        // Validate required fields
        if (!comment.comment || typeof comment.comment !== 'string') {
          throw new Error(`Comment ${index}: missing or invalid 'comment' field`);
        }
        if (!comment.paragraphId || typeof comment.paragraphId !== 'string') {
          throw new Error(`Comment ${index}: missing or invalid 'paragraphId' field`);
        }
        if (!comment.anchorText || typeof comment.anchorText !== 'string') {
          throw new Error(`Comment ${index}: missing or invalid 'anchorText' field`);
        }

        // Validate comment type
        const validTypes = ['suggestion', 'critique', 'praise', 'question'];
        if (!validTypes.includes(comment.commentType)) {
          throw new Error(`Comment ${index}: invalid commentType '${comment.commentType}'`);
        }

        // Validate confidence score
        if (typeof comment.confidenceScore !== 'number' || 
            comment.confidenceScore < 0 || comment.confidenceScore > 1) {
          throw new Error(`Comment ${index}: invalid confidenceScore '${comment.confidenceScore}'`);
        }

        return {
          comment: comment.comment,
          paragraphId: comment.paragraphId,
          anchorText: comment.anchorText,
          commentType: comment.commentType,
          confidenceScore: comment.confidenceScore,
          commentCategory: comment.commentCategory || 'inline',
          commentSubcategory: comment.commentSubcategory || 'paragraph-specific',
          agentType: comment.agentType
        } as AICommentOutput;
      });
    } catch (error) {
      console.error('Error validating AI comment output:', error);
      throw new Error(`AI comment validation failed: ${error.message}`);
    }
  }

  /**
   * Validate anchor text against current essay content
   */
  static async validateAnchorText(commentId: string, essayContent: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      const { data: comment, error: fetchError } = await supabase
        .from('essay_comments')
        .select('*')
        .eq('id', commentId)
        .single();

      if (fetchError || !comment) {
        return { isValid: false, error: 'Comment not found' };
      }

      const anchorText = comment.anchor_text;
      if (!anchorText) {
        return { isValid: false, error: 'No anchor text to validate' };
      }

      // Check if anchor text exists in essay content (case-insensitive)
      const isValid = essayContent.toLowerCase().includes(anchorText.toLowerCase());
      
      // Update validation status in database
      await supabase
        .from('essay_comments')
        .update({
          anchor_text_validated: isValid,
          anchor_text_validation_error: isValid ? null : 'Anchor text not found in current essay content'
        })
        .eq('id', commentId);

      return {
        isValid,
        error: isValid ? undefined : 'Anchor text not found in current essay content'
      };
    } catch (error) {
      console.error('Error validating anchor text:', error);
      return { isValid: false, error: 'Validation failed' };
    }
  }

  /**
   * Detect and mark duplicate comments
   */
  static async detectDuplicates(essayId: string): Promise<{
    duplicatesFound: number;
    duplicatesMarked: number;
  }> {
    try {
      // Get all comments for the essay
      const { data: comments, error } = await supabase
        .from('essay_comments')
        .select('*')
        .eq('essay_id', essayId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      let duplicatesMarked = 0;
      const seenComments = new Map<string, string>(); // text -> first comment ID

      for (const comment of comments) {
        const commentKey = `${comment.comment_text}_${comment.comment_type}_${comment.anchor_text}`;
        
        if (seenComments.has(commentKey)) {
          // This is a duplicate
          const originalId = seenComments.get(commentKey)!;
          
          await supabase
            .from('essay_comments')
            .update({
              is_duplicate: true,
              duplicate_of_comment_id: originalId,
              comment_priority: Math.max(1, comment.comment_priority - 2)
            })
            .eq('id', comment.id);
          
          duplicatesMarked++;
        } else {
          seenComments.set(commentKey, comment.id);
        }
      }

      return {
        duplicatesFound: seenComments.size,
        duplicatesMarked
      };
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      return { duplicatesFound: 0, duplicatesMarked: 0 };
    }
  }

  /**
   * Get high-priority comments for an essay
   */
  static async getHighPriorityComments(essayId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data: comments, error } = await supabase
        .from('essay_comments')
        .select('*')
        .eq('essay_id', essayId)
        .eq('resolved', false)
        .eq('is_duplicate', false)
        .gte('comment_priority', 7)
        .order('comment_priority', { ascending: false })
        .order('confidence_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return comments || [];
    } catch (error) {
      console.error('Error fetching high-priority comments:', error);
      return [];
    }
  }

  /**
   * Create a fallback comment when AI fails
   */
  static async createFallbackComment(
    essayId: string,
    userId: string,
    paragraphIndex: number,
    reason: string,
    anchorText: string,
    textSelection: any
  ): Promise<any> {
    try {
      const fallbackComment = {
        essay_id: essayId,
        user_id: userId,
        comment_text: "This section could benefit from additional analysis. Consider reviewing the structure, flow, and clarity of your argument.",
        comment_type: 'suggestion',
        comment_category: 'inline',
        comment_subcategory: 'paragraph-specific',
        agent_type: 'paragraph',
        confidence_score: 0.6,
        anchor_text: anchorText,
        text_selection: textSelection,
        paragraph_index: paragraphIndex,
        generation_method: 'fallback',
        is_fallback_comment: true,
        fallback_reason: reason,
        comment_priority: 3, // Lower priority for fallback comments
        ai_generated: true,
        ai_model_version: 'fallback-v1.0'
      };

      const { data: comment, error } = await supabase
        .from('essay_comments')
        .insert(fallbackComment)
        .select()
        .single();

      if (error) throw error;
      return comment;
    } catch (error) {
      console.error('Error creating fallback comment:', error);
      throw error;
    }
  }

  /**
   * Update comment with generation context
   */
  static async updateCommentGenerationContext(
    commentId: string,
    context: {
      modelVersion?: string;
      promptHash?: string;
      generationContext?: any;
      retryCount?: number;
      error?: string;
    }
  ): Promise<void> {
    try {
      const updateData: any = {};
      
      if (context.modelVersion) updateData.ai_model_version = context.modelVersion;
      if (context.promptHash) updateData.prompt_hash = context.promptHash;
      if (context.generationContext) updateData.generation_context = context.generationContext;
      if (context.retryCount !== undefined) updateData.retry_count = context.retryCount;
      if (context.error) updateData.generation_error = context.error;

      const { error } = await supabase
        .from('essay_comments')
        .update(updateData)
        .eq('id', commentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating comment generation context:', error);
      throw error;
    }
  }

  /**
   * Clean up old duplicate comments
   */
  static async cleanupOldDuplicates(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_duplicate_comments');
      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error cleaning up old duplicates:', error);
      return 0;
    }
  }

  /**
   * Validate all anchor texts for an essay
   */
  static async validateEssayAnchorTexts(essayId: string): Promise<Array<{
    commentId: string;
    anchorText: string;
    isValid: boolean;
    validationError?: string;
  }>> {
    try {
      const { data, error } = await supabase.rpc('validate_essay_anchor_texts', {
        essay_uuid: essayId
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error validating essay anchor texts:', error);
      return [];
    }
  }

  /**
   * Enhanced comment creation with validation
   */
  static async createCommentWithValidation(commentData: any): Promise<any> {
    try {
      // Calculate priority before insertion
      let priority = 5; // Default
      
      if (commentData.confidence_score && commentData.confidence_score >= 0.8) {
        priority += 2;
      } else if (commentData.confidence_score && commentData.confidence_score >= 0.6) {
        priority += 1;
      }
      
      if (commentData.comment_subcategory === 'opening-sentence') {
        priority += 2;
      } else if (commentData.comment_subcategory === 'transition') {
        priority += 1;
      }
      
      if (commentData.is_fallback_comment) {
        priority -= 3;
      }
      
      priority = Math.max(1, Math.min(10, priority));
      
      const enhancedCommentData = {
        ...commentData,
        comment_priority: priority,
        generation_timestamp: new Date().toISOString(),
        anchor_text_validated: false // Will be validated later
      };

      const { data: comment, error } = await supabase
        .from('essay_comments')
        .insert(enhancedCommentData)
        .select()
        .single();

      if (error) throw error;
      
      // Trigger duplicate detection
      await this.detectDuplicates(comment.essay_id);
      
      return comment;
    } catch (error) {
      console.error('Error creating comment with validation:', error);
      throw error;
    }
  }
}
