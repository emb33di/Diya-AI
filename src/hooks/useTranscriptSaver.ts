/**
 * Custom hook for debounced transcript saving
 * Automatically saves conversation messages to backend with debouncing
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TranscriptMessage {
  source: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

export interface TranscriptSaveData {
  conversation_id: string;
  user_id: string;
  messages: TranscriptMessage[];
  session_type?: 'onboarding' | 'brainstorming';
  message_count: number;
  total_length: number;
}

export const useTranscriptSaver = (
  messages: TranscriptMessage[],
  conversationId: string | null,
  sessionType: 'onboarding' | 'brainstorming' = 'onboarding',
  debounceMs: number = 500
) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedMessagesRef = useRef<TranscriptMessage[]>([]);
  const messagesRef = useRef<TranscriptMessage[]>(messages);

  /**
   * Save transcript to backend API with retry mechanism
   * TODO: Replace '/api/transcripts/save' with actual API endpoint
   * The endpoint should accept POST requests with TranscriptSaveData in the body
   */
  const saveTranscript = useCallback(async (transcriptData: TranscriptSaveData, retryCount = 0): Promise<boolean> => {
    const maxRetries = 2;
    
    try {
      console.log(`💾 Saving transcript to backend (attempt ${retryCount + 1}/${maxRetries + 1}):`, {
        conversationId: transcriptData.conversation_id,
        messageCount: transcriptData.message_count,
        sessionType: transcriptData.session_type
      });

      // Use Supabase Edge Function for transcript saving
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(transcriptData),
      });

      if (!response.ok) {
        console.error(`❌ API Error: Failed to save transcript (attempt ${retryCount + 1})`, response.status, response.statusText);
        
        // Retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying in 1 second... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          return saveTranscript(transcriptData, retryCount + 1);
        }
        
        console.error('❌ Max retries exceeded. Transcript save failed.');
        return false;
      }

      console.log('✅ Transcript saved successfully');
      return true;
    } catch (error) {
      console.error(`❌ Network Error: Could not save transcript (attempt ${retryCount + 1})`, error);
      
      // Retry if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying in 1 second... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        return saveTranscript(transcriptData, retryCount + 1);
      }
      
      console.error('❌ Max retries exceeded. Transcript save failed.');
      return false;
    }
  }, []);

  /**
   * Update messagesRef whenever messages change
   */
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * Debounced save function - now uses messagesRef to avoid stale closures
   */
  const debouncedSaveTranscript = useCallback(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(async () => {
      const currentMessages = messagesRef.current; // Always get the latest messages
      if (!conversationId || currentMessages.length === 0) {
        console.log('⏭️ Skipping transcript save - no conversation ID or empty messages');
        return;
      }

      // Only send new messages since last successful save
      const newMessages = currentMessages.slice(lastSavedMessagesRef.current.length);
      if (newMessages.length === 0) {
        console.log('⏭️ Skipping transcript save - no new messages');
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn('⚠️ No authenticated user - skipping transcript save');
          return;
        }

        const totalLength = newMessages.reduce((sum, msg) => sum + msg.text.length, 0);
        
        const transcriptData: TranscriptSaveData = {
          conversation_id: conversationId,
          user_id: user.id,
          messages: newMessages,
          session_type: sessionType,
          message_count: newMessages.length,
          total_length: totalLength
        };

        const success = await saveTranscript(transcriptData);
        if (success) {
          lastSavedMessagesRef.current = [...currentMessages];
        }
      } catch (error) {
        console.error('❌ Error in debounced save:', error);
      }
    }, debounceMs);
  }, [conversationId, sessionType, debounceMs, saveTranscript]);

  /**
   * Effect to watch for message changes and trigger debounced save
   */
  useEffect(() => {
    // Only save non-empty transcripts
    if (messages && messages.length > 0 && conversationId) {
      console.log('📝 Messages changed, scheduling debounced save:', {
        messageCount: messages.length,
        conversationId,
        sessionType
      });
      debouncedSaveTranscript(); // No parameters needed - uses messagesRef internally
    }
  }, [messages, conversationId, debouncedSaveTranscript, sessionType]);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Force immediate save (useful for session end)
   */
  const forceSaveTranscript = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const currentMessages = messagesRef.current; // Use ref to get latest messages
    if (!conversationId || !currentMessages || currentMessages.length === 0) {
      console.log('⏭️ Force save skipped - no conversation ID or empty messages');
      return false;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ No authenticated user - skipping force save');
        return false;
      }

      const totalLength = currentMessages.reduce((sum, msg) => sum + msg.text.length, 0);
      
      const transcriptData: TranscriptSaveData = {
        conversation_id: conversationId,
        user_id: user.id,
        messages: currentMessages,
        session_type: sessionType,
        message_count: currentMessages.length,
        total_length: totalLength
      };

      const success = await saveTranscript(transcriptData);
      if (success) {
        lastSavedMessagesRef.current = [...currentMessages];
      }
      return success;
    } catch (error) {
      console.error('❌ Error in force save:', error);
      return false;
    }
  }, [conversationId, sessionType, saveTranscript]);

  return {
    forceSaveTranscript
  };
};
