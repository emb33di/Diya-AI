import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Sparkles, Brain, MessageSquare, Target, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface LoadingStep {
  id: string;
  label: string;
  description?: string;
  estimatedTime?: number; // in seconds
  icon?: React.ReactNode;
}

interface AICommentsLoadingPaneProps {
  isVisible: boolean;
  steps: LoadingStep[];
  currentStepIndex: number;
  onComplete?: () => void;
  onSeeComments?: () => void;
  className?: string;
}

const AICommentsLoadingPane: React.FC<AICommentsLoadingPaneProps> = ({
  isVisible,
  steps,
  currentStepIndex,
  onComplete,
  onSeeComments,
  className
}) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Update completed steps when currentStepIndex changes
  useEffect(() => {
    if (currentStepIndex > 0) {
      setCompletedSteps(prev => {
        const newCompleted = Array.from({ length: currentStepIndex }, (_, i) => i);
        return [...new Set([...prev, ...newCompleted])];
      });
    }
  }, [currentStepIndex]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[99999] flex items-center justify-center",
      "bg-black/50 backdrop-blur-sm",
      "transition-all duration-300 ease-in-out",
      className
    )}>
      <div className="rounded-2xl shadow-2xl p-8 max-w-4xl w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-300" style={{ backgroundColor: '#F4EDE2' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className={cn(
            "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-500",
            currentStepIndex >= steps.length 
              ? "bg-gradient-to-br from-green-500 to-emerald-600" 
              : "bg-gradient-to-br from-purple-500 to-pink-600"
          )}>
            {currentStepIndex >= steps.length ? (
              <CheckCircle2 className="h-8 w-8 text-white" />
            ) : (
              <Sparkles className="h-8 w-8 text-white animate-pulse" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStepIndex >= steps.length ? "AI Comments Ready! ✨" : "Diya is analyzing your essay ✨"}
          </h2>
          <p className="text-gray-600 mb-2">
            {currentStepIndex >= steps.length 
              ? "Your AI-powered feedback is ready to review!" 
              : "Our AI agents are working together to provide personalized feedback"
            }
          </p>
          {currentStepIndex < steps.length && (
            <p className="text-sm text-purple-600 font-medium">
              ⏱️ This usually takes about 30 seconds
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center space-x-4 p-4 rounded-xl transition-all duration-500",
                  isCompleted && "bg-green-50 border border-green-200",
                  isCurrent && "bg-purple-50 border border-purple-200 scale-105",
                  isUpcoming && "bg-gray-50 border border-gray-200"
                )}
              >
                {/* Step Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-purple-500 text-white",
                  isUpcoming && "bg-gray-300 text-gray-600"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isCurrent ? (
                    step.icon ? (
                      <div className="animate-pulse">{step.icon}</div>
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    )
                  ) : (
                    step.icon || <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <h3 className={cn(
                    "font-semibold transition-colors duration-300",
                    isCompleted && "text-green-800",
                    isCurrent && "text-purple-800",
                    isUpcoming && "text-gray-600"
                  )}>
                    {step.label}
                  </h3>
                  {step.description && (
                    <p className={cn(
                      "text-sm mt-1 transition-colors duration-300",
                      isCompleted && "text-green-600",
                      isCurrent && "text-purple-600",
                      isUpcoming && "text-gray-500"
                    )}>
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Animated Progress Bar */}
                {isCurrent && (
                  <div className="w-2 h-8 bg-purple-200 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-purple-500 rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Indicator */}
        <div className="mt-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Progress</span>
            <span>{Math.min(currentStepIndex + 1, steps.length)}/{steps.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-500 ease-out",
                currentStepIndex >= steps.length 
                  ? "bg-gradient-to-r from-green-500 to-emerald-600" 
                  : "bg-gradient-to-r from-purple-500 to-pink-600"
              )}
              style={{ 
                width: `${Math.min((currentStepIndex / steps.length) * 100, 100)}%` 
              }}
            />
          </div>
        </div>

        {/* See AI Comments Button - Only show when complete */}
        {currentStepIndex >= steps.length && onSeeComments && (
          <div className="mt-8 text-center">
            <Button
              onClick={onSeeComments}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Eye className="h-5 w-5 mr-2" />
              See AI Comments
            </Button>
            <p className="text-sm text-gray-500 mt-3">
              Click to refresh and view your personalized feedback
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICommentsLoadingPane;

// Predefined loading steps for AI comments generation
export const AI_COMMENTS_LOADING_STEPS = [
  {
    id: 'analyzing',
    label: 'Analyzing Content',
    description: 'Diya is reading and understanding your essay structure',
    estimatedTime: 10,
    icon: <Brain className="h-5 w-5" />
  },
  {
    id: 'processing',
    label: 'AI Processing',
    description: 'Diya is examining your essay from multiple angles',
    estimatedTime: 20,
    icon: <Sparkles className="h-5 w-5" />
  },
  {
    id: 'generating',
    label: 'Generating Comments',
    description: 'Creating personalized feedback and suggestions',
    estimatedTime: 15,
    icon: <MessageSquare className="h-5 w-5" />
  },
  {
    id: 'finalizing',
    label: 'Finalizing Results',
    description: 'Diya is writing up some feedback for you now!',
    estimatedTime: 5,
    icon: <Target className="h-5 w-5" />
  }
];
