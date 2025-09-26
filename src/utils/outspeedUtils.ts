import { OutspeedMessageItem, ParsedMessage } from '@/types/outspeed';

/**
 * Safely extracts text content from various possible Outspeed event structures
 * Supports both finalized message shapes and streaming/delta shapes.
 * @param item - The message item from Outspeed event
 * @returns The extracted text or empty string if not found
 */
function extractTextContent(item: OutspeedMessageItem): string {
  try {
    console.log('🔍 Extracting text from item:', JSON.stringify(item, null, 2));
    
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
    const possibleTextProps = ['body', 'data', 'value', 'content_text'];
    for (const prop of possibleTextProps) {
      if (prop in item && typeof (item as any)[prop] === 'string') {
        const text = (item as any)[prop];
        console.log(`✅ Found text in ${prop} property:`, text);
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
 * Safely parses an Outspeed message item into our standardized message format
 * @param item - The message item from Outspeed event
 * @returns A parsed message object with standardized structure, or null if message is empty
 */
export function parseOutspeedMessage(item: OutspeedMessageItem): ParsedMessage | null {
  try {
    console.log('🔍 Parsing Outspeed message item:', {
      id: item.id,
      type: item.type,
      role: item.role,
      contentType: typeof item.content,
      contentIsArray: Array.isArray(item.content)
    });
    
    // Extract text content with fallback handling
    const text = extractTextContent(item);
    
    // Return null for empty or whitespace-only messages
    if (!text || text.trim().length === 0) {
      console.log('⏭️ Skipping empty message from item:', item.id, 'Role:', item.role);
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
      timestamp: new Date()
    };
    
    console.log('✅ Successfully parsed message:', parsedMessage);
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

  const text = extractTextContent(item);

  // Only process items with actual content
  return !!(text && text.trim().length > 0);
}
