import React from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface IvySummitGuardProps {
  children: React.ReactNode;
}

/**
 * Guard for IvySummit portal
 * Requires user to be authenticated and have counselor access with counselor_name = 'ivysummit'
 */
const IvySummitGuard: React.FC<IvySummitGuardProps> = ({ children }) => {
  const { user, loading, isCounselor, counselorName } = useAuth();
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

  // Check if user is authenticated and is a counselor for IvySummit
  // Case-insensitive comparison to handle 'IvySummit', 'ivysummit', etc.
  if (user && isCounselor && counselorName && counselorName.toLowerCase() === 'ivysummit') {
    return <>{children}</>;
  }

  // If not authenticated or not a counselor, redirect to auth
  return <Navigate to="/auth" state={{ from: location }} replace />;
};

export default IvySummitGuard;

