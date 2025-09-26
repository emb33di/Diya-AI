import React, { useEffect, useRef, useCallback } from 'react';
import { useConversation } from '@outspeed/react';
import { supabase } from '@/integrations/supabase/client';
import { OutspeedEvent } from '@/types/outspeed';
import { parseOutspeedMessage, isValidMessageItem } from '@/utils/outspeedUtils';
import { OnboardingApiService } from '@/services/onboarding.api';
import { useToast } from '@/components/ui/use-toast';

interface ConversationEngineProps {
  agentId: string;
  source: string;
  // State setters from Onboarding component
  setSessionState: (state: 'idle' | 'active' | 'error') => void;
  setConversationId: (id: string | null) => void;
  setSessionStarted: (started: boolean) => void;
  setSessionStartTime: (time: Date | null) => void;
  setHasStartedOnce: (started: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<Array<{
    id?: string;
    source: 'ai' | 'user';
    text: string;
    timestamp: Date;
  }>>>;
  setProcessedMessageIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setTopics: React.Dispatch<React.SetStateAction<Array<{
    name: string;
    icon: any;
    color: string;
    bgColor: string;
    completed: boolean;
  }>>>;
  setSessionDuration: (duration: number) => void;
  setCumulativeSessionTime: (time: number) => void;
  setRemainingTime: (time: number) => void;
  setIsSpeaking: (speaking: boolean) => void;
  // State values needed for handlers
  sessionState: 'idle' | 'active' | 'error';
  cumulativeSessionTime: number;
  sessionStartTime: Date | null;
  messages: Array<{
    id?: string;
    source: 'ai' | 'user';
    text: string;
    timestamp: Date;
  }>;
  processedMessageIds: Set<string>;
  sessionFinalizedRef: React.MutableRefObject<boolean>;
  calculateProgressPercentage: () => number;
  forceSaveTranscript: () => Promise<void>;
  // Callbacks
  onConnect: (conversationId: string) => void;
  onMessage: (message: any) => void;
  onDisconnect: () => void;
  onError: (error: any) => void;
  onContextRestored?: (items: any[]) => void;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  onEndSession?: (endSessionFn: () => Promise<void>) => void;
}

const ConversationEngine = ({
  agentId,
  source,
  // State setters
  setSessionState,
  setConversationId,
  setSessionStarted,
  setSessionStartTime,
  setHasStartedOnce,
  setMessages,
  setProcessedMessageIds,
  setTopics,
  setSessionDuration,
  setCumulativeSessionTime,
  setRemainingTime,
  setIsSpeaking,
  // State values
  sessionState,
  cumulativeSessionTime,
  sessionStartTime,
  messages,
  processedMessageIds,
  sessionFinalizedRef,
  calculateProgressPercentage,
  forceSaveTranscript,
  // Callbacks
  onConnect,
  onMessage,
  onDisconnect,
  onError,
  onContextRestored,
  onSpeakingStateChange,
  onEndSession,
}: ConversationEngineProps) => {
  const { toast } = useToast();
  const sessionStartedRef = useRef(false);

  // Conversation handlers moved from Onboarding.tsx
  const handleConnect = useCallback(async (conversationId: string) => {
    if (sessionState !== 'idle') {
      console.warn('⚠️ Session already started');
      return;
    }
    
    try {
      setSessionState('active');
      setConversationId(conversationId);
      setSessionStarted(true);
      setSessionStartTime(new Date());
      setHasStartedOnce(true);
      
      console.log('🎉 CONNECTED to Outspeed voice agent');
      console.log('📊 Connection details:', {
        conversationId: conversationId,
        agentId: agentId ? 'Set' : 'Not set',
        timestamp: new Date().toISOString()
      });
      
      // Save conversation tracking using API service
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const response = await OnboardingApiService.saveConversationTracking({
          conversation_id: conversationId,
          user_id: user.id,
          conversation_type: 'onboarding_1',
          conversation_started_at: new Date().toISOString(),
          metadata_retrieved: false
        });
        
        if (!response.success) {
          console.error('Failed to save conversation tracking:', response.error);
        }
      }
      
      toast({
        title: "Connected",
        description: "Your conversation with Diya has started. Feel free to speak naturally!"
      });
    } catch (error) {
      console.error('❌ Error in handleConnect:', error);
      setSessionState('error');
      toast({
        title: "Connection Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive"
      });
    }
  }, [agentId, toast, sessionState, setSessionState, setConversationId, setSessionStarted, setSessionStartTime, setHasStartedOnce]);

  const handleMessage = useCallback(async (message: any) => {
    try {
      console.log('📝 Unified message received:', message);

      // Use the message exactly as parsed by parseOutspeedMessage
      // This ensures consistent ID generation and prevents double processing
      if (!message || !message.id || !message.text || !message.source) {
        console.warn('⚠️ Invalid message format received:', message);
        return;
      }

      // Use the ID that was already generated by parseOutspeedMessage
      const messageId = message.id;
      
      // Handle in_progress messages differently - they can update existing messages
      if (message.isInProgress) {
        console.log('🔄 Processing in_progress message:', {
          id: messageId,
          source: message.source,
          text: message.text
        });
        
        // For in_progress messages, update existing message or add new one
        console.log(
          `%c--- NEW IN_PROGRESS MESSAGE RECEIVED ---%c
          Source: ${message.source}
          ID: ${message.id}
          Text: "${message.text.substring(0, 50)}..."`,
          'color: #2e7d32; font-weight: bold;',
          'color: inherit;'
        );
        
        setMessages(prev => {
          console.log('%cPREVIOUS STATE:', 'color: #c62828;', prev);
          const existingIndex = prev.findIndex(msg => msg.id === messageId);
          
          if (existingIndex >= 0) {
            // Update existing message
            const updated = [...prev];
            updated[existingIndex] = {
              id: messageId,
              source: message.source,
              text: message.text,
              timestamp: message.timestamp || new Date()
            };
            console.log(`🔄 Updated in_progress message: ${messageId}`);
            console.log('%c   NEW STATE:', 'color: #00695c;', updated);
            return updated;
          } else {
            // Add new in_progress message
            const updated = [...prev, {
              id: messageId,
              source: message.source,
              text: message.text,
              timestamp: message.timestamp || new Date()
            }];
            console.log(`📊 Message count updated: ${prev.length} → ${updated.length} (${message.source} in_progress message added)`);
            console.log('%c   NEW STATE:', 'color: #00695c;', updated);
            return updated;
          }
        });
        
        // Don't add to processedMessageIds for in_progress messages
        // as they might be updated later
        return;
      }
      
      // Check deduplication using the consistent ID for completed messages
      if (processedMessageIds.has(messageId)) {
        console.log('⏭️ Duplicate message skipped:', messageId, 'Source:', message.source);
        return;
      }
      
      // Use the message object as-is from parseOutspeedMessage
      const newMessage = {
        id: messageId,
        source: message.source,
        text: message.text,
        timestamp: message.timestamp || new Date()
      };
      
      console.log('✅ Adding completed message to transcript:', {
        id: messageId,
        source: message.source,
        textLength: message.text.length,
        timestamp: newMessage.timestamp
      });
      
      // Update UI immediately
      console.log(
        `%c--- NEW COMPLETED MESSAGE RECEIVED ---%c
        Source: ${newMessage.source}
        ID: ${newMessage.id}
        Text: "${newMessage.text.substring(0, 50)}..."`,
        'color: #2e7d32; font-weight: bold;',
        'color: inherit;'
      );
      
      setMessages(prev => {
        console.log('%cPREVIOUS STATE:', 'color: #c62828;', prev);
        const updated = [...prev, newMessage];
        console.log(`📊 Message count updated: ${prev.length} → ${updated.length} (${message.source} message added)`);
        console.log('%c   NEW STATE:', 'color: #00695c;', updated);
        return updated;
      });
      
      setProcessedMessageIds(prev => new Set([...prev, messageId]));

      // Mark topics as completed based on conversation flow
      if (message.source === 'ai') {
        const currentProgress = Math.min(calculateProgressPercentage() + 2, 100);
        const completedCount = Math.floor(currentProgress / 16.67);
        setTopics(prev => prev.map((topic, index) => ({
          ...topic,
          completed: index < completedCount
        })));
      }
    } catch (error) {
      console.error('❌ Error handling message:', error, 'Message:', message);
    }
  }, [calculateProgressPercentage, processedMessageIds, setMessages, setProcessedMessageIds, setTopics]);

  const handleDisconnect = useCallback(async () => {
    console.log('Disconnected from voice agent');

    // Prevent double accounting when pause/end already handled
    let newCumulativeTimeLocal = cumulativeSessionTime;
    if (!sessionFinalizedRef.current && sessionStartTime) {
      const duration = Math.max(0, (new Date().getTime() - sessionStartTime.getTime()) / 1000);
      setSessionDuration(duration);
      newCumulativeTimeLocal = cumulativeSessionTime + duration;
      setCumulativeSessionTime(newCumulativeTimeLocal);

      // Store cumulative time in database using API service
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const response = await OnboardingApiService.updateCumulativeOnboardingTime(user.id, newCumulativeTimeLocal);
          if (response.success) {
            console.log('✅ Updated cumulative time:', Math.round(newCumulativeTimeLocal), 'seconds');
          } else {
            console.error('Failed to update cumulative time:', response.error);
          }
        }
      } catch (error) {
        console.error('Error updating cumulative session time:', error);
      }
      console.log('Session duration:', duration, 'seconds');
      console.log('Cumulative session time:', newCumulativeTimeLocal, 'seconds');
    } else {
      console.log('Session already finalized; skipping time accounting.');
    }

    // Recompute remaining time from cumulative total
    const totalSecondsNeededLocal = 2 * 60; // 2 minutes for testing
    setRemainingTime(Math.max(0, totalSecondsNeededLocal - newCumulativeTimeLocal));

    setSessionStartTime(null);
    setSessionStarted(false);
    sessionFinalizedRef.current = false;
    
    // Force save transcript before disconnecting
    if (messages.length > 0) {
      console.log('💾 Force saving transcript on disconnect...');
      await forceSaveTranscript();
    }
  }, [cumulativeSessionTime, sessionStartTime, messages, forceSaveTranscript, setSessionDuration, setCumulativeSessionTime, setRemainingTime, setSessionStartTime, setSessionStarted]);

  const handleSpeakingStateChange = useCallback((speaking: boolean) => {
    console.log('🎤 Speaking state changed:', speaking);
    setIsSpeaking(speaking);
  }, [setIsSpeaking]);

  const handleError = useCallback((error: any) => {
    console.error('❌ VOICE AGENT ERROR:', error);
    console.error('🔍 Error details:', {
      errorType: typeof error,
      errorMessage: error?.message || 'No message',
      errorStack: error?.stack || 'No stack',
      errorName: error?.name || 'No name',
      agentId: agentId ? 'Set' : 'Not set',
      timestamp: new Date().toISOString()
    });
    toast({
      title: "Connection Error",
      description: "There was an issue with the voice connection. Please try again.",
      variant: "destructive"
    });
  }, [agentId, toast]);

  const handleContextRestored = useCallback((items: any[]) => {
    console.log('🔄 Context restored with items:', items.length);
    
    // Process the restored messages and update local state
    const restoredMessages = items.map((item, index) => {
      // Determine if this is a user or AI message based on the item structure
      // This may need to be adjusted based on the actual Outspeed API response format
      const isUserMessage = item.role === 'user' || item.source === 'user';
      
      return {
        source: isUserMessage ? 'user' as const : 'ai' as const,
        text: item.content || item.message || item.text || 'Restored message',
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
      };
    });

    // Update the messages state with restored content
    setMessages(prev => [...prev, ...restoredMessages]);
    
    toast({
      title: "Session Restored",
      description: `Restored ${restoredMessages.length} previous messages from your conversation.`
    });
  }, [toast, setMessages]);

  const conversation = useConversation({
    onConnect: async () => {
      try {
        console.log('🔗 Outspeed onConnect callback triggered');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log('📝 Generated conversation ID:', conversationId);
          
          // Call our new handleConnect with the generated conversationId
          await handleConnect(conversationId);

          // Register endSession handler ONCE here to avoid repeated state updates
          if (onEndSession) {
            const endFn = async () => {
              try {
                console.log('🛑 Ending Outspeed session from parent...');
                
                // Clean up event listeners before ending session
                if (conversation && (conversation as any)._cleanupEventListeners) {
                  try {
                    (conversation as any)._cleanupEventListeners();
                    console.log('🧹 Event listeners cleaned up before session end');
                  } catch (cleanupError) {
                    console.error('❌ Error cleaning up event listeners:', cleanupError);
                  }
                }
                
                await conversation.endSession();
                console.log('✅ Outspeed session ended successfully');
              } catch (error) {
                console.error('Error ending Outspeed session:', error);
              }
            };

            try {
              // If parent provided a React state setter, use functional form
              // @ts-ignore
              onEndSession((prev: any) => endFn);
            } catch {
              onEndSession(endFn);
            }
          }
        }
      } catch (error) {
        console.error('Error creating conversation record:', error);
        const fallbackId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await handleConnect(fallbackId);
      }
    },
    onMessage: (event: OutspeedEvent) => {
      try {
        console.log('📨 Raw Outspeed event received:', {
          type: event.type,
          hasData: !!event.data,
          dataKeys: event.data ? Object.keys(event.data) : [],
          timestamp: new Date().toISOString()
        });

        if (event.type === 'message' && event.data) {
          console.log('📝 Processing message event data:', event.data);
          const parsedMessage = parseOutspeedMessage(event.data);
          console.log('📝 Parsed message result:', parsedMessage);

          if (parsedMessage && isValidMessageItem(parsedMessage)) {
            console.log('✅ Message is valid, calling handleMessage');
            handleMessage(parsedMessage);
          } else {
            console.warn('⚠️ Invalid message item after parsing:', {
              parsedMessage,
              isValid: parsedMessage ? isValidMessageItem(parsedMessage) : false
            });
          }
        } else if (event.type === 'speaking_state_change' && event.data) {
          console.log('🎤 Speaking state change event:', event.data);
          handleSpeakingStateChange(event.data.is_speaking);
        } else if (event.type === 'context_restored' && event.data) {
          console.log('🔄 Context restored event:', event.data);
          handleContextRestored(event.data.items || []);
        } else {
          console.log('ℹ️ Unhandled event type:', event.type, 'Data:', event.data);
        }
      } catch (error) {
        console.error('❌ Error processing Outspeed event:', error, 'Event:', event);
      }
    },
    onDisconnect: handleDisconnect,
    onError: handleError,
  });

  if (!conversation) {
    return <div>Loading conversation...</div>;
  }

  useEffect(() => {
    sessionStartedRef.current = false;
  }, [agentId]);

  useEffect(() => {
    if (agentId && conversation.startSession && !sessionStartedRef.current) {
      console.log('🚀 ConversationEngine: Starting session with agent:', agentId);
      console.log('📊 Session start details:', {
        agentId,
        source,
        hasStartSession: !!conversation.startSession,
        sessionStartedRef: sessionStartedRef.current,
        timestamp: new Date().toISOString()
      });
      sessionStartedRef.current = true;
      
      try {
        conversation.startSession({ agentId, source });
        console.log('✅ Session start call completed');
      } catch (error) {
        console.error('❌ Error starting session:', error);
        sessionStartedRef.current = false; // Reset on error
      }
    }
  }, [agentId, source, conversation]);

  return null;
};

export default ConversationEngine;