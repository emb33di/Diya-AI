/**
 * Authentication Helper Utility
 * 
 * Provides a centralized way for services to access authenticated user information
 * without creating redundant auth state listeners or making direct Supabase auth calls.
 * 
 * This uses a singleton pattern to store a reference to the AuthContext state,
 * which is updated by AuthProvider. Services should use these helpers instead of
 * calling supabase.auth.getUser() or supabase.auth.getSession() directly.
 */

import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Singleton reference to current user from AuthContext
let currentUserRef: User | null = null;

/**
 * Initialize the auth helper with the current user from AuthContext.
 * This should be called by AuthProvider whenever the user state changes.
 * @internal - Only to be called by AuthProvider
 */
export const _setAuthUser = (user: User | null) => {
  currentUserRef = user;
};

/**
 * Get the currently authenticated user from the AuthContext cache.
 * This is synchronous and doesn't trigger any network calls or re-authentication.
 * 
 * @returns The current user object or null if not authenticated
 */
export const getCurrentUser = (): User | null => {
  return currentUserRef;
};

/**
 * Get the currently authenticated user, with a fallback to check Supabase session.
 * Prefer using getCurrentUser() when possible to avoid network calls.
 * 
 * @returns Promise resolving to the user object or null
 */
export const getAuthenticatedUser = async (): Promise<User | null> => {
  // First try cached user from context
  if (currentUserRef) {
    return currentUserRef;
  }

  // Fallback: check if there's a valid session in Supabase
  // This uses Supabase's internal cache and should not trigger re-auth
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Update our cache
      currentUserRef = session.user;
      return session.user;
    }
  } catch (error) {
    console.error('[AuthHelper] Error getting session:', error);
  }

  return null;
};

/**
 * Check if there is a currently authenticated user.
 * This is synchronous and doesn't trigger any network calls.
 * 
 * @returns true if user is authenticated, false otherwise
 */
export const isAuthenticated = (): boolean => {
  return currentUserRef !== null;
};

/**
 * Get the current user's ID.
 * This is a convenience method that's synchronous and doesn't trigger network calls.
 * 
 * @returns The user ID or null if not authenticated
 */
export const getCurrentUserId = (): string | null => {
  return currentUserRef?.id || null;
};

/**
 * Validate that a user is authenticated, throwing an error if not.
 * Useful for service methods that require authentication.
 * 
 * @throws Error if user is not authenticated
 * @returns The authenticated user
 */
export const requireAuth = (): User => {
  if (!currentUserRef) {
    throw new Error('User not authenticated');
  }
  return currentUserRef;
};

/**
 * Get user with detailed error information for better debugging.
 * 
 * @returns Object with user and error information
 */
export const getAuthState = (): { user: User | null; isAuthenticated: boolean } => {
  return {
    user: currentUserRef,
    isAuthenticated: currentUserRef !== null,
  };
};

