import { supabase } from '@/integrations/supabase/client';
import { SchoolProgramType, getUserProgramType } from '@/utils/userProfileUtils';

export interface EssayPrompt {
  id: string;
  college_name: string;
  how_many: string;
  selection_type: string;
  prompt_number: string;
  prompt: string;
  word_limit: string;
  prompt_selection_type: string;
  school_program_type?: SchoolProgramType;
  created_at: string;
  updated_at: string;
}

export interface EssayPromptSelection {
  id: string;
  user_id: string;
  school_name: string;
  college_name: string;
  prompt_number: string;
  prompt: string;
  word_limit: string;
  selected: boolean;
  essay_content?: string;
  school_program_type?: SchoolProgramType;
  created_at: string;
  updated_at: string;
}

export class EssayPromptService {
  /**
   * Get essay prompts for a specific college, optionally filtered by school program type
   */
  static async getPromptsForCollege(
    collegeName: string, 
    schoolProgramType?: SchoolProgramType
  ): Promise<EssayPrompt[]> {
    try {
      let query = supabase
        .from('essay_prompts')
        .select('*')
        .eq('college_name', collegeName);

      // Filter by school program type if provided
      if (schoolProgramType) {
        query = query.eq('school_program_type', schoolProgramType);
      }

      const { data, error } = await query.order('prompt_number');

      if (error) {
        console.error('Error fetching essay prompts:', error);
        throw error;
      }

      return (data || []) as EssayPrompt[];
    } catch (error) {
      console.error('Error in getPromptsForCollege:', error);
      throw error;
    }
  }

  /**
   * Get essay prompts for a specific college, automatically filtered by user's program type
   */
  static async getPromptsForCollegeForUser(collegeName: string): Promise<EssayPrompt[]> {
    try {
      const userProgramType = await getUserProgramType();
      return await this.getPromptsForCollege(collegeName, userProgramType || undefined);
    } catch (error) {
      console.error('Error in getPromptsForCollegeForUser:', error);
      throw error;
    }
  }

  /**
   * Get user's essay prompt selections for a specific school
   */
  static async getUserSelectionsForSchool(schoolName: string): Promise<EssayPromptSelection[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('essay_prompt_selections')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_name', schoolName)
        .order('created_at');

      if (error) {
        console.error('Error fetching user selections:', error);
        throw error;
      }

      return (data || []) as EssayPromptSelection[];
    } catch (error) {
      console.error('Error in getUserSelectionsForSchool:', error);
      throw error;
    }
  }

  /**
   * Create or update essay prompt selection
   */
  static async savePromptSelection(
    schoolName: string,
    collegeName: string,
    promptNumber: string,
    prompt: string,
    wordLimit: string,
    selected: boolean = true,
    essayContent?: string,
    schoolProgramType?: SchoolProgramType
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's program type if not provided
      const userProgramType = schoolProgramType || await getUserProgramType();

      const selectionData = {
        user_id: user.id,
        school_name: schoolName,
        college_name: collegeName,
        prompt_number: promptNumber,
        prompt: prompt,
        word_limit: wordLimit,
        selected: selected,
        essay_content: essayContent,
        school_program_type: userProgramType
      };

      // Check if selection already exists
      const { data: existing } = await (supabase as any)
        .from('essay_prompt_selections')
        .select('id')
        .eq('user_id', user.id)
        .eq('school_name', schoolName)
        .eq('prompt_number', promptNumber)
        .maybeSingle();

      if (existing) {
        // Update existing selection
        const { error } = await (supabase as any)
          .from('essay_prompt_selections')
          .update(selectionData)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new selection
        const { error } = await (supabase as any)
          .from('essay_prompt_selections')
          .insert(selectionData);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error in savePromptSelection:', error);
      throw error;
    }
  }

  /**
   * Update essay content for a specific selection
   */
  static async updateEssayContent(
    selectionId: string,
    essayContent: string
  ): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('essay_prompt_selections')
        .update({ essay_content: essayContent })
        .eq('id', selectionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in updateEssayContent:', error);
      throw error;
    }
  }

  /**
   * Get all user's essay prompt selections
   */
  static async getAllUserSelections(): Promise<EssayPromptSelection[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await (supabase as any)
        .from('essay_prompt_selections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at');

      if (error) {
        console.error('Error fetching all user selections:', error);
        throw error;
      }

      return (data || []) as EssayPromptSelection[];
    } catch (error) {
      console.error('Error in getAllUserSelections:', error);
      throw error;
    }
  }

  /**
   * Delete a prompt selection
   */
  static async deletePromptSelection(selectionId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('essay_prompt_selections')
        .delete()
        .eq('id', selectionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error in deletePromptSelection:', error);
      throw error;
    }
  }
}
