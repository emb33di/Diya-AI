-- Add missing columns to essay_versions table
-- These columns are needed by the EssayVersionService.createAIFeedbackVersion method

-- Add AI feedback related columns
ALTER TABLE public.essay_versions 
ADD COLUMN IF NOT EXISTS is_fresh_draft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_ai_feedback BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS essay_content TEXT,
ADD COLUMN IF NOT EXISTS essay_title TEXT,
ADD COLUMN IF NOT EXISTS essay_prompt TEXT,
ADD COLUMN IF NOT EXISTS ai_feedback_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50) DEFAULT 'gemini-2.5-flash-lite',
ADD COLUMN IF NOT EXISTS total_comments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_comments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS inline_comments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS opening_sentence_comments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transition_comments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paragraph_specific_comments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_confidence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS average_quality_score DECIMAL(3,2);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_essay_versions_ai_model ON essay_versions(ai_model);
CREATE INDEX IF NOT EXISTS idx_essay_versions_has_ai_feedback ON essay_versions(has_ai_feedback);
CREATE INDEX IF NOT EXISTS idx_essay_versions_is_fresh_draft ON essay_versions(is_fresh_draft);

-- Add comments to explain the new columns
COMMENT ON COLUMN essay_versions.is_fresh_draft IS 'True if this version is a fresh draft without AI comments';
COMMENT ON COLUMN essay_versions.has_ai_feedback IS 'Whether this version has AI-generated feedback/comments';
COMMENT ON COLUMN essay_versions.essay_content IS 'Plain text content of the essay';
COMMENT ON COLUMN essay_versions.essay_title IS 'Title of the essay';
COMMENT ON COLUMN essay_versions.essay_prompt IS 'The essay prompt/question';
COMMENT ON COLUMN essay_versions.ai_feedback_generated_at IS 'When AI feedback was generated for this version';
COMMENT ON COLUMN essay_versions.ai_model IS 'AI model used to generate feedback (e.g., gemini-2.5-flash-lite)';
COMMENT ON COLUMN essay_versions.total_comments IS 'Total number of AI-generated comments';
COMMENT ON COLUMN essay_versions.overall_comments IS 'Number of overall/global comments';
COMMENT ON COLUMN essay_versions.inline_comments IS 'Number of inline comments';
COMMENT ON COLUMN essay_versions.opening_sentence_comments IS 'Number of opening sentence comments';
COMMENT ON COLUMN essay_versions.transition_comments IS 'Number of transition comments';
COMMENT ON COLUMN essay_versions.paragraph_specific_comments IS 'Number of paragraph-specific comments';
COMMENT ON COLUMN essay_versions.average_confidence_score IS 'Average confidence score of AI comments (0-1)';
COMMENT ON COLUMN essay_versions.average_quality_score IS 'Average quality score of AI comments (0-1)';
