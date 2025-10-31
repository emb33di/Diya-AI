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
  is_founder?: boolean;
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
      try {
        // Fetch profile from user_profiles table only
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('id, full_name, email_address, onboarding_complete, skipped_onboarding, profile_saved, user_tier, is_founder')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        let finalProfile = profile;

        // If no profile exists, create one
        if (!finalProfile) {
          console.log('No profile found, creating one for user:', user.id);
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
            .select('id, full_name, email_address, onboarding_complete, skipped_onboarding, profile_saved, user_tier, is_founder')
            .single();

          if (createError) throw createError;
          finalProfile = newProfile;
        }

        if (!finalProfile) {
            throw new Error('Failed to create or fetch user profile.');
        }

        // Type assertion needed due to Supabase type inference limitations
        const profileData = finalProfile as any;
        const combinedProfile: UserProfile = {
          id: profileData.id,
          full_name: profileData.full_name || user.user_metadata?.full_name || null,
          email_address: profileData.email_address || user.email || null,
          onboarding_complete: profileData.onboarding_complete || false,
          skipped_onboarding: profileData.skipped_onboarding || false,
          profile_saved: profileData.profile_saved || false,
          user_tier: profileData.user_tier || 'Free',
          is_founder: profileData.is_founder || false,
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
    profileSaved: authState.profile?.profile_saved ?? null,
    isFounder: authState.profile?.is_founder ?? false,
    markOnboardingCompleted,
    signOut,
  };
};
