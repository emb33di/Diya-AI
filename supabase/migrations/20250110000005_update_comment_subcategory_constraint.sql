-- Update comment_subcategory constraint to include new subcategories
-- This supports the smart comment generation system

-- Drop the existing constraint
ALTER TABLE public.essay_comments 
DROP CONSTRAINT IF EXISTS essay_comments_comment_subcategory_check;

-- Add the updated constraint with new subcategories
ALTER TABLE public.essay_comments 
ADD CONSTRAINT essay_comments_comment_subcategory_check 
CHECK (comment_subcategory IN ('opening', 'body', 'conclusion', 'opening-sentence', 'transition', 'paragraph-specific', 'paragraph-quality', 'final-sentence'));

-- Add comment explaining the new subcategories
COMMENT ON COLUMN essay_comments.comment_subcategory IS 'Comment subcategory: opening, body, conclusion, opening-sentence, transition, paragraph-specific, paragraph-quality, or final-sentence';

