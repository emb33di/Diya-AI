import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, User, Sparkles, CheckCircle, MessageSquare, Target, Lightbulb, Heart, BookOpen, Briefcase, Trophy, Users, GraduationCap, DollarSign, X, Loader2, Clock, Info, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import GradientBackground from '@/components/GradientBackground';
import { supabase } from '@/integrations/supabase/client';
import { OutspeedAPI } from '@/utils/outspeedAPI';
import { ConversationStorage } from '@/utils/conversationStorage';
import { SchoolRecommendationService } from '@/services/schoolRecommendationService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MessagePersistenceService, ConversationMessage } from '@/services/messagePersistenceService';
import { useTranscriptSaver } from '@/hooks/useTranscriptSaver';
import ConversationEngine from '@/pages/onboarding/ConversationEngine';
import LoadingModal from '@/components/onboarding/modals/LoadingModal';
import CompletionPopup from '@/components/onboarding/modals/CompletionPopup';
import InfoModal from '@/components/onboarding/modals/InfoModal';
import SkipConfirmationDialog from '@/components/onboarding/modals/SkipConfirmationDialog';
import RefreshWarningModal from '@/components/onboarding/modals/RefreshWarningModal';
import EndConfirmationModal from '@/components/onboarding/modals/EndConfirmationModal';
import TranscriptPanel from '@/components/onboarding/TranscriptPanel';
import TopicsAndTips from '@/components/onboarding/TopicsAndTips';
import VoiceSection from '@/components/onboarding/VoiceSection';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { OnboardingApiService } from '@/services/onboarding.api';
import { useConversationFlow } from '@/pages/onboarding/ConversationFlow';
import { useOnboardingInitialization } from '@/pages/onboarding/OnboardingInitialization';
import { ExpandedViewLayout, LandingViewLayout, FooterLayout } from '@/pages/onboarding/OnboardingLayout';
import { useOnboardingStore } from '@/stores';
// Simplified MVP approach - removed complex race condition systems
// Debug: Log environment variables (remove in production)
console.log('Environment check:', {
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  supabaseUrlLength: import.meta.env.VITE_SUPABASE_URL?.length || 0
});

 

const Onboarding = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    onboardingCompleted,
    loading: onboardingLoading,
    markOnboardingCompleted
  } = useAuth();
  
  // Use the onboarding state hook for UI-specific state
  const onboardingState = useOnboardingState();
  const {
    remainingTime,
    setRemainingTime,
    sessionDuration,
    setSessionDuration,
    cumulativeSessionTime,
    setCumulativeSessionTime,
    expandedView,
    setExpandedView,
    showTranscript,
    setShowTranscript,
    voiceOrbSize,
    landingOrbSize,
    audioLevel,
    setAudioLevel,
    audioOutputLevel,
    setAudioOutputLevel,
    frequencyData,
    setFrequencyData,
    audioContextRef,
    analyserRef,
    microphoneRef,
    micStreamRef,
    messagesEndRef,
    transcriptScrollRef,
    topics,
    setTopics,
    formatTime,
    persistRemainingTime,
    calculateProgressPercentage,
    timerRef
  } = onboardingState;
  
  // Zustand store state and actions
  const sessionState = useOnboardingStore(state => state.sessionState);
  const sessionStarted = useOnboardingStore(state => state.sessionState === 'active');
  const sessionStartTime = useOnboardingStore(state => state.sessionStartTime);
  const messages = useOnboardingStore(state => state.messages);
  const processedMessageIds = useOnboardingStore(state => state.processedMessageIds);
  const isSpeaking = useOnboardingStore(state => state.isSpeaking);
  const conversationId = useOnboardingStore(state => state.conversationId);
  
  // Derived state
  const hasStartedOnce = sessionStartTime !== null;
  
  const startSession = useOnboardingStore(state => state.startSession);
  const endSession = useOnboardingStore(state => state.endSession);
  const resetConversation = useOnboardingStore(state => state.resetConversation);
  
  // Local state not handled by Zustand or the hook
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [conversationCompleted, setConversationCompleted] = useState(false);
  const [isProcessingMetadata, setIsProcessingMetadata] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [showRefreshWarning, setShowRefreshWarning] = useState(false);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [currentSessionNumber, setCurrentSessionNumber] = useState(1);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingMessages] = useState(["Retrieving conversation metadata", "Extracting profile information", "Generating recommendations"]);
  const [isSaving, setIsSaving] = useState(false);
  const [endSessionFn, setEndSessionFn] = useState<(() => Promise<void>) | null>(null);
  
  // Local refs for this component
  const sessionFinalizedRef = useRef<boolean>(false);
  
  // Initialize transcript saver hook for automatic message persistence
  const { forceSaveTranscript } = useTranscriptSaver(
    messages,
    conversationId,
    'onboarding',
    500 // 500ms debounce delay
  );

  // Initialize conversation flow hook
  const {
    startConversation,
    endConversation,
    endConversationConfirmed,
    endConversationWithMessage
  } = useConversationFlow({
    setExpandedView,
    setAgentId,
    setIsLoadingAgent,
    setAgentError,
    setShowEndConfirmation,
    setSessionDuration,
    setCumulativeSessionTime,
    setRemainingTime,
    setSessionFinalizedRef: (finalized) => { sessionFinalizedRef.current = finalized; },
    setSessionStartTime: () => {}, // Placeholder - session time is managed by Zustand
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
  });

  // Initialize onboarding initialization hook
  const { getPreviousSessionContext } = useOnboardingInitialization({
    setStudentName,
    setLoading,
    setCumulativeSessionTime,
    setRemainingTime,
    setCurrentSessionNumber
  });






  // Function to clear transcript from UI only
  const handleClearTranscript = useCallback(() => {
    resetConversation();
    // Note: This only clears the UI, backend data remains intact
  }, [resetConversation]);



  // Detect page refresh and show warning if onboarding is incomplete
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sessionStarted && !conversationCompleted) {
        e.preventDefault();
        e.returnValue = 'Your onboarding call is in progress. If you leave now, Diya cannot generate a school list and profile for you.';
        return 'Your onboarding call is in progress. If you leave now, Diya cannot generate a school list and profile for you.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionStarted, conversationCompleted]);

  // Check if user refreshed during an active session
  useEffect(() => {
    if (!loading && !onboardingCompleted) {
      // Check if there was an active session before refresh
      const wasSessionActive = sessionStorage.getItem('onboarding_session_active');
      if (wasSessionActive === 'true') {
        setShowRefreshWarning(true);
        // Clear the flag
        sessionStorage.removeItem('onboarding_session_active');
      }
    }
  }, [loading, onboardingCompleted]);

  // Mark session as active when it starts
  useEffect(() => {
    if (sessionStarted) {
      sessionStorage.setItem('onboarding_session_active', 'true');
    } else if (conversationCompleted) {
      sessionStorage.removeItem('onboarding_session_active');
    }
  }, [sessionStarted, conversationCompleted]);

  // Debug useConversation hook initialization
  useEffect(() => {
    console.log('🚀 useConversation hook initialized:', {
      agentId: agentId ? 'Set' : 'Not set',
      timestamp: new Date().toISOString()
    });
  }, [agentId]);

  // Conversation handlers are now in ConversationEngine.tsx

  // Debug conversation state changes
  useEffect(() => {
    console.log('🔄 Conversation state changed:', {
      conversationId: conversationId,
      sessionStarted: sessionStarted,
      agentId: agentId ? 'Set' : 'Not set',
      messagesCount: messages.length,
      expandedView: expandedView,
      timestamp: new Date().toISOString()
    });
  }, [conversationId, sessionStarted, agentId, messages.length, expandedView]);

  // Debug messages changes
  useEffect(() => {
    if (messages.length > 0) {
      console.log('📝 Messages updated in main component:', {
        count: messages.length,
        latestMessage: messages[messages.length - 1],
        allMessages: messages.map(m => ({ id: m.id, source: m.source, textLength: m.text.length }))
      });
    }
  }, [messages]);

  // Debug agentId changes
  useEffect(() => {
    console.log('🔑 AgentId changed:', {
      hasAgentId: !!agentId,
      agentIdLength: agentId?.length || 0,
      agentIdPreview: agentId ? `${agentId.substring(0, 20)}...` : 'null',
      timestamp: new Date().toISOString()
    });
    
    // Note: useConversation hook will start session when agentId is provided
    // The ConversationUI component handles the startSession call
  }, [agentId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (expandedView && transcriptScrollRef.current) {
      // Use the scroll container for better control in expanded view
      const scrollContainer = transcriptScrollRef.current;
      const scrollToBottom = () => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      };
      
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(scrollToBottom);
    } else if (messagesEndRef.current) {
      // Fallback for non-expanded view
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [messages, expandedView]);


  // Redirect users who have already completed onboarding
  useEffect(() => {
    if (!onboardingLoading && onboardingCompleted) {
      console.log('User has already completed onboarding, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [onboardingCompleted, onboardingLoading, navigate]);





  
  
  // Timer effect - fixed to work with the hook's setRemainingTime
  useEffect(() => {
    if (sessionStarted && remainingTime > 0) {
      timerRef.current = setInterval(() => {
        if (remainingTime <= 1) {
          // Time's up - send ending message and automatically end conversation
          endConversationWithMessage();
          setRemainingTime(0);
        } else {
          const newTime = remainingTime - 1;
          setRemainingTime(newTime);
          persistRemainingTime(newTime);
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionStarted, remainingTime, persistRemainingTime, endConversationWithMessage]);
  
  // Show loading state while checking onboarding status
  if (onboardingLoading) {
    return (
      <GradientBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      {/* 4. CRITICAL: Only render the ConversationEngine when you have an agent ID */}
      {agentId && (
        <ConversationEngine
          agentId={agentId}
          source="diya-onboarding"
          calculateProgressPercentage={calculateProgressPercentage}
          forceSaveTranscript={async () => { await forceSaveTranscript(); }}
          // Callbacks - these are handled internally by ConversationEngine
          onConnect={(conversationId: string) => {
            console.log('🔗 Conversation connected with ID:', conversationId);
            // The conversation ID is already managed by the Zustand store
          }}
          onMessage={() => {}}
          onDisconnect={() => {}}
          onError={() => {}}
          onContextRestored={() => {}}
          onSpeakingStateChange={() => {}}
          onEndSession={setEndSessionFn}
        />
      )}
        <ExpandedViewLayout
          expandedView={expandedView}
          sessionStarted={sessionStarted}
          cumulativeSessionTime={cumulativeSessionTime}
          remainingTime={remainingTime}
          formatTime={formatTime}
          calculateProgressPercentage={calculateProgressPercentage}
          showTranscript={showTranscript}
          isSpeaking={isSpeaking}
          audioLevel={audioLevel}
          audioOutputLevel={audioOutputLevel}
          isProcessingMetadata={isProcessingMetadata}
          messages={messages}
          messagesEndRef={messagesEndRef}
          transcriptScrollRef={transcriptScrollRef}
          onEndConversation={endConversation}
          onClearTranscript={handleClearTranscript}
          onSetShowTranscript={setShowTranscript}
        />

        <LandingViewLayout
          expandedView={expandedView}
          sessionStarted={sessionStarted}
          cumulativeSessionTime={cumulativeSessionTime}
          remainingTime={remainingTime}
          formatTime={formatTime}
          calculateProgressPercentage={calculateProgressPercentage}
          onboardingCompleted={onboardingCompleted}
          isLoadingAgent={isLoadingAgent}
          agentError={agentError}
          hasStartedOnce={hasStartedOnce}
          currentSessionNumber={currentSessionNumber}
          conversationCompleted={conversationCompleted}
          messages={messages}
          messagesEndRef={messagesEndRef}
          topics={topics}
          onStartConversation={startConversation}
          onSetAgentError={setAgentError}
          onSetShowInfoModal={setShowInfoModal}
          onSetShowSkipConfirmation={setShowSkipConfirmation}
          onNavigate={navigate}
          isSpeaking={isSpeaking}
          audioLevel={audioLevel}
          audioOutputLevel={audioOutputLevel}
        />

        {/* Loading Modal Overlay */}
        <LoadingModal open={showLoadingModal} messages={loadingMessages} step={loadingStep} />

        {/* Completion Popup Overlay */}
        <CompletionPopup
          open={showCompletionPopup}
          onClose={() => {
            setShowCompletionPopup(false);
          }}
          onContinueProfile={() => {
            setShowCompletionPopup(false);
            endSession(); // Use Zustand action to end session
            setConversationCompleted(false);
            setRemainingTime(2 * 60);
            resetConversation(); // Use Zustand action to reset conversation
            setSessionDuration(0);
          }}
          onGoToDashboard={() => navigate('/dashboard')}
        />

        {/* Info Modal */}
        <InfoModal open={showInfoModal} onClose={() => setShowInfoModal(false)} />
  
        {/* Skip Confirmation Modal */}
        <SkipConfirmationDialog
          open={showSkipConfirmation}
          onOpenChange={setShowSkipConfirmation}
          onCancel={() => setShowSkipConfirmation(false)}
          onConfirm={async () => {
            setShowSkipConfirmation(false);
            const success = await markOnboardingCompleted(true); // Pass true to indicate user skipped onboarding
            if (success) {
              localStorage.removeItem('onboarding_remaining_time');
              localStorage.removeItem('previous_onboarding_context');
              navigate('/schools');
            } else {
              console.error('[ONBOARDING_COMPLETION_ERROR] Failed to mark onboarding complete:', {
                userId: user?.id,
                timestamp: new Date().toISOString(),
                error: 'Failed to mark onboarding as complete'
              });
            }
          }}
        />

        {/* Refresh Warning Modal */}
        <RefreshWarningModal
          open={showRefreshWarning}
          onStartNewCall={() => {
            setShowRefreshWarning(false);
            startConversation();
          }}
          onGoToDashboard={() => {
            setShowRefreshWarning(false);
            navigate('/dashboard');
          }}
          onClose={() => setShowRefreshWarning(false)}
        />

        {/* End Confirmation Modal */}
        <EndConfirmationModal
          open={showEndConfirmation}
          onKeepChatting={() => setShowEndConfirmation(false)}
          onEndAnyway={endConversationConfirmed}
        />
        <FooterLayout />
    </GradientBackground>
  );
};

export default Onboarding;