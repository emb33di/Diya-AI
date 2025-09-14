import { supabase } from "@/integrations/supabase/client";

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
   * Sync deadlines for a user based on their school list
   */
  static async syncDeadlinesForUser(userId: string): Promise<DeadlineSyncResponse> {
    try {
      // Get user's school recommendations
      const { data: schoolRecommendations, error: schoolError } = await supabase
        .from('school_recommendations')
        .select('*')
        .eq('student_id', userId);

      if (schoolError) {
        throw new Error(`Failed to fetch school recommendations: ${schoolError.message}`);
      }

      if (!schoolRecommendations || schoolRecommendations.length === 0) {
        return {
          success: true,
          message: 'No school recommendations found to sync deadlines',
          updatedCount: 0,
          schools_updated: 0,
          total_schools: 0
        };
      }

      // Get school names from recommendations
      const schoolNames = schoolRecommendations.map(rec => rec.school);

      // Get deadline data for these schools
      const { data: deadlineData, error: deadlineError } = await supabase
        .from('school_deadlines')
        .select('*')
        .in('school_name', schoolNames);

      if (deadlineError) {
        throw new Error(`Failed to fetch deadline data: ${deadlineError.message}`);
      }

      // Create a map of school names to deadline data
      const deadlineMap = new Map();
      deadlineData?.forEach(deadline => {
        deadlineMap.set(deadline.school_name, deadline);
      });

      // Update school recommendations with deadline data
      let updatedCount = 0;
      const updatePromises = schoolRecommendations.map(async (school) => {
        const deadlineInfo = deadlineMap.get(school.school);
        if (deadlineInfo) {
          const { error: updateError } = await supabase
            .from('school_recommendations')
            .update({
              early_action_deadline: deadlineInfo.early_action_deadline,
              early_decision_1_deadline: deadlineInfo.early_decision_1_deadline,
              early_decision_2_deadline: deadlineInfo.early_decision_2_deadline,
              regular_decision_deadline: deadlineInfo.regular_decision_deadline,
              last_updated: new Date().toISOString()
            })
            .eq('id', school.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      });

      await Promise.all(updatePromises);

      return {
        success: true,
        message: `Successfully synced deadlines for ${updatedCount} schools`,
        updatedCount,
        schools_updated: updatedCount,
        total_schools: schoolRecommendations.length
      };
    } catch (error) {
      console.error('Error syncing deadlines:', error);
      throw new Error(`Failed to sync deadlines: ${error.message}`);
    }
  }

  /**
   * Get all deadlines for a user
   */
  static async getUserDeadlines(userId: string): Promise<UserDeadlinesResponse> {
    try {
      // Get user's school recommendations with deadline data
      const { data: schoolRecommendations, error } = await supabase
        .from('school_recommendations')
        .select('*')
        .eq('student_id', userId);

      if (error) {
        throw new Error(`Failed to fetch school recommendations: ${error.message}`);
      }

      if (!schoolRecommendations || schoolRecommendations.length === 0) {
        return {
          success: true,
          deadlines: []
        };
      }

      // Process each school into deadline format
      const deadlines: UserDeadline[] = schoolRecommendations.map(school => {
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

      return {
        success: true,
        deadlines
      };
    } catch (error) {
      console.error('Error fetching user deadlines:', error);
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

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating application status:', error);
      return false;
    }
  }

  /**
   * Calculate days remaining until deadline
   */
  static calculateDaysRemaining(deadline: string): number {
    const deadlineDate = new Date(deadline);
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
} 