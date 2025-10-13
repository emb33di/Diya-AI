-- SQL script to verify admin notification system setup
-- Run this in Supabase SQL Editor to check if everything is configured correctly

-- Check 1: Verify pg_net extension is enabled
SELECT 
  'pg_net Extension Status' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED - Run: CREATE EXTENSION IF NOT EXISTS pg_net;'
  END as status;

-- Check 2: Verify the trigger function exists
SELECT 
  'notify_admin_of_new_user Function' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'notify_admin_of_new_user'
    )
    THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run migration: 20251013000000_add_admin_signup_notification.sql'
  END as status;

-- Check 3: Verify the trigger exists and is enabled
SELECT 
  'zz_notify_admin_on_user_created Trigger' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'zz_notify_admin_on_user_created'
      AND tgenabled = 'O'  -- 'O' means enabled
    )
    THEN '✅ EXISTS AND ENABLED'
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'zz_notify_admin_on_user_created'
    )
    THEN '⚠️  EXISTS BUT DISABLED'
    ELSE '❌ MISSING - Run migration: 20251013000000_add_admin_signup_notification.sql'
  END as status;

-- Check 4: List all triggers on auth.users table
SELECT 
  '--- All Triggers on auth.users ---' as info,
  '' as details
UNION ALL
SELECT 
  tgname as info,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END as details
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass
ORDER BY info;

-- Check 5: View function definition
SELECT 
  '--- Function Definition ---' as info,
  pg_get_functiondef(oid) as details
FROM pg_proc
WHERE proname = 'notify_admin_of_new_user';

-- Check 6: Test if net.http_post function is available (from pg_net)
SELECT 
  'net.http_post Function (from pg_net)' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'net' AND p.proname = 'http_post'
    )
    THEN '✅ AVAILABLE'
    ELSE '❌ NOT AVAILABLE - Enable pg_net extension'
  END as status;

-- Check 7: Recent user signups (last 10)
SELECT 
  '--- Recent User Signups (Last 10) ---' as info,
  '' as details
UNION ALL
SELECT 
  to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') || ' - ' || email as info,
  raw_user_meta_data->>'full_name' as details
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Summary
SELECT 
  '==================================' as summary,
  '' as action
UNION ALL
SELECT 
  'SETUP VERIFICATION COMPLETE' as summary,
  '' as action
UNION ALL
SELECT 
  '==================================' as summary,
  '' as action
UNION ALL
SELECT 
  'If all checks show ✅, the system is ready!' as summary,
  '' as action
UNION ALL
SELECT 
  'If any checks show ❌, follow the instructions in the status column' as summary,
  '' as action;

