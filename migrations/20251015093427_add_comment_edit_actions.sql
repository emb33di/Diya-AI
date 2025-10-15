-- Add comment edit action columns to semantic_annotations table
-- This enables Accept/Reject functionality for grammar comments

-- Add action type column
ALTER TABLE semantic_annotations 
ADD COLUMN action_type VARCHAR(20) DEFAULT 'none' 
CHECK (action_type IN ('none', 'accepted', 'rejected'));

-- Add suggested replacement text
ALTER TABLE semantic_annotations 
ADD COLUMN suggested_replacement TEXT;

-- Add original text for reference
ALTER TABLE semantic_annotations 
ADD COLUMN original_text TEXT;

-- Add timestamp for when replacement was applied
ALTER TABLE semantic_annotations 
ADD COLUMN replacement_applied_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance on action_type queries
CREATE INDEX idx_semantic_annotations_action_type ON semantic_annotations(action_type);

-- Add index for performance on resolved + action_type queries
CREATE INDEX idx_semantic_annotations_resolved_action ON semantic_annotations(resolved, action_type);

-- Add comment explaining the new columns
COMMENT ON COLUMN semantic_annotations.action_type IS 'Tracks whether a comment edit was accepted, rejected, or not acted upon';
COMMENT ON COLUMN semantic_annotations.suggested_replacement IS 'The corrected text suggested by AI for grammar comments';
COMMENT ON COLUMN semantic_annotations.original_text IS 'The original text that needs to be replaced (for reference)';
COMMENT ON COLUMN semantic_annotations.replacement_applied_at IS 'Timestamp when the suggested replacement was applied to the document';
