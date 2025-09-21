import { supabase } from '@/integrations/supabase/client';

export interface SessionConfig {
  model: string;
  instructions: string;
  voice: string;
  turn_detection: {
    type: string;
  };
  first_message?: string;
}

export interface OutspeedSessionData {
  session_id: string;
  token: string;
  expires_at: string;
}

export interface OutspeedConversationData {
  conversation_id: string;
  user_id: string;
  transcript_summary?: string;
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
   * Generate ephemeral token for Outspeed session
   */
  static async generateToken(sessionConfig: SessionConfig): Promise<OutspeedSessionData> {
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
        body: JSON.stringify(sessionConfig),
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
   * Create session configuration for onboarding
   */
  static createOnboardingSessionConfig(studentName?: string): SessionConfig {
    return {
      model: "outspeed-v1",
      instructions: `You are Diya, an AI college counselor specializing in helping international students with their US college applications. You're having a conversation with ${studentName || 'a student'} to understand their academic background, interests, goals, and preferences. 

Your role is to:
1. Ask thoughtful questions about their academic interests, extracurricular activities, and career goals
2. Help them identify their strengths and unique qualities
3. Understand their preferences for college size, location, programs, and culture
4. Provide guidance on the college application process, including visa requirements and cultural adaptation
5. Be encouraging, supportive, and professional
6. Address concerns specific to international students (language barriers, cultural differences, etc.)

Keep the conversation natural and engaging. Ask follow-up questions to get deeper insights. This conversation will help generate personalized school recommendations.`,
      voice: "david", // You can change this to "apoorva" or other available voices
      turn_detection: {
        type: "semantic_vad",
      },
      first_message: `Hello ${studentName || 'there'}! I'm Diya, your AI college counselor. I'm here to help you navigate your college application journey. Let's start by getting to know you better. What are you most excited about when you think about college?`,
    };
  }

  /**
   * Create session configuration for essay brainstorming
   */
  static createBrainstormingSessionConfig(essayTitle: string, essayPrompt: string, targetCollege?: string): SessionConfig {
    return {
      model: "outspeed-v1",
      instructions: `You are Diya, an AI essay counselor helping a student brainstorm ideas for their college application essay. 

Essay Details:
- Title: ${essayTitle}
- Prompt: ${essayPrompt}
- Target College: ${targetCollege || 'Not specified'}

Your role is to:
1. Help the student explore personal experiences and stories that relate to the essay prompt
2. Guide them to identify unique angles and compelling narratives
3. Ask probing questions to help them reflect on their values, growth, and character
4. Suggest ways to make their essay stand out while staying authentic
5. Help them structure their thoughts and organize their ideas

Be encouraging and help them discover their authentic voice. Ask follow-up questions to dig deeper into their experiences and perspectives.`,
      voice: "david",
      turn_detection: {
        type: "semantic_vad",
      },
      first_message: `Hi! I'm excited to help you brainstorm ideas for your "${essayTitle}" essay. This is a great opportunity to share something meaningful about yourself. Let's start by exploring what this prompt means to you personally. What's your first reaction when you read this prompt?`,
    };
  }

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
          transcript_summary: metadata.transcript_summary,
          transcript: metadata.transcript,
          audio_url: metadata.audio_url,
          session_number: metadata.session_number || 1,
          duration_seconds: metadata.duration_seconds,
          message_count: metadata.message_count || 0
        }]);

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
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error retrieving conversation metadata:', error);
        return this.getLocalConversations();
      }

      return data || [];
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
          conversation_ended_at: new Date().toISOString()
        }]);

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
