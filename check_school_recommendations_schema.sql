-- Check current schema of school_recommendations table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'school_recommendations' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if the table exists and get basic info
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'school_recommendations' 
    AND table_schema = 'public';

-- Check constraints on the table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'school_recommendations' 
    AND tc.table_schema = 'public';
