import { supabase } from '@/integrations/supabase/client';

export type SchoolProgramType = 'Undergraduate' | 'MBA' | 'LLM' | 'PhD' | 'Masters';
export type ApplyingToType = 'Undergraduate' | 'MBA' | 'LLM' | 'PhD' | 'Masters';

/**
 * Centralized mapping from applying_to values to SchoolProgramType
 * This ensures consistency across all services and edge functions
 * Now using the same values as the database enum
 */
export const APPLYING_TO_TO_PROGRAM_TYPE_MAP: Record<ApplyingToType, SchoolProgramType> = {
  'Undergraduate': 'Undergraduate',
  'MBA': 'MBA',
  'LLM': 'LLM',
  'PhD': 'PhD',
  'Masters': 'Masters'
};

/**
 * Convert applying_to value to SchoolProgramType
 * @param applyingTo - The applying_to value from user profile
 * @returns The corresponding SchoolProgramType or null if invalid
 */
export function mapApplyingToToProgramType(applyingTo: string | null | undefined): SchoolProgramType | null {
  if (!applyingTo) return null;
  
  const programType = APPLYING_TO_TO_PROGRAM_TYPE_MAP[applyingTo as ApplyingToType];
  return programType || null;
}

/**
 * Convert applying_to value to SchoolProgramType with fallback
 * @param applyingTo - The applying_to value from user profile
 * @param fallback - Fallback value if mapping fails
 * @returns The corresponding SchoolProgramType or fallback
 */
export function mapApplyingToToProgramTypeWithFallback(
  applyingTo: string | null | undefined, 
  fallback: SchoolProgramType = 'Undergraduate'
): SchoolProgramType {
  return mapApplyingToToProgramType(applyingTo) || fallback;
}

/**
 * Convert SchoolProgramType to applying_to value (reverse mapping)
 * @param programType - The SchoolProgramType from database
 * @returns The corresponding ApplyingToType or null if invalid
 */
export function mapProgramTypeToApplyingTo(programType: string | null | undefined): ApplyingToType | null {
  if (!programType) return null;
  
  // Since values are now the same, we can return the programType directly
  return programType as ApplyingToType;
}

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

    return mapApplyingToToProgramType(data?.applying_to);
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

/**
 * Get all valid applying_to values
 */
export function getValidApplyingToValues(): ApplyingToType[] {
  return Object.keys(APPLYING_TO_TO_PROGRAM_TYPE_MAP) as ApplyingToType[];
}

/**
 * Get all valid program types
 */
export function getValidProgramTypes(): SchoolProgramType[] {
  return Object.values(APPLYING_TO_TO_PROGRAM_TYPE_MAP);
}

/**
 * Check if an applying_to value is valid
 */
export function isValidApplyingToValue(value: string): value is ApplyingToType {
  return value in APPLYING_TO_TO_PROGRAM_TYPE_MAP;
}

/**
 * Check if a program type is valid
 */
export function isValidProgramType(value: string): value is SchoolProgramType {
  return Object.values(APPLYING_TO_TO_PROGRAM_TYPE_MAP).includes(value as SchoolProgramType);
}
