-- Add school_program_type field to school_recommendations table
ALTER TABLE public.school_recommendations 
ADD COLUMN IF NOT EXISTS school_program_type school_program_type;

-- Update the existing school_type constraint to be more specific about institutional types
ALTER TABLE public.school_recommendations 
DROP CONSTRAINT IF EXISTS school_recommendations_school_type_check;

ALTER TABLE public.school_recommendations 
ADD CONSTRAINT school_recommendations_school_type_check 
CHECK (school_type IN ('public', 'private', 'liberal_arts', 'research_university', 'community_college', 'technical_institute', 'ivy_league'));

-- Add index for the new field
CREATE INDEX IF NOT EXISTS idx_school_recommendations_program_type ON public.school_recommendations(school_program_type);
