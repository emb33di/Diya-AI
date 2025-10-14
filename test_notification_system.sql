-- Test the notification system setup

-- 1. Check if pg_net extension is enabled
SELECT 
  '1. pg_net Extension' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED'
  END as status;

-- 2. Check if the function exists
SELECT 
  '2. notify_admin_of_new_user Function' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_admin_of_new_user')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 3. Check if the trigger exists
SELECT 
  '3. zz_notify_admin_on_user_created Trigger' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'zz_notify_admin_on_user_created'
      AND tgenabled = 'O'
    )
    THEN '✅ EXISTS AND ENABLED'
    ELSE '❌ MISSING OR DISABLED'
  END as status;

-- 4. List all triggers on auth.users
SELECT 
  '4. All auth.users Triggers' as info,
  tgname as trigger_name
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass
ORDER BY tgname;


