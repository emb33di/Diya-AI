-- Test script to check if essay prompt migrations have already been applied
-- Run this in your Supabase SQL editor to verify migration status

-- Test 1: Check if essay_prompts table exists and has data
SELECT 
    'essay_prompts_table_check' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essay_prompts' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as table_exists,
    (SELECT COUNT(*) FROM public.essay_prompts) as record_count;

-- Test 2: Check if essay_prompts table has the expected columns
SELECT 
    'essay_prompts_columns_check' as test_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'essay_prompts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test 3: Check if essay_prompt_selections table exists
SELECT 
    'essay_prompt_selections_table_check' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essay_prompt_selections' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as table_exists,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essay_prompt_selections' AND table_schema = 'public')
        THEN (SELECT COUNT(*) FROM public.essay_prompt_selections)
        ELSE 0
    END as record_count;

-- Test 4: Check if specific essay prompts exist (Common Application prompts)
SELECT 
    'common_app_prompts_check' as test_name,
    COUNT(*) as common_app_prompt_count
FROM public.essay_prompts 
WHERE college_name = 'Common Application';

-- Test 5: Check if title column exists and is populated
SELECT 
    'title_column_check' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'essay_prompts' 
            AND column_name = 'title' 
            AND table_schema = 'public'
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as title_column_exists,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'essay_prompts' 
            AND column_name = 'title' 
            AND table_schema = 'public'
        ) THEN (
            SELECT COUNT(*) FROM public.essay_prompts 
            WHERE title IS NOT NULL AND title != ''
        )
        ELSE 0
    END as populated_title_count;

-- Test 6: Check if unnecessary columns have been removed
SELECT 
    'unnecessary_columns_check' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'essay_prompts' 
            AND column_name = 'category' 
            AND table_schema = 'public'
        ) THEN 'STILL_EXISTS'
        ELSE 'REMOVED'
    END as category_column_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'essay_prompts' 
            AND column_name = 'school_name' 
            AND table_schema = 'public'
        ) THEN 'STILL_EXISTS'
        ELSE 'REMOVED'
    END as school_name_column_status;

-- Test 7: Check if prompt_text column exists (should be removed after cleanup)
SELECT 
    'prompt_text_column_check' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'essay_prompts' 
            AND column_name = 'prompt_text' 
            AND table_schema = 'public'
        ) THEN 'STILL_EXISTS'
        ELSE 'REMOVED'
    END as prompt_text_column_status;

-- Test 8: Check if school_program_type enum exists
SELECT 
    'school_program_type_enum_check' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_type 
            WHERE typname = 'school_program_type'
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as enum_exists,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_type 
            WHERE typname = 'school_program_type'
        ) THEN (
            SELECT array_agg(enumlabel ORDER BY enumsortorder)::text
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname = 'school_program_type'
        )
        ELSE 'N/A'
    END as enum_values;

-- Test 9: Sample data check - get a few sample records
SELECT 
    'sample_data_check' as test_name,
    id,
    title,
    college_name,
    prompt_number,
    school_program_type,
    created_at
FROM public.essay_prompts 
ORDER BY created_at DESC
LIMIT 5;

-- Test 10: Check for RLS policies on essay_prompt_selections
SELECT 
    'rls_policies_check' as test_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'essay_prompt_selections'
ORDER BY policyname;

-- Summary query to determine migration status
WITH migration_status AS (
    SELECT 
        (SELECT COUNT(*) FROM public.essay_prompts) as essay_prompts_count,
        (SELECT COUNT(*) FROM public.essay_prompts WHERE college_name = 'Common Application') as common_app_count,
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'essay_prompts' 
            AND column_name = 'title' 
            AND table_schema = 'public'
        ) as has_title_column,
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'essay_prompts' 
            AND column_name = 'category' 
            AND table_schema = 'public'
        ) as has_category_column,
        EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'essay_prompts' 
            AND column_name = 'prompt_text' 
            AND table_schema = 'public'
        ) as has_prompt_text_column,
        EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'essay_prompt_selections' 
            AND table_schema = 'public'
        ) as has_selections_table
)
SELECT 
    'MIGRATION_STATUS_SUMMARY' as test_name,
    CASE 
        WHEN essay_prompts_count > 1000 AND common_app_count >= 7 AND has_title_column AND NOT has_category_column AND NOT has_prompt_text_column AND has_selections_table
        THEN 'ALL_MIGRATIONS_APPLIED'
        WHEN essay_prompts_count > 1000 AND common_app_count >= 7 AND NOT has_title_column
        THEN 'NEEDS_TITLE_MIGRATION'
        WHEN essay_prompts_count = 0
        THEN 'NEEDS_DATA_MIGRATION'
        WHEN has_category_column OR has_prompt_text_column
        THEN 'NEEDS_CLEANUP_MIGRATION'
        WHEN NOT has_selections_table
        THEN 'NEEDS_SELECTIONS_TABLE_MIGRATION'
        ELSE 'PARTIAL_MIGRATION'
    END as migration_status,
    essay_prompts_count,
    common_app_count,
    has_title_column,
    has_category_column,
    has_prompt_text_column,
    has_selections_table
FROM migration_status;
