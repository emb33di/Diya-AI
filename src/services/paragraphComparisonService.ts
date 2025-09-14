import { supabase } from '@/integrations/supabase/client';

export interface ParagraphComparisonResult {
  changed: number[];
  unchanged: number[];
  totalCurrent: number;
  totalPrevious: number;
}

export interface UnchangedParagraphInfo {
  paragraphIndex: number;
  paragraphText: string;
  hasExistingComments: boolean;
  commentCount: number;
}

export class ParagraphComparisonService {
  /**
   * Generate paragraph hashes for an essay content
   * Uses the same logic as the AI functions to ensure consistency
   */
  static generateParagraphHashes(essayContent: string): string[] {
    // Use the same paragraph splitting logic as the AI functions
    const processedContent = essayContent
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n') // Convert </p><p> to double line breaks
      .replace(/<p[^>]*>/gi, '') // Remove opening <p> tags
      .replace(/<\/p>/gi, '') // Remove closing </p> tags
      .replace(/<br\s*\/?>/gi, '\n') // Convert <br> tags to newlines
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/&nbsp;/g, ' ') // Convert non-breaking spaces
      .replace(/&amp;/g, '&') // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    // Split by double line breaks (consistent separator)
    const paragraphs = processedContent
      .split(/\n\s*\n/) // Split on double newlines with optional whitespace
      .map(p => p.trim()) // Remove leading/trailing whitespace
      .filter(p => p.length > 0); // Remove empty paragraphs

    // If no paragraphs found, treat entire content as one paragraph
    if (paragraphs.length === 0 && processedContent.length > 0) {
      paragraphs.push(processedContent);
    }

    // Generate SHA-256 hashes for each paragraph
    return paragraphs.map(paragraph => {
      // Simple hash function for client-side (in production, use crypto.subtle.digest)
      return this.simpleHash(paragraph);
    });
  }

  /**
   * Simple hash function for client-side use
   * In production, this should use crypto.subtle.digest for SHA-256
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Compare paragraphs between two essay versions
   */
  static compareParagraphs(currentHashes: string[], previousHashes: string[]): ParagraphComparisonResult {
    const changed: number[] = [];
    const unchanged: number[] = [];

    for (let i = 0; i < currentHashes.length; i++) {
      const currentHash = currentHashes[i];
      const previousHash = previousHashes[i] || null;

      if (previousHash === null || currentHash !== previousHash) {
        changed.push(i);
      } else {
        unchanged.push(i);
      }
    }

    return {
      changed,
      unchanged,
      totalCurrent: currentHashes.length,
      totalPrevious: previousHashes.length
    };
  }

  /**
   * Update paragraph tracking for a checkpoint
   */
  static async updateCheckpointParagraphTracking(checkpointId: string): Promise<void> {
    const { error } = await supabase.rpc('update_checkpoint_paragraph_tracking', {
      checkpoint_uuid: checkpointId
    });

    if (error) {
      throw new Error(`Failed to update paragraph tracking: ${error.message}`);
    }
  }

  /**
   * Get paragraph comparison data for a checkpoint
   */
  static async getParagraphComparison(checkpointId: string): Promise<ParagraphComparisonResult | null> {
    const { data, error } = await supabase
      .from('essay_checkpoints')
      .select('paragraph_changes')
      .eq('id', checkpointId)
      .single();

    if (error) {
      throw new Error(`Failed to get paragraph comparison: ${error.message}`);
    }

    return data?.paragraph_changes || null;
  }

  /**
   * Get unchanged paragraphs that have existing comments
   */
  static async getUnchangedParagraphsWithComments(
    essayId: string, 
    checkpointId: string
  ): Promise<UnchangedParagraphInfo[]> {
    const { data, error } = await supabase.rpc('get_unchanged_paragraphs_with_comments', {
      essay_uuid: essayId,
      checkpoint_uuid: checkpointId
    });

    if (error) {
      throw new Error(`Failed to get unchanged paragraphs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Check if a specific paragraph has changed between versions
   */
  static async hasParagraphChanged(
    essayId: string,
    checkpointId: string,
    paragraphIndex: number
  ): Promise<boolean> {
    const comparison = await this.getParagraphComparison(checkpointId);
    
    if (!comparison) {
      return true; // If no comparison data, assume changed
    }

    return comparison.changed.includes(paragraphIndex);
  }

  /**
   * Get the appropriate feedback message for unchanged paragraphs
   */
  static getUnchangedParagraphMessage(hasExistingComments: boolean, commentCount: number): string {
    if (hasExistingComments) {
      return `It does not look like there was any change made to this paragraph. See older comments for further guidance. (${commentCount} previous comment${commentCount !== 1 ? 's' : ''} available)`;
    } else {
      return `It does not look like there was any change made to this paragraph. Consider revising this section to address the essay prompt more effectively.`;
    }
  }

  /**
   * Generate paragraph-specific feedback based on change detection
   */
  static async generateParagraphFeedback(
    essayId: string,
    checkpointId: string,
    paragraphIndex: number,
    paragraphText: string
  ): Promise<{
    shouldSkipAI: boolean;
    feedbackMessage?: string;
    existingCommentCount?: number;
  }> {
    const comparison = await this.getParagraphComparison(checkpointId);
    
    if (!comparison) {
      return { shouldSkipAI: false };
    }

    const isUnchanged = comparison.unchanged.includes(paragraphIndex);
    
    if (isUnchanged) {
      // Get existing comment count for this paragraph
      const { data: comments, error } = await supabase
        .from('essay_comments')
        .select('id')
        .eq('essay_id', essayId)
        .eq('checkpoint_id', checkpointId)
        .eq('paragraph_index', paragraphIndex)
        .eq('ai_generated', true);

      if (error) {
        console.error('Error fetching existing comments:', error);
        return { shouldSkipAI: false };
      }

      const commentCount = comments?.length || 0;
      const hasExistingComments = commentCount > 0;

      return {
        shouldSkipAI: true,
        feedbackMessage: this.getUnchangedParagraphMessage(hasExistingComments, commentCount),
        existingCommentCount: commentCount
      };
    }

    return { shouldSkipAI: false };
  }
}
