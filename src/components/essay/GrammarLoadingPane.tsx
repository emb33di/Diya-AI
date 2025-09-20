import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, CheckSquare, Eye, Zap, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStep {
  id: string;
  label: string;
  description?: string;
  estimatedTime?: number; // in seconds
  icon?: React.ReactNode;
}

interface GrammarLoadingPaneProps {
  isVisible: boolean;
  steps: LoadingStep[];
  currentStepIndex: number;
  onComplete?: () => void;
  className?: string;
  noErrorsFound?: boolean;
}

const GrammarLoadingPane: React.FC<GrammarLoadingPaneProps> = ({
  isVisible,
  steps,
  currentStepIndex,
  onComplete,
  className,
  noErrorsFound = false
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

  // Call onComplete when all steps are done
  useEffect(() => {
    if (currentStepIndex >= steps.length && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000); // Small delay to show completion
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, steps.length, onComplete]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[99999] flex items-center justify-center",
      "bg-black/50 backdrop-blur-sm",
      "transition-all duration-300 ease-in-out",
      className
    )}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={cn(
            "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-500",
            currentStepIndex >= steps.length 
              ? "bg-gradient-to-br from-green-500 to-emerald-600" 
              : "bg-gradient-to-br from-blue-500 to-cyan-600"
          )}>
            {currentStepIndex >= steps.length ? (
              <CheckCircle2 className="h-8 w-8 text-white" />
            ) : (
              <CheckSquare className="h-8 w-8 text-white animate-pulse" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStepIndex >= steps.length 
              ? (noErrorsFound ? "Great job! No grammar errors found! 🎉" : "Grammar Check Complete! ✨")
              : "Diya is checking your grammar ✨"
            }
          </h2>
          <p className="text-gray-600 mb-2">
            {currentStepIndex >= steps.length 
              ? (noErrorsFound 
                  ? "Your writing is grammatically perfect! Keep up the excellent work!" 
                  : "Your writing has been polished and refined!")
              : "AI is scanning for grammar, spelling, and writing mechanics"
            }
          </p>
          {currentStepIndex < steps.length && (
            <p className="text-sm text-blue-600 font-medium">
              ⏱️ This usually takes about 15 seconds
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
                  isCurrent && "bg-blue-50 border border-blue-200 scale-105",
                  isUpcoming && "bg-gray-50 border border-gray-200"
                )}
              >
                {/* Step Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-blue-500 text-white",
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
                    isCurrent && "text-blue-800",
                    isUpcoming && "text-gray-600"
                  )}>
                    {step.label}
                  </h3>
                  {step.description && (
                    <p className={cn(
                      "text-sm mt-1 transition-colors duration-300",
                      isCompleted && "text-green-600",
                      isCurrent && "text-blue-600",
                      isUpcoming && "text-gray-500"
                    )}>
                      {step.description}
                    </p>
                  )}
                </div>

                {/* Animated Progress Bar */}
                {isCurrent && (
                  <div className="w-2 h-8 bg-blue-200 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-blue-500 rounded-full animate-pulse" />
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
                  : "bg-gradient-to-r from-blue-500 to-cyan-600"
              )}
              style={{ 
                width: `${Math.min((currentStepIndex / steps.length) * 100, 100)}%` 
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrammarLoadingPane;

// Predefined loading steps for grammar checking
export const GRAMMAR_LOADING_STEPS = [
  {
    id: 'scanning',
    label: 'Scanning Text',
    description: 'Diya is reading through your essay carefully',
    estimatedTime: 5,
    icon: <Eye className="h-5 w-5" />
  },
  {
    id: 'analyzing',
    label: 'Grammar Analysis',
    description: 'Checking grammar, spelling, and punctuation',
    estimatedTime: 10,
    icon: <Zap className="h-5 w-5" />
  },
  {
    id: 'finalizing',
    label: 'Finalizing Results',
    description: 'Preparing your grammar suggestions',
    estimatedTime: 3,
    icon: <FileCheck className="h-5 w-5" />
  }
];
