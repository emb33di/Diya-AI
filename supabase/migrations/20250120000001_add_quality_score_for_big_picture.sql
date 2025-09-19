-- Add quality_score column for big picture agent (1-100 scale)
-- This migration adds the quality_score field specifically for big picture agent comments

-- Add quality_score column for big picture agent (1-100 scale)
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 100);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_essay_comments_quality_score ON essay_comments(quality_score);

-- Add composite index for big picture agent queries
CREATE INDEX IF NOT EXISTS idx_essay_comments_agent_quality ON essay_comments(agent_type, quality_score) 
WHERE agent_type = 'big-picture';

-- Add comment explaining the new column
COMMENT ON COLUMN essay_comments.quality_score IS 'Quality score for big picture agent (1-100 scale) rating how well the essay addresses the prompt';

-- Update existing big picture comments to have a default quality score if they don't have one
UPDATE essay_comments 
SET quality_score = 50 
WHERE agent_type = 'big-picture' 
  AND quality_score IS NULL;
