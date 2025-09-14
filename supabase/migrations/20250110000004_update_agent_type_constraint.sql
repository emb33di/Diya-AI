-- Update agent_type constraint to include new agent types
-- This supports the three-stage sequential processing system

-- Drop the existing constraint
ALTER TABLE public.essay_comments 
DROP CONSTRAINT IF EXISTS essay_comments_agent_type_check;

-- Add the updated constraint with new agent types
ALTER TABLE public.essay_comments 
ADD CONSTRAINT essay_comments_agent_type_check 
CHECK (agent_type IN ('big-picture', 'paragraph', 'weaknesses', 'strengths', 'reconciliation'));

-- Add comment explaining the new agent types
COMMENT ON COLUMN essay_comments.agent_type IS 'Agent type that generated this comment: big-picture, paragraph, weaknesses, strengths, or reconciliation';
