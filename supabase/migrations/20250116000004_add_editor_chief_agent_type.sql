-- Add editor_chief agent type for the Editor in Chief agent
-- This migration extends the existing agent_type constraint to include the Editor in Chief agent

-- Drop the existing constraint
ALTER TABLE public.essay_comments 
DROP CONSTRAINT IF EXISTS essay_comments_agent_type_check;

-- Add the updated constraint with all agent types including editor_chief
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
  'grammar_spelling',
  'editor_chief'
));

-- Update comment to reflect all supported agent types
COMMENT ON COLUMN essay_comments.agent_type IS 'Agent type that generated this comment: big-picture, paragraph, weaknesses, strengths, reconciliation, tone, clarity, grammar_spelling, or editor_chief';

-- Add new columns for Editor Chief specific data
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS priority_level VARCHAR(10) CHECK (priority_level IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS editorial_decision VARCHAR(10) CHECK (editorial_decision IN ('approve', 'revise', 'reject')),
ADD COLUMN IF NOT EXISTS impact_assessment VARCHAR(20) CHECK (impact_assessment IN ('admissions_boost', 'neutral', 'admissions_hurt'));

-- Add comments for new columns
COMMENT ON COLUMN essay_comments.priority_level IS 'Priority level assigned by Editor Chief: high, medium, or low';
COMMENT ON COLUMN essay_comments.editorial_decision IS 'Editorial decision by Editor Chief: approve, revise, or reject';
COMMENT ON COLUMN essay_comments.impact_assessment IS 'Admissions impact assessment: admissions_boost, neutral, or admissions_hurt';
