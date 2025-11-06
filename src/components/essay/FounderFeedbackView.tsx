/**
 * Founder Feedback View
 * 
 * A read-only view of founder feedback on an essay.
 * Displays the founder's edited content with their comments in a sidebar.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  SemanticDocument, 
  DocumentBlock, 
  Annotation
} from '@/types/semanticDocument';
import { Badge } from '@/components/ui/badge';
import CommentSidebar from './CommentSidebar';
import { MessageSquare, SidebarClose, User, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import './SemanticHighlighting.css';

interface FounderFeedbackViewProps {
  document: SemanticDocument;
  blocks: DocumentBlock[];
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  selectedAnnotationId?: string;
  className?: string;
}

/**
 * Render highlighted text with annotations (read-only version)
 */
const renderHighlightedText = (text: string, annotations: Annotation[]) => {
  if (!text || !annotations || annotations.length === 0) {
    return <span>{text}</span>;
  }

  type HighlightSegment = {
    start: number;
    end: number;
    annotation: Annotation;
  };

  const textLength = text.length;
  const lowerText = text.toLowerCase();
  const segments: HighlightSegment[] = [];

  // Debug: Log annotation data to understand what we're receiving
  if (annotations.length > 0) {
    console.log('[FounderFeedbackView] Rendering highlights:', {
      textLength,
      annotationCount: annotations.length,
      annotations: annotations.map(ann => ({
        id: ann.id,
        targetText: ann.targetText,
        metadata: ann.metadata,
        hasPosition: typeof (ann.metadata as any)?.['position_start'] === 'number'
      }))
    });
  }

  const addSegment = (start: number, end: number, annotation: Annotation) => {
    const clampedStart = Math.max(0, Math.min(textLength, Math.floor(start)));
    const clampedEnd = Math.max(0, Math.min(textLength, Math.floor(end)));

    if (clampedEnd <= clampedStart) {
      return;
    }

    const duplicate = segments.find(segment =>
      segment.annotation.id === annotation.id &&
      segment.start === clampedStart &&
      segment.end === clampedEnd
    );

    if (duplicate) {
      return;
    }

    segments.push({
      start: clampedStart,
      end: clampedEnd,
      annotation
    });
  };

  let searchCursor = 0;

  annotations.forEach(annotation => {
    const metadata = annotation.metadata as Record<string, unknown> | undefined;
    const positionStart =
      typeof metadata?.['position_start'] === 'number'
        ? (metadata['position_start'] as number)
        : undefined;
    const positionEnd =
      typeof metadata?.['position_end'] === 'number'
        ? (metadata['position_end'] as number)
        : undefined;

    // Use position data if available and valid
    if (positionStart !== undefined && positionEnd !== undefined && positionEnd > positionStart) {
      // If position spans entire block (0 to full length), it's likely a block-level comment
      // For block-level comments, highlight just the first 50 chars as a visual indicator
      if (positionStart === 0 && positionEnd >= textLength * 0.95) {
        const highlightLength = Math.min(50, textLength);
        addSegment(0, highlightLength, annotation);
        searchCursor = Math.max(searchCursor, highlightLength);
        console.log('[FounderFeedbackView] Block-level comment detected, highlighting first 50 chars');
        return;
      }
      
      // Normal position-based highlight
      if (positionEnd <= textLength) {
        addSegment(positionStart, Math.min(positionEnd, textLength), annotation);
        searchCursor = Math.max(searchCursor, positionEnd);
        return;
      }
    }

    const targetText = annotation.targetText?.trim();
    if (!targetText) {
      // If no position and no targetText, skip this annotation
      return;
    }

    const candidates = [targetText];

    if (targetText.endsWith('...')) {
      candidates.push(targetText.slice(0, -3));
    }

    if (targetText.length > 20) {
      candidates.push(targetText.slice(0, 20));
    }

    let matched = false;

    for (const candidate of candidates) {
      if (!candidate) continue;

      let startIndex = text.indexOf(candidate, searchCursor);
      if (startIndex === -1) {
        startIndex = text.indexOf(candidate);
      }

      if (startIndex === -1) {
        const lowerCandidate = candidate.toLowerCase();
        startIndex = lowerText.indexOf(lowerCandidate, searchCursor);
        if (startIndex === -1) {
          startIndex = lowerText.indexOf(lowerCandidate);
        }
      }

      if (startIndex !== -1) {
        addSegment(startIndex, startIndex + candidate.length, annotation);
        searchCursor = Math.max(searchCursor, startIndex + candidate.length);
        matched = true;
        break;
      }
    }

    if (!matched && targetText.includes(' ')) {
      const firstWords = targetText.split(' ').slice(0, 3).join(' ');
      if (firstWords.length > 3) {
        let startIndex = text.indexOf(firstWords, searchCursor);
        if (startIndex === -1) {
          startIndex = text.indexOf(firstWords);
        }

        if (startIndex === -1) {
          const lowerWords = firstWords.toLowerCase();
          startIndex = lowerText.indexOf(lowerWords, searchCursor);
          if (startIndex === -1) {
            startIndex = lowerText.indexOf(lowerWords);
          }
        }

        if (startIndex !== -1) {
          addSegment(startIndex, startIndex + firstWords.length, annotation);
          searchCursor = Math.max(searchCursor, startIndex + firstWords.length);
        }
      }
    }
  });

  if (segments.length === 0) {
    return <span>{text}</span>;
  }

  segments.sort((a, b) => {
    if (a.start === b.start) {
      return a.end - b.end;
    }
    return a.start - b.start;
  });

  const parts: JSX.Element[] = [];
  let cursor = 0;

  segments.forEach((segment, index) => {
    if (segment.start > cursor) {
      parts.push(
        <span key={`text-${index}-${cursor}`}>
          {text.slice(cursor, segment.start)}
        </span>
      );
    }

    const highlightedText = text.slice(segment.start, segment.end);
    const annotationClass = getAnnotationHighlightClass(segment.annotation);
    const annotationKey = segment.annotation.id || `${segment.start}-${segment.end}-${index}`;

    parts.push(
      <span
        key={`annotation-${annotationKey}`}
        className={cn('annotation-highlight', annotationClass)}
        data-annotation-id={segment.annotation.id}
      >
        {highlightedText}
      </span>
    );

    cursor = segment.end;
  });

  if (cursor < textLength) {
    parts.push(
      <span key="text-end">
        {text.slice(cursor)}
      </span>
    );
  }

  return <>{parts}</>;
};

/**
 * Get CSS class for annotation highlighting
 */
const getAnnotationHighlightClass = (annotation: Annotation): string => {
  const baseClass = 'inline px-1 rounded cursor-pointer transition-colors';
  
  // Founder comments are always displayed as user comments
  if (annotation.author === 'mihir' || annotation.author === 'user') {
    return `${baseClass} bg-blue-100 text-blue-800 hover:bg-blue-200`;
  }
  
  // Default for other types
  switch (annotation.type) {
    case 'critique':
      return `${baseClass} bg-red-100 text-red-800 hover:bg-red-200`;
    case 'praise':
      return `${baseClass} bg-green-100 text-green-800 hover:bg-green-200`;
    case 'suggestion':
      return `${baseClass} bg-yellow-100 text-yellow-800 hover:bg-yellow-200`;
    default:
      return `${baseClass} bg-gray-100 text-gray-800 hover:bg-gray-200`;
  }
};

const FounderFeedbackView: React.FC<FounderFeedbackViewProps> = ({
  document,
  blocks,
  onAnnotationSelect,
  selectedAnnotationId,
  className = ''
}) => {
  const [showCommentSidebar, setShowCommentSidebar] = useState(true);
  const { toast } = useToast();

  // Get plain text from all blocks
  const getDocumentPlainText = useCallback(() => {
    return [...blocks]
      .sort((a, b) => a.position - b.position)
      .map(b => b.content)
      .join('\n\n');
  }, [blocks]);

  // Copy essay text to clipboard
  const copyEssayText = useCallback(async () => {
    try {
      const text = getDocumentPlainText();
      if (!text.trim()) {
        toast({
          title: 'Nothing to copy',
          description: 'The essay is empty.',
          variant: 'destructive'
        });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: 'Essay text has been copied to your clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast({
        title: 'Copy failed',
        description: 'Failed to copy text to clipboard. Please try again.',
        variant: 'destructive'
      });
    }
  }, [getDocumentPlainText, toast]);

  // Convert FounderComment[] to Annotation[] format for CommentSidebar
  // The blocks should already have annotations attached from the parent component

  // Render a single block (read-only)
  const renderBlock = (block: DocumentBlock) => {
    return (
      <div
        key={block.id}
        className="relative mb-2"
      >
        {/* Block Content - Read Only */}
        <div className="relative">
          <div
            className="min-h-[2.5rem] p-2 text-base w-full focus:outline-none focus:ring-0 cursor-default"
            style={{
              fontFamily: 'Arial, sans-serif',
              lineHeight: '1.6',
              wordWrap: 'normal',
              overflowWrap: 'normal',
              wordBreak: 'normal',
              hyphens: 'none',
              textAlign: 'left',
            }}
          >
            {block.content ? (
              renderHighlightedText(block.content, block.annotations || [])
            ) : (
              <span className="text-gray-400 italic">
                {block.position === 0 ? '(Empty paragraph)' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Comment indicators (for blocks with comments) */}
        {block.annotations && block.annotations.length > 0 && !showCommentSidebar && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {block.annotations.length} comment{block.annotations.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("founder-feedback-view flex h-full w-full overflow-hidden", className)}>
      {/* Main Content Area */}
      <div className={cn(
        "flex-1 min-w-0 h-full overflow-y-auto",
        showCommentSidebar && "pr-4 lg:pr-4"
      )}>
        {/* Content */}
        <div className="relative pl-4 lg:pl-12 pr-4 lg:pr-12 w-full py-4">
          {/* Title */}
          <div className="mb-6 border-b pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{document.title}</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Expert Review
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyEssayText}
                  title="Copy essay text"
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                {!showCommentSidebar && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCommentSidebar(true)}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Show Comments
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Render all blocks */}
          {useMemo(() => {
            const sortedBlocks = [...blocks].sort((a, b) => a.position - b.position);
            return sortedBlocks.map(renderBlock);
          }, [blocks, showCommentSidebar])}
        </div>
      </div>

      {/* Comment Sidebar */}
      {showCommentSidebar && (
        <div className="hidden lg:block w-96 shrink-0 border-l overflow-y-auto h-full">
          <CommentSidebar
            key={document.id}
            blocks={useMemo(() => [...blocks].sort((a, b) => a.position - b.position), [blocks])}
            documentId={document.id}
            onAnnotationResolve={undefined} // Read-only, no resolve action
            onAnnotationDelete={undefined} // Read-only, no delete action
            onAnnotationSelect={onAnnotationSelect}
            selectedAnnotationId={selectedAnnotationId}
            onHideSidebar={() => setShowCommentSidebar(false)}
            className="h-full"
            hasGrammarCheckRun={false}
          />
        </div>
      )}
    </div>
  );
};

export default FounderFeedbackView;
