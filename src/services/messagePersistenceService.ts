/**
 * Message Persistence Service
 * Handles immediate persistence of conversation messages to prevent data loss
 */

import { supabase } from '@/integrations/supabase/client';

export interface ConversationMessage {
  id?: string;
  conversation_id: string;
  user_id: string;
  source: 'ai' | 'user';
  text: string;
  timestamp: Date;
  message_order: number;
  created_at?: string;
}

export interface MessageValidationResult {
  isValid: boolean;
  warnings: string[];
  messageCount: number;
  totalLength: number;
  hasUserMessages: boolean;
  hasAIMessages: boolean;
}

export class MessagePersistenceService {
  private static readonly STORAGE_KEY = 'conversation_messages';
  private static readonly MAX_LOCAL_MESSAGES = 1000; // Prevent localStorage overflow

  /**
   * Store a single message immediately
   * NOTE: This method is deprecated - use Outspeed API for transcript storage instead
   */
  static async storeMessage(
    conversationId: string, 
    userId: string, 
    message: Omit<ConversationMessage, 'conversation_id' | 'user_id' | 'id' | 'created_at'>
  ): Promise<boolean> {
    console.warn('MessagePersistenceService.storeMessage is deprecated. Use Outspeed API for transcript storage.');
    return true; // Return true to avoid breaking existing code
  }

  /**
   * Store message in localStorage as fallback
   * NOTE: This method is deprecated - use Outspeed API for transcript storage instead
   */
  private static storeMessageLocally(conversationId: string, message: ConversationMessage): void {
    console.warn('MessagePersistenceService.storeMessageLocally is deprecated. Use Outspeed API for transcript storage.');
    // No-op to avoid breaking existing code
  }

  /**
   * Get all messages for a conversation
   * NOTE: This method is deprecated - use Outspeed API for transcript retrieval instead
   */
  static async getMessages(conversationId: string, userId: string): Promise<ConversationMessage[]> {
    console.warn('MessagePersistenceService.getMessages is deprecated. Use Outspeed API for transcript retrieval.');
    return []; // Return empty array to avoid breaking existing code
  }

  /**
   * Get messages from localStorage
   * NOTE: This method is deprecated - use Outspeed API for transcript retrieval instead
   */
  private static getMessagesLocally(conversationId: string): ConversationMessage[] {
    console.warn('MessagePersistenceService.getMessagesLocally is deprecated. Use Outspeed API for transcript retrieval.');
    return []; // Return empty array to avoid breaking existing code
  }

  /**
   * Convert messages to transcript format
   */
  static messagesToTranscript(messages: ConversationMessage[]): string {
    return messages
      .map(msg => `${msg.source === 'ai' ? 'Diya' : 'You'}: ${msg.text}`)
      .join('\n');
  }

  /**
   * Validate conversation messages
   */
  static validateMessages(messages: ConversationMessage[]): MessageValidationResult {
    const hasUserMessages = messages.some(m => m.source === 'user');
    const hasAIMessages = messages.some(m => m.source === 'ai');
    const totalLength = messages.reduce((sum, m) => sum + m.text.length, 0);
    const messageCount = messages.length;

    const warnings: string[] = [];
    
    if (!hasUserMessages) warnings.push('No user messages captured');
    if (!hasAIMessages) warnings.push('No AI messages captured');
    if (totalLength < 100) warnings.push('Transcript too short (less than 100 characters)');
    if (messageCount < 4) warnings.push('Very few messages captured (less than 4)');
    if (totalLength > 50000) warnings.push('Transcript very long (over 50,000 characters)');

    const isValid = hasUserMessages && hasAIMessages && totalLength >= 50 && messageCount >= 2;

    return {
      isValid,
      warnings,
      messageCount,
      totalLength,
      hasUserMessages,
      hasAIMessages
    };
  }

  /**
   * Clear local messages for a conversation
   * NOTE: This method is deprecated - use Outspeed API for transcript storage instead
   */
  static clearLocalMessages(conversationId: string): void {
    console.warn('MessagePersistenceService.clearLocalMessages is deprecated. Use Outspeed API for transcript storage.');
    // No-op to avoid breaking existing code
  }

  /**
   * Get conversation statistics
   */
  static getConversationStats(messages: ConversationMessage[]): {
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    totalLength: number;
    averageMessageLength: number;
    duration?: number;
  } {
    const userMessages = messages.filter(m => m.source === 'user');
    const aiMessages = messages.filter(m => m.source === 'ai');
    const totalLength = messages.reduce((sum, m) => sum + m.text.length, 0);
    
    let duration: number | undefined;
    if (messages.length > 1) {
      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      duration = new Date(lastMessage.timestamp).getTime() - new Date(firstMessage.timestamp).getTime();
    }

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      aiMessages: aiMessages.length,
      totalLength,
      averageMessageLength: messages.length > 0 ? totalLength / messages.length : 0,
      duration
    };
  }
}
