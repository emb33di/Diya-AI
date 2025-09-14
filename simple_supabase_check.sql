-- Simple Supabase diagnostic queries
-- Run these ONE AT A TIME in your Supabase SQL editor

-- Step 1: Check if user_profiles table exists
SELECT 
    table_name,
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles';

-- Step 2: Check if profiles table exists
SELECT 
    table_name,
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Step 3: Check user_profiles table structure (only if table exists)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 4: Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- Step 5: Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Step 6: Try to count rows (this will fail if table doesn't exist or no permissions)
SELECT COUNT(*) as total_rows FROM user_profiles;

-- Step 7: Check permissions
SELECT 
    has_table_privilege('user_profiles', 'SELECT') as can_select,
    has_table_privilege('user_profiles', 'INSERT') as can_insert,
    has_table_privilege('user_profiles', 'UPDATE') as can_update;
