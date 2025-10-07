// Program type constants and utilities
// This provides a clean interface for working with program types

export const PROGRAMS = {
  undergraduate: 'Undergraduate',
  masters: "Master's Degree", 
  mba: 'MBA',
  phd: 'PhD',
  llm: 'Law'
} as const;

export type ProgramKey = keyof typeof PROGRAMS;
export type ProgramValue = typeof PROGRAMS[ProgramKey];

/**
 * Get the display label for a program type
 * @param programKey - The lowercase program key
 * @returns The display label for the program
 */
export function getProgramLabel(programKey: string): string {
  return PROGRAMS[programKey as ProgramKey] || programKey;
}

/**
 * Get all program options for select components
 * @returns Array of {value, label} objects for select components
 */
export function getProgramOptions() {
  return Object.entries(PROGRAMS).map(([value, label]) => ({
    value,
    label
  }));
}

/**
 * Validate if a program key is valid
 * @param programKey - The program key to validate
 * @returns True if valid, false otherwise
 */
export function isValidProgramKey(programKey: string): programKey is ProgramKey {
  return programKey in PROGRAMS;
}
