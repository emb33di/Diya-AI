import { supabase } from "@/integrations/supabase/client";

export interface LORRecommender {
  id: string;
  userId: string;
  name: string;
  position: string;
  email?: string;
  phone?: string;
  relationship?: string;
  internalDeadline1?: string; // When to reach out
  internalDeadline2?: string; // Check-in about progress
  internalDeadline3?: string; // When recommender should submit
  status: 'not_contacted' | 'contacted' | 'agreed' | 'in_progress' | 'submitted' | 'declined';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  schoolAllocations?: LORSchoolAllocation[];
}

export interface LORSchoolAllocation {
  id: string;
  lorRecommenderId: string;
  schoolRecommendationId: string;
  schoolName: string;
  allocationStatus: 'pending' | 'allocated' | 'submitted' | 'declined';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolOption {
  id: string;
  school: string;
  category: string;
}

export interface LORDeadlineInfo {
  id: string;
  recommenderName: string;
  deadlineType: 'reach_out' | 'check_in' | 'submit';
  deadlineDate: string;
  daysRemaining: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical' | 'overdue';
  status: string;
}

export interface LORStats {
  total: number;
  notContacted: number;
  contacted: number;
  agreed: number;
  inProgress: number;
  submitted: number;
  declined: number;
  upcomingDeadlines: number;
  overdueDeadlines: number;
}

export class LORService {
  /**
   * Get all LOR recommenders for a user with school allocations
   */
  static async getUserRecommenders(userId: string): Promise<LORRecommender[]> {
    try {
      const { data, error } = await supabase
        .from('lor_recommenders')
        .select(`
          *,
          school_allocations:lor_school_allocations(
            id,
            school_recommendation_id,
            allocation_status,
            notes,
            created_at,
            updated_at,
            school_recommendations:school_recommendations(
              school
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[LOR_SERVICE_ERROR] Failed to fetch LOR recommenders:', {
          userId: userId,
          error: error.message,
          timestamp: new Date().toISOString(),
          message: 'User cannot load their recommenders list'
        });
        throw new Error('Failed to fetch recommenders');
      }

      // Transform the data to match our interface
      const recommenders = (data || []).map(recommender => ({
        ...recommender,
        schoolAllocations: recommender.school_allocations?.map((allocation: any) => ({
          id: allocation.id,
          lorRecommenderId: recommender.id,
          schoolRecommendationId: allocation.school_recommendation_id,
          schoolName: allocation.school_recommendations?.school || 'Unknown School',
          allocationStatus: allocation.allocation_status,
          notes: allocation.notes,
          createdAt: allocation.created_at,
          updatedAt: allocation.updated_at
        })) || []
      }));

      return recommenders;
    } catch (error) {
      console.error('[LOR_SERVICE_ERROR] Failed to get user recommenders:', {
        userId: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot access their recommenders data'
      });
      throw error;
    }
  }

  /**
   * Add a new LOR recommender
   */
  static async addRecommender(recommender: Omit<LORRecommender, 'id' | 'createdAt' | 'updatedAt'>): Promise<LORRecommender> {
    try {
      // Prepare data for insertion
      const insertData: any = {
        user_id: recommender.userId,
        name: recommender.name,
        position: recommender.position,
        status: recommender.status,
        internal_deadline_1: recommender.internalDeadline1,
        internal_deadline_2: recommender.internalDeadline2,
        internal_deadline_3: recommender.internalDeadline3
      };

      // Only add optional fields that have values
      if (recommender.email && recommender.email.trim()) {
        insertData.email = recommender.email;
      }
      if (recommender.phone && recommender.phone.trim()) {
        insertData.phone = recommender.phone;
      }

      const { data, error } = await supabase
        .from('lor_recommenders')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('[LOR_SERVICE_ERROR] Failed to add LOR recommender:', {
          userId: recommender.userId,
          recommenderName: recommender.name,
          error: error.message,
          timestamp: new Date().toISOString(),
          message: 'User cannot add recommender to their list'
        });
        throw new Error('Failed to add recommender');
      }

      return data;
    } catch (error) {
      console.error('[LOR_SERVICE_ERROR] Failed to add recommender:', {
        userId: recommender.userId,
        recommenderName: recommender.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot create new recommender'
      });
      throw error;
    }
  }

  /**
   * Update an existing LOR recommender
   */
  static async updateRecommender(id: string, updates: Partial<LORRecommender>): Promise<LORRecommender> {
    try {
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.status !== undefined) updateData.status = updates.status;
      
      // Handle optional fields - only update if they have values or are explicitly set to null
      if (updates.email !== undefined) {
        updateData.email = updates.email && updates.email.trim() ? updates.email : null;
      }
      if (updates.phone !== undefined) {
        updateData.phone = updates.phone && updates.phone.trim() ? updates.phone : null;
      }
      if (updates.internalDeadline1 !== undefined) {
        updateData.internal_deadline_1 = updates.internalDeadline1 && updates.internalDeadline1.trim() ? updates.internalDeadline1 : null;
      }
      if (updates.internalDeadline2 !== undefined) {
        updateData.internal_deadline_2 = updates.internalDeadline2 && updates.internalDeadline2.trim() ? updates.internalDeadline2 : null;
      }
      if (updates.internalDeadline3 !== undefined) {
        updateData.internal_deadline_3 = updates.internalDeadline3 && updates.internalDeadline3.trim() ? updates.internalDeadline3 : null;
      }

      const { data, error } = await supabase
        .from('lor_recommenders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating LOR recommender:', error);
        throw new Error('Failed to update recommender');
      }

      return data;
    } catch (error) {
      console.error('Error in updateRecommender:', error);
      throw error;
    }
  }

  /**
   * Delete a LOR recommender
   */
  static async deleteRecommender(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('lor_recommenders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting LOR recommender:', error);
        throw new Error('Failed to delete recommender');
      }

      return true;
    } catch (error) {
      console.error('Error in deleteRecommender:', error);
      throw error;
    }
  }

  /**
   * Get LOR deadline information for a user
   */
  static async getUserLORDeadlines(userId: string): Promise<LORDeadlineInfo[]> {
    try {
      const recommenders = await this.getUserRecommenders(userId);
      const deadlines: LORDeadlineInfo[] = [];

      recommenders.forEach(recommender => {
        // Add deadline 1 (reach out)
        if (recommender.internalDeadline1) {
          deadlines.push({
            id: `${recommender.id}-deadline1`,
            recommenderName: recommender.name,
            deadlineType: 'reach_out',
            deadlineDate: recommender.internalDeadline1,
            daysRemaining: this.calculateDaysRemaining(recommender.internalDeadline1),
            urgencyLevel: this.getUrgencyLevel(this.calculateDaysRemaining(recommender.internalDeadline1)),
            status: recommender.status
          });
        }

        // Add deadline 2 (check-in)
        if (recommender.internalDeadline2) {
          deadlines.push({
            id: `${recommender.id}-deadline2`,
            recommenderName: recommender.name,
            deadlineType: 'check_in',
            deadlineDate: recommender.internalDeadline2,
            daysRemaining: this.calculateDaysRemaining(recommender.internalDeadline2),
            urgencyLevel: this.getUrgencyLevel(this.calculateDaysRemaining(recommender.internalDeadline2)),
            status: recommender.status
          });
        }

        // Add deadline 3 (submit)
        if (recommender.internalDeadline3) {
          deadlines.push({
            id: `${recommender.id}-deadline3`,
            recommenderName: recommender.name,
            deadlineType: 'submit',
            deadlineDate: recommender.internalDeadline3,
            daysRemaining: this.calculateDaysRemaining(recommender.internalDeadline3),
            urgencyLevel: this.getUrgencyLevel(this.calculateDaysRemaining(recommender.internalDeadline3)),
            status: recommender.status
          });
        }
      });

      // Sort by urgency and days remaining
      return deadlines.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, overdue: -1 };
        const urgencyDiff = urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
        
        if (urgencyDiff !== 0) return urgencyDiff;
        return a.daysRemaining - b.daysRemaining;
      });
    } catch (error) {
      console.error('Error in getUserLORDeadlines:', error);
      throw error;
    }
  }

  /**
   * Get LOR statistics for a user
   */
  static async getUserLORStats(userId: string): Promise<LORStats> {
    try {
      const recommenders = await this.getUserRecommenders(userId);
      const deadlines = await this.getUserLORDeadlines(userId);

      const stats: LORStats = {
        total: recommenders.length,
        notContacted: recommenders.filter(r => r.status === 'not_contacted').length,
        contacted: recommenders.filter(r => r.status === 'contacted').length,
        agreed: recommenders.filter(r => r.status === 'agreed').length,
        inProgress: recommenders.filter(r => r.status === 'in_progress').length,
        submitted: recommenders.filter(r => r.status === 'submitted').length,
        declined: recommenders.filter(r => r.status === 'declined').length,
        upcomingDeadlines: deadlines.filter(d => d.daysRemaining >= 0 && d.daysRemaining <= 7).length,
        overdueDeadlines: deadlines.filter(d => d.daysRemaining < 0).length
      };

      return stats;
    } catch (error) {
      console.error('Error in getUserLORStats:', error);
      throw error;
    }
  }

  /**
   * Calculate days remaining until a deadline
   */
  private static calculateDaysRemaining(deadlineDate: string): number {
    const deadline = new Date(deadlineDate);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get user's school options for LOR allocation
   */
  static async getUserSchoolOptions(userId: string): Promise<SchoolOption[]> {
    try {
      const { data, error } = await supabase
        .from('school_recommendations')
        .select('id, school, category')
        .eq('student_id', userId)
        .order('school');

      if (error) {
        console.error('Error fetching school options:', error);
        throw new Error('Failed to fetch school options');
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserSchoolOptions:', error);
      throw error;
    }
  }

  /**
   * Add school allocation to a recommender
   */
  static async addSchoolAllocation(lorRecommenderId: string, schoolRecommendationId: string, notes?: string): Promise<LORSchoolAllocation> {
    try {
      const { data, error } = await supabase
        .from('lor_school_allocations')
        .insert([{
          lor_recommender_id: lorRecommenderId,
          school_recommendation_id: schoolRecommendationId,
          allocation_status: 'pending',
          notes: notes
        }])
        .select(`
          *,
          school_recommendations:school_recommendations(
            school
          )
        `)
        .single();

      if (error) {
        console.error('[LOR_SERVICE_ERROR] Failed to add school allocation:', {
          lorRecommenderId: lorRecommenderId,
          schoolRecommendationId: schoolRecommendationId,
          error: error.message,
          timestamp: new Date().toISOString(),
          message: 'User cannot assign school to recommender'
        });
        throw new Error('Failed to add school allocation');
      }

      return {
        id: data.id,
        lorRecommenderId: data.lor_recommender_id,
        schoolRecommendationId: data.school_recommendation_id,
        schoolName: data.school_recommendations?.school || 'Unknown School',
        allocationStatus: data.allocation_status,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in addSchoolAllocation:', error);
      throw error;
    }
  }

  /**
   * Update school allocation status
   */
  static async updateSchoolAllocation(allocationId: string, updates: Partial<LORSchoolAllocation>): Promise<LORSchoolAllocation> {
    try {
      const updateData: any = {};
      
      if (updates.allocationStatus !== undefined) updateData.allocation_status = updates.allocationStatus;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { data, error } = await supabase
        .from('lor_school_allocations')
        .update(updateData)
        .eq('id', allocationId)
        .select(`
          *,
          school_recommendations:school_recommendations(
            school
          )
        `)
        .single();

      if (error) {
        console.error('[LOR_SERVICE_ERROR] Failed to update school allocation:', {
          allocationId: allocationId,
          error: error.message,
          timestamp: new Date().toISOString(),
          message: 'User cannot update school allocation status'
        });
        throw new Error('Failed to update school allocation');
      }

      return {
        id: data.id,
        lorRecommenderId: data.lor_recommender_id,
        schoolRecommendationId: data.school_recommendation_id,
        schoolName: data.school_recommendations?.school || 'Unknown School',
        allocationStatus: data.allocation_status,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('[LOR_SERVICE_ERROR] Failed to update school allocation:', {
        allocationId: allocationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot modify school allocation'
      });
      throw error;
    }
  }

  /**
   * Remove school allocation
   */
  static async removeSchoolAllocation(allocationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('lor_school_allocations')
        .delete()
        .eq('id', allocationId);

      if (error) {
        console.error('[LOR_SERVICE_ERROR] Failed to remove school allocation:', {
          allocationId: allocationId,
          error: error.message,
          timestamp: new Date().toISOString(),
          message: 'User cannot remove school allocation from recommender'
        });
        throw new Error('Failed to remove school allocation');
      }

      return true;
    } catch (error) {
      console.error('[LOR_SERVICE_ERROR] Failed to remove school allocation:', {
        allocationId: allocationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot delete school allocation'
      });
      throw error;
    }
  }

  /**
   * Get urgency level based on days remaining
   */
  private static getUrgencyLevel(daysRemaining: number): 'low' | 'medium' | 'high' | 'critical' | 'overdue' {
    if (daysRemaining < 0) return 'overdue';
    if (daysRemaining <= 3) return 'critical';
    if (daysRemaining <= 7) return 'high';
    if (daysRemaining <= 14) return 'medium';
    return 'low';
  }
}
