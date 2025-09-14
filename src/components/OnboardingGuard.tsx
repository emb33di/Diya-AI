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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If onboarding is not completed and access is not allowed, show lock screen
  if (!onboardingCompleted && !allowAccess) {
    return <OnboardingLock pageName={pageName} />;
  }

  // If onboarding is completed or access is allowed, show the children
  return <>{children}</>;
};

export default OnboardingGuard; 