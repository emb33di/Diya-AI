import { supabase } from "@/integrations/supabase/client";
import { getAuthenticatedUser } from '@/utils/authHelper';

export interface BrainstormingSummary {
  key_themes: string[];
  personal_stories: string[];
  essay_angles: string[];
  writing_prompts: string[];
  structure_suggestions: string[];
}

export interface ResumeContextSummary {
  academic_achievements: string[];
  extracurricular_activities: string[];
  leadership_experience: string[];
  community_service: string[];
  work_experience: string[];
  personal_qualities: string[];
  career_interests: string[];
  unique_attributes: string[];
}

export interface ConversationSummaryResponse {
  success: boolean;
  message: string;
  summary?: BrainstormingSummary | ResumeContextSummary;
  conversation_id: string;
  user_id: string;
}

export class ConversationProcessingService {
  /**
   * Generate brainstorming summary using Supabase Edge Function
   */
  static async generateBrainstormingSummary(
    conversationId: string,
    userId: string
  ): Promise<ConversationSummaryResponse> {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('generate-conversation-summary', {
        body: {
          conversation_id: conversationId,
          user_id: userId,
          summary_type: 'brainstorming'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data as ConversationSummaryResponse;
    } catch (error) {
      console.error('Error generating brainstorming summary:', error);
      throw new Error(`Failed to generate brainstorming summary: ${error.message}`);
    }
  }

  /**
   * Generate resume context summary using Supabase Edge Function
   */
  static async generateResumeContextSummary(
    conversationId: string,
    userId: string
  ): Promise<ConversationSummaryResponse> {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('generate-conversation-summary', {
        body: {
          conversation_id: conversationId,
          user_id: userId,
          summary_type: 'resume_context'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data as ConversationSummaryResponse;
    } catch (error) {
      console.error('Error generating resume context summary:', error);
      throw new Error(`Failed to generate resume context summary: ${error.message}`);
    }
  }

  /**
   * Get existing brainstorming summary for a conversation
   */
  static async getBrainstormingSummary(
    conversationId: string,
    userId: string
  ): Promise<BrainstormingSummary | null> {
    try {
      const { data: summary, error } = await supabase
        .from('brainstorming_summaries')
        .select('summary_data')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw new Error(`Failed to fetch brainstorming summary: ${error.message}`);
      }

      return summary?.summary_data as BrainstormingSummary || null;
    } catch (error) {
      console.error('Error fetching brainstorming summary:', error);
      return null;
    }
  }

  /**
   * Get existing resume context summary for a conversation
   */
  static async getResumeContextSummary(
    conversationId: string,
    userId: string
  ): Promise<ResumeContextSummary | null> {
    try {
      const { data: summary, error } = await supabase
        .from('resume_context_summaries')
        .select('summary_data')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw new Error(`Failed to fetch resume context summary: ${error.message}`);
      }

      return summary?.summary_data as ResumeContextSummary || null;
    } catch (error) {
      console.error('Error fetching resume context summary:', error);
      return null;
    }
  }

  /**
   * Test connection to the service
   */
  static async testConnection(): Promise<boolean> {
    try {
      // Test by trying to get the current user
      const user = await getAuthenticatedUser();
      return !!user;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
