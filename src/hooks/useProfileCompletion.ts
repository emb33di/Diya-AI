import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfileCompletionData {
  completionPercentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
}

// Define all the fields that should be completed for a full profile
const PROFILE_FIELDS = [
  // Personal Information (10 fields)
  { key: 'full_name', category: 'Personal Information', weight: 1 },
  { key: 'preferred_name', category: 'Personal Information', weight: 1 },
  { key: 'date_of_birth', category: 'Personal Information', weight: 1 },
  { key: 'email_address', category: 'Personal Information', weight: 1 },
  { key: 'phone_number', category: 'Personal Information', weight: 1 },
  { key: 'street_address', category: 'Personal Information', weight: 1 },
  { key: 'city', category: 'Personal Information', weight: 1 },
  { key: 'state', category: 'Personal Information', weight: 1 },
  { key: 'zip_code', category: 'Personal Information', weight: 1 },
  { key: 'citizenship_status', category: 'Personal Information', weight: 1 },
  { key: 'ethnicity', category: 'Personal Information', weight: 1 },
  
  // Academic Profile (8 fields)
  { key: 'high_school_name', category: 'Academic Profile', weight: 1 },
  { key: 'high_school_graduation_year', category: 'Academic Profile', weight: 1 },
  { key: 'gpa_unweighted', category: 'Academic Profile', weight: 1 },
  { key: 'gpa_weighted', category: 'Academic Profile', weight: 1 },
  { key: 'class_rank', category: 'Academic Profile', weight: 1 },
  { key: 'intended_majors', category: 'Academic Profile', weight: 1 },
  { key: 'secondary_major_minor_interests', category: 'Academic Profile', weight: 1 },
  { key: 'career_interests', category: 'Academic Profile', weight: 1 },
  
  // College Preferences (5 fields)
  { key: 'ideal_college_size', category: 'College Preferences', weight: 1 },
  { key: 'ideal_college_setting', category: 'College Preferences', weight: 1 },
  { key: 'geographic_preference', category: 'College Preferences', weight: 1 },
  { key: 'must_haves', category: 'College Preferences', weight: 1 },
  { key: 'deal_breakers', category: 'College Preferences', weight: 1 },
  
  // Financial Information (3 fields)
  { key: 'college_budget', category: 'Financial Information', weight: 1 },
  { key: 'financial_aid_importance', category: 'Financial Information', weight: 1 },
  { key: 'scholarship_interests', category: 'Financial Information', weight: 1 },
];

// Additional fields that count towards completion (test scores, etc.)
const ADDITIONAL_FIELDS = [
  { key: 'has_sat_scores', category: 'Test Scores', weight: 0.5 },
  { key: 'has_act_scores', category: 'Test Scores', weight: 0.5 },
  { key: 'has_ap_ib_exams', category: 'Test Scores', weight: 0.5 },
];

export const useProfileCompletion = () => {
  const [completionData, setCompletionData] = useState<ProfileCompletionData>({
    completionPercentage: 0,
    completedFields: 0,
    totalFields: 0,
    missingFields: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateCompletion = async () => {
    try {
      setLoading(true);
      setError(null);

      // Helper function to create timeout promise
      const createTimeoutPromise = (timeoutMs: number) => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCompletionData({
          completionPercentage: 0,
          completedFields: 0,
          totalFields: PROFILE_FIELDS.length + ADDITIONAL_FIELDS.length,
          missingFields: PROFILE_FIELDS.map(f => f.key),
        });
        return;
      }

      // Load all data in parallel with timeouts
      const [profileResult, satScoresResult, actScoresResult, apIbExamsResult] = await Promise.allSettled([
        Promise.race([
          supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single(),
          createTimeoutPromise(5000)
        ]),
        Promise.race([
          supabase.from('sat_scores').select('id').eq('user_id', user.id),
          createTimeoutPromise(3000)
        ]),
        Promise.race([
          supabase.from('act_scores').select('id').eq('user_id', user.id),
          createTimeoutPromise(3000)
        ]),
        Promise.race([
          supabase.from('ap_ib_exams').select('id').eq('user_id', user.id),
          createTimeoutPromise(3000)
        ])
      ]);

      // Handle profile data
      let profile = null;
      if (profileResult.status === 'fulfilled') {
        const { data, error } = profileResult.value;
        if (error && error.code !== 'PGRST116') {
          console.warn('Error loading profile:', error);
        } else {
          profile = data;
        }
      }

      // Handle test scores data
      const hasSatScores = satScoresResult.status === 'fulfilled' && (satScoresResult.value.data?.length || 0) > 0;
      const hasActScores = actScoresResult.status === 'fulfilled' && (actScoresResult.value.data?.length || 0) > 0;
      const hasApIbExams = apIbExamsResult.status === 'fulfilled' && (apIbExamsResult.value.data?.length || 0) > 0;

      // Calculate completion for main profile fields
      let completedFields = 0;
      let totalWeight = 0;
      const missingFields: string[] = [];

      PROFILE_FIELDS.forEach(field => {
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
      });

      // Add completion for additional fields
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
          case 'has_ap_ib_exams':
            isCompleted = hasApIbExams;
            break;
        }
        
        if (isCompleted) {
          completedFields += field.weight;
        } else {
          missingFields.push(field.key);
        }
      });

      const completionPercentage = Math.round((completedFields / totalWeight) * 100);

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
  };

  useEffect(() => {
    let isMounted = true;

    const runCalculation = async () => {
      await calculateCompletion();
    };

    runCalculation();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    ...completionData,
    loading,
    error,
    refetch: calculateCompletion,
  };
};
