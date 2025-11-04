import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { EssayService, Essay } from '@/services/essayService';
import { DeadlineService, UserDeadline, UserDeadlinesResponse } from '@/services/deadlineService';
import { supabase } from '@/integrations/supabase/client';
import { LORService, type LORDeadlineInfo } from '@/services/lorService';

export interface SchoolCategory {
  name: string;
  count: number;
  category: 'reach' | 'target' | 'safety';
}

export interface DashboardData {
  essays: Essay[];
  deadlines: UserDeadline[];
  schoolCategories: SchoolCategory[];
  upcomingDeadlines: UserDeadline[];
  upcomingLorDeadlines: LORDeadlineInfo[];
  loading: boolean;
  error: string | null;
}

export const useDashboardData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    essays: [],
    deadlines: [],
    schoolCategories: [],
    upcomingDeadlines: [],
    upcomingLorDeadlines: [],
    loading: true,
    error: null,
  });

  // Extract user ID to prevent unnecessary re-fetches when user object changes
  const userId = user?.id;

  useEffect(() => {
    console.log('[DASHBOARD_DATA] Effect triggered', {
      userId,
      hasUser: Boolean(userId),
    });

    if (!userId) {
      console.log('[DASHBOARD_DATA] No user ID available, skipping dashboard fetch');
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    let isMounted = true; // Prevent state updates after component unmounts

    const fetchDashboardData = async (userId: string) => {
      console.log('[DASHBOARD_DATA] Fetch start', {
        userId,
        timestamp: new Date().toISOString(),
      });
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Fetch all data in parallel for better performance
        // Removed timeout wrapper - let queries complete naturally and handle errors properly
        const [essays, deadlineResponse, lorDeadlinesResult, schoolRecommendationsResult] = await Promise.allSettled([
          EssayService.getUserEssays(),
          DeadlineService.getUserDeadlines(userId),
          LORService.getUserLORDeadlines(userId),
          supabase
            .from('school_recommendations')
            .select('school, category, application_status')
            .eq('student_id', userId as any)
        ]);

        console.log('[DASHBOARD_DATA] Fetch results received', {
          essaysStatus: essays.status,
          deadlinesStatus: deadlineResponse.status,
          lorStatus: lorDeadlinesResult.status,
          schoolStatus: schoolRecommendationsResult.status,
          essaysError: essays.status === 'rejected' ? essays.reason : undefined,
          deadlinesError: deadlineResponse.status === 'rejected' ? deadlineResponse.reason : undefined,
          lorError: lorDeadlinesResult.status === 'rejected' ? lorDeadlinesResult.reason : undefined,
          schoolError: schoolRecommendationsResult.status === 'rejected' ? schoolRecommendationsResult.reason : undefined,
        });

        // Handle essays
        const essaysData = essays.status === 'fulfilled' ? (essays.value as Essay[]) : [];
        
        // Handle deadlines
        const deadlineResponseData = deadlineResponse.status === 'fulfilled' ? deadlineResponse.value as UserDeadlinesResponse : null;
        const deadlines = deadlineResponseData && deadlineResponseData.success 
          ? deadlineResponseData.deadlines 
          : [];

        // Handle LOR deadlines
        const lorDeadlines: LORDeadlineInfo[] = lorDeadlinesResult.status === 'fulfilled' 
          ? (lorDeadlinesResult.value as LORDeadlineInfo[]) 
          : [];

        // Handle school recommendations
        let schoolRecommendations = null;
        if (schoolRecommendationsResult.status === 'fulfilled') {
          const result = schoolRecommendationsResult.value as any;
          if (result?.data !== undefined) {
            schoolRecommendations = result.data;
          } else if (result?.error) {
            console.error('[DASHBOARD_ERROR] School recommendations query error:', result.error);
          }
        } else {
          console.error('[DASHBOARD_ERROR] Failed to load school list:', {
            userId: userId,
            userEmail: user?.email || 'unknown',
            error: schoolRecommendationsResult.reason,
            timestamp: new Date().toISOString(),
            message: 'User cannot see their school recommendations on dashboard'
          });
        }

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

        // Get upcoming deadlines (next 5) - including custom deadlines
        const upcomingDeadlines = deadlines
          .filter(d => {
            // Check if using custom deadline
            if (d.useCustomDeadline && d.customDeadline) {
              return DeadlineService.calculateDaysRemaining(d.customDeadline) >= 0;
            }
            // Fall back to regular decision deadline
            return d.regularDecisionDeadline && DeadlineService.calculateDaysRemaining(d.regularDecisionDeadline) >= 0;
          })
          .sort((a, b) => {
            // Get the effective deadline date for comparison
            const aDeadline = a.useCustomDeadline && a.customDeadline ? a.customDeadline : a.regularDecisionDeadline;
            const bDeadline = b.useCustomDeadline && b.customDeadline ? b.customDeadline : b.regularDecisionDeadline;
            
            const aDays = aDeadline ? DeadlineService.calculateDaysRemaining(aDeadline) : Infinity;
            const bDays = bDeadline ? DeadlineService.calculateDaysRemaining(bDeadline) : Infinity;
            return aDays - bDays;
          })
          .slice(0, 5);

        // Get upcoming LOR deadlines (next 5)
        const upcomingLorDeadlines = lorDeadlines
          .filter(ld => ld.daysRemaining >= 0)
          .sort((a, b) => a.daysRemaining - b.daysRemaining)
          .slice(0, 5);

        if (isMounted) {
          console.log('[DASHBOARD_DATA] Updating state with fetched data', {
            essaysCount: essaysData.length,
            deadlinesCount: deadlines.length,
            schoolCategoriesCount: schoolCategories.length,
            upcomingDeadlinesCount: upcomingDeadlines.length,
            upcomingLorDeadlinesCount: upcomingLorDeadlines.length,
          });
          setData({
            essays: essaysData,
            deadlines,
            schoolCategories,
            upcomingDeadlines,
            upcomingLorDeadlines,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.log('[DASHBOARD_DATA] Fetch encountered error', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
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
      console.log('[DASHBOARD_DATA] Cleanup invoked', { userId });
    };
  }, [userId]);

  return data;
};
