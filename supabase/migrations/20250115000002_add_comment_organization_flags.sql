-- Add comment organization flags for better categorization
-- This migration adds fields to organize comments by strength/weakness and chronological order

-- Add comment organization fields
ALTER TABLE public.essay_comments 
ADD COLUMN comment_nature VARCHAR(20) DEFAULT 'neutral' CHECK (comment_nature IN ('strength', 'weakness', 'combined', 'neutral')),
ADD COLUMN organization_category VARCHAR(20) DEFAULT 'inline' CHECK (organization_category IN ('overall-strength', 'overall-weakness', 'overall-combined', 'inline')),
ADD COLUMN chronological_position INTEGER DEFAULT 0,
ADD COLUMN reconciliation_source VARCHAR(20) DEFAULT 'none' CHECK (reconciliation_source IN ('strength', 'weakness', 'both', 'none'));

-- Add indexes for performance on new fields
CREATE INDEX idx_essay_comments_comment_nature ON essay_comments(comment_nature);
CREATE INDEX idx_essay_comments_organization_category ON essay_comments(organization_category);
CREATE INDEX idx_essay_comments_chronological_position ON essay_comments(chronological_position);
CREATE INDEX idx_essay_comments_reconciliation_source ON essay_comments(reconciliation_source);

-- Add composite index for efficient organization queries
CREATE INDEX idx_essay_comments_organization ON essay_comments(essay_id, organization_category, chronological_position);

-- Add comments explaining the new columns
COMMENT ON COLUMN essay_comments.comment_nature IS 'Nature of the comment: strength, weakness, combined, or neutral';
COMMENT ON COLUMN essay_comments.organization_category IS 'Organization category: overall-strength, overall-weakness, overall-combined, or inline';
COMMENT ON COLUMN essay_comments.chronological_position IS 'Position in chronological order based on text location';
COMMENT ON COLUMN essay_comments.reconciliation_source IS 'Source for reconciliation agent: strength, weakness, both, or none';

-- Update existing comments to set default organization categories based on agent_type
UPDATE essay_comments 
SET 
  comment_nature = CASE 
    WHEN agent_type = 'strengths' THEN 'strength'
    WHEN agent_type = 'weaknesses' THEN 'weakness'
    WHEN agent_type = 'reconciliation' THEN 'combined'
    ELSE 'neutral'
  END,
  organization_category = CASE 
    WHEN comment_category = 'overall' AND agent_type = 'strengths' THEN 'overall-strength'
    WHEN comment_category = 'overall' AND agent_type = 'weaknesses' THEN 'overall-weakness'
    WHEN comment_category = 'overall' AND agent_type = 'reconciliation' THEN 'overall-combined'
    ELSE 'inline'
  END,
  reconciliation_source = CASE 
    WHEN agent_type = 'strengths' THEN 'strength'
    WHEN agent_type = 'weaknesses' THEN 'weakness'
    WHEN agent_type = 'reconciliation' THEN 'both'
    ELSE 'none'
  END
WHERE comment_nature = 'neutral' OR organization_category = 'inline';

-- Function to calculate chronological position based on text selection
CREATE OR REPLACE FUNCTION calculate_chronological_position(
  text_selection JSONB
) RETURNS INTEGER AS $$
BEGIN
  -- Extract start position from text_selection JSONB
  -- Format: {"start": {"pos": 0, "path": [0,0]}, "end": {"pos": 5, "path": [0,0]}}
  IF text_selection IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get the start position from the JSONB
  RETURN COALESCE((text_selection->'start'->>'pos')::INTEGER, 0);
END;
$$ LANGUAGE plpgsql;

-- Update chronological positions for existing comments
UPDATE essay_comments 
SET chronological_position = calculate_chronological_position(text_selection)
WHERE chronological_position = 0;

-- Create trigger to automatically set chronological position for new comments
CREATE OR REPLACE FUNCTION set_chronological_position()
RETURNS TRIGGER AS $$
BEGIN
  NEW.chronological_position = calculate_chronological_position(NEW.text_selection);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_chronological_position
  BEFORE INSERT OR UPDATE ON essay_comments
  FOR EACH ROW
  EXECUTE FUNCTION set_chronological_position();
