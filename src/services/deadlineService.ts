import { supabase } from "@/integrations/supabase/client";
import { getUserProgramType } from "@/utils/userProfileUtils";

export interface DeadlineData {
  School: string;
  "Early Action": string;
  "Early Decision 1": string;
  "Early Decision 2": string;
  "Regular Decision": string;
}

export interface UserDeadline {
  id: string;
  schoolName: string;
  category: 'reach' | 'target' | 'safety';
  earlyActionDeadline: string | null;
  earlyDecision1Deadline: string | null;
  earlyDecision2Deadline: string | null;
  regularDecisionDeadline: string | null;
  applicationStatus: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  daysRemaining: number | null;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical' | 'overdue';
  tasks: DeadlineTask[];
}

export interface DeadlineTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface DeadlineSyncResponse {
  success: boolean;
  message: string;
  updatedCount?: number;
  schools_updated?: number;
  total_schools?: number;
}

export interface UserDeadlinesResponse {
  success: boolean;
  deadlines: UserDeadline[];
  error?: string;
}

export class DeadlineService {
  /**
   * Sync deadlines for a user based on their school list using Supabase Edge Function
   */
  static async syncDeadlinesForUser(userId: string): Promise<DeadlineSyncResponse> {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Call the Supabase Edge Function to sync deadlines
      const { data, error } = await supabase.functions.invoke('sync-deadlines', {
        body: {
          user_id: userId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error(`DeadlineService: Failed to sync deadlines for user ${userId} - ${error.message}`);
        throw new Error(`Edge Function error: ${error.message}`);
      }

      const result = {
        success: data.success,
        message: data.message,
        updatedCount: data.schools_updated || 0,
        schools_updated: data.schools_updated || 0,
        total_schools: data.total_schools || 0
      };

      // Log success for user transparency
      if (result.success) {
        console.log(`DeadlineService: Successfully synced deadlines for user ${userId} - updated ${result.schools_updated} out of ${result.total_schools} schools`);
      }

      return result;
    } catch (error) {
      console.error(`DeadlineService: Critical error syncing deadlines for user ${userId} - ${error.message}`);
      throw new Error(`Failed to sync deadlines: ${error.message}`);
    }
  }

  /**
   * Get all deadlines for a user, filtered by their program type
   */
  static async getUserDeadlines(userId: string): Promise<UserDeadlinesResponse> {
    try {
      // Get user's program type to filter appropriate schools
      const userProgramType = await getUserProgramType();

      // Get user's school recommendations with deadline data
      const { data: schoolRecommendations, error } = await supabase
        .from('school_recommendations')
        .select('*')
        .eq('student_id', userId);

      if (error) {
        console.error(`DeadlineService: Failed to fetch school recommendations for user ${userId} - ${error.message}`);
        throw new Error(`Failed to fetch school recommendations: ${error.message}`);
      }

      if (!schoolRecommendations || schoolRecommendations.length === 0) {
        console.log(`DeadlineService: No school recommendations found for user ${userId} - user may need to complete onboarding or school selection`);
        return {
          success: true,
          deadlines: []
        };
      }

      // Filter schools by program type if user has a specific program type
      let filteredSchools = schoolRecommendations;
      if (userProgramType) {
        // For MBA users, only show MBA schools; for undergraduate users, only show undergraduate schools
        filteredSchools = schoolRecommendations.filter(school => {
          const schoolName = school.school.toLowerCase();
          
          if (userProgramType === 'MBA') {
            // MBA schools typically have "Business School", "School of Management", "MBA", etc. in their names
            return schoolName.includes('business school') || 
                   schoolName.includes('school of management') || 
                   schoolName.includes('mba') ||
                   schoolName.includes('graduate school of business') ||
                   schoolName.includes('school of business');
          } else if (userProgramType === 'Undergraduate') {
            // Undergraduate schools typically don't have business school indicators
            return !schoolName.includes('business school') && 
                   !schoolName.includes('school of management') && 
                   !schoolName.includes('mba') &&
                   !schoolName.includes('graduate school of business') &&
                   !schoolName.includes('school of business');
          }
          
          return true; // For other program types, show all schools
        });
        
        // Log filtering results for user transparency
        if (filteredSchools.length !== schoolRecommendations.length) {
          console.log(`DeadlineService: Filtered ${schoolRecommendations.length} schools to ${filteredSchools.length} schools for user ${userId} (${userProgramType} program type)`);
        }
      }

      // Process each school into deadline format
      const deadlines: UserDeadline[] = filteredSchools.map(school => {
        const daysRemaining = school.regular_decision_deadline 
          ? this.calculateDaysRemaining(school.regular_decision_deadline)
          : null;
        
        const urgencyLevel = daysRemaining !== null 
          ? this.getUrgencyLevel(daysRemaining)
          : 'low';

        // Generate tasks for this school
        const tasks: DeadlineTask[] = [
          {
            id: `${school.id}-application`,
            title: "Application Form",
            description: "Complete and submit the main application",
            dueDate: school.regular_decision_deadline || 'TBD',
            completed: false,
            priority: "high"
          },
          {
            id: `${school.id}-essays`,
            title: "Essays",
            description: "Write and submit required essays",
            dueDate: school.regular_decision_deadline || 'TBD',
            completed: false,
            priority: "high"
          },
          {
            id: `${school.id}-test-scores`,
            title: "Test Scores",
            description: "Submit official test scores",
            dueDate: school.regular_decision_deadline || 'TBD',
            completed: false,
            priority: "low"
          },
          {
            id: `${school.id}-financial-aid`,
            title: "Financial Aid Forms",
            description: "Complete FAFSA and CSS Profile",
            dueDate: school.regular_decision_deadline || 'TBD',
            completed: false,
            priority: "low"
          }
        ];

        return {
          id: school.id,
          schoolName: school.school,
          category: school.category as 'reach' | 'target' | 'safety',
          earlyActionDeadline: school.early_action_deadline,
          earlyDecision1Deadline: school.early_decision_1_deadline,
          earlyDecision2Deadline: school.early_decision_2_deadline,
          regularDecisionDeadline: school.regular_decision_deadline,
          applicationStatus: school.application_status || 'not_started',
          daysRemaining,
          urgencyLevel,
          tasks
        };
      });

      // Sort by urgency (critical first, then by days remaining)
      deadlines.sort((a, b) => {
        const urgencyOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'overdue': -1 };
        const aUrgency = urgencyOrder[a.urgencyLevel] ?? 3;
        const bUrgency = urgencyOrder[b.urgencyLevel] ?? 3;
        
        if (aUrgency !== bUrgency) {
          return aUrgency - bUrgency;
        }
        
        const aDays = a.daysRemaining ?? Infinity;
        const bDays = b.daysRemaining ?? Infinity;
        return aDays - bDays;
      });

      // Log final results for user transparency
      const criticalDeadlines = deadlines.filter(d => d.urgencyLevel === 'critical').length;
      const overdueDeadlines = deadlines.filter(d => d.urgencyLevel === 'overdue').length;
      
      console.log(`DeadlineService: Retrieved ${deadlines.length} deadlines for user ${userId} - ${criticalDeadlines} critical, ${overdueDeadlines} overdue`);

      return {
        success: true,
        deadlines
      };
    } catch (error) {
      console.error(`DeadlineService: Failed to fetch deadlines for user ${userId} - ${error.message}`);
      return {
        success: false,
        deadlines: [],
        error: `Failed to fetch deadlines: ${error.message}`
      };
    }
  }

  /**
   * Update application status for a school
   */
  static async updateApplicationStatus(
    schoolId: string, 
    status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('school_recommendations')
        .update({ 
          application_status: status,
          last_updated: new Date().toISOString()
        })
        .eq('id', schoolId);

      if (error) {
        console.error(`DeadlineService: Failed to update application status for school ${schoolId} - ${error.message}`);
        throw error;
      }
      
      console.log(`DeadlineService: Successfully updated application status to "${status}" for school ${schoolId}`);
      return true;
    } catch (error) {
      console.error(`DeadlineService: Error updating application status for school ${schoolId} - ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate days remaining until deadline
   */
  static calculateDaysRemaining(deadline: string): number {
    const deadlineDate = new Date(deadline);
    
    if (isNaN(deadlineDate.getTime())) {
      console.error(`DeadlineService: Invalid date format for deadline "${deadline}" - user may need to update their school deadline information`);
      return 0;
    }
    
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Determine urgency level based on days remaining
   */
  static getUrgencyLevel(daysRemaining: number): 'low' | 'medium' | 'high' | 'critical' | 'overdue' {
    if (daysRemaining < 0) return 'overdue';
    if (daysRemaining <= 7) return 'critical';
    if (daysRemaining <= 14) return 'high';
    if (daysRemaining <= 30) return 'medium';
    return 'low';
  }

  /**
   * Get next upcoming deadline
   */
  static getNextDeadline(deadlines: UserDeadline[]): UserDeadline | null {
    const validDeadlines = deadlines.filter(d => 
      d.regularDecisionDeadline && 
      this.calculateDaysRemaining(d.regularDecisionDeadline) >= 0
    );

    if (validDeadlines.length === 0) return null;

    return validDeadlines.reduce((next, current) => {
      const nextDays = this.calculateDaysRemaining(next.regularDecisionDeadline!);
      const currentDays = this.calculateDaysRemaining(current.regularDecisionDeadline!);
      return currentDays < nextDays ? current : next;
    });
  }

  /**
   * Get overdue deadlines
   */
  static getOverdueDeadlines(deadlines: UserDeadline[]): UserDeadline[] {
    return deadlines.filter(d => 
      d.regularDecisionDeadline && 
      this.calculateDaysRemaining(d.regularDecisionDeadline) < 0
    );
  }

  /**
   * Get critical deadlines (due within 7 days)
   */
  static getCriticalDeadlines(deadlines: UserDeadline[]): UserDeadline[] {
    return deadlines.filter(d => 
      d.regularDecisionDeadline && 
      this.calculateDaysRemaining(d.regularDecisionDeadline) <= 7 &&
      this.calculateDaysRemaining(d.regularDecisionDeadline) >= 0
    );
  }

  /**
   * Update task completion status
   */
  static async updateTaskCompletion(
    schoolId: string,
    taskType: string,
    completed: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('school_application_tasks')
        .update({ 
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq('school_recommendation_id', schoolId)
        .eq('task_type', taskType);

      if (error) {
        console.error(`DeadlineService: Failed to update task completion for school ${schoolId}, task ${taskType} - ${error.message}`);
        throw error;
      }
      
      console.log(`DeadlineService: Successfully updated task ${taskType} completion to ${completed} for school ${schoolId}`);
      return true;
    } catch (error) {
      console.error(`DeadlineService: Error updating task completion for school ${schoolId}, task ${taskType} - ${error.message}`);
      return false;
    }
  }

  /**
   * Get tasks for a school
   */
  static async getSchoolTasks(schoolId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('school_application_tasks')
        .select('*')
        .eq('school_recommendation_id', schoolId)
        .order('priority', { ascending: false });

      if (error) {
        console.error(`DeadlineService: Failed to get tasks for school ${schoolId} - ${error.message}`);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error(`DeadlineService: Error getting tasks for school ${schoolId} - ${error.message}`);
      return [];
    }
  }
} 