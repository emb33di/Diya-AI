-- Replace school_program_type enum with TEXT + CHECK constraint
-- This migration addresses case sensitivity issues and improves maintainability

-- Step 1: Change column types from enum to TEXT first
ALTER TABLE public.user_profiles 
ALTER COLUMN applying_to TYPE TEXT USING applying_to::text;

ALTER TABLE public.school_recommendations 
ALTER COLUMN school_program_type TYPE TEXT USING school_program_type::text;

-- Step 2: Convert existing values to lowercase text
UPDATE public.user_profiles 
SET applying_to = LOWER(applying_to)
WHERE applying_to IS NOT NULL;

UPDATE public.school_recommendations 
SET school_program_type = LOWER(school_program_type)
WHERE school_program_type IS NOT NULL;

-- Step 3: Add CHECK constraints to ensure data integrity
ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_applying_to_check 
CHECK (applying_to IN ('undergraduate', 'masters', 'mba', 'phd', 'llm'));

ALTER TABLE public.school_recommendations 
ADD CONSTRAINT school_recommendations_program_type_check 
CHECK (school_program_type IN ('undergraduate', 'masters', 'mba', 'phd', 'llm'));

-- Step 4: Drop the enum type (only if no other tables are using it)
-- First check if any other tables are using this enum
DO $$
BEGIN
    -- Only drop if no other tables are using this enum
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE udt_name = 'school_program_type' 
        AND table_name != 'user_profiles' 
        AND table_name != 'school_recommendations'
    ) THEN
        DROP TYPE IF EXISTS school_program_type;
    END IF;
END $$;

-- Step 5: Update indexes (they should still work with TEXT)
-- No changes needed to existing indexes

-- Step 6: Add comments to document the new approach
COMMENT ON COLUMN public.user_profiles.applying_to IS 'Program type applying to (undergraduate, masters, mba, phd, llm) - uses lowercase for consistency';
COMMENT ON COLUMN public.school_recommendations.school_program_type IS 'Program type for school recommendations (undergraduate, masters, mba, phd, llm) - uses lowercase for consistency';
