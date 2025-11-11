import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sessionManager } from '@/lib/supabase/session-manager';

interface SessionRecoveryState {
  isRecovering: boolean;
  lastRecoveryAttempt: Date | null;
  recoveryError: string | null;
}

/**
 * Hook for handling session recovery and monitoring
 * Useful for handling network errors and session expiration
 */
export const useSessionRecovery = () => {
  const [state, setState] = useState<SessionRecoveryState>({
    isRecovering: false,
    lastRecoveryAttempt: null,
    recoveryError: null,
  });

  /**
   * Attempt to recover the current session
   */
  const recoverSession = useCallback(async () => {
    setState(prev => ({ ...prev, isRecovering: true, recoveryError: null }));

    try {
      // First, validate the current session
      const isValid = await sessionManager.validateSession();

      if (isValid) {
        setState(prev => ({
          ...prev,
          isRecovering: false,
          lastRecoveryAttempt: new Date(),
          recoveryError: null,
        }));
        return true;
      }

      // If validation fails, try to refresh
      await sessionManager.refreshSession();

      // Check again after refresh
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        throw new Error('Session recovery failed');
      }

      setState(prev => ({
        ...prev,
        isRecovering: false,
        lastRecoveryAttempt: new Date(),
        recoveryError: null,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isRecovering: false,
        lastRecoveryAttempt: new Date(),
        recoveryError: errorMessage,
      }));
      return false;
    }
  }, []);

  /**
   * Check session health
   */
  const checkSessionHealth = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        return { healthy: false, error: error.message };
      }

      if (!session) {
        return { healthy: false, error: 'No active session' };
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      return {
        healthy: timeUntilExpiry > 0,
        expiresAt: new Date(expiresAt),
        timeUntilExpiry: Math.max(0, timeUntilExpiry),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, []);

  /**
   * Monitor for network errors and attempt recovery
   */
  useEffect(() => {
    const handleOnline = () => {
      // When network comes back online, check and recover session
      recoverSession();
    };

    const handleVisibilityChange = () => {
      // When tab becomes visible, check session health
      if (document.visibilityState === 'visible') {
        checkSessionHealth().then(health => {
          if (!health.healthy) {
            recoverSession();
          }
        });
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recoverSession, checkSessionHealth]);

  return {
    ...state,
    recoverSession,
    checkSessionHealth,
  };
};

