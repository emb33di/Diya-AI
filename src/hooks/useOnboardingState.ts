import { useState, useCallback, useEffect, useRef } from 'react';
import { BookOpen, Briefcase, Trophy, Heart, GraduationCap, DollarSign } from 'lucide-react';

export interface OnboardingState {
  // Session state
  sessionStarted: boolean;
  setSessionStarted: (started: boolean) => void;
  sessionStartTime: Date | null;
  setSessionStartTime: (time: Date | null) => void;
  sessionDuration: number;
  setSessionDuration: (duration: number) => void;
  cumulativeSessionTime: number;
  setCumulativeSessionTime: (time: number) => void;
  sessionState: 'idle' | 'active' | 'error';
  setSessionState: (state: 'idle' | 'active' | 'error') => void;
  hasStartedOnce: boolean;
  setHasStartedOnce: (started: boolean) => void;
  
  // Timer state
  remainingTime: number;
  setRemainingTime: (time: number) => void;
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  
  // UI state
  expandedView: boolean;
  setExpandedView: (expanded: boolean) => void;
  showTranscript: boolean;
  setShowTranscript: (show: boolean) => void;
  voiceOrbSize: number;
  setVoiceOrbSize: (size: number) => void;
  landingOrbSize: number;
  setLandingOrbSize: (size: number) => void;
  
  // Audio state
  audioLevel: number;
  setAudioLevel: (level: number) => void;
  audioOutputLevel: number;
  setAudioOutputLevel: (level: number) => void;
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;
  frequencyData: Uint8Array;
  setFrequencyData: (data: Uint8Array) => void;
  
  // Refs
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  microphoneRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
  micStreamRef: React.MutableRefObject<MediaStream | null>;
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>;
  transcriptScrollRef: React.MutableRefObject<HTMLDivElement | null>;
  sessionFinalizedRef: React.MutableRefObject<boolean>;
  
  // Topics state
  topics: Array<{
    name: string;
    icon: any;
    color: string;
    bgColor: string;
    completed: boolean;
  }>;
  setTopics: (topics: Array<{
    name: string;
    icon: any;
    color: string;
    bgColor: string;
    completed: boolean;
  }>) => void;
  
  // Helper functions
  formatTime: (seconds: number) => string;
  persistRemainingTime: (time: number) => void;
  calculateProgressPercentage: () => number;
}

export const useOnboardingState = (): OnboardingState => {
  // Session state
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [cumulativeSessionTime, setCumulativeSessionTime] = useState(0);
  const [sessionState, setSessionState] = useState<'idle' | 'active' | 'error'>('idle');
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  
  // Timer state
  const [remainingTime, setRemainingTime] = useState(10 * 60); // 10 minutes in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // UI state
  const [expandedView, setExpandedView] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [voiceOrbSize, setVoiceOrbSize] = useState(256);
  const [landingOrbSize, setLandingOrbSize] = useState(160);
  
  // Audio state
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioOutputLevel, setAudioOutputLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(64));
  
  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const sessionFinalizedRef = useRef<boolean>(false);
  
  // Topics state
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
  
  // Helper function to persist remaining time
  const persistRemainingTime = useCallback((time: number) => {
    try {
      localStorage.setItem('onboarding_remaining_time', time.toString());
    } catch (error) {
      console.warn('Could not save remaining time to localStorage:', error);
    }
  }, []);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentage for the progress bar
  const calculateProgressPercentage = useCallback(() => {
    const totalSecondsNeeded = 10 * 60; // 10 minutes
    return ((totalSecondsNeeded - remainingTime) / totalSecondsNeeded) * 100;
  }, [remainingTime]);

  // Update remaining time when cumulative time changes
  useEffect(() => {
    const totalSecondsNeeded = 10 * 60; // 10 minutes
    const newRemainingTime = Math.max(0, totalSecondsNeeded - cumulativeSessionTime);
    setRemainingTime(newRemainingTime);
    persistRemainingTime(newRemainingTime);
    
    console.log('Updated remaining time:', {
      cumulativeTime: cumulativeSessionTime,
      remainingTime: newRemainingTime,
      totalNeeded: totalSecondsNeeded
    });
  }, [cumulativeSessionTime, persistRemainingTime]);

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
              if (sessionStarted) {
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

  return {
    // Session state
    sessionStarted,
    setSessionStarted,
    sessionStartTime,
    setSessionStartTime,
    sessionDuration,
    setSessionDuration,
    cumulativeSessionTime,
    setCumulativeSessionTime,
    sessionState,
    setSessionState,
    hasStartedOnce,
    setHasStartedOnce,
    
    // Timer state
    remainingTime,
    setRemainingTime,
    timerRef,
    
    // UI state
    expandedView,
    setExpandedView,
    showTranscript,
    setShowTranscript,
    voiceOrbSize,
    setVoiceOrbSize,
    landingOrbSize,
    setLandingOrbSize,
    
    // Audio state
    audioLevel,
    setAudioLevel,
    audioOutputLevel,
    setAudioOutputLevel,
    isSpeaking,
    setIsSpeaking,
    frequencyData,
    setFrequencyData,
    
    // Refs
    audioContextRef,
    analyserRef,
    microphoneRef,
    micStreamRef,
    messagesEndRef,
    transcriptScrollRef,
    sessionFinalizedRef,
    
    // Topics state
    topics,
    setTopics,
    
    // Helper functions
    formatTime,
    persistRemainingTime,
    calculateProgressPercentage,
  };
};
