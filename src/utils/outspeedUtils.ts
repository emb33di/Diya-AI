import { OutspeedMessageItem, ParsedMessage } from '@/types/outspeed';

/**
 * Safely extracts text content from various possible Outspeed event structures
 * @param item - The message item from Outspeed event
 * @returns The extracted text or empty string if not found
 */
function extractTextContent(item: OutspeedMessageItem): string {
  try {
    // Case 1: content is an array with text property
    if (Array.isArray(item.content) && item.content.length > 0) {
      const firstItem = item.content[0];
      if (typeof firstItem === 'object' && firstItem !== null && 'text' in firstItem) {
        return firstItem.text || '';
      }
    }

    // Case 2: content is a string
    if (typeof item.content === 'string') {
      return item.content;
    }

    // Case 3: content is an object with text property
    if (typeof item.content === 'object' && item.content !== null && 'text' in item.content) {
      return (item.content as { text: string }).text || '';
    }

    // Case 4: text property directly on item
    if ('text' in item && typeof (item as any).text === 'string') {
      return (item as any).text;
    }

    // Case 5: message property (fallback for old format)
    if ('message' in item && typeof (item as any).message === 'string') {
      return (item as any).message;
    }

    return '';
  } catch (error) {
    console.warn('Error extracting text content:', error);
    return '';
  }
}

/**
 * Safely maps Outspeed roles to our internal message source format
 * @param role - The role from Outspeed event
 * @returns 'ai' for assistant roles, 'user' for user roles, 'user' as default
 */
function mapRoleToSource(role?: string): 'ai' | 'user' {
  if (!role) {
    console.warn('No role provided, defaulting to user');
    return 'user';
  }

  const normalizedRole = role.toLowerCase().trim();
  
  switch (normalizedRole) {
    case 'assistant':
    case 'ai':
    case 'bot':
    case 'system':
      return 'ai';
    case 'user':
    case 'human':
    case 'person':
      return 'user';
    default:
      console.warn(`Unknown role: "${role}", defaulting to user`);
      return 'user';
  }
}

/**
 * Generates a unique fallback ID if the event doesn't provide one
 * @returns A unique ID string
 */
function generateFallbackId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safely parses an Outspeed message item into our standardized message format
 * @param item - The message item from Outspeed event
 * @returns A parsed message object with standardized structure
 */
export function parseOutspeedMessage(item: OutspeedMessageItem): ParsedMessage {
  try {
    // Extract text content with fallback handling
    const text = extractTextContent(item);
    
    // Map role to source with fallback handling
    const source = mapRoleToSource(item.role);
    
    // Use provided ID or generate fallback
    const id = item.id || generateFallbackId();
    
    return {
      id,
      source,
      text,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error parsing Outspeed message:', error, 'Item:', item);
    
    // Return a safe fallback message
    return {
      id: generateFallbackId(),
      source: 'user',
      text: '',
      timestamp: new Date()
    };
  }
}

/**
 * Validates if an event item is a message type that we should process
 * @param item - The message item from Outspeed event
 * @returns true if the item should be processed as a message
 */
export function isValidMessageItem(item: OutspeedMessageItem): boolean {
  return item && 
         typeof item === 'object' && 
         item.type === 'message' &&
         (extractTextContent(item).length > 0 || item.role);
}
