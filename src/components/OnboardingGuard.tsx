import React from 'react';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import OnboardingLock from './OnboardingLock';

interface OnboardingGuardProps {
  children: React.ReactNode;
  pageName: string;
  allowAccess?: boolean; // For pages that should be accessible even without onboarding
}

const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ 
  children, 
  pageName, 
  allowAccess = false 
}) => {
  const { onboardingCompleted, loading } = useOnboardingStatus();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is in onboarding completion flow (for profile page)
  const isOnboardingCompletionFlow = pageName === "Profile" && 
    localStorage.getItem('onboarding_completion_flow') === 'true';

  // If onboarding is not completed and access is not allowed, show lock screen
  if (!onboardingCompleted && !allowAccess && !isOnboardingCompletionFlow) {
    return <OnboardingLock pageName={pageName} />;
  }

  // If onboarding is completed, access is allowed, or user is in completion flow, show the children
  return <>{children}</>;
};

export default OnboardingGuard; 