-- Check current resume_activities table structure and view
-- Run this in Supabase SQL editor to verify location field status

-- Check if location column exists in resume_activities table
SELECT 
    'RESUME_ACTIVITIES_TABLE_CHECK' as test_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'resume_activities' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if resume_activities_with_bullets view exists and includes location
SELECT 
    'RESUME_ACTIVITIES_VIEW_CHECK' as test_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'resume_activities_with_bullets' 
        AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as view_exists;

-- Check the view definition to see if it includes location
SELECT 
    'VIEW_DEFINITION_CHECK' as test_name,
    view_definition
FROM information_schema.views 
WHERE table_name = 'resume_activities_with_bullets' 
AND table_schema = 'public';
