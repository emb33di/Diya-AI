import { supabase } from '@/integrations/supabase/client';
import { getAuthenticatedUser } from '@/utils/authHelper';
import { OutspeedAPI } from '@/utils/outspeedAPI';
import { ConversationStorage } from '@/utils/conversationStorage';
import { SchoolRecommendationService } from '@/services/schoolRecommendationService';
import { MessagePersistenceService } from '@/services/messagePersistenceService';

export interface UserProfile {
  full_name: string;
  cumulative_onboarding_time: number;
  onboarding_complete: boolean;
  skipped_onboarding: boolean;
}

export interface ConversationTracking {
  conversation_id: string;
  user_id: string;
  conversation_type: string;
  conversation_started_at: string;
  metadata_retrieved: boolean;
  conversation_ended_at?: string;
}

export interface OnboardingApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class OnboardingApiService {
  /**
   * Fetch user profile and initialize Outspeed API
   */
  static async fetchUserProfile(): Promise<OnboardingApiResponse<UserProfile>> {
    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      // Initialize Outspeed API
      OutspeedAPI.initialize(import.meta.env.VITE_SUPABASE_URL);
      
      // Add a small delay to ensure database updates are committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('full_name, cumulative_onboarding_time, onboarding_complete')
        .eq('user_id', user.id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: profile };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get previous session context for conversation continuity
   */
  static async getPreviousSessionContext(): Promise<OnboardingApiResponse<any[]>> {
    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      // Get all previous conversation metadata for this user
      const { data: previousMetadata, error } = await supabase
        .from('conversation_metadata')
        .select('conversation_id, summary, transcript, created_at')
        .eq('user_id', user.id)
        .neq('transcript', '')
        .order('created_at', { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!previousMetadata) {
        return { success: true, data: [] };
      }

      // Map metadata to context format
      const contexts = previousMetadata.map((metadata, index) => {
        const sessionNumber = index + 1;
        return {
          session: `onboarding_${sessionNumber}`,
          summary: metadata.summary || '',
          transcript: metadata.transcript || ''
        };
      });

      const filteredContexts = contexts.filter(ctx => ctx.transcript && ctx.transcript.trim() !== '');
      return { success: true, data: filteredContexts };
    } catch (error) {
      console.error('Error getting previous session context:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get paused conversations to determine next session number
   */
  static async getPausedConversations(): Promise<OnboardingApiResponse<any[]>> {
    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      const { data: pausedConversations, error } = await supabase
        .from('conversation_tracking')
        .select('conversation_type, conversation_id')
        .eq('user_id', user.id)
        .in('conversation_type', ['onboarding_1', 'onboarding_2', 'onboarding_3', 'onboarding_4', 'onboarding_5'])
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: pausedConversations || [] };
    } catch (error) {
      console.error('Error fetching paused conversations:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Save conversation tracking record
   */
  static async saveConversationTracking(data: Omit<ConversationTracking, 'conversation_ended_at'>): Promise<OnboardingApiResponse> {
    try {
      const { error } = await supabase
        .from('conversation_tracking')
        .insert(data);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error saving conversation tracking:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update conversation tracking with end time
   */
  static async updateConversationEndTime(conversationId: string, endTime: string): Promise<OnboardingApiResponse> {
    try {
      const { error } = await supabase
        .from('conversation_tracking')
        .update({ conversation_ended_at: endTime })
        .eq('conversation_id', conversationId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating conversation end time:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update user profile cumulative onboarding time
   */
  static async updateCumulativeOnboardingTime(userId: string, cumulativeTime: number): Promise<OnboardingApiResponse> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ cumulative_onboarding_time: Math.round(cumulativeTime) })
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating cumulative onboarding time:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Process conversation metadata and store it
   */
  static async processConversationMetadata(
    conversationId: string,
    userId: string,
    messages: Array<{
      id?: string;
      source: 'ai' | 'user';
      text: string;
      timestamp: Date;
    }>
  ): Promise<OnboardingApiResponse> {
    try {
      console.log('📝 Processing conversation metadata...');
      
      // Convert local messages to the expected format
      const persistedMessages = messages.map((msg, index) => ({
        id: `local_${index}`,
        conversation_id: conversationId,
        user_id: userId,
        source: msg.source,
        text: msg.text,
        timestamp: msg.timestamp,
        message_order: index + 1,
        created_at: msg.timestamp.toISOString()
      }));

      // Validate the messages
      const validation = MessagePersistenceService.validateMessages(persistedMessages);
      if (!validation.isValid) {
        console.warn('⚠️ Message validation failed:', validation.warnings);
      }

      // Convert messages to transcript format
      const transcript = MessagePersistenceService.messagesToTranscript(persistedMessages);
      
      // Get conversation statistics
      const stats = MessagePersistenceService.getConversationStats(persistedMessages);

      // Create metadata with real transcript data
      const metadata = {
        conversation_id: conversationId,
        user_id: userId,
        summary: `Conversation completed with ${stats.totalMessages} messages (${stats.userMessages} user, ${stats.aiMessages} AI)`,
        transcript: transcript,
        audio_url: null,
        created_at: new Date().toISOString()
      };

      const retrieved = await ConversationStorage.storeProvidedMetadata(metadata);

      // Validate metadata presence
      const stored = await ConversationStorage.getConversationMetadata(conversationId);
      if (stored && (stored.transcript?.trim() || stored.summary?.trim())) {
        console.log('✅ Metadata stored and validated successfully');
        return { success: true };
      } else {
        console.warn('⚠️ Metadata validation failed, but continuing with local data');
        return { success: true }; // Still proceed with local data
      }
    } catch (error) {
      console.error('❌ Error processing conversation metadata:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Extract profile information using enhanced AI agent
   */
  static async extractProfileInformation(conversationId: string, userId: string): Promise<OnboardingApiResponse> {
    try {
      console.log('👤 Extracting profile information from conversation:', conversationId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'No active session found' };
      }

      const profileResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhanced-profile-extraction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          user_id: userId
        })
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.success) {
          console.log('✅ Enhanced profile information extracted successfully');
          
          // Store extraction results in localStorage for profile confirmation page
          localStorage.setItem('ai_extracted_profile', JSON.stringify({
            profile: profileData.extracted_profile,
            school_type: profileData.school_type,
            confidence_score: profileData.confidence_score,
            fields_extracted: profileData.fields_extracted,
            fields_missing: profileData.fields_missing,
            conversation_id: conversationId
          }));
          
          return { success: true, data: profileData };
        } else {
          return { success: false, error: profileData.message || 'Profile extraction failed' };
        }
      } else {
        const errorText = await profileResponse.text();
        return { success: false, error: `API error: ${profileResponse.status} - ${errorText}` };
      }
    } catch (error) {
      console.error('❌ Error extracting profile:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Generate school recommendations
   */
  static async generateSchoolRecommendations(conversationId: string, userId: string): Promise<OnboardingApiResponse> {
    try {
      console.log('🎓 Generating school recommendations for conversation:', conversationId);
      const response = await SchoolRecommendationService.generateSchoolRecommendations(conversationId, userId);
      
      if (response.success) {
        console.log('✅ Generated recommendations:', response.recommendations.length);
        return { success: true, data: response };
      } else {
        return { success: false, error: response.message || 'No recommendations generated' };
      }
    } catch (error) {
      console.error('❌ Error generating recommendations:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Save conversation ID for later retrieval
   */
  static async storeConversationId(conversationId: string, userId: string, sessionNumber: number): Promise<OnboardingApiResponse> {
    try {
      console.log('Storing conversation ID for later retrieval:', conversationId);
      
      // Store conversation ID in database with session number
      await ConversationStorage.storeConversationId(conversationId, userId, sessionNumber);
      
      return { success: true };
    } catch (error) {
      console.error('Error storing conversation ID:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Save with retry logic for database operations
   */
  static async saveWithRetry(operation: {
    table: 'conversation_tracking' | 'user_profiles';
    data: any;
    where?: { user_id: string };
  }, maxRetries = 2): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        let result;
        if (operation.table === 'conversation_tracking') {
          result = await supabase.from('conversation_tracking').insert(operation.data);
        } else if (operation.table === 'user_profiles') {
          result = await supabase.from('user_profiles').update(operation.data).eq('user_id', operation.where!.user_id);
        } else {
          throw new Error(`Unknown table: ${operation.table}`);
        }
        
        if (result.error) throw result.error;
        return true;
      } catch (error) {
        console.error(`Save attempt ${i + 1} failed:`, error);
        if (i === maxRetries - 1) {
          throw error;
        }
        // Simple delay: 1s, 2s
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    return false;
  }
}
