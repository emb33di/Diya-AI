-- Quick test for all pending migrations
-- Run this in Supabase SQL editor for a quick assessment

-- Quick check: Are all the key migrations applied?
SELECT 
    'QUICK_MIGRATION_CHECK' as test,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essay_checkpoints') THEN 'EXISTS' ELSE 'MISSING' END as essay_checkpoints_table,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_comments' AND column_name = 'original_source') THEN 'EXISTS' ELSE 'MISSING' END as essay_comments_enhanced,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN 'EXISTS' ELSE 'MISSING' END as handle_new_user_function,
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN 'EXISTS' ELSE 'MISSING' END as auth_user_trigger,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_user_profiles_atomic' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN 'EXISTS' ELSE 'MISSING' END as atomic_function,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_activities' AND column_name = 'location') THEN 'EXISTS' ELSE 'MISSING' END as resume_location,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'cumulative_onboarding_time') THEN 'EXISTS' ELSE 'MISSING' END as cumulative_time,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_tracking' AND column_name = 'conversation_id') THEN 'EXISTS' ELSE 'MISSING' END as conversation_tracking_fixed,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_metadata' AND column_name = 'conversation_id' AND data_type = 'text') THEN 'EXISTS' ELSE 'MISSING' END as conversation_metadata_fixed;
