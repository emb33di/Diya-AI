/**
 * Shared utility functions for program type mapping in edge functions
 * This ensures consistency across all edge functions
 */

export type SchoolProgramType = 'Undergraduate' | 'MBA' | 'LLM' | 'PhD' | 'Masters';
export type ApplyingToType = 'Undergraduate Colleges' | 'MBA' | 'LLM' | 'PhD' | 'Masters';

/**
 * Centralized mapping from applying_to values to SchoolProgramType
 * This ensures consistency across all services and edge functions
 */
export const APPLYING_TO_TO_PROGRAM_TYPE_MAP: Record<ApplyingToType, SchoolProgramType> = {
  'Undergraduate Colleges': 'Undergraduate',
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
 * Get user's program type from their profile data
 * @param userProfile - User profile data containing applying_to field
 * @param fallback - Fallback value if mapping fails
 * @returns The corresponding SchoolProgramType or fallback
 */
export function getUserProgramTypeFromProfile(
  userProfile: { applying_to?: string | null } | null | undefined,
  fallback: SchoolProgramType = 'Undergraduate'
): SchoolProgramType {
  return mapApplyingToToProgramTypeWithFallback(userProfile?.applying_to, fallback);
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
