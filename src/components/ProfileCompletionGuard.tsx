import React from 'react';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import ProfileCompletionLock from './ProfileCompletionLock';

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
  pageName: string;
}

const ProfileCompletionGuard: React.FC<ProfileCompletionGuardProps> = ({ 
  children, 
  pageName 
}) => {
  const { onboardingCompleted, loading: onboardingLoading } = useOnboardingStatus();
  const { 
    completionPercentage, 
    missingFields, 
    loading: profileLoading 
  } = useProfileCompletion();

  // Show loading state
  if (onboardingLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If onboarding is not completed, don't show profile completion lock
  // (let OnboardingGuard handle that)
  if (!onboardingCompleted) {
    return <>{children}</>;
  }

  // Check if profile is complete (100% completion)
  const isProfileComplete = completionPercentage >= 100;

  // If profile is not complete, show profile completion lock
  if (!isProfileComplete) {
    return <ProfileCompletionLock pageName={pageName} missingFields={missingFields} />;
  }

  // If profile is complete, show the children
  return <>{children}</>;
};

export default ProfileCompletionGuard;
