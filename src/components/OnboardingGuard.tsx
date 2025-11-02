import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  const { onboardingCompleted, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    console.log('[ONBOARDING_GUARD] State snapshot', {
      path: location.pathname,
      loading,
      onboardingCompleted,
      allowAccess,
    });
  }, [location.pathname, loading, onboardingCompleted, allowAccess]);

  // Show loading state
  if (loading) {
    console.log('[ONBOARDING_GUARD] Rendering loading fallback', {
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

  // If onboarding is not completed and access is not allowed, show lock screen
  if (!onboardingCompleted && !allowAccess) {
    console.log('[ONBOARDING_GUARD] Blocking access until onboarding complete', {
      path: location.pathname,
      pageName,
    });
    return <OnboardingLock pageName={pageName} />;
  }

  // If onboarding is completed or access is allowed, show the children
  console.log('[ONBOARDING_GUARD] Rendering children', {
    path: location.pathname,
    pageName,
    onboardingCompleted,
    allowAccess,
  });
  return <>{children}</>;
};

export default OnboardingGuard; 