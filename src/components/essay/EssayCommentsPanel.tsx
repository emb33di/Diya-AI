import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  CheckCircle2, 
  Bot,
  Quote
} from 'lucide-react';
import { Comment } from '@/services/commentService';
import { AgentFilterType, getFilterTypeLabel, getCommentCountsByFilter, filterCommentsByAgentType } from '@/utils/agentTypeUtils';
import UnchangedParagraphFeedback from './UnchangedParagraphFeedback';
import CommentFeedbackButton from './CommentFeedbackButton';

// Helper function to extract relevant text from essay content with improved matching
const extractRelevantText = (comment: Comment, essayContent?: string): string => {
  if (!essayContent) return '';
  
  // Strategy 1: Use anchor_text if available and not empty
  if (comment.anchor_text && comment.anchor_text.trim()) {
    const anchorText = comment.anchor_text.trim();
    
    // If anchor_text is very short, try to find it in the essay and get more context
    if (anchorText.length < 20) {
      const textContent = essayContent.replace(/<[^>]*>/g, '');
      const index = textContent.toLowerCase().indexOf(anchorText.toLowerCase());
      if (index !== -1) {
        // Get 50 characters before and after the anchor text for context
        const start = Math.max(0, index - 50);
        const end = Math.min(textContent.length, index + anchorText.length + 50);
        const contextText = textContent.substring(start, end);
        return contextText.trim();
      }
    }
    
    return anchorText;
  }
  
  // Strategy 2: Use paragraph_index to extract the specific paragraph
  if (comment.paragraph_index !== null && comment.paragraph_index !== undefined) {
    // Remove HTML tags and split into paragraphs
    const textContent = essayContent.replace(/<[^>]*>/g, '');
    const paragraphs = textContent.split(/\n\s*\n/).filter(p => p.trim());
    const targetParagraph = paragraphs[comment.paragraph_index];
    if (targetParagraph) {
      return targetParagraph.trim();
    }
  }
  
  // Strategy 3: Try to extract text from textSelection if available
  if (comment.text_selection && comment.text_selection.start && comment.text_selection.end) {
    try {
      const textContent = essayContent.replace(/<[^>]*>/g, '');
      const startPos = comment.text_selection.start.pos || 0;
      const endPos = comment.text_selection.end.pos || textContent.length;
      
      // Ensure positions are within bounds
      const safeStart = Math.max(0, Math.min(startPos, textContent.length));
      const safeEnd = Math.max(safeStart, Math.min(endPos, textContent.length));
      
      if (safeEnd > safeStart) {
        const selectedText = textContent.substring(safeStart, safeEnd);
        if (selectedText.trim()) {
          return selectedText.trim();
        }
      }
    } catch (error) {
      console.warn('Error extracting text from textSelection:', error);
    }
  }
  
  // Strategy 4: Try to find text by paragraph_id if available
  if (comment.paragraph_id) {
    try {
      // Parse the essay content to find the paragraph with matching ID
      const parser = new DOMParser();
      const doc = parser.parseFromString(essayContent, 'text/html');
      const paragraphElement = doc.querySelector(`[data-paragraph-id="${comment.paragraph_id}"]`);
      if (paragraphElement) {
        return paragraphElement.textContent?.trim() || '';
      }
    } catch (error) {
      console.warn('Error finding paragraph by ID:', error);
    }
  }
  
  // Strategy 5: Fallback - return first 150 characters of essay
  const textContent = essayContent.replace(/<[^>]*>/g, '');
  const fallbackText = textContent.substring(0, 150).trim();
  return fallbackText + (textContent.length > 150 ? '...' : '');
};

// Helper function to check if text contains HTML tags
const containsHtml = (text: string): boolean => {
  return /<[^>]*>/.test(text);
};

// Component to display relevant essay text in a colored textbox
const RelevantTextDisplay: React.FC<{ 
  comment: Comment; 
  essayContent?: string;
}> = ({ comment, essayContent }) => {
  const relevantText = extractRelevantText(comment, essayContent);
  
  if (!relevantText) return null;
  
  // Determine color based on comment type and score colors for inline comments
  const getTextboxColor = (comment: Comment) => {
    // Simple color coding: Green for strengths, Red for weaknesses, Blue for all others
    if (comment.agent_type === 'reconciliation') {
      // Check reconciliation metadata to determine color
      if (comment.original_source === 'strength') {
        return 'bg-green-50 border-green-200 text-green-800'; // Green for strength-based
      } else if (comment.original_source === 'weakness') {
        return 'bg-red-50 border-red-200 text-red-800'; // Red for weakness-based
      } else {
        return 'bg-blue-50 border-blue-200 text-blue-800'; // Blue for reconciled/balanced
      }
    } else if (comment.agent_type === 'strengths') {
      return 'bg-green-50 border-green-200 text-green-800'; // Green for strengths
    } else if (comment.agent_type === 'weaknesses') {
      return 'bg-red-50 border-red-200 text-red-800'; // Red for weaknesses
    } else if (comment.comment_category === 'overall') {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    } else if (comment.agent_type === 'paragraph' || comment.comment_category === 'inline') {
      // All inline comments use blue
      return 'bg-blue-50 border-blue-200 text-blue-800';
    } else {
      return 'bg-blue-50 border-blue-200 text-blue-800'; // Blue for all other comments
    }
  };

  // Get score color based on the comment's scoring data
  const getScoreColor = (comment: Comment) => {
    // Check for different score types and their colors
    if (comment.opening_sentence_score_color) {
      return getColorClasses(comment.opening_sentence_score_color);
    } else if (comment.transition_score_color) {
      return getColorClasses(comment.transition_score_color);
    } else if (comment.paragraph_quality_score_color) {
      return getColorClasses(comment.paragraph_quality_score_color);
    } else if (comment.final_sentence_score_color) {
      return getColorClasses(comment.final_sentence_score_color);
    }
    
    // Default color if no score color is available
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  // Convert score color string to Tailwind classes
  const getColorClasses = (scoreColor: string) => {
    switch (scoreColor.toLowerCase()) {
      case 'red':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'yellow':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'green':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };
  
  // Get the score value and type for display
  const getScoreInfo = (comment: Comment) => {
    if (comment.opening_sentence_score !== undefined && comment.opening_sentence_score_color) {
      return { score: comment.opening_sentence_score, type: 'Opening Sentence', color: comment.opening_sentence_score_color };
    } else if (comment.transition_score !== undefined && comment.transition_score_color) {
      return { score: comment.transition_score, type: 'Transition', color: comment.transition_score_color };
    } else if (comment.paragraph_quality_score !== undefined && comment.paragraph_quality_score_color) {
      return { score: comment.paragraph_quality_score, type: 'Paragraph Quality', color: comment.paragraph_quality_score_color };
    } else if (comment.final_sentence_score !== undefined && comment.final_sentence_score_color) {
      return { score: comment.final_sentence_score, type: 'Final Sentence', color: comment.final_sentence_score_color };
    }
    return null;
  };

  const scoreInfo = getScoreInfo(comment);

  return (
    <div className={`p-3 rounded-lg border-l-4 border ${getTextboxColor(comment)} mb-3`}>
      <div className="flex items-start space-x-2">
        <Quote className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-60" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div 
              className="text-sm leading-relaxed italic flex-1"
              dangerouslySetInnerHTML={{ 
                __html: containsHtml(relevantText) 
                  ? `"${relevantText}"` 
                  : `"${relevantText}"` 
              }}
            />
            {scoreInfo && (
              <div className="ml-2 flex items-center space-x-1">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    scoreInfo.color === 'red' ? 'bg-red-100 text-red-800' :
                    scoreInfo.color === 'yellow' ? 'bg-blue-100 text-blue-800' :
                    scoreInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}
                >
                  {scoreInfo.score}/10
                </Badge>
              </div>
            )}
          </div>
          {scoreInfo && (
            <p className="text-xs text-gray-600 mt-1">
              {scoreInfo.type} Score
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

interface EssayCommentsPanelProps {
  essayId: string;
  comments: Comment[];
  essayContent?: string;
  onCommentsChange: (comments: Comment[]) => void;
  onCommentHover?: (commentId: string | null) => void;
  onCommentSelect?: (commentId: string | null) => void;
}

const EssayCommentsPanel: React.FC<EssayCommentsPanelProps> = ({
  essayId,
  comments,
  essayContent,
  onCommentsChange,
  onCommentHover,
  onCommentSelect
}) => {
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [categoryFilter, setCategoryFilter] = useState<AgentFilterType>('all');
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const commentsScrollRef = useRef<HTMLDivElement>(null);

  // Handle comment selection
  const handleCommentSelect = (commentId: string) => {
    const newSelectedId = selectedCommentId === commentId ? null : commentId;
    setSelectedCommentId(newSelectedId);
    onCommentSelect?.(newSelectedId);
    
    // Scroll to top of comments pane when selecting a comment
    if (commentsScrollRef.current) {
      commentsScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle resolving a comment
  const handleResolveComment = async (commentId: string) => {
    try {
      // Update local state immediately for better UX
      const updatedComments = comments.map(comment =>
        comment.id === commentId ? { ...comment, resolved: true, resolved_at: new Date().toISOString() } : comment
      );
      onCommentsChange(updatedComments);
      
      // TODO: Call API to persist the change
      // await CommentService.resolveComment(commentId);
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  // Handle unresolving a comment
  const handleUnresolveComment = async (commentId: string) => {
    try {
      // Update local state immediately for better UX
      const updatedComments = comments.map(comment =>
        comment.id === commentId ? { ...comment, resolved: false, resolved_at: undefined } : comment
      );
      onCommentsChange(updatedComments);
      
      // TODO: Call API to persist the change
      // await CommentService.unresolveComment(commentId);
    } catch (error) {
      console.error('Error unresolving comment:', error);
    }
  };

  // Filter comments based on resolved status and category
  const filteredComments = comments.filter(comment => {
    // First filter by resolved status
    let passesResolvedFilter = true;
    switch (resolvedFilter) {
      case 'active':
        passesResolvedFilter = !comment.resolved;
        break;
      case 'resolved':
        passesResolvedFilter = comment.resolved;
        break;
      case 'all':
      default:
        passesResolvedFilter = true;
        break;
    }
    
    return passesResolvedFilter;
  });

  // Apply category filter
  const categoryFilteredComments = filterCommentsByAgentType(filteredComments, categoryFilter);

  // Sort comments by their position in the essay text (chronologically by text order)
  const sortCommentsByTextPosition = (comments: Comment[]) => {
    const sorted = [...comments].sort((a, b) => {
      // Get text positions for both comments
      const posA = getCommentTextPosition(a);
      const posB = getCommentTextPosition(b);
      
      // Debug logging for sorting
      if (process.env.NODE_ENV === 'development') {
        console.log(`Sorting comments: ${a.id} (pos: ${posA}, para: ${a.paragraph_index}) vs ${b.id} (pos: ${posB}, para: ${b.paragraph_index})`);
      }
      
      // If both have valid positions, sort by position
      if (posA !== null && posB !== null) {
        return posA - posB;
      }
      
      // If only one has a position, prioritize it
      if (posA !== null && posB === null) {
        return -1;
      }
      if (posA === null && posB !== null) {
        return 1;
      }
      
      // If neither has a position, fall back to paragraph index
      if (a.paragraph_index !== null && b.paragraph_index !== null) {
        return a.paragraph_index - b.paragraph_index;
      }
      
      // If only one has paragraph index, prioritize it
      if (a.paragraph_index !== null && b.paragraph_index === null) {
        return -1;
      }
      if (a.paragraph_index === null && b.paragraph_index !== null) {
        return 1;
      }
      
      // Final fallback: sort by creation time
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    
    // Debug logging for sorted results
    if (process.env.NODE_ENV === 'development' && sorted.length > 0) {
      console.log('📝 Comments sorted by text position:', sorted.map(c => ({
        id: c.id,
        position: getCommentTextPosition(c),
        paragraphIndex: c.paragraph_index,
        anchorText: c.anchorText?.substring(0, 30) + '...'
      })));
    }
    
    return sorted;
  };

  // Helper function to extract text position from comment
  const getCommentTextPosition = (comment: Comment): number | null => {
    try {
      // Try to get position from textSelection
      if (comment.textSelection?.start?.pos !== undefined) {
        return comment.textSelection.start.pos;
      }
      
      // For paragraph comments, calculate actual position based on essay content
      if (comment.paragraph_index !== null && comment.paragraph_index !== undefined && essayContent) {
        return calculateParagraphPosition(comment.paragraph_index, essayContent);
      }
      
      return null;
    } catch (error) {
      console.warn('Error getting text position for comment:', comment.id, error);
      return null;
    }
  };

  // @deprecated - This function relies on fragile character counting and should no longer be used.
  // The new Contextual Anchoring system is superior and uses paragraph IDs for reliable positioning.
  // This function is kept for backward compatibility with legacy comments only.
  const calculateParagraphPosition = (paragraphIndex: number, content: string): number => {
    try {
      // Split content into paragraphs (by double newlines or <p> tags)
      const paragraphs = content
        .split(/\n\s*\n|<p[^>]*>/)
        .map(p => p.replace(/<\/p>/g, '').trim())
        .filter(p => p.length > 0);
      
      if (paragraphIndex >= paragraphs.length) {
        console.warn(`Paragraph index ${paragraphIndex} is out of bounds (${paragraphs.length} paragraphs found)`);
        return paragraphIndex * 1000; // Fallback estimate
      }
      
      // Calculate cumulative position up to the target paragraph
      let position = 0;
      for (let i = 0; i < paragraphIndex; i++) {
        position += paragraphs[i].length + 2; // +2 for paragraph breaks
      }
      
      return position;
    } catch (error) {
      console.warn('Error calculating paragraph position:', error);
      return paragraphIndex * 1000; // Fallback estimate
    }
  };

  // Sort comments by their position in the essay text (chronologically by text order)
  const sortedComments = sortCommentsByTextPosition(categoryFilteredComments);

  // Get comment counts for each category
  const commentCounts = getCommentCountsByFilter(comments);

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-blue-100 pb-4 flex-shrink-0">
        <CardTitle className="text-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <span className="text-blue-800 font-bold">Essay Feedback</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {comments.length} comments
          </Badge>
        </CardTitle>
        
        {/* Filter buttons */}
        <div className="flex flex-col space-y-3 mt-3">
          {/* Status filters */}
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={resolvedFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setResolvedFilter('active')}
              className="text-xs"
            >
              Active ({comments.filter(c => !c.resolved).length})
            </Button>
            <Button
              size="sm"
              variant={resolvedFilter === 'resolved' ? 'default' : 'outline'}
              onClick={() => setResolvedFilter('resolved')}
              className="text-xs"
            >
              Resolved ({comments.filter(c => c.resolved).length})
            </Button>
          </div>
          
          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'tone', 'grammar', 'clarity', 'strengths', 'areas-for-improvement'] as AgentFilterType[]).map((category) => (
              <Button
                key={category}
                size="sm"
                variant={categoryFilter === category ? 'default' : 'outline'}
                onClick={() => setCategoryFilter(category)}
                className="text-xs"
              >
                {getFilterTypeLabel(category)} ({commentCounts[category]})
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div ref={commentsScrollRef} className="h-full overflow-y-auto">
          
          {/* Simple Comments List */}
          {sortedComments.length > 0 ? (
            <div className="p-4 space-y-3">
              {sortedComments.map((comment) => (
                <div 
                  key={comment.id} 
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedCommentId === comment.id 
                      ? getCommentHighlightClass(comment, true)
                      : getCommentHighlightClass(comment, false)
                  }`}
                  onClick={() => handleCommentSelect(comment.id)}
                >
                  <div className="flex items-start justify-between mb-2">
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
                          onCommentsChange?.(updatedComments);
                        }}
                        size="sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => comment.resolved ? handleUnresolveComment(comment.id) : handleResolveComment(comment.id)}
                        className="h-6 w-6 p-0"
                      >
                        {comment.resolved ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <RelevantTextDisplay comment={comment} essayContent={essayContent} />
                  
                  <p className="text-sm leading-relaxed">{comment.comment_text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">No comments yet. Generate AI feedback to get started!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Simplified comment display - no agent type labels needed

const getCommentHighlightClass = (comment: Comment, selected: boolean) => {
  if (!selected) return 'bg-white';
  
  if (comment.agent_type === 'strengths') {
    return 'bg-green-50 border-green-300 shadow-md';
  } else if (comment.agent_type === 'weaknesses') {
    return 'bg-orange-50 border-orange-300 shadow-md';
  } else if (comment.agent_type === 'paragraph' || comment.comment_category === 'inline') {
    return 'bg-blue-50 border-blue-300 shadow-md';
  } else {
    return 'bg-gray-50 border-gray-300 shadow-md';
  }
};

export default EssayCommentsPanel;