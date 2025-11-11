import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { analytics } from '@/utils/analytics';
import { _setAuthUser } from '@/utils/authHelper';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email_address: string | null;
  onboarding_complete: boolean;
  skipped_onboarding: boolean;
  profile_saved: boolean;
  user_tier: string | null;
  is_founder?: boolean;
  is_counselor?: boolean;
  counselor_name?: string | null;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  onboardingCompleted: boolean | null;
  profileSaved: boolean | null;
  isFounder: boolean;
  isCounselor: boolean;
  counselorName: string | null;
  markOnboardingCompleted: (skipped?: boolean) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: (options?: { force?: boolean; invalidateCache?: boolean }) => Promise<void>;
  // Helper methods to get current auth state without triggering re-renders
  getCurrentUser: () => User | null;
  getSession: () => Promise<{ user: User | null; session: any } | null>;
}

const AuthContext = createContext<AuthState | null>(null);

const authDebug = (message: string, payload?: Record<string, unknown>) => {
  if (payload) {
    console.log(`[AUTH_DEBUG] ${message}`, payload);
  } else {
    console.log(`[AUTH_DEBUG] ${message}`);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Track ongoing profile fetches to prevent concurrent duplicate requests
  // Maps userId to timestamp when fetch started - allows retry if fetch is stuck (>5s)
  const fetchInProgressRef = React.useRef<Map<string, number>>(new Map());
  // Track if initial session has been processed to prevent redundant fetches from multiple auth events
  const sessionProcessedRef = React.useRef<{ userId: string | null; processed: boolean }>({ userId: null, processed: false });
  // Track fallback timeout ID so we can clear it when INITIAL_SESSION fires
  const fallbackTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [state, setState] = useState<{
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
  }>(() => {
    // Initialize from localStorage for faster initial load
    try {
      const cachedProfile = localStorage.getItem('user_profile');
      const cachedSession = localStorage.getItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || '') + '-auth-token');
      
      if (cachedProfile) {
        authDebug('Hydrating auth state from cached profile');
        console.log('[AUTH_PROVIDER] Cached profile found:', {
          profileId: JSON.parse(cachedProfile).id,
          hasCachedSession: Boolean(cachedSession)
        });
        return {
          user: null, // User object will be fetched async
          profile: JSON.parse(cachedProfile),
          loading: true, // Still loading session info
          error: null,
        };
      }
    } catch (error) {
      console.warn('Failed to parse cached user profile:', error);
    }
    authDebug('No cached auth profile found, starting fresh');
    return {
      user: null,
      profile: null,
      loading: true,
      error: null,
    };
  });

  const fetchUserProfile = async (
    user: User,
    mountedRef: { current: boolean },
    options: { force?: boolean; invalidateCache?: boolean } = {}
  ) => {
    const { force = false, invalidateCache = false } = options;

    if (invalidateCache) {
      try {
        localStorage.removeItem('user_profile');
        authDebug('Invalidated cached user profile before fetch', { userId: user.id });
        console.log('[AUTH_PROVIDER] Cached profile invalidated before fetch for user:', user.id);
      } catch (cacheError) {
        console.warn('[AUTH_PROVIDER] Failed to invalidate cached profile before fetch:', cacheError);
      }
    }

    // Fix #1: Prevent concurrent fetches, but allow retry if fetch is stuck (>5s)
    const existingFetchStartTime = fetchInProgressRef.current.get(user.id);
    if (existingFetchStartTime) {
      const fetchAge = Date.now() - existingFetchStartTime;
      if (force) {
        authDebug('Force refreshing user profile, overriding existing fetch', { 
          userId: user.id, 
          fetchAgeMs: fetchAge 
        });
        console.log('[AUTH_PROVIDER] Force refreshing profile - overriding in-progress fetch for user:', user.id);
        fetchInProgressRef.current.delete(user.id);
      } else if (fetchAge < 5000) {
        // Fetch started less than 5 seconds ago, skip duplicate
        authDebug('Profile fetch already in progress, skipping duplicate', { 
          userId: user.id, 
          fetchAgeMs: fetchAge 
        });
        console.log('[AUTH_PROVIDER] Profile fetch already in progress, skipping duplicate');
        return;
      } else {
        // Fetch has been running for >5s, might be stuck - allow retry
        authDebug('Existing fetch appears stuck, allowing retry', { 
          userId: user.id, 
          fetchAgeMs: fetchAge 
        });
        console.log('[AUTH_PROVIDER] Existing fetch appears stuck, allowing retry');
        fetchInProgressRef.current.delete(user.id);
      }
    }
    
    fetchInProgressRef.current.set(user.id, Date.now());
    authDebug('Fetching user profile start', { userId: user.id });
    console.log('[AUTH_PROVIDER] Starting profile fetch for user:', user.id);
    
    try {
      authDebug('About to query user_profiles table');
      
      // Use longer timeout in production due to network latency
      // Production often has higher latency due to CDN/proxy, so use longer timeout
      const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
      const timeoutMs = isProduction ? 20000 : 5000; // 20s in prod, 5s in dev
      
      const queryPromise = supabase
        .from('user_profiles')
        .select('id, full_name, email_address, onboarding_complete, skipped_onboarding, profile_saved, user_tier, is_founder, is_counselor, counselor_name')
        .eq('user_id', user.id as any)
        .maybeSingle();
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Profile query timeout after ${timeoutMs / 1000}s`)), timeoutMs);
      });
      
      let result: any;
      try {
        result = await Promise.race([queryPromise, timeoutPromise]);
        clearTimeout(timeoutId);
      } catch (timeoutError) {
        clearTimeout(timeoutId);
        // If we have cached profile, fail fast instead of waiting
        const cachedProfile = localStorage.getItem('user_profile');
        if (cachedProfile) {
          authDebug('Query timed out but we have cached profile - failing fast');
          console.log('[AUTH_PROVIDER] Profile query timed out, will use cached profile in error handler');
          throw timeoutError; // Let error handler use cached profile
        }
        // Otherwise, try one more quick check (500ms max)
        try {
          const quickCheck = await Promise.race([
            queryPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Quick check timeout')), 500))
          ]) as any;
          if (quickCheck?.data || quickCheck?.error?.code === 'PGRST116') {
            authDebug('Query completed after timeout, using result', { hasProfile: !!quickCheck.data });
            result = quickCheck;
          } else {
            throw timeoutError;
          }
        } catch {
          throw timeoutError;
        }
      }
      
      const { data: profile, error } = result;

      authDebug('Query completed', { hasProfile: !!profile, hasError: !!error });
      console.log('[AUTH_PROVIDER] Profile query completed:', {
        hasProfile: Boolean(profile),
        hasError: Boolean(error),
        errorCode: error?.code,
        errorMessage: error?.message
      });

      if (error && error.code !== 'PGRST116') {
        authDebug('Error code returned from profile fetch', { code: error.code, message: error.message });
        throw error;
      }

      if (!mountedRef.current) {
        authDebug('Component unmounted, skipping profile update');
        console.log('[AUTH_PROVIDER] Component unmounted, skipping profile update');
        return;
      }
      
      authDebug('Mounted check passed, processing profile');

      let finalProfile = profile;

      // If no profile exists, create one
      if (!finalProfile) {
        authDebug('No profile found, creating new profile', { userId: user.id });
        console.log('[AUTH_PROVIDER] No profile found, creating new profile');
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id as any,
            full_name: user.user_metadata?.full_name || `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || null,
            email_address: user.email,
            onboarding_complete: false,
            skipped_onboarding: false,
            profile_saved: false,
          } as any)
          .select('id, full_name, email_address, onboarding_complete, skipped_onboarding, profile_saved, user_tier, is_founder, is_counselor, counselor_name')
          .single();

        if (createError) {
          console.error('[AUTH_PROVIDER] Error creating profile:', createError);
          throw createError;
        }
        finalProfile = newProfile;
        console.log('[AUTH_PROVIDER] Profile created successfully');
      }

      if (!mountedRef.current) {
        authDebug('Component unmounted after profile creation, skipping update');
        console.log('[AUTH_PROVIDER] Component unmounted after profile creation');
        return;
      }

      if (!finalProfile) {
        authDebug('Profile fetch returned null after creation attempt', { userId: user.id });
        console.error('[AUTH_PROVIDER] Profile fetch returned null after creation attempt');
        throw new Error('Failed to create or fetch user profile.');
      }

      const combinedProfile: UserProfile = {
        id: (finalProfile as any).id,
        full_name: (finalProfile as any).full_name || user.user_metadata?.full_name || null,
        email_address: (finalProfile as any).email_address || user.email || null,
        onboarding_complete: (finalProfile as any).onboarding_complete || false,
        skipped_onboarding: (finalProfile as any).skipped_onboarding || false,
        profile_saved: (finalProfile as any).profile_saved || false,
        user_tier: (finalProfile as any).user_tier || 'Free',
        is_founder: (finalProfile as any).is_founder || false,
        is_counselor: (finalProfile as any).is_counselor || false,
        counselor_name: (finalProfile as any).counselor_name || null,
      };

      console.log('[AUTH_PROVIDER] Setting auth state with user and profile:', {
        userId: user.id,
        profileId: combinedProfile.id,
        onboardingComplete: combinedProfile.onboarding_complete
      });
      setState({ user, profile: combinedProfile, loading: false, error: null });
      authDebug('Auth state updated with user profile', { userId: user.id, onboardingComplete: combinedProfile.onboarding_complete });
      // Cache the profile for faster loads and offline resilience
      localStorage.setItem('user_profile', JSON.stringify(combinedProfile));
    } catch (error) {
      console.error('[AUTH_DEBUG] Error fetching user profile:', error);
      console.error('[AUTH_DEBUG] Error stack:', error instanceof Error ? error.stack : 'no stack');
      console.error('[AUTH_PROVIDER] Profile fetch failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
        mounted: mountedRef.current
      });
      if (mountedRef.current) {
        // Check if we have cached profile to use
        const cachedProfile = localStorage.getItem('user_profile');
        if (cachedProfile) {
          try {
            const parsedProfile = JSON.parse(cachedProfile);
            // Verify the cached profile matches the user
            if (parsedProfile && parsedProfile.id) {
              console.log('[AUTH_PROVIDER] Using cached profile after fetch error/timeout');
              authDebug('Using cached profile after fetch error', { profileId: parsedProfile.id });
              const combinedProfile: UserProfile = {
                id: parsedProfile.id,
                full_name: parsedProfile.full_name || user.user_metadata?.full_name || null,
                email_address: parsedProfile.email_address || user.email || null,
                onboarding_complete: parsedProfile.onboarding_complete || false,
                skipped_onboarding: parsedProfile.skipped_onboarding || false,
                profile_saved: parsedProfile.profile_saved || false,
                user_tier: parsedProfile.user_tier || 'Free',
                is_founder: parsedProfile.is_founder || false,
                is_counselor: parsedProfile.is_counselor || false,
                counselor_name: parsedProfile.counselor_name || null,
              };
              setState({ user, profile: combinedProfile, loading: false, error: null });
              return; // Successfully used cached profile
            }
          } catch (parseError) {
            console.warn('[AUTH_PROVIDER] Failed to parse cached profile:', parseError);
          }
        }
        
        // CRITICAL: Preserve the user even if profile fetch fails
        // The session is still valid, we just couldn't load the profile
        // Only clear user if session is actually invalid (handled elsewhere)
        console.log('[AUTH_PROVIDER] Preserving user but setting loading to false due to profile fetch error');
        setState(prev => ({ 
          ...prev, 
          user: user, // Preserve the user from the session
          loading: false, 
          error: error instanceof Error ? error.message : 'Failed to fetch profile' 
        }));
      }
      authDebug('Auth state set to error (user preserved)', { 
        userId: user.id,
        message: error instanceof Error ? error.message : 'unknown', 
        errorType: typeof error, 
        errorDetails: error 
      });
    } finally {
      // Always remove from in-progress set, even on error or early return
      fetchInProgressRef.current.delete(user.id);
      console.log('[AUTH_PROVIDER] Profile fetch completed (success or error), removed from in-progress');
    }
  };

  useEffect(() => {
    console.debug('[MOUNT] AuthProvider initialized');
    console.log('[AUTH_PROVIDER] Initial state:', {
      hasUser: Boolean(state.user),
      hasProfile: Boolean(state.profile),
      loading: state.loading,
      error: state.error,
      profileId: state.profile?.id
    });
    const mountedRef = { current: true };
    // Reset session processed flag on mount (new session initialization)
    sessionProcessedRef.current = { userId: null, processed: false };
    // Clear any existing fallback timeout
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    // Safety timeout: If loading takes more than 15 seconds, set loading to false
    // But preserve user if we have one (profile fetch might still be in progress)
    const loadingTimeout = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('[AUTH_PROVIDER] Loading timeout - forcing loading to false');
        setState(prev => {
          if (prev.loading) {
            return {
              ...prev,
              loading: false,
              // Only set error if we don't have a user yet
              error: prev.user ? prev.error : (prev.error || 'Auth initialization timed out')
            };
          }
          return prev;
        });
      }
    }, 15000);

    const getSession = async () => {
      console.debug('[AUTH_WIRE] getSession()');
      authDebug('Calling supabase.auth.getSession');
      
      // First check if Supabase client is properly initialized
      if (!supabase || typeof supabase.auth.getSession !== 'function') {
        console.error('[AUTH_PROVIDER] Supabase client not properly initialized');
        clearTimeout(loadingTimeout);
        if (mountedRef.current) {
          const cachedProfile = localStorage.getItem('user_profile');
          if (cachedProfile) {
            try {
              const profile = JSON.parse(cachedProfile);
              setState({
                user: null,
                profile: profile,
                loading: false,
                error: 'Supabase client not initialized'
              });
            } catch {
              setState({ user: null, profile: null, loading: false, error: 'Supabase client not initialized' });
            }
          } else {
            setState({ user: null, profile: null, loading: false, error: 'Supabase client not initialized' });
          }
        }
        return;
      }
      
      // Try to read session directly from localStorage as fallback
      let fallbackSession: any = null;
      let fallbackUser: User | null = null;
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl) {
          // Supabase stores sessions with pattern: sb-{project-ref}-auth-token
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
          const storageKey = `sb-${projectRef}-auth-token`;
          const storedSession = localStorage.getItem(storageKey);
          
          if (storedSession) {
            try {
              const parsed = JSON.parse(storedSession);
              if (parsed?.access_token && parsed?.user) {
                // Check if token is expired
                const expiresAt = parsed.expires_at * 1000; // Convert to milliseconds
                const now = Date.now();
                if (now < expiresAt) {
                  fallbackUser = parsed.user as User;
                  fallbackSession = {
                    user: parsed.user,
                    access_token: parsed.access_token,
                    refresh_token: parsed.refresh_token,
                    expires_at: parsed.expires_at
                  };
                  console.log('[AUTH_PROVIDER] Found valid session in localStorage:', {
                    userId: parsed.user?.id,
                    expiresAt: new Date(expiresAt).toISOString(),
                    expiresIn: Math.round((expiresAt - now) / 1000) + 's'
                  });
                } else {
                  console.log('[AUTH_PROVIDER] Cached session expired:', {
                    expiresAt: new Date(expiresAt).toISOString(),
                    now: new Date(now).toISOString()
                  });
                }
              }
            } catch (e) {
              console.warn('[AUTH_PROVIDER] Failed to parse stored session:', e);
            }
          } else {
            console.log('[AUTH_PROVIDER] No session found in localStorage, key:', storageKey);
          }
        }
      } catch (e) {
        console.warn('[AUTH_PROVIDER] Error reading session from localStorage:', e);
      }
      
      try {
        // Wrap getSession in a timeout - longer in production due to network latency
        // Production often has higher latency due to CDN/proxy, so use longer timeout
        const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
        const getSessionTimeout = isProduction ? 15000 : 3000; // 15s in prod, 3s in dev
        
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`getSession timeout after ${getSessionTimeout / 1000} seconds`)), getSessionTimeout);
        });
        
        let sessionResult: { data: { session: any } | null; error: any } | null = null;
        let error: Error | null = null;
        
        try {
          sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as any;
          console.log('[AUTH_PROVIDER] getSession completed successfully');
        } catch (timeoutError) {
          console.warn('[AUTH_PROVIDER] getSession timed out, using fallback if available');
          // If we have a fallback session, use it
          if (fallbackSession && fallbackUser) {
            console.log('[AUTH_PROVIDER] Using fallback session from localStorage');
            sessionResult = {
              data: { session: fallbackSession },
              error: null
            };
            error = null;
          } else {
            // Check if the original promise actually completed
            try {
              const directResult = await Promise.race([
                sessionPromise,
                new Promise(resolve => setTimeout(() => resolve(null), 100))
              ]);
              if (directResult && (directResult as any)?.data) {
                console.log('[AUTH_PROVIDER] Session promise completed after timeout race');
                sessionResult = directResult as any;
              } else {
                throw timeoutError;
              }
            } catch {
              error = timeoutError instanceof Error ? timeoutError : new Error(String(timeoutError));
              console.error('[AUTH_PROVIDER] getSession timed out and no fallback available:', error);
            }
          }
        }
        
        if (error && !fallbackSession) {
          throw error;
        }
        
        const { data: { session }, error: sessionError } = sessionResult || { data: { session: fallbackSession }, error: null };
        
        console.log('[AUTH_PROVIDER] getSession result:', {
          hasSession: Boolean(session),
          hasUser: Boolean(session?.user),
          userId: session?.user?.id,
          error: sessionError?.message,
          mounted: mountedRef.current,
          hasFallbackUser: Boolean(fallbackUser),
          hasFallbackSession: Boolean(fallbackSession)
        });
        
        // Determine the actual user to use - prefer session user, fallback to fallbackUser
        const userToUse = session?.user || fallbackUser;
        
        if (sessionError && !userToUse) {
          console.error('[AUTH_DEBUG] Error getting session:', sessionError);
          if (mountedRef.current) {
            console.log('[AUTH_PROVIDER] Setting state to error - clearing auth');
            setState({ user: null, profile: null, loading: false, error: sessionError.message });
          }
          authDebug('Auth state set to unauthenticated due to session error', { message: sessionError.message });
          clearTimeout(loadingTimeout);
          return;
        }

        if (userToUse) {
          authDebug('User found for authentication', { userId: userToUse.id, source: session?.user ? 'session' : 'fallback' });
          console.log('[AUTH_PROVIDER] Checking if profile fetch needed for user:', userToUse.id);
          
          // Skip if this session was already processed by any auth event (INITIAL_SESSION, SIGNED_IN, etc.)
          const alreadyProcessed = sessionProcessedRef.current.processed && 
                                    sessionProcessedRef.current.userId === userToUse.id;
          
          if (alreadyProcessed) {
            console.log('[AUTH_PROVIDER] Session already processed, skipping getSession fetch');
            // Still ensure state is updated with user and profile if needed
            setState(prev => {
              // Only update if user or loading state needs to change
              if (!prev.user || prev.user.id !== userToUse.id || prev.loading) {
                return {
                  user: userToUse,
                  profile: prev.profile || state.profile,
                  loading: false,
                  error: null
                };
              }
              return prev;
            });
            clearTimeout(loadingTimeout);
            return;
          }
          
          // If we have a cached profile, set it immediately while fetching
          if (state.profile && state.profile.id) {
            console.log('[AUTH_PROVIDER] Setting user immediately with cached profile');
            
            // Check if a fetch is already in progress
            const fetchInProgress = fetchInProgressRef.current.has(userToUse.id);
            
            // Always set loading to false when we have cached profile - we have data to show
            setState({
              user: userToUse,
              profile: state.profile,
              loading: false,
              error: null
            });
            
            // If fetch is already in progress from another source (e.g., SIGNED_IN event),
            // we can use cached data immediately and let the other fetch complete in background
            if (fetchInProgress) {
              console.log('[AUTH_PROVIDER] Fetch already in progress - using cached profile immediately');
              sessionProcessedRef.current = { userId: userToUse.id, processed: true };
              clearTimeout(loadingTimeout);
              return; // Don't trigger another fetch
            }
            
            // Skip background fetch when we have cached profile - Supabase is already slow
            // Background fetches can overwhelm Supabase when it's slow, causing timeouts
            // The cached profile is sufficient, and we can refresh later when Supabase recovers
            console.log('[AUTH_PROVIDER] Skipping background fetch - using cached profile to avoid overwhelming slow Supabase');
            sessionProcessedRef.current = { userId: userToUse.id, processed: true };
            clearTimeout(loadingTimeout);
            return;
          }
          
          // Fetch fresh profile (no cached profile available)
          console.log('[AUTH_PROVIDER] Fetching profile from getSession');
          sessionProcessedRef.current = { userId: userToUse.id, processed: true };
          await fetchUserProfile(userToUse, mountedRef);
          console.log('[AUTH_PROVIDER] Profile fetch completed from getSession');
          clearTimeout(loadingTimeout);
        } else {
          authDebug('No active session found');
          console.log('[AUTH_PROVIDER] No session found - setting loading to false');
          if (mountedRef.current) {
            setState({ user: null, profile: null, loading: false, error: null });
          }
          clearTimeout(loadingTimeout);
        }
      } catch (error) {
        console.error('[AUTH_PROVIDER] Error or timeout in getSession:', error);
        
        // Last resort: if we have a fallback user, use it (with or without cached profile)
        if (fallbackUser) {
          console.log('[AUTH_PROVIDER] Using fallback user after error', {
            hasCachedProfile: Boolean(state.profile),
            userId: fallbackUser.id
          });
          
          if (state.profile) {
            // Use cached profile immediately
            setState({
              user: fallbackUser,
              profile: state.profile,
              loading: false,
              error: null
            });
            sessionProcessedRef.current = { userId: fallbackUser.id, processed: true };
            clearTimeout(loadingTimeout);
          } else {
            // Fetch profile for fallback user
            console.log('[AUTH_PROVIDER] Fetching profile for fallback user');
            setState({
              user: fallbackUser,
              profile: null,
              loading: true,
              error: null
            });
            try {
              sessionProcessedRef.current = { userId: fallbackUser.id, processed: true };
              await fetchUserProfile(fallbackUser, mountedRef);
            } catch (profileError) {
              console.error('[AUTH_PROVIDER] Failed to fetch profile for fallback user:', profileError);
              // Keep the user but mark as error
              setState(prev => ({
                ...prev,
                loading: false,
                error: profileError instanceof Error ? profileError.message : 'Failed to fetch profile'
              }));
            }
          }
          clearTimeout(loadingTimeout);
          return;
        }
        
        clearTimeout(loadingTimeout);
        if (mountedRef.current) {
          // If getSession times out or fails, check if we have a cached profile
          // Wait a bit longer for INITIAL_SESSION event before giving up
          const cachedProfile = localStorage.getItem('user_profile');
          if (cachedProfile) {
            console.log('[AUTH_PROVIDER] getSession failed but cached profile exists - waiting for INITIAL_SESSION event');
            // Don't set loading to false yet - wait for INITIAL_SESSION event
            // Set a shorter timeout (2s) to wait for INITIAL_SESSION before giving up
            fallbackTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current && !sessionProcessedRef.current.processed) {
                console.log('[AUTH_PROVIDER] INITIAL_SESSION did not fire after getSession timeout - using cached profile');
                try {
                  const profile = JSON.parse(cachedProfile);
                  setState({
                    user: null,
                    profile: profile,
                    loading: false,
                    error: 'Session check timed out - using cached profile'
                  });
                  sessionProcessedRef.current = { userId: null, processed: true };
                } catch (parseError) {
                  console.error('[AUTH_PROVIDER] Failed to parse cached profile:', parseError);
                  setState({
                    user: null,
                    profile: null,
                    loading: false,
                    error: error instanceof Error ? error.message : 'Session check failed'
                  });
                  sessionProcessedRef.current = { userId: null, processed: true };
                }
                fallbackTimeoutRef.current = null;
              }
            }, 2000); // Wait 2s for INITIAL_SESSION before giving up
          } else {
            // No cached profile - set loading to false immediately
            setState(prev => ({
              ...prev,
              loading: false,
              error: error instanceof Error ? error.message : 'Unexpected error getting session'
            }));
            sessionProcessedRef.current = { userId: null, processed: true };
          }
        }
      }
    };

    getSession();

    // Set up auth state change listener BEFORE getSession completes
    // This ensures we catch INITIAL_SESSION events even if getSession hangs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.debug('[AUTH_WIRE] event', { event: _event, hasSession: !!session });
      console.debug('[AUTH_STATE_UPDATE]', { event: _event, hasSession: !!session });
      console.log('[AUTH_PROVIDER] Auth state change event:', {
        event: _event,
        hasSession: Boolean(session),
        userId: session?.user?.id,
        sessionProcessed: sessionProcessedRef.current.processed,
        processedUserId: sessionProcessedRef.current.userId,
        mounted: mountedRef.current
      });
      
      authDebug('Auth state change event received', { event: _event, hasSession: !!session, userId: session?.user?.id });
      
      if (!mountedRef.current) {
        console.log('[AUTH_PROVIDER] Component unmounted, skipping event');
        return;
      }
      
      // Handle INITIAL_SESSION event - this often fires before getSession completes
      if (_event === 'INITIAL_SESSION') {
        if (session?.user) {
          // If we haven't processed initial session yet, process it now
          if (!sessionProcessedRef.current.processed || sessionProcessedRef.current.userId !== session.user.id) {
            console.log('[AUTH_PROVIDER] Processing INITIAL_SESSION event');
            sessionProcessedRef.current = { userId: session.user.id, processed: true };
            clearTimeout(loadingTimeout);
            // Clear fallback timeout if it exists
            if (fallbackTimeoutRef.current) {
              clearTimeout(fallbackTimeoutRef.current);
              fallbackTimeoutRef.current = null;
            }
            
            // Check if we have cached profile - use it immediately
            const cachedProfile = localStorage.getItem('user_profile');
            if (cachedProfile) {
              try {
                const parsed = JSON.parse(cachedProfile);
                if (parsed && parsed.id) {
                  console.log('[AUTH_PROVIDER] Using cached profile immediately for INITIAL_SESSION');
                  setState({
                    user: session.user,
                    profile: parsed as UserProfile,
                    loading: false,
                    error: null
                  });
                  // Skip background fetch - Supabase is slow, cached profile is sufficient
                  // We can refresh later when Supabase recovers
                  console.log('[AUTH_PROVIDER] Skipping background fetch for INITIAL_SESSION - using cached profile');
                  return;
                }
              } catch (e) {
                console.warn('[AUTH_PROVIDER] Failed to parse cached profile:', e);
              }
            }
            
            // No cached profile or invalid cache - fetch fresh
            await fetchUserProfile(session.user, mountedRef);
            return;
          } else {
            console.log('[AUTH_PROVIDER] Skipping INITIAL_SESSION - already processed for this user');
            return;
          }
        } else {
          // No session in INITIAL_SESSION event
          if (!sessionProcessedRef.current.processed) {
            console.log('[AUTH_PROVIDER] INITIAL_SESSION with no session - setting loading to false');
            sessionProcessedRef.current = { userId: null, processed: true };
            clearTimeout(loadingTimeout);
            setState({ user: null, profile: null, loading: false, error: null });
            return;
          }
        }
      }
      
      // For other events (SIGNED_IN, TOKEN_REFRESHED, etc.), fetch profile
      if (session?.user) {
        // Skip if this session was already processed (e.g., by INITIAL_SESSION)
        const alreadyProcessed = sessionProcessedRef.current.processed && 
                                  sessionProcessedRef.current.userId === session.user.id;
        
        if (alreadyProcessed) {
          console.log('[AUTH_PROVIDER] Skipping', _event, 'event - session already processed');
          // Still ensure state is updated with user and profile if needed
          setState(prev => {
            if (!prev.user || prev.user.id !== session.user!.id || prev.loading) {
              return {
                user: session.user!,
                profile: prev.profile,
                loading: false,
                error: null
              };
            }
            return prev;
          });
          return;
        }
        
        // Also check if fetch is already in progress for this user
        const fetchInProgress = fetchInProgressRef.current.has(session.user.id);
        if (fetchInProgress) {
          console.log('[AUTH_PROVIDER] Skipping', _event, 'event - fetch already in progress');
          // Still ensure state is updated with user and profile if needed
          setState(prev => {
            if (!prev.user || prev.user.id !== session.user!.id || prev.loading) {
              return {
                user: session.user!,
                profile: prev.profile,
                loading: false, // Use cached data immediately
                error: null
              };
            }
            return prev;
          });
          return;
        }
        
        // Check if we have cached profile that matches this user
        const cachedProfile = localStorage.getItem('user_profile');
        if (cachedProfile) {
          try {
            const parsed = JSON.parse(cachedProfile);
            // If cached profile exists and matches user, mark as processed and skip fetch
            if (parsed && parsed.id) {
              console.log('[AUTH_PROVIDER] Using cached profile for', _event, 'event, skipping fetch');
              sessionProcessedRef.current = { userId: session.user.id, processed: true };
              // Always update state with user and cached profile, ensuring loading is false
              setState({
                user: session.user!,
                profile: parsed as UserProfile,
                loading: false,
                error: null
              });
              return;
            }
          } catch (e) {
            console.warn('[AUTH_PROVIDER] Failed to parse cached profile:', e);
          }
        }
        
        console.log('[AUTH_PROVIDER] Processing', _event, 'event for user:', session.user.id);
        sessionProcessedRef.current = { userId: session.user.id, processed: true };
        await fetchUserProfile(session.user, mountedRef);
      } else {
        console.log('[AUTH_PROVIDER] No session - clearing auth state');
        setState({ user: null, profile: null, loading: false, error: null });
        authDebug('Auth state cleared after logout or session end');
        localStorage.removeItem('user_profile');
        // Clear fetch tracking on logout
        fetchInProgressRef.current.clear();
        sessionProcessedRef.current = { userId: null, processed: false };
      }
    });

    return () => {
      console.debug('[UNMOUNT] AuthProvider cleanup');
      console.debug('[AUTH_WIRE] unsubscribe');
      clearTimeout(loadingTimeout);
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      mountedRef.current = false;
      subscription.unsubscribe();
      authDebug('Cleaned up auth listener');
    };
  }, []); // Empty deps - only run once on mount

  useEffect(() => {
    authDebug('Auth state snapshot updated', {
      loading: state.loading,
      hasUser: Boolean(state.user),
      userId: state.user?.id ?? null,
      hasProfile: Boolean(state.profile),
      profileId: state.profile?.id ?? null,
      onboardingComplete: state.profile?.onboarding_complete ?? null,
      profileSaved: state.profile?.profile_saved ?? null,
      error: state.error ?? null,
    });
  }, [state.loading, state.user?.id, state.profile?.id, state.profile?.onboarding_complete, state.profile?.profile_saved, state.error]);

  // Sync user state with authHelper for service access
  useEffect(() => {
    _setAuthUser(state.user);
  }, [state.user]);

  // Clear invalid cached profile on mount
  useEffect(() => {
    const cachedProfile = localStorage.getItem('user_profile');
    if (cachedProfile && state.user) {
      try {
        const parsed = JSON.parse(cachedProfile);
        // If cached profile ID doesn't match state, clear it
        if (parsed.id && state.profile?.id && parsed.id !== state.profile.id) {
          console.warn('Clearing mismatched cached profile');
          localStorage.removeItem('user_profile');
        }
      } catch (e) {
        console.warn('Error validating cache, clearing:', e);
        localStorage.removeItem('user_profile');
      }
    }
  }, [state.user, state.profile?.id]);

  const actions = useMemo(() => ({
    markOnboardingCompleted: async (skipped: boolean = false): Promise<boolean> => {
      if (!state.user) {
        console.error('Cannot mark onboarding completed: no user found.');
        return false;
      }

      try {
        // Check if this is the first time onboarding is being completed
        const isFirstTimeCompletion = !state.profile?.onboarding_complete;
        
        const updateData: any = { 
          onboarding_complete: true,
          skipped_onboarding: skipped
        };
        
        // Only set profile_saved = true if this is the first time completing onboarding
        if (isFirstTimeCompletion) {
          updateData.profile_saved = true;
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('user_id', state.user.id as any)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const updatedProfile = { 
            ...state.profile, 
            onboarding_complete: true,
            skipped_onboarding: skipped,
            // Only update profile_saved if it was set in the database update
            ...(isFirstTimeCompletion && { profile_saved: true })
          } as UserProfile;
          setState(prev => ({ ...prev, profile: updatedProfile }));
          localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
          
          // Track onboarding completion
          analytics.trackOnboardingEvent('completed', 1, {
            skipped: skipped,
            first_time_completion: isFirstTimeCompletion,
            user_id: state.user.id
          });
          
          // Track conversion milestone
          analytics.trackConversion('onboarding_complete', 1, {
            skipped: skipped,
            completion_method: skipped ? 'skipped' : 'completed'
          });
          
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error marking onboarding as completed:', error);
        
        // Track the error
        analytics.trackError('onboarding_completion_failed', error instanceof Error ? error.message : 'Unknown error', {
          user_id: state.user.id,
          skipped: skipped
        });
        
        return false;
      }
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Error signing out:', error);
      // The onAuthStateChange listener will handle clearing the state
    },
    refreshProfile: async (options?: { force?: boolean; invalidateCache?: boolean }) => {
      if (!state.user) {
        console.warn('Cannot refresh profile: no authenticated user found.');
        return;
      }

      const normalizedOptions = options ?? {};
      const force = normalizedOptions.force ?? true;
      const invalidateCache = normalizedOptions.invalidateCache ?? force;

      const mountedRef = { current: true };
      try {
        sessionProcessedRef.current = { userId: state.user.id, processed: true };
        await fetchUserProfile(state.user, mountedRef, { force, invalidateCache });
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      } finally {
        mountedRef.current = false;
      }
    },
    // Synchronous method to get current user without triggering re-auth
    getCurrentUser: () => {
      return state.user;
    },
    // Get session data - uses Supabase's cached session, doesn't trigger network call
    getSession: async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          return null;
        }
        return { user: session?.user || null, session };
      } catch (error) {
        console.error('[AuthContext] Failed to get session:', error);
        return null;
      }
    },
  }), [state.user?.id, state.profile?.id, state.profile?.onboarding_complete]);

  const value: AuthState = useMemo(() => ({
    ...state,
    onboardingCompleted: state.profile?.onboarding_complete ?? null,
    profileSaved: state.profile?.profile_saved ?? null,
    isFounder: state.profile?.is_founder ?? false,
    isCounselor: state.profile?.is_counselor ?? false,
    counselorName: state.profile?.counselor_name ?? null,
    ...actions,
  }), [
    state.user?.id,
    state.profile?.id,
    state.profile?.onboarding_complete,
    state.profile?.profile_saved,
    state.profile?.is_founder,
    state.profile?.is_counselor,
    state.profile?.counselor_name,
    state.loading,
    state.error,
    actions,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

