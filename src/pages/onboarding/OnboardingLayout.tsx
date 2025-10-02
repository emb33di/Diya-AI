import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, MessageSquare, Info, Heart, Lock, Sparkles } from 'lucide-react';
import TranscriptPanel from '@/components/onboarding/TranscriptPanel';
import TopicsAndTips from '@/components/onboarding/TopicsAndTips';
import VoiceSection from '@/components/onboarding/VoiceSection';

interface OnboardingLayoutProps {
  // Expanded view props
  expandedView: boolean;
  sessionStarted: boolean;
  cumulativeSessionTime: number;
  remainingTime: number;
  formatTime: (seconds: number) => string;
  calculateProgressPercentage: () => number;
  showTranscript: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  audioOutputLevel: number;
  isProcessingMetadata: boolean;
  messages: Array<{
    id?: string;
    source: 'ai' | 'user';
    text: string;
    timestamp: Date;
  }>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  transcriptScrollRef: React.RefObject<HTMLDivElement>;
  
  // Landing view props
  onboardingCompleted: boolean;
  isLoadingAgent: boolean;
  agentError: string | null;
  hasStartedOnce: boolean;
  currentSessionNumber: number;
  conversationCompleted: boolean;
  
  // Callbacks
  onEndConversation: () => void;
  onStartConversation: () => void;
  onSetAgentError: (error: string | null) => void;
  onSetShowInfoModal: (show: boolean) => void;
  onSetShowSkipConfirmation: (show: boolean) => void;
  onNavigate: (path: string) => void;
  onClearTranscript: () => void;
  onSetShowTranscript: (show: boolean) => void;
  
  // Topics
  topics: Array<{
    name: string;
    icon: any;
    color: string;
    bgColor: string;
    completed: boolean;
  }>;
}

export const ExpandedViewLayout: React.FC<Pick<OnboardingLayoutProps, 
  'expandedView' | 'sessionStarted' | 'cumulativeSessionTime' | 'remainingTime' | 
  'formatTime' | 'calculateProgressPercentage' | 'showTranscript' | 'isSpeaking' | 
  'audioLevel' | 'audioOutputLevel' | 'isProcessingMetadata' | 'messages' | 
  'messagesEndRef' | 'transcriptScrollRef' | 'onEndConversation' | 'onClearTranscript' | 
  'onSetShowTranscript'
>> = ({
  expandedView,
  sessionStarted,
  cumulativeSessionTime,
  remainingTime,
  formatTime,
  calculateProgressPercentage,
  showTranscript,
  isSpeaking,
  audioLevel,
  audioOutputLevel,
  isProcessingMetadata,
  messages,
  messagesEndRef,
  transcriptScrollRef,
  onEndConversation,
  onClearTranscript,
  onSetShowTranscript
}) => {
  if (!expandedView) return null;

  return (
    <div className="h-screen flex flex-col p-2 md:p-4">
      {(sessionStarted || cumulativeSessionTime > 0) && (
        <div className="mb-4 space-y-2 flex-shrink-0">
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Conversation Time
            </span>
            <span className={`font-mono text-lg font-bold ${remainingTime <= 30 ? 'text-red-500' : remainingTime <= 60 ? 'text-yellow-500' : 'text-green-500'}`}>
              {formatTime(remainingTime)}
            </span>
          </div>
          <Progress value={calculateProgressPercentage()} className={`h-2 ${remainingTime <= 30 ? 'bg-red-100' : remainingTime <= 60 ? 'bg-yellow-100' : ''}`} />
          <div className="text-xs text-muted-foreground text-center">
            {remainingTime <= 30 ? 'Less than 30 seconds remaining' : remainingTime <= 60 ? 'Less than 1 minute remaining' : '2-minute conversation session (testing)'}
          </div>
        </div>
      )}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left: AI Circle (2/3 width) */}
        <div className="lg:col-span-2 bg-background/60 border rounded-xl p-4 md:p-6 flex flex-col items-center justify-center min-h-0">
          <div className="flex-1 w-full flex items-center justify-center min-h-0">
            <VoiceSection
              variant="expanded"
              isListening={sessionStarted}
              isSpeaking={isSpeaking}
              audioLevel={audioLevel}
              audioOutputLevel={audioOutputLevel}
            />
          </div>
          <div className="text-center mt-4 md:mt-6 flex-shrink-0">
            <h3 className="text-lg font-medium">{isSpeaking ? "Diya is speaking..." : "Diya is listening..."}</h3>
            <p className="text-sm text-muted-foreground">Share your thoughts and experiences naturally - just like talking to a friend!</p>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">
                ⚠️ Please do not leave this page until your conversation is complete. Diya needs the full conversation to generate your personalized school list and profile.
              </p>
            </div>
            <div className="flex gap-2 justify-center mt-4">
              <Button onClick={onEndConversation} variant="outline" disabled={isProcessingMetadata} size="sm">
                {isProcessingMetadata ? 'Processing...' : 'End'}
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Transcript (1/3 width) - always shown */}
        <TranscriptPanel
          variant="expanded"
          messages={messages}
          onClear={onClearTranscript}
          endRef={messagesEndRef}
          containerRef={transcriptScrollRef}
        />
      </div>
    </div>
  );
};

export const LandingViewLayout: React.FC<Pick<OnboardingLayoutProps,
  'expandedView' | 'sessionStarted' | 'cumulativeSessionTime' | 'remainingTime' |
  'formatTime' | 'calculateProgressPercentage' | 'onboardingCompleted' | 'isLoadingAgent' |
  'agentError' | 'hasStartedOnce' | 'currentSessionNumber' | 'conversationCompleted' |
  'messages' | 'messagesEndRef' | 'topics' | 'onStartConversation' | 'onSetAgentError' |
  'onSetShowInfoModal' | 'onSetShowSkipConfirmation' | 'onNavigate' | 'isSpeaking' |
  'audioLevel' | 'audioOutputLevel'
>> = ({
  expandedView,
  sessionStarted,
  cumulativeSessionTime,
  remainingTime,
  formatTime,
  calculateProgressPercentage,
  onboardingCompleted,
  isLoadingAgent,
  agentError,
  hasStartedOnce,
  currentSessionNumber,
  conversationCompleted,
  messages,
  messagesEndRef,
  topics,
  onStartConversation,
  onSetAgentError,
  onSetShowInfoModal,
  onSetShowSkipConfirmation,
  onNavigate,
  isSpeaking,
  audioLevel,
  audioOutputLevel
}) => {
  if (expandedView) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Introduction */}
      <div className="text-center space-y-4 py-6">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Meet Diya
            </h1>
          </div>
          <p className="text-xl text-muted-foreground font-medium">Your AI College Counselor</p>
        </div>
      </div>

      {/* Main Conversation Interface */}
      <div className="space-y-6">
        {/* Voice Interface */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timer */}
            {(sessionStarted || cumulativeSessionTime > 0) && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Conversation Time
                  </span>
                  <span className={`font-mono text-lg font-bold ${remainingTime <= 30 ? 'text-red-500' : remainingTime <= 60 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {formatTime(remainingTime)}
                  </span>
                </div>
                <Progress value={calculateProgressPercentage()} className={`h-2 ${remainingTime <= 30 ? 'bg-red-100' : remainingTime <= 60 ? 'bg-yellow-100' : ''}`} />
                <div className="text-xs text-muted-foreground text-center">
                  {remainingTime <= 30 ? 'Less than 30 seconds remaining' : remainingTime <= 60 ? 'Less than 1 minute remaining' : '2-minute conversation session (testing)'}
                </div>
              </div>
            )}
            {/* Voice Orb */}
            <div className="flex justify-center mb-6">
              <VoiceSection
                variant="landing"
                isListening={sessionStarted}
                isSpeaking={isSpeaking}
                audioLevel={audioLevel}
                audioOutputLevel={audioOutputLevel}
                landingOrbSize={160}
              />
            </div>
            
            <div className="space-y-4">
              {isLoadingAgent ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-center">Loading...</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto text-center">
                    Preparing your personalized conversation with Diya.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-center">
                    {onboardingCompleted ? "Congratulations, you have completed your onboarding!" : "Ready to start your journey with Diya?"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto text-center">
                    {!onboardingCompleted && cumulativeSessionTime > 0 ? `You've completed ${Math.floor(cumulativeSessionTime / 60)} minutes. Continue your conversation with Diya to complete your onboarding.` : ''}
                    {!onboardingCompleted && <br />}
                    {!onboardingCompleted && (
                      <span className="font-medium text-primary">
                        {(hasStartedOnce || cumulativeSessionTime > 0 || currentSessionNumber > 1)
                          ? `${Math.max(0, 2 - Math.floor(cumulativeSessionTime / 60))} minutes remaining`
                          : 'Session duration: 2 minutes (testing)'}
                      </span>
                    )}
                  </p>
                  {!onboardingCompleted ? (
                    <>
                      {/* Button Row */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                        <Button 
                          onClick={onStartConversation} 
                          disabled={isLoadingAgent}
                          size="lg"
                        >
                          {isLoadingAgent ? 'Starting...' : "Start Conversation"}
                        </Button>
                        
                        <Button 
                          onClick={() => onSetShowSkipConfirmation(true)} 
                          variant="outline" 
                          size="lg"
                        >
                          Skip Onboarding
                        </Button>
                      </div>
                      
                      {/* Info Text Below */}
                      <div className="mt-4 text-center">
                        <button onClick={() => onSetShowInfoModal(true)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                          <Info className="h-4 w-4" />
                          When to skip onboarding?
                        </button>
                      </div>
                      
                      {agentError && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-700 text-sm">{agentError}</p>
                          <Button 
                            onClick={() => onSetAgentError(null)}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            Try Again
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Button 
                      onClick={() => onNavigate('/profile')} 
                      size="lg" 
                      className="mt-4"
                    >
                      View Profile
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Status */}
            {(sessionStarted || conversationCompleted) && (
              <div className="flex justify-center">
                <Badge variant={sessionStarted ? "default" : "secondary"}>
                  {sessionStarted ? "Chatting with Diya" : "Conversation Complete"}
                </Badge>
              </div>
            )}
            
            {/* Live Transcription */}
            {(sessionStarted || conversationCompleted) && messages.length > 0 && (
              <TranscriptPanel
                variant="compact"
                messages={messages}
                endRef={messagesEndRef}
                conversationCompleted={conversationCompleted}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section with Topics and Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <TopicsAndTips topics={topics} />
      </div>
    </div>
  );
};

export const FooterLayout: React.FC = () => {
  return (
    <div className="mt-16 mb-8 text-center">
      <div className="flex justify-center items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>15-minute conversation</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Heart className="w-4 h-4" />
          <span>Completely personalized</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>Private & Secure</span>
        </div>
      </div>
    </div>
  );
};
