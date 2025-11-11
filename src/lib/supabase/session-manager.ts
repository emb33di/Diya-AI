import { supabase } from '@/integrations/supabase/client';

/**
 * Session Manager - Handles automatic session refresh and recovery
 */
class SessionManager {
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_EXPIRY_THRESHOLD = 10 * 60 * 1000; // 10 minutes before expiry

  /**
   * Start automatic session refresh
   */
  startAutoRefresh() {
    // Clear any existing interval
    this.stopAutoRefresh();

    // Check session immediately
    this.checkAndRefreshSession();

    // Set up periodic refresh
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshSession();
    }, this.REFRESH_INTERVAL);
  }

  /**
   * Stop automatic session refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Check current session and refresh if needed
   */
  private async checkAndRefreshSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session check error:', error);
        return;
      }

      if (!session) {
        return; // No session to refresh
      }

      // Check if session is about to expire
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Refresh if session expires within threshold
      if (timeUntilExpiry < this.SESSION_EXPIRY_THRESHOLD) {
        await this.refreshSession();
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  }

  /**
   * Manually refresh the current session
   */
  async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Session refresh error:', error);
        // If refresh fails, try to recover from localStorage
        await this.recoverSession();
        return;
      }

      if (data.session) {
        console.log('Session refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }

  /**
   * Attempt to recover session from localStorage
   */
  private async recoverSession() {
    try {
      // Get session from storage
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // If recovery fails, clear potentially corrupted data
        this.clearSession();
        return;
      }

      // Verify the recovered session is valid
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        this.clearSession();
      }
    } catch (error) {
      console.error('Error recovering session:', error);
      this.clearSession();
    }
  }

  /**
   * Clear session data
   */
  private clearSession() {
    // Remove Supabase auth data from localStorage
    Object.keys(localStorage)
      .filter(key => key.startsWith('sb-'))
      .forEach(key => localStorage.removeItem(key));
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        return false;
      }

      // Check if session is expired
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();

      if (expiresAt < now) {
        // Session expired, try to refresh
        const { error: refreshError } = await supabase.auth.refreshSession();
        return !refreshError;
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

