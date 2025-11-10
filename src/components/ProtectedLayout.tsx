import { Outlet } from 'react-router-dom';
import AuthenticationGuard from './AuthenticationGuard';

/**
 * Layout component that wraps all protected routes with authentication guard.
 * This is more efficient than wrapping each route individually because:
 * 1. Single guard instance persists across route changes
 * 2. Cleaner route definitions
 * 3. Better performance (no guard remounting on navigation)
 */
const ProtectedLayout = () => {
  return (
    <AuthenticationGuard>
      <Outlet />
    </AuthenticationGuard>
  );
};

export default ProtectedLayout;

