/**
 * Guest Essay Preview Component
 * 
 * A lightweight, read-only component specifically for anonymous users
 * viewing their essay preview in the Ivy Readiness Report.
 * Displays the essay with blurred comments and sign-up CTAs.
 */

import React, { useState, useMemo } from 'react';
import { SemanticDocument, Annotation, DocumentBlock } from '@/types/semanticDocument';
import BlurredCommentSidebar from './BlurredCommentSidebar';
import { Card, CardContent } from '@/components/ui/card';

interface GuestEssayPreviewProps {
  document: SemanticDocument;
  selectedAnnotationId?: string;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onSignUp?: () => void;
  className?: string;
}

const GuestEssayPreview: React.FC<GuestEssayPreviewProps> = ({
  document,
  selectedAnnotationId,
  onAnnotationSelect,
  onSignUp,
  className = ''
}) => {
  const [showCommentSidebar, setShowCommentSidebar] = useState(true);

  // Sort blocks by position for display
  const sortedBlocks = useMemo(() => {
    return [...document.blocks].sort((a, b) => a.position - b.position);
  }, [document.blocks]);

  return (
    <div className={`flex h-full overflow-hidden ${className}`}>
      {/* Essay Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-white min-w-0">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="prose prose-lg max-w-none">
            {sortedBlocks.map((block, index) => (
              <div
                key={block.id}
                className="mb-6 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                data-block-id={block.id}
              >
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {block.content}
                </div>
                
                {/* Show annotation count badge if block has comments */}
                {block.annotations && block.annotations.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {block.annotations.length} {block.annotations.length === 1 ? 'comment' : 'comments'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comment Sidebar */}
      {showCommentSidebar && (
        <BlurredCommentSidebar
          blocks={sortedBlocks}
          onAnnotationSelect={onAnnotationSelect}
          selectedAnnotationId={selectedAnnotationId}
          onHideSidebar={() => setShowCommentSidebar(false)}
          onSignUp={onSignUp}
          className="h-full"
        />
      )}
    </div>
  );
};

export default GuestEssayPreview;

