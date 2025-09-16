import { supabase } from '@/integrations/supabase/client';

export type SchoolProgramType = 'Undergraduate' | 'MBA' | 'LLM' | 'PhD' | 'Masters';

/**
 * Get the user's program type from their profile
 * Maps the applying_to field to the appropriate school_program_type
 */
export async function getUserProgramType(): Promise<SchoolProgramType | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('applying_to')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user program type:', error);
      return null;
    }

    if (!data?.applying_to) return null;

    // Map the applying_to values to school_program_type enum values
    const programTypeMap: Record<string, SchoolProgramType> = {
      'Undergraduate Colleges': 'Undergraduate',
      'MBA': 'MBA',
      'LLM': 'LLM',
      'PhD': 'PhD',
      'Masters': 'Masters'
    };

    return programTypeMap[data.applying_to] || null;
  } catch (error) {
    console.error('Error in getUserProgramType:', error);
    return null;
  }
}

/**
 * Check if a user is applying to undergraduate programs
 */
export async function isUndergraduateUser(): Promise<boolean> {
  const programType = await getUserProgramType();
  return programType === 'Undergraduate';
}

/**
 * Check if a user is applying to MBA programs
 */
export async function isMBAUser(): Promise<boolean> {
  const programType = await getUserProgramType();
  return programType === 'MBA';
}

/**
 * Check if a user is applying to graduate programs (MBA, LLM, PhD, Masters)
 */
export async function isGraduateUser(): Promise<boolean> {
  const programType = await getUserProgramType();
  return ['MBA', 'LLM', 'PhD', 'Masters'].includes(programType || '');
}
