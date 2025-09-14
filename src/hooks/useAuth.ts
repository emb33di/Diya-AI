import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  email_address: string | null;
  onboarding_complete: boolean | null;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    
    // Helper function to create timeout promise
    const createTimeoutPromise = (timeoutMs: number) => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      );

    // Helper function for retry with exponential backoff
    const retryWithBackoff = async <T>(
      operation: () => Promise<T>,
      maxRetries: number = 3,
      baseDelay: number = 1000
    ): Promise<T> => {
      let lastError: Error;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          
          // Don't retry on certain errors
          if (error instanceof Error && (
            error.message.includes('Invalid login credentials') ||
            error.message.includes('User not found') ||
            error.message.includes('Email not confirmed')
          )) {
            throw error;
          }
          
          // Don't retry on the last attempt
          if (attempt === maxRetries) {
            throw lastError;
          }
          
          // Calculate delay with exponential backoff
          const delay = baseDelay * Math.pow(2, attempt);
          console.warn(`Auth request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError!;
    };

    // Fetch user profile from database with timeout and parallel requests
    const fetchUserProfile = async (user: User) => {
      try {
        // Create timeout promise for the entire operation
        const timeoutPromise = createTimeoutPromise(8000); // 8 second timeout

        // Make both database calls in parallel for better performance
        const [basicProfileResult, detailedProfileResult] = await Promise.allSettled([
          Promise.race([
            supabase
              .from('profiles')
              .select('id, full_name, onboarding_complete')
              .eq('user_id', user.id)
              .single(),
            createTimeoutPromise(5000) // 5 second timeout per request
          ]),
          Promise.race([
            supabase
              .from('user_profiles')
              .select('preferred_name, email_address')
              .eq('user_id', user.id)
              .single(),
            createTimeoutPromise(5000) // 5 second timeout per request
          ])
        ]);

        // Handle basic profile result
        let basicProfile = null;
        if (basicProfileResult.status === 'fulfilled') {
          const { data, error } = basicProfileResult.value;
          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
          }
          basicProfile = data;
        }

        // Handle detailed profile result
        let detailedProfile = null;
        if (detailedProfileResult.status === 'fulfilled') {
          const { data, error } = detailedProfileResult.value;
          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.warn('Failed to fetch detailed profile:', error);
          } else {
            detailedProfile = data;
          }
        }

        // Combine the data from both tables with proper fallback logic
        const combinedProfile = {
          id: basicProfile?.id || user.id,
          // Prioritize user_profiles.full_name over profiles.full_name, then fall back to user metadata
          full_name: detailedProfile?.full_name || basicProfile?.full_name || user.user_metadata?.full_name || null,
          preferred_name: detailedProfile?.preferred_name || null,
          email_address: detailedProfile?.email_address || user.email || null,
          onboarding_complete: basicProfile?.onboarding_complete || false,
        };

        // Debug logging to help troubleshoot name display issues
        console.log('Profile data sources:', {
          basicProfile: basicProfile?.full_name,
          detailedProfile: detailedProfile?.full_name,
          userMetadata: user.user_metadata?.full_name,
          finalFullName: combinedProfile.full_name,
          finalPreferredName: combinedProfile.preferred_name,
          userEmail: user.email
        });

        if (isMounted) {
          setAuthState({
            user,
            profile: combinedProfile,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        if (isMounted) {
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch profile',
          }));
        }
      }
    };

    // Get initial session with timeout and retry
    const getInitialSession = async () => {
      try {
        const sessionResult = await retryWithBackoff(async () => {
          return await Promise.race([
            supabase.auth.getSession(),
            createTimeoutPromise(10000) // 10 second timeout for initial session
          ]);
        });
        
        const { data: { session }, error } = sessionResult;
        if (error) throw error;

        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          if (isMounted) {
            setAuthState({
              user: null,
              profile: null,
              loading: false,
              error: null,
            });
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (isMounted) {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          if (isMounted) {
            setAuthState({
              user: null,
              profile: null,
              loading: false,
              error: null,
            });
          }
        }
      }
    );

    getInitialSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to sign out',
      }));
    }
  };

  return {
    ...authState,
    signOut,
  };
};
