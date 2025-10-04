-- Fix NULL applying_to values in existing user profiles
-- This migration addresses the NOT NULL constraint violation

-- Step 1: Update all NULL applying_to values to 'undergraduate' as default
UPDATE public.user_profiles 
SET applying_to = 'undergraduate'
WHERE applying_to IS NULL;

-- Step 2: Verify no NULL values remain
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM public.user_profiles 
    WHERE applying_to IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Still have % NULL values in applying_to column', null_count;
    ELSE
        RAISE NOTICE 'Successfully updated all NULL applying_to values to default';
    END IF;
END $$;

-- Step 3: Add comment to document the fix
COMMENT ON COLUMN public.user_profiles.applying_to IS 'Program type applying to (undergraduate, masters, mba, phd, llm) - NOT NULL with CHECK constraint, defaults to undergraduate for existing NULL values';
