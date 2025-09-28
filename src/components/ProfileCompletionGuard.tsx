import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProfileCompletionLock from './ProfileCompletionLock';

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
  pageName: string;
}

const ProfileCompletionGuard: React.FC<ProfileCompletionGuardProps> = ({ 
  children, 
  pageName 
}) => {
  const { onboardingCompleted, profileSaved, loading } = useAuth();

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

  // If onboarding is not completed, don't show profile completion lock
  // (let OnboardingGuard handle that)
  if (!onboardingCompleted) {
    return <>{children}</>;
  }

  // Check if profile has been saved (user has completed initial profile setup)
  const isProfileSaved = profileSaved === true;

  // If profile is not saved, show profile completion lock
  if (!isProfileSaved) {
    return <ProfileCompletionLock pageName={pageName} missingFields={[]} />;
  }

  // If profile is saved, show the children
  return <>{children}</>;
};

export default ProfileCompletionGuard;
