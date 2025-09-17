-- Add all missing columns to essay_comments table that the AI function expects
-- This migration ensures all columns referenced in saveCommentsToDatabase function exist

-- Add original_source column for reconciliation tracking
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS original_source VARCHAR(20) CHECK (original_source IN ('strength', 'weakness', 'both'));

-- Add comment_nature column for comment categorization
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS comment_nature VARCHAR(20) DEFAULT 'neutral' CHECK (comment_nature IN ('strength', 'weakness', 'combined', 'neutral'));

-- Add organization_category column for comment organization
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS organization_category VARCHAR(30) DEFAULT 'inline' CHECK (organization_category IN ('overall-strength', 'overall-weakness', 'overall-combined', 'inline'));

-- Add reconciliation_source column for reconciliation tracking
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS reconciliation_source VARCHAR(20) DEFAULT 'none' CHECK (reconciliation_source IN ('strength', 'weakness', 'both', 'none'));

-- Add reconciliation_type column for reconciliation categorization
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS reconciliation_type VARCHAR(30) CHECK (reconciliation_type IN ('reconciled', 'strength-enhanced', 'weakness-enhanced', 'balanced'));

-- Add score and score_color columns for enhanced paragraph agent
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS score_color VARCHAR(20);

-- Add paragraph_quality_score and paragraph_quality_score_color columns
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS paragraph_quality_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS paragraph_quality_score_color VARCHAR(20);

-- Add opening_sentence_score and opening_sentence_score_color columns
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS opening_sentence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS opening_sentence_score_color VARCHAR(20);

-- Add final_sentence_score and final_sentence_score_color columns
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS final_sentence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS final_sentence_score_color VARCHAR(20);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_essay_comments_original_source ON essay_comments(original_source);
CREATE INDEX IF NOT EXISTS idx_essay_comments_comment_nature ON essay_comments(comment_nature);
CREATE INDEX IF NOT EXISTS idx_essay_comments_organization_category ON essay_comments(organization_category);
CREATE INDEX IF NOT EXISTS idx_essay_comments_reconciliation_source ON essay_comments(reconciliation_source);
CREATE INDEX IF NOT EXISTS idx_essay_comments_reconciliation_type ON essay_comments(reconciliation_type);
CREATE INDEX IF NOT EXISTS idx_essay_comments_score ON essay_comments(score);
CREATE INDEX IF NOT EXISTS idx_essay_comments_paragraph_quality_score ON essay_comments(paragraph_quality_score);
CREATE INDEX IF NOT EXISTS idx_essay_comments_opening_sentence_score ON essay_comments(opening_sentence_score);
CREATE INDEX IF NOT EXISTS idx_essay_comments_final_sentence_score ON essay_comments(final_sentence_score);

-- Add comments explaining the new columns
COMMENT ON COLUMN essay_comments.original_source IS 'Original source of reconciled comments: strength, weakness, or both';
COMMENT ON COLUMN essay_comments.comment_nature IS 'Nature of the comment: strength, weakness, combined, or neutral';
COMMENT ON COLUMN essay_comments.organization_category IS 'Organization category: overall-strength, overall-weakness, overall-combined, or inline';
COMMENT ON COLUMN essay_comments.reconciliation_source IS 'Source for reconciliation agent: strength, weakness, both, or none';
COMMENT ON COLUMN essay_comments.reconciliation_type IS 'Type of reconciliation: reconciled, strength-enhanced, weakness-enhanced, or balanced';
COMMENT ON COLUMN essay_comments.score IS 'General score for the comment (0-1)';
COMMENT ON COLUMN essay_comments.score_color IS 'Color associated with the score (red, yellow, green)';
COMMENT ON COLUMN essay_comments.paragraph_quality_score IS 'Quality score for the paragraph (0-1)';
COMMENT ON COLUMN essay_comments.paragraph_quality_score_color IS 'Color for paragraph quality score';
COMMENT ON COLUMN essay_comments.opening_sentence_score IS 'Score for opening sentence quality (0-1)';
COMMENT ON COLUMN essay_comments.opening_sentence_score_color IS 'Color for opening sentence score';
COMMENT ON COLUMN essay_comments.final_sentence_score IS 'Score for final sentence quality (0-1)';
COMMENT ON COLUMN essay_comments.final_sentence_score_color IS 'Color for final sentence score';
