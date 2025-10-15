-- Add comment edit action fields to semantic_annotations table
-- This migration adds the missing columns needed for the grammar agent's accept/reject functionality

-- Add action_type column for tracking user actions on comments
ALTER TABLE public.semantic_annotations 
ADD COLUMN IF NOT EXISTS action_type VARCHAR(20) DEFAULT 'none' 
CHECK (action_type IN ('none', 'accepted', 'rejected'));

-- Add suggested_replacement column for storing AI-suggested text replacements
ALTER TABLE public.semantic_annotations 
ADD COLUMN IF NOT EXISTS suggested_replacement TEXT;

-- Add original_text column for storing the original text that was suggested to be replaced
ALTER TABLE public.semantic_annotations 
ADD COLUMN IF NOT EXISTS original_text TEXT;

-- Add replacement_applied_at column for tracking when a replacement was applied
ALTER TABLE public.semantic_annotations 
ADD COLUMN IF NOT EXISTS replacement_applied_at TIMESTAMP WITH TIME ZONE;

-- Create index for action_type for better query performance
CREATE INDEX IF NOT EXISTS idx_semantic_annotations_action_type 
ON semantic_annotations(action_type);

-- Add comments to document the new columns
COMMENT ON COLUMN semantic_annotations.action_type IS 'Tracks user action on comment: none, accepted, or rejected';
COMMENT ON COLUMN semantic_annotations.suggested_replacement IS 'AI-suggested text replacement for grammar corrections';
COMMENT ON COLUMN semantic_annotations.original_text IS 'Original text that was suggested to be replaced';
COMMENT ON COLUMN semantic_annotations.replacement_applied_at IS 'Timestamp when a replacement was applied';
