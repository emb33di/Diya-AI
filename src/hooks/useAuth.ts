import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { analytics } from '@/utils/analytics';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email_address: string | null;
  onboarding_complete: boolean;
  skipped_onboarding: boolean;
  profile_saved: boolean;
  user_tier: string | null;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const authDebug = (message: string, payload?: Record<string, unknown>) => {
  if (payload) {
    console.log(`[AUTH_DEBUG] ${message}`, payload);
  } else {
    console.log(`[AUTH_DEBUG] ${message}`);
  }
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Initialize from localStorage for faster initial load
    try {
      const cachedProfile = localStorage.getItem('user_profile');
      if (cachedProfile) {
        authDebug('Hydrating auth state from cached profile');
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

  // Function to mark onboarding as completed
  const markOnboardingCompleted = useCallback(async (skipped: boolean = false) => {
    if (!authState.user) {
      console.error('Cannot mark onboarding completed: no user found.');
      return false;
    }

    try {
      // Check if this is the first time onboarding is being completed
      const isFirstTimeCompletion = !authState.profile?.onboarding_complete;
      
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
        .eq('user_id', authState.user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const updatedProfile = { 
          ...authState.profile, 
          onboarding_complete: true,
          skipped_onboarding: skipped,
          // Only update profile_saved if it was set in the database update
          ...(isFirstTimeCompletion && { profile_saved: true })
        } as UserProfile;
        setAuthState(prev => ({ ...prev, profile: updatedProfile }));
        localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
        
        // Track onboarding completion
        analytics.trackOnboardingEvent('completed', 1, {
          skipped: skipped,
          first_time_completion: isFirstTimeCompletion,
          user_id: authState.user.id
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
        user_id: authState.user.id,
        skipped: skipped
      });
      
      return false;
    }
  }, [authState.user, authState.profile]);

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async (user: User) => {
      authDebug('Fetching user profile start', { userId: user.id });
      try {
        // Fetch profile from user_profiles table only
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('id, full_name, email_address, onboarding_complete, skipped_onboarding, profile_saved, user_tier')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          authDebug('Error code returned from profile fetch', { code: error.code, message: error.message });
          throw error;
        }

        let finalProfile = profile;

        // If no profile exists, create one
        if (!finalProfile) {
          authDebug('No profile found, creating new profile', { userId: user.id });
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              full_name: user.user_metadata?.full_name || `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || null,
              email_address: user.email,
              onboarding_complete: false,
              skipped_onboarding: false,
              profile_saved: false,
            })
            .select('id, full_name, email_address, onboarding_complete, skipped_onboarding, profile_saved, user_tier')
            .single();

          if (createError) throw createError;
          finalProfile = newProfile;
        }

        if (!finalProfile) {
            authDebug('Profile fetch returned null after creation attempt', { userId: user.id });
            throw new Error('Failed to create or fetch user profile.');
        }

        const combinedProfile: UserProfile = {
          id: finalProfile.id,
          full_name: finalProfile.full_name || user.user_metadata?.full_name || null,
          email_address: finalProfile.email_address || user.email || null,
          onboarding_complete: finalProfile.onboarding_complete || false,
          skipped_onboarding: finalProfile.skipped_onboarding || false,
          profile_saved: finalProfile.profile_saved || false,
          user_tier: finalProfile.user_tier || 'Free',
        };

        if (isMounted) {
          setAuthState({ user, profile: combinedProfile, loading: false, error: null });
          authDebug('Auth state updated with user profile', { userId: user.id, onboardingComplete: combinedProfile.onboarding_complete });
          // Cache the profile for faster loads and offline resilience
          localStorage.setItem('user_profile', JSON.stringify(combinedProfile));
        }
      } catch (error) {
        console.error('[AUTH_DEBUG] Error fetching user profile:', error);
        if (isMounted) {
          setAuthState(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Failed to fetch profile' }));
          authDebug('Auth state set to error', { message: error instanceof Error ? error.message : 'unknown' });
        }
      }
    };

    const getSession = async () => {
      authDebug('Calling supabase.auth.getSession');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[AUTH_DEBUG] Error getting session:', error);
        if (isMounted) setAuthState({ user: null, profile: null, loading: false, error: error.message });
        authDebug('Auth state set to unauthenticated due to session error', { message: error.message });
        return;
      }

      if (session?.user) {
        authDebug('Session found for user', { userId: session.user.id });
        await fetchUserProfile(session.user);
      } else {
        authDebug('No active session found');
        if (isMounted) setAuthState({ user: null, profile: null, loading: false, error: null });
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authDebug('Auth state change event received', { event: _event, hasSession: !!session, userId: session?.user?.id });
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        if (isMounted) {
          setAuthState({ user: null, profile: null, loading: false, error: null });
          authDebug('Auth state cleared after logout or session end');
          localStorage.removeItem('user_profile');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      authDebug('Cleaned up auth listener');
    };
  }, []);

  useEffect(() => {
    authDebug('Auth state snapshot updated', {
      loading: authState.loading,
      hasUser: Boolean(authState.user),
      userId: authState.user?.id ?? null,
      hasProfile: Boolean(authState.profile),
      profileId: authState.profile?.id ?? null,
      onboardingComplete: authState.profile?.onboarding_complete ?? null,
      profileSaved: authState.profile?.profile_saved ?? null,
      error: authState.error ?? null,
    });
  }, [authState.loading, authState.user?.id, authState.profile?.id, authState.profile?.onboarding_complete, authState.profile?.profile_saved, authState.error]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
    // The onAuthStateChange listener will handle clearing the state
  };

  return {
    ...authState,
    onboardingCompleted: authState.profile?.onboarding_complete ?? null,
    profileSaved: authState.profile?.profile_saved ?? null,
    markOnboardingCompleted,
    signOut,
  };
};
