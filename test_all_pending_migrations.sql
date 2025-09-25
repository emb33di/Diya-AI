-- Comprehensive test to check if all pending migrations have been applied
-- Run this in your Supabase SQL editor to verify migration status

-- ==============================================
-- TEST 1: Essay Prompts Table Structure (20250118000000)
-- ==============================================
SELECT 
    'ESSAY_PROMPTS_STRUCTURE_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_prompts' AND column_name = 'id'
    ) THEN 'EXISTS' ELSE 'MISSING' END as id_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_prompts' AND column_name = 'title'
    ) THEN 'EXISTS' ELSE 'MISSING' END as title_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_prompts' AND column_name = 'college_name'
    ) THEN 'EXISTS' ELSE 'MISSING' END as college_name_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_prompts' AND column_name = 'school_program_type'
    ) THEN 'EXISTS' ELSE 'MISSING' END as school_program_type_column;

-- ==============================================
-- TEST 2: Essay Checkpoints Table (20250118000001)
-- ==============================================
SELECT 
    'ESSAY_CHECKPOINTS_TABLE_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'essay_checkpoints'
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_exists,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_checkpoints' AND column_name = 'version_number'
    ) THEN 'EXISTS' ELSE 'MISSING' END as version_number_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_checkpoints' AND column_name = 'is_fresh_draft'
    ) THEN 'EXISTS' ELSE 'MISSING' END as is_fresh_draft_column;

-- ==============================================
-- TEST 3: Essay Comments Original Source Column (20250118000002)
-- ==============================================
SELECT 
    'ESSAY_COMMENTS_ORIGINAL_SOURCE_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_comments' AND column_name = 'original_source'
    ) THEN 'EXISTS' ELSE 'MISSING' END as original_source_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_comments' AND column_name = 'comment_nature'
    ) THEN 'EXISTS' ELSE 'MISSING' END as comment_nature_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_comments' AND column_name = 'organization_category'
    ) THEN 'EXISTS' ELSE 'MISSING' END as organization_category_column;

-- ==============================================
-- TEST 4: Handle New User Function (20250125000005)
-- ==============================================
SELECT 
    'HANDLE_NEW_USER_FUNCTION_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN 'EXISTS' ELSE 'MISSING' END as function_exists;

-- ==============================================
-- TEST 5: Auth User Created Trigger (20250125000006)
-- ==============================================
SELECT 
    'AUTH_USER_CREATED_TRIGGER_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN 'EXISTS' ELSE 'MISSING' END as trigger_exists;

-- ==============================================
-- TEST 6: Atomic Function Update (20250125000007)
-- ==============================================
SELECT 
    'ATOMIC_FUNCTION_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'create_user_profiles_atomic' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN 'EXISTS' ELSE 'MISSING' END as function_exists;

-- ==============================================
-- TEST 7: Resume Activities Location (20250130000007)
-- ==============================================
SELECT 
    'RESUME_ACTIVITIES_LOCATION_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resume_activities' AND column_name = 'location'
    ) THEN 'EXISTS' ELSE 'MISSING' END as location_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'resume_activities_with_bullets'
    ) THEN 'EXISTS' ELSE 'MISSING' END as view_exists;

-- ==============================================
-- TEST 8: User Profiles Cumulative Onboarding Time (20250131000007)
-- ==============================================
SELECT 
    'USER_PROFILES_CUMULATIVE_TIME_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'cumulative_onboarding_time'
    ) THEN 'EXISTS' ELSE 'MISSING' END as cumulative_time_column;

-- ==============================================
-- TEST 9: Conversation Tracking Schema (20250131000010)
-- ==============================================
SELECT 
    'CONVERSATION_TRACKING_SCHEMA_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_tracking' AND column_name = 'conversation_id'
    ) THEN 'EXISTS' ELSE 'MISSING' END as conversation_id_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_tracking' AND column_name = 'conversation_started_at'
    ) THEN 'EXISTS' ELSE 'MISSING' END as conversation_started_at_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_tracking' AND column_name = 'metadata_retrieved'
    ) THEN 'EXISTS' ELSE 'MISSING' END as metadata_retrieved_column;

-- ==============================================
-- TEST 10: Conversation Metadata Schema (20250131000011)
-- ==============================================
SELECT 
    'CONVERSATION_METADATA_SCHEMA_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_metadata' AND column_name = 'conversation_id' AND data_type = 'text'
    ) THEN 'EXISTS' ELSE 'MISSING' END as conversation_id_text_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_metadata' AND column_name = 'audio_url'
    ) THEN 'EXISTS' ELSE 'MISSING' END as audio_url_column,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_metadata' AND column_name = 'session_number'
    ) THEN 'EXISTS' ELSE 'MISSING' END as session_number_column;

-- ==============================================
-- TEST 11: Resume Activities Location (20250131000012) - Duplicate Check
-- ==============================================
SELECT 
    'RESUME_ACTIVITIES_LOCATION_DUPLICATE_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resume_activities' AND column_name = 'location'
    ) THEN 'ALREADY_EXISTS' ELSE 'NEEDS_APPLICATION' END as location_status;

-- ==============================================
-- SUMMARY: Overall Migration Status
-- ==============================================
WITH migration_status AS (
    SELECT 
        -- Essay prompts structure
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'id') as essay_prompts_structured,
        
        -- Essay checkpoints table
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essay_checkpoints') as essay_checkpoints_exists,
        
        -- Essay comments original source
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_comments' AND column_name = 'original_source') as essay_comments_enhanced,
        
        -- Handle new user function
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as handle_new_user_function,
        
        -- Auth user created trigger
        EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') as auth_user_trigger,
        
        -- Atomic function
        EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_user_profiles_atomic' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as atomic_function,
        
        -- Resume activities location
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_activities' AND column_name = 'location') as resume_location,
        
        -- User profiles cumulative time
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'cumulative_onboarding_time') as cumulative_time,
        
        -- Conversation tracking schema
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_tracking' AND column_name = 'conversation_id') as conversation_tracking_fixed,
        
        -- Conversation metadata schema
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversation_metadata' AND column_name = 'conversation_id' AND data_type = 'text') as conversation_metadata_fixed
)
SELECT 
    'OVERALL_MIGRATION_STATUS' as test_name,
    CASE 
        WHEN essay_prompts_structured AND essay_checkpoints_exists AND essay_comments_enhanced AND handle_new_user_function AND auth_user_trigger AND atomic_function AND resume_location AND cumulative_time AND conversation_tracking_fixed AND conversation_metadata_fixed
        THEN 'ALL_MIGRATIONS_APPLIED'
        WHEN essay_prompts_structured AND essay_checkpoints_exists AND essay_comments_enhanced AND handle_new_user_function AND auth_user_trigger AND atomic_function AND resume_location AND cumulative_time AND conversation_tracking_fixed AND NOT conversation_metadata_fixed
        THEN 'NEEDS_CONVERSATION_METADATA_FIX'
        WHEN essay_prompts_structured AND essay_checkpoints_exists AND essay_comments_enhanced AND handle_new_user_function AND auth_user_trigger AND atomic_function AND resume_location AND cumulative_time AND NOT conversation_tracking_fixed
        THEN 'NEEDS_CONVERSATION_TRACKING_FIX'
        WHEN essay_prompts_structured AND essay_checkpoints_exists AND essay_comments_enhanced AND handle_new_user_function AND auth_user_trigger AND atomic_function AND resume_location AND NOT cumulative_time
        THEN 'NEEDS_CUMULATIVE_TIME_MIGRATION'
        WHEN essay_prompts_structured AND essay_checkpoints_exists AND essay_comments_enhanced AND handle_new_user_function AND auth_user_trigger AND atomic_function AND NOT resume_location
        THEN 'NEEDS_RESUME_LOCATION_MIGRATION'
        WHEN essay_prompts_structured AND essay_checkpoints_exists AND essay_comments_enhanced AND handle_new_user_function AND auth_user_trigger AND NOT atomic_function
        THEN 'NEEDS_ATOMIC_FUNCTION_MIGRATION'
        WHEN essay_prompts_structured AND essay_checkpoints_exists AND essay_comments_enhanced AND handle_new_user_function AND NOT auth_user_trigger
        THEN 'NEEDS_AUTH_TRIGGER_MIGRATION'
        WHEN essay_prompts_structured AND essay_checkpoints_exists AND essay_comments_enhanced AND NOT handle_new_user_function
        THEN 'NEEDS_HANDLE_USER_FUNCTION_MIGRATION'
        WHEN essay_prompts_structured AND essay_checkpoints_exists AND NOT essay_comments_enhanced
        THEN 'NEEDS_ESSAY_COMMENTS_MIGRATION'
        WHEN essay_prompts_structured AND NOT essay_checkpoints_exists
        THEN 'NEEDS_ESSAY_CHECKPOINTS_MIGRATION'
        WHEN NOT essay_prompts_structured
        THEN 'NEEDS_ESSAY_PROMPTS_MIGRATION'
        ELSE 'PARTIAL_MIGRATION'
    END as migration_status,
    essay_prompts_structured,
    essay_checkpoints_exists,
    essay_comments_enhanced,
    handle_new_user_function,
    auth_user_trigger,
    atomic_function,
    resume_location,
    cumulative_time,
    conversation_tracking_fixed,
    conversation_metadata_fixed
FROM migration_status;
