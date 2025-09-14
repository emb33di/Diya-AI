-- Add paragraph_index column to essay_comments table to track which paragraph each comment refers to
ALTER TABLE public.essay_comments 
ADD COLUMN paragraph_index INTEGER;

-- Add opening_sentence_score column to track opening sentence quality (0-10)
ALTER TABLE public.essay_comments 
ADD COLUMN opening_sentence_score INTEGER CHECK (opening_sentence_score >= 0 AND opening_sentence_score <= 10);

-- Add opening_sentence_score_color column to track score color (red/yellow/green)
ALTER TABLE public.essay_comments 
ADD COLUMN opening_sentence_score_color VARCHAR(10) CHECK (opening_sentence_score_color IN ('red', 'yellow', 'green'));

-- Add transition_score column to track transition quality (0-10)
ALTER TABLE public.essay_comments 
ADD COLUMN transition_score INTEGER CHECK (transition_score >= 0 AND transition_score <= 10);

-- Add transition_score_color column to track transition score color (red/yellow/green)
ALTER TABLE public.essay_comments 
ADD COLUMN transition_score_color VARCHAR(10) CHECK (transition_score_color IN ('red', 'yellow', 'green'));

-- Add indexes for performance
CREATE INDEX idx_essay_comments_paragraph_index ON essay_comments(paragraph_index);
CREATE INDEX idx_essay_comments_opening_score ON essay_comments(opening_sentence_score);
CREATE INDEX idx_essay_comments_transition_score ON essay_comments(transition_score);

-- Add comments explaining the new columns
COMMENT ON COLUMN essay_comments.paragraph_index IS 'Index of the paragraph this comment refers to (0-based)';
COMMENT ON COLUMN essay_comments.opening_sentence_score IS 'Opening sentence quality score (0-10)';
COMMENT ON COLUMN essay_comments.opening_sentence_score_color IS 'Opening sentence score color (red/yellow/green)';
COMMENT ON COLUMN essay_comments.transition_score IS 'Transition quality score (0-10)';
COMMENT ON COLUMN essay_comments.transition_score_color IS 'Transition score color (red/yellow/green)';
