-- Remove Editor Chief agent references from database
-- This migration removes the editor_chief agent type and related columns

-- Drop the existing constraint
ALTER TABLE public.essay_comments 
DROP CONSTRAINT IF EXISTS essay_comments_agent_type_check;

-- Add the updated constraint without editor_chief
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

-- Update comment to reflect supported agent types
COMMENT ON COLUMN essay_comments.agent_type IS 'Agent type that generated this comment: big-picture, paragraph, weaknesses, strengths, reconciliation, tone, clarity, or grammar_spelling';

-- Remove Editor Chief specific columns
ALTER TABLE public.essay_comments 
DROP COLUMN IF EXISTS priority_level,
DROP COLUMN IF EXISTS editorial_decision,
DROP COLUMN IF EXISTS impact_assessment;
