import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface FounderGuardProps {
  children: React.ReactNode;
}

const FounderGuard: React.FC<FounderGuardProps> = ({ children }) => {
  const { user, isFounder, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
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

  // If user is not authenticated, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user is not a founder, redirect to dashboard
  if (!isFounder) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is authenticated and is a founder, render the protected content
  return <>{children}</>;
};

export default FounderGuard;

