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
    setLoading(true);
    try {
      const backendData = await resumeActivitiesService.getResumeData();
      
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
      
      setResumeData(frontendData);
      isInitialLoad.current = false; // Mark initial load as complete
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
        backendData[category] = activities.map(activity => ({
          id: activity.id.startsWith('temp-') ? null : activity.id,
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
        }));
      });

      await resumeActivitiesService.saveResumeData(backendData);
      setLastSaved(new Date());
    } catch (error) {
      const { data: { user } } = await supabase.auth.getUser();
      console.error('[RESUME_ERROR] Failed to save resume data:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User resume changes were not saved automatically'
      });
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
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

  // Load data on mount
  useEffect(() => {
    loadResumeData();
  }, []); // Remove loadResumeData dependency to prevent multiple loads

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

    setResumeData(prevData => {
      const newData = {
        ...prevData,
        [category]: [...prevData[category as keyof ResumeData], newActivity]
      };
      
      // Trigger immediate auto-save with the new data
      setTimeout(() => {
        autoSaveWithData(newData);
      }, 200);
      
      return newData;
    });
  }, []);

  // Update an activity
  const updateActivity = useCallback((category: string, activityId: string, updatedActivity: Partial<ActivityData>) => {
    setResumeData(prevData => {
      const newData = {
        ...prevData,
        [category]: prevData[category as keyof ResumeData].map(activity =>
          activity.id === activityId ? { ...activity, ...updatedActivity } : activity
        )
      };
      
      // Save immediately when activity is updated (this is called from ActivityEditor on blur)
      setTimeout(() => {
        autoSaveWithData(newData);
      }, 100);
      
      return newData;
    });
  }, [autoSaveWithData]);

  // Remove an activity
  const removeActivity = useCallback((category: string, activityId: string) => {
    setResumeData(prevData => {
      const newData = {
        ...prevData,
        [category]: prevData[category as keyof ResumeData].filter(activity => activity.id !== activityId)
      };
      
      // Save immediately when activity is removed
      setTimeout(() => {
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