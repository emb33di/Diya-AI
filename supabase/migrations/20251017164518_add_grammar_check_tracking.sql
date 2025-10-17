-- Add grammar check tracking to essay_versions table
-- This enables tracking whether grammar check has been completed for each version

-- Add grammar check completion flag
ALTER TABLE public.essay_versions 
ADD COLUMN IF NOT EXISTS grammar_check_completed BOOLEAN DEFAULT FALSE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_essay_versions_grammar_check 
ON essay_versions(grammar_check_completed);

-- Add comment explaining the new field
COMMENT ON COLUMN essay_versions.grammar_check_completed IS 'Tracks whether grammar check has been completed for this version';

-- Update existing versions to have grammar_check_completed = FALSE
-- This ensures all existing versions start with the flag as FALSE
UPDATE public.essay_versions 
SET grammar_check_completed = FALSE 
WHERE grammar_check_completed IS NULL;
