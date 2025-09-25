import { supabase } from "@/integrations/supabase/client";

export interface ProfileData {
  academic_interests: string[];
  extracurricular_activities: string[];
  achievements: string[];
  challenges_overcome: string[];
  personal_values: string[];
  career_goals: string[];
  leadership_experience: string[];
  community_involvement: string[];
  hobbies: string[];
  personality_traits: string[];
}

export interface ProfileExtractionResponse {
  success: boolean;
  message: string;
  conversation_id: string;
  user_id: string;
  profile_data?: ProfileData;
}

export class ProfileExtractionService {
  /**
   * Extract profile from conversation using Supabase Edge Function
   */
  static async extractProfileFromConversation(
    conversationId: string,
    userId: string
  ): Promise<ProfileExtractionResponse> {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('extract-profile-from-conversation', {
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

      return data as ProfileExtractionResponse;
    } catch (error) {
      console.error('Error extracting profile from conversation:', error);
      throw new Error(`Failed to extract profile from conversation: ${error.message}`);
    }
  }
}
