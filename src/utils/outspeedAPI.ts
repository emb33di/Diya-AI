import { supabase } from '@/integrations/supabase/client';
import { ApplyingToType } from './userProfileUtils';
import { getAgentId, validateAgentConfiguration } from './agentManager';

// Legacy interface - kept for backward compatibility during transition
export interface SessionConfig {
  model: string;
  instructions: string;
  voice: string;
  input_language?: string;
  output_language?: string;
  turn_detection: {
    type: string;
  };
  first_message?: string;
}

export interface OutspeedSessionData {
  id: string;
  client_secret: {
    value: string;
    expires_at: number;
  };
  object: string;
  model: string;
  modalities: string[];
  instructions: string;
  voice: string;
  created: number;
  // ... other fields from the actual response
}

export interface OutspeedConversationData {
  conversation_id: string;
  user_id: string;
  summary?: string;
  transcript?: string;
  audio_url?: string;
  session_number?: number;
  duration_seconds?: number;
  message_count?: number;
}

export class OutspeedAPI {
  private static tokenEndpoint: string = '';

  /**
   * Initialize the Outspeed API
   */
  static initialize(supabaseUrl: string) {
    this.tokenEndpoint = `${supabaseUrl}/functions/v1/outspeed-token`;
    console.log('Outspeed API initialized with token endpoint:', this.tokenEndpoint);
  }

  /**
   * Generate ephemeral token for Outspeed session using agent ID
   * This is the new simplified approach that replaces the old generateToken method
   */
  static async generateToken(agentId: string, source: string = 'diya-onboarding'): Promise<OutspeedSessionData> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          source
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token generation failed: ${error}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating Outspeed token:', error);
      throw error;
    }
  }

  /**
   * Generate token for onboarding conversation
   */
  static async generateOnboardingToken(): Promise<OutspeedSessionData> {
    const agentId = await this.getOnboardingAgentId();
    return this.generateToken(agentId, 'diya-onboarding');
  }

  /**
   * Get agent ID for onboarding based on user's applying_to field
   */
  static async getOnboardingAgentId(): Promise<string> {
    try {
      // Validate agent configuration first
      if (!validateAgentConfiguration()) {
        throw new Error('Agent configuration is incomplete. Please check agent IDs.');
      }

      // Fetch user's applying_to field from their profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('applying_to')
        .eq('user_id', user.id as any)
        .single();

      if (error || !profileData || !('applying_to' in profileData) || !profileData.applying_to) {
        console.warn('Could not fetch applying_to field, defaulting to Undergraduate agent');
        return getAgentId('Undergraduate');
      }

      const applyingTo = profileData.applying_to as ApplyingToType;
      return getAgentId(applyingTo);
    } catch (error) {
      console.error('Error getting onboarding agent ID:', error);
      // Fallback to undergraduate agent
      return getAgentId('Undergraduate');
    }
  }

  // Note: Brainstorming session configuration removed - will be implemented with agent-based approach later

  /**
   * Store conversation metadata in Supabase
   */
  static async storeConversationMetadata(metadata: OutspeedConversationData): Promise<boolean> {
    try {
      console.log('Storing Outspeed conversation metadata for:', metadata.conversation_id);
      
      const { error } = await supabase
        .from('conversation_metadata')
        .upsert([{
          conversation_id: metadata.conversation_id,
          user_id: metadata.user_id,
          summary: metadata.summary,
          transcript: metadata.transcript,
          audio_url: metadata.audio_url,
          session_number: metadata.session_number || 1,
          duration_seconds: metadata.duration_seconds,
          message_count: metadata.message_count || 0
        }] as any);

      if (error) {
        console.error('Error storing Outspeed metadata in Supabase:', error);
        // Fallback to localStorage
        this.storeConversationLocally(metadata);
        return false;
      }

      console.log('Outspeed metadata stored in Supabase successfully');
      return true;
    } catch (error) {
      console.error('Error storing Outspeed conversation metadata:', error);
      // Fallback to localStorage
      this.storeConversationLocally(metadata);
      return false;
    }
  }

  /**
   * Store conversation locally as fallback
   */
  static storeConversationLocally(metadata: OutspeedConversationData): void {
    try {
      const storedMetadata = localStorage.getItem('outspeed_conversation_metadata') || '{}';
      const metadataMap = JSON.parse(storedMetadata);
      metadataMap[metadata.conversation_id] = metadata;
      localStorage.setItem('outspeed_conversation_metadata', JSON.stringify(metadataMap));
      console.log('Outspeed conversation metadata stored locally');
    } catch (error) {
      console.error('Error storing Outspeed conversation metadata locally:', error);
    }
  }

  /**
   * Get locally stored Outspeed conversations
   */
  static getLocalConversations(): OutspeedConversationData[] {
    try {
      const storedMetadata = localStorage.getItem('outspeed_conversation_metadata') || '{}';
      const metadataMap = JSON.parse(storedMetadata);
      return Object.values(metadataMap);
    } catch (error) {
      console.error('Error retrieving local Outspeed conversations:', error);
      return [];
    }
  }

  /**
   * Retrieve conversation metadata from Supabase
   */
  static async getConversationMetadata(userId: string): Promise<OutspeedConversationData[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_metadata')
        .select('*')
        .eq('user_id', userId as any)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error retrieving conversation metadata:', error);
        return this.getLocalConversations();
      }

      return (data as unknown as OutspeedConversationData[]) || [];
    } catch (error) {
      console.error('Error retrieving conversation metadata:', error);
      return this.getLocalConversations();
    }
  }

  /**
   * Store conversation ID in conversation_tracking table
   */
  static async storeConversationId(conversationId: string, userId: string, sessionNumber: number = 1): Promise<boolean> {
    try {
      console.log('Storing Outspeed conversation ID:', conversationId, 'for user:', userId, 'session:', sessionNumber);
      
      // Determine conversation type based on session number
      let conversationType: "onboarding_1" | "onboarding_2" | "onboarding_3" | "onboarding_4" | "onboarding_5";
      switch (sessionNumber) {
        case 1: conversationType = "onboarding_1"; break;
        case 2: conversationType = "onboarding_2"; break;
        case 3: conversationType = "onboarding_3"; break;
        case 4: conversationType = "onboarding_4"; break;
        case 5: conversationType = "onboarding_5"; break;
        default: conversationType = "onboarding_1"; break;
      }
      
      const { error } = await supabase
        .from('conversation_tracking')
        .insert([{
          conversation_id: conversationId,
          user_id: userId,
          conversation_type: conversationType,
          conversation_ended_at: new Date().toISOString()
        }] as any);

      if (error) {
        console.error('Error storing Outspeed conversation ID in Supabase:', error);
        return false;
      }

      console.log('Outspeed conversation ID stored in Supabase successfully');
      return true;
    } catch (error) {
      console.error('Error storing Outspeed conversation ID:', error);
      return false;
    }
  }
}
