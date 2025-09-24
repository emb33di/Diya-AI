-- Migrate all data from profiles table to user_profiles table
-- This ensures complete data consolidation before removing the profiles table

-- First, ensure all users have a user_profiles record
-- Create user_profiles records for any users who only have profiles records
INSERT INTO public.user_profiles (
    user_id,
    full_name,
    applying_to,
    onboarding_complete,
    created_at,
    updated_at
)
SELECT 
    p.user_id,
    p.full_name,
    p.applying_to::school_program_type,
    p.onboarding_complete,
    p.created_at,
    p.updated_at
FROM public.profiles p
LEFT JOIN public.user_profiles up ON p.user_id = up.user_id
WHERE up.user_id IS NULL;

-- Update existing user_profiles records with any missing data from profiles
-- This handles cases where profiles has more recent data
UPDATE public.user_profiles 
SET 
    full_name = COALESCE(user_profiles.full_name, p.full_name),
    applying_to = COALESCE(user_profiles.applying_to, p.applying_to::school_program_type),
    onboarding_complete = COALESCE(user_profiles.onboarding_complete, p.onboarding_complete),
    updated_at = GREATEST(user_profiles.updated_at, p.updated_at)
FROM public.profiles p
WHERE user_profiles.user_id = p.user_id
AND (
    user_profiles.full_name IS NULL OR 
    user_profiles.applying_to IS NULL OR 
    user_profiles.onboarding_complete IS NULL OR
    p.updated_at > user_profiles.updated_at
);

-- Verify data consistency after migration
DO $$
DECLARE
    profiles_count INTEGER;
    user_profiles_count INTEGER;
    users_with_profiles INTEGER;
    users_with_user_profiles INTEGER;
    inconsistent_users INTEGER;
BEGIN
    -- Count records in each table
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO user_profiles_count FROM public.user_profiles;
    
    -- Count unique users in each table
    SELECT COUNT(DISTINCT user_id) INTO users_with_profiles FROM public.profiles;
    SELECT COUNT(DISTINCT user_id) INTO users_with_user_profiles FROM public.user_profiles;
    
    -- Check for data inconsistencies
    SELECT COUNT(*) INTO inconsistent_users
    FROM (
        SELECT p.user_id
        FROM public.profiles p
        LEFT JOIN public.user_profiles up ON p.user_id = up.user_id
        WHERE up.user_id IS NULL
        OR p.full_name != up.full_name
        OR p.applying_to::school_program_type != up.applying_to
        OR p.onboarding_complete != up.onboarding_complete
    ) AS inconsistencies;
    
    -- Log the results
    RAISE NOTICE 'Data Migration Summary:';
    RAISE NOTICE 'Profiles table records: %', profiles_count;
    RAISE NOTICE 'User_profiles table records: %', user_profiles_count;
    RAISE NOTICE 'Users with profiles: %', users_with_profiles;
    RAISE NOTICE 'Users with user_profiles: %', users_with_user_profiles;
    RAISE NOTICE 'Inconsistent users: %', inconsistent_users;
    
    -- Validate the migration
    IF inconsistent_users > 0 THEN
        RAISE WARNING 'Data inconsistencies detected! Please review before proceeding.';
    ELSE
        RAISE NOTICE 'Data migration completed successfully - all data is consistent';
    END IF;
    
    -- Check the specific user mentioned in the issue
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = '9f4789df-8a5f-42c0-aa67-f567c51bd2fa') THEN
        RAISE NOTICE 'Target user 9f4789df-8a5f-42c0-aa67-f567c51bd2fa found in user_profiles';
    ELSE
        RAISE WARNING 'Target user 9f4789df-8a5f-42c0-aa67-f567c51bd2fa NOT found in user_profiles!';
    END IF;
END $$;
