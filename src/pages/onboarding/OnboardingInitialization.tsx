import { useEffect, useCallback } from 'react';
import { OnboardingApiService } from '@/services/onboarding.api';

interface OnboardingInitializationProps {
  // State setters
  setStudentName: (name: string) => void;
  setLoading: (loading: boolean) => void;
  setCumulativeSessionTime: (time: number) => void;
  setRemainingTime: (time: number) => void;
  setCurrentSessionNumber: (session: number) => void;
}

export const useOnboardingInitialization = ({
  setStudentName,
  setLoading,
  setCumulativeSessionTime,
  setRemainingTime,
  setCurrentSessionNumber
}: OnboardingInitializationProps) => {

  // Function to get previous session context
  const getPreviousSessionContext = useCallback(async () => {
    try {
      const response = await OnboardingApiService.getPreviousSessionContext();
      if (response.success && response.data) {
        console.log('✅ Found previous metadata:', response.data.length, 'conversations');
        if (response.data.length > 0) {
          console.log('📋 Metadata sample:', response.data[0]);
        }
        return response.data;
      } else {
        console.log('ℹ️ No previous metadata found');
        return null;
      }
    } catch (error) {
      console.error('Error getting previous session context:', error);
      return null;
    }
  }, []);

  // Fetch user's profile to get their name and initialize Outspeed API
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await OnboardingApiService.fetchUserProfile();
        if (response.success && response.data) {
          const profile = response.data;
          if (profile.full_name) {
            // Extract first name from full name
            const firstName = profile.full_name.split(' ')[0];
            setStudentName(firstName);
          }

          // Load previous cumulative session time
          const previousTime = profile.cumulative_onboarding_time || 0;
          setCumulativeSessionTime(previousTime);

          // Adjust remaining time based on cumulative time
          const totalSecondsNeeded = 10 * 60; // 10 minutes
          let remainingSeconds = Math.max(0, totalSecondsNeeded - previousTime);
          
          // Check localStorage for more recent data (fallback and override)
          try {
            const storedRemainingTime = localStorage.getItem('onboarding_remaining_time');
            if (storedRemainingTime) {
              const localRemainingTime = parseInt(storedRemainingTime);
              const localCumulativeTime = totalSecondsNeeded - localRemainingTime;
              
              // Use localStorage data if it's more recent (higher cumulative time)
              if (localCumulativeTime > previousTime) {
                setCumulativeSessionTime(localCumulativeTime);
                setRemainingTime(localRemainingTime);
                console.log('✅ Loaded from localStorage (more recent):', {
                  cumulativeTime: localCumulativeTime,
                  remainingTime: localRemainingTime,
                  dbTime: previousTime
                });
              } else {
                setRemainingTime(remainingSeconds);
                console.log('✅ Loaded from database:', {
                  cumulativeTime: previousTime,
                  remainingTime: remainingSeconds,
                  totalNeeded: totalSecondsNeeded
                });
                // Clear localStorage if database has more recent data
                localStorage.removeItem('onboarding_remaining_time');
              }
            } else {
              setRemainingTime(remainingSeconds);
              console.log('✅ Loaded from database (no localStorage):', {
                cumulativeTime: previousTime,
                remainingTime: remainingSeconds,
                totalNeeded: totalSecondsNeeded
              });
            }
          } catch (error) {
            console.warn('Error loading from localStorage:', error);
            setRemainingTime(remainingSeconds);
            console.log('✅ Loaded from database (localStorage error):', {
              cumulativeTime: previousTime,
              remainingTime: remainingSeconds,
              totalNeeded: totalSecondsNeeded
            });
          }

          // Check for existing paused conversations
          const pausedResponse = await OnboardingApiService.getPausedConversations();
          if (pausedResponse.success && pausedResponse.data && pausedResponse.data.length > 0) {
            // Find the highest session number
            const sessionNumbers = pausedResponse.data.map(conv => {
              const match = conv.conversation_type?.match(/onboarding_(\d+)/);
              return match ? parseInt(match[1]) : 0;
            }).filter(num => num > 0);
            if (sessionNumbers.length > 0) {
              const maxSession = Math.max(...sessionNumbers);
              setCurrentSessionNumber(maxSession + 1);
              console.log(`Found ${pausedResponse.data.length} paused conversations, next session will be: ${maxSession + 1}`);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };
    // Invoke on mount
    fetchUserProfile();
  }, [setStudentName, setLoading, setCumulativeSessionTime, setRemainingTime, setCurrentSessionNumber]);

  return {
    getPreviousSessionContext
  };
};
