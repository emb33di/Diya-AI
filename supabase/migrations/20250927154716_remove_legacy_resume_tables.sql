-- Remove legacy resume system tables and components
-- This migration removes the old resume_versions table and resume-files storage bucket
-- which have been replaced by the structured resume system (structured_resume_data, resume_feedback, resume_generated_files)

-- Drop the legacy resume_versions table and all its dependencies
DROP TABLE IF EXISTS public.resume_versions CASCADE;

-- Drop the legacy resume version function
DROP FUNCTION IF EXISTS public.get_next_resume_version(UUID);

-- Remove storage policies for resume-files bucket
DROP POLICY IF EXISTS "Users can upload their own resume files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own resume files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own resume files" ON storage.objects;

-- Remove the resume-files storage bucket
-- Note: This will also delete all files in the bucket
DELETE FROM storage.buckets WHERE id = 'resume-files';

-- Add comment explaining the cleanup
COMMENT ON SCHEMA public IS 'Legacy resume system (resume_versions table and resume-files bucket) removed - replaced by structured resume system';

-- Log the cleanup
DO $$
BEGIN
    RAISE NOTICE 'Legacy resume system cleanup completed:';
    RAISE NOTICE '- Dropped resume_versions table';
    RAISE NOTICE '- Dropped get_next_resume_version function';
    RAISE NOTICE '- Removed resume-files storage bucket and policies';
    RAISE NOTICE '- New structured resume system uses: structured_resume_data, resume_feedback, resume_generated_files';
END $$;
