-- Add profile_saved flag to user_profiles table
-- This flag indicates whether the user has completed their initial profile setup
-- and should not be forced to reconfirm their profile on subsequent logins

-- Add profile_saved field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS profile_saved BOOLEAN NOT NULL DEFAULT false;

-- Add comment to document the field purpose
COMMENT ON COLUMN public.user_profiles.profile_saved IS 'Whether the user has completed their initial profile setup and should not be forced to reconfirm';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_saved ON public.user_profiles(profile_saved);

-- Set profile_saved = true for existing users who have completed onboarding
-- This ensures existing users don't get forced to reconfirm their profiles
UPDATE public.user_profiles 
SET profile_saved = true 
WHERE onboarding_complete = true;

-- Verify the migration by checking data consistency
DO $$
DECLARE
    total_users INTEGER;
    onboarding_complete_count INTEGER;
    profile_saved_count INTEGER;
    migrated_count INTEGER;
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO total_users FROM public.user_profiles;
    
    -- Count users with onboarding_complete = true
    SELECT COUNT(*) INTO onboarding_complete_count 
    FROM public.user_profiles 
    WHERE onboarding_complete = true;
    
    -- Count users with profile_saved = true
    SELECT COUNT(*) INTO profile_saved_count 
    FROM public.user_profiles 
    WHERE profile_saved = true;
    
    -- Count users who were migrated (had onboarding_complete = true)
    SELECT COUNT(*) INTO migrated_count 
    FROM public.user_profiles 
    WHERE onboarding_complete = true AND profile_saved = true;
    
    -- Log the results
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Users with onboarding_complete = true: %', onboarding_complete_count;
    RAISE NOTICE 'Users with profile_saved = true: %', profile_saved_count;
    RAISE NOTICE 'Users migrated (onboarding_complete -> profile_saved): %', migrated_count;
    
    -- Verify migration was successful
    IF migrated_count = onboarding_complete_count THEN
        RAISE NOTICE 'Migration verification: SUCCESS - All users with completed onboarding now have profile_saved = true';
    ELSE
        RAISE WARNING 'Migration verification: WARNING - Some users may not have been migrated correctly';
    END IF;
END $$;
