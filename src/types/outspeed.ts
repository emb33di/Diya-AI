/**
 * TypeScript interfaces for Outspeed API events and data structures
 */

export interface OutspeedEvent {
  item: {
    id?: string;
    type: string;
    role?: string;
    content?: Array<{ text: string }> | string | { text: string };
  };
}

export interface ParsedMessage {
  id: string;
  source: 'ai' | 'user';
  text: string;
  timestamp: Date;
  isInProgress?: boolean; // Flag to identify incomplete/in_progress messages
}

export interface OutspeedMessageItem {
  id?: string;
  type: string;
  role?: string;
  content?: Array<{ text: string }> | string | { text: string };
  timestamp?: Date | string | number;
}
