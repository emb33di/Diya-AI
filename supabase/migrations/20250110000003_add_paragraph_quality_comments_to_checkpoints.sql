-- Add paragraph quality and final sentence comment counts to essay_checkpoints table
-- These support the new smart comment generation system statistics

-- Add paragraph_quality_comments column to track paragraph quality comment count
ALTER TABLE public.essay_checkpoints 
ADD COLUMN paragraph_quality_comments INTEGER DEFAULT 0;

-- Add final_sentence_comments column to track final sentence comment count
ALTER TABLE public.essay_checkpoints 
ADD COLUMN final_sentence_comments INTEGER DEFAULT 0;

-- Add comments explaining the new columns
COMMENT ON COLUMN essay_checkpoints.paragraph_quality_comments IS 'Count of paragraph quality comments in this checkpoint';
COMMENT ON COLUMN essay_checkpoints.final_sentence_comments IS 'Count of final sentence comments in this checkpoint';
