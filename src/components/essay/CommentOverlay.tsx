/**
 * Comment Overlay Component
 * 
 * Provides Google Docs-like floating comment bubbles that appear next to text.
 * Handles comment interactions and positioning.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Annotation, DocumentBlock } from '@/types/semanticDocument';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  CheckCircle, 
  Circle, 
  X, 
  Bot, 
  User,
  Reply,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentOverlayProps {
  block: DocumentBlock;
  annotations: Annotation[];
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onAnnotationResolve?: (annotationId: string) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onAnnotationAdd?: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  className?: string;
}

interface CommentBubbleProps {
  annotation: Annotation;
  position: { x: number; y: number };
  isExpanded: boolean;
  onToggle: () => void;
  onResolve: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

const CommentBubble: React.FC<CommentBubbleProps> = React.memo(({
  annotation,
  position,
  isExpanded,
  onToggle,
  onResolve,
  onDelete,
  onSelect
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Position the bubble
  useEffect(() => {
    if (bubbleRef.current) {
      bubbleRef.current.style.left = `${position.x}px`;
      bubbleRef.current.style.top = `${position.y}px`;
    }
  }, [position]);

  const getBubbleColor = useCallback((type: string) => {
    switch (type) {
      case 'suggestion':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'critique':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'praise':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'question':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  }, []);

  return (
    <div
      ref={bubbleRef}
      className={cn(
        'absolute z-50 transition-all duration-200',
        isExpanded ? 'w-80' : 'w-8 h-8'
      )}
    >
      {isExpanded ? (
        <Card className={cn('shadow-lg', getBubbleColor(annotation.type))}>
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {annotation.author === 'ai' ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <Badge variant="secondary" className="text-xs">
                  {annotation.type}
                </Badge>
                {annotation.resolved && (
                  <Badge variant="outline" className="text-xs">
                    Resolved
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                {!annotation.resolved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onResolve}
                    className="h-6 w-6 p-0"
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="text-base mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>
              {annotation.content}
            </div>

            {/* Target Text */}
            {annotation.targetText && (
              <div className="mb-3 p-2 bg-white/50 rounded text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                <strong>Target:</strong> "{annotation.targetText}"
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {annotation.author === 'ai' ? 'AI' : 'You'} • {new Date(annotation.createdAt).toLocaleDateString()}
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={onSelect}
                className="h-6 text-xs"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={onToggle}
          className={cn(
            'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110',
            getBubbleColor(annotation.type),
            annotation.resolved && 'opacity-60'
          )}
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

const CommentOverlay: React.FC<CommentOverlayProps> = React.memo(({
  block,
  annotations,
  onAnnotationSelect,
  onAnnotationResolve,
  onAnnotationDelete,
  onAnnotationAdd,
  className
}) => {
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());
  const [showAddComment, setShowAddComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentType, setNewCommentType] = useState<'suggestion' | 'critique' | 'praise' | 'question'>('suggestion');
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  
  const blockRef = useRef<HTMLDivElement>(null);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const text = selection.toString().trim();
        const range = selection.getRangeAt(0);
        
        // Check if selection is within this block
        if (blockRef.current && blockRef.current.contains(range.commonAncestorContainer)) {
          setSelectedText(text);
          setSelectionRange({
            start: range.startOffset,
            end: range.endOffset
          });
          setShowAddComment(true);
        }
      } else {
        setSelectedText('');
        setSelectionRange(null);
        setShowAddComment(false);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // Calculate bubble positions
  const getBubblePositions = () => {
    if (!blockRef.current) return [];

    const positions: Array<{ annotation: Annotation; position: { x: number; y: number } }> = [];
    
    annotations.forEach((annotation) => {
      if (annotation.targetText) {
        // Find the position of the target text within the block
        const textIndex = block.content.indexOf(annotation.targetText);
        if (textIndex !== -1) {
          // Create a temporary element to measure text position
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'absolute';
          tempDiv.style.visibility = 'hidden';
          tempDiv.style.whiteSpace = 'pre-wrap';
          tempDiv.style.fontSize = '16px'; // Match your text size
          tempDiv.textContent = block.content.substring(0, textIndex);
          
          document.body.appendChild(tempDiv);
          const rect = tempDiv.getBoundingClientRect();
          document.body.removeChild(tempDiv);
          
          const blockRect = blockRef.current.getBoundingClientRect();
          
          positions.push({
            annotation,
            position: {
              x: rect.width + 10, // Offset from text
              y: rect.height - 20 // Align with text baseline
            }
          });
        }
      }
    });

    return positions;
  };

  const toggleAnnotation = (annotationId: string) => {
    setExpandedAnnotations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(annotationId)) {
        newSet.delete(annotationId);
      } else {
        newSet.add(annotationId);
      }
      return newSet;
    });
  };

  const handleAddComment = () => {
    if (newCommentText.trim() && onAnnotationAdd) {
      onAnnotationAdd({
        type: newCommentType,
        author: 'user',
        content: newCommentText.trim(),
        targetBlockId: block.id,
        targetText: selectedText,
        resolved: false
      });

      setNewCommentText('');
      setShowAddComment(false);
      setSelectedText('');
      setSelectionRange(null);
    }
  };

  const bubblePositions = getBubblePositions();

  return (
    <div className={cn('relative', className)}>
      {/* Block Content */}
      <div
        ref={blockRef}
        className="prose max-w-none p-4 border rounded-lg bg-white"
        style={{ userSelect: 'text' }}
      >
        {block.content}
      </div>

      {/* Comment Bubbles */}
      {bubblePositions.map(({ annotation, position }) => (
        <CommentBubble
          key={annotation.id}
          annotation={annotation}
          position={position}
          isExpanded={expandedAnnotations.has(annotation.id)}
          onToggle={() => toggleAnnotation(annotation.id)}
          onResolve={() => onAnnotationResolve?.(annotation.id)}
          onDelete={() => onAnnotationDelete?.(annotation.id)}
          onSelect={() => onAnnotationSelect?.(annotation)}
        />
      ))}

      {/* Add Comment Interface */}
      {showAddComment && (
        <Card className="absolute top-full left-0 mt-2 w-80 shadow-lg z-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Comment on: "{selectedText}"
              </div>
              
              <div className="flex gap-2">
                <select
                  value={newCommentType}
                  onChange={(e) => setNewCommentType(e.target.value as any)}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value="suggestion">Suggestion</option>
                  <option value="critique">Critique</option>
                  <option value="praise">Praise</option>
                  <option value="question">Question</option>
                </select>
              </div>
              
              <Textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Enter your comment..."
                className="min-h-[80px]"
                autoFocus
              />
              
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddComment}>
                  Add Comment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddComment(false);
                    setSelectedText('');
                    setSelectionRange(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default CommentOverlay;
