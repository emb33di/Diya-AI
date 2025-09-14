-- Add checkpoint_id column to essay_comments table to link comments to specific versions
-- This enables comment history preservation across essay versions

-- Add checkpoint_id column to link comments to specific essay checkpoints
ALTER TABLE public.essay_comments 
ADD COLUMN checkpoint_id UUID REFERENCES essay_checkpoints(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_essay_comments_checkpoint_id ON essay_comments(checkpoint_id);

-- Add composite index for efficient queries
CREATE INDEX idx_essay_comments_essay_checkpoint ON essay_comments(essay_id, checkpoint_id);

-- Add comment explaining the new column
COMMENT ON COLUMN essay_comments.checkpoint_id IS 'Links comment to specific essay checkpoint/version for comment history preservation';

-- Update existing comments to link them to the most recent checkpoint for each essay
-- This ensures backward compatibility
UPDATE essay_comments 
SET checkpoint_id = (
  SELECT ec.id 
  FROM essay_checkpoints ec 
  WHERE ec.essay_id = essay_comments.essay_id 
    AND ec.user_id = essay_comments.user_id
    AND ec.is_active = true
  ORDER BY ec.created_at DESC 
  LIMIT 1
)
WHERE checkpoint_id IS NULL;

-- Add constraint to ensure comments are linked to checkpoints for AI-generated comments
-- This ensures we can track comment history properly
ALTER TABLE public.essay_comments 
ADD CONSTRAINT essay_comments_ai_generated_checkpoint_required 
CHECK (
  (ai_generated = false) OR 
  (ai_generated = true AND checkpoint_id IS NOT NULL)
);
