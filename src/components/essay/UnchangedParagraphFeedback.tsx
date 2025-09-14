import React from 'react';
import { AlertCircle, MessageSquare, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface UnchangedParagraphFeedbackProps {
  paragraphText: string;
  hasExistingComments: boolean;
  commentCount: number;
  paragraphIndex: number;
  onViewPreviousComments?: () => void;
  onReviseParagraph?: () => void;
}

export function UnchangedParagraphFeedback({
  paragraphText,
  hasExistingComments,
  commentCount,
  paragraphIndex,
  onViewPreviousComments,
  onReviseParagraph
}: UnchangedParagraphFeedbackProps) {
  const message = hasExistingComments
    ? `It does not look like there was any change made to this paragraph. See older comments for further guidance. (${commentCount} previous comment${commentCount !== 1 ? 's' : ''} available)`
    : `It does not look like there was any change made to this paragraph. Consider revising this section to address the essay prompt more effectively.`;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                Paragraph {paragraphIndex + 1} - No Changes Detected
              </Badge>
              {hasExistingComments && (
                <Badge variant="secondary" className="text-blue-700 bg-blue-100">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {commentCount} previous comment{commentCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-gray-700 mb-3">
              {message}
            </p>
            
            <div className="flex gap-2">
              {hasExistingComments && onViewPreviousComments && (
                <button
                  onClick={onViewPreviousComments}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors"
                >
                  <MessageSquare className="h-3 w-3" />
                  View Previous Comments
                </button>
              )}
              
              {onReviseParagraph && (
                <button
                  onClick={onReviseParagraph}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Revise This Paragraph
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Show a preview of the paragraph text */}
        <div className="mt-3 p-3 bg-gray-50 rounded-md border">
          <p className="text-xs text-gray-600 mb-1 font-medium">Paragraph Preview:</p>
          <p className="text-sm text-gray-700 line-clamp-3">
            {paragraphText.length > 150 
              ? `${paragraphText.substring(0, 150)}...` 
              : paragraphText
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default UnchangedParagraphFeedback;
