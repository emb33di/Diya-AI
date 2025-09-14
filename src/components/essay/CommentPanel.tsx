import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Bot, 
  User, 
  CheckCircle2, 
  X, 
  Plus,
  AlertCircle,
  ThumbsUp,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { Comment, CommentService } from '@/services/commentService';
import CommentFeedbackButton from './CommentFeedbackButton';
import { getAgentTypeLabel, getAgentTypeColorClasses } from '@/utils/agentTypeUtils';

interface CommentPanelProps {
  essayId: string;
  comments: Comment[];
  onCommentsChange: (comments: Comment[]) => void;
  selectedText?: string;
  onAddComment?: (text: string, type: string) => void;
}

const CommentPanel: React.FC<CommentPanelProps> = ({
  essayId,
  comments,
  onCommentsChange,
  selectedText,
  onAddComment
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentType, setNewCommentType] = useState<'suggestion' | 'critique' | 'praise' | 'question'>('suggestion');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Get comment type icon
  const getCommentTypeIcon = (type: string) => {
    switch (type) {
      case 'suggestion':
        return <Lightbulb className="h-3 w-3" />;
      case 'critique':
        return <AlertCircle className="h-3 w-3" />;
      case 'praise':
        return <ThumbsUp className="h-3 w-3" />;
      case 'question':
        return <HelpCircle className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  // Get comment type color
  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'suggestion':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'critique':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'praise':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'question':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Handle resolving a comment
  const handleResolveComment = async (commentId: string) => {
    try {
      await CommentService.resolveComment(commentId);
      const updatedComments = comments.map(comment =>
        comment.id === commentId ? { ...comment, resolved: true } : comment
      );
      onCommentsChange(updatedComments);
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  // Handle unresolving a comment
  const handleUnresolveComment = async (commentId: string) => {
    try {
      await CommentService.unresolveComment(commentId);
      const updatedComments = comments.map(comment =>
        comment.id === commentId ? { ...comment, resolved: false } : comment
      );
      onCommentsChange(updatedComments);
    } catch (error) {
      console.error('Error unresolving comment:', error);
    }
  };

  // Handle deleting a comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      await CommentService.deleteComment(commentId);
      const updatedComments = comments.filter(comment => comment.id !== commentId);
      onCommentsChange(updatedComments);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Handle adding a new comment
  const handleAddComment = async () => {
    if (!newCommentText.trim() || !selectedText) return;

    setIsAddingComment(true);
    try {
      // Create a mock text selection for now
      const textSelection = {
        start: { pos: 0, path: [0, 0] },
        end: { pos: selectedText.length, path: [0, 0] }
      };

      const newComment = await CommentService.createComment({
        essayId,
        textSelection,
        anchorText: selectedText,
        commentText: newCommentText,
        commentType: newCommentType
      });

      onCommentsChange([...comments, newComment]);
      setNewCommentText('');
      setIsAddingComment(false);
      
      if (onAddComment) {
        onAddComment(newCommentText, newCommentType);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setIsAddingComment(false);
    }
  };

  // Filter comments by type
  const activeComments = comments.filter(c => !c.resolved);
  const resolvedComments = comments.filter(c => c.resolved);
  const aiComments = comments.filter(c => c.ai_generated);
  const userComments = comments.filter(c => !c.ai_generated);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Comments</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {activeComments.length} active
          </Badge>
          {resolvedComments.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {resolvedComments.length} resolved
            </Badge>
          )}
        </div>
      </div>

      {/* Add Comment Section */}
      {selectedText && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Plus className="h-4 w-4 text-blue-600" />
              <span>Add Comment</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground bg-white p-2 rounded border">
              <strong>Selected text:</strong> "{selectedText}"
            </div>
            
            <div className="space-y-2">
              <div className="flex space-x-2">
                {(['suggestion', 'critique', 'praise', 'question'] as const).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={newCommentType === type ? "default" : "outline"}
                    onClick={() => setNewCommentType(type)}
                    className="text-xs h-7"
                  >
                    {getCommentTypeIcon(type)}
                    <span className="ml-1 capitalize">{type}</span>
                  </Button>
                ))}
              </div>
              
              <Textarea
                placeholder="Add your comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              
              <div className="flex justify-end space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewCommentText('')}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newCommentText.trim() || isAddingComment}
                >
                  {isAddingComment ? 'Adding...' : 'Add Comment'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Comments */}
      {activeComments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Active Comments</h4>
          {activeComments.map((comment) => (
            <Card key={comment.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">Diya</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CommentFeedbackButton
                      commentId={comment.id}
                      isAIGenerated={comment.ai_generated}
                      currentFeedback={comment.user_feedback_helpful}
                      onFeedbackChange={(feedback) => {
                        // Update the comment in the local state
                        const updatedComments = comments.map(c => 
                          c.id === comment.id 
                            ? { ...c, user_feedback_helpful: feedback }
                            : c
                        );
                        onCommentsChange(updatedComments);
                      }}
                      size="sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResolveComment(comment.id)}
                      title="Resolve comment"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="Delete comment"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm mb-2">{comment.comment_text}</p>
                <p className="text-xs text-muted-foreground">
                  "{comment.anchor_text}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(comment.created_at).toLocaleDateString()} at{' '}
                  {new Date(comment.created_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolved Comments */}
      {resolvedComments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Resolved Comments</h4>
          {resolvedComments.map((comment) => (
            <Card key={comment.id} className="shadow-sm opacity-60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {comment.ai_generated ? (
                      <Bot className="h-4 w-4 text-blue-500" />
                    ) : (
                      <User className="h-4 w-4 text-gray-500" />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                    {comment.agent_type && (
                      <Badge variant="outline" className={`text-xs ${getAgentTypeColorClasses(comment.agent_type)}`}>
                        {getAgentTypeLabel(comment.agent_type)}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnresolveComment(comment.id)}
                    title="Unresolve comment"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm mb-2">{comment.comment_text}</p>
                <p className="text-xs text-muted-foreground">
                  Resolved {comment.resolved_at && new Date(comment.resolved_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {comments.length === 0 && (
        <Card className="p-8 text-center bg-muted/30">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No comments yet. Select text in your essay to add comments.
          </p>
        </Card>
      )}
    </div>
  );
};

export default CommentPanel;
