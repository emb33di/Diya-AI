-- Add ON DELETE CASCADE to foreign key constraints that are missing it
-- This ensures complete user deletion works properly
-- Only updating tables that actually exist in the database

-- 1. essay_versions table (exists)
ALTER TABLE public.essay_versions 
DROP CONSTRAINT IF EXISTS essay_versions_user_id_fkey,
ADD CONSTRAINT essay_versions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. document_operations table (exists)
ALTER TABLE public.document_operations 
DROP CONSTRAINT IF EXISTS document_operations_user_id_fkey,
ADD CONSTRAINT document_operations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add comments to document the changes
COMMENT ON CONSTRAINT essay_versions_user_id_fkey ON public.essay_versions IS 'Foreign key with CASCADE delete for complete user removal';
COMMENT ON CONSTRAINT document_operations_user_id_fkey ON public.document_operations IS 'Foreign key with CASCADE delete for complete user removal';

-- Verify the changes
DO $$
DECLARE
    constraint_count INTEGER;
    rec RECORD;
BEGIN
    -- Count foreign key constraints that reference auth.users with CASCADE
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND rc.unique_constraint_name IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND table_schema = 'auth'
    )
    AND rc.delete_rule = 'CASCADE';
    
    RAISE NOTICE 'Total foreign key constraints with CASCADE delete to auth.users: %', constraint_count;
    
    -- List all tables that reference auth.users
    RAISE NOTICE 'Tables referencing auth.users:';
    FOR rec IN 
        SELECT DISTINCT tc.table_name, rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND rc.unique_constraint_name IN (
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'users' AND table_schema = 'auth'
        )
        ORDER BY tc.table_name
    LOOP
        RAISE NOTICE '  % - CASCADE: %', rec.table_name, rec.delete_rule;
    END LOOP;
END $$;
