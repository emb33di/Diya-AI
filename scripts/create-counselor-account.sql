-- Script to create a counselor account for IvySummit
-- 
-- STEP 1: Create the user in Supabase Auth (run this via Supabase Dashboard SQL Editor or Admin API)
-- 
-- Option A: Via Supabase Dashboard
-- 1. Go to Authentication > Users > Add User
-- 2. Enter email: counselor@ivysummit.com (or your desired email)
-- 3. Enter password: (set a secure password)
-- 4. Check "Auto Confirm User" 
-- 5. Click "Create User"
--
-- Option B: Via SQL (requires service role key - use Supabase Dashboard SQL Editor)
-- Note: This requires the auth.users table to be accessible, which typically requires service role
-- You may need to use the Admin API instead (see create-counselor-account.js)

-- STEP 2: After user is created, update the user_profiles table
-- Replace 'counselor@ivysummit.com' with the actual email you used
UPDATE user_profiles 
SET 
  is_counselor = true, 
  counselor_name = 'ivysummit'
WHERE email_address = 'counselor@ivysummit.com';

-- Verify the update
SELECT 
  user_id,
  email_address,
  full_name,
  is_counselor,
  counselor_name
FROM user_profiles
WHERE email_address = 'counselor@ivysummit.com';

