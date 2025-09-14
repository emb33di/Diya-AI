-- Fix essay_comments table schema by adding missing columns
-- This migration adds the missing columns that the application expects

-- Add paragraph_id column if it doesn't exist
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS paragraph_id TEXT;

-- Add other missing columns that might be referenced in the application
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS comment_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS comment_subcategory VARCHAR(50),
ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS paragraph_index INTEGER,
ADD COLUMN IF NOT EXISTS transition_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS transition_score_color VARCHAR(20),
ADD COLUMN IF NOT EXISTS opening_sentence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS opening_sentence_score_color VARCHAR(20),
ADD COLUMN IF NOT EXISTS paragraph_quality_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS paragraph_quality_score_color VARCHAR(20),
ADD COLUMN IF NOT EXISTS final_sentence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS final_sentence_score_color VARCHAR(20),
ADD COLUMN IF NOT EXISTS user_feedback_helpful BOOLEAN DEFAULT false;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_essay_comments_paragraph_id ON essay_comments(paragraph_id);
CREATE INDEX IF NOT EXISTS idx_essay_comments_paragraph_index ON essay_comments(paragraph_index);
CREATE INDEX IF NOT EXISTS idx_essay_comments_agent_type ON essay_comments(agent_type);
CREATE INDEX IF NOT EXISTS idx_essay_comments_comment_category ON essay_comments(comment_category);

-- Add comments to explain the new columns
COMMENT ON COLUMN essay_comments.paragraph_id IS 'Unique identifier for the paragraph being commented on';
COMMENT ON COLUMN essay_comments.comment_category IS 'Category of the comment (e.g., structure, content, style)';
COMMENT ON COLUMN essay_comments.comment_subcategory IS 'Subcategory for more specific comment classification';
COMMENT ON COLUMN essay_comments.agent_type IS 'Type of AI agent that generated the comment';
COMMENT ON COLUMN essay_comments.paragraph_index IS 'Index of the paragraph in the essay';
COMMENT ON COLUMN essay_comments.transition_score IS 'Score for paragraph transitions (0-10)';
COMMENT ON COLUMN essay_comments.transition_score_color IS 'Color coding for transition score (red/yellow/green)';
COMMENT ON COLUMN essay_comments.opening_sentence_score IS 'Score for opening sentence quality (0-10)';
COMMENT ON COLUMN essay_comments.opening_sentence_score_color IS 'Color coding for opening sentence score';
COMMENT ON COLUMN essay_comments.paragraph_quality_score IS 'Overall paragraph quality score (0-10)';
COMMENT ON COLUMN essay_comments.paragraph_quality_score_color IS 'Color coding for paragraph quality score';
COMMENT ON COLUMN essay_comments.final_sentence_score IS 'Score for final sentence quality (0-10)';
COMMENT ON COLUMN essay_comments.final_sentence_score_color IS 'Color coding for final sentence score';
COMMENT ON COLUMN essay_comments.user_feedback_helpful IS 'Whether the user found this comment helpful';
