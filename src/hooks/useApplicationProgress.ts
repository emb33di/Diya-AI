import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolApplicationTask {
  id: string;
  school_recommendation_id: string;
  task_name: string;
  task_type: 'application_form' | 'essays' | 'test_scores' | 'financial_aid' | 'recommendations' | 'transcripts' | 'portfolio';
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  school_name: string;
  school_category: 'reach' | 'target' | 'safety';
}

export interface ApplicationProgressData {
  tasks: SchoolApplicationTask[];
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  schoolsWithTasks: number;
  loading: boolean;
  error: string | null;
}

export const useApplicationProgress = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ApplicationProgressData>({
    tasks: [],
    totalTasks: 0,
    completedTasks: 0,
    progressPercentage: 0,
    schoolsWithTasks: 0,
    loading: true,
    error: null,
  });

  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    let isMounted = true;

    const fetchApplicationProgress = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        // Fetch tasks with school information
        const { data: tasksData, error } = await supabase
          .from('school_application_tasks')
          .select(`
            id,
            school_recommendation_id,
            task_name,
            task_type,
            priority,
            completed,
            completed_at,
            notes,
            school_recommendations!inner(
              school,
              category
            )
          `)
          .eq('school_recommendations.student_id', userId as any);

        if (error) {
          throw error;
        }

        if (isMounted) {
          // Transform the data to include school information
          const tasks: SchoolApplicationTask[] = (tasksData as any[])?.map(task => ({
            id: task.id,
            school_recommendation_id: task.school_recommendation_id,
            task_name: task.task_name,
            task_type: task.task_type,
            priority: task.priority,
            completed: task.completed,
            completed_at: task.completed_at,
            notes: task.notes,
            school_name: task.school_recommendations.school,
            school_category: task.school_recommendations.category,
          })) || [];

          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(task => task.completed).length;
          const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          // Count unique schools with tasks
          const uniqueSchools = new Set(tasks.map(task => task.school_recommendation_id)).size;

          setData({
            tasks,
            totalTasks,
            completedTasks,
            progressPercentage,
            schoolsWithTasks: uniqueSchools,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('[APPLICATION_PROGRESS_ERROR] Failed to fetch application progress:', {
          userId,
          userEmail: user?.email || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        if (isMounted) {
          setData(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch application progress',
          }));
        }
      }
    };

    fetchApplicationProgress();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Function to update task completion
  const updateTaskCompletion = async (taskId: string, completed: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('school_application_tasks')
        .update({ 
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null
        } as any)
        .eq('id', taskId as any);

      if (error) {
        throw error;
      }

      // Update local state
      setData(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => 
          task.id === taskId ? { ...task, completed, completed_at: completed ? new Date().toISOString() : null } : task
        ),
        completedTasks: completed ? prev.completedTasks + 1 : prev.completedTasks - 1,
        progressPercentage: prev.totalTasks > 0 ? Math.round(((completed ? prev.completedTasks + 1 : prev.completedTasks - 1) / prev.totalTasks) * 100) : 0,
      }));

      return true;
    } catch (error) {
      console.error('[APPLICATION_PROGRESS_ERROR] Failed to update task completion:', {
        taskId,
        completed,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  };

  return {
    ...data,
    updateTaskCompletion,
  };
};
