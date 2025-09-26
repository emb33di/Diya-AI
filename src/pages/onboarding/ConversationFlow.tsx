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
        toast({
          title: "Configuration Error",
          description: "Supabase is not properly configured. Please check your environment variables.",
          variant: "destructive"
        });
        return;
      }

      // Debug WebRTC support
      console.log('🔍 WebRTC Debug Info:');
      console.log('- WebRTC supported:', !!window.RTCPeerConnection);
      console.log('- getUserMedia supported:', !!navigator.mediaDevices?.getUserMedia);
      console.log('- MediaDevices available:', !!navigator.mediaDevices);
      console.log('- User agent:', navigator.userAgent);

      // Request microphone access
      console.log('🎤 Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      console.log('✅ Microphone access granted:', {
        streamId: stream.id,
        tracks: stream.getTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      });
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      console.log('🛑 Microphone stream stopped (permission test complete)');

      // Expand UI into conversation layout
      setExpandedView(true);

      // Get the appropriate agent ID based on user's applying_to field
      const agentId = await OutspeedAPI.getOnboardingAgentId();
      console.log('🚀 Starting Outspeed conversation with agent:', agentId);
      
      // Set the agent ID to trigger the conversation connection
      setAgentId(agentId);
      console.log('✅ Agent ID set:', agentId);

      // Store session number in localStorage for ConversationUI to use
      localStorage.setItem('current_session_number', currentSessionNumber.toString());

      
    } catch (error) {
      console.error('Error starting conversation:', error);
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
          console.log('🛑 Ending Outspeed session...');
          await endSessionFn();
          console.log('✅ Outspeed session ended successfully');
        } catch (error) {
          console.error('Error ending Outspeed session:', error);
        }
      }

      // Wait a moment for the session to fully end before proceeding
      await new Promise(resolve => setTimeout(resolve, 500));


      // Calculate session duration
      const endTime = new Date();
      const duration = sessionStartTime ? Math.max(0, (endTime.getTime() - sessionStartTime.getTime()) / 1000) : 0;
      setSessionDuration(duration);
      console.log('Final session duration:', duration, 'seconds');

      // Compute cumulative time and completion
      const newCumulativeTime = cumulativeSessionTime + duration;
      const isSessionComplete = newCumulativeTime >= 120; // Require full 2 minutes (testing)

      // Update conversation record with end time using API service
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && conversationId) {
          const currentTime = new Date().toISOString();
          const response = await OnboardingApiService.updateConversationEndTime(conversationId, currentTime);
          
          if (response.success) {
            console.log('✅ Updated conversation record with end time:', currentTime);
          } else {
            console.error('Error updating conversation tracking:', response.error);
          }
        }
      } catch (error) {
        console.error('Error updating conversation tracking:', error);
      }

      // Persist cumulative time immediately using API service
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const response = await OnboardingApiService.updateCumulativeOnboardingTime(user.id, newCumulativeTime);
          if (response.success) {
            console.log('✅ End: Updated cumulative time in database:', Math.round(newCumulativeTime), 'seconds');
          } else {
            console.error('Failed to update cumulative time:', response.error);
          }
        }
      } catch (error) {
        console.error('Error updating cumulative session time (end):', error);
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
          console.log('Storing conversation ID for later retrieval:', conversationId);

          // Store conversation ID using API service
          const storeResponse = await OnboardingApiService.storeConversationId(conversationId, user.id, currentSessionNumber);
          if (!storeResponse.success) {
            console.error('Failed to store conversation ID:', storeResponse.error);
          }

          // Also store the live transcript locally (for potential fallback)
          if (messages.length > 0) {
            const transcript = messages.map(msg => `${msg.source === 'ai' ? 'Diya' : 'You'}: ${msg.text}`).join('\n');
            console.log('Live transcript captured:', transcript);
            localStorage.setItem(`transcript_${conversationId}`, transcript);
          }
          console.log('Conversation ID captured:', conversationId);
          console.log('User ID:', user.id);

          // Step 1: Process metadata using API service
          setIsProcessingMetadata(true);
          let metadataOk = false;
          try {
            console.log('📝 Processing conversation metadata...');
            const response = await OnboardingApiService.processConversationMetadata(conversationId, user.id, messages);
            metadataOk = response.success;
            
            if (response.success) {
              console.log('✅ Metadata processed successfully');
            } else {
              console.error('❌ Error processing metadata:', response.error);
            }
          } catch (error) {
            console.error('❌ Error processing metadata:', error);
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
            console.log('👤 Extracting profile information from conversation:', conversationId);
            const response = await OnboardingApiService.extractProfileInformation(conversationId, user.id);
            
            if (response.success && response.data) {
              const profileData = response.data;
              console.log('✅ Enhanced profile information extracted successfully');
              console.log('Confidence Score:', profileData.confidence_score);
              console.log('Fields Extracted:', profileData.fields_extracted?.length);
              console.log('Fields Missing:', profileData.fields_missing?.length);
              
              toast({
                title: "AI Profile Extraction Complete",
                description: `Profile extracted with ${profileData.confidence_score}% confidence. Ready for your review!`
              });
            } else {
              console.log('❌ Enhanced profile extraction failed:', response.error);
              toast({
                title: "Profile Extraction Warning",
                description: response.error || "Could not extract profile information. You can fill it manually.",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('❌ Error extracting profile:', error);
            toast({
              title: "Profile Extraction Error",
              description: "Failed to extract profile information. You can fill it manually.",
              variant: "destructive"
            });
          }

          // Step 3: Generate school recommendations using API service
          try {
            console.log('🎓 Generating school recommendations for conversation:', conversationId);
            const response = await OnboardingApiService.generateSchoolRecommendations(conversationId, user.id);
            
            if (response.success && response.data) {
              console.log('✅ Generated recommendations:', response.data.recommendations.length);
              toast({
                title: "Recommendations Generated",
                description: `Successfully generated ${response.data.recommendations.length} school recommendations!`
              });
            } else {
              console.log('❌ No recommendations generated:', response.error);
              toast({
                title: "No Recommendations",
                description: response.error || "No recommendations could be generated",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('❌ Error generating recommendations:', error);
            toast({
              title: "Recommendation Error",
              description: "Failed to generate recommendations. You can try again later.",
              variant: "destructive"
            });
          }

          // Mark step 3 done
          setLoadingStep(3);

                      // Mark onboarding as completed (user chose to end anyway)
              const success = await markOnboardingCompleted();
              if (!success) {
                console.error('Failed to mark onboarding as completed');
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
          console.warn('No conversation ID captured');
          toast({
            title: "Session Error",
            description: "Unable to save your session. Please try again.",
            variant: "destructive"
          });
          setShowLoadingModal(false);
        }
      } catch (error) {
        console.error('Error storing conversation ID:', error);
        setShowLoadingModal(false);
      }
      setConversationCompleted(true);
    } catch (error) {
      console.error('Error ending conversation:', error);
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
      console.log('⏰ Timer expired - ending conversation');
      
      // Simply end the conversation
      await endConversationConfirmed();
      
      // Show completion popup with custom message
      setShowCompletionPopup(true);
      
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  }, [endConversationConfirmed, setShowCompletionPopup]);
  
  return {
    startConversation,
    endConversation,
    endConversationConfirmed,
    endConversationWithMessage
  };
};
