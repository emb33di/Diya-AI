import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { EssayService, Essay } from '@/services/essayService';
import { DeadlineService, UserDeadline } from '@/services/deadlineService';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolCategory {
  name: string;
  count: number;
  category: 'reach' | 'target' | 'safety';
}

export interface DashboardData {
  essays: Essay[];
  deadlines: UserDeadline[];
  schoolCategories: SchoolCategory[];
  essayProgress: {
    totalEssays: number;
    completedEssays: number;
    draftEssays: number;
    inReviewEssays: number;
    progressPercentage: number;
  };
  upcomingDeadlines: UserDeadline[];
  loading: boolean;
  error: string | null;
}

export const useDashboardData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    essays: [],
    deadlines: [],
    schoolCategories: [],
    essayProgress: {
      totalEssays: 0,
      completedEssays: 0,
      draftEssays: 0,
      inReviewEssays: 0,
      progressPercentage: 0,
    },
    upcomingDeadlines: [],
    loading: true,
    error: null,
  });

  // Extract user ID to prevent unnecessary re-fetches when user object changes
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    let isMounted = true; // Prevent state updates after component unmounts

    const fetchDashboardData = async (userId: string) => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        // Fetch all data in parallel for better performance
        const [essays, deadlineResponse, schoolRecommendationsResult] = await Promise.allSettled([
          Promise.race([EssayService.getUserEssays(), timeoutPromise]),
          Promise.race([DeadlineService.getUserDeadlines(userId), timeoutPromise]),
          Promise.race([
            supabase
              .from('school_recommendations')
              .select('school, category, application_status')
              .eq('student_id', userId),
            timeoutPromise
          ])
        ]);

        // Handle essays
        const essaysData = essays.status === 'fulfilled' ? essays.value : [];
        
        // Handle deadlines
        const deadlines = deadlineResponse.status === 'fulfilled' && deadlineResponse.value.success 
          ? deadlineResponse.value.deadlines 
          : [];

        // Handle school recommendations
        const schoolRecommendations = schoolRecommendationsResult.status === 'fulfilled' 
          ? schoolRecommendationsResult.value.data 
          : null;
        
        if (schoolRecommendationsResult.status === 'rejected') {
          console.error('[DASHBOARD_ERROR] Failed to load school list:', {
            userId: userId,
            userEmail: user?.email || 'unknown',
            error: schoolRecommendationsResult.reason,
            timestamp: new Date().toISOString(),
            message: 'User cannot see their school recommendations on dashboard'
          });
        }

        // Calculate essay progress
        const totalEssays = essaysData.length;
        const completedEssays = essaysData.filter(e => e.status === 'final' || e.status === 'submitted').length;
        const draftEssays = essaysData.filter(e => e.status === 'draft').length;
        const inReviewEssays = essaysData.filter(e => e.status === 'review').length;
        const progressPercentage = totalEssays > 0 ? Math.round((completedEssays / totalEssays) * 100) : 0;

        // Calculate school categories
        const reachCount = schoolRecommendations?.filter(s => s.category === 'reach').length || 0;
        const targetCount = schoolRecommendations?.filter(s => s.category === 'target').length || 0;
        const safetyCount = schoolRecommendations?.filter(s => s.category === 'safety').length || 0;
        
        // If no schools have categories, show total count in "Target Schools" as default
        const hasCategorizedSchools = reachCount > 0 || targetCount > 0 || safetyCount > 0;
        const uncategorizedCount = schoolRecommendations?.filter(s => !s.category || s.category === null).length || 0;
        
        const schoolCategories: SchoolCategory[] = [
          {
            name: 'Dream Schools',
            count: reachCount,
            category: 'reach'
          },
          {
            name: 'Target Schools',
            count: hasCategorizedSchools ? targetCount : (targetCount + uncategorizedCount),
            category: 'target'
          },
          {
            name: 'Safety Schools',
            count: safetyCount,
            category: 'safety'
          }
        ];

        // Get upcoming deadlines (next 5)
        const upcomingDeadlines = deadlines
          .filter(d => d.regularDecisionDeadline && DeadlineService.calculateDaysRemaining(d.regularDecisionDeadline) >= 0)
          .sort((a, b) => {
            const aDays = a.regularDecisionDeadline ? DeadlineService.calculateDaysRemaining(a.regularDecisionDeadline) : Infinity;
            const bDays = b.regularDecisionDeadline ? DeadlineService.calculateDaysRemaining(b.regularDecisionDeadline) : Infinity;
            return aDays - bDays;
          })
          .slice(0, 5);

        if (isMounted) {
          setData({
            essays: essaysData,
            deadlines,
            schoolCategories,
            essayProgress: {
              totalEssays,
              completedEssays,
              draftEssays,
              inReviewEssays,
              progressPercentage,
            },
            upcomingDeadlines,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('[DASHBOARD_ERROR] Failed to load dashboard data:', {
          userId: userId,
          userEmail: user?.email || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          timestamp: new Date().toISOString(),
          message: 'User cannot see their dashboard overview - essays, deadlines, and school progress'
        });
        if (isMounted) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
          }));
        }
      }
    };

    fetchDashboardData(userId);

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [userId]);

  return data;
};
