-- Verify unique constraints on user_profiles table
-- Run this in Supabase SQL editor to confirm no duplicates are possible

-- Check if unique constraint exists on user_id
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_profiles'::regclass
AND contype = 'u'; -- 'u' = unique constraint

-- Check for any existing duplicate user_ids (should return 0 rows)
SELECT 
    user_id, 
    COUNT(*) as duplicate_count
FROM user_profiles 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Check total number of users vs total user_profiles records
SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM user_profiles) as total_profiles,
    (SELECT COUNT(DISTINCT user_id) FROM user_profiles) as unique_profile_users;
