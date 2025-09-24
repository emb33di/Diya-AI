-- Add onboarding_complete field to user_profiles table
-- This is the first step in consolidating profiles and user_profiles tables

-- Add onboarding_complete field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false;

-- Add comment to document the field purpose
COMMENT ON COLUMN public.user_profiles.onboarding_complete IS 'Whether the user has completed the onboarding process';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_complete ON public.user_profiles(onboarding_complete);

-- Migrate existing onboarding_complete data from profiles to user_profiles
-- This ensures we preserve all existing data during the consolidation
UPDATE public.user_profiles 
SET onboarding_complete = p.onboarding_complete
FROM public.profiles p
WHERE user_profiles.user_id = p.user_id 
AND p.onboarding_complete IS NOT NULL;

-- For any user_profiles records that don't have a corresponding profiles record,
-- set onboarding_complete to false (safe default)
UPDATE public.user_profiles 
SET onboarding_complete = false
WHERE onboarding_complete IS NULL;

-- Verify the migration by checking data consistency
-- This query will help identify any issues before proceeding
DO $$
DECLARE
    profiles_count INTEGER;
    user_profiles_count INTEGER;
    migrated_count INTEGER;
BEGIN
    -- Count records in profiles table
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    
    -- Count records in user_profiles table
    SELECT COUNT(*) INTO user_profiles_count FROM public.user_profiles;
    
    -- Count successfully migrated records
    SELECT COUNT(*) INTO migrated_count 
    FROM public.user_profiles up
    JOIN public.profiles p ON up.user_id = p.user_id
    WHERE up.onboarding_complete = p.onboarding_complete;
    
    -- Log the results
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE 'Profiles table records: %', profiles_count;
    RAISE NOTICE 'User_profiles table records: %', user_profiles_count;
    RAISE NOTICE 'Successfully migrated records: %', migrated_count;
    
    -- Check for any data inconsistencies
    IF migrated_count != profiles_count THEN
        RAISE WARNING 'Data inconsistency detected! % profiles records vs % migrated records', profiles_count, migrated_count;
    ELSE
        RAISE NOTICE 'Data migration completed successfully - all records migrated';
    END IF;
END $$;
