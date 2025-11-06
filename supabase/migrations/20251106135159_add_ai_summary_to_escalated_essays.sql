-- Add AI summary field to escalated_essays table
-- This field stores paragraph-by-paragraph AI summaries for the founder's review

ALTER TABLE public.escalated_essays
ADD COLUMN IF NOT EXISTS ai_summary JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.escalated_essays.ai_summary IS 'AI-generated paragraph summaries for founder review. Structure: array of objects with paragraph_index, paragraph_content, study_target, goals_background, strengths, weaknesses, grammar_mistakes, improvement_areas';

-- Create index for queries (though JSONB queries are less common)
CREATE INDEX IF NOT EXISTS idx_escalated_essays_ai_summary ON escalated_essays USING gin(ai_summary);

