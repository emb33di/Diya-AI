-- Add custom deadline fields with program-aware structure to school_recommendations table
-- This allows users to set their own deadlines while maintaining program-specific semantics

-- Add custom deadline fields (4 slots that map to different deadline types based on program)
ALTER TABLE public.school_recommendations 
ADD COLUMN custom_deadline_1 TEXT,
ADD COLUMN custom_deadline_2 TEXT,
ADD COLUMN custom_deadline_3 TEXT,
ADD COLUMN custom_deadline_4 TEXT,
ADD COLUMN custom_deadline_labels JSONB DEFAULT '{}',
ADD COLUMN use_custom_deadlines BOOLEAN DEFAULT FALSE;

-- Add comments explaining the flexible structure
COMMENT ON COLUMN public.school_recommendations.custom_deadline_1 IS 'Custom deadline 1 - maps to Early Action/Round 1 based on program type';
COMMENT ON COLUMN public.school_recommendations.custom_deadline_2 IS 'Custom deadline 2 - maps to Early Decision 1/Round 2 based on program type';
COMMENT ON COLUMN public.school_recommendations.custom_deadline_3 IS 'Custom deadline 3 - maps to Early Decision 2/Round 3 based on program type';
COMMENT ON COLUMN public.school_recommendations.custom_deadline_4 IS 'Custom deadline 4 - maps to Regular Decision/Round 4 based on program type';
COMMENT ON COLUMN public.school_recommendations.custom_deadline_labels IS 'JSON object storing custom labels for each deadline slot (e.g., {"deadline_1": "Priority Round"})';
COMMENT ON COLUMN public.school_recommendations.use_custom_deadlines IS 'Whether to use custom deadlines instead of synced official deadlines';

-- Create index for custom deadline queries
CREATE INDEX idx_school_recommendations_custom_deadlines ON public.school_recommendations(use_custom_deadlines, custom_deadline_1, custom_deadline_2, custom_deadline_3, custom_deadline_4);

-- Create function to update last_updated timestamp when custom deadlines change
CREATE OR REPLACE FUNCTION update_school_recommendations_custom_deadlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if custom deadline fields actually changed
  IF (OLD.custom_deadline_1 IS DISTINCT FROM NEW.custom_deadline_1) OR
     (OLD.custom_deadline_2 IS DISTINCT FROM NEW.custom_deadline_2) OR
     (OLD.custom_deadline_3 IS DISTINCT FROM NEW.custom_deadline_3) OR
     (OLD.custom_deadline_4 IS DISTINCT FROM NEW.custom_deadline_4) OR
     (OLD.custom_deadline_labels IS DISTINCT FROM NEW.custom_deadline_labels) OR
     (OLD.use_custom_deadlines IS DISTINCT FROM NEW.use_custom_deadlines) THEN
    NEW.last_updated = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic last_updated updates on custom deadline changes
CREATE TRIGGER update_school_recommendations_custom_deadlines_updated_at
BEFORE UPDATE ON public.school_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_school_recommendations_custom_deadlines_updated_at();

-- Add RLS policies for custom deadline fields (inherit existing policies)
-- The existing policies already cover all columns, so custom deadline fields are automatically included

-- Create helper function to get program-aware deadline labels
CREATE OR REPLACE FUNCTION get_program_deadline_labels(program_type TEXT)
RETURNS JSONB AS $$
BEGIN
  CASE program_type
    WHEN 'mba' THEN
      RETURN '{"deadline_1": "Round 1", "deadline_2": "Round 2", "deadline_3": "Round 3", "deadline_4": "Round 4"}'::JSONB;
    WHEN 'undergraduate' THEN
      RETURN '{"deadline_1": "Early Action", "deadline_2": "Early Decision 1", "deadline_3": "Early Decision 2", "deadline_4": "Regular Decision"}'::JSONB;
    WHEN 'llm' THEN
      RETURN '{"deadline_1": "Early Round", "deadline_2": "Priority Round", "deadline_3": "Regular Round", "deadline_4": "Final Round"}'::JSONB;
    WHEN 'phd' THEN
      RETURN '{"deadline_1": "Early Application", "deadline_2": "Priority Deadline", "deadline_3": "Regular Deadline", "deadline_4": "Final Deadline"}'::JSONB;
    WHEN 'masters' THEN
      RETURN '{"deadline_1": "Early Round", "deadline_2": "Priority Round", "deadline_3": "Regular Round", "deadline_4": "Final Round"}'::JSONB;
    ELSE
      -- Default to undergraduate labels
      RETURN '{"deadline_1": "Early Action", "deadline_2": "Early Decision 1", "deadline_3": "Early Decision 2", "deadline_4": "Regular Decision"}'::JSONB;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create helper function to get effective deadline labels (custom or program default)
CREATE OR REPLACE FUNCTION get_effective_deadline_labels(school_rec RECORD, program_type TEXT)
RETURNS JSONB AS $$
DECLARE
  default_labels JSONB;
  effective_labels JSONB;
BEGIN
  -- Get default labels for the program type
  default_labels := get_program_deadline_labels(program_type);
  
  -- If custom labels exist and are not empty, merge them with defaults
  IF school_rec.custom_deadline_labels IS NOT NULL AND 
     jsonb_typeof(school_rec.custom_deadline_labels) = 'object' AND
     school_rec.custom_deadline_labels != '{}'::JSONB THEN
    effective_labels := default_labels || school_rec.custom_deadline_labels;
  ELSE
    effective_labels := default_labels;
  END IF;
  
  RETURN effective_labels;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the deadline mapping system
COMMENT ON FUNCTION get_program_deadline_labels(TEXT) IS 'Returns default deadline labels based on program type (MBA: Round 1-4, Undergraduate: Early Action/ED1-2/Regular)';
COMMENT ON FUNCTION get_effective_deadline_labels(RECORD, TEXT) IS 'Returns effective deadline labels combining program defaults with any custom user labels';
