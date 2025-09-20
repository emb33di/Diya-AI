-- Drop legacy essay commenting system tables
-- This migration removes the old position-based commenting system
-- in favor of the new semantic document architecture

-- Drop foreign key constraints first
ALTER TABLE IF EXISTS public.comment_threads 
DROP CONSTRAINT IF EXISTS comment_threads_parent_comment_id_fkey;

-- Drop comment_anchors table first (it depends on essay_comments)
DROP TABLE IF EXISTS public.comment_anchors CASCADE;

ALTER TABLE IF EXISTS public.essay_comments 
DROP CONSTRAINT IF EXISTS essay_comments_essay_id_fkey,
DROP CONSTRAINT IF EXISTS essay_comments_user_id_fkey,
DROP CONSTRAINT IF EXISTS essay_comments_checkpoint_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_essay_comments_essay_id;
DROP INDEX IF EXISTS idx_essay_comments_user_id;
DROP INDEX IF EXISTS idx_essay_comments_ai_generated;
DROP INDEX IF EXISTS idx_essay_comments_resolved;
DROP INDEX IF EXISTS idx_essay_comments_created_at;
DROP INDEX IF EXISTS idx_essay_comments_checkpoint_id;
DROP INDEX IF EXISTS idx_essay_comments_essay_checkpoint;
DROP INDEX IF EXISTS idx_essay_comments_paragraph_id;
DROP INDEX IF EXISTS idx_essay_comments_paragraph_index;
DROP INDEX IF EXISTS idx_essay_comments_agent_type;
DROP INDEX IF EXISTS idx_essay_comments_comment_category;
DROP INDEX IF EXISTS idx_essay_comments_comment_nature;
DROP INDEX IF EXISTS idx_essay_comments_organization_category;
DROP INDEX IF EXISTS idx_essay_comments_chronological_position;
DROP INDEX IF EXISTS idx_essay_comments_reconciliation_source;
DROP INDEX IF EXISTS idx_essay_comments_organization;
DROP INDEX IF EXISTS idx_essay_comments_duplicate;
DROP INDEX IF EXISTS idx_essay_comments_priority;
DROP INDEX IF EXISTS idx_essay_comments_generation_method;
DROP INDEX IF EXISTS idx_essay_comments_anchor_validated;
DROP INDEX IF EXISTS idx_essay_comments_quality_score;
DROP INDEX IF EXISTS idx_essay_comments_model_version;

DROP INDEX IF EXISTS idx_comment_threads_parent_id;
DROP INDEX IF EXISTS idx_comment_threads_user_id;

-- Drop tables
DROP TABLE IF EXISTS public.comment_threads;
DROP TABLE IF EXISTS public.essay_comments;

-- Drop essay_checkpoints table (legacy versioning system)
DROP TABLE IF EXISTS public.essay_checkpoints;

-- Drop any related functions
DROP FUNCTION IF EXISTS validate_anchor_text();

-- Add comment explaining the cleanup
COMMENT ON SCHEMA public IS 'Legacy essay commenting tables (essay_comments, comment_threads, comment_anchors, essay_checkpoints) removed - now using semantic document architecture';
