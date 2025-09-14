/**
 * Google Docs Comment Integration Component
 * 
 * This component integrates the new Google Docs-level comment system
 * with the existing TipTap editor UI.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { GoogleDocsCommentService, CommentAnchor } from '@/services/googleDocsCommentService';
import { RealtimeCommentManager } from '@/services/realtimeSyncService';

interface GoogleDocsCommentIntegrationProps {
  editor: Editor;
  essayId: string;
  onCommentSelect?: (commentId: string | null) => void;
  onCommentCreate?: (comment: any) => void;
  onCommentUpdate?: (comment: any) => void;
  onCommentDelete?: (commentId: string) => void;
}

interface CommentWithAlignment {
  comment: any;
  anchor: CommentAnchor;
  currentText: string;
  isAligned: boolean;
  decoration?: any;
}

export const GoogleDocsCommentIntegration: React.FC<GoogleDocsCommentIntegrationProps> = ({
  editor,
  essayId,
  onCommentSelect,
  onCommentCreate,
  onCommentUpdate,
  onCommentDelete
}) => {
  const [comments, setComments] = useState<CommentWithAlignment[]>([]);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [realtimeManager, setRealtimeManager] = useState<RealtimeCommentManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize real-time comment system
  useEffect(() => {
    const initializeRealtime = async () => {
      try {
        const manager = new RealtimeCommentManager(essayId);
        await manager.initialize();
        
        manager.setEventHandlers({
          onOperation: handleRealtimeOperation,
          onComment: handleRealtimeComment,
          onPresence: handleRealtimePresence,
          onCursor: handleRealtimeCursor,
          onError: handleRealtimeError,
          onConnect: () => setIsConnected(true),
          onDisconnect: () => setIsConnected(false)
        });

        setRealtimeManager(manager);
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to initialize real-time system:', error);
        setError('Failed to connect to real-time collaboration');
      }
    };

    initializeRealtime();

    return () => {
      if (realtimeManager) {
        realtimeManager.destroy();
      }
    };
  }, [essayId]);

  // Load comments with perfect alignment
  useEffect(() => {
    const loadComments = async () => {
      try {
        setLoading(true);
        const commentsWithAlignment = await GoogleDocsCommentService.getCommentsWithAlignment(essayId);
        setComments(commentsWithAlignment);
        setError(null);
      } catch (error) {
        console.error('Failed to load comments:', error);
        setError('Failed to load comments');
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [essayId]);

  // Apply comment decorations to editor
  useEffect(() => {
    if (!editor || comments.length === 0) return;

    const decorations = comments.map(commentWithAlignment => {
      const { anchor, comment } = commentWithAlignment;
      
      return editor.view.state.doc.resolve(anchor.startPosition).pos;
    });

    // Apply decorations to editor
    // This would integrate with the existing CommentExtension
    applyCommentDecorations(comments);

  }, [editor, comments]);

  // Handle real-time operations
  const handleRealtimeOperation = useCallback((operation: any) => {
    console.log('Real-time operation received:', operation);
    
    // Update editor content based on operation
    // This would integrate with TipTap's transaction system
    updateEditorFromOperation(operation);
    
    // Refresh comments to check alignment
    refreshComments();
  }, []);

  // Handle real-time comments
  const handleRealtimeComment = useCallback((comment: any) => {
    console.log('Real-time comment received:', comment);
    
    // Add new comment to local state
    setComments(prev => [...prev, {
      comment,
      anchor: comment.anchor,
      currentText: comment.text,
      isAligned: true
    }]);
    
    onCommentCreate?.(comment);
  }, [onCommentCreate]);

  // Handle real-time presence
  const handleRealtimePresence = useCallback((presenceList: any[]) => {
    setPresence(presenceList);
  }, []);

  // Handle real-time cursor
  const handleRealtimeCursor = useCallback((cursor: any) => {
    // Show remote cursor in editor
    showRemoteCursor(cursor);
  }, []);

  // Handle real-time errors
  const handleRealtimeError = useCallback((error: Error) => {
    console.error('Real-time error:', error);
    setError(`Real-time error: ${error.message}`);
  }, []);

  // Create comment with perfect anchoring
  const createComment = async (commentData: {
    textSelection: { start: { pos: number; path: number[] }; end: { pos: number; path: number[] } };
    anchorText: string;
    commentText: string;
    commentType: 'suggestion' | 'critique' | 'praise' | 'question';
  }) => {
    try {
      const { comment, anchor } = await GoogleDocsCommentService.createCommentWithAnchor(
        essayId,
        commentData
      );

      // Add to local state
      const newCommentWithAlignment: CommentWithAlignment = {
        comment,
        anchor,
        currentText: commentData.anchorText,
        isAligned: true
      };

      setComments(prev => [...prev, newCommentWithAlignment]);

      // Send to other clients via real-time
      if (realtimeManager) {
        await realtimeManager.createComment({
          position: { start: anchor.startPosition, end: anchor.endPosition },
          text: commentData.commentText,
          type: 'comment'
        });
      }

      onCommentCreate?.(comment);
      return comment;

    } catch (error) {
      console.error('Failed to create comment:', error);
      setError('Failed to create comment');
      throw error;
    }
  };

  // Update comment
  const updateComment = async (commentId: string, updates: {
    commentText?: string;
    commentType?: 'suggestion' | 'critique' | 'praise' | 'question';
  }) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('essay_comments')
        .update({
          comment_text: updates.commentText,
          comment_type: updates.commentType,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      // Update local state
      setComments(prev => prev.map(c => 
        c.comment.id === commentId 
          ? { ...c, comment: { ...c.comment, ...updates } }
          : c
      ));

      onCommentUpdate?.({ id: commentId, ...updates });

    } catch (error) {
      console.error('Failed to update comment:', error);
      setError('Failed to update comment');
      throw error;
    }
  };

  // Delete comment
  const deleteComment = async (commentId: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('essay_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // Remove from local state
      setComments(prev => prev.filter(c => c.comment.id !== commentId));

      onCommentDelete?.(commentId);

    } catch (error) {
      console.error('Failed to delete comment:', error);
      setError('Failed to delete comment');
      throw error;
    }
  };

  // Resolve comment
  const resolveComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('essay_comments')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      // Update local state
      setComments(prev => prev.map(c => 
        c.comment.id === commentId 
          ? { ...c, comment: { ...c.comment, resolved: true } }
          : c
      ));

    } catch (error) {
      console.error('Failed to resolve comment:', error);
      setError('Failed to resolve comment');
      throw error;
    }
  };

  // Select comment
  const selectComment = (commentId: string | null) => {
    setSelectedCommentId(commentId);
    onCommentSelect?.(commentId);
  };

  // Refresh comments
  const refreshComments = async () => {
    try {
      const commentsWithAlignment = await GoogleDocsCommentService.getCommentsWithAlignment(essayId);
      setComments(commentsWithAlignment);
    } catch (error) {
      console.error('Failed to refresh comments:', error);
      setError('Failed to refresh comments');
    }
  };

  // Apply comment decorations to editor
  const applyCommentDecorations = (comments: CommentWithAlignment[]) => {
    // This would integrate with the existing CommentExtension
    // to apply visual decorations for comments
    comments.forEach(commentWithAlignment => {
      const { anchor, comment } = commentWithAlignment;
      
      // Create decoration for this comment
      // The decoration would highlight the text and show comment indicators
    });
  };

  // Update editor from real-time operation
  const updateEditorFromOperation = (operation: any) => {
    // This would integrate with TipTap's transaction system
    // to apply the operation to the editor content
    const { state, dispatch } = editor.view;
    
    // Create transaction based on operation
    const tr = state.tr;
    
    switch (operation.type) {
      case 'insert':
        tr.insertText(operation.text, operation.position);
        break;
      case 'delete':
        tr.delete(operation.position, operation.position + operation.length);
        break;
      case 'retain':
        // No change needed
        break;
    }
    
    dispatch(tr);
  };

  // Show remote cursor
  const showRemoteCursor = (cursor: any) => {
    // This would show remote user cursors in the editor
    // Similar to Google Docs' collaborative cursors
  };

  // Handle editor content changes
  const handleEditorChange = async (content: string) => {
    // When editor content changes, we need to:
    // 1. Create document operations
    // 2. Send to real-time system
    // 3. Update comment positions
    
    if (realtimeManager) {
      // Calculate the difference between old and new content
      // and create operations
      const operations = calculateContentDiff(content);
      
      for (const operation of operations) {
        await realtimeManager.syncService.sendOperation(operation);
      }
    }
  };

  // Calculate content diff
  const calculateContentDiff = (newContent: string): any[] => {
    // This would implement a diff algorithm to calculate
    // the operations needed to transform old content to new content
    // Similar to Google Docs' operational transform
    
    const operations: any[] = [];
    
    // Simplified implementation - in production, this would be more sophisticated
    const oldContent = editor.getText();
    
    if (newContent.length > oldContent.length) {
      // Content was inserted
      const insertedText = newContent.substring(oldContent.length);
      operations.push({
        type: 'insert',
        position: oldContent.length,
        length: insertedText.length,
        text: insertedText
      });
    } else if (newContent.length < oldContent.length) {
      // Content was deleted
      operations.push({
        type: 'delete',
        position: newContent.length,
        length: oldContent.length - newContent.length
      });
    }
    
    return operations;
  };

  // Update cursor position
  const updateCursorPosition = (position: number, selectionStart?: number, selectionEnd?: number) => {
    if (realtimeManager) {
      realtimeManager.updateCursor(position, selectionStart, selectionEnd);
    }
  };

  // Get comment statistics
  const getCommentStats = () => {
    const total = comments.length;
    const resolved = comments.filter(c => c.comment.resolved).length;
    const misaligned = comments.filter(c => !c.isAligned).length;
    const active = total - resolved;

    return {
      total,
      active,
      resolved,
      misaligned,
      alignmentRate: total > 0 ? ((total - misaligned) / total * 100).toFixed(1) : '100'
    };
  };

  const stats = getCommentStats();

  return (
    <div className="google-docs-comment-integration">
      {/* Connection Status */}
      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot"></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        {presence.length > 0 && (
          <div className="presence-indicators">
            {presence.map(user => (
              <div key={user.userId} className="presence-user">
                <div 
                  className="presence-avatar" 
                  style={{ backgroundColor: user.cursor?.color || '#3b82f6' }}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
                <span>{user.userName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Statistics */}
      <div className="comment-stats">
        <div className="stat">
          <span className="stat-label">Total Comments:</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Active:</span>
          <span className="stat-value">{stats.active}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Resolved:</span>
          <span className="stat-value">{stats.resolved}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Alignment:</span>
          <span className={`stat-value ${stats.misaligned > 0 ? 'warning' : 'success'}`}>
            {stats.alignmentRate}%
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-message">
          <span>🔄 Loading comments...</span>
        </div>
      )}

      {/* Comment List */}
      <div className="comment-list">
        {comments.map(commentWithAlignment => (
          <div 
            key={commentWithAlignment.comment.id}
            className={`comment-item ${commentWithAlignment.comment.resolved ? 'resolved' : 'active'} ${!commentWithAlignment.isAligned ? 'misaligned' : ''}`}
            onClick={() => selectComment(commentWithAlignment.comment.id)}
          >
            <div className="comment-header">
              <span className="comment-type">{commentWithAlignment.comment.comment_type}</span>
              {!commentWithAlignment.isAligned && (
                <span className="alignment-warning">⚠️ Misaligned</span>
              )}
              {commentWithAlignment.comment.resolved && (
                <span className="resolved-indicator">✅ Resolved</span>
              )}
            </div>
            
            <div className="comment-text">
              {commentWithAlignment.comment.comment_text}
            </div>
            
            <div className="comment-anchor">
              <span className="anchor-label">Anchored to:</span>
              <span className="anchor-text">"{commentWithAlignment.currentText}"</span>
            </div>
            
            <div className="comment-actions">
              <button onClick={() => updateComment(commentWithAlignment.comment.id, { commentType: 'suggestion' })}>
                Edit
              </button>
              <button onClick={() => resolveComment(commentWithAlignment.comment.id)}>
                Resolve
              </button>
              <button onClick={() => deleteComment(commentWithAlignment.comment.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={refreshComments} disabled={loading}>
          🔄 Refresh Comments
        </button>
        <button onClick={() => setError(null)} disabled={!error}>
          🧹 Clear Errors
        </button>
      </div>
    </div>
  );
};

export default GoogleDocsCommentIntegration;
