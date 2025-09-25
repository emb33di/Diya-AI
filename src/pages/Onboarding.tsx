import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useConversation } from '@outspeed/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Mic, MicOff, User, Sparkles, CheckCircle, MessageSquare, Target, Lightbulb, Heart, BookOpen, Briefcase, Trophy, Users, GraduationCap, DollarSign, X, Loader2, Clock, Info, Pause, Play, Lock } from 'lucide-react';
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
import VoiceOrb from '@/components/VoiceOrb';
// Debug: Log environment variables (remove in production)
console.log('Environment check:', {
  hasOutspeedKey: !!import.meta.env.VITE_OUTSPEED_ONBOARDING,
  outspeedKeyLength: import.meta.env.VITE_OUTSPEED_ONBOARDING?.length || 0
});
const Onboarding = () => {
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const {
    onboardingCompleted,
    loading: onboardingLoading,
    markOnboardingCompleted
  } = useAuth();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [remainingTime, setRemainingTime] = useState(2 * 60); // 2 minutes in seconds (testing)
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [ephemeralKey, setEphemeralKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    source: 'ai' | 'user';
    text: string;
    timestamp: Date;
  }>>([]);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [conversationCompleted, setConversationCompleted] = useState(false);
  const [isProcessingMetadata, setIsProcessingMetadata] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSessionNumber, setCurrentSessionNumber] = useState(1);
  const [loadingStep, setLoadingStep] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [cumulativeSessionTime, setCumulativeSessionTime] = useState(0);
  const [loadingMessages] = useState(["Retrieving conversation metadata", "Extracting profile information", "Generating recommendations"]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [endingMessagePending, setEndingMessagePending] = useState<string | null>(null);
  // NOTE: messageOrder state removed - no longer needed with Outspeed API approach
  
  // Initialize transcript saver hook for automatic message persistence
  const { forceSaveTranscript } = useTranscriptSaver(
    messages,
    conversationId,
    'onboarding',
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionFinalizedRef = useRef<boolean>(false);
  const [expandedView, setExpandedView] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [voiceOrbSize, setVoiceOrbSize] = useState(256);
  const [landingOrbSize, setLandingOrbSize] = useState(160);
  const [showTranscript, setShowTranscript] = useState(true); // Control transcript visibility
  
  // Helper function to persist remaining time
  const persistRemainingTime = useCallback((time: number) => {
    try {
      localStorage.setItem('onboarding_remaining_time', time.toString());
    } catch (error) {
      console.warn('Could not save remaining time to localStorage:', error);
    }
  }, []);



  // Function to clear transcript from UI only
  const handleClearTranscript = useCallback(() => {
    setMessages([]);
    // Note: This only clears the UI, backend data remains intact
  }, []);
  
  const [topics, setTopics] = useState([{
    name: 'Academic Background',
    icon: BookOpen,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    completed: false
  }, {
    name: 'Career Interests',
    icon: Briefcase,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    completed: false
  }, {
    name: 'Extracurriculars',
    icon: Trophy,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    completed: false
  }, {
    name: 'Personal Values',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    completed: false
  }, {
    name: 'College Preferences',
    icon: GraduationCap,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    completed: false
  }, {
    name: 'Financial Considerations',
    icon: DollarSign,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    completed: false
  }]);

  // End conversation with custom message when timer expires
  const endConversationWithMessage = useCallback(async () => {
    try {
      console.log('⏰ 15-minute timer expired - preparing ending message');
      
      // Send custom ending message before terminating session
      const endingMessage = "We've reached the 15-minute mark! Thank you for sharing your story with me. I have enough information to help you with your college application journey. If you have more questions, feel free to start a new session anytime. Goodbye!";
      
      // Wait for user to finish speaking before sending the ending message
      const waitForUserToFinishSpeaking = () => {
        return new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            // Check if user is not speaking (no audio input detected)
            if (audioLevel < 0.1) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100); // Check every 100ms
          
          // Maximum wait time of 10 seconds to avoid infinite waiting
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 10000);
        });
      };
      
      // Wait for user to finish speaking
      await waitForUserToFinishSpeaking();
      console.log('✅ User finished speaking, sending ending message');
      
      // Set a flag to indicate we need to send the ending message
      // This will be handled by the conversation setup when it's available
      setEndingMessagePending(endingMessage);
      
    } catch (error) {
      console.error('Error preparing ending message:', error);
      // Fallback: end conversation without message
      setEndingMessagePending(null);
    }
  }, [audioLevel]);

  // Timer effect
  useEffect(() => {
    if (sessionStarted && remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            // Time's up - send ending message and automatically end conversation
            endConversationWithMessage();
            return 0;
          }
          const newTime = prev - 1;
          persistRemainingTime(newTime);
          return newTime;
        });
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

  // Update remaining time when cumulative time changes
  useEffect(() => {
    const totalSecondsNeeded = 2 * 60; // 2 minutes for testing
    const newRemainingTime = Math.max(0, totalSecondsNeeded - cumulativeSessionTime);
    setRemainingTime(newRemainingTime);
    persistRemainingTime(newRemainingTime);
    
    console.log('Updated remaining time:', {
      cumulativeTime: cumulativeSessionTime,
      remainingTime: newRemainingTime,
      totalNeeded: totalSecondsNeeded
    });
  }, [cumulativeSessionTime, persistRemainingTime]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for the progress bar
  const totalSecondsNeeded = 2 * 60; // 2 minutes for testing
  const progressPercentage = ((totalSecondsNeeded - remainingTime) / totalSecondsNeeded) * 100;

  // Fetch user's profile to get their name and initialize Outspeed API
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (user) {
          // Initialize Outspeed API
          OutspeedAPI.initialize(import.meta.env.VITE_SUPABASE_URL);
          
          // Add a small delay to ensure database updates are committed
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const {
            data: profile
          } = await supabase.from('user_profiles').select('full_name, cumulative_onboarding_time, onboarding_complete').eq('user_id', user.id).single();
          if (profile?.full_name) {
            // Extract first name from full name
            const firstName = profile.full_name.split(' ')[0];
            setStudentName(firstName);
          }

          // Load previous cumulative session time
          const previousTime = profile?.cumulative_onboarding_time || 0;
          setCumulativeSessionTime(previousTime);

          // Adjust remaining time based on cumulative time
          const totalSecondsNeeded = 2 * 60; // 2 minutes for testing
          let remainingSeconds = Math.max(0, totalSecondsNeeded - previousTime);
          
          // Check localStorage for more recent data (fallback and override)
          try {
            const storedRemainingTime = localStorage.getItem('onboarding_remaining_time');
            if (storedRemainingTime) {
              const localRemainingTime = parseInt(storedRemainingTime);
              const localCumulativeTime = totalSecondsNeeded - localRemainingTime;
              
              // Use localStorage data if it's more recent (higher cumulative time)
              if (localCumulativeTime > previousTime) {
                setCumulativeSessionTime(localCumulativeTime);
                setRemainingTime(localRemainingTime);
                console.log('✅ Loaded from localStorage (more recent):', {
                  cumulativeTime: localCumulativeTime,
                  remainingTime: localRemainingTime,
                  dbTime: previousTime
                });
              } else {
                setRemainingTime(remainingSeconds);
                console.log('✅ Loaded from database:', {
                  cumulativeTime: previousTime,
                  remainingTime: remainingSeconds,
                  totalNeeded: totalSecondsNeeded
                });
                // Clear localStorage if database has more recent data
                localStorage.removeItem('onboarding_remaining_time');
              }
            } else {
              setRemainingTime(remainingSeconds);
              console.log('✅ Loaded from database (no localStorage):', {
                cumulativeTime: previousTime,
                remainingTime: remainingSeconds,
                totalNeeded: totalSecondsNeeded
              });
            }
          } catch (error) {
            console.warn('Error loading from localStorage:', error);
            setRemainingTime(remainingSeconds);
            console.log('✅ Loaded from database (localStorage error):', {
              cumulativeTime: previousTime,
              remainingTime: remainingSeconds,
              totalNeeded: totalSecondsNeeded
            });
          }

          // Check for existing paused conversations
          const {
            data: pausedConversations,
            error: convError
          } = await supabase.from('conversation_tracking').select('conversation_type, conversation_id').eq('user_id', user.id).in('conversation_type', ['onboarding_1', 'onboarding_2', 'onboarding_3', 'onboarding_4', 'onboarding_5']).order('created_at', {
            ascending: false
          });
          if (!convError && pausedConversations && pausedConversations.length > 0) {
            // Find the highest session number
            const sessionNumbers = pausedConversations.map(conv => {
              const match = conv.conversation_type?.match(/onboarding_(\d+)/);
              return match ? parseInt(match[1]) : 0;
            }).filter(num => num > 0);
            if (sessionNumbers.length > 0) {
              const maxSession = Math.max(...sessionNumbers);
              setCurrentSessionNumber(maxSession + 1);
              console.log(`Found ${pausedConversations.length} paused conversations, next session will be: ${maxSession + 1}`);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, []);

  // Debug useConversation hook initialization
  useEffect(() => {
    console.log('🚀 useConversation hook initialized:', {
      ephemeralKey: ephemeralKey ? 'Set' : 'Not set',
      timestamp: new Date().toISOString()
    });
  }, []);

  // Conversation hook - only initialize when we have an ephemeral key
  const conversation = ephemeralKey ? useConversation({
    ephemeralKey: ephemeralKey,
    onConnect: async () => {
      console.log('🎉 CONNECTED to Outspeed voice agent');
      console.log('📊 Connection details:', {
        conversationId: conversationId,
        ephemeralKey: ephemeralKey ? 'Set' : 'Not set',
        timestamp: new Date().toISOString()
      });
      console.log('🔍 Conversation object:', conversation);
      console.log('🔑 Conversation object keys:', Object.keys(conversation));
      setSessionStarted(true);
      setSessionStartTime(new Date());
      setHasStartedOnce(true);
      
      // Create conversation record when session starts
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let conversationType: "onboarding_1" | "onboarding_2" | "onboarding_3" | "onboarding_4" | "onboarding_5";
          switch (currentSessionNumber) {
            case 1: conversationType = "onboarding_1"; break;
            case 2: conversationType = "onboarding_2"; break;
            case 3: conversationType = "onboarding_3"; break;
            case 4: conversationType = "onboarding_4"; break;
            case 5: conversationType = "onboarding_5"; break;
            default: conversationType = "onboarding_1"; break;
          }
          
          // Create conversation record with current timestamp as created_at
          const { error } = await supabase
            .from('conversation_tracking')
            .insert({
              conversation_id: conversationId || `temp_${Date.now()}`,
              user_id: user.id,
              conversation_type: conversationType,
              conversation_started_at: new Date().toISOString(),
              metadata_retrieved: false
            });
          
          if (error) {
            console.error('Error creating conversation record:', error);
          } else {
            console.log('✅ Created conversation record at session start');
          }
        }
      } catch (error) {
        console.error('Error creating conversation record:', error);
      }
      
      // Handle any pending ending message
      if (endingMessagePending) {
        console.log('📤 Sending pending ending message:', endingMessagePending);
        try {
          if (conversation && typeof conversation.sendText === 'function') {
            await conversation.sendText(endingMessagePending);
            console.log('✅ Pending ending message sent');
            
            // Wait for Diya to finish speaking the ending message
            const waitForDiyaToFinishSpeaking = () => {
              return new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                  // Check if Diya is not speaking
                  if (!conversation.isSpeaking) {
                    clearInterval(checkInterval);
                    resolve();
                  }
                }, 100); // Check every 100ms
                
                // Maximum wait time of 15 seconds for the ending message
                setTimeout(() => {
                  clearInterval(checkInterval);
                  resolve();
                }, 15000);
              });
            };
            
            // Wait for Diya to finish speaking the ending message
            await waitForDiyaToFinishSpeaking();
            console.log('✅ Diya finished speaking ending message');
            
            // Now end the conversation
            await endConversation();
          }
        } catch (error) {
          console.error('Error sending pending ending message:', error);
          await endConversation();
        }
        setEndingMessagePending(null);
        return;
      }
      
      toast({
        title: "Connected",
        description: "Your conversation with Diya has started. Feel free to speak naturally!"
      });
    },
    onMessage: async (message: any) => {
      console.log('Message received:', message);

      // Add message to conversation transcript
      if (message.message && typeof message.message === 'string') {
        const newMessage = {
          source: message.source || 'ai',
          text: message.message,
          timestamp: new Date()
        };
        
        // Update local state for UI display only
        setMessages(prev => [...prev, newMessage]);
        
        // NOTE: Real-time message storage removed - will use Outspeed API instead
      }

      // Mark topics as completed based on conversation flow
      // This would be enhanced with actual topic tracking
      if (message.source === 'ai') {
        const currentProgress = Math.min(progressPercentage + 2, 100);
        const completedCount = Math.floor(currentProgress / 16.67);
        setTopics(prev => prev.map((topic, index) => ({
          ...topic,
          completed: index < completedCount
        })));
      }
    },
    onUserSpeech: async (speech: any) => {
      console.log('User speech detected:', speech);
      // Add user speech to transcript if we have the text
      if (speech.text && typeof speech.text === 'string') {
        const newMessage = {
          source: 'user' as const,
          text: speech.text,
          timestamp: new Date()
        };
        
        // Update local state for UI display only
        setMessages(prev => [...prev, newMessage]);
        
        // NOTE: Real-time message storage removed - will use Outspeed API instead
      }
    },
    onDisconnect: async () => {
      console.log('Disconnected from voice agent');

      // Prevent double accounting when pause/end already handled
      let newCumulativeTimeLocal = cumulativeSessionTime;
      if (!sessionFinalizedRef.current && sessionStartTime) {
        const duration = Math.max(0, (new Date().getTime() - sessionStartTime.getTime()) / 1000);
        setSessionDuration(duration);
        newCumulativeTimeLocal = cumulativeSessionTime + duration;
        setCumulativeSessionTime(newCumulativeTimeLocal);

        // Store cumulative time in database
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('user_profiles')
              .update({ cumulative_onboarding_time: Math.round(newCumulativeTimeLocal) })
              .eq('user_id', user.id);
            console.log('✅ Updated cumulative time in database:', Math.round(newCumulativeTimeLocal), 'seconds');
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
    },
    onError: error => {
      console.error('❌ VOICE AGENT ERROR:', error);
      console.error('🔍 Error details:', {
        errorType: typeof error,
        errorMessage: error?.message || 'No message',
        errorStack: error?.stack || 'No stack',
        errorName: error?.name || 'No name',
        ephemeralKey: ephemeralKey ? 'Set' : 'Not set',
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      });
      toast({
        title: "Connection Error",
        description: "There was an issue with the voice connection. Please try again.",
        variant: "destructive"
      });
    }
  }) : null;

  // Debug conversation state changes
  useEffect(() => {
    console.log('🔄 Conversation state changed:', {
      conversationId: conversationId,
      sessionStarted: sessionStarted,
      ephemeralKey: ephemeralKey ? 'Set' : 'Not set',
      timestamp: new Date().toISOString()
    });
  }, [conversationId, sessionStarted, ephemeralKey]);

  // Debug ephemeralKey changes
  useEffect(() => {
    console.log('🔑 EphemeralKey changed:', {
      hasKey: !!ephemeralKey,
      keyLength: ephemeralKey?.length || 0,
      keyPreview: ephemeralKey ? `${ephemeralKey.substring(0, 20)}...` : 'null',
      timestamp: new Date().toISOString()
    });
    
    // Debug conversation object
    if (conversation) {
      console.log('🔍 Conversation object available:', {
        type: typeof conversation,
        keys: Object.keys(conversation),
        hasConnect: typeof conversation.connect === 'function',
        hasStart: typeof conversation.start === 'function',
        hasStartSession: typeof conversation.startSession === 'function',
        hasConnectSession: typeof conversation.connectSession === 'function'
      });
    }
    
    // Note: useConversation hook automatically connects when ephemeralKey is provided
    // No manual connection needed - the hook handles this automatically
  }, [ephemeralKey, conversation]);

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

  // Calculate responsive voice orb size for expanded view
  useEffect(() => {
    const calculateVoiceOrbSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const minSize = 200; // Increased minimum size for expanded view
      const maxSize = 360; // Increased maximum size for expanded view
      
      // Calculate size based on available space - more generous for expanded view
      const availableWidth = width * 0.55; // 55% of screen width for expanded view
      const availableHeight = height * 0.65; // 65% of screen height for expanded view
      const size = Math.min(availableWidth, availableHeight, maxSize);
      
      setVoiceOrbSize(Math.max(size, minSize));
    };

    calculateVoiceOrbSize();
    window.addEventListener('resize', calculateVoiceOrbSize);
    
    return () => window.removeEventListener('resize', calculateVoiceOrbSize);
  }, []);

  // Responsive size for landing (not yet expanded) VoiceOrb
  useEffect(() => {
    const calculateLandingOrbSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const minSize = 160;
      const maxSize = 240;
      // Keep the landing orb prominent but not overwhelming
      const availableWidth = width * 0.32;
      const availableHeight = height * 0.28;
      const size = Math.min(Math.max(minSize, Math.min(availableWidth, availableHeight)), maxSize);
      setLandingOrbSize(Math.round(size));
    };

    calculateLandingOrbSize();
    window.addEventListener('resize', calculateLandingOrbSize);
    return () => window.removeEventListener('resize', calculateLandingOrbSize);
  }, []);

  // Audio analysis for particle cloud responsiveness
  useEffect(() => {
    if (sessionStarted) {
      const startAudioAnalysis = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
          micStreamRef.current = stream;
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.8;
          microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
          microphoneRef.current.connect(analyserRef.current);
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const frequencyArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const updateAudioLevel = () => {
            if (analyserRef.current) {
              // Get frequency data for enhanced visualization
              analyserRef.current.getByteFrequencyData(frequencyArray);
              const average = frequencyArray.reduce((a, b) => a + b) / frequencyArray.length;
              setAudioLevel(average / 255); // Normalize to 0-1
              
              // Set frequency data for VoiceOrb
              setFrequencyData(new Uint8Array(frequencyArray));
              
              // Calculate audio output level based on conversation state
              if (conversation.isSpeaking) {
                // Enhanced AI audio output level simulation for better breathing effect
                const baseLevel = 0.4; // Higher base level for more visible breathing
                const variation = Math.sin(Date.now() * 0.01) * 0.3; // Smooth sine wave variation
                const randomVariation = Math.random() * 0.2; // Add some randomness
                const outputLevel = Math.max(0.2, Math.min(0.9, baseLevel + variation + randomVariation));
                setAudioOutputLevel(outputLevel);
              } else {
                // Gradually decrease output level when not speaking
                setAudioOutputLevel(prev => Math.max(0, prev * 0.95));
              }
            }
            requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();
        } catch (error) {
          console.log('Audio analysis not available:', error);
        }
      };
      startAudioAnalysis();
    }
    return () => {
      // Safely stop mic stream
      try {
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }
      } catch (e) {
        console.warn('Error stopping mic stream:', e);
      }
      // Safely close audio context
      try {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch (e) {
        console.warn('AudioContext close warning:', e);
      } finally {
        audioContextRef.current = null;
      }
    };
  }, [sessionStarted]);

  // Redirect users who have already completed onboarding
  useEffect(() => {
    if (!onboardingLoading && onboardingCompleted) {
      console.log('User has already completed onboarding, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [onboardingCompleted, onboardingLoading, navigate]);

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

      // Get previous session context - prefer DB, fallback to localStorage
      let previousContext: any[] | null = null;
      try {
        // Always try fresh DB context first
        previousContext = await getPreviousSessionContext();
        if (previousContext && previousContext.length > 0) {
          console.log('Using previous session context from DB:', previousContext);
          localStorage.setItem('previous_onboarding_context', JSON.stringify(previousContext));
        } else {
          // Fallback to stored local context, normalize session labels
          const storedContext = localStorage.getItem('previous_onboarding_context');
          if (storedContext) {
            const parsed = JSON.parse(storedContext);
            if (Array.isArray(parsed)) {
              previousContext = parsed.map((ctx: any, index: number) => ({
                ...ctx,
                session: `onboarding_${index + 1}`
              }));
              console.log('Using normalized previous session context from localStorage:', previousContext);
            }
          }
        }
      } catch (error) {
        console.warn('Error loading previous context:', error);
      }

      // Prepare dynamic variables with context
      const dynamicVariables: any = {
        student_name: studentName
      };

      // Add previous session context if available
      if (previousContext && previousContext.length > 0) {
        console.log('📋 Previous context found:', previousContext.length, 'sessions');
        console.log('📝 Sample context:', previousContext[0]);
        try {
          console.log('🤖 Getting AI-powered conversation context...');
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Use Supabase Edge Function for conversation resume context
            try {
              const contextResult = await ConversationResumeService.generateConversationResumeContext(user.id);
              if (contextResult.success && contextResult.context) {
                dynamicVariables.previous_sessions = contextResult.context;
                dynamicVariables.session_count = contextResult.session_count;
                console.log('✅ Using AI-generated context for Outspeed');
                console.log('Context:', contextResult.context);
                console.log('Session count:', contextResult.session_count);
              } else {
                // Fallback to local method
                const contextSummary = previousContext
                  .map((ctx: any) => {
                    const content = ctx.transcript || '';
                    return `${ctx.session}: ${content}`;
                  })
                  .filter(ctx => {
                    const parts = ctx.split(': ');
                    return parts.length > 1 && parts[1].trim() !== '';
                  })
                  .join('\n\n');
                
                dynamicVariables.previous_sessions = contextSummary;
                dynamicVariables.session_count = previousContext.length;
                console.log('⚠️ Using fallback context for Outspeed');
              }
            } catch (error) {
              console.error('❌ Error getting context:', error);
              // Fallback to local method
              const contextSummary = previousContext
                .map((ctx: any) => {
                  const content = ctx.transcript || '';
                  return `${ctx.session}: ${content}`;
                })
                .filter(ctx => {
                  const parts = ctx.split(': ');
                  return parts.length > 1 && parts[1].trim() !== '';
                })
                .join('\n\n');
              
              dynamicVariables.previous_sessions = contextSummary;
              dynamicVariables.session_count = previousContext.length;
              console.log('⚠️ Using fallback context due to error');
            }
          }
        } catch (error) {
          console.error('❌ Error getting conversation context:', error);
          // Fallback to original method
          const contextSummary = previousContext.map((ctx: any) => {
            const content = ctx.transcript || '';
            return `${ctx.session}: ${content}`;
          }).filter((ctx: string) => {
            const parts = ctx.split(': ');
            return parts.length > 1 && parts[1].trim() !== '';
          }).join('\n\n');
          dynamicVariables.previous_sessions = contextSummary;
          dynamicVariables.session_count = previousContext.length;
        }
        console.log('✅ Added previous session context to agent variables');
        console.log('Full dynamic variables:', dynamicVariables);
      } else {
        console.log('ℹ️ No previous context found');
      }

      // Create Outspeed session configuration
      const sessionConfig = await OutspeedAPI.createOnboardingSessionConfig(studentName);
      
      // Generate token for Outspeed session
      const tokenData = await OutspeedAPI.generateToken(sessionConfig);
      
      console.log('🚀 Starting Outspeed conversation with:');
      console.log('Session Config:', JSON.stringify(sessionConfig, null, 2));
      console.log('Token Data:', tokenData);
      
      // Set the ephemeral key to trigger the conversation connection
      setEphemeralKey(tokenData.client_secret.value);
      console.log('✅ Ephemeral key set:', tokenData.client_secret.value);

      // Store session ID for later use
      if (tokenData.id) {
        console.log('Conversation ID captured:', tokenData.id);
        setConversationId(tokenData.id);

        // Update the temporary conversation record with the actual conversationId
        try {
          const tempConversationId = localStorage.getItem('temp_conversation_id');
          if (tempConversationId) {
            const { error } = await supabase
              .from('conversation_tracking')
              .update({ conversation_id: tokenData.id })
              .eq('conversation_id', tempConversationId);
            
            if (error) {
              console.error('Error updating conversation ID:', error);
            } else {
              console.log('✅ Updated conversation record with actual ID:', tokenData.id);
              localStorage.removeItem('temp_conversation_id');
            }
          }
        } catch (error) {
          console.error('Error updating conversation ID:', error);
        }

        // Increment session number for next conversation
        setCurrentSessionNumber(prev => prev + 1);
      } else {
        console.error('Failed to get session ID from token data');
        toast({
          title: "Connection Error",
          description: "Failed to start the conversation. Please try again.",
          variant: "destructive"
        });
        return;
      }
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
    }
  }, [toast]);
  const pauseConversation = useCallback(async () => {
    try {
      console.log('Pausing conversation, current conversationId:', conversationId);

      // Calculate session duration
      const endTime = new Date();
      const duration = sessionStartTime ? Math.max(0, (endTime.getTime() - sessionStartTime.getTime()) / 1000) : 0;
      setSessionDuration(duration);

      // Update cumulative session time
      const newCumulativeTime = cumulativeSessionTime + duration;
      setCumulativeSessionTime(newCumulativeTime);

      // Store conversation tracking with session number
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && conversationId) {
          // Update existing conversation tracking or create new one
          let conversationType: "onboarding_1" | "onboarding_2" | "onboarding_3" | "onboarding_4" | "onboarding_5";
          switch (currentSessionNumber) {
            case 1:
              conversationType = "onboarding_1";
              break;
            case 2:
              conversationType = "onboarding_2";
              break;
            case 3:
              conversationType = "onboarding_3";
              break;
            case 4:
              conversationType = "onboarding_4";
              break;
            case 5:
              conversationType = "onboarding_5";
              break;
            default:
              conversationType = "onboarding_1";
              break;
          }
                  // Update conversation record with end time
        const currentTime = new Date().toISOString();
        const { error } = await supabase
          .from('conversation_tracking')
          .update({
            conversation_ended_at: currentTime
          })
          .eq('conversation_id', conversationId);
        
        if (error) {
          console.error('Error updating conversation tracking:', error);
        } else {
          console.log('✅ Updated conversation record with end time:', currentTime);
        }

          // Store cumulative time in database
          await supabase
            .from('user_profiles')
            .update({ cumulative_onboarding_time: Math.round(newCumulativeTime) })
            .eq('user_id', user.id);
          console.log('✅ Pause: Updated cumulative time in database:', Math.round(newCumulativeTime), 'seconds');
        }
      } catch (error) {
        console.error('Error storing conversation data:', error);
      }

      // Update remaining time immediately based on new cumulative time
      const totalSecondsNeededLocal = 2 * 60; // 2 minutes for testing
      setRemainingTime(Math.max(0, totalSecondsNeededLocal - newCumulativeTime));

      // Ensure onDisconnect does not double count
      sessionFinalizedRef.current = true;
      if (conversation) {
        await conversation.endSession();
      }

      // Store local transcript as metadata since Outspeed API might not have it yet
      if (conversationId) {
        try {
          const { data: { user } = {} } = await supabase.auth.getUser();
          if (user) {
            console.log('📝 Storing local transcript for paused session...');

            // Create transcript from local messages
            const transcriptText = messages.map(msg => `${msg.source === 'ai' ? 'Diya' : 'You'}: ${msg.text}`).join('\n');
            console.log('Local transcript:', transcriptText);

            // Store in conversation_metadata table
            const { error } = await supabase.from('conversation_metadata').upsert({
              conversation_id: conversationId,
              user_id: user.id,
              transcript: transcriptText || 'Conversation in progress',
              transcript_summary: transcriptText || 'Conversation in progress',
              // Use transcript as summary
              created_at: new Date().toISOString()
            });
            if (error) {
              console.error('Error storing local transcript:', error);
            } else {
              console.log('✅ Local transcript stored for paused session');
            }
          }
        } catch (error) {
          console.error('❌ Error storing local transcript:', error);
        }
      }

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsPaused(true);
      setSessionStarted(false);
      setSessionStartTime(null);
      setExpandedView(false);
      toast({
        title: "Conversation Paused",
        description: "Your conversation has been paused. You can resume it later."
      });
    } catch (error) {
      console.error('Error pausing conversation:', error);
      toast({
        title: "Pause Error",
        description: "There was an error pausing your Outspeed conversation. Please try again.",
        variant: "destructive"
      });
    }
  }, [conversationId, sessionStartTime, cumulativeSessionTime, currentSessionNumber, messages, toast]);

  // Function to get previous session context
  const getPreviousSessionContext = useCallback(async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Get all previous conversation metadata for this user
      const {
        data: previousMetadata,
        error
      } = await supabase.from('conversation_metadata').select('conversation_id, summary, transcript, created_at').eq('user_id', user.id).neq('transcript', '').order('created_at', {
        ascending: true
      });
      if (error) {
        console.error('❌ Error fetching previous metadata:', error);
        return null;
      }
      if (!previousMetadata) {
        console.log('ℹ️ No previous metadata found');
        return null;
      }
      console.log('✅ Found previous metadata:', previousMetadata.length, 'conversations');
      console.log('📋 Metadata sample:', previousMetadata[0]);

      // Map metadata to context format
      const contexts = previousMetadata.map((metadata, index) => {
        const sessionNumber = index + 1;
        return {
          session: `onboarding_${sessionNumber}`,
          summary: metadata.summary || '',
          transcript: metadata.transcript || ''
        };
      });
      console.log('Processed contexts:', contexts);
      return contexts.filter(ctx => ctx.transcript && ctx.transcript.trim() !== '');
    } catch (error) {
      console.error('Error getting previous session context:', error);
      return null;
    }
  }, []);
  const resumeConversation = useCallback(async () => {
    try {
      console.log('🔄 Resuming conversation, session number:', currentSessionNumber);
      setExpandedView(true);

      // Get previous session context using AI agent
      const previousContext = await getPreviousSessionContext();
      if (previousContext && previousContext.length > 0) {
        console.log('📋 Found previous session context:', previousContext.length, 'sessions');
        // Store context for the agent to use
        localStorage.setItem('previous_onboarding_context', JSON.stringify(previousContext));
      }

      // Start new conversation session with current session number
      await startConversation();
      setIsPaused(false);
      toast({
        title: "Conversation Resumed",
        description: "Welcome back! Your conversation with Diya has resumed with AI-enhanced context."
      });
    } catch (error) {
      console.error('❌ Error resuming conversation:', error);
      setExpandedView(false);
      toast({
        title: "Resume Error",
        description: "There was an error resuming your Outspeed conversation. Please try again.",
        variant: "destructive"
      });
    }
  }, [currentSessionNumber, getPreviousSessionContext, toast]);
  const endConversation = useCallback(async () => {
    try {
      console.log('Ending conversation, current conversationId:', conversationId);
      setExpandedView(false);

      // Calculate session duration
      const endTime = new Date();
      const duration = sessionStartTime ? Math.max(0, (endTime.getTime() - sessionStartTime.getTime()) / 1000) : 0;
      setSessionDuration(duration);
      console.log('Final session duration:', duration, 'seconds');

      // Compute cumulative time and completion
      const newCumulativeTime = cumulativeSessionTime + duration;
      const isSessionComplete = newCumulativeTime >= 120; // Require full 2 minutes (testing)

      // Update conversation record with end time
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && conversationId) {
          const currentTime = new Date().toISOString();
          const { error } = await supabase
            .from('conversation_tracking')
            .update({
              conversation_ended_at: currentTime
            })
            .eq('conversation_id', conversationId);
          
          if (error) {
            console.error('Error updating conversation tracking:', error);
          } else {
            console.log('✅ Updated conversation record with end time:', currentTime);
          }
        }
      } catch (error) {
        console.error('Error updating conversation tracking:', error);
      }

      // Persist cumulative time immediately to avoid relying on onDisconnect
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_profiles')
            .update({ cumulative_onboarding_time: Math.round(newCumulativeTime) })
            .eq('user_id', user.id);
          console.log('✅ End: Updated cumulative time in database:', Math.round(newCumulativeTime), 'seconds');
        }
      } catch (error) {
        console.error('Error updating cumulative session time (end):', error);
      }
      setCumulativeSessionTime(newCumulativeTime);

      // Update remaining time before ending session
      const totalSecondsNeededLocal = 2 * 60; // 2 minutes for testing
      setRemainingTime(Math.max(0, totalSecondsNeededLocal - newCumulativeTime));

      // Prevent double accounting in onDisconnect
      sessionFinalizedRef.current = true;
      if (conversation) {
        await conversation.endSession();
      }

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

          // Store conversation ID in database with session number
          await ConversationStorage.storeConversationId(conversationId, user.id, currentSessionNumber);

          // Also store the live transcript locally (for potential fallback)
          if (messages.length > 0) {
            const transcript = messages.map(msg => `${msg.source === 'ai' ? 'Diya' : 'You'}: ${msg.text}`).join('\n');
            console.log('Live transcript captured:', transcript);
            localStorage.setItem(`transcript_${conversationId}`, transcript);
          }
          console.log('Conversation ID captured:', conversationId);
          console.log('User ID:', user.id);

          // Step 1: Retrieve metadata (real operation)
          setIsProcessingMetadata(true);
          let metadataOk = false;
          try {
            console.log('📝 Retrieving and storing conversation metadata...');
            
            // Get all persisted messages for this conversation
            // NOTE: This will be replaced with Outspeed API call
            const persistedMessages = await MessagePersistenceService.getMessages(conversationId, user.id);
            console.log('📊 Retrieved persisted messages:', persistedMessages.length);
            
            // Validate the messages
            const validation = MessagePersistenceService.validateMessages(persistedMessages);
            console.log('✅ Message validation:', validation);
            
            if (!validation.isValid) {
              console.warn('⚠️ Message validation failed:', validation.warnings);
            }
            
            // Convert messages to transcript format
            const transcript = MessagePersistenceService.messagesToTranscript(persistedMessages);
            console.log('📝 Generated transcript length:', transcript.length);
            
            // Get conversation statistics
            const stats = MessagePersistenceService.getConversationStats(persistedMessages);
            console.log('📈 Conversation stats:', stats);
            
            // Create metadata with real transcript data
            const metadata = {
              conversation_id: conversationId,
              user_id: user.id,
              summary: `Conversation completed with ${stats.totalMessages} messages (${stats.userMessages} user, ${stats.aiMessages} AI)`,
              transcript: transcript,
              audio_url: null,
              created_at: new Date().toISOString()
            };
            
            const retrieved = await ConversationStorage.storeProvidedMetadata(metadata);
            
            // Validate metadata presence (either Supabase or local)
            const stored = await ConversationStorage.getConversationMetadata(conversationId);
            if (stored && (stored.transcript?.trim() || stored.summary?.trim())) {
              metadataOk = true;
              console.log('✅ Metadata stored and validated successfully');
            } else {
              console.warn('⚠️ Metadata validation failed, but continuing with local data');
              metadataOk = true; // Still proceed with local data
            }
          } catch (error) {
            console.error('❌ Error retrieving metadata:', error);
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

          // Step 2: Extract profile information from conversation using enhanced AI agent
          try {
            console.log('👤 Extracting profile information from conversation:', conversationId);
            
            // Use the enhanced profile extraction function
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              throw new Error('No active session found');
            }

            const profileResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhanced-profile-extraction`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                conversation_id: conversationId,
                user_id: user.id
                // school_type will be determined automatically from user profile
              })
            });
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              if (profileData.success) {
                console.log('✅ Enhanced profile information extracted successfully');
                console.log('Confidence Score:', profileData.confidence_score);
                console.log('Fields Extracted:', profileData.fields_extracted?.length);
                console.log('Fields Missing:', profileData.fields_missing?.length);
                
                // Store extraction results in localStorage for profile confirmation page
                localStorage.setItem('ai_extracted_profile', JSON.stringify({
                  profile: profileData.extracted_profile,
                  school_type: profileData.school_type,
                  confidence_score: profileData.confidence_score,
                  fields_extracted: profileData.fields_extracted,
                  fields_missing: profileData.fields_missing,
                  conversation_id: conversationId
                }));
                
                toast({
                  title: "AI Profile Extraction Complete",
                  description: `Profile extracted with ${profileData.confidence_score}% confidence. Ready for your review!`
                });
              } else {
                console.log('❌ Enhanced profile extraction failed:', profileData.message);
                toast({
                  title: "Profile Extraction Warning",
                  description: profileData.message || "Could not extract profile information. You can fill it manually.",
                  variant: "destructive"
                });
              }
            } else {
              console.error('❌ Enhanced profile extraction API error:', profileResponse.status, await profileResponse.text());
              toast({
                title: "Profile Extraction Error",
                description: "Failed to extract profile information. You can fill it manually.",
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

          // Step 3: Generate school recommendations (real operation)
          try {
            console.log('🎓 Generating school recommendations for conversation:', conversationId);
            const response = await SchoolRecommendationService.generateSchoolRecommendations(conversationId, user.id);
            if (response.success) {
              console.log('✅ Generated recommendations:', response.recommendations.length);
              toast({
                title: "Recommendations Generated",
                description: `Successfully generated ${response.recommendations.length} school recommendations!`
              });
            } else {
              console.log('❌ No recommendations generated:', response.message);
              toast({
                title: "No Recommendations",
                description: response.message,
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

                      // Mark onboarding as completed only for full sessions
            if (isSessionComplete) {
              await markOnboardingCompleted();

              // Clear stored context since onboarding is complete
              localStorage.removeItem('previous_onboarding_context');
              localStorage.removeItem('onboarding_remaining_time');

            // Set flag to indicate user is coming from onboarding completion
            localStorage.setItem('onboarding_completion_flow', 'true');
            
            // Navigate to profile page for AI-populated form review
            setShowLoadingModal(false);
            navigate('/profile');
          } else {
            setShowLoadingModal(false);
          }
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
  }, [conversationId, messages, toast, navigate, sessionStartTime, markOnboardingCompleted, cumulativeSessionTime, currentSessionNumber]);
  
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
        {expandedView && (
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
                <Progress value={progressPercentage} className={`h-2 ${remainingTime <= 30 ? 'bg-red-100' : remainingTime <= 60 ? 'bg-yellow-100' : ''}`} />
                <div className="text-xs text-muted-foreground text-center">
                  {remainingTime <= 30 ? 'Less than 30 seconds remaining' : remainingTime <= 60 ? 'Less than 1 minute remaining' : '2-minute conversation session (testing)'}
                </div>
              </div>
            )}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
              {/* Left: AI Circle (2/3 width) */}
              <div className={`${showTranscript ? 'lg:col-span-2' : 'lg:col-span-3'} bg-background/60 border rounded-xl p-4 md:p-6 flex flex-col items-center justify-center min-h-0 transition-all duration-300 ease-in-out`}>
                <div className="flex-1 w-full flex items-center justify-center min-h-0">
                                      <div className="w-80 h-80 max-w-full max-h-full aspect-square">
                      <VoiceOrb
                        isListening={sessionStarted && conversation && !conversation.isSpeaking}
                        isSpeaking={conversation?.isSpeaking || false}
                        isThinking={sessionStarted && conversation && !conversation.isSpeaking && audioLevel < 0.1}
                        audioLevel={audioLevel}
                        audioOutputLevel={audioOutputLevel}
                        className="w-full h-full"
                      />
                    </div>
                </div>
                <div className="text-center mt-4 md:mt-6 flex-shrink-0">
                  <h3 className="text-lg font-medium">{conversation?.isSpeaking ? 'Diya is speaking...' : 'Diya is listening...'}</h3>
                  <p className="text-sm text-muted-foreground">Share your thoughts and experiences naturally - just like talking to a friend!</p>
                  <div className="flex gap-2 justify-center mt-4">
                    <Button onClick={pauseConversation} variant="outline" disabled={isProcessingMetadata} size="sm">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                    <Button onClick={endConversation} variant="outline" disabled={isProcessingMetadata} size="sm">
                      {isProcessingMetadata ? 'Processing...' : 'End'}
                    </Button>
                  </div>
                </div>
                
                {/* Subtle indicator when transcript is hidden */}
                {!showTranscript && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="text-xs">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Transcript Hidden
                    </Badge>
                  </div>
                )}
              </div>

              {/* Right: Transcript (1/3 width) - conditionally shown */}
              {showTranscript && (
                <div className="lg:col-span-1 h-full min-h-0">
                  <div className="h-full bg-background/60 border rounded-xl p-3 md:p-4 flex flex-col min-h-0">
                    <div className="mb-3 flex-shrink-0 flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Live Conversation ({messages.length} messages)</h4>
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={handleClearTranscript} 
                          variant="ghost" 
                          size="sm"
                          className="h-6 px-2 text-xs"
                          disabled={messages.length === 0}
                        >
                          Clear
                        </Button>
                        <Button 
                          onClick={() => setShowTranscript(false)} 
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 p-2 rounded-lg border min-h-0" ref={transcriptScrollRef}>
                      {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.source === 'ai' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[90%] p-2 md:p-3 rounded-lg ${msg.source === 'ai' ? 'bg-[#D07D00] text-white border border-[#D07D00]/20' : 'bg-secondary text-secondary-foreground'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {msg.source === 'ai' ? <Sparkles className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              <span className="text-xs font-medium">{msg.source === 'ai' ? 'Diya' : 'You'}</span>
                              <span className="text-xs text-muted-foreground">{msg.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <p className="text-xs md:text-sm leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Transcript toggle button when hidden */}
            {!showTranscript && (
              <div className="flex justify-center mt-4">
                <Button 
                  onClick={() => setShowTranscript(true)} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Show Transcript
                </Button>
              </div>
            )}
          </div>
        )}

        <div className={`${expandedView ? 'hidden' : ''} max-w-4xl mx-auto space-y-8`}>
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
                    <Progress value={progressPercentage} className={`h-2 ${remainingTime <= 30 ? 'bg-red-100' : remainingTime <= 60 ? 'bg-yellow-100' : ''}`} />
                    <div className="text-xs text-muted-foreground text-center">
                      {remainingTime <= 30 ? 'Less than 30 seconds remaining' : remainingTime <= 60 ? 'Less than 1 minute remaining' : '2-minute conversation session (testing)'}
                    </div>
                  </div>
                )}

                {/* Voice Interface */}
                <div className="text-center space-y-4">
                  <div className="mx-auto flex items-center justify-center" style={{ width: landingOrbSize, height: landingOrbSize }}>
                    <div className="w-full h-full aspect-square">
                      <VoiceOrb
                        isListening={sessionStarted && conversation && !conversation.isSpeaking}
                        isSpeaking={conversation?.isSpeaking || false}
                        isThinking={sessionStarted && conversation && !conversation.isSpeaking && audioLevel < 0.1}
                        audioLevel={audioLevel}
                        audioOutputLevel={audioOutputLevel}
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {!sessionStarted && !conversationCompleted ? (
                      <>
                        {loading ? (
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Loading...</h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                              Preparing your personalized conversation with Diya.
                            </p>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-medium">
                              {onboardingCompleted ? "Congratulations, you have completed your onboarding!" : "Ready to start your journey with Diya?"}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
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

                                <Button 
                                  onClick={startConversation} 
                                  size="lg" 
                                  className="mt-4"
                                >
                                  {cumulativeSessionTime > 0 || currentSessionNumber > 1 ? "Resume Conversation" : "Start Conversation"}
                                </Button>
                                
                                <div className="mt-4 text-center">
                                  <button onClick={() => setShowInfoModal(true)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                                    <Info className="h-4 w-4" />
                                    When to skip onboarding?
                                  </button>
                                </div>

                                <Button 
                                  onClick={() => setShowSkipConfirmation(true)} 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-4"
                                >
                                  Skip Onboarding
                                </Button>
                              </>
                            ) : (
                              <Button 
                                onClick={() => navigate('/dashboard')} 
                                size="lg" 
                                className="mt-4"
                              >
                                View Dashboard
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    ) : sessionStarted ? (
                      <>
                        <h3 className="text-lg font-medium">
                          {conversation?.isSpeaking ? "Diya is speaking..." : "Diya is listening..."}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Share your thoughts and experiences naturally - just like talking to a friend!
                        </p>

                        <div className="flex gap-2 justify-center">
                          <Button onClick={pauseConversation} variant="outline" disabled={isProcessingMetadata}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Conversation
                          </Button>
                          <Button onClick={endConversation} variant="outline" disabled={isProcessingMetadata}>
                            {isProcessingMetadata ? "Processing..." : "End Conversation"}
                          </Button>
                        </div>
                      </>
                    ) : isPaused ? (
                      <>
                        <h3 className="text-lg font-medium">Conversation Paused</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          Your conversation has been paused. You can resume it when you're ready to continue.
                        </p>

                        <Button onClick={resumeConversation} size="lg" className="mt-4">
                          Resume Conversation
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-medium">Conversation Completed</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          Your conversation with Diya has been completed. You can start a new conversation.
                        </p>
                        <Button onClick={() => {
                          setShowCompletionPopup(false);
                          setSessionStarted(false);
                          setConversationCompleted(false);
                          setRemainingTime(Math.max(0, 2 * 60 - cumulativeSessionTime));
                          setConversationId(null);
                          setMessages([]);
                        }} size="lg" className="mt-4">
                          Start New Conversation
                        </Button>
                      </>
                    )}
                  </div>
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
                  <div className="mt-6">
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        {conversationCompleted ? 'Conversation Transcript' : 'Live Conversation'} ({messages.length} messages)
                      </h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-3 p-4 bg-muted/30 rounded-lg border">
                      {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.source === 'ai' ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg ${msg.source === 'ai' ? 'bg-primary/30 text-primary-foreground border border-primary/20' : 'bg-secondary text-secondary-foreground'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {msg.source === 'ai' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                              <span className="text-xs font-medium">
                                {msg.source === 'ai' ? 'Diya' : 'You'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {msg.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section with Topics and Tips */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Conversation Topics */}
            <Card className="lg:col-span-3 border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  What We'll Explore
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topics.map((topic, index) => (
                    <div key={topic.name} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${topic.completed ? 'bg-primary/10' : 'bg-muted/50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${topic.completed ? topic.bgColor : 'bg-muted/50'}`}>
                        <topic.icon className={`w-4 h-4 ${topic.completed ? topic.color : 'text-muted-foreground'}`} />
                      </div>
                      <span className={`text-sm flex-1 ${topic.completed ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {topic.name}
                      </span>
                      {topic.completed && <CheckCircle className="w-4 h-4 text-primary ml-auto" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Conversation Tips */}
            <Card className="lg:col-span-7 bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center mb-3 shadow-sm">
                  <Lightbulb className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Helpful Tips for Your Conversation with Diya</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {[{
                      icon: MessageSquare,
                      title: "Chat Naturally",
                      description: "Talk to Diya just like you would a friend or counselor. She's here to listen and understand you.",
                      color: "text-blue-500"
                    }, {
                      icon: Heart,
                      title: "Be Yourself",
                      description: "Share what truly matters to you. Diya wants to know the real you, not what you think sounds good.",
                      color: "text-red-500"
                    }].map((tip, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 transition-colors">
                        <div className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1`}>
                          <tip.icon className={`w-4 h-4 ${tip.color}`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-4">
                    {[{
                      icon: Target,
                      title: "Share Stories",
                      description: "Tell Diya about moments that shaped you - your successes, challenges, and dreams for the future.",
                      color: "text-green-500"
                    }, {
                      icon: CheckCircle,
                      title: "Ask Anything",
                      description: "Feel free to ask Diya questions about college, your future, or anything that's on your mind.",
                      color: "text-purple-500"
                    }].map((tip, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/80 transition-colors">
                        <div className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1`}>
                          <tip.icon className={`w-4 h-4 ${tip.color}`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{tip.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-6 text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-primary">Remember:</span> Diya is here to support you. This conversation helps us understand who you are to create your personalized college journey. We keep everything you say confidential.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Loading Modal Overlay */}
        {showLoadingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md relative" style={{ backgroundColor: '#F4EDE2' }}>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <CardTitle className="text-xl">Processing Your Conversation</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-4">
                  <div className="space-y-2">
                    {loadingMessages.map((message, index) => (
                      <div key={index} className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${loadingStep > index ? 'bg-green-500/10 text-green-600 border border-green-200' : loadingStep === index ? 'bg-primary/10 text-primary border border-primary/200' : 'bg-muted/30 text-muted-foreground'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${loadingStep > index ? 'bg-green-500 text-white' : loadingStep === index ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                          {loadingStep > index ? <CheckCircle className="w-4 h-4" /> : loadingStep === index ? 'bg-primary text-white' : <div className="w-2 h-2 rounded-full bg-muted-foreground" />}
                        </div>
                        <span className="text-sm font-medium">{message}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Progress value={loadingStep / loadingMessages.length * 100} className="w-full" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Step {loadingStep} of {loadingMessages.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Completion Popup Overlay */}
        {showCompletionPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl relative" style={{ backgroundColor: '#F4EDE2' }}>
              {/* Close button */}
              <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-8 w-8 p-0" onClick={() => {
                setShowCompletionPopup(false);
                // Keep the conversation completed state and transcript visible
              }}>
                <X className="h-4 w-4" />
              </Button>
              <CardHeader className="text-center">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${sessionDuration >= 900 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                  {sessionDuration >= 900 ? <CheckCircle className="w-8 h-8 text-green-500" /> : <Clock className="w-8 h-8 text-yellow-500" />}
                </div>
                <CardTitle className="text-2xl">
                  {sessionDuration >= 900 ? 'Onboarding Complete!' : 'Onboarding Incomplete'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {sessionDuration >= 900 ? (
                  <>
                    <p className="text-muted-foreground mb-6">
                      Thank you for completing your 15-minute onboarding session with Diya! Your profile has been updated and your school recommendations are ready.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                      <Button size="lg" className="flex-1 sm:flex-initial" onClick={() => navigate('/schools')}>
                        View School Recommendations
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-4">
                      You completed {Math.floor(sessionDuration / 60)} minutes of your onboarding conversation. 
                      To unlock your personalized school recommendations, please complete the full 15-minute session.
                    </p>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        <strong>Why 2 minutes?</strong> This is a testing duration to verify the Hindi voice functionality works correctly.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                      <Button size="lg" className="flex-1 sm:flex-initial" onClick={() => {
                        setShowCompletionPopup(false);
                        setSessionStarted(false);
                        setConversationCompleted(false);
                        setRemainingTime(2 * 60);
                        setConversationId(null);
                        setMessages([]);
                        setSessionStartTime(null);
                        setSessionDuration(0);
                      }}>
                        Complete Onboarding
                      </Button>
                      <Button size="lg" variant="outline" className="flex-1 sm:flex-initial" onClick={() => navigate('/dashboard')}>
                        Continue Later
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Modal */}
        {showInfoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl relative" style={{ backgroundColor: '#F4EDE2' }}>
              {/* Close button */}
              <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-8 w-8 p-0" onClick={() => setShowInfoModal(false)}>
                <X className="h-4 w-4" />
              </Button>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                  <Info className="w-8 h-8 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">When to Skip Onboarding</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-4 text-left">
                  <p className="text-muted-foreground">Skip onboarding if you already have your school list and deadlines finalized, and simply want to work on your essays and finalize your application with Diya.</p>
                  
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
                      <strong>Recommended for students close to deadlines!</strong>
                    </p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">You should skip onboarding if:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>You have already researched and selected your target schools</li>
                      <li>You know your application deadlines and requirements</li>
                      <li>You want to focus on essay writing and application refinement</li>
                      <li>You're in the final stages of your college application process</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">You should complete onboarding if:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>You're still exploring different colleges and programs</li>
                      <li>You need help identifying schools that match your profile</li>
                      <li>You want personalized school recommendations based on your preferences</li>
                      <li>You're early in the college application process</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button onClick={() => setShowInfoModal(false)} className="w-full">
                    Got it
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Skip Confirmation Modal */}
        <Dialog open={showSkipConfirmation} onOpenChange={setShowSkipConfirmation}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-orange-500" />
                Skip Onboarding?
              </DialogTitle>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Are you sure you want to skip the onboarding conversation? This will mark onboarding as complete and redirect you to your school list.</p>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-orange-800">Please note:</p>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• You will need to build your own school list manually</li>
                    <li>• Diya won't have knowledge about your profile, so application reviews may have limited insights</li>
                  </ul>
                </div>
              </div>
            </DialogHeader>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSkipConfirmation(false)}>
                Cancel
              </Button>
              <Button onClick={async () => {
                setShowSkipConfirmation(false);
                const success = await markOnboardingCompleted();
                if (success) {
                  // Clear localStorage when skipping
                  localStorage.removeItem('onboarding_remaining_time');
                  localStorage.removeItem('previous_onboarding_context');
                  
                  toast({
                    title: "Onboarding Complete",
                    description: "Onboarding has been marked as complete. Redirecting to your school list."
                  });
                  navigate('/schools');
                } else {
                  toast({
                    title: "Error",
                    description: "Failed to mark onboarding as complete. Please try again.",
                    variant: "destructive"
                  });
                }
              }}>
                Skip Onboarding
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Footer Features */}
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
    </GradientBackground>
  );
};
export default Onboarding;