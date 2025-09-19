/**
 * Context Optimization Utilities for Multi-Agent System
 * Prevents API overload by managing context size and relevance
 */

export interface SemanticComment {
  id?: string;
  comment: string;
  agent_type: string;
  comment_nature?: string;
  confidence_score?: number;
}

export interface OptimizedContext {
  summary: string;
  tokenCount: number;
  truncated: boolean;
}

export class ContextOptimizer {
  // Token estimation (rough approximation: 1 token ≈ 4 characters)
  private static readonly CHARS_PER_TOKEN = 4;
  
  // Token limits for different content types
  private static readonly TOKEN_LIMITS = {
    essay: 1500,        // ~6000 chars
    prompt: 300,        // ~1200 chars  
    context: 800,       // ~3200 chars
    total: 3000,        // ~12000 chars total
    maxOutputTokens: 1024 // Match Gemini config
  };

  /**
   * Estimate token count from text length
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Truncate text to fit within token limit
   */
  static truncateToTokens(text: string, maxTokens: number): string {
    const currentTokens = this.estimateTokens(text);
    if (currentTokens <= maxTokens) return text;
    
    const ratio = maxTokens / currentTokens;
    const truncateLength = Math.floor(text.length * ratio * 0.95); // 5% buffer
    
    // Try to truncate at sentence boundary
    const truncated = text.substring(0, truncateLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > truncateLength * 0.8) {
      return truncated.substring(0, lastSentence + 1) + "\n\n[Content truncated for length]";
    }
    
    return truncated + "...\n\n[Content truncated for length]";
  }

  /**
   * Summarize comments from previous agents into condensed context
   */
  static summarizeComments(comments: SemanticComment[], maxTokens: number = 400): OptimizedContext {
    if (!comments || comments.length === 0) {
      return {
        summary: "No previous agent context available",
        tokenCount: 0,
        truncated: false
      };
    }

    // Group comments by agent type and nature
    const grouped = this.groupCommentsByType(comments);
    
    // Create condensed summary
    const summaryParts: string[] = [];
    
    Object.entries(grouped).forEach(([agentType, commentList]) => {
      const keyPoints = commentList
        .slice(0, 2) // Max 2 points per agent type
        .map(c => this.extractKeyPoint(c.comment))
        .filter(point => point.length > 0);
      
      if (keyPoints.length > 0) {
        summaryParts.push(`${agentType.toUpperCase()}: ${keyPoints.join('; ')}`);
      }
    });

    let summary = summaryParts.join('\n');
    const tokenCount = this.estimateTokens(summary);
    let truncated = false;

    // If still too long, truncate
    if (tokenCount > maxTokens) {
      summary = this.truncateToTokens(summary, maxTokens);
      truncated = true;
    }

    return {
      summary,
      tokenCount: this.estimateTokens(summary),
      truncated
    };
  }

  /**
   * Group comments by agent type for better organization
   */
  private static groupCommentsByType(comments: SemanticComment[]): Record<string, SemanticComment[]> {
    const grouped: Record<string, SemanticComment[]> = {};
    
    comments.forEach(comment => {
      const type = comment.agent_type || 'unknown';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(comment);
    });
    
    return grouped;
  }

  /**
   * Extract the key point from a comment (first 50 chars of meaningful content)
   */
  private static extractKeyPoint(comment: string): string {
    if (!comment) return '';
    
    // Remove common prefixes and get to the point
    let cleaned = comment
      .replace(/^(You should|Consider|Try to|The essay|This paragraph)/i, '')
      .replace(/^[,.\s]+/, '')
      .trim();
    
    // Take first sentence or 50 characters, whichever is shorter
    const firstSentence = cleaned.split('.')[0];
    if (firstSentence.length <= 50) {
      return firstSentence;
    }
    
    return cleaned.substring(0, 50).trim() + '...';
  }

  /**
   * Create agent-specific context that only includes relevant information
   */
  static createAgentSpecificContext(
    comments: SemanticComment[], 
    targetAgent: string,
    maxTokens: number = 600
  ): OptimizedContext {
    
    const relevanceMap: Record<string, string[]> = {
      'tone': ['weaknesses', 'strengths'], // Tone needs overall context
      'clarity': ['weaknesses'], // Clarity only needs areas to avoid
      'big-picture': ['weaknesses', 'strengths', 'tone', 'clarity'], // Big picture needs everything
      'grammar_spelling': [], // Grammar works independently
    };

    const relevantTypes = relevanceMap[targetAgent] || [];
    
    if (relevantTypes.length === 0) {
      return {
        summary: `No context needed for ${targetAgent} agent`,
        tokenCount: 0,
        truncated: false
      };
    }

    // Filter comments to only relevant types
    const relevantComments = comments.filter(c => 
      relevantTypes.includes(c.agent_type)
    );

    return this.summarizeComments(relevantComments, maxTokens);
  }

  /**
   * Optimize entire prompt to fit within token budget
   */
  static optimizePromptForAgent(
    essay: string,
    prompt: string,
    context: string,
    agentType: string
  ): {
    essay: string;
    prompt: string;
    context: string;
    totalTokens: number;
    optimized: boolean;
  } {
    
    const tokens = {
      essay: this.estimateTokens(essay),
      prompt: this.estimateTokens(prompt),
      context: this.estimateTokens(context)
    };

    const totalTokens = tokens.essay + tokens.prompt + tokens.context;
    
    // If within budget, return as-is
    if (totalTokens <= this.TOKEN_LIMITS.total) {
      return {
        essay,
        prompt,
        context,
        totalTokens,
        optimized: false
      };
    }

    console.log(`⚠️ Optimizing prompt for ${agentType}: ${totalTokens} tokens > ${this.TOKEN_LIMITS.total} limit`);

    // Prioritize: Essay content > Context > Prompt
    let optimizedEssay = essay;
    let optimizedContext = context;
    let optimizedPrompt = prompt;

    // First, optimize context
    if (tokens.context > this.TOKEN_LIMITS.context) {
      optimizedContext = this.truncateToTokens(context, this.TOKEN_LIMITS.context);
    }

    // Then, optimize essay if needed
    const remainingBudget = this.TOKEN_LIMITS.total - this.estimateTokens(optimizedPrompt) - this.estimateTokens(optimizedContext);
    if (tokens.essay > remainingBudget) {
      optimizedEssay = this.truncateToTokens(essay, remainingBudget);
    }

    const finalTokens = this.estimateTokens(optimizedEssay) + 
                       this.estimateTokens(optimizedPrompt) + 
                       this.estimateTokens(optimizedContext);

    console.log(`✅ Optimized prompt for ${agentType}: ${finalTokens} tokens (${totalTokens} → ${finalTokens})`);

    return {
      essay: optimizedEssay,
      prompt: optimizedPrompt,
      context: optimizedContext,
      totalTokens: finalTokens,
      optimized: true
    };
  }

  /**
   * Get token budget status for monitoring
   */
  static getTokenBudgetStatus(essay: string, prompt: string, context: string): {
    usage: Record<string, number>;
    total: number;
    withinBudget: boolean;
    recommendations: string[];
  } {
    const usage = {
      essay: this.estimateTokens(essay),
      prompt: this.estimateTokens(prompt),
      context: this.estimateTokens(context)
    };

    const total = usage.essay + usage.prompt + usage.context;
    const withinBudget = total <= this.TOKEN_LIMITS.total;
    
    const recommendations: string[] = [];
    
    if (usage.essay > this.TOKEN_LIMITS.essay) {
      recommendations.push(`Essay too long (${usage.essay}/${this.TOKEN_LIMITS.essay} tokens)`);
    }
    
    if (usage.context > this.TOKEN_LIMITS.context) {
      recommendations.push(`Context too long (${usage.context}/${this.TOKEN_LIMITS.context} tokens)`);
    }
    
    if (!withinBudget) {
      recommendations.push(`Total exceeds budget (${total}/${this.TOKEN_LIMITS.total} tokens)`);
    }

    return {
      usage,
      total,
      withinBudget,
      recommendations
    };
  }
}

/**
 * Retry mechanism with exponential backoff for API calls
 */
export class APIRetryManager {
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly BASE_DELAY = 1000; // 1 second
  private static readonly MAX_DELAY = 30000; // 30 seconds

  static async withRetry<T>(
    apiCall: () => Promise<T>,
    agentType: string = 'unknown',
    maxRetries: number = this.DEFAULT_RETRIES
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 ${agentType} agent attempt ${attempt}/${maxRetries}`);
        const result = await apiCall();
        
        if (attempt > 1) {
          console.log(`✅ ${agentType} agent succeeded on attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a retryable error (503, 429, 500)
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || attempt === maxRetries) {
          console.error(`❌ ${agentType} agent failed permanently:`, error.message);
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.BASE_DELAY * Math.pow(2, attempt - 1),
          this.MAX_DELAY
        );
        
        console.warn(`⚠️ ${agentType} agent failed (attempt ${attempt}), retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private static isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    
    // Retryable conditions
    return (
      message.includes('503') ||           // Service unavailable
      message.includes('overloaded') ||    // Model overloaded
      message.includes('429') ||           // Rate limited
      message.includes('500') ||           // Internal server error
      message.includes('timeout') ||       // Timeout
      message.includes('network')          // Network error
    );
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
