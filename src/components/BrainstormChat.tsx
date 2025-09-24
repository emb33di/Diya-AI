import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, MessageSquare, Mic, User, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getUserDisplayName, fetchUserProfileData } from "@/utils/userNameUtils";
import { useConversation } from '@outspeed/react';
import VoiceOrb from "@/components/VoiceOrb";
import { ConversationProcessingService } from "@/services/conversationProcessingService";
import { MessagePersistenceService, ConversationMessage } from '@/services/messagePersistenceService';
import { useTranscriptSaver } from '@/hooks/useTranscriptSaver';

interface BrainstormSummary {
  key_themes: string[];
  personal_stories: string[];
  essay_angles: string[];
  writing_prompts: string[];
  structure_suggestions: string[];
}

interface BrainstormChatProps {
  essayTitle: string;
  essayPrompt: string;
  targetCollege: string; // Add target college prop
  onBack: () => void;
  onSummaryGenerated: (summary: BrainstormSummary) => void;
}

const BrainstormChat = ({ essayTitle, essayPrompt, targetCollege, onBack, onSummaryGenerated }: BrainstormChatProps) => {
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [studentName, setStudentName] = useState<string>('');
  const [onboardingTranscript, setOnboardingTranscript] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // NOTE: messageOrder state removed - no longer needed with Outspeed API approach
  const [audioLevel, setAudioLevel] = useState(0);
  const [showFullScreenChat, setShowFullScreenChat] = useState(false);
  const [messages, setMessages] = useState<Array<{
    source: 'ai' | 'user';
    text: string;
    timestamp: Date;
  }>>([]);
  const { toast } = useToast();

  // Initialize transcript saver hook for automatic message persistence
  const { forceSaveTranscript } = useTranscriptSaver(
    messages,
    conversationId,
    'brainstorming',
    500 // 500ms debounce delay
  );

  // Audio analysis refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  
  // Enhanced audio state
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(64));
  const [audioOutputLevel, setAudioOutputLevel] = useState(0);
  
  // Stable references for callbacks to prevent recreation
  const sessionStartedRef = useRef(sessionStarted);
  const showFullScreenChatRef = useRef(showFullScreenChat);
  const conversationIdRef = useRef(conversationId);
  const messagesRef = useRef(messages);
  const sessionStartTimeRef = useRef<Date | null>(null);
  
  // Update refs when state changes
  useEffect(() => {
    sessionStartedRef.current = sessionStarted;
    showFullScreenChatRef.current = showFullScreenChat;
    conversationIdRef.current = conversationId;
    messagesRef.current = messages;
  });

  // Initialize Outspeed API
  useEffect(() => {
    OutspeedAPI.initialize(import.meta.env.VITE_SUPABASE_URL);
  }, []);

  // Outspeed React SDK integration
  const conversation = useConversation({
    onConnect: async () => {
      console.log('🔗 Connected to Outspeed voice agent');
      console.log('📊 Current state before connect:', { sessionStarted: sessionStartedRef.current, showFullScreenChat: showFullScreenChatRef.current, messagesCount: messagesRef.current.length });
      sessionStartTimeRef.current = new Date();
      setSessionStarted(true);
      setShowFullScreenChat(true);
      startAudioAnalysis();
      // Clear previous messages
      setMessages([]);
      console.log('✅ States updated after connect');
    },
    onDisconnect: async () => {
      console.log('🔌 Disconnected from voice agent');
      console.log('📊 State at disconnect:', { sessionStarted: sessionStartedRef.current, showFullScreenChat: showFullScreenChatRef.current, conversationId: conversationIdRef.current, messagesCount: messagesRef.current.length });
      console.log('🔍 Disconnect reason - checking if this was intentional...');
      console.log('⏱️ Session duration:', Date.now() - (sessionStartTimeRef.current?.getTime() || Date.now()), 'ms');
      
      setSessionStarted(false);
      setShowFullScreenChat(false);
      
      // Force save transcript before clearing conversation ID
      if (messagesRef.current.length > 0) {
        console.log('💾 Force saving transcript on disconnect...');
        await forceSaveTranscript();
      }
      
      setConversationId(null);
      setMessages([]);
      stopAudioAnalysis();
      
      // Note: conversationId might be null here if manually ended
      if (conversationIdRef.current) {
        console.log('📝 Generating summary for conversation:', conversationIdRef.current);
        generateSummaryFromConversation(conversationIdRef.current);
      } else {
        console.log('⚠️ No conversation ID available for summary generation');
      }
    },
    onError: (error) => {
      console.error('Outspeed error:', error);
      setConnectionError(error.toString());
    },
    onMessage: async (message: any) => {
      console.log('🎯 AI Message received:', message);
      console.log('📊 Message received at:', new Date().toISOString());
      
      // Add message to conversation transcript
      if (message.message && typeof message.message === 'string') {
        const newMessage = {
          source: (message.source || 'ai') as 'ai' | 'user',
          text: message.message,
          timestamp: new Date()
        };
        
        // Update local state
        setMessages(prev => {
          const newMessages = [...prev, newMessage];
          console.log('📝 Updated messages array:', newMessages.length, 'messages');
          return newMessages;
        });
        
        // NOTE: Real-time message storage removed - will use Outspeed API instead
      } else {
        console.log('⚠️ AI message missing or invalid:', message);
      }
    },
    onUserSpeech: async (speech: any) => {
      console.log('🎤 User speech detected:', speech);
      
      // Add user speech to transcript if we have the text
      if (speech.text && typeof speech.text === 'string') {
        const newMessage = {
          source: 'user' as const,
          text: speech.text,
          timestamp: new Date()
        };
        
        // Update local state
        setMessages(prev => {
          const newMessages = [...prev, newMessage];
          console.log('📝 Updated messages array:', newMessages.length, 'messages');
          return newMessages;
        });
        
        // NOTE: Real-time message storage removed - will use Outspeed API instead
      } else {
        console.log('⚠️ User speech missing or invalid:', speech);
      }
    }
  });

  // Audio analysis functions
  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Enhanced analyzer settings for better frequency resolution
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const frequencyArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (analyserRef.current && sessionStarted) {
          // Get time domain data for overall volume
          analyserRef.current.getByteFrequencyData(frequencyArray);
          const average = frequencyArray.reduce((a, b) => a + b) / bufferLength;
          setAudioLevel(average / 255);
          
          // Get frequency data for enhanced visualization
          setFrequencyData(new Uint8Array(frequencyArray));
          
          // Calculate audio output level based on conversation state
          if (conversation.isSpeaking) {
            // Simulate AI audio output level when speaking
            const outputLevel = 0.3 + Math.random() * 0.4; // Base level + variation
            setAudioOutputLevel(outputLevel);
          } else {
            // Gradually decrease output level when not speaking
            setAudioOutputLevel(prev => Math.max(0, prev * 0.95));
          }
          
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error starting audio analysis:', error);
    }
  };

  const stopAudioAnalysis = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Force reset all states - useful for debugging
  const forceResetAllStates = () => {
    setSessionStarted(false);
    setShowFullScreenChat(false);
    setConversationId(null);
    setMessages([]);
    stopAudioAnalysis();
  };

  // Enhanced session ending with timeout fallback
  const endSessionWithTimeout = async () => {
    try {
      // Try to end the Outspeed session
      await conversation.endSession();
    } catch (error) {
      console.error('Error ending Outspeed session:', error);
    }
    
    // Set a timeout to force reset states if Outspeed doesn't respond
    setTimeout(() => {
      if (sessionStarted) {
        forceResetAllStates();
      }
    }, 2000); // 2 second timeout
    
    // Immediately reset local states
    setShowFullScreenChat(false);
    setSessionStarted(false);
    setConversationId(null);
    setMessages([]);
    stopAudioAnalysis();
  };

  // Start conversation function with proper error handling
  const startConversation = useCallback(async () => {
    try {
      // Check if environment variables are set
      if (!import.meta.env.VITE_OUTSPEED_ONBOARDING) {
        toast({
          title: "Configuration Error",
          description: "Outspeed voice agent is not properly configured. Please check your environment variables.",
          variant: "destructive"
        });
        return;
      }

      // Request microphone access
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      console.log('Microphone access granted, starting Outspeed conversation');

      // Create Outspeed session configuration for brainstorming
      const sessionConfig = OutspeedAPI.createBrainstormingSessionConfig(essayTitle, essayPrompt, targetCollege);
      
      // Generate token for Outspeed session
      const tokenData = await OutspeedAPI.generateToken(sessionConfig);
      
      console.log('🚀 Starting Outspeed brainstorming conversation with:');
      console.log('Session Config:', JSON.stringify(sessionConfig, null, 2));
      console.log('Token Data:', tokenData);
      
      const session = await conversation.startSession({
        token: tokenData.token,
        sessionId: tokenData.session_id
      });
      console.log('✅ Session started:', session);

      // The session object itself IS the conversation ID
      if (session && typeof session === 'string') {
        console.log('Conversation ID captured:', session);
        setConversationId(session);
        createConversationRecord(session);
      } else {
        console.log('Session object is not a string:', session);
        console.log('Session type:', typeof session);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
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
    }
  }, [conversation, studentName, onboardingTranscript, targetCollege, essayTitle, essayPrompt, toast]);

  // Fetch user data for dynamic variables
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch profile data using centralized utility
          const profile = await fetchUserProfileData(user.id);
          
          // Get display name using centralized logic
          const displayName = getUserDisplayName(profile, user, 'Student');
          setStudentName(displayName);

          // Get onboarding transcript
          const { data: conversations } = await supabase
            .from('conversation_metadata')
            .select('transcript')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (conversations && conversations.length > 0) {
            setOnboardingTranscript(conversations[0].transcript || '');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setStudentName('Student');
      }
    };

    fetchUserData();
  }, []);

  const createConversationRecord = async (convId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('conversation_tracking')
          .insert({
            conversation_id: convId,
            user_id: user.id,
            conversation_type: 'Brainstorming',
            conversation_started_at: new Date().toISOString(),
            metadata_retrieved: false
          });
        
        if (error) {
          console.error('Error creating conversation record:', error);
        } else {
          console.log('✅ Created essay brainstorming conversation record');
        }
      }
    } catch (error) {
      console.error('Error creating conversation record:', error);
    }
  };

  const generateSummaryFromConversation = async (convId: string) => {
    try {
      setIsGeneratingSummary(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call the Supabase Edge Function to generate brainstorming summary
      const response = await ConversationProcessingService.generateBrainstormingSummary(convId, user.id);
      
      if (!response.success || !response.summary) {
        throw new Error(response.message || 'Failed to generate brainstorming summary');
      }

      const summary: BrainstormSummary = {
        key_themes: response.summary.key_themes || [],
        personal_stories: response.summary.personal_stories || [],
        essay_angles: response.summary.essay_angles || [],
        writing_prompts: response.summary.writing_prompts || [],
        structure_suggestions: response.summary.structure_suggestions || [],
      };

      onSummaryGenerated(summary);
      
      toast({
        title: "Brainstorming Complete!",
        description: "Your conversation summary has been generated and added to the essay editor.",
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: `Failed to generate brainstorming summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);



  return (
    <div className="h-full bg-background flex flex-col">

      
      {/* Full Screen Chat Overlay */}
      {showFullScreenChat && (
        <div className="h-screen flex flex-col p-2 md:p-4">
          {/* Header with Essay Prompt */}
          <div className="mb-4 space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={endSessionWithTimeout}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="font-semibold flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-primary" />
                    {essayTitle}
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {sessionStarted && (
                  <Badge variant="secondary" className="text-xs">
                    <div className="flex items-center">
                      <Mic className="h-3 w-3 mr-1 text-green-500" />
                      Active
                    </div>
                  </Badge>
                )}
                {isGeneratingSummary && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4 mr-2 animate-spin" />
                    Generating Summary...
                  </div>
                )}
              </div>
            </div>
            
            {/* Essay Prompt Display */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h3 className="font-medium text-primary mb-2">Essay Prompt:</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{essayPrompt}</p>
              {targetCollege && (
                <div className="mt-2 text-xs text-primary/70">
                  <strong>Target College:</strong> {targetCollege}
                </div>
              )}
            </div>
          </div>

          {/* Main Chat Interface */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
            {/* Left: AI Circle (2/3 width) */}
            <div className="lg:col-span-2 bg-background/60 border rounded-xl p-4 md:p-6 flex flex-col items-center justify-center min-h-0">
              <div className="flex-1 w-full flex items-center justify-center min-h-0">
                <div className="w-80 h-80 max-w-full max-h-full aspect-square">
                  <VoiceOrb
                    isListening={sessionStarted && !conversation.isSpeaking}
                    isSpeaking={conversation.isSpeaking}
                    isThinking={sessionStarted && !conversation.isSpeaking && audioLevel < 0.1}
                    audioLevel={audioLevel}
                    audioOutputLevel={audioOutputLevel}
                    className="w-full h-full"
                  />
                </div>
              </div>
              <div className="text-center mt-4 md:mt-6 flex-shrink-0">
                <h3 className="text-lg font-medium">
                  {conversation.isSpeaking ? "Diya is speaking..." : "Diya is listening..."}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Share your thoughts and experiences naturally - just like talking to a friend!
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button 
                    onClick={endSessionWithTimeout}
                    variant="outline"
                    disabled={isGeneratingSummary}
                    size="sm"
                  >
                    {isGeneratingSummary ? "Processing..." : "End Conversation"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Transcript (1/3 width) */}
            <div className="lg:col-span-1 h-full min-h-0">
              <div className="h-full bg-background/60 border rounded-xl p-3 md:p-4 flex flex-col min-h-0">
                <div className="mb-3 flex-shrink-0">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Live Conversation ({messages.length} messages)
                  </h4>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 p-2 rounded-lg border min-h-0" ref={transcriptScrollRef}>
                  {messages.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground p-4">
                      No messages yet. Start speaking to see the transcript here.
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.source === 'ai' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[90%] p-2 md:p-3 rounded-lg ${msg.source === 'ai' ? 'bg-[#D07D00] text-white border border-[#D07D00]/20' : 'bg-secondary text-secondary-foreground'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            {msg.source === 'ai' ? <Sparkles className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            <span className="text-xs font-medium">
                              {msg.source === 'ai' ? 'Diya' : 'You'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {msg.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs md:text-sm leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular Interface (hidden when full screen chat is active) */}
      {!showFullScreenChat && (
        <>

          {/* Header */}
          <div className="border-b p-4 bg-background flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="font-semibold flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-primary" />
                    {essayTitle}
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {sessionStarted && (
                  <Badge variant="secondary" className="text-xs">
                    <div className="flex items-center">
                      <Mic className="h-3 w-3 mr-1 text-green-500" />
                      Active
                    </div>
                  </Badge>
                )}
                {isGeneratingSummary && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4 mr-2 animate-spin" />
                    Generating Summary...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Landing View */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8 py-6">
              {/* Hero Introduction */}
              <div className="text-center space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                      Essay Brainstorming
                    </h1>
                  </div>
                  <p className="text-xl text-muted-foreground font-medium">Let's work on your {essayTitle} essay</p>
                </div>
              </div>
              {/* Essay Info Card */}
              <Card className="border-primary/20 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-primary">📝 Essay Details</h3>
                    <p className="text-sm text-muted-foreground">
                      Review your essay information before starting the conversation
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Essay Title</label>
                      <div className="p-3 bg-muted/30 rounded-lg border">
                        <p className="text-sm">{essayTitle}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Target College</label>
                      <div className="p-3 bg-muted/30 rounded-lg border">
                        <p className="text-sm">{targetCollege}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Essay Prompt</label>
                    <div className="p-3 bg-muted/30 rounded-lg border">
                      <p className="text-sm leading-relaxed">{essayPrompt}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Voice Conversation Interface */}
              <Card className="border-primary/20 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-primary">🎤 Voice Conversation</h3>
                    <p className="text-sm text-muted-foreground">
                      Start your voice conversation to brainstorm essay ideas
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                                    {/* Voice Interface */}
                  <div className="text-center space-y-4">
                    <div className="mx-auto flex items-center justify-center" style={{ width: 160, height: 160 }}>
                      <VoiceOrb
                        isListening={false}
                        isSpeaking={false}
                        isThinking={false}
                        audioLevel={0}
                        audioOutputLevel={0}
                        className="w-full h-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Button 
                        onClick={startConversation}
                        disabled={sessionStarted || showFullScreenChat}
                        size="lg"
                        className="mt-4"
                      >
                        <Mic className="h-6 w-6 mr-2" />
                        Start Voice Conversation
                      </Button>
                    </div>
                  </div>

                  {/* Connection Error */}
                  {connectionError && (
                    <div className="text-center p-6">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-red-800 mb-2">Connection Error</h4>
                        <p className="text-red-700 text-sm">{connectionError}</p>
                      </div>
                      <Button 
                        onClick={() => setConnectionError(null)}
                        variant="outline"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BrainstormChat;