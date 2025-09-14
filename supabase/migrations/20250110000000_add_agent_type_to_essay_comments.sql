-- Add agent_type column to essay_comments table to track which AI agent generated each comment
ALTER TABLE public.essay_comments 
ADD COLUMN agent_type VARCHAR(20) CHECK (agent_type IN ('big-picture', 'paragraph', 'orchestrator'));

-- Add index for agent_type for performance
CREATE INDEX idx_essay_comments_agent_type ON essay_comments(agent_type);

-- Add comment explaining the new column
COMMENT ON COLUMN essay_comments.agent_type IS 'Which AI agent generated this comment: big-picture, paragraph, or orchestrator';

-- Update existing AI comments to have a default agent type
UPDATE public.essay_comments 
SET agent_type = 'big-picture' 
WHERE ai_generated = true AND agent_type IS NULL;
