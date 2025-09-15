import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface LoadingStep {
  id: string;
  label: string;
  description?: string;
  estimatedTime?: number; // in seconds
}

interface EnhancedLoadingPaneProps {
  isVisible: boolean;
  steps: LoadingStep[];
  currentStepIndex: number;
  onComplete?: () => void;
  onCancel?: () => void;
  className?: string;
  showCancelButton?: boolean;
  realTimeProgress?: boolean;
}

const EnhancedLoadingPane: React.FC<EnhancedLoadingPaneProps> = ({
  isVisible,
  steps,
  currentStepIndex,
  onComplete,
  onCancel,
  className,
  showCancelButton = true,
  realTimeProgress = false
}) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepProgress, setStepProgress] = useState<Record<number, number>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);

  // Calculate total estimated time
  const totalEstimatedTime = steps.reduce((sum, step) => sum + (step.estimatedTime || 5), 0);

  // Update completed steps when currentStepIndex changes
  useEffect(() => {
    if (currentStepIndex > 0) {
      setCompletedSteps(prev => {
        const newCompleted = Array.from({ length: currentStepIndex }, (_, i) => i);
        return [...new Set([...prev, ...newCompleted])];
      });
    }
  }, [currentStepIndex]);

  // Real-time progress simulation
  useEffect(() => {
    if (!realTimeProgress || currentStepIndex >= steps.length) return;

    const interval = setInterval(() => {
      setStepProgress(prev => {
        const newProgress = { ...prev };
        if (currentStepIndex < steps.length) {
          const currentStep = steps[currentStepIndex];
          const estimatedTime = currentStep.estimatedTime || 5;
          const elapsed = (Date.now() - startTime) / 1000;
          const progress = Math.min((elapsed / estimatedTime) * 100, 100);
          newProgress[currentStepIndex] = progress;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentStepIndex, steps, realTimeProgress, startTime]);

  // Time remaining calculation
  useEffect(() => {
    if (!realTimeProgress || currentStepIndex >= steps.length) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(totalEstimatedTime - elapsed, 0);
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStepIndex, totalEstimatedTime, realTimeProgress, startTime]);

  // Initialize start time
  useEffect(() => {
    if (isVisible && realTimeProgress) {
      setStartTime(Date.now());
    }
  }, [isVisible, realTimeProgress]);

  // Call onComplete when all steps are done
  useEffect(() => {
    if (currentStepIndex >= steps.length && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000); // Small delay to show completion
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex, steps.length, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepProgress = (stepIndex: number) => {
    if (completedSteps.includes(stepIndex)) return 100;
    if (stepIndex === currentStepIndex && realTimeProgress) {
      return stepProgress[stepIndex] || 0;
    }
    if (stepIndex === currentStepIndex) return 50; // Static progress for non-real-time
    return 0;
  };

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
              : "bg-gradient-to-br from-blue-500 to-purple-600"
          )}>
            {currentStepIndex >= steps.length ? (
              <CheckCircle2 className="h-8 w-8 text-white" />
            ) : (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {currentStepIndex >= steps.length ? "Analysis Complete! ✨" : "Diya is analyzing your resume ✨"}
          </h2>
          <p className="text-gray-600 mb-2">
            {currentStepIndex >= steps.length 
              ? "Your comprehensive feedback is ready!" 
              : "AI is processing your resume and generating personalized feedback"
            }
          </p>
          {currentStepIndex < steps.length && (
            <div className="flex items-center justify-center space-x-2 text-sm text-amber-600 font-medium">
              <Clock className="h-4 w-4" />
              <span>⏱️ This usually takes 1-2 minutes</span>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;
            const progress = getStepProgress(index);

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
                  {isCurrent && realTimeProgress && (
                    <div className="mt-2">
                      <Progress value={progress} className="h-1" />
                      <p className="text-xs text-blue-600 mt-1">
                        {Math.round(progress)}% complete
                      </p>
                    </div>
                  )}
                </div>

                {/* Time Estimate */}
                {isCurrent && step.estimatedTime && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      ~{step.estimatedTime}s
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall Progress */}
        <div className="mt-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Overall Progress</span>
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
          
          {/* Time Remaining */}
          {realTimeProgress && timeRemaining > 0 && currentStepIndex < steps.length && (
            <div className="flex items-center justify-center mt-3 text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              <span>Estimated time remaining: {formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>

        {/* Cancel Button */}
        {showCancelButton && currentStepIndex < steps.length && onCancel && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Analysis
            </Button>
          </div>
        )}

        {/* Error State */}
        {currentStepIndex < 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Analysis Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              There was an issue processing your resume. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedLoadingPane;
