import { supabase } from "@/integrations/supabase/client";

export interface BrainstormingSummary {
  key_themes: string[];
  personal_stories: string[];
  essay_angles: string[];
  writing_prompts: string[];
  structure_suggestions: string[];
}

export interface BrainstormingResponse {
  success: boolean;
  summary?: BrainstormingSummary;
  message: string;
  conversation_id: string;
  user_id: string;
}

export class BrainstormingService {
  /**
   * Generate brainstorming summary using Supabase Edge Function
   */
  static async generateBrainstormingSummary(
    conversationId: string,
    userId: string
  ): Promise<BrainstormingResponse> {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('generate-brainstorming-summary', {
        body: {
          conversation_id: conversationId,
          user_id: userId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data as BrainstormingResponse;
    } catch (error) {
      console.error('Error generating brainstorming summary:', error);
      throw new Error(`Failed to generate brainstorming summary: ${error.message}`);
    }
  }
}
