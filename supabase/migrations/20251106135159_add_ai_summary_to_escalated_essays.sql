-- Add AI summary field to escalated_essays table
-- This field stores overall essay-level AI summaries for the founder's review

ALTER TABLE public.escalated_essays
ADD COLUMN IF NOT EXISTS ai_summary JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.escalated_essays.ai_summary IS 'AI-generated overall essay summary for founder review. Structure: object with study_target, goals_background, strengths, weaknesses, grammar_mistakes, improvement_areas (each 30 words or less)';

-- Create index for queries (though JSONB queries are less common)
CREATE INDEX IF NOT EXISTS idx_escalated_essays_ai_summary ON escalated_essays USING gin(ai_summary);

