-- Simplify custom deadline schema to use single field instead of four separate fields
-- This migration removes the complex multi-deadline structure and replaces it with a simple single custom deadline

-- Remove the four separate custom deadline fields
ALTER TABLE public.school_recommendations 
DROP COLUMN IF EXISTS custom_deadline_1,
DROP COLUMN IF EXISTS custom_deadline_2,
DROP COLUMN IF EXISTS custom_deadline_3,
DROP COLUMN IF EXISTS custom_deadline_4,
DROP COLUMN IF EXISTS custom_deadline_labels;

-- Add single custom deadline field
ALTER TABLE public.school_recommendations 
ADD COLUMN custom_deadline TEXT,
ADD COLUMN use_custom_deadline BOOLEAN DEFAULT FALSE;

-- Add comments explaining the simplified structure
COMMENT ON COLUMN public.school_recommendations.custom_deadline IS 'User-defined personal deadline date';
COMMENT ON COLUMN public.school_recommendations.use_custom_deadline IS 'Whether to use custom deadline instead of official deadline';

-- Create index for custom deadline queries
CREATE INDEX IF NOT EXISTS idx_school_recommendations_custom_deadline ON public.school_recommendations(use_custom_deadline, custom_deadline);

-- Update the trigger function to handle the simplified custom deadline field
CREATE OR REPLACE FUNCTION update_school_recommendations_custom_deadlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if custom deadline fields actually changed
  IF (OLD.custom_deadline IS DISTINCT FROM NEW.custom_deadline) OR
     (OLD.use_custom_deadline IS DISTINCT FROM NEW.use_custom_deadline) THEN
    NEW.last_updated = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the old trigger and create new one
DROP TRIGGER IF EXISTS update_school_recommendations_custom_deadlines_updated_at ON public.school_recommendations;
CREATE TRIGGER update_school_recommendations_custom_deadline_updated_at
BEFORE UPDATE ON public.school_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_school_recommendations_custom_deadlines_updated_at();

-- Remove the complex helper functions that are no longer needed
DROP FUNCTION IF EXISTS get_program_deadline_labels(TEXT);
DROP FUNCTION IF EXISTS get_effective_deadline_labels(RECORD, TEXT);

-- Add comment explaining the simplified deadline system
COMMENT ON TABLE public.school_recommendations IS 'School recommendations with simplified custom deadline support - users can set one personal deadline per school';
