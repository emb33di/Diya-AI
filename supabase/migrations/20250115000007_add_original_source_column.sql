-- Add original_source column to essay_comments table
-- This column is used by the reconciliation agent to track the source of reconciled comments

-- Add original_source column
ALTER TABLE public.essay_comments 
ADD COLUMN original_source VARCHAR(20) DEFAULT 'none' CHECK (original_source IN ('strength', 'weakness', 'both', 'none'));

-- Add index for performance
CREATE INDEX idx_essay_comments_original_source ON essay_comments(original_source);

-- Add comment explaining the new column
COMMENT ON COLUMN essay_comments.original_source IS 'Source for reconciliation agent: strength, weakness, both, or none';

-- Update existing comments to set default value
UPDATE essay_comments 
SET original_source = 'none' 
WHERE original_source IS NULL;
