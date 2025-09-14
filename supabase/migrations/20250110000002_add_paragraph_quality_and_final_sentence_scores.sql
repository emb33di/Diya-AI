-- Add paragraph quality and final sentence score columns to essay_comments table
-- These support the new smart comment generation system

-- Add paragraph_quality_score column to track paragraph quality (0-10)
ALTER TABLE public.essay_comments 
ADD COLUMN paragraph_quality_score INTEGER CHECK (paragraph_quality_score >= 0 AND paragraph_quality_score <= 10);

-- Add paragraph_quality_score_color column to track score color (red/yellow/green)
ALTER TABLE public.essay_comments 
ADD COLUMN paragraph_quality_score_color VARCHAR(10) CHECK (paragraph_quality_score_color IN ('red', 'yellow', 'green'));

-- Add final_sentence_score column to track final sentence quality (0-10)
ALTER TABLE public.essay_comments 
ADD COLUMN final_sentence_score INTEGER CHECK (final_sentence_score >= 0 AND final_sentence_score <= 10);

-- Add final_sentence_score_color column to track score color (red/yellow/green)
ALTER TABLE public.essay_comments 
ADD COLUMN final_sentence_score_color VARCHAR(10) CHECK (final_sentence_score_color IN ('red', 'yellow', 'green'));

-- Update comment_subcategory constraint to include new subcategories
ALTER TABLE public.essay_comments 
DROP CONSTRAINT IF EXISTS essay_comments_comment_subcategory_check;

ALTER TABLE public.essay_comments 
ADD CONSTRAINT essay_comments_comment_subcategory_check 
CHECK (comment_subcategory IN ('opening', 'body', 'conclusion', 'opening-sentence', 'transition', 'paragraph-specific', 'paragraph-quality', 'final-sentence'));

-- Add indexes for performance
CREATE INDEX idx_essay_comments_paragraph_quality_score ON essay_comments(paragraph_quality_score);
CREATE INDEX idx_essay_comments_final_sentence_score ON essay_comments(final_sentence_score);

-- Add comments explaining the new columns
COMMENT ON COLUMN essay_comments.paragraph_quality_score IS 'Paragraph quality score (0-10) for smart comment generation';
COMMENT ON COLUMN essay_comments.paragraph_quality_score_color IS 'Paragraph quality score color (red/yellow/green)';
COMMENT ON COLUMN essay_comments.final_sentence_score IS 'Final sentence quality score (0-10) for concluding paragraphs';
COMMENT ON COLUMN essay_comments.final_sentence_score_color IS 'Final sentence score color (red/yellow/green)';
