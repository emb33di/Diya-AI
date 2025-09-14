-- Fix agent_type constraint to include 'reconciliation' agent type
-- This fixes the constraint violation error in essay commenter

-- Drop the existing constraint
ALTER TABLE public.essay_comments 
DROP CONSTRAINT IF EXISTS essay_comments_agent_type_check;

-- Add the updated constraint with reconciliation agent type
ALTER TABLE public.essay_comments 
ADD CONSTRAINT essay_comments_agent_type_check 
CHECK (agent_type IN ('big-picture', 'paragraph', 'weaknesses', 'strengths', 'reconciliation'));

-- Update comment to reflect all supported agent types
COMMENT ON COLUMN essay_comments.agent_type IS 'Agent type that generated this comment: big-picture, paragraph, weaknesses, strengths, or reconciliation';
