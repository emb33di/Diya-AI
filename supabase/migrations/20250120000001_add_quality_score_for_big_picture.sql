-- Add quality_score column for all agents (1-100 scale for big-picture, 1-10 for tone/clarity)
-- This migration adds the quality_score field for all AI agents

-- Add quality_score column for all agents (flexible scale)
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 100);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_essay_comments_quality_score ON essay_comments(quality_score);

-- Add composite index for big picture agent queries
CREATE INDEX IF NOT EXISTS idx_essay_comments_agent_quality ON essay_comments(agent_type, quality_score) 
WHERE agent_type = 'big-picture';

-- Add comment explaining the new column
COMMENT ON COLUMN essay_comments.quality_score IS 'Quality score for AI agents (1-100 for big-picture, 1-10 for tone/clarity)';

-- Update existing AI comments to have default quality scores if they don't have one
UPDATE essay_comments 
SET quality_score = CASE 
  WHEN agent_type = 'big-picture' THEN 50
  WHEN agent_type IN ('tone', 'clarity') THEN 5
  ELSE 50
END
WHERE ai_generated = true 
  AND quality_score IS NULL;
