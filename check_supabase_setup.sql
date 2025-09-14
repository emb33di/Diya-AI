-- Check Supabase setup for 406 errors
-- Run these queries in your Supabase SQL editor

-- 1. Check if user_profiles table exists
SELECT 
    table_name,
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'profiles')
ORDER BY table_name;

-- 2. Check user_profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- 4. Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 5. Check if there are any rows in user_profiles
SELECT COUNT(*) as total_rows FROM user_profiles;

-- 6. Check sample data (if any exists)
SELECT * FROM user_profiles LIMIT 3;

-- 7. Check migration history
SELECT 
    version,
    statements,
    executed_at
FROM supabase_migrations.schema_migrations 
WHERE version LIKE '%user_profiles%'
ORDER BY executed_at DESC;

-- 8. Check if the current user can access the table
SELECT 
    has_table_privilege('user_profiles', 'SELECT') as can_select,
    has_table_privilege('user_profiles', 'INSERT') as can_insert,
    has_table_privilege('user_profiles', 'UPDATE') as can_update,
    has_table_privilege('user_profiles', 'DELETE') as can_delete;

-- 9. Check for any constraints or indexes that might cause issues
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass;

-- 10. Check if there are any triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_profiles';
