/**
 * AI Agent API Service
 * Handles communication with the backend AI agent for conversation context generation
 */

export interface ConversationContextResponse {
  success: boolean;
  context?: string;
  session_count?: number;
  message?: string;
  conversations?: any[];
}

export class AIAgentAPI {
  /**
   * Get AI-generated conversation context for resuming conversations
   * This method is deprecated - use ConversationProcessingService instead
   */
  static async getConversationResumeContext(userId: string): Promise<ConversationContextResponse> {
    console.warn('AIAgentAPI.getConversationResumeContext is deprecated. Use ConversationProcessingService instead.');
    
    return {
      success: false,
      message: 'This API is deprecated. Please use ConversationProcessingService instead.',
      context: '',
      session_count: 0,
      conversations: []
    };
  }

  /**
   * Check if the AI Agent API is available
   * This method is deprecated - backend API is no longer used
   */
  static async checkAPIHealth(): Promise<boolean> {
    console.warn('AIAgentAPI.checkAPIHealth is deprecated. Backend API is no longer used.');
    return false;
  }

  /**
   * Get conversation context with fallback to local method
   */
  static async getContextWithFallback(userId: string, fallbackContext: any[]): Promise<{
    context: string;
    session_count: number;
    source: 'ai_agent' | 'fallback';
  }> {
    try {
      // Try AI agent first
      const aiResponse = await this.getConversationResumeContext(userId);
      
      if (aiResponse.success && aiResponse.context) {
        console.log('✅ Using AI-generated context');
        return {
          context: aiResponse.context,
          session_count: aiResponse.session_count || 0,
          source: 'ai_agent'
        };
      } else {
        console.log('⚠️ AI agent failed, using fallback context');
        // Fallback to local method
        const contextSummary = fallbackContext
          .map((ctx: any) => {
            const content = ctx.transcript || '';
            return `${ctx.session}: ${content}`;
          })
          .filter(ctx => {
            const parts = ctx.split(': ');
            return parts.length > 1 && parts[1].trim() !== '';
          })
          .join('\n\n');
        
        return {
          context: contextSummary,
          session_count: fallbackContext.length,
          source: 'fallback'
        };
      }
    } catch (error) {
      console.error('❌ Error getting context:', error);
      // Fallback to local method
      const contextSummary = fallbackContext
        .map((ctx: any) => {
          const content = ctx.transcript || '';
          return `${ctx.session}: ${content}`;
        })
        .filter(ctx => {
          const parts = ctx.split(': ');
          return parts.length > 1 && parts[1].trim() !== '';
        })
        .join('\n\n');
      
      return {
        context: contextSummary,
        session_count: fallbackContext.length,
        source: 'fallback'
      };
    }
  }
} 