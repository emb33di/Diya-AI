import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  email_address: string | null;
  onboarding_complete: boolean;
  applying_to: string | null;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Initialize from localStorage for faster initial load
    try {
      const cachedProfile = localStorage.getItem('user_profile');
      if (cachedProfile) {
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
    return {
      user: null,
      profile: null,
      loading: true,
      error: null,
    };
  });

  // Function to mark onboarding as completed
  const markOnboardingCompleted = useCallback(async () => {
    if (!authState.user) {
      console.error('Cannot mark onboarding completed: no user found.');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('user_id', authState.user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const updatedProfile = { ...authState.profile, onboarding_complete: true } as UserProfile;
        setAuthState(prev => ({ ...prev, profile: updatedProfile }));
        localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking onboarding as completed:', error);
      return false;
    }
  }, [authState.user, authState.profile]);

  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async (user: User) => {
      try {
        // Query only the profiles table - much more efficient!
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name, onboarding_complete, applying_to')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        // If no profile exists, create one
        if (!profile) {
          console.log('No profile found, creating one for user:', user.id);
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              full_name: user.user_metadata?.full_name || `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || null,
              onboarding_complete: false,
              applying_to: user.user_metadata?.applying_to || null,
            })
            .select('id, full_name, onboarding_complete, applying_to')
            .single();

          if (createError) throw createError;
          profile = newProfile;
        }

        const combinedProfile: UserProfile = {
          id: profile.id,
          full_name: profile.full_name || user.user_metadata?.full_name || null,
          preferred_name: null, // This field is not in profiles table, keeping null for now
          email_address: user.email || null,
          onboarding_complete: profile.onboarding_complete || false,
          applying_to: profile.applying_to || null,
        };

        if (isMounted) {
          setAuthState({ user, profile: combinedProfile, loading: false, error: null });
          // Cache the profile for faster loads and offline resilience
          localStorage.setItem('user_profile', JSON.stringify(combinedProfile));
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        if (isMounted) {
          setAuthState(prev => ({ ...prev, loading: false, error: error instanceof Error ? error.message : 'Failed to fetch profile' }));
        }
      }
    };

    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        if (isMounted) setAuthState({ user: null, profile: null, loading: false, error: error.message });
        return;
      }

      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        if (isMounted) setAuthState({ user: null, profile: null, loading: false, error: null });
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        if (isMounted) {
          setAuthState({ user: null, profile: null, loading: false, error: null });
          localStorage.removeItem('user_profile');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
    // The onAuthStateChange listener will handle clearing the state
  };

  return {
    ...authState,
    onboardingCompleted: authState.profile?.onboarding_complete ?? null,
    markOnboardingCompleted,
    signOut,
  };
};
