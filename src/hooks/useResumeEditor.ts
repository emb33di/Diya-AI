import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { resumeActivitiesService } from '@/services/resumeActivitiesService';

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
    fromDate: backendActivity.from_date || '',
    toDate: backendActivity.to_date || '',
    isCurrent: backendActivity.is_current || false,
    bullets: backendActivity.bullets?.map((bullet: any) => bullet.bullet_text) || ['']
  });

  // Load resume data from Supabase
  const loadResumeData = useCallback(async () => {
    console.log('📥 [RESUME DEBUG] Loading resume data from Supabase...');
    setLoading(true);
    try {
      const backendData = await resumeActivitiesService.getResumeData();
      
      console.log('📊 [RESUME DEBUG] Data loaded from Supabase:', {
        academic: backendData.academic?.length || 0,
        experience: backendData.experience?.length || 0,
        projects: backendData.projects?.length || 0,
        extracurricular: backendData.extracurricular?.length || 0,
        volunteering: backendData.volunteering?.length || 0,
        skills: backendData.skills?.length || 0,
        interests: backendData.interests?.length || 0,
        languages: backendData.languages?.length || 0
      });
      
      // Convert backend data to frontend format
      const frontendData: ResumeData = {
        academic: backendData.academic.map(convertBackendToFrontend),
        experience: backendData.experience.map(convertBackendToFrontend),
        projects: backendData.projects.map(convertBackendToFrontend),
        extracurricular: backendData.extracurricular.map(convertBackendToFrontend),
        volunteering: backendData.volunteering.map(convertBackendToFrontend),
        skills: backendData.skills.map(convertBackendToFrontend),
        interests: backendData.interests.map(convertBackendToFrontend),
        languages: backendData.languages.map(convertBackendToFrontend)
      };
      
      console.log('✅ [RESUME DEBUG] Resume data loaded and converted successfully');
      setResumeData(frontendData);
      isInitialLoad.current = false; // Mark initial load as complete
    } catch (error) {
      console.error('❌ [RESUME DEBUG] Failed to load resume data:', error);
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
    console.log('💾 [AUTO-SAVE] Starting auto-save with specific data...');
    setSaving(true);
    setSaveError(null);
    
    try {
      // Convert frontend data to backend format
      const backendData: any = {
        academic: [],
        experience: [],
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
          from_date: activity.fromDate,
          to_date: activity.toDate,
          is_current: activity.isCurrent,
          bullets: activity.bullets.map((bullet, index) => ({
            bullet_text: bullet,
            bullet_order: index
          }))
        }));
      });

      console.log('📤 [AUTO-SAVE] Sending data to save:', JSON.stringify(backendData, null, 2));
      await resumeActivitiesService.saveResumeData(backendData);
      setLastSaved(new Date());
      console.log('✅ [AUTO-SAVE] Resume data saved successfully');
    } catch (error) {
      console.error('❌ [AUTO-SAVE] Failed to save resume data:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, []);

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (isInitialLoad.current) {
      console.log('⏭️ [AUTO-SAVE] Skipping auto-save during initial load');
      isInitialLoad.current = false;
      return;
    }

    await autoSaveWithData(resumeData);
  }, [resumeData, autoSaveWithData]);

  // Manual save function - only save when explicitly called
  const saveResumeData = useCallback(async () => {
    if (isInitialLoad.current) {
      console.log('⏭️ [MANUAL SAVE] Skipping during initial load');
      return;
    }

    console.log('💾 [MANUAL SAVE] Saving resume data...');
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
      
      console.log('➕ [RESUME DEBUG] Activity added to category:', category);
      console.log('📊 [RESUME DEBUG] New data state:', newData);
      
      // Trigger immediate auto-save with the new data
      setTimeout(() => {
        console.log('🔄 [AUTO-SAVE] Triggering immediate save for new activity');
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
      
      console.log('🗑️ [RESUME DEBUG] Activity removed:', activityId);
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