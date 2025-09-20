import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized utility for Supabase data fetching with timeout handling
 */

// Helper function to create timeout promise
const createTimeoutPromise = (timeoutMs: number) => 
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  );

/**
 * Fetch data from Supabase with timeout and error handling
 */
export const fetchWithTimeout = async <T>(
  query: Promise<{ data: T | null; error: any }>,
  timeoutMs: number = 8000,
  errorMessage: string = 'Failed to fetch data'
): Promise<{ data: T | null; error: string | null }> => {
  try {
    const result = await Promise.race([
      query,
      createTimeoutPromise(timeoutMs)
    ]);
    
    if (result.error) {
      console.error('Supabase query error:', result.error);
      return { data: null, error: result.error.message || errorMessage };
    }
    
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Fetch timeout or error:', error);
    if (error instanceof Error && error.message === 'Request timeout') {
      return { data: null, error: 'Request timeout - please try again' };
    }
    return { data: null, error: errorMessage };
  }
};

/**
 * Fetch school recommendations with timeout
 */
export const fetchSchoolRecommendations = async (userId: string) => {
  return fetchWithTimeout(
    supabase
      .from('school_recommendations')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false }),
    8000,
    'Failed to load school recommendations'
  );
};


/**
 * Fetch conversation metadata with timeout
 */
export const fetchConversationMetadata = async (userId: string) => {
  return fetchWithTimeout(
    supabase
      .from('conversation_metadata')
      .select('transcript')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),
    5000,
    'Failed to load conversation metadata'
  );
};

/**
 * Fetch user profile data with timeout (already exists in userNameUtils, but adding here for consistency)
 */
export const fetchUserProfileWithTimeout = async (userId: string) => {
  return fetchWithTimeout(
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    5000,
    'Failed to load user profile'
  );
};

/**
 * Fetch basic profile data with timeout
 */
export const fetchBasicProfileWithTimeout = async (userId: string) => {
  return fetchWithTimeout(
    supabase
      .from('profiles')
      .select('full_name, onboarding_complete')
      .eq('user_id', userId)
      .maybeSingle(),
    5000,
    'Failed to load basic profile'
  );
};

/**
 * Fetch test scores with timeout
 */
export const fetchTestScoresWithTimeout = async (userId: string) => {
  const [satResult, actResult, apIbResult] = await Promise.allSettled([
    fetchWithTimeout(
      supabase.from('sat_scores').select('id').eq('user_id', userId),
      3000,
      'Failed to load SAT scores'
    ),
    fetchWithTimeout(
      supabase.from('act_scores').select('id').eq('user_id', userId),
      3000,
      'Failed to load ACT scores'
    ),
    fetchWithTimeout(
      supabase.from('ap_ib_exams').select('id').eq('user_id', userId),
      3000,
      'Failed to load AP/IB scores'
    )
  ]);

  return {
    hasSatScores: satResult.status === 'fulfilled' && (satResult.value.data?.length || 0) > 0,
    hasActScores: actResult.status === 'fulfilled' && (actResult.value.data?.length || 0) > 0,
    hasApIbExams: apIbResult.status === 'fulfilled' && (apIbResult.value.data?.length || 0) > 0,
  };
};

/**
 * Fetch paused conversations with timeout
 */
export const fetchPausedConversations = async (userId: string) => {
  return fetchWithTimeout(
    supabase
      .from('conversation_metadata')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'paused')
      .order('created_at', { ascending: false }),
    5000,
    'Failed to load paused conversations'
  );
};

/**
 * Generic retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
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
      console.warn(`Data fetch failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};
