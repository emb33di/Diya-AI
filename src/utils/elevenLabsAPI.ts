/**
 * ElevenLabs API Integration
 * Handles conversation metadata retrieval and storage
 */

export interface ConversationData {
  conversation_id: string;
  transcript_summary: string | null;
  transcript: string | null;
  audio_url: string | null;
  created_at: string;
  user_id: string;
}

export class ElevenLabsAPI {
  private static client: any = null;
  private static apiKey: string | null = null;

  /**
   * Initialize the ElevenLabs API client
   */
  static initialize(apiKey: string) {
    this.apiKey = apiKey;
    console.log('ElevenLabs API initialized with key length:', apiKey?.length || 0);
  }

  /**
   * Get conversation details from ElevenLabs API
   */
  static async getConversationDetails(conversationId: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('API key not initialized');
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching conversation details:', error);
      throw error;
    }
  }

  /**
   * Check if conversation has audio available
   */
  static async getConversationAudio(conversationId: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('API key not initialized');
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        console.warn('Audio not available for conversation:', conversationId);
        return { has_audio: false, audio_url: null };
      }

      const audioData = await response.json();
      return {
        has_audio: true,
        audio_url: audioData.audio_url || null
      };
    } catch (error) {
      console.warn('Error checking conversation audio:', error);
      return { has_audio: false, audio_url: null };
    }
  }

  /**
   * Get complete conversation metadata including transcript, summary, and audio
   */
  static async getConversationMetadata(conversationId: string, userId: string): Promise<ConversationData> {
    try {
      console.log('Fetching conversation metadata for:', conversationId);
      
      // Get conversation details
      const conversationData = await this.getConversationDetails(conversationId);
      console.log('Conversation details received:', conversationData);
      
      // Check if conversation is still processing
      if (conversationData.status === 'processing') {
        console.log('Conversation is still processing, summary not available yet');
        return {
          conversation_id: conversationId,
          transcript_summary: null,
          transcript: null,
          audio_url: null,
          created_at: new Date().toISOString(),
          user_id: userId
        };
      }
      
      // Get audio recording
      let audioUrl = null;
      try {
        const audioData = await this.getConversationAudio(conversationId);
        audioUrl = audioData.audio_url || null;
        console.log('Audio data received:', audioData);
      } catch (error) {
        console.warn('Could not fetch audio recording:', error);
      }

      // Process transcript from the API response format
      let transcriptText = null;
      if (conversationData.transcript && Array.isArray(conversationData.transcript)) {
        transcriptText = conversationData.transcript
          .map((entry: any) => `${entry.role}: ${entry.message}`)
          .join('\n');
      }

      const metadata = {
        conversation_id: conversationId,
        transcript_summary: conversationData.transcript_summary || null,
        transcript: transcriptText,
        audio_url: audioUrl,
        created_at: new Date().toISOString(),
        user_id: userId
      };
      
      console.log('Complete metadata prepared:', metadata);
      return metadata;
    } catch (error) {
      console.error('Error fetching conversation metadata:', error);
      throw error;
    }
  }

  /**
   * Store conversation metadata locally as backup
   */
  static storeConversationLocally(metadata: ConversationData) {
    try {
      const storedMetadata = localStorage.getItem('conversation_metadata') || '{}';
      const metadataMap = JSON.parse(storedMetadata);
      metadataMap[metadata.conversation_id] = metadata;
      localStorage.setItem('conversation_metadata', JSON.stringify(metadataMap));
      console.log('Metadata stored locally:', metadata.conversation_id);
    } catch (error) {
      console.error('Error storing metadata locally:', error);
    }
  }

  /**
   * Get locally stored conversations
   */
  static getLocalConversations(): ConversationData[] {
    try {
      const storedMetadata = localStorage.getItem('conversation_metadata') || '{}';
      const metadataMap = JSON.parse(storedMetadata);
      return Object.values(metadataMap);
    } catch (error) {
      console.error('Error retrieving local conversations:', error);
      return [];
    }
  }
} 