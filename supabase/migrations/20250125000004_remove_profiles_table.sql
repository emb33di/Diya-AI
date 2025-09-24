-- Remove profiles table entirely after data consolidation
-- This is the final step in the database consolidation process

-- First, verify that all data has been successfully migrated
DO $$
DECLARE
    profiles_count INTEGER;
    user_profiles_count INTEGER;
    users_with_profiles INTEGER;
    users_with_user_profiles INTEGER;
    orphaned_profiles INTEGER;
BEGIN
    -- Count records in each table
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO user_profiles_count FROM public.user_profiles;
    
    -- Count unique users in each table
    SELECT COUNT(DISTINCT user_id) INTO users_with_profiles FROM public.profiles;
    SELECT COUNT(DISTINCT user_id) INTO users_with_user_profiles FROM public.user_profiles;
    
    -- Check for orphaned profiles (users with profiles but no user_profiles)
    SELECT COUNT(*) INTO orphaned_profiles
    FROM public.profiles p
    LEFT JOIN public.user_profiles up ON p.user_id = up.user_id
    WHERE up.user_id IS NULL;
    
    -- Log the verification results
    RAISE NOTICE 'Pre-removal Verification:';
    RAISE NOTICE 'Profiles table records: %', profiles_count;
    RAISE NOTICE 'User_profiles table records: %', user_profiles_count;
    RAISE NOTICE 'Users with profiles: %', users_with_profiles;
    RAISE NOTICE 'Users with user_profiles: %', users_with_user_profiles;
    RAISE NOTICE 'Orphaned profiles: %', orphaned_profiles;
    
    -- Prevent removal if there are orphaned profiles
    IF orphaned_profiles > 0 THEN
        RAISE EXCEPTION 'Cannot remove profiles table: % orphaned profiles found. Please migrate data first.', orphaned_profiles;
    END IF;
    
    -- Check the specific user mentioned in the issue
    IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = '9f4789df-8a5f-42c0-aa67-f567c51bd2fa') THEN
        RAISE NOTICE 'Target user 9f4789df-8a5f-42c0-aa67-f567c51bd2fa verified in user_profiles';
    ELSE
        RAISE WARNING 'Target user 9f4789df-8a5f-42c0-aa67-f567c51bd2fa NOT found in user_profiles!';
    END IF;
    
    RAISE NOTICE 'Verification passed - proceeding with profiles table removal';
END $$;

-- Drop all policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Drop the trigger on profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- Drop indexes on profiles table
DROP INDEX IF EXISTS idx_profiles_applying_to;

-- Drop the profiles table entirely
DROP TABLE IF EXISTS public.profiles;

-- Clean up any remaining references to profiles table in functions
-- (The handle_new_user function was already updated in the previous migration)

-- Verify the removal was successful
DO $$
DECLARE
    table_exists BOOLEAN;
    user_profiles_count INTEGER;
BEGIN
    -- Check if profiles table still exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    ) INTO table_exists;
    
    -- Count remaining user_profiles records
    SELECT COUNT(*) INTO user_profiles_count FROM public.user_profiles;
    
    -- Log the results
    RAISE NOTICE 'Post-removal Verification:';
    RAISE NOTICE 'Profiles table exists: %', table_exists;
    RAISE NOTICE 'User_profiles records remaining: %', user_profiles_count;
    
    IF table_exists THEN
        RAISE EXCEPTION 'Profiles table still exists - removal failed!';
    ELSE
        RAISE NOTICE 'Profiles table successfully removed - consolidation complete!';
    END IF;
END $$;

-- Add final comment documenting the consolidation
COMMENT ON TABLE public.user_profiles IS 'Consolidated user profile table containing all user data. Previously split between profiles and user_profiles tables.';
