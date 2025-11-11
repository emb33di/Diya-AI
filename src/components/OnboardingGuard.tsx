import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import OnboardingLock from './OnboardingLock';
import LoadingScreen from './LoadingScreen';

interface OnboardingGuardProps {
  children: React.ReactNode;
  pageName: string;
  allowAccess?: boolean;
}

const OnboardingGuard: React.FC<OnboardingGuardProps> = ({ 
  children, 
  pageName, 
  allowAccess = false 
}) => {
  const { onboardingCompleted, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!onboardingCompleted && !allowAccess) return <OnboardingLock pageName={pageName} />;

  return <>{children}</>;
};

export default OnboardingGuard; 