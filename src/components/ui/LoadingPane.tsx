import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStep {
  id: string;
  label: string;
  description?: string;
}

interface LoadingPaneProps {
  isVisible: boolean;
  steps: LoadingStep[];
  currentStepIndex: number;
  onComplete?: () => void;
  className?: string;
  insideDialog?: boolean; // When true, renders relative to parent instead of fixed to viewport
}

const LoadingPane: React.FC<LoadingPaneProps> = ({
  isVisible,
  steps,
  currentStepIndex,
  onComplete,
  className,
  insideDialog = false
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
      insideDialog 
        ? "relative w-full flex items-center justify-center"
        : "fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm",
      "transition-all duration-300 ease-in-out",
      className
    )}>
      <div className={cn(
        "w-full",
        insideDialog ? "p-6" : "rounded-2xl shadow-2xl max-w-md mx-4 p-8",
        "animate-in fade-in-0 zoom-in-95 duration-300"
      )} style={{ backgroundColor: '#F4EDE2' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className={cn(
            "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-500",
            currentStepIndex >= steps.length 
              ? "bg-gradient-to-br from-green-500 to-emerald-600" 
              : "bg-gradient-to-br from-blue-500 to-purple-600"
          )}>
            {currentStepIndex >= steps.length ? (
              <CheckCircle2 className="h-8 w-8 text-white" />
            ) : (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStepIndex >= steps.length ? "Feedback Complete! ✨" : "Diya is working her magic ✨"}
          </h2>
          <p className="text-gray-600 mb-2">
            {currentStepIndex >= steps.length 
              ? "Your personalized feedback is ready!" 
              : "Analyzing your essay and preparing personalized feedback"
            }
          </p>
          {currentStepIndex < steps.length && (
            <p className="text-sm text-amber-600 font-medium">
              ⏱️ This can take a minute
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
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
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
                  : "bg-gradient-to-r from-blue-500 to-purple-600"
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

export default LoadingPane;
