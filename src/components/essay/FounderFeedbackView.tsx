/**
 * Founder Feedback View
 * 
 * A read-only view of founder feedback on an essay.
 * Displays the founder's edited content with their comments in a sidebar.
 */

import React, { useState, useMemo } from 'react';
import { 
  SemanticDocument, 
  DocumentBlock, 
  Annotation
} from '@/types/semanticDocument';
import { Badge } from '@/components/ui/badge';
import CommentSidebar from './CommentSidebar';
import { MessageSquare, SidebarClose, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  if (!annotations || annotations.length === 0) {
    return <span>{text}</span>;
  }

  // Sort annotations by position (if available in targetText)
  const sortedAnnotations = [...annotations].sort((a, b) => {
    // Use the targetText position within the full text as a simple sort
    const aPos = text.indexOf(a.targetText || '', 0);
    const bPos = text.indexOf(b.targetText || '', 0);
    return aPos - bPos;
  });

  const parts: JSX.Element[] = [];
  let lastIndex = 0;

  sortedAnnotations.forEach((annotation, idx) => {
    const targetText = annotation.targetText || '';
    if (!targetText) return;

    const startIndex = text.indexOf(targetText, lastIndex);
    if (startIndex === -1) return;

    const endIndex = startIndex + targetText.length;

    // Add text before annotation
    if (startIndex > lastIndex) {
      parts.push(
        <span key={`text-${idx}`}>
          {text.substring(lastIndex, startIndex)}
        </span>
      );
    }

    // Add highlighted annotation
    const annotationClass = getAnnotationHighlightClass(annotation);
    parts.push(
      <span
        key={`annotation-${idx}`}
        className={cn('annotation-highlight', annotationClass)}
        data-annotation-id={annotation.id}
      >
        {targetText}
      </span>
    );

    lastIndex = endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end">
        {text.substring(lastIndex)}
      </span>
    );
  }

  return <>{parts}</>;
};

/**
 * Get CSS class for annotation highlighting
 */
const getAnnotationHighlightClass = (annotation: Annotation): string => {
  const baseClass = 'inline-block px-1 rounded cursor-pointer transition-colors';
  
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
              textAlign: 'justify',
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
