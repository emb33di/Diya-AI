/**
 * BlurredComment Component
 * 
 * Displays only the first sentence of a comment and blurs the rest.
 * Shows a sign-up CTA button on hover.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Annotation } from '@/types/semanticDocument';
import { Lock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlurredCommentProps {
  annotation: Annotation;
  onSignUp?: () => void;
  className?: string;
}

/**
 * Extract the first sentence from a comment
 */
const getFirstSentence = (text: string): string => {
  // Match first sentence ending with . ! or ?
  const match = text.match(/^[^.!?]+[.!?]/);
  if (match) {
    return match[0];
  }
  // Fallback: take first sentence up to first period
  const firstPeriod = text.indexOf('.');
  if (firstPeriod > 0) {
    return text.substring(0, firstPeriod + 1);
  }
  // If no period, return first 50 chars
  return text.substring(0, 50) + (text.length > 50 ? '...' : '');
};

/**
 * Get the rest of the comment (to be blurred)
 */
const getRestOfComment = (text: string): string => {
  const firstSentence = getFirstSentence(text);
  return text.substring(firstSentence.length).trim();
};

const BlurredComment: React.FC<BlurredCommentProps> = ({
  annotation,
  onSignUp,
  className
}) => {
  const firstSentence = getFirstSentence(annotation.content);
  const restOfComment = getRestOfComment(annotation.content);
  const hasMoreContent = restOfComment.length > 0;

  return (
    <div className={cn("relative group", className)}>
      {/* Visible first sentence */}
      <p className="text-comment text-gray-700 mb-2 leading-relaxed break-words overflow-wrap-anywhere" 
         style={{ fontFamily: 'Arial, sans-serif' }}>
        {firstSentence}
      </p>

      {/* Blurred rest of comment */}
      {hasMoreContent && (
        <div className="relative">
          <p 
            className="text-comment text-gray-700 leading-relaxed break-words overflow-wrap-anywhere blur-sm select-none pointer-events-none"
            style={{ 
              fontFamily: 'Arial, sans-serif',
              filter: 'blur(4px)',
              WebkitFilter: 'blur(4px)',
              opacity: 0.6
            }}
          >
            {restOfComment}
          </p>

          {/* Sign-up CTA overlay - appears on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/80 rounded-lg">
            <Button
              onClick={onSignUp}
              className="flex items-center gap-2 shadow-lg"
              style={{ backgroundColor: '#D07D00' }}
            >
              <Lock className="h-4 w-4" />
              <span>Sign up with Diya to get detailed feedback and make your essays ready for your dream school</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Context text if available */}
      {annotation.targetText && (
        <div className="mt-2 p-2 bg-white rounded border text-sm text-gray-600 leading-relaxed break-words overflow-wrap-anywhere" 
             style={{ fontFamily: 'Arial, sans-serif' }}>
          <strong>Context:</strong> "{annotation.targetText}"
        </div>
      )}
    </div>
  );
};

export default BlurredComment;


