import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();

  useEffect(() => {
    console.log('[PROFILE_GUARD] State snapshot', {
      path: location.pathname,
      loading,
      onboardingCompleted,
      profileSaved,
    });
  }, [location.pathname, loading, onboardingCompleted, profileSaved]);

  // Show loading state
  if (loading) {
    console.log('[PROFILE_GUARD] Rendering loading fallback', {
      path: location.pathname,
      pageName,
    });
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
    console.log('[PROFILE_GUARD] Onboarding incomplete, bypassing profile lock', {
      path: location.pathname,
      pageName,
    });
    return <>{children}</>;
  }

  // Check if profile has been saved (user has completed initial profile setup)
  const isProfileSaved = profileSaved === true;

  // If profile is not saved, show profile completion lock
  if (!isProfileSaved) {
    console.log('[PROFILE_GUARD] Blocking until profile saved', {
      path: location.pathname,
      pageName,
    });
    return <ProfileCompletionLock pageName={pageName} missingFields={[]} />;
  }

  // If profile is saved, show the children
  console.log('[PROFILE_GUARD] Rendering children', {
    path: location.pathname,
    pageName,
  });
  return <>{children}</>;
};

export default ProfileCompletionGuard;
