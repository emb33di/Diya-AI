import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useOnboardingStatus = () => {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(() => {
    // Initialize from localStorage if available
    const cached = localStorage.getItem('onboarding_completed');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  const checkOnboardingStatus = async () => {
    try {
      // Helper function to create timeout promise
      const createTimeoutPromise = (timeoutMs: number) => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        );

      // Get user with timeout
      const userResult = await Promise.race([
        supabase.auth.getUser(),
        createTimeoutPromise(15000) // 15 second timeout
      ]) as Awaited<ReturnType<typeof supabase.auth.getUser>>;
      
      const { data: { user } } = userResult;
      if (!user) {
        setOnboardingCompleted(null);
        setLoading(false);
        return;
      }

      // Get profile with timeout
      const profileResult = await Promise.race([
        supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('user_id', user.id)
          .maybeSingle(),
        createTimeoutPromise(15000) // 15 second timeout
      ]);

      const { data: profile, error } = profileResult as any;
      if (error) {
        console.error('Error fetching onboarding status:', error);
        // On error, keep the cached value if available, otherwise default to false
        const cached = localStorage.getItem('onboarding_completed');
        if (cached) {
          const cachedValue = JSON.parse(cached);
          setOnboardingCompleted(cachedValue);
          console.log('Using cached onboarding status due to error:', cachedValue);
        } else {
          setOnboardingCompleted(false);
        }
      } else {
        const status = profile?.onboarding_complete || false;
        setOnboardingCompleted(status);
        // Cache the result for offline resilience
        localStorage.setItem('onboarding_completed', JSON.stringify(status));
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // On connection error, keep the cached value if available, otherwise default to false
      const cached = localStorage.getItem('onboarding_completed');
      if (cached) {
        const cachedValue = JSON.parse(cached);
        setOnboardingCompleted(cachedValue);
        console.log('Using cached onboarding status due to connection error:', cachedValue);
      } else {
        setOnboardingCompleted(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const markOnboardingCompleted = async () => {
    try {
      // Helper function to create timeout promise
      const createTimeoutPromise = (timeoutMs: number) => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        );

      // Get user with timeout
      const userResult = await Promise.race([
        supabase.auth.getUser(),
        createTimeoutPromise(15000) // 15 second timeout
      ]) as Awaited<ReturnType<typeof supabase.auth.getUser>>;
      
      const { data: { user } } = userResult;
      if (!user) return false;

      // Update profile with timeout
      const updateResult = await Promise.race([
        supabase
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('user_id', user.id),
        createTimeoutPromise(15000) // 15 second timeout
      ]);

      const { error } = updateResult as any;
      if (error) {
        console.error('Error marking onboarding as completed:', error);
        return false;
      }

      setOnboardingCompleted(true);
      // Cache the completion status
      localStorage.setItem('onboarding_completed', JSON.stringify(true));
      return true;
    } catch (error) {
      console.error('Error marking onboarding as completed:', error);
      return false;
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  return {
    onboardingCompleted,
    loading,
    checkOnboardingStatus,
    markOnboardingCompleted
  };
}; 