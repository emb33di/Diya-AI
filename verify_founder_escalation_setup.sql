-- Verification queries for founder escalation notification setup

-- 1. Check if pg_net extension is enabled
SELECT 
  '1. pg_net Extension' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED - Run: CREATE EXTENSION IF NOT EXISTS pg_net;'
  END as status;

-- 2. Check if trigger exists
SELECT 
  '2. Trigger Exists' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'zz_notify_founder_on_escalation')
    THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status;

-- 3. Check if function exists
SELECT 
  '3. Function Exists' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_founder_of_escalation')
    THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status;

-- 4. Check if service role key is configured (this may return NULL if not set)
SELECT 
  '4. Service Role Key Config' as check_name,
  CASE 
    WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL
    THEN '✅ CONFIGURED'
    ELSE '⚠️ NOT CONFIGURED - May need to set via ALTER DATABASE or use Database Webhooks instead'
  END as status;

-- 5. Check if escalated_essays table exists
SELECT 
  '5. escalated_essays Table' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escalated_essays')
    THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status;

