import { supabase } from "@/integrations/supabase/client";

export interface ConversationResumeResponse {
  success: boolean;
  context?: string;
  session_count: number;
  conversations?: any[];
  message?: string;
}

export class ConversationResumeService {
  /**
   * Generate conversation resume context using Supabase Edge Function
   */
  static async generateConversationResumeContext(userId: string): Promise<ConversationResumeResponse> {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('generate-conversation-resume-context', {
        body: {
          user_id: userId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return data as ConversationResumeResponse;
    } catch (error) {
      console.error('Error generating conversation resume context:', error);
      throw new Error(`Failed to generate conversation resume context: ${error.message}`);
    }
  }
}
