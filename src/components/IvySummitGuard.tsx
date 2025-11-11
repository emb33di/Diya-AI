import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from './LoadingScreen';

interface IvySummitGuardProps {
  children: React.ReactNode;
}

const IvySummitGuard: React.FC<IvySummitGuardProps> = ({ children }) => {
  const { user, loading, isCounselor, counselorName } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  
  const isIvySummitCounselor = user && isCounselor && counselorName?.toLowerCase() === 'ivysummit';
  if (!isIvySummitCounselor) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default IvySummitGuard;

