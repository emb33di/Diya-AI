import React, { useEffect, useRef, useCallback } from 'react';
import { useConversation } from '@outspeed/react';
import { supabase } from '@/integrations/supabase/client';
import { OutspeedEvent } from '@/types/outspeed';
import { parseOutspeedMessage, isValidMessageItem, safeCreateTimestamp } from '@/utils/outspeedUtils';
import { OnboardingApiService } from '@/services/onboarding.api';
import { useToast } from '@/components/ui/use-toast';
import { useOnboardingStore, TranscriptMessage } from '@/stores';


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
  const setCumulativeTime = useOnboardingStore(state => state.setCumulativeTime);
  
  // Local refs for this component
  const sessionStartedRef = useRef(false);
  const sessionFinalizedRef = useRef<boolean>(false);
  const calculateProgressPercentageRef = useRef(calculateProgressPercentage);
  const eventListenersSetupRef = useRef(false);
  const conversationInstanceRef = useRef<any>(null);

  // Update refs when values change
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
      // Use Zustand action to start session
      startSession(conversationId);
      
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
      console.log('📝 Unified message received:', message);
      console.log('🔍 MESSAGE TRACKING:', {
        messageId: message?.id,
        messageSource: message?.source,
        messageText: message?.text?.substring(0, 50) + (message?.text?.length > 50 ? '...' : ''),
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
        console.log('🔄 TRANSCRIPT UPDATE - Processing in_progress message:', {
          id: messageId,
          source: message.source,
          textPreview: message.text.substring(0, 50) + (message.text.length > 50 ? '...' : ''),
          textLength: message.text.length,
          totalMessages: messages.length
        });
        
        console.log('🔍 AI VOICE DEBUG - Processing In-Progress Message:', {
          messageId: messageId,
          messageSource: message.source,
          messageText: message.text,
          messageTextLength: message.text.length,
          isAI: message.source === 'ai',
          timestamp: new Date().toISOString()
        });
        
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
        console.log('⏭️ Duplicate message skipped:', messageId, 'Source:', message.source);
        console.log('🔍 AI VOICE DEBUG - Duplicate Message Skipped:', {
          messageId: messageId,
          messageSource: message.source,
          processedIdsCount: processedMessageIds.size
        });
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
      
      console.log('✅ TRANSCRIPT UPDATE - Adding completed message:', {
        id: messageId,
        source: message.source,
        textPreview: message.text.substring(0, 50) + (message.text.length > 50 ? '...' : ''),
        textLength: message.text.length,
        timestamp: completedMessage.timestamp,
        totalMessages: messages.length + 1
      });
      
      // Use Zustand action to add completed message (includes deduplication)
      addCompletedMessage(completedMessage);

      // Mark topics as completed based on conversation flow
      if (message.source === 'ai') {
        const currentProgress = Math.min(calculateProgressPercentageRef.current() + 2, 100);
        const completedCount = Math.floor(currentProgress / 16.67);
        // TODO: Add topics to Zustand store if needed
        console.log('Progress update:', { currentProgress, completedCount });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error, 'Message:', message);
    }
  }, [processedMessageIds, addCompletedMessage, updateInProgressMessage, calculateProgressPercentage]);

  const handleDisconnect = useCallback(async () => {
    console.log('Disconnected from voice agent');

    // Prevent double accounting when pause/end already handled
    let newCumulativeTimeLocal = cumulativeSessionTime;
    if (!sessionFinalizedRef.current && sessionStartTime) {
      const duration = Math.max(0, (new Date().getTime() - sessionStartTime.getTime()) / 1000);
      newCumulativeTimeLocal = cumulativeSessionTime + duration;
      setCumulativeTime(newCumulativeTimeLocal);

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

    // Use Zustand action to end session
    endSession();
    sessionFinalizedRef.current = false;
    
    // Force save transcript before disconnecting
    if (messages.length > 0) {
      console.log('💾 Force saving transcript on disconnect...');
      await forceSaveTranscript();
    }
  }, [cumulativeSessionTime, sessionStartTime, messages, forceSaveTranscript, setCumulativeTime, endSession]);

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
    eventListenersSetupRef.current = false;
    conversationInstanceRef.current = null;
  }, [agentId]);

  useEffect(() => {
    if (agentId && conversation.startSession && !sessionStartedRef.current) {
      console.log('🚀 ConversationEngine: Starting session with agent:', agentId);
      console.log('📊 Session start details:', {
        agentId,
        source,
        hasStartSession: !!conversation.startSession,
        sessionStartedRef: sessionStartedRef.current,
        conversationId: conversationInstanceRef.current?.id || 'unknown',
        timestamp: new Date().toISOString()
      });
      sessionStartedRef.current = true;
      
      try {
        conversation.startSession({ 
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
            silence_duration_ms: 500
          }
        } as any);
        console.log('✅ Session start call completed with transcription enabled');
      } catch (error) {
        console.error('❌ Error starting session:', error);
        sessionStartedRef.current = false; // Reset on error
      }
    }
  }, [agentId, source]); // Remove conversation from dependencies to prevent re-mounting

  // Unified event listeners for conversation output and transcripts (from backup file)
  useEffect(() => {
    // Exit if conversation isn't ready
    if (!conversation) return;
    
    // Always set up event listeners for new conversation instances
    console.log('🔧 Setting up event listeners for conversation:', conversation);
    console.log('🔍 CONVERSATION CAPABILITIES:', {
      hasOn: !!conversation.on,
      hasOff: !!conversation.off,
      hasStartSession: !!conversation.startSession,
      hasEndSession: !!conversation.endSession,
      conversationKeys: Object.keys(conversation),
      eventListenersSetupRef: eventListenersSetupRef.current
    });
    
    // Clean up previous listeners if they exist
    if (eventListenersSetupRef.current && conversationInstanceRef.current) {
      console.log('🧹 Cleaning up previous event listeners...');
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
        console.error('❌ Error cleaning up previous listeners:', error);
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
          ...item
        };

        console.log('🔍 AI VOICE DEBUG - Normalized Item:', {
          normalizedId: normalized.id,
          normalizedRole: normalized.role,
          normalizedContent: normalized.content,
          normalizedContentLength: normalized.content.length,
          normalizedType: normalized.type,
          timestamp: normalized.timestamp instanceof Date ? normalized.timestamp.toISOString() : normalized.timestamp
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

        const parsedMessage = parseOutspeedMessage(normalized, item);
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
      console.log('🎤 USER TRANSCRIPT EVENT:', payload);
      console.log('🔍 USER MESSAGE TRACKING:', {
        hasTranscript: !!(payload && payload.transcript),
        transcriptLength: payload?.transcript?.length || 0,
        transcriptPreview: payload?.transcript?.substring(0, 50) + (payload?.transcript?.length > 50 ? '...' : ''),
        timestamp: new Date().toISOString()
      });
      
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
      console.log('📝 AI DELTA EVENT:', payload);
      console.log('🔍 AI DELTA TRACKING:', {
        eventType: 'response.audio_transcript.delta',
        hasDelta: !!(payload && payload.delta),
        deltaLength: payload?.delta?.length || 0,
        deltaPreview: payload?.delta?.substring(0, 50) + (payload?.delta?.length > 50 ? '...' : ''),
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
        
        processItem(aiMessage, 'response.audio_transcript.delta');
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
        eventType: 'response.audio_transcript.delta',
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
        
        processItem(aiMessage, 'response.audio_transcript.delta');
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
            (conversation as any).off('response.audio_transcript.delta', handleOutputDelta);
            (conversation as any).off('response.output_text.done', handleOutputDone);
            (conversation as any).off('response.audio_transcript.delta', handleAudioTranscript);
            (conversation as any).off('output_audio_buffer.started', handleSpeechStart);
            (conversation as any).off('output_audio_buffer.stopped', handleSpeechEnd);
            (conversation as any).off('response.output_audio.delta', handleAudioTranscript);
            (conversation as any).off('response.output_audio.done', handleAudioTranscript);
            (conversation as any).off('input_audio_buffer.speech_started', () => {});
            (conversation as any).off('input_audio_buffer.speech_stopped', () => {});
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
      // User transcript events
      (conversation as any).on('input_audio_transcription.completed', handleUserTranscript);
      (conversation as any).on('input_audio_transcription.delta', (payload: any) => {
        console.log('🔍 USER TRANSCRIPT DELTA:', payload);
      });
      (conversation as any).on('input_audio_transcription.done', (payload: any) => {
        console.log('🔍 USER TRANSCRIPT DONE:', payload);
      });
      
      // AI response events
      (conversation as any).on('response.audio_transcript.delta', handleOutputDelta);
      (conversation as any).on('response.output_text.done', handleOutputDone);
      (conversation as any).on('response.text.delta', (payload: any) => {
        console.log('🔍 AI TEXT DELTA:', payload);
      });
      (conversation as any).on('response.text.done', (payload: any) => {
        console.log('🔍 AI TEXT DONE:', payload);
      });
      
      // Add audio/speech event listeners for Diya's speech
      (conversation as any).on('response.audio_transcript.delta', handleAudioTranscript);
      (conversation as any).on('output_audio_buffer.started', handleSpeechStart);
      (conversation as any).on('output_audio_buffer.stopped', handleSpeechEnd);
      
      // Additional potential audio events
      (conversation as any).on('response.output_audio.delta', handleAudioTranscript);
      (conversation as any).on('response.output_audio.done', handleAudioTranscript);
      
      
      // Add new listeners for user speech detection
      (conversation as any).on('input_audio_buffer.speech_started', (payload: any) => {
        console.log('🎤 USER SPEECH STARTED:', payload);
        console.log('🔍 USER SPEECH DEBUG:', {
          eventType: 'input_audio_buffer.speech_started',
          hasPayload: !!payload,
          timestamp: new Date().toISOString()
        });
      });
      
      (conversation as any).on('input_audio_buffer.speech_stopped', (payload: any) => {
        console.log('🎤 USER SPEECH STOPPED:', payload);
        console.log('🔍 USER SPEECH DEBUG:', {
          eventType: 'input_audio_buffer.speech_stopped',
          hasPayload: !!payload,
          timestamp: new Date().toISOString()
        });
      });
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