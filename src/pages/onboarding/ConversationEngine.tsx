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
  const processedMessageIdsRef = useRef(processedMessageIds);
  const calculateProgressPercentageRef = useRef(calculateProgressPercentage);

  // Update refs when values change
  useEffect(() => {
    processedMessageIdsRef.current = processedMessageIds;
  }, [processedMessageIds]);

  useEffect(() => {
    calculateProgressPercentageRef.current = calculateProgressPercentage;
  }, [calculateProgressPercentage]);

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
      console.log('🔍 AI VOICE DEBUG - HandleMessage Called:', {
        messageId: message?.id,
        messageSource: message?.source,
        messageText: message?.text,
        messageTextLength: message?.text?.length || 0,
        isInProgress: message?.isInProgress || false,
        timestamp: new Date().toISOString()
      });

      // Use the message exactly as parsed by parseOutspeedMessage
      // This ensures consistent ID generation and prevents double processing
      if (!message || !message.id || !message.text || !message.source) {
        console.warn('⚠️ Invalid message format received:', message);
        console.warn('🔍 AI VOICE DEBUG - Invalid Message Format:', {
          hasMessage: !!message,
          hasId: !!message?.id,
          hasText: !!message?.text,
          hasSource: !!message?.source,
          message: message
        });
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
        
        console.log('🔍 AI VOICE DEBUG - Processing In-Progress Message:', {
          messageId: messageId,
          messageSource: message.source,
          messageText: message.text,
          messageTextLength: message.text.length,
          isAI: message.source === 'ai',
          timestamp: new Date().toISOString()
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
          console.log('🔍 AI VOICE DEBUG - Previous Messages State:', {
            totalMessages: prev.length,
            aiMessages: prev.filter(m => m.source === 'ai').length,
            userMessages: prev.filter(m => m.source === 'user').length,
            lastMessageId: prev[prev.length - 1]?.id,
            lastMessageSource: prev[prev.length - 1]?.source
          });
          
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
            console.log('🔍 AI VOICE DEBUG - Updated Existing In-Progress Message:', {
              messageId: messageId,
              updatedText: message.text,
              updatedTextLength: message.text.length,
              messageIndex: existingIndex
            });
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
            console.log('🔍 AI VOICE DEBUG - Added New In-Progress Message:', {
              messageId: messageId,
              messageSource: message.source,
              messageText: message.text,
              messageTextLength: message.text.length,
              newTotalMessages: updated.length,
              newAIMessages: updated.filter(m => m.source === 'ai').length,
              newUserMessages: updated.filter(m => m.source === 'user').length
            });
            console.log('%c   NEW STATE:', 'color: #00695c;', updated);
            return updated;
          }
        });
        
        // Don't add to processedMessageIds for in_progress messages
        // as they might be updated later
        return;
      }
      
      // Check deduplication using the consistent ID for completed messages
      if (processedMessageIdsRef.current.has(messageId)) {
        console.log('⏭️ Duplicate message skipped:', messageId, 'Source:', message.source);
        console.log('🔍 AI VOICE DEBUG - Duplicate Message Skipped:', {
          messageId: messageId,
          messageSource: message.source,
          processedIdsCount: processedMessageIdsRef.current.size
        });
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
      
      console.log('🔍 AI VOICE DEBUG - Processing Completed Message:', {
        messageId: messageId,
        messageSource: message.source,
        messageText: message.text,
        messageTextLength: message.text.length,
        isAI: message.source === 'ai',
        timestamp: newMessage.timestamp.toISOString()
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
        console.log('🔍 AI VOICE DEBUG - Previous Messages State (Completed):', {
          totalMessages: prev.length,
          aiMessages: prev.filter(m => m.source === 'ai').length,
          userMessages: prev.filter(m => m.source === 'user').length,
          lastMessageId: prev[prev.length - 1]?.id,
          lastMessageSource: prev[prev.length - 1]?.source
        });
        
        const updated = [...prev, newMessage];
        console.log(`📊 Message count updated: ${prev.length} → ${updated.length} (${message.source} message added)`);
        console.log('🔍 AI VOICE DEBUG - Added Completed Message:', {
          messageId: messageId,
          messageSource: message.source,
          messageText: message.text,
          messageTextLength: message.text.length,
          newTotalMessages: updated.length,
          newAIMessages: updated.filter(m => m.source === 'ai').length,
          newUserMessages: updated.filter(m => m.source === 'user').length
        });
        console.log('%c   NEW STATE:', 'color: #00695c;', updated);
        return updated;
      });
      
      setProcessedMessageIds(prev => new Set([...prev, messageId]));
      console.log('🔍 AI VOICE DEBUG - Added to Processed IDs:', {
        messageId: messageId,
        newProcessedIdsCount: processedMessageIdsRef.current.size + 1
      });

      // Mark topics as completed based on conversation flow
      if (message.source === 'ai') {
        const currentProgress = Math.min(calculateProgressPercentageRef.current() + 2, 100);
        const completedCount = Math.floor(currentProgress / 16.67);
        setTopics(prev => prev.map((topic, index) => ({
          ...topic,
          completed: index < completedCount
        })));
      }
    } catch (error) {
      console.error('❌ Error handling message:', error, 'Message:', message);
    }
  }, [setMessages, setProcessedMessageIds, setTopics]); // Removed calculateProgressPercentage and processedMessageIds from dependencies

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

  // Unified event listeners for conversation output and transcripts (from backup file)
  useEffect(() => {
    // Exit if conversation isn't ready
    if (!conversation) return;
    
    console.log('🔧 Setting up event listeners for conversation:', conversation);

    const processItem = (item: any, debugLabel: string) => {
      try {
        if (!item) {
          console.warn(`⚠️ Empty item received for ${debugLabel}`);
          return;
        }
        
        console.log(`📝 ${debugLabel}:`, item);
        console.log('🔍 AI VOICE DEBUG - ProcessItem Called:', {
          debugLabel: debugLabel,
          itemId: item.id,
          itemType: item.type,
          itemRole: item.role,
          hasContent: !!(item.content || item.text || item.message),
          contentLength: (item.content || item.text || item.message || '').length,
          isInProgress: item.status === 'in_progress',
          timestamp: new Date().toISOString()
        });

        // Normalize the item to ensure it has the expected structure
        const normalized = {
          id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: item.type || 'message',
          role: item.role || (item.source === 'user' ? 'user' : 'assistant'),
          content: item.content || item.text || item.message || '',
          timestamp: item.timestamp || new Date(),
          ...item
        };

        console.log('🔍 AI VOICE DEBUG - Normalized Item:', {
          normalizedId: normalized.id,
          normalizedRole: normalized.role,
          normalizedContent: normalized.content,
          normalizedContentLength: normalized.content.length,
          normalizedType: normalized.type,
          timestamp: normalized.timestamp.toISOString()
        });

        if (!isValidMessageItem(normalized)) {
          console.log('⏭️ Skipping non-text item:', normalized.type);
          console.log('🔍 AI VOICE DEBUG - Item Validation Failed:', {
            reason: 'Not a valid message item',
            itemType: normalized.type,
            itemRole: normalized.role,
            hasContent: !!normalized.content
          });
          return;
        }

        const parsedMessage = parseOutspeedMessage(normalized);
        if (parsedMessage) {
          console.log('📨 Parsed message ready for callback:', {
            id: parsedMessage.id,
            source: parsedMessage.source,
            textLength: parsedMessage.text.length,
            timestamp: parsedMessage.timestamp
          });
          
          console.log('🔍 AI VOICE DEBUG - Parsed Message Details:', {
            parsedId: parsedMessage.id,
            parsedSource: parsedMessage.source,
            parsedText: parsedMessage.text,
            parsedTextLength: parsedMessage.text.length,
            parsedTimestamp: parsedMessage.timestamp.toISOString(),
            isInProgress: parsedMessage.isInProgress || false
          });
          
          try {
            handleMessage(parsedMessage);
          } catch (messageError) {
            console.error('❌ Error in message callback:', messageError, 'Message:', parsedMessage);
            console.error('🔍 AI VOICE DEBUG - Message Callback Error:', {
              error: messageError.message,
              messageId: parsedMessage.id,
              messageSource: parsedMessage.source,
              messageText: parsedMessage.text
            });
          }
        } else {
          console.warn('⚠️ Failed to parse message item:', normalized);
          console.warn('🔍 AI VOICE DEBUG - Parse Failed:', {
            reason: 'parseOutspeedMessage returned null',
            normalizedItem: normalized
          });
        }
      } catch (error) {
        console.error('❌ Error processing normalized item:', error, 'Raw:', item);
        console.error('🔍 AI VOICE DEBUG - ProcessItem Error:', {
          error: error.message,
          debugLabel: debugLabel,
          rawItem: item
        });
        // Don't throw - continue processing other items
      }
    };

    const handleNewItem = (event: OutspeedEvent) => {
      // Standard created items
      processItem(event.item, 'conversation.item.created');
    };

    const handleUserTranscript = (payload: any) => {
      console.log('🎤 User transcript completed:', payload);
      if (payload && payload.transcript) {
        processItem({
          id: `user_${Date.now()}`,
          type: 'message',
          role: 'user',
          content: payload.transcript,
          timestamp: new Date()
        }, 'input_audio_transcription.completed');
      }
    };

    const handleOutputDelta = (payload: any) => {
      console.log('📝 Output delta:', payload);
      console.log('🔍 AI VOICE DEBUG - Output Delta Event:', {
        eventType: 'response.output_text.delta',
        payload: payload,
        hasDelta: !!(payload && payload.delta),
        deltaLength: payload?.delta?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      if (payload && payload.delta) {
        const aiMessage = {
          id: `ai_delta_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: payload.delta,
          timestamp: new Date(),
          status: 'in_progress'
        };
        
        console.log('🔍 AI VOICE DEBUG - Processing Delta Message:', {
          messageId: aiMessage.id,
          content: aiMessage.content,
          contentLength: aiMessage.content.length,
          isInProgress: true,
          timestamp: aiMessage.timestamp.toISOString()
        });
        
        processItem(aiMessage, 'response.output_text.delta');
      } else {
        console.warn('⚠️ AI VOICE DEBUG - Invalid delta payload:', payload);
      }
    };

    const handleOutputDone = (payload: any) => {
      console.log('✅ Output done:', payload);
      console.log('🔍 AI VOICE DEBUG - Output Done Event:', {
        eventType: 'response.output_text.done',
        payload: payload,
        hasText: !!(payload && payload.text),
        textLength: payload?.text?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      if (payload && payload.text) {
        const aiMessage = {
          id: `ai_done_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: payload.text,
          timestamp: new Date()
        };
        
        console.log('🔍 AI VOICE DEBUG - Processing Done Message:', {
          messageId: aiMessage.id,
          content: aiMessage.content,
          contentLength: aiMessage.content.length,
          isInProgress: false,
          timestamp: aiMessage.timestamp.toISOString()
        });
        
        processItem(aiMessage, 'response.output_text.done');
      } else {
        console.warn('⚠️ AI VOICE DEBUG - Invalid done payload:', payload);
      }
    };

    const handleAudioTranscript = (payload: any) => {
      console.log('🎵 Audio transcript:', payload);
      console.log('🔍 AI VOICE DEBUG - Audio Transcript Event:', {
        eventType: 'response.output_audio.transcript',
        payload: payload,
        hasTranscript: !!(payload && payload.transcript),
        transcriptLength: payload?.transcript?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      if (payload && payload.transcript) {
        const aiMessage = {
          id: `ai_audio_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: payload.transcript,
          timestamp: new Date()
        };
        
        console.log('🔍 AI VOICE DEBUG - Processing Audio Transcript Message:', {
          messageId: aiMessage.id,
          content: aiMessage.content,
          contentLength: aiMessage.content.length,
          timestamp: aiMessage.timestamp.toISOString()
        });
        
        processItem(aiMessage, 'response.output_audio.transcript');
      } else {
        console.warn('⚠️ AI VOICE DEBUG - Invalid audio transcript payload:', payload);
      }
    };

    const handleSpeechStart = (payload: any) => {
      console.log('🔊 Speech started:', payload);
      handleSpeakingStateChange(true);
    };

    const handleSpeechEnd = (payload: any) => {
      console.log('🔇 Speech ended:', payload);
      handleSpeakingStateChange(false);
    };

    // Create cleanup function that can be called from both unmount and session end
    const cleanupEventListeners = () => {
      try {
        if (conversation && typeof conversation.off === 'function') {
          conversation.off('conversation.item.created', handleNewItem);
          // Clean up additional event listeners (with type casting for TypeScript)
          if (conversation.off) {
            (conversation as any).off('input_audio_transcription.completed', handleUserTranscript);
            (conversation as any).off('response.output_text.delta', handleOutputDelta);
            (conversation as any).off('response.output_text.done', handleOutputDone);
            (conversation as any).off('response.output_audio.transcript', handleAudioTranscript);
            (conversation as any).off('response.speech.started', handleSpeechStart);
            (conversation as any).off('response.speech.ended', handleSpeechEnd);
            (conversation as any).off('response.output_audio.delta', handleAudioTranscript);
            (conversation as any).off('response.output_audio.done', handleAudioTranscript);
          }
          console.log('🧹 Event listeners cleaned up successfully');
        } else {
          console.warn('⚠️ Conversation cleanup method not available');
        }
      } catch (error) {
        console.error('❌ Error during event listener cleanup:', error);
      }
    };

    // Register all event listeners
    conversation.on('conversation.item.created', handleNewItem);
    
    // Add back user voice input listeners (with type casting for TypeScript)
    if (conversation.on) {
      (conversation as any).on('input_audio_transcription.completed', handleUserTranscript);
      (conversation as any).on('response.output_text.delta', handleOutputDelta);
      (conversation as any).on('response.output_text.done', handleOutputDone);
      
      // Add audio/speech event listeners for Diya's speech
      (conversation as any).on('response.output_audio.transcript', handleAudioTranscript);
      (conversation as any).on('response.speech.started', handleSpeechStart);
      (conversation as any).on('response.speech.ended', handleSpeechEnd);
      
      // Additional potential audio events
      (conversation as any).on('response.output_audio.delta', handleAudioTranscript);
      (conversation as any).on('response.output_audio.done', handleAudioTranscript);
    }

    // Store cleanup function for use in endSession
    (conversation as any)._cleanupEventListeners = cleanupEventListeners;

    // Cleanup function for component unmount
    return () => {
      cleanupEventListeners();
    };
  }, [conversation]); // Removed handleMessage and handleSpeakingStateChange from dependencies

  return null;
};

export default ConversationEngine;