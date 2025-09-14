/**
 * Google Docs-Level Comment System
 * 
 * This service implements the same architecture as Google Docs for perfect comment alignment.
 * It uses Operational Transform (OT) to maintain comment positions during real-time editing.
 */

import { supabase } from '@/integrations/supabase/client';

// Core Types for Google Docs-style system
export interface DocumentOperation {
  id: string;
  essayId: string;
  userId: string;
  operationType: 'insert' | 'delete' | 'retain' | 'format';
  position: number;
  length: number;
  textContent?: string;
  operationId: string;
  parentOperationId?: string;
  timestamp: number;
  clientId: string;
  documentVersion: number;
  operationVersion: number;
  applied: boolean;
  transformed: boolean;
}

export interface DocumentSnapshot {
  id: string;
  essayId: string;
  version: number;
  contentHash: string;
  contentText: string;
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  createdByOperationId: string;
}

export interface CommentAnchor {
  id: string;
  commentId: string;
  anchorType: 'text' | 'paragraph' | 'position';
  documentVersion: number;
  startPosition: number;
  endPosition: number;
  anchorText: string;
  contentHash: string;
  paragraphIndex?: number;
  sentenceIndex?: number;
  operationHistory?: any[];
}

export interface CollaborativeSession {
  id: string;
  essayId: string;
  userId: string;
  sessionId: string;
  clientId: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  lastActivity: string;
  documentVersion: number;
  cursorPosition?: number;
  selectionStart?: number;
  selectionEnd?: number;
}

export interface CommentThread {
  id: string;
  essayId: string;
  threadId: string;
  threadType: 'comment' | 'suggestion' | 'question';
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  threadTitle?: string;
  threadDescription?: string;
  anchorId?: string;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  userId: string;
  messageText: string;
  messageType: 'comment' | 'reply' | 'suggestion' | 'resolution';
  richContent?: any;
  isEdited: boolean;
  editedAt?: string;
  originalMessageId?: string;
}

/**
 * Operational Transform Service
 * Handles real-time document editing with perfect comment alignment
 */
export class GoogleDocsCommentService {
  
  /**
   * Apply an operation to document content
   * This is the core of the OT system
   */
  static async applyOperation(
    essayId: string,
    operation: Omit<DocumentOperation, 'id' | 'documentVersion' | 'operationVersion'>
  ): Promise<DocumentOperation> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');

      // Generate unique operation ID
      const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get current document version
      const currentVersion = await this.getDocumentVersion(essayId);
      
      // Create the operation
      const { data: newOperation, error } = await supabase
        .from('document_operations')
        .insert({
          essay_id: essayId,
          user_id: session.user.id,
          operation_type: operation.operationType,
          position: operation.position,
          length: operation.length,
          text_content: operation.textContent,
          operation_id: operationId,
          parent_operation_id: operation.parentOperationId,
          timestamp: operation.timestamp,
          client_id: operation.clientId,
          applied: operation.applied,
          transformed: operation.transformed
        })
        .select()
        .single();

      if (error) throw error;

      // Update document content
      await this.updateDocumentContent(essayId, newOperation);

      // Transform existing comment anchors
      await this.transformCommentAnchors(essayId, newOperation);

      return newOperation;
    } catch (error) {
      console.error('Error applying operation:', error);
      throw error;
    }
  }

  /**
   * Transform comment anchors when document changes
   * This ensures comments stay aligned during editing
   */
  static async transformCommentAnchors(
    essayId: string,
    operation: DocumentOperation
  ): Promise<void> {
    try {
      // Get all comment anchors that might be affected
      const { data: anchors, error } = await supabase
        .from('comment_anchors')
        .select('*')
        .eq('comment_id', (comment: any) => 
          supabase
            .from('essay_comments')
            .select('id')
            .eq('essay_id', essayId)
        );

      if (error) throw error;

      // Transform each anchor based on the operation
      for (const anchor of anchors || []) {
        const transformedAnchor = this.transformAnchorPosition(anchor, operation);
        
        if (transformedAnchor.startPosition !== anchor.start_position ||
            transformedAnchor.endPosition !== anchor.end_position) {
          
          // Update the anchor position
          await supabase
            .from('comment_anchors')
            .update({
              start_position: transformedAnchor.startPosition,
              end_position: transformedAnchor.endPosition,
              operation_history: [
                ...(anchor.operation_history || []),
                {
                  operationId: operation.operation_id,
                  operationType: operation.operation_type,
                  originalPosition: anchor.start_position,
                  newPosition: transformedAnchor.startPosition,
                  timestamp: operation.timestamp
                }
              ]
            })
            .eq('id', anchor.id);
        }
      }
    } catch (error) {
      console.error('Error transforming comment anchors:', error);
      throw error;
    }
  }

  /**
   * Transform anchor position based on operation
   * This implements the core OT algorithm
   */
  private static transformAnchorPosition(
    anchor: any,
    operation: DocumentOperation
  ): { startPosition: number; endPosition: number } {
    let startPos = anchor.start_position;
    let endPos = anchor.end_position;

    switch (operation.operation_type) {
      case 'insert':
        if (operation.position <= startPos) {
          // Insertion before anchor - shift anchor right
          startPos += operation.length;
          endPos += operation.length;
        } else if (operation.position < endPos) {
          // Insertion within anchor - extend anchor
          endPos += operation.length;
        }
        // Insertion after anchor - no change
        break;

      case 'delete':
        if (operation.position < startPos) {
          // Deletion before anchor - shift anchor left
          const shiftAmount = Math.min(operation.length, startPos - operation.position);
          startPos -= shiftAmount;
          endPos -= shiftAmount;
        } else if (operation.position < endPos) {
          // Deletion within anchor - shrink anchor
          const deleteStart = operation.position;
          const deleteEnd = Math.min(operation.position + operation.length, endPos);
          const deletedLength = deleteEnd - deleteStart;
          endPos -= deletedLength;
        }
        break;

      case 'retain':
        // No position change needed
        break;
    }

    return { startPosition: startPos, endPosition: endPos };
  }

  /**
   * Create a comment with perfect anchoring
   * This creates immutable comment anchors like Google Docs
   */
  static async createCommentWithAnchor(
    essayId: string,
    commentData: {
      textSelection: { start: { pos: number; path: number[] }; end: { pos: number; path: number[] } };
      anchorText: string;
      commentText: string;
      commentType: 'suggestion' | 'critique' | 'praise' | 'question';
    }
  ): Promise<{ comment: any; anchor: CommentAnchor }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');

      // Get current document version
      const documentVersion = await this.getDocumentVersion(essayId);

      // Create the comment first
      const { data: comment, error: commentError } = await supabase
        .from('essay_comments')
        .insert({
          essay_id: essayId,
          user_id: session.user.id,
          text_selection: commentData.textSelection,
          anchor_text: commentData.anchorText,
          comment_text: commentData.commentText,
          comment_type: commentData.commentType,
          ai_generated: false
        })
        .select()
        .single();

      if (commentError) throw commentError;

      // Create immutable comment anchor
      const { data: anchor, error: anchorError } = await supabase
        .from('comment_anchors')
        .insert({
          comment_id: comment.id,
          anchor_type: 'text',
          document_version: documentVersion,
          start_position: commentData.textSelection.start.pos,
          end_position: commentData.textSelection.end.pos,
          anchor_text: commentData.anchorText,
          content_hash: await this.hashContent(commentData.anchorText)
        })
        .select()
        .single();

      if (anchorError) throw anchorError;

      return { comment, anchor };
    } catch (error) {
      console.error('Error creating comment with anchor:', error);
      throw error;
    }
  }

  /**
   * Get comments with perfect alignment
   * Returns comments with their current positions after all operations
   */
  static async getCommentsWithAlignment(essayId: string): Promise<Array<{
    comment: any;
    anchor: CommentAnchor;
    currentText: string;
    isAligned: boolean;
  }>> {
    try {
      // Get all comments for the essay
      const { data: comments, error: commentsError } = await supabase
        .from('essay_comments')
        .select('*')
        .eq('essay_id', essayId)
        .eq('resolved', false);

      if (commentsError) throw commentsError;

      // Get current document content
      const { data: essay, error: essayError } = await supabase
        .from('essays')
        .select('content')
        .eq('id', essayId)
        .single();

      if (essayError) throw essayError;

      const documentContent = essay.content;

      // Get anchors for each comment
      const results = [];
      for (const comment of comments || []) {
        const { data: anchor, error: anchorError } = await supabase
          .from('comment_anchors')
          .select('*')
          .eq('comment_id', comment.id)
          .single();

        if (anchorError) continue;

        // Extract current text at anchor position
        const currentText = documentContent.substring(
          anchor.start_position,
          anchor.end_position
        );

        // Check if anchor text matches current text
        const isAligned = currentText === anchor.anchor_text;

        results.push({
          comment,
          anchor,
          currentText,
          isAligned
        });
      }

      return results;
    } catch (error) {
      console.error('Error getting comments with alignment:', error);
      throw error;
    }
  }

  /**
   * Create collaborative session for real-time editing
   */
  static async createCollaborativeSession(
    essayId: string,
    clientId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<CollaborativeSession> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const documentVersion = await this.getDocumentVersion(essayId);

      const { data: collaborativeSession, error } = await supabase
        .from('collaborative_sessions')
        .insert({
          essay_id: essayId,
          user_id: session.user.id,
          session_id: sessionId,
          client_id: clientId,
          user_agent: userAgent,
          ip_address: ipAddress,
          is_active: true,
          document_version: documentVersion
        })
        .select()
        .single();

      if (error) throw error;

      return collaborativeSession;
    } catch (error) {
      console.error('Error creating collaborative session:', error);
      throw error;
    }
  }

  /**
   * Get active collaborative sessions
   */
  static async getActiveSessions(essayId: string): Promise<CollaborativeSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('collaborative_sessions')
        .select('*')
        .eq('essay_id', essayId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      return sessions || [];
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw error;
    }
  }

  /**
   * Update document content based on operation
   */
  private static async updateDocumentContent(
    essayId: string,
    operation: DocumentOperation
  ): Promise<void> {
    try {
      // Get current content
      const { data: essay, error: essayError } = await supabase
        .from('essays')
        .select('content')
        .eq('id', essayId)
        .single();

      if (essayError) throw essayError;

      let newContent = essay.content;

      // Apply operation to content
      switch (operation.operation_type) {
        case 'insert':
          newContent = 
            newContent.substring(0, operation.position) +
            (operation.text_content || '') +
            newContent.substring(operation.position);
          break;

        case 'delete':
          newContent = 
            newContent.substring(0, operation.position) +
            newContent.substring(operation.position + operation.length);
          break;

        case 'retain':
          // No content change
          break;
      }

      // Update essay content
      await supabase
        .from('essays')
        .update({ content: newContent })
        .eq('id', essayId);

    } catch (error) {
      console.error('Error updating document content:', error);
      throw error;
    }
  }

  /**
   * Get current document version
   */
  private static async getDocumentVersion(essayId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_document_version', {
        essay_uuid: essayId
      });

      if (error) throw error;

      return data || 0;
    } catch (error) {
      console.error('Error getting document version:', error);
      return 0;
    }
  }

  /**
   * Hash content for immutable references
   */
  private static async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create comment thread (Google Docs style)
   */
  static async createCommentThread(
    essayId: string,
    threadData: {
      threadType: 'comment' | 'suggestion' | 'question';
      threadTitle?: string;
      threadDescription?: string;
      anchorId?: string;
    }
  ): Promise<CommentThread> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');

      const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data: thread, error } = await supabase
        .from('comment_threads_v2')
        .insert({
          essay_id: essayId,
          thread_id: threadId,
          thread_type: threadData.threadType,
          thread_title: threadData.threadTitle,
          thread_description: threadData.threadDescription,
          anchor_id: threadData.anchorId
        })
        .select()
        .single();

      if (error) throw error;

      // Add user as participant
      await supabase
        .from('thread_participants')
        .insert({
          thread_id: thread.id,
          user_id: session.user.id,
          can_edit: true,
          can_resolve: true
        });

      return thread;
    } catch (error) {
      console.error('Error creating comment thread:', error);
      throw error;
    }
  }

  /**
   * Add message to thread
   */
  static async addThreadMessage(
    threadId: string,
    messageText: string,
    messageType: 'comment' | 'reply' | 'suggestion' | 'resolution',
    richContent?: any
  ): Promise<ThreadMessage> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');

      const { data: message, error } = await supabase
        .from('thread_messages')
        .insert({
          thread_id: threadId,
          user_id: session.user.id,
          message_text: messageText,
          message_type: messageType,
          rich_content: richContent
        })
        .select()
        .single();

      if (error) throw error;

      return message;
    } catch (error) {
      console.error('Error adding thread message:', error);
      throw error;
    }
  }

  /**
   * Get thread with messages
   */
  static async getThreadWithMessages(threadId: string): Promise<{
    thread: CommentThread;
    messages: ThreadMessage[];
    participants: any[];
  }> {
    try {
      // Get thread
      const { data: thread, error: threadError } = await supabase
        .from('comment_threads_v2')
        .select('*')
        .eq('id', threadId)
        .single();

      if (threadError) throw threadError;

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('thread_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Get participants
      const { data: participants, error: participantsError } = await supabase
        .from('thread_participants')
        .select('*')
        .eq('thread_id', threadId);

      if (participantsError) throw participantsError;

      return {
        thread,
        messages: messages || [],
        participants: participants || []
      };
    } catch (error) {
      console.error('Error getting thread with messages:', error);
      throw error;
    }
  }
}
