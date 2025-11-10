import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthenticationGuardProps {
  children: React.ReactNode;
}

/**
 * Helper function to get the counselor portal route based on counselor name
 * Currently defaults to ivysummit-portal, but can be extended for other partners
 */
const getCounselorPortalRoute = (counselorName: string | null | undefined): string => {
  if (!counselorName) return '/ivysummit-portal';
  
  // Map counselor names to portal routes
  const portalRoutes: Record<string, string> = {
    'ivysummit': '/ivysummit-portal',
    // Add more partner routes here as needed
  };
  
  return portalRoutes[counselorName.toLowerCase()] || '/ivysummit-portal';
};

const AuthenticationGuard: React.FC<AuthenticationGuardProps> = ({ children }) => {
  const { user, loading, isFounder, isCounselor, counselorName } = useAuth();
  const location = useLocation();

  // Log only when auth state actually changes, not on route changes
  useEffect(() => {
    console.log('[AUTH_GUARD] Auth state changed', {
      loading,
      hasUser: Boolean(user),
      isFounder,
      isCounselor,
      counselorName,
      currentPath: location.pathname,
    });
  }, [loading, user, isFounder, isCounselor, counselorName]); // Only log when auth state changes, not route changes

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

  // If user is a counselor, redirect to counselor portal (counselors only see counselor portal)
  if (isCounselor && counselorName) {
    const portalRoute = getCounselorPortalRoute(counselorName);
    return <Navigate to={portalRoute} replace />;
  }

  // If user is authenticated and not a founder or counselor, render the protected content
  return <>{children}</>;
};

export default AuthenticationGuard;
