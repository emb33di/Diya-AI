import { supabase } from "@/integrations/supabase/client";

export interface SchoolRecommendation {
  school: string;
  school_type: string;
  category: 'reach' | 'target' | 'safety';
  acceptance_rate: string;
  school_ranking: string;
  first_round_deadline: string;
  notes: string;
  student_thesis: string;
}

export interface SchoolRecommendationResponse {
  success: boolean;
  message: string;
  recommendations: SchoolRecommendation[];
  conversation_id: string;
  user_id: string;
}

export interface ConversationTranscriptResponse {
  success: boolean;
  transcript: string;
  conversation_id: string;
  user_id: string;
}

export class SchoolRecommendationService {
  /**
   * Generate school recommendations using Supabase Edge Function
   */
  static async generateSchoolRecommendations(
    conversationId: string,
    userId: string
  ): Promise<SchoolRecommendationResponse> {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('generate-school-recommendations', {
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

      return data as SchoolRecommendationResponse;
    } catch (error) {
      console.error('Error generating school recommendations:', error);
      throw new Error(`Failed to generate school recommendations: ${error.message}`);
    }
  }

  /**
   * Get existing school recommendations for a user
   */
  static async getUserSchoolRecommendations(userId: string): Promise<SchoolRecommendationResponse> {
    try {
      const { data: recommendations, error } = await supabase
        .from('school_recommendations')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch recommendations: ${error.message}`);
      }

      // Transform the data to match the expected format
      const transformedRecommendations: SchoolRecommendation[] = recommendations.map(rec => ({
        school: rec.school,
        school_type: rec.school_type,
        category: rec.category,
        acceptance_rate: rec.acceptance_rate || 'N/A',
        school_ranking: rec.school_ranking || 'N/A',
        first_round_deadline: rec.first_round_deadline || 'TBD',
        notes: rec.notes || '',
        student_thesis: rec.student_thesis || ''
      }));

      return {
        success: true,
        message: `Found ${transformedRecommendations.length} recommendations`,
        recommendations: transformedRecommendations,
        conversation_id: '',
        user_id: userId
      };
    } catch (error) {
      console.error('Error fetching user recommendations:', error);
      return {
        success: false,
        message: `Failed to fetch recommendations: ${error.message}`,
        recommendations: [],
        conversation_id: '',
        user_id: userId
      };
    }
  }

  /**
   * Get conversation transcript
   */
  static async getConversationTranscript(conversationId: string): Promise<ConversationTranscriptResponse> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversation_metadata')
        .select('transcript, user_id')
        .eq('conversation_id', conversationId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch conversation: ${error.message}`);
      }

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      return {
        success: true,
        transcript: conversation.transcript || '',
        conversation_id: conversationId,
        user_id: conversation.user_id
      };
    } catch (error) {
      console.error('Error fetching conversation transcript:', error);
      return {
        success: false,
        transcript: '',
        conversation_id: conversationId,
        user_id: ''
      };
    }
  }

  /**
   * Test connection to the service
   */
  static async testConnection(): Promise<boolean> {
    try {
      // Test by trying to get the current user
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
