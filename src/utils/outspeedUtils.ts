import { OutspeedMessageItem, ParsedMessage } from '@/types/outspeed';

/**
 * Safely extracts text content from various possible Outspeed event structures
 * Supports both finalized message shapes and streaming/delta shapes.
 * @param item - The message item from Outspeed event
 * @returns The extracted text or empty string if not found
 */
function extractTextContent(item: OutspeedMessageItem): string {
  try {
    // Only log full JSON in development and for debugging
    if (import.meta.env.DEV) {
      console.log('🔍 Extracting text from item:', JSON.stringify(item, null, 2));
    }
    
    // Case 0: common "delta" containers used by streaming outputs
    // e.g. { type: 'response.output_text.delta', delta: '...' }
    if (typeof (item as any).delta === 'string' && (item as any).delta.trim().length > 0) {
      const text = (item as any).delta as string;
      console.log('✅ Found text in delta property:', text);
      return text;
    }

    // Case 1: content is an array with text property
    if (Array.isArray(item.content) && item.content.length > 0) {
      const firstItem = item.content[0];
      if (typeof firstItem === 'object' && firstItem !== null && 'text' in firstItem) {
        const text = firstItem.text || '';
        console.log('✅ Found text in array content:', text);
        return text;
      }
    }

    // Case 2: content is a string
    if (typeof item.content === 'string') {
      console.log('✅ Found text in string content:', item.content);
      return item.content;
    }

    // Case 3: content is an object with text property
    if (typeof item.content === 'object' && item.content !== null && 'text' in item.content) {
      const text = (item.content as { text: string }).text || '';
      console.log('✅ Found text in object content:', text);
      return text;
    }

    // Case 4: text property directly on item
    if ('text' in item && typeof (item as any).text === 'string') {
      const text = (item as any).text;
      console.log('✅ Found text directly on item:', text);
      return text;
    }

    // Case 5: message property (fallback for old format)
    if ('message' in item && typeof (item as any).message === 'string') {
      const text = (item as any).message;
      console.log('✅ Found text in message property:', text);
      return text;
    }

    // Case 6: Check for nested content structures (e.g., content.content.text)
    if (typeof item.content === 'object' && item.content !== null) {
      const contentObj = item.content as any;
      if (contentObj.content && typeof contentObj.content === 'string') {
        console.log('✅ Found text in nested content:', contentObj.content);
        return contentObj.content;
      }
      if (contentObj.content && Array.isArray(contentObj.content) && contentObj.content.length > 0) {
        const nestedItem = contentObj.content[0];
        if (typeof nestedItem === 'object' && nestedItem !== null && 'text' in nestedItem) {
          const text = nestedItem.text || '';
          console.log('✅ Found text in nested array content:', text);
          return text;
        }
        // Also handle delta nested inside content objects
        if (typeof nestedItem === 'object' && nestedItem !== null && 'delta' in nestedItem && typeof nestedItem.delta === 'string') {
          const text = nestedItem.delta as string;
          console.log('✅ Found text in nested delta content:', text);
          return text;
        }
      }
      // Direct delta on content object
      if ('delta' in contentObj && typeof contentObj.delta === 'string') {
        const text = contentObj.delta as string;
        console.log('✅ Found text in content.delta:', text);
        return text;
      }
    }

    // Case 7: Check for other possible text properties
    const possibleTextProps = ['body', 'data', 'value', 'content_text', 'transcript'];
    for (const prop of possibleTextProps) {
      if (prop in item && typeof (item as any)[prop] === 'string') {
        const text = (item as any)[prop];
        console.log(`✅ Found text in ${prop} property:`, text);
        return text;
      }
    }

    // Case 8: Check for audio-specific properties
    if ('audio' in item && typeof (item as any).audio === 'object' && (item as any).audio !== null) {
      const audioObj = (item as any).audio;
      if ('transcript' in audioObj && typeof audioObj.transcript === 'string') {
        const text = audioObj.transcript;
        console.log('✅ Found text in audio.transcript:', text);
        return text;
      }
    }

    console.log('❌ No text content found in item');
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
 * Safely creates a Date object from various timestamp formats
 * @param timestamp - The timestamp to parse (Date, string, number, or undefined)
 * @returns A valid Date object, or current time if parsing fails
 */
export function safeCreateTimestamp(timestamp?: Date | string | number): Date {
  try {
    // If already a Date object, validate it
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? new Date() : timestamp;
    }
    
    // If undefined or null, return current time
    if (timestamp === undefined || timestamp === null) {
      return new Date();
    }
    
    // Try to parse as Date
    const parsedDate = new Date(timestamp);
    
    // Check if the parsed date is valid
    if (isNaN(parsedDate.getTime())) {
      console.warn('Invalid timestamp provided, using current time:', timestamp);
      return new Date();
    }
    
    return parsedDate;
  } catch (error) {
    console.warn('Error parsing timestamp, using current time:', error, 'Timestamp:', timestamp);
    return new Date();
  }
}

/**
 * Safely parses an Outspeed message item into our standardized message format
 * @param item - The message item from Outspeed event
 * @param originalItem - Optional original item with timestamp information
 * @returns A parsed message object with standardized structure, or null if message is empty
 */
export function parseOutspeedMessage(item: OutspeedMessageItem, originalItem?: any): ParsedMessage | null {
  try {
    console.log('🔍 Parsing Outspeed message item:', {
      id: item.id,
      type: item.type,
      role: item.role,
      contentType: typeof item.content,
      contentIsArray: Array.isArray(item.content),
      status: (item as any).status,
      fullItem: item
    });
    
    // Extract text content with fallback handling
    const text = extractTextContent(item);
    const isInProgress = (item as any).status === 'in_progress';
    
    // Handle in_progress messages differently
    if (isInProgress) {
      console.log('🔄 Processing in_progress message:', item.id, 'Role:', item.role);
      
      // For in_progress messages, use placeholder text if no content
      const displayText = text && text.trim().length > 0 
        ? text 
        : '[Diya is responding...]';
      
      // Map role to source with fallback handling
      const source = mapRoleToSource(item.role);
      
      // Use provided ID or generate fallback
      const id = item.id || generateFallbackId();
      
      const parsedMessage = {
        id,
        source,
        text: displayText,
        timestamp: safeCreateTimestamp(originalItem?.timestamp),
        isInProgress: true // Add flag to identify incomplete messages
      };
      
      console.log('✅ Successfully parsed in_progress message:', parsedMessage);
      return parsedMessage;
    }
    
    // Return null for empty or whitespace-only completed messages
    if (!text || text.trim().length === 0) {
      console.log('⏭️ Skipping empty completed message from item:', item.id, 'Role:', item.role);
      return null;
    }
    
    // Map role to source with fallback handling
    const source = mapRoleToSource(item.role);
    
    // Use provided ID or generate fallback
    const id = item.id || generateFallbackId();
    
    const parsedMessage = {
      id,
      source,
      text,
      timestamp: safeCreateTimestamp(originalItem?.timestamp)
    };
    
    console.log('✅ Successfully parsed completed message:', parsedMessage);
    return parsedMessage;
  } catch (error) {
    console.error('❌ Error parsing Outspeed message:', error, 'Item:', item);
    
    // Return null for parsing errors instead of empty message
    return null;
  }
}

/**
 * Validates if an event item is a message type that we should process
 * @param item - The message item from Outspeed event
 * @returns true if the item should be processed as a message
 */
export function isValidMessageItem(item: OutspeedMessageItem): boolean {
  // Accept any object-shaped event if we can extract non-empty text from it,
  // regardless of the specific item.type. This supports streaming/delta events.
  if (!item || typeof item !== 'object') {
    return false;
  }

  // Check if this is a message-type item (regardless of status)
  const isMessageType = item.type === 'message' || 
                       (item as any).object === 'realtime.item' ||
                       item.role === 'assistant' || 
                       item.role === 'user';

  if (!isMessageType) {
    return false;
  }

  const text = extractTextContent(item);

  // Process items with actual content OR in_progress messages (even if empty)
  // This allows us to show incomplete AI responses
  const hasContent = !!(text && text.trim().length > 0);
  const isInProgress = (item as any).status === 'in_progress';
  
  return hasContent || isInProgress;
}
