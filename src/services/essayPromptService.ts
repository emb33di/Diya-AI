import { supabase } from '@/integrations/supabase/client';

export interface EssayPrompt {
  id: string;
  college_name: string;
  how_many: string;
  selection_type: string;
  prompt_number: string;
  prompt: string;
  word_limit: string;
  prompt_selection_type: string;
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
  created_at: string;
  updated_at: string;
}

export class EssayPromptService {
  /**
   * Get essay prompts for a specific college
   */
  static async getPromptsForCollege(collegeName: string): Promise<EssayPrompt[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('essay_prompts')
        .select('*')
        .eq('college_name', collegeName)
        .order('prompt_number');

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
    essayContent?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const selectionData = {
        user_id: user.id,
        school_name: schoolName,
        college_name: collegeName,
        prompt_number: promptNumber,
        prompt: prompt,
        word_limit: wordLimit,
        selected: selected,
        essay_content: essayContent
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
