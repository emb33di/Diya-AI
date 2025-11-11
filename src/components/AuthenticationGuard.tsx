import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from './LoadingScreen';

interface AuthenticationGuardProps {
  children: React.ReactNode;
}

const getCounselorPortalRoute = (counselorName: string): string => {
  const portalRoutes: Record<string, string> = {
    'ivysummit': '/ivysummit-portal',
  };
  return portalRoutes[counselorName.toLowerCase()] || '/ivysummit-portal';
};

const AuthenticationGuard: React.FC<AuthenticationGuardProps> = ({ children }) => {
  const { user, loading, isFounder, isCounselor, counselorName } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (isFounder) return <Navigate to="/founder-portal" replace />;
  if (isCounselor && counselorName) {
    return <Navigate to={getCounselorPortalRoute(counselorName)} replace />;
  }

  return <>{children}</>;
};

export default AuthenticationGuard;
