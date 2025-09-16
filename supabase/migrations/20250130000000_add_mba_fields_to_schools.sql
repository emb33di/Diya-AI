-- Add MBA-specific fields to schools table
-- This migration adds GRE and GMAT range fields and updates institutional_type constraint

-- Add GRE range field for MBA programs
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS gre_range TEXT;

-- Add GMAT range field for MBA programs  
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS gmat_range TEXT;

-- Update institutional_type constraint to allow pipe-separated values
-- First drop the existing constraint
ALTER TABLE public.schools 
DROP CONSTRAINT IF EXISTS schools_institutional_type_check;

-- Add new constraint that allows pipe-separated values like "private|ivy_league"
ALTER TABLE public.schools 
ADD CONSTRAINT schools_institutional_type_check 
CHECK (
    institutional_type ~ '^[a-z_]+(\|[a-z_]+)*$' OR 
    institutional_type IN ('public', 'private', 'liberal_arts', 'research_university', 'community_college', 'technical_institute', 'ivy_league')
);

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_schools_gre_range ON public.schools(gre_range);
CREATE INDEX IF NOT EXISTS idx_schools_gmat_range ON public.schools(gmat_range);

-- Add comments to document the new fields
COMMENT ON COLUMN public.schools.gre_range IS 'GRE score range for MBA programs (e.g., "150-170")';
COMMENT ON COLUMN public.schools.gmat_range IS 'GMAT score range for MBA programs (e.g., "630-790")';
