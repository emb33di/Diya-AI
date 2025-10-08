import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Define the shape of a single message
export interface TranscriptMessage {
  id: string;
  source: 'ai' | 'user';
  text: string;
  timestamp: Date;
  isInProgress?: boolean;
}

// Define the store's state and actions
interface OnboardingState {
  // State
  sessionState: 'idle' | 'active' | 'error';
  conversationId: string | null;
  sessionStartTime: Date | null;
  messages: TranscriptMessage[];
  processedMessageIds: Set<string>;
  isSpeaking: boolean;
  conversationReady: boolean;
  cumulativeSessionTime: number;

  // Actions - Named for events, not just setting variables
  startSession: (conversationId: string) => void;
  endSession: () => void;
  addCompletedMessage: (message: TranscriptMessage) => void;
  updateInProgressMessage: (message: TranscriptMessage) => void;
  setIsSpeaking: (speaking: boolean) => void;
  setConversationReady: (ready: boolean) => void;
  setCumulativeTime: (time: number) => void;
  resetConversation: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  subscribeWithSelector(
    (set, get) => ({
      // --- INITIAL STATE ---
      sessionState: 'idle',
      conversationId: null,
      sessionStartTime: null,
      messages: [],
      processedMessageIds: new Set(),
      isSpeaking: false,
      conversationReady: false,
      cumulativeSessionTime: 0,

      // --- ACTIONS ---
      // A single action to handle all state changes when a session starts
      startSession: (conversationId) => {
        set({
          sessionState: 'active',
          sessionStartTime: new Date(),
          conversationId,
        });
      },
      
      // A single action to handle all state changes when a session ends
      endSession: () => {
        set({
          sessionState: 'idle',
          sessionStartTime: null,
          isSpeaking: false,
          conversationReady: false,
        });
      },
      
      // Adds a new, completed message, with deduplication logic built-in
      addCompletedMessage: (message) => {
        if (get().processedMessageIds.has(message.id)) return; // Deduplication
        set(state => ({
          messages: [...state.messages, message],
          processedMessageIds: new Set(state.processedMessageIds).add(message.id),
        }));
      },

      // Specifically for streaming AI responses
      updateInProgressMessage: (message) => {
        set(state => {
          const existingIndex = state.messages.findIndex(m => m.id === message.id);
          if (existingIndex !== -1) {
            // If the message exists, update its text
            const updatedMessages = [...state.messages];
            updatedMessages[existingIndex] = message;
            return { messages: updatedMessages };
          } else {
            // If it's a new in-progress message, add it
            return { messages: [...state.messages, message] };
          }
        });
      },

      setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),
      
      setConversationReady: (ready) => set({ conversationReady: ready }),
      
      setCumulativeTime: (time) => set({ cumulativeSessionTime: time }),

      // Resets the state for a new conversation
      resetConversation: () => {
        set({
          messages: [],
          processedMessageIds: new Set(),
          conversationId: null,
          sessionState: 'idle',
          isSpeaking: false,
          conversationReady: false,
          cumulativeSessionTime: 0,
        });
      },
    })
  )
);
