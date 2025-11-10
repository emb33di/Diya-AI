import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthenticationGuardProps {
  children: React.ReactNode;
}

const AuthenticationGuard: React.FC<AuthenticationGuardProps> = ({ children }) => {
  const { user, loading, isFounder } = useAuth();
  const location = useLocation();

  // Log only when auth state actually changes, not on route changes
  useEffect(() => {
    console.log('[AUTH_GUARD] Auth state changed', {
      loading,
      hasUser: Boolean(user),
      isFounder,
      currentPath: location.pathname,
    });
  }, [loading, user, isFounder]); // Only log when auth state changes, not route changes

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

  // If user is a founder, redirect to founder portal (founders only see founder dashboard)
  if (isFounder) {
    return <Navigate to="/founder-portal" replace />;
  }

  // If user is authenticated and not a founder, render the protected content
  return <>{children}</>;
};

export default AuthenticationGuard;
