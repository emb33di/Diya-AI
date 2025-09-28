import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OutspeedAPI } from '@/utils/outspeedAPI';
import { OnboardingApiService } from '@/services/onboarding.api';

interface ConversationFlowProps {
  // State setters
  setExpandedView: (expanded: boolean) => void;
  setAgentId: (agentId: string | null) => void;
  setIsLoadingAgent: (loading: boolean) => void;
  setAgentError: (error: string | null) => void;
  setShowEndConfirmation: (show: boolean) => void;
  setSessionDuration: (duration: number) => void;
  setCumulativeSessionTime: (time: number) => void;
  setRemainingTime: (time: number) => void;
  setSessionFinalizedRef: (finalized: boolean) => void;
  setSessionStartTime: (time: Date | null) => void;
  setShowLoadingModal: (show: boolean) => void;
  setLoadingStep: (step: number) => void;
  setIsProcessingMetadata: (processing: boolean) => void;
  setConversationCompleted: (completed: boolean) => void;
  setShowCompletionPopup: (show: boolean) => void;
  setCurrentSessionNumber: (session: number) => void;
  setShowTranscript: (show: boolean) => void;
  
  // State values
  conversationId: string | null;
  messages: Array<{
    id?: string;
    source: 'ai' | 'user';
    text: string;
    timestamp: Date;
  }>;
  sessionStartTime: Date | null;
  cumulativeSessionTime: number;
  currentSessionNumber: number;
  endSessionFn: (() => Promise<void>) | null;
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  
  // Callbacks
  markOnboardingCompleted: () => Promise<boolean>;
}

export const useConversationFlow = ({
  setExpandedView,
  setAgentId,
  setIsLoadingAgent,
  setAgentError,
  setShowEndConfirmation,
  setSessionDuration,
  setCumulativeSessionTime,
  setRemainingTime,
  setSessionFinalizedRef,
  setSessionStartTime,
  setShowLoadingModal,
  setLoadingStep,
  setIsProcessingMetadata,
  setConversationCompleted,
  setShowCompletionPopup,
  setCurrentSessionNumber,
  setShowTranscript,
  conversationId,
  messages,
  sessionStartTime,
  cumulativeSessionTime,
  currentSessionNumber,
  endSessionFn,
  timerRef,
  markOnboardingCompleted
}: ConversationFlowProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Start conversation using agent-based approach
  const startConversation = useCallback(async () => {
    setIsLoadingAgent(true);
    setAgentError(null);
    
    try {
      // Check if environment variables are set
      if (!import.meta.env.VITE_SUPABASE_URL) {
        console.error('[ONBOARDING_CONFIG_ERROR] Supabase configuration issue:', {
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
        return;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());

      // Expand UI into conversation layout
      setExpandedView(true);

      // Get the appropriate agent ID based on user's applying_to field
      const agentId = await OutspeedAPI.getOnboardingAgentId();
      
      // Set the agent ID to trigger the conversation connection
      setAgentId(agentId);

      // Store session number in localStorage for ConversationUI to use
      localStorage.setItem('current_session_number', currentSessionNumber.toString());

      
    } catch (error) {
      // Get user context for debugging
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'unknown';
      const userEmail = user?.email || 'unknown';
      
      console.error(`[CONVERSATION_START_ERROR] User: ${userId} (${userEmail}) - Failed to start conversation:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      setExpandedView(false);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast({
          title: "Microphone Access Required",
          description: "Please allow microphone access to start your conversation with Diya.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Connection Error",
          description: "Unable to connect to voice agent. Please check your configuration and try again.",
          variant: "destructive"
        });
      }
      setAgentError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingAgent(false);
    }
  }, [toast, setExpandedView, setAgentId, setIsLoadingAgent, setAgentError, currentSessionNumber]);

  const endConversation = useCallback(async () => {
    // Show confirmation popup instead of ending immediately
    setShowEndConfirmation(true);
  }, [setShowEndConfirmation]);

  const endConversationConfirmed = useCallback(async () => {
    try {
      console.log('Ending conversation, current conversationId:', conversationId);
      setExpandedView(false);
      setShowEndConfirmation(false);

      // First, properly end the Outspeed session to stop the agent from speaking
      if (endSessionFn) {
        try {
          await endSessionFn();
        } catch (error) {
          // Get user context for debugging
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id || 'unknown';
          const userEmail = user?.email || 'unknown';
          
          console.error(`[OUTSPEED_SESSION_END_ERROR] User: ${userId} (${userEmail}) - Failed to end Outspeed session:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            conversationId: conversationId || 'unknown',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Wait a moment for the session to fully end before proceeding
      await new Promise(resolve => setTimeout(resolve, 500));


      // Calculate session duration
      const endTime = new Date();
      const duration = sessionStartTime ? Math.max(0, (endTime.getTime() - sessionStartTime.getTime()) / 1000) : 0;
      setSessionDuration(duration);

      // Compute cumulative time and completion
      const newCumulativeTime = cumulativeSessionTime + duration;
      const isSessionComplete = newCumulativeTime >= 120; // Require full 2 minutes (testing)

      // Update conversation record with end time using API service
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && conversationId) {
          const currentTime = new Date().toISOString();
          const response = await OnboardingApiService.updateConversationEndTime(conversationId, currentTime);
          
          if (!response.success) {
            console.error(`[CONVERSATION_TRACKING_ERROR] User: ${user.id} (${user.email}) - Failed to update conversation end time:`, {
              error: response.error,
              conversationId: conversationId,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || 'unknown';
        const userEmail = user?.email || 'unknown';
        
        console.error(`[CONVERSATION_TRACKING_ERROR] User: ${userId} (${userEmail}) - Exception updating conversation tracking:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          conversationId: conversationId || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      // Persist cumulative time immediately using API service
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const response = await OnboardingApiService.updateCumulativeOnboardingTime(user.id, newCumulativeTime);
          if (!response.success) {
            console.error(`[CUMULATIVE_TIME_UPDATE_ERROR] User: ${user.id} (${user.email}) - Failed to update cumulative time:`, {
              error: response.error,
              cumulativeTime: newCumulativeTime,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || 'unknown';
        const userEmail = user?.email || 'unknown';
        
        console.error(`[CUMULATIVE_TIME_UPDATE_ERROR] User: ${userId} (${userEmail}) - Exception updating cumulative session time:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          cumulativeTime: newCumulativeTime,
          timestamp: new Date().toISOString()
        });
      }
      setCumulativeSessionTime(newCumulativeTime);

      // Update remaining time before ending session
      const totalSecondsNeededLocal = 2 * 60; // 2 minutes for testing
      setRemainingTime(Math.max(0, totalSecondsNeededLocal - newCumulativeTime));

      // Prevent double accounting in onDisconnect
      setSessionFinalizedRef(true);
      // Note: Conversation ending is handled by the ConversationUI component

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setSessionStartTime(null);

      // Show loading modal tied to real operations
      setShowLoadingModal(true);
      setLoadingStep(0);

      // Store conversation ID immediately for later metadata retrieval
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && conversationId) {
          // Store conversation ID using API service
          const storeResponse = await OnboardingApiService.storeConversationId(conversationId, user.id, currentSessionNumber);
          if (!storeResponse.success) {
            console.error(`[CONVERSATION_ID_STORAGE_ERROR] User: ${user.id} (${user.email}) - Failed to store conversation ID:`, {
              error: storeResponse.error,
              conversationId: conversationId,
              sessionNumber: currentSessionNumber,
              timestamp: new Date().toISOString()
            });
          }

          // Also store the live transcript locally (for potential fallback)
          if (messages.length > 0) {
            const transcript = messages.map(msg => `${msg.source === 'ai' ? 'Diya' : 'You'}: ${msg.text}`).join('\n');
            localStorage.setItem(`transcript_${conversationId}`, transcript);
          }

          // Step 1: Process metadata using API service
          setIsProcessingMetadata(true);
          let metadataOk = false;
          try {
            const response = await OnboardingApiService.processConversationMetadata(conversationId, user.id, messages);
            metadataOk = response.success;
            
            if (!response.success) {
              console.error(`[METADATA_PROCESSING_ERROR] User: ${user.id} (${user.email}) - Failed to process conversation metadata:`, {
                error: response.error,
                conversationId: conversationId,
                messageCount: messages.length,
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error(`[METADATA_PROCESSING_ERROR] User: ${user.id} (${user.email}) - Exception processing metadata:`, {
              error: error instanceof Error ? error.message : 'Unknown error',
              conversationId: conversationId,
              messageCount: messages.length,
              timestamp: new Date().toISOString()
            });
          } finally {
            setIsProcessingMetadata(false);
          }

          if (!metadataOk) {
            // Do not proceed to recommendations without metadata/transcript
            toast({
              title: "Metadata Unavailable",
              description: "We couldn't retrieve your conversation transcript. Please try again later.",
              variant: "destructive"
            });
            setShowLoadingModal(false);

            // Handle incomplete session UI if needed
            if (!isSessionComplete) {
              const totalMinutesCompleted = Math.floor(newCumulativeTime / 60);
              const minutesRemaining = Math.max(0, 15 - totalMinutesCompleted);
              toast({
                title: "Onboarding Incomplete",
                description: `You've completed ${totalMinutesCompleted} minutes total. Please complete ${minutesRemaining} more minutes to finish onboarding.`,
                variant: "destructive"
              });
              setConversationCompleted(true);
              setShowCompletionPopup(true);
            }
            return;
          }

          // Mark step 1 done
          setLoadingStep(1);

          // Step 2: Extract profile information using API service
          try {
            const response = await OnboardingApiService.extractProfileInformation(conversationId, user.id);
            
            if (response.success && response.data) {
              const profileData = response.data;
              
              toast({
                title: "AI Profile Extraction Complete",
                description: `Profile extracted with ${profileData.confidence_score}% confidence. Ready for your review!`
              });
            } else {
              console.error(`[PROFILE_EXTRACTION_ERROR] User: ${user.id} (${user.email}) - Failed to extract profile information:`, {
                error: response.error,
                conversationId: conversationId,
                timestamp: new Date().toISOString()
              });
              toast({
                title: "Profile Extraction Warning",
                description: response.error || "Could not extract profile information. You can fill it manually.",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error(`[PROFILE_EXTRACTION_ERROR] User: ${user.id} (${user.email}) - Exception extracting profile:`, {
              error: error instanceof Error ? error.message : 'Unknown error',
              conversationId: conversationId,
              timestamp: new Date().toISOString()
            });
            toast({
              title: "Profile Extraction Error",
              description: "Failed to extract profile information. You can fill it manually.",
              variant: "destructive"
            });
          }

          // Step 3: Generate school recommendations using API service
          try {
            const response = await OnboardingApiService.generateSchoolRecommendations(conversationId, user.id);
            
            if (response.success && response.data) {
              toast({
                title: "Recommendations Generated",
                description: `Successfully generated ${response.data.recommendations.length} school recommendations!`
              });
            } else {
              console.error(`[RECOMMENDATIONS_ERROR] User: ${user.id} (${user.email}) - Failed to generate recommendations:`, {
                error: response.error,
                conversationId: conversationId,
                timestamp: new Date().toISOString()
              });
              toast({
                title: "No Recommendations",
                description: response.error || "No recommendations could be generated",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error(`[RECOMMENDATIONS_ERROR] User: ${user.id} (${user.email}) - Exception generating recommendations:`, {
              error: error instanceof Error ? error.message : 'Unknown error',
              conversationId: conversationId,
              timestamp: new Date().toISOString()
            });
            toast({
              title: "Recommendation Error",
              description: "Failed to generate recommendations. You can try again later.",
              variant: "destructive"
            });
          }

          // Mark step 3 done
          setLoadingStep(3);

                      // Mark onboarding as completed (user chose to end anyway)
              const success = await markOnboardingCompleted(false); // Normal completion, not skipped
              if (!success) {
                console.error(`[ONBOARDING_COMPLETION_ERROR] User: ${user.id} (${user.email}) - Failed to mark onboarding as completed:`, {
                  conversationId: conversationId,
                  timestamp: new Date().toISOString()
                });
              }

              // Clear stored context since onboarding is complete
              localStorage.removeItem('previous_onboarding_context');
              localStorage.removeItem('onboarding_remaining_time');

            // Set flag to indicate user is coming from onboarding completion
            localStorage.setItem('onboarding_completion_flow', 'true');
            
            // Navigate to profile page for AI-populated form review
            setShowLoadingModal(false);
            navigate('/profile');
        } else if (user) {
          console.error(`[CONVERSATION_ID_MISSING] User: ${user.id} (${user.email}) - No conversation ID captured during session end:`, {
            timestamp: new Date().toISOString()
          });
          toast({
            title: "Session Error",
            description: "Unable to save your session. Please try again.",
            variant: "destructive"
          });
          setShowLoadingModal(false);
        }
      } catch (error) {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || 'unknown';
        const userEmail = user?.email || 'unknown';
        
        console.error(`[CONVERSATION_STORAGE_ERROR] User: ${userId} (${userEmail}) - Exception storing conversation data:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          conversationId: conversationId || 'unknown',
          timestamp: new Date().toISOString()
        });
        setShowLoadingModal(false);
      }
      setConversationCompleted(true);
    } catch (error) {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'unknown';
      const userEmail = user?.email || 'unknown';
      
      console.error(`[CONVERSATION_END_ERROR] User: ${userId} (${userEmail}) - Failed to end conversation:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: conversationId || 'unknown',
        timestamp: new Date().toISOString()
      });
      setShowLoadingModal(false);
      setConversationCompleted(true);
      setShowCompletionPopup(true);
      toast({
        title: "Session Error",
        description: "There was an error ending your session. Please try again.",
        variant: "destructive"
      });
    }
  }, [
    conversationId, 
    messages, 
    toast, 
    navigate, 
    sessionStartTime, 
    markOnboardingCompleted, 
    cumulativeSessionTime, 
    currentSessionNumber, 
    endSessionFn,
    setExpandedView,
    setShowEndConfirmation,
    setSessionDuration,
    setCumulativeSessionTime,
    setRemainingTime,
    setSessionFinalizedRef,
    setSessionStartTime,
    setShowLoadingModal,
    setLoadingStep,
    setIsProcessingMetadata,
    setConversationCompleted,
    setShowCompletionPopup,
    timerRef
  ]);
  
  // End conversation when timer expires
  const endConversationWithMessage = useCallback(async () => {
    try {
      // Simply end the conversation
      await endConversationConfirmed();
      
      // Show completion popup with custom message
      setShowCompletionPopup(true);
      
    } catch (error) {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'unknown';
      const userEmail = user?.email || 'unknown';
      
      console.error(`[TIMER_EXPIRATION_ERROR] User: ${userId} (${userEmail}) - Failed to end conversation on timer expiration:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: conversationId || 'unknown',
        timestamp: new Date().toISOString()
      });
    }
  }, [endConversationConfirmed, setShowCompletionPopup, conversationId]);
  
  return {
    startConversation,
    endConversation,
    endConversationConfirmed,
    endConversationWithMessage
  };
};
