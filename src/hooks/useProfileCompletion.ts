import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProfileCompletionData {
  completionPercentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
}

// Define all the fields that should be completed for a full profile
const PROFILE_FIELDS = [
  // Personal Information (6 required fields)
  { key: 'full_name', category: 'Personal Information', weight: 1 },
  { key: 'email_address', category: 'Personal Information', weight: 1 },
  { key: 'country_code', category: 'Personal Information', weight: 1 },
  { key: 'phone_number', category: 'Personal Information', weight: 1 },
  { key: 'applying_to', category: 'Personal Information', weight: 1 },
  
  // Optional fields (not counted in completion)
  { key: 'masters_field_of_focus', category: 'Personal Information', weight: 0 },
  
  // Academic Profile (core required fields)
  { key: 'high_school_name', category: 'Academic Profile', weight: 1 },
  { key: 'high_school_graduation_year', category: 'Academic Profile', weight: 1 },
  { key: 'intended_majors', category: 'Personal Information', weight: 1 },
  
  // Optional academic fields
  { key: 'school_board', category: 'Academic Profile', weight: 0 },
  { key: 'class_10_score', category: 'Academic Profile', weight: 0 },
  { key: 'class_11_score', category: 'Academic Profile', weight: 0 },
  { key: 'class_12_half_yearly_score', category: 'Academic Profile', weight: 0 },
  { key: 'undergraduate_cgpa', category: 'Academic Profile', weight: 0 },
  { key: 'college_name', category: 'Academic Profile', weight: 0 },
  { key: 'college_graduation_year', category: 'Academic Profile', weight: 0 },
  { key: 'college_gpa', category: 'Academic Profile', weight: 0 },
  { key: 'test_type', category: 'Academic Profile', weight: 0 },
  { key: 'test_score', category: 'Academic Profile', weight: 0 },
  
  // College Preferences (optional for basic completion)
  { key: 'ideal_college_size', category: 'College Preferences', weight: 0 },
  { key: 'ideal_college_setting', category: 'College Preferences', weight: 0 },
  { key: 'must_haves', category: 'College Preferences', weight: 0 },
  { key: 'deal_breakers', category: 'College Preferences', weight: 0 },
  
  // Financial Information (optional for basic completion)
  { key: 'college_budget', category: 'Financial Information', weight: 0 },
  { key: 'financial_aid_importance', category: 'Financial Information', weight: 0 },
  { key: 'scholarship_interests', category: 'Financial Information', weight: 0 },
];

// Additional fields that count towards completion (test scores, etc.)
const ADDITIONAL_FIELDS = [
  { key: 'has_sat_scores', category: 'Test Scores', weight: 0 },
  { key: 'has_act_scores', category: 'Test Scores', weight: 0 },
  { key: 'has_geographic_preferences', category: 'College Preferences', weight: 0 },
];

export const useProfileCompletion = () => {
  const { user } = useAuth();
  const [completionData, setCompletionData] = useState<ProfileCompletionData>({
    completionPercentage: 0,
    completedFields: 0,
    totalFields: 0,
    missingFields: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateCompletion = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use user from auth context instead of calling getUser()
      if (!user) {
        setCompletionData({
          completionPercentage: 0,
          completedFields: 0,
          totalFields: PROFILE_FIELDS.length + ADDITIONAL_FIELDS.length,
          missingFields: PROFILE_FIELDS.map(f => f.key),
        });
        setLoading(false);
        return;
      }

      // Load all data in parallel
      // Removed timeout wrapper - let queries complete naturally and handle errors properly
      const [profileResult, satScoresResult, actScoresResult, geographicPreferencesResult] = await Promise.allSettled([
        supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id as any)
          .maybeSingle(),
        supabase.from('sat_scores').select('id').eq('user_id', user.id as any),
        supabase.from('act_scores').select('id').eq('user_id', user.id as any),
        supabase.from('geographic_preferences').select('id').eq('user_id', user.id as any)
      ]);

      // Handle profile data
      let profile = null;
      if (profileResult.status === 'fulfilled') {
        const result = profileResult.value as any;
        const { data, error } = result;
        if (error && error.code !== 'PGRST116') {
          console.warn('Error loading profile:', error);
        } else {
          profile = data;
        }
      }

      // Handle test scores data
      const hasSatScores = satScoresResult.status === 'fulfilled' && ((satScoresResult.value as any)?.data?.length || 0) > 0;
      const hasActScores = actScoresResult.status === 'fulfilled' && ((actScoresResult.value as any)?.data?.length || 0) > 0;
      const hasGeographicPreferences = geographicPreferencesResult.status === 'fulfilled' && ((geographicPreferencesResult.value as any)?.data?.length || 0) > 0;

      // Calculate completion for main profile fields
      let completedFields = 0;
      let totalWeight = 0;
      const missingFields: string[] = [];

      // Get the application type to determine which fields are relevant
      const applyingTo = profile?.applying_to;
      
      console.log("Profile data for completion calculation:", profile);
      
      PROFILE_FIELDS.forEach(field => {
        // Skip fields that aren't relevant to the user's application type
        if (applyingTo === "undergraduate") {
          // For undergraduate, skip graduate-specific fields
          if (['masters_field_of_focus', 'college_name', 'college_graduation_year', 'college_gpa', 'test_type', 'test_score'].includes(field.key)) {
            return;
          }
        } else if (['mba', 'masters', 'phd', 'llm'].includes(applyingTo)) {
          // For graduate, skip undergraduate-specific fields
          if (['high_school_name', 'high_school_graduation_year', 'school_board', 'class_10_score', 'class_11_score', 'class_12_half_yearly_score', 'undergraduate_cgpa', 'intended_majors'].includes(field.key)) {
            return;
          }
        }
        
        // Only count fields with weight > 0 towards completion
        if (field.weight > 0) {
          totalWeight += field.weight;
          const value = profile?.[field.key as keyof typeof profile];
          
          // Check if field has a meaningful value
          const isCompleted = value !== null && value !== undefined && value !== '' && 
            (Array.isArray(value) ? value.length > 0 : true);
          
          if (isCompleted) {
            completedFields += field.weight;
          } else {
            missingFields.push(field.key);
          }
        }
      });

      // Add completion for additional fields (only for undergraduate applicants)
      if (applyingTo === "undergraduate") {
        ADDITIONAL_FIELDS.forEach(field => {
          totalWeight += field.weight;
          let isCompleted = false;
          
          switch (field.key) {
            case 'has_sat_scores':
              isCompleted = hasSatScores;
              break;
            case 'has_act_scores':
              isCompleted = hasActScores;
              break;
            case 'has_geographic_preferences':
              isCompleted = hasGeographicPreferences;
              break;
          }
          
          if (isCompleted) {
            completedFields += field.weight;
          } else {
            missingFields.push(field.key);
          }
        });
      }

      const completionPercentage = Math.round((completedFields / totalWeight) * 100);

      console.log("Profile completion calculation:", {
        completedFields,
        totalWeight,
        completionPercentage,
        missingFields,
        applyingTo
      });

      setCompletionData({
        completionPercentage,
        completedFields: Math.round(completedFields),
        totalFields: Math.round(totalWeight),
        missingFields,
      });

    } catch (err) {
      console.error('Error calculating profile completion:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate profile completion');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const runCalculation = async () => {
      await calculateCompletion();
    };

    // Only run calculation if user is available
    if (user) {
      runCalculation();
    } else {
      setLoading(false);
    }

    // Listen for profile updates to refresh completion data
    const handleProfileUpdate = () => {
      if (isMounted && user) {
        runCalculation();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user, calculateCompletion]);

  return {
    ...completionData,
    loading,
    error,
    refetch: calculateCompletion,
  };
};
