import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from './LoadingScreen';

interface FounderGuardProps {
  children: React.ReactNode;
}

const FounderGuard: React.FC<FounderGuardProps> = ({ children }) => {
  const { user, isFounder, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (!isFounder) return <Navigate to="/schools" replace />;

  return <>{children}</>;
};

export default FounderGuard;

