-- Add paragraph_id field to essay_comments table for contextual anchoring
ALTER TABLE public.essay_comments 
ADD COLUMN paragraph_id TEXT;

-- Add index for performance on paragraph_id lookups
CREATE INDEX idx_essay_comments_paragraph_id ON essay_comments(paragraph_id);

-- Add comment to explain the new field
COMMENT ON COLUMN essay_comments.paragraph_id IS 'Unique identifier for the paragraph this comment refers to, used for contextual anchoring system';
