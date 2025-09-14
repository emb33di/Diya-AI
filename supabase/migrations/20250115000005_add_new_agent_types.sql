-- Add new agent types for specialized AI agents: tone, clarity, and grammar_spelling
-- This migration extends the existing agent_type constraint to include the three new specialized agents

-- Drop the existing constraint
ALTER TABLE public.essay_comments 
DROP CONSTRAINT IF EXISTS essay_comments_agent_type_check;

-- Add the updated constraint with all agent types including the new ones
ALTER TABLE public.essay_comments 
ADD CONSTRAINT essay_comments_agent_type_check 
CHECK (agent_type IN (
  'big-picture', 
  'paragraph', 
  'weaknesses', 
  'strengths', 
  'reconciliation',
  'tone',
  'clarity',
  'grammar_spelling'
));

-- Update comment to reflect all supported agent types
COMMENT ON COLUMN essay_comments.agent_type IS 'Agent type that generated this comment: big-picture, paragraph, weaknesses, strengths, reconciliation, tone, clarity, or grammar_spelling';
