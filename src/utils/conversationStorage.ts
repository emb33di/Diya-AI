/**
 * Conversation Storage Utility
 * Handles storing conversation IDs and metadata
 */

import { supabase } from '@/integrations/supabase/client';
import { ElevenLabsAPI, ConversationData } from './elevenLabsAPI';

export class ConversationStorage {
  /**
   * Store conversation ID in Supabase
   */
  static async storeConversationId(conversationId: string, userId: string, sessionNumber: number = 1): Promise<boolean> {
    try {
      console.log('Storing conversation ID:', conversationId, 'for user:', userId, 'session:', sessionNumber);
      
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
      
      // Store in conversation_tracking table
      const { error } = await supabase
        .from('conversation_tracking')
        .insert([{
          conversation_id: conversationId,
          user_id: userId,
          conversation_ended_at: new Date().toISOString(),
          conversation_type: conversationType
        }]);

      if (error) {
        console.error('Error storing conversation ID in Supabase:', error);
        // Fallback to localStorage
        this.storeConversationIdLocally(conversationId);
        return false;
      }

      console.log('Conversation ID stored in Supabase successfully');
      return true;
    } catch (error) {
      console.error('Error storing conversation ID:', error);
      // Fallback to localStorage
      this.storeConversationIdLocally(conversationId);
      return false;
    }
  }

  /**
   * Store conversation ID locally as fallback
   */
  static storeConversationIdLocally(conversationId: string): void {
    try {
      const storedConversations = localStorage.getItem('conversation_ids') || '[]';
      const conversationIds = JSON.parse(storedConversations);
      if (!conversationIds.includes(conversationId)) {
        conversationIds.push(conversationId);
        localStorage.setItem('conversation_ids', JSON.stringify(conversationIds));
        console.log('Conversation ID stored in localStorage:', conversationId);
      }
    } catch (error) {
      console.error('Error storing conversation ID locally:', error);
    }
  }

  /**
   * Store conversation metadata in Supabase
   */
  static async storeConversationMetadata(metadata: ConversationData): Promise<boolean> {
    try {
      console.log('Storing conversation metadata for:', metadata.conversation_id);
      
      // Store in conversation_metadata table
      const { error } = await supabase
        .from('conversation_metadata')
        .insert([{
          conversation_id: metadata.conversation_id,
          user_id: metadata.user_id,
          transcript_summary: metadata.transcript_summary,
          transcript: metadata.transcript,
          audio_url: metadata.audio_url
        }]);

      if (error) {
        console.error('Error storing metadata in Supabase:', error);
        // Fallback to localStorage
        ElevenLabsAPI.storeConversationLocally(metadata);
        return false;
      }

      // Update conversation_tracking to mark metadata as retrieved
      await supabase
        .from('conversation_tracking')
        .update({ 
          metadata_retrieved: true, 
          metadata_retrieved_at: new Date().toISOString() 
        })
        .eq('conversation_id', metadata.conversation_id)
        .eq('user_id', metadata.user_id);

      console.log('Metadata stored in Supabase successfully');
      return true;
    } catch (error) {
      console.error('Error storing conversation metadata:', error);
      // Fallback to localStorage
      ElevenLabsAPI.storeConversationLocally(metadata);
      return false;
    }
  }

  /**
   * Retrieve and store metadata for a conversation
   */
  static async retrieveAndStoreMetadata(conversationId: string, userId: string): Promise<boolean> {
    try {
      console.log('Retrieving and storing metadata for conversation:', conversationId);
      
      // Get metadata from ElevenLabs API
      const metadata = await ElevenLabsAPI.getConversationMetadata(conversationId, userId);
      
      // Store in database
      const success = await this.storeConversationMetadata(metadata);
      
      if (success) {
        console.log('✅ Metadata retrieved and stored successfully');
      } else {
        console.log('⚠️ Metadata stored locally as fallback');
      }
      
      return true;
    } catch (error) {
      console.error('Error retrieving and storing metadata:', error);
      return false;
    }
  }

  /**
   * Get conversation IDs for a user
   */
  static async getConversationIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_tracking')
        .select('conversation_id')
        .eq('user_id', userId)
        .order('conversation_ended_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversation IDs from Supabase:', error);
        // Fallback to localStorage
        return this.getConversationIdsLocally();
      }

      return data?.map(row => row.conversation_id) || [];
    } catch (error) {
      console.error('Error getting conversation IDs:', error);
      return this.getConversationIdsLocally();
    }
  }

  /**
   * Get conversation IDs from localStorage as fallback
   */
  static getConversationIdsLocally(): string[] {
    try {
      const storedConversations = localStorage.getItem('conversation_ids') || '[]';
      return JSON.parse(storedConversations);
    } catch (error) {
      console.error('Error getting conversation IDs from localStorage:', error);
      return [];
    }
  }

  /**
   * Get conversation metadata for a specific conversation
   */
  static async getConversationMetadata(conversationId: string): Promise<ConversationData | null> {
    try {
      const { data, error } = await supabase
        .from('conversation_metadata')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (error) {
        console.error('Error fetching metadata from Supabase:', error);
        // Fallback to localStorage
        return this.getConversationMetadataLocally(conversationId);
      }

      return data;
    } catch (error) {
      console.error('Error getting conversation metadata:', error);
      return this.getConversationMetadataLocally(conversationId);
    }
  }

  /**
   * Get conversation metadata from localStorage as fallback
   */
  static getConversationMetadataLocally(conversationId: string): ConversationData | null {
    try {
      const storedMetadata = localStorage.getItem('conversation_metadata') || '{}';
      const metadataMap = JSON.parse(storedMetadata);
      return metadataMap[conversationId] || null;
    } catch (error) {
      console.error('Error getting metadata from localStorage:', error);
      return null;
    }
  }
} 