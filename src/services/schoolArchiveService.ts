import { supabase } from "@/integrations/supabase/client";

export interface ArchivedSchool {
  id: string;
  student_id: string;
  school_name: string;
  school_type?: string;
  category: 'reach' | 'target' | 'safety';
  acceptance_rate?: string;
  school_ranking?: string;
  first_round_deadline?: string;
  early_action_deadline?: string;
  early_decision_1_deadline?: string;
  early_decision_2_deadline?: string;
  regular_decision_deadline?: string;
  notes?: string;
  student_thesis?: string;
  archived_at: string;
  created_at: string;
  updated_at: string;
}

export interface RestoreSchoolData {
  school_name: string;
  school_type?: string;
  category: 'reach' | 'target' | 'safety';
  acceptance_rate?: string;
  school_ranking?: string;
  first_round_deadline?: string;
  early_action_deadline?: string;
  early_decision_1_deadline?: string;
  early_decision_2_deadline?: string;
  regular_decision_deadline?: string;
  notes?: string;
  student_thesis?: string;
}

export class SchoolArchiveService {
  /**
   * Archive a school by moving it from school_recommendations to school_archive
   */
  static async archiveSchool(schoolId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the school data from school_recommendations
      const { data: schoolData, error: fetchError } = await supabase
        .from('school_recommendations')
        .select('*')
        .eq('id', schoolId)
        .eq('student_id', user.id)
        .single();

      if (fetchError || !schoolData) {
        throw new Error('School not found or access denied');
      }

      // Insert into archive
      const { error: archiveError } = await supabase
        .from('school_archive')
        .insert({
          student_id: user.id,
          school_name: schoolData.school,
          school_type: schoolData.school_type,
          category: schoolData.category,
          acceptance_rate: schoolData.acceptance_rate,
          school_ranking: schoolData.school_ranking,
          first_round_deadline: schoolData.first_round_deadline,
          early_action_deadline: schoolData.early_action_deadline,
          early_decision_1_deadline: schoolData.early_decision_1_deadline,
          early_decision_2_deadline: schoolData.early_decision_2_deadline,
          regular_decision_deadline: schoolData.regular_decision_deadline,
          notes: schoolData.notes,
          student_thesis: schoolData.student_thesis,
        });

      if (archiveError) {
        throw new Error(`Failed to archive school: ${archiveError.message}`);
      }

      // Delete from school_recommendations
      const { error: deleteError } = await supabase
        .from('school_recommendations')
        .delete()
        .eq('id', schoolId)
        .eq('student_id', user.id);

      if (deleteError) {
        throw new Error(`Failed to remove school: ${deleteError.message}`);
      }

      return {
        success: true,
        message: 'School archived successfully'
      };
    } catch (error) {
      console.error('Error archiving school:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to archive school'
      };
    }
  }

  /**
   * Get all archived schools for the current user
   */
  static async getArchivedSchools(): Promise<{ success: boolean; schools: ArchivedSchool[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: archivedSchools, error } = await supabase
        .from('school_archive')
        .select('*')
        .eq('student_id', user.id)
        .order('archived_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch archived schools: ${error.message}`);
      }

      return {
        success: true,
        schools: archivedSchools || []
      };
    } catch (error) {
      console.error('Error fetching archived schools:', error);
      return {
        success: false,
        schools: [],
        error: error instanceof Error ? error.message : 'Failed to fetch archived schools'
      };
    }
  }

  /**
   * Restore a school from archive to school_recommendations
   */
  static async restoreSchool(archivedSchoolId: string, newCategory: 'reach' | 'target' | 'safety'): Promise<{ success: boolean; message: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the archived school data
      const { data: archivedSchool, error: fetchError } = await supabase
        .from('school_archive')
        .select('*')
        .eq('id', archivedSchoolId)
        .eq('student_id', user.id)
        .single();

      if (fetchError || !archivedSchool) {
        throw new Error('Archived school not found or access denied');
      }

      // Insert back into school_recommendations with new category
      const { error: restoreError } = await supabase
        .from('school_recommendations')
        .insert({
          student_id: user.id,
          school: archivedSchool.school_name,
          school_type: archivedSchool.school_type,
          category: newCategory,
          acceptance_rate: archivedSchool.acceptance_rate,
          school_ranking: archivedSchool.school_ranking,
          first_round_deadline: archivedSchool.first_round_deadline,
          early_action_deadline: archivedSchool.early_action_deadline,
          early_decision_1_deadline: archivedSchool.early_decision_1_deadline,
          early_decision_2_deadline: archivedSchool.early_decision_2_deadline,
          regular_decision_deadline: archivedSchool.regular_decision_deadline,
          notes: archivedSchool.notes,
          student_thesis: archivedSchool.student_thesis,
        });

      if (restoreError) {
        throw new Error(`Failed to restore school: ${restoreError.message}`);
      }

      // Delete from archive
      const { error: deleteError } = await supabase
        .from('school_archive')
        .delete()
        .eq('id', archivedSchoolId)
        .eq('student_id', user.id);

      if (deleteError) {
        throw new Error(`Failed to remove from archive: ${deleteError.message}`);
      }

      return {
        success: true,
        message: 'School restored successfully'
      };
    } catch (error) {
      console.error('Error restoring school:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to restore school'
      };
    }
  }

  /**
   * Permanently delete a school from archive
   */
  static async permanentlyDeleteSchool(archivedSchoolId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('school_archive')
        .delete()
        .eq('id', archivedSchoolId)
        .eq('student_id', user.id);

      if (error) {
        throw new Error(`Failed to delete school: ${error.message}`);
      }

      return {
        success: true,
        message: 'School permanently deleted'
      };
    } catch (error) {
      console.error('Error deleting school:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete school'
      };
    }
  }
}
