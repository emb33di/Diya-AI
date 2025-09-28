import { User } from '@supabase/supabase-js';

export interface UserProfile {
  full_name?: string | null;
}

/**
 * Centralized utility for getting user display names with consistent fallback logic
 * Priority order: full_name -> user_metadata.full_name -> email username -> 'Student'
 */
export const getUserDisplayName = (
  profile: UserProfile | null | undefined,
  user: User | null | undefined,
  fallback: string = 'Student'
): string => {
  // Priority 1: Full name from profile
  if (profile?.full_name && profile.full_name.trim()) {
    return profile.full_name.trim();
  }

  // Priority 2: Full name from user metadata (signup data)
  if (user?.user_metadata?.full_name && user.user_metadata.full_name.trim()) {
    return user.user_metadata.full_name.trim();
  }

  // Priority 3: Email username
  if (user?.email) {
    const emailUsername = user.email.split('@')[0];
    return emailUsername || fallback;
  }

  // Priority 4: Fallback
  return fallback;
};

/**
 * Get user's first name with consistent fallback logic
 */
export const getUserFirstName = (
  profile: UserProfile | null | undefined,
  user: User | null | undefined,
  fallback: string = 'Student'
): string => {
  const fullName = getUserDisplayName(profile, user, fallback);
  
  // If it's an email username, return as is
  if (user?.email && fullName === user.email.split('@')[0]) {
    return fullName;
  }
  
  // Otherwise, extract first name
  return fullName.split(' ')[0] || fallback;
};

/**
 * Fetch user profile data with consistent logic and timeouts
 */
export const fetchUserProfileData = async (userId: string): Promise<UserProfile | null> => {
  try {
    // Make database call to user_profiles table
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.warn('Error fetching profile:', error);
      return null;
    }

    return {
      full_name: data?.full_name || null,
    };
  } catch (error) {
    console.error('Error fetching user profile data:', error);
    return null;
  }
};
