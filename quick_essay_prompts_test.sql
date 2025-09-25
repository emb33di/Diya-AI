-- Quick test to check essay prompt migration status
-- Run this in Supabase SQL editor for a quick assessment

-- Quick check: Do we have essay prompts data?
SELECT 
    'QUICK_CHECK' as test,
    COUNT(*) as total_prompts,
    COUNT(CASE WHEN college_name = 'Common Application' THEN 1 END) as common_app_prompts,
    COUNT(CASE WHEN title IS NOT NULL AND title != '' THEN 1 END) as prompts_with_titles
FROM public.essay_prompts;

-- Check if cleanup columns still exist (they should be removed)
SELECT 
    'CLEANUP_CHECK' as test,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_prompts' AND column_name = 'category'
    ) THEN 'NEEDS_CLEANUP' ELSE 'CLEAN' END as category_status,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_prompts' AND column_name = 'prompt_text'
    ) THEN 'NEEDS_CLEANUP' ELSE 'CLEAN' END as prompt_text_status;

-- Check if selections table exists
SELECT 
    'SELECTIONS_TABLE_CHECK' as test,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'essay_prompt_selections'
    ) THEN 'EXISTS' ELSE 'MISSING' END as table_status;
