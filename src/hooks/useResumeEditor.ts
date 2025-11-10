import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { resumeActivitiesService } from '@/services/resumeActivitiesService';
import { supabase } from '@/integrations/supabase/client';

// Define the activity data structure
interface ActivityData {
  id: string;
  title: string;
  position: string;
  location: string;
  fromDate: string;
  toDate: string;
  isCurrent: boolean;
  bullets: string[];
}

// Define the resume data structure
interface ResumeData {
  academic: ActivityData[];
  experience: ActivityData[];
  leadership: ActivityData[];
  projects: ActivityData[];
  extracurricular: ActivityData[];
  volunteering: ActivityData[];
  skills: ActivityData[];
  interests: ActivityData[];
  languages: ActivityData[];
}

export const useResumeEditor = () => {
  const [resumeData, setResumeData] = useState<ResumeData>({
    academic: [],
    experience: [],
    leadership: [],
    projects: [],
    extracurricular: [],
    volunteering: [],
    skills: [],
    interests: [],
    languages: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Auto-save timeout ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef<ResumeData | null>(null);
  const hasLoadedRef = useRef(false);
  
  const { toast } = useToast();

  // Convert backend data to frontend format
  const convertBackendToFrontend = (backendActivity: any): ActivityData => ({
    id: backendActivity.id,
    title: backendActivity.title,
    position: backendActivity.position || '',
    location: backendActivity.location || '',
    fromDate: backendActivity.from_date || '',
    toDate: backendActivity.to_date || '',
    isCurrent: backendActivity.is_current || false,
    bullets: backendActivity.bullets?.map((bullet: any) => bullet.bullet_text) || ['']
  });

  // Load resume data from Supabase
  const loadResumeData = useCallback(async () => {
    console.log('[RESUME_DEBUG] Starting loadResumeData - page refresh/initial load');
    setLoading(true);
    try {
      const backendData = await resumeActivitiesService.getResumeData();
      
      console.log('[RESUME_DEBUG] Backend data received:', {
        timestamp: new Date().toISOString(),
        categories: Object.keys(backendData),
        activityCounts: Object.entries(backendData).reduce((acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value.length : 0;
          return acc;
        }, {} as Record<string, number>),
        allActivityIds: Object.entries(backendData).flatMap(([key, value]) => 
          Array.isArray(value) ? value.map((v: any) => ({ category: key, id: v.id, title: v.title })) : []
        )
      });
      
      // Convert backend data to frontend format
      const frontendData: ResumeData = {
        academic: backendData.academic.map(convertBackendToFrontend),
        experience: backendData.experience.map(convertBackendToFrontend),
        leadership: backendData.leadership?.map(convertBackendToFrontend) || [],
        projects: backendData.projects.map(convertBackendToFrontend),
        extracurricular: backendData.extracurricular.map(convertBackendToFrontend),
        volunteering: backendData.volunteering.map(convertBackendToFrontend),
        skills: backendData.skills.map(convertBackendToFrontend),
        interests: backendData.interests.map(convertBackendToFrontend),
        languages: backendData.languages.map(convertBackendToFrontend)
      };
      
      console.log('[RESUME_DEBUG] Frontend data after conversion:', {
        timestamp: new Date().toISOString(),
        categories: Object.keys(frontendData),
        activityCounts: Object.entries(frontendData).reduce((acc, [key, value]) => {
          acc[key] = value.length;
          return acc;
        }, {} as Record<string, number>),
        allActivityIds: Object.entries(frontendData).flatMap(([key, value]) => 
          value.map(v => ({ category: key, id: v.id, title: v.title }))
        )
      });
      
      setResumeData(frontendData);
      isInitialLoad.current = false; // Mark initial load as complete
      hasLoadedRef.current = true; // Mark as loaded
      
      console.log('[RESUME_DEBUG] Resume data loaded and set in state');
    } catch (error) {
      const { data: { user } } = await supabase.auth.getUser();
      console.error('[RESUME_ERROR] Failed to load resume data:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot load their resume activities and data'
      });
      toast({
        title: "Error",
        description: "Failed to load resume data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Auto-save function with specific data
  const autoSaveWithData = useCallback(async (dataToSave: ResumeData) => {
    // If already saving, queue this save
    if (isSavingRef.current) {
      console.log('[RESUME_DEBUG] Save already in progress, queueing this save:', {
        timestamp: new Date().toISOString(),
        categories: Object.keys(dataToSave),
        activityCounts: Object.entries(dataToSave).reduce((acc, [key, value]) => {
          acc[key] = value.length;
          return acc;
        }, {} as Record<string, number>)
      });
      pendingSaveRef.current = dataToSave;
      return;
    }

    console.log('[RESUME_DEBUG] Starting autoSaveWithData:', {
      timestamp: new Date().toISOString(),
      categories: Object.keys(dataToSave),
      activityCounts: Object.entries(dataToSave).reduce((acc, [key, value]) => {
        acc[key] = value.length;
        return acc;
      }, {} as Record<string, number>),
      allActivityIds: Object.entries(dataToSave).flatMap(([key, value]) => 
        value.map(v => ({ category: key, id: v.id, isTemp: v.id.startsWith('temp-'), title: v.title }))
      )
    });

    isSavingRef.current = true;
    setSaving(true);
    setSaveError(null);
    
    try {
      // Convert frontend data to backend format
      const backendData: any = {
        academic: [],
        experience: [],
        leadership: [],
        projects: [],
        extracurricular: [],
        volunteering: [],
        skills: [],
        interests: [],
        languages: []
      };

      Object.entries(dataToSave).forEach(([category, activities]) => {
        backendData[category] = activities.map(activity => {
          const isTempId = activity.id.startsWith('temp-');
          const backendActivity = {
            id: isTempId ? null : activity.id,
            title: activity.title,
            position: activity.position,
            location: activity.location,
            from_date: activity.fromDate,
            to_date: activity.toDate,
            is_current: activity.isCurrent,
            bullets: activity.bullets.map((bullet, index) => ({
              bullet_text: bullet,
              bullet_order: index
            }))
          };
          
          console.log('[RESUME_DEBUG] Converting activity for save:', {
            category,
            frontendId: activity.id,
            backendId: backendActivity.id,
            isTempId,
            title: activity.title,
            timestamp: new Date().toISOString()
          });
          
          // Debug log for location field
          if (activity.location && activity.location.trim() !== '') {
            console.log(`[RESUME_DEBUG] Location field being saved:`, {
              category,
              activityId: activity.id,
              title: activity.title,
              location: activity.location,
              backendActivity: backendActivity
            });
          }
          
          return backendActivity;
        });
      });

      console.log('[RESUME_DEBUG] Backend data prepared for save:', {
        timestamp: new Date().toISOString(),
        categories: Object.keys(backendData),
        activityCounts: Object.entries(backendData).reduce((acc, [key, value]) => {
          acc[key] = Array.isArray(value) ? value.length : 0;
          return acc;
        }, {} as Record<string, number>),
        allActivityIds: Object.entries(backendData).flatMap(([key, value]) => 
          Array.isArray(value) ? value.map((v: any) => ({ category: key, id: v.id, title: v.title }))
          : []
        )
      });

      await resumeActivitiesService.saveResumeData(backendData);
      
      console.log('[RESUME_DEBUG] Auto-save completed successfully:', {
        timestamp: new Date().toISOString()
      });
      
      setLastSaved(new Date());
      
      // Check if there's a pending save and process it
      if (pendingSaveRef.current) {
        const pendingData = pendingSaveRef.current;
        pendingSaveRef.current = null;
        console.log('[RESUME_DEBUG] Processing queued save after previous save completed');
        // Use setTimeout to allow state to update
        setTimeout(() => {
          autoSaveWithData(pendingData);
        }, 100);
      }
    } catch (error) {
      const { data: { user } } = await supabase.auth.getUser();
      console.error('[RESUME_ERROR] Failed to save resume data:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User resume changes were not saved automatically',
        dataBeingSaved: {
          categories: Object.keys(dataToSave),
          activityCounts: Object.entries(dataToSave).reduce((acc, [key, value]) => {
            acc[key] = value.length;
            return acc;
          }, {} as Record<string, number>)
        }
      });
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
      
      // Even on error, check for pending saves
      if (pendingSaveRef.current) {
        const pendingData = pendingSaveRef.current;
        pendingSaveRef.current = null;
        setTimeout(() => {
          autoSaveWithData(pendingData);
        }, 100);
      }
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  }, []);

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    await autoSaveWithData(resumeData);
  }, [resumeData, autoSaveWithData]);

  // Manual save function - only save when explicitly called
  const saveResumeData = useCallback(async () => {
    if (isInitialLoad.current) {
      return;
    }

    await autoSaveWithData(resumeData);
  }, [resumeData, autoSaveWithData]);

  // Load data on mount - only once
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadResumeData();
    }
  }, []); // Only run once on mount

  // Add a new activity
  const addActivity = useCallback((category: string) => {
    const newActivity: ActivityData = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: '',
      position: '',
      location: '',
      fromDate: '',
      toDate: '',
      isCurrent: false,
      bullets: ['']
    };

    console.log('[RESUME_DEBUG] Adding new activity:', {
      category,
      activityId: newActivity.id,
      timestamp: new Date().toISOString(),
      activity: newActivity
    });

    setResumeData(prevData => {
      const currentCategoryActivities = prevData[category as keyof ResumeData];
      console.log('[RESUME_DEBUG] Current activities in category before add:', {
        category,
        currentCount: currentCategoryActivities.length,
        currentIds: currentCategoryActivities.map(a => a.id),
        timestamp: new Date().toISOString()
      });

      const newData = {
        ...prevData,
        [category]: [...currentCategoryActivities, newActivity]
      };
      
      console.log('[RESUME_DEBUG] New activities in category after add:', {
        category,
        newCount: newData[category as keyof ResumeData].length,
        newIds: newData[category as keyof ResumeData].map(a => a.id),
        timestamp: new Date().toISOString()
      });
      
      // Clear any pending timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Trigger immediate auto-save with the new data
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log('[RESUME_DEBUG] Triggering autosave after addActivity:', {
          category,
          activityId: newActivity.id,
          totalActivitiesInCategory: newData[category as keyof ResumeData].length,
          timestamp: new Date().toISOString()
        });
        autoSaveWithData(newData);
      }, 200);
      
      return newData;
    });
  }, [autoSaveWithData]);

  // Update an activity
  const updateActivity = useCallback((category: string, activityId: string, updatedActivity: Partial<ActivityData>) => {
    setResumeData(prevData => {
      const newData = {
        ...prevData,
        [category]: prevData[category as keyof ResumeData].map(activity =>
          activity.id === activityId ? { ...activity, ...updatedActivity } : activity
        )
      };
      
      // Clear any pending timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Save immediately when activity is updated (this is called from ActivityEditor on blur)
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveWithData(newData);
      }, 100);
      
      return newData;
    });
  }, [autoSaveWithData]);

  // Remove an activity
  const removeActivity = useCallback((category: string, activityId: string) => {
    console.log('[RESUME_DEBUG] Removing activity:', {
      category,
      activityId,
      timestamp: new Date().toISOString()
    });

    setResumeData(prevData => {
      const currentCategoryActivities = prevData[category as keyof ResumeData];
      console.log('[RESUME_DEBUG] Current activities in category before remove:', {
        category,
        currentCount: currentCategoryActivities.length,
        currentIds: currentCategoryActivities.map(a => a.id),
        activityToRemove: activityId,
        timestamp: new Date().toISOString()
      });

      const newData = {
        ...prevData,
        [category]: currentCategoryActivities.filter(activity => activity.id !== activityId)
      };
      
      console.log('[RESUME_DEBUG] New activities in category after remove:', {
        category,
        newCount: newData[category as keyof ResumeData].length,
        newIds: newData[category as keyof ResumeData].map(a => a.id),
        timestamp: new Date().toISOString()
      });
      
      // Clear any pending timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Save immediately when activity is removed
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log('[RESUME_DEBUG] Triggering autosave after removeActivity:', {
          category,
          removedActivityId: activityId,
          totalActivitiesInCategory: newData[category as keyof ResumeData].length,
          timestamp: new Date().toISOString()
        });
        autoSaveWithData(newData);
      }, 100);
      
      return newData;
    });
  }, [autoSaveWithData]);

  return {
    resumeData,
    loading,
    saving,
    lastSaved,
    saveError,
    addActivity,
    updateActivity,
    removeActivity,
    loadResumeData,
    saveResumeData
  };
};