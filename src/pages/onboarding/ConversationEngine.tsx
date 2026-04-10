import React, { useEffect, useRef, useCallback } from 'react';
import { useConversation } from '@outspeed/react';
import { supabase } from '@/integrations/supabase/client';
import { OutspeedEvent } from '@/types/outspeed';
import { parseOutspeedMessage, isValidMessageItem, safeCreateTimestamp } from '@/utils/outspeedUtils';
import { OnboardingApiService } from '@/services/onboarding.api';
import { useToast } from '@/components/ui/use-toast';
import { useOnboardingStore, TranscriptMessage } from '@/stores';
import { analytics } from '@/utils/analytics';
import { useAuthContext } from '@/contexts/AuthContext';


interface ConversationEngineProps {
  agentId: string;
  source: string;
  // Only essential props that can't be managed by Zustand
  calculateProgressPercentage: () => number;
  forceSaveTranscript: () => Promise<void>;
  // Callbacks for parent component
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
  calculateProgressPercentage,
  forceSaveTranscript,
  onConnect,
  onMessage,
  onDisconnect,
  onError,
  onContextRestored,
  onSpeakingStateChange,
  onEndSession,
}: ConversationEngineProps) => {
  const { toast } = useToast();
  const { user } = useAuthContext();
  
  // Zustand store state and actions
  const sessionState = useOnboardingStore(state => state.sessionState);
  const conversationId = useOnboardingStore(state => state.conversationId);
  const sessionStartTime = useOnboardingStore(state => state.sessionStartTime);
  const messages = useOnboardingStore(state => state.messages);
  const processedMessageIds = useOnboardingStore(state => state.processedMessageIds);
  const isSpeaking = useOnboardingStore(state => state.isSpeaking);
  const cumulativeSessionTime = useOnboardingStore(state => state.cumulativeSessionTime);
  
  const startSession = useOnboardingStore(state => state.startSession);
  const endSession = useOnboardingStore(state => state.endSession);
  const addCompletedMessage = useOnboardingStore(state => state.addCompletedMessage);
  const updateInProgressMessage = useOnboardingStore(state => state.updateInProgressMessage);
  const setIsSpeaking = useOnboardingStore(state => state.setIsSpeaking);
  const setConversationReady = useOnboardingStore(state => state.setConversationReady);
  const setCumulativeTime = useOnboardingStore(state => state.setCumulativeTime);
  
  // Local refs for this component
  const sessionStartedRef = useRef(false);
  const sessionFinalizedRef = useRef<boolean>(false);
  const calculateProgressPercentageRef = useRef(calculateProgressPercentage);
  const eventListenersSetupRef = useRef(false);
  const conversationInstanceRef = useRef<any>(null);
  // Prevent duplicate display of the very first assistant intro by skipping
  // response.* events until we've recorded the first assistant message
  const firstAssistantDisplayedRef = useRef<boolean>(false);
  const firstAssistantTextRef = useRef<string | null>(null);
  const firstAssistantIgnoreUntilRef = useRef<number | null>(null);

  // Update refs when values change
  useEffect(() => {
    calculateProgressPercentageRef.current = calculateProgressPercentage;
  }, [calculateProgressPercentage]);

  // Conversation handlers moved from Onboarding.tsx
  const handleConnect = useCallback(async (conversationId: string) => {
    if (sessionState !== 'idle') {
      console.warn('⚠️ Session already started - preventing duplicate session initialization');
      return;
    }
    
    try {
      // Use Zustand action to start session
      startSession(conversationId);
      
      // Track voice conversation start
      analytics.trackVoiceEvent('started', 'onboarding', {
        conversation_id: conversationId,
        agent_id: agentId,
        source: source
      });
      
      // Save conversation tracking using API service
      const userId = user?.id || 'unknown';
      if (user) {
        const response = await OnboardingApiService.saveConversationTracking({
          conversation_id: conversationId,
          user_id: user.id,
          conversation_type: 'onboarding_1',
          conversation_started_at: new Date().toISOString(),
          metadata_retrieved: false
        });
        
        if (!response.success) {
          console.error('❌ CONVERSATION_TRACKING_SAVE_FAILED:', {
            error: response.error,
            userId: user.id,
            conversationId: conversationId,
            agentId: agentId,
            timestamp: new Date().toISOString(),
            message: 'Failed to save conversation tracking to database - user onboarding session may not be properly recorded'
          });
          
          // Track the error
          analytics.trackError('conversation_tracking_save_failed', response.error, {
            conversation_id: conversationId,
            user_id: user.id,
            agent_id: agentId
          });
        }
      }
      
      // Connection successful - no toast needed, UI provides visual feedback
    } catch (error) {
      const userId = user?.id || 'unknown';
      console.error('❌ CONVERSATION_CONNECT_ERROR:', {
        error: error.message,
        userId: user?.id || 'unknown',
        conversationId: conversationId,
        agentId: agentId,
        timestamp: new Date().toISOString(),
        message: 'Critical error during conversation connection - user unable to start onboarding session'
      });
      
      // Track the connection error
      analytics.trackError('conversation_connect_error', error.message, {
        conversation_id: conversationId,
        user_id: user?.id || 'unknown',
        agent_id: agentId,
        source: source
      });
      
      endSession(); // Use Zustand action to end session on error
      toast({
        title: "Connection Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive"
      });
    }
  }, [agentId, toast, sessionState, startSession, endSession]);

  const handleMessage = useCallback(async (message: any) => {
    try {
      // Use the message exactly as parsed by parseOutspeedMessage
      // This ensures consistent ID generation and prevents double processing
      if (!message || !message.id || !message.text || !message.source) {
        const userId = user?.id || 'unknown';
        console.warn('⚠️ MESSAGE_VALIDATION_FAILED:', {
          userId: user?.id || 'unknown',
          messageId: message?.id || 'missing',
          hasText: !!message?.text,
          hasSource: !!message?.source,
          message: 'Received invalid message format - message processing skipped to prevent data corruption',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Use the ID that was already generated by parseOutspeedMessage
      const messageId = message.id;
      
      // Handle in_progress messages differently - they can update existing messages
      if (message.isInProgress) {
        // For in_progress messages, use Zustand action
        const transcriptMessage: TranscriptMessage = {
          id: messageId,
          source: message.source,
          text: message.text,
          timestamp: safeCreateTimestamp(message.timestamp),
          isInProgress: true
        };
        
        updateInProgressMessage(transcriptMessage);
        
        // Don't add to processedMessageIds for in_progress messages
        // as they might be updated later
        return;
      }
      
      // Check deduplication using Zustand store
      if (processedMessageIds.has(messageId)) {
        return;
      }
      
      // Create completed message for Zustand store
      const completedMessage: TranscriptMessage = {
        id: messageId,
        source: message.source,
        text: message.text,
        timestamp: safeCreateTimestamp(message.timestamp),
        isInProgress: false
      };
      
      // Use Zustand action to add completed message (includes deduplication)
      addCompletedMessage(completedMessage);

      // Mark topics as completed based on conversation flow
      if (message.source === 'ai') {
        const currentProgress = Math.min(calculateProgressPercentageRef.current() + 2, 100);
        const completedCount = Math.floor(currentProgress / 16.67);
      }
    } catch (error) {
      const userId = user?.id || 'unknown';
      console.error('❌ MESSAGE_PROCESSING_ERROR:', {
        error: error.message,
        userId: user?.id || 'unknown',
        messageId: message?.id || 'unknown',
        messageSource: message?.source || 'unknown',
        timestamp: new Date().toISOString(),
        message: 'Critical error during message processing - user conversation data may be lost'
      });
    }
  }, [processedMessageIds, addCompletedMessage, updateInProgressMessage, calculateProgressPercentage]);

  const handleDisconnect = useCallback(async () => {
    console.log('Disconnected from voice agent');

    // Track voice conversation end
    const sessionDuration = sessionStartTime ? 
      Math.max(0, (new Date().getTime() - sessionStartTime.getTime()) / 1000) : 0;
    
    analytics.trackVoiceEvent('ended', 'onboarding', {
      conversation_id: conversationId,
      session_duration: sessionDuration,
      messages_count: messages.length,
      agent_id: agentId
    });

    // Prevent double accounting when pause/end already handled
    let newCumulativeTimeLocal = cumulativeSessionTime;
    if (!sessionFinalizedRef.current && sessionStartTime) {
      const duration = Math.max(0, (new Date().getTime() - sessionStartTime.getTime()) / 1000);
      newCumulativeTimeLocal = cumulativeSessionTime + duration;
      setCumulativeTime(newCumulativeTimeLocal);

      // Store cumulative time in database using API service
      try {
        const userId = user?.id || 'unknown';
        if (user) {
          const response = await OnboardingApiService.updateCumulativeOnboardingTime(user.id, newCumulativeTimeLocal);
          if (response.success) {
            console.log('✅ Updated cumulative time:', Math.round(newCumulativeTimeLocal), 'seconds');
          } else {
            console.error('❌ CUMULATIVE_TIME_UPDATE_FAILED:', {
              error: response.error,
              userId: user.id,
              cumulativeTime: newCumulativeTimeLocal,
              sessionDuration: duration,
              timestamp: new Date().toISOString(),
              message: 'Failed to save cumulative onboarding time to database - user progress may not be properly tracked'
            });
            
            // Track the error
            analytics.trackError('cumulative_time_update_failed', response.error, {
              user_id: user.id,
              cumulative_time: newCumulativeTimeLocal,
              session_duration: duration
            });
          }
        }
      } catch (error) {
        const userId = user?.id || 'unknown';
        console.error('❌ CUMULATIVE_TIME_SAVE_ERROR:', {
          error: error.message,
          userId: user?.id || 'unknown',
          cumulativeTime: newCumulativeTimeLocal,
          sessionDuration: duration,
          timestamp: new Date().toISOString(),
          message: 'Critical error saving cumulative session time - user onboarding progress may be lost'
        });
        
        // Track the error
        analytics.trackError('cumulative_time_save_error', error.message, {
          user_id: user?.id || 'unknown',
          cumulative_time: newCumulativeTimeLocal,
          session_duration: duration
        });
      }
    } else {
      console.log('Session already finalized; skipping time accounting.');
    }

    // Use Zustand action to end session
    endSession();
    sessionFinalizedRef.current = false;
    
    // Force save transcript before disconnecting
    if (messages.length > 0) {
      console.log('💾 Force saving transcript on disconnect...');
      await forceSaveTranscript();
      
      // Track transcript save
      analytics.trackVoiceEvent('saved', 'onboarding', {
        conversation_id: conversationId,
        messages_count: messages.length,
        session_duration: sessionDuration
      });
    }
  }, [cumulativeSessionTime, sessionStartTime, messages, forceSaveTranscript, setCumulativeTime, endSession]);

  const handleSpeakingStateChange = useCallback((speaking: boolean) => {
    console.log('🎤 Speaking state changed:', speaking);
    setIsSpeaking(speaking);
  }, [setIsSpeaking]);

  const handleError = useCallback((error: any) => {
    const getUserForError = async () => {
      const userId = user?.id || 'unknown';
      console.error('❌ VOICE_AGENT_ERROR:', {
        error: error.message,
        errorType: typeof error,
        errorStack: error?.stack || 'No stack trace',
        errorName: error?.name || 'Unknown error type',
        userId: user?.id || 'unknown',
        agentId: agentId,
        timestamp: new Date().toISOString(),
        message: 'Critical voice agent error - user conversation may be interrupted or lost'
      });
    };
    getUserForError();
    
    toast({
      title: "Connection Error",
      description: "There was an issue with the voice connection. Please try again.",
      variant: "destructive"
    });
  }, [agentId, toast]);

  const handleContextRestored = useCallback((items: any[]) => {
    console.log('🔄 Context restored with items:', items.length);
    
    // Process the restored messages and add them to Zustand store
    items.forEach((item, index) => {
      // Determine if this is a user or AI message based on the item structure
      const isUserMessage = item.role === 'user' || item.source === 'user';
      
      const restoredMessage: TranscriptMessage = {
        id: `restored_${Date.now()}_${index}`,
        source: isUserMessage ? 'user' : 'ai',
        text: item.content || item.message || item.text || 'Restored message',
        timestamp: safeCreateTimestamp(item.timestamp),
        isInProgress: false
      };
      
      addCompletedMessage(restoredMessage);
    });
    
    toast({
      title: "Session Restored",
      description: `Restored ${items.length} previous messages from your conversation.`
    });
  }, [toast, addCompletedMessage]);

  const conversation = useConversation({
    onConnect: async () => {
      try {
        console.log('🔗 Outspeed onConnect callback triggered');
        const userId = user?.id || 'unknown';
        if (user) {
          const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log('📝 Generated conversation ID:', conversationId);
          
          // Call our new handleConnect with the generated conversationId
          await handleConnect(conversationId);
          
          // Notify parent component about the connection with conversation ID
          onConnect(conversationId);

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
                    const userId = user?.id || 'unknown';
                    console.error('❌ EVENT_CLEANUP_ERROR:', {
                      error: cleanupError.message,
                      userId: user?.id || 'unknown',
                      timestamp: new Date().toISOString(),
                      message: 'Failed to clean up event listeners before session end - may cause memory leaks'
                    });
                  }
                }
                
                await conversation.endSession();
                console.log('✅ Outspeed session ended successfully');
              } catch (error) {
                const userId = user?.id || 'unknown';
                console.error('❌ SESSION_END_ERROR:', {
                  error: error.message,
                  userId: user?.id || 'unknown',
                  timestamp: new Date().toISOString(),
                  message: 'Critical error ending Outspeed session - user may experience connection issues'
                });
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
        const userId = user?.id || 'unknown';
        console.error('❌ CONVERSATION_CREATION_ERROR:', {
          error: error.message,
          userId: user?.id || 'unknown',
          timestamp: new Date().toISOString(),
          message: 'Failed to create conversation record - user onboarding session may not start properly'
        });
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
    eventListenersSetupRef.current = false;
    conversationInstanceRef.current = null;
  }, [agentId]);

  useEffect(() => {
    if (agentId && conversation.startSession && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      
      try {
        const sessionConfig = { 
          agentId, 
          source,
          // Enable live transcription with Whisper-1 model
          input_audio_transcription: {
            model: 'whisper-1'
          },
          // Configure voice activity detection for real-time processing
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 3000
          }
        };
        
        console.log('🚀 Starting session with config:', sessionConfig);
        conversation.startSession(sessionConfig as any);
        console.log('✅ Session start call completed with transcription enabled');
      } catch (error) {
        const getUserForError = async () => {
          const userId = user?.id || 'unknown';
          console.error('❌ SESSION_START_ERROR:', {
            error: error.message,
            userId: user?.id || 'unknown',
            agentId: agentId,
            source: source,
            timestamp: new Date().toISOString(),
            message: 'Failed to start Outspeed session - user onboarding conversation cannot begin'
          });
        };
        getUserForError();
        sessionStartedRef.current = false; // Reset on error
      }
    }
  }, [agentId, source]); // Remove conversation from dependencies to prevent re-mounting

  // Unified event listeners for conversation output and transcripts
  useEffect(() => {
    // Exit if conversation isn't ready
    if (!conversation) return;
    
    // Clean up previous listeners if they exist
    if (eventListenersSetupRef.current && conversationInstanceRef.current) {
      try {
        if (conversationInstanceRef.current && typeof conversationInstanceRef.current.off === 'function') {
          conversationInstanceRef.current.off('conversation.item.created', () => {});
          // Clean up additional event listeners
          if (conversationInstanceRef.current.off) {
            (conversationInstanceRef.current as any).off('input_audio_transcription.completed', () => {});
            (conversationInstanceRef.current as any).off('response.audio_transcript.delta', () => {});
            (conversationInstanceRef.current as any).off('response.output_text.done', () => {});
            (conversationInstanceRef.current as any).off('response.audio_transcript.delta', () => {});
            (conversationInstanceRef.current as any).off('output_audio_buffer.started', () => {});
            (conversationInstanceRef.current as any).off('output_audio_buffer.stopped', () => {});
            (conversationInstanceRef.current as any).off('response.output_audio.delta', () => {});
            (conversationInstanceRef.current as any).off('response.output_audio.done', () => {});
            (conversationInstanceRef.current as any).off('input_audio_buffer.speech_started', () => {});
            (conversationInstanceRef.current as any).off('input_audio_buffer.speech_stopped', () => {});
          }
        }
      } catch (error) {
        const getUserForError = async () => {
          const userId = user?.id || 'unknown';
          console.error('❌ EVENT_LISTENER_CLEANUP_ERROR:', {
            error: error.message,
            userId: user?.id || 'unknown',
            timestamp: new Date().toISOString(),
            message: 'Failed to clean up previous event listeners - may cause memory leaks or duplicate handlers'
          });
        };
        getUserForError();
      }
    }
    
    eventListenersSetupRef.current = true;
    conversationInstanceRef.current = conversation;

    const processItem = (item: any, debugLabel: string) => {
      try {
        if (!item) {
          console.warn(`⚠️ Empty item received for ${debugLabel}`);
          return;
        }

        // Surgical fix: skip assistant response.* events until the first assistant
        // message is captured via conversation.item.created to avoid duplicate intro
        if (debugLabel.startsWith('response.') && !firstAssistantDisplayedRef.current) {
          console.log('⏭️ Skipping initial assistant response from', debugLabel, 'to prevent duplicate intro');
          return;
        }

        // Normalize the item to ensure it has the expected structure
        const normalized = {
          id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: item.type || 'message',
          role: item.role || (item.source === 'user' ? 'user' : 'assistant'),
          content: item.content || item.text || item.message || '',
          ...item
        };

        if (!isValidMessageItem(normalized)) {
          return;
        }

        const parsedMessage = parseOutspeedMessage(normalized, item);
        if (parsedMessage) {
          try {
            // First-message-only dedup window: once the first assistant line is recorded,
            // ignore any additional identical assistant items briefly to prevent double intro
            if (parsedMessage.source === 'ai') {
              const normalizedText = (parsedMessage.text || '').trim();
              if (!firstAssistantDisplayedRef.current) {
                firstAssistantTextRef.current = normalizedText;
                firstAssistantDisplayedRef.current = true;
                firstAssistantIgnoreUntilRef.current = Date.now() + 1500; // ~1.5s window
                console.log('✅ First assistant message recorded via', debugLabel);
              } else if (
                firstAssistantIgnoreUntilRef.current &&
                Date.now() < firstAssistantIgnoreUntilRef.current &&
                firstAssistantTextRef.current &&
                normalizedText === firstAssistantTextRef.current
              ) {
                console.log('⏭️ Ignoring duplicate assistant intro during dedup window from', debugLabel);
                return;
              }
            }
            handleMessage(parsedMessage);
          } catch (messageError) {
            const getUserForError = async () => {
              const userId = user?.id || 'unknown';
              console.error('❌ MESSAGE_CALLBACK_ERROR:', {
                error: messageError.message,
                userId: user?.id || 'unknown',
                messageId: parsedMessage.id,
                messageSource: parsedMessage.source,
                timestamp: new Date().toISOString(),
                message: 'Error in message callback handler - user conversation data may be lost'
              });
            };
            getUserForError();
          }
        } else {
          console.warn('⚠️ Failed to parse message item:', normalized);
        }
      } catch (error) {
        const getUserForError = async () => {
          const userId = user?.id || 'unknown';
          console.error('❌ ITEM_PROCESSING_ERROR:', {
            error: error.message,
            userId: user?.id || 'unknown',
            debugLabel: debugLabel,
            timestamp: new Date().toISOString(),
            message: 'Critical error processing conversation item - user message may be lost'
          });
        };
        getUserForError();
        // Don't throw - continue processing other items
      }
    };

    const handleNewItem = (event: OutspeedEvent) => {
      // Standard created items
      processItem(event.item, 'conversation.item.created');
    };

    const handleUserTranscript = (payload: any) => {
      console.log('🎤 User transcript received:', payload);
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
      console.log('🤖 AI output delta received:', payload);
      if (payload && payload.delta) {
        const aiMessage = {
          id: `ai_delta_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: payload.delta,
          timestamp: new Date(),
          status: 'in_progress'
        };
        
        processItem(aiMessage, 'response.audio_transcript.delta');
      }
    };

    const handleOutputDone = (payload: any) => {
      console.log('✅ AI output done received:', payload);
      if (payload && payload.text) {
        const aiMessage = {
          id: `ai_done_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: payload.text,
          timestamp: new Date()
        };
        
        processItem(aiMessage, 'response.output_text.done');
        
        // Mark conversation as ready after first AI message is completed
        if (!firstAssistantDisplayedRef.current) {
          setConversationReady(true);
          console.log('🎯 Conversation is now ready - first AI message completed');
        }
      }
    };

    const handleAudioTranscript = (payload: any) => {
      console.log('🎵 AI audio transcript received:', payload);
      if (payload && payload.transcript) {
        const aiMessage = {
          id: `ai_audio_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: payload.transcript,
          timestamp: new Date()
        };
        
        processItem(aiMessage, 'response.audio_transcript.delta');
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
            (conversation as any).off('response.audio_transcript.delta', handleOutputDelta);
            (conversation as any).off('response.output_text.done', handleOutputDone);
            (conversation as any).off('output_audio_buffer.started', handleSpeechStart);
            (conversation as any).off('output_audio_buffer.stopped', handleSpeechEnd);
            (conversation as any).off('response.output_audio.delta', handleAudioTranscript);
            (conversation as any).off('response.output_audio.done', handleAudioTranscript);
            (conversation as any).off('input_audio_buffer.speech_started', () => {});
            (conversation as any).off('input_audio_buffer.speech_stopped', () => {});
          }
        }
      } catch (error) {
        const getUserForError = async () => {
          const userId = user?.id || 'unknown';
          console.error('❌ EVENT_LISTENER_CLEANUP_ERROR:', {
            error: error.message,
            userId: user?.id || 'unknown',
            timestamp: new Date().toISOString(),
            message: 'Failed to clean up event listeners during component unmount - may cause memory leaks'
          });
        };
        getUserForError();
      }
    };

    // Register all event listeners
    conversation.on('conversation.item.created', handleNewItem);
    
    // Add back user voice input listeners (with type casting for TypeScript)
    if (conversation.on) {
      console.log('🔧 Setting up event listeners for conversation');
      
      // User transcript events
      (conversation as any).on('input_audio_transcription.completed', handleUserTranscript);
      (conversation as any).on('input_audio_transcription.delta', (payload: any) => {
        console.log('🎤 User transcript delta:', payload);
      });
      (conversation as any).on('input_audio_transcription.done', (payload: any) => {
        console.log('🎤 User transcript done:', payload);
      });
      
      // AI response events
      (conversation as any).on('response.audio_transcript.delta', handleOutputDelta);
      (conversation as any).on('response.output_text.done', handleOutputDone);
      (conversation as any).on('response.text.delta', (payload: any) => {
        console.log('📝 AI text delta:', payload);
      });
      (conversation as any).on('response.text.done', (payload: any) => {
        console.log('📝 AI text done:', payload);
      });
      
      // Add audio/speech event listeners for Diya's speech
      (conversation as any).on('output_audio_buffer.started', handleSpeechStart);
      (conversation as any).on('output_audio_buffer.stopped', handleSpeechEnd);
      
      // Additional potential audio events
      (conversation as any).on('response.output_audio.delta', handleAudioTranscript);
      (conversation as any).on('response.output_audio.done', handleAudioTranscript);
      
      // Add new listeners for user speech detection
      (conversation as any).on('input_audio_buffer.speech_started', (payload: any) => {
        console.log('🎙️ User speech started:', payload);
      });
      (conversation as any).on('input_audio_buffer.speech_stopped', (payload: any) => {
        console.log('🎙️ User speech stopped:', payload);
      });
      
      console.log('✅ All event listeners registered');
    }

    // Store cleanup function for use in endSession
    (conversation as any)._cleanupEventListeners = cleanupEventListeners;

    // Cleanup function for component unmount
    return () => {
      cleanupEventListeners();
    };
  }, [conversation]); // Only depend on conversation object, agentId changes handled by separate useEffect

  return null;
};

export default ConversationEngine;