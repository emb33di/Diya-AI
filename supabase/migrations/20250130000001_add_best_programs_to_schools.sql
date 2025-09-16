-- Add best_programs field to schools table for graduate schools
-- This migration adds the best_programs field to accommodate graduate school data

-- Add best_programs field to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS best_programs TEXT;

-- Add index for the new field for better query performance
CREATE INDEX IF NOT EXISTS idx_schools_best_programs ON public.schools(best_programs);

-- Add comment to document the field purpose
COMMENT ON COLUMN public.schools.best_programs IS 'Best programs offered by the school (e.g., "Computer Science, Engineering, Robotics")';
