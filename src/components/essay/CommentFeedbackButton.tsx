import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CommentService } from '@/services/commentService';
import { useToast } from '@/components/ui/use-toast';

interface CommentFeedbackButtonProps {
  commentId: string;
  isAIGenerated: boolean;
  currentFeedback?: boolean | null;
  onFeedbackChange?: (feedback: boolean | null) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const CommentFeedbackButton: React.FC<CommentFeedbackButtonProps> = ({
  commentId,
  isAIGenerated,
  currentFeedback,
  onFeedbackChange,
  size = 'sm',
  className = ''
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Only show feedback buttons for AI-generated comments
  if (!isAIGenerated) {
    return null;
  }

  const handleFeedback = async (isHelpful: boolean) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await CommentService.submitUserFeedback(commentId, isHelpful);
      onFeedbackChange?.(isHelpful);
      
      toast({
        title: "Feedback submitted",
        description: `Thank you for your feedback! This helps us improve our AI.`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFeedback = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await CommentService.removeUserFeedback(commentId);
      onFeedbackChange?.(null);
    } catch (error) {
      console.error('Error removing feedback:', error);
      toast({
        title: "Error",
        description: "Failed to remove feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 12 : 16;

  return (
    <TooltipProvider>
      <div className={`flex items-center space-x-1 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`${buttonSize} p-0 hover:bg-green-50 ${
                currentFeedback === true 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'text-gray-400 hover:text-green-600'
              }`}
              onClick={() => currentFeedback === true ? handleRemoveFeedback() : handleFeedback(true)}
              disabled={isSubmitting}
            >
              <ThumbsUp size={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{currentFeedback === true ? 'Remove helpful feedback' : 'Mark as helpful'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`${buttonSize} p-0 hover:bg-red-50 ${
                currentFeedback === false 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'text-gray-400 hover:text-red-600'
              }`}
              onClick={() => currentFeedback === false ? handleRemoveFeedback() : handleFeedback(false)}
              disabled={isSubmitting}
            >
              <ThumbsDown size={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{currentFeedback === false ? 'Remove not helpful feedback' : 'Mark as not helpful'}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default CommentFeedbackButton;
