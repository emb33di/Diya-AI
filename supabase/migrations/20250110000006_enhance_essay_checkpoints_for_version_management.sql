-- Enhance essay checkpoints table for version management and fresh draft functionality
-- This migration adds fields to support the "continue fresh draft" feature

-- Add new fields to essay_checkpoints table
ALTER TABLE public.essay_checkpoints 
ADD COLUMN IF NOT EXISTS version_name VARCHAR(100), -- User-friendly name for the version
ADD COLUMN IF NOT EXISTS version_description TEXT, -- Optional description of changes made
ADD COLUMN IF NOT EXISTS is_fresh_draft BOOLEAN DEFAULT false, -- Marks if this is a fresh draft without comments
ADD COLUMN IF NOT EXISTS parent_checkpoint_id UUID REFERENCES essay_checkpoints(id), -- Links to the previous version
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1, -- Sequential version number
ADD COLUMN IF NOT EXISTS has_ai_feedback BOOLEAN DEFAULT false; -- Whether this version has AI feedback

-- Create index for version management queries
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_version_number ON essay_checkpoints(essay_id, version_number);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_parent_id ON essay_checkpoints(parent_checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_fresh_draft ON essay_checkpoints(essay_id, is_fresh_draft);

-- Add comment to explain the new fields
COMMENT ON COLUMN essay_checkpoints.version_name IS 'User-friendly name for the essay version (e.g., "Initial Draft", "After AI Feedback", "Final Version")';
COMMENT ON COLUMN essay_checkpoints.version_description IS 'Optional description of what changed in this version';
COMMENT ON COLUMN essay_checkpoints.is_fresh_draft IS 'True if this version is a fresh draft without AI comments (user can continue editing)';
COMMENT ON COLUMN essay_checkpoints.parent_checkpoint_id IS 'Reference to the previous checkpoint that this version was based on';
COMMENT ON COLUMN essay_checkpoints.version_number IS 'Sequential version number for this essay';
COMMENT ON COLUMN essay_checkpoints.has_ai_feedback IS 'Whether this version has AI-generated feedback/comments';

-- Update existing checkpoints to have proper version numbers
-- This will set version_number based on checkpoint_number for existing records
UPDATE essay_checkpoints 
SET version_number = checkpoint_number,
    has_ai_feedback = CASE WHEN total_comments > 0 THEN true ELSE false END,
    version_name = CASE 
        WHEN checkpoint_number = 1 THEN 'Initial Draft'
        ELSE 'Version ' || checkpoint_number::text
    END
WHERE version_number IS NULL;

-- Create a function to get the next version number for an essay
CREATE OR REPLACE FUNCTION get_next_version_number(essay_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM essay_checkpoints
    WHERE essay_id = essay_uuid;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Create a function to create a fresh draft checkpoint
CREATE OR REPLACE FUNCTION create_fresh_draft_checkpoint(
    essay_uuid UUID,
    user_uuid UUID,
    essay_content TEXT,
    essay_title TEXT DEFAULT NULL,
    essay_prompt TEXT DEFAULT NULL,
    version_name_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_checkpoint_id UUID;
    next_version INTEGER;
    parent_checkpoint_id UUID;
BEGIN
    -- Get the next version number
    next_version := get_next_version_number(essay_uuid);
    
    -- Get the most recent checkpoint as parent (if any)
    SELECT id INTO parent_checkpoint_id
    FROM essay_checkpoints
    WHERE essay_id = essay_uuid
    ORDER BY version_number DESC
    LIMIT 1;
    
    -- Deactivate all existing active checkpoints for this essay FIRST
    -- This prevents the unique constraint violation
    UPDATE essay_checkpoints
    SET is_active = false
    WHERE essay_id = essay_uuid AND is_active = true;
    
    -- Create the new checkpoint
    INSERT INTO essay_checkpoints (
        essay_id,
        user_id,
        checkpoint_number,
        version_number,
        essay_content,
        essay_title,
        essay_prompt,
        version_name,
        is_fresh_draft,
        parent_checkpoint_id,
        has_ai_feedback,
        is_active
    ) VALUES (
        essay_uuid,
        user_uuid,
        next_version,
        next_version,
        essay_content,
        essay_title,
        essay_prompt,
        COALESCE(version_name_param, 'Fresh Draft ' || next_version::text),
        true,
        parent_checkpoint_id,
        false,
        true
    ) RETURNING id INTO new_checkpoint_id;
    
    RETURN new_checkpoint_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to create a checkpoint with AI feedback
CREATE OR REPLACE FUNCTION create_ai_feedback_checkpoint(
    essay_uuid UUID,
    user_uuid UUID,
    essay_content TEXT,
    essay_title TEXT DEFAULT NULL,
    essay_prompt TEXT DEFAULT NULL,
    ai_model_param VARCHAR(50) DEFAULT 'gemini-2.5-flash-lite',
    total_comments_param INTEGER DEFAULT 0,
    overall_comments_param INTEGER DEFAULT 0,
    inline_comments_param INTEGER DEFAULT 0,
    opening_sentence_comments_param INTEGER DEFAULT 0,
    transition_comments_param INTEGER DEFAULT 0,
    paragraph_specific_comments_param INTEGER DEFAULT 0,
    average_confidence_score_param DECIMAL(3,2) DEFAULT NULL,
    average_quality_score_param DECIMAL(3,2) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_checkpoint_id UUID;
    next_version INTEGER;
    parent_checkpoint_id UUID;
BEGIN
    -- Get the next version number
    next_version := get_next_version_number(essay_uuid);
    
    -- Get the most recent checkpoint as parent (if any)
    SELECT id INTO parent_checkpoint_id
    FROM essay_checkpoints
    WHERE essay_id = essay_uuid
    ORDER BY version_number DESC
    LIMIT 1;
    
    -- Deactivate all existing active checkpoints for this essay FIRST
    -- This prevents the unique constraint violation
    UPDATE essay_checkpoints
    SET is_active = false
    WHERE essay_id = essay_uuid AND is_active = true;
    
    -- Create the new checkpoint
    INSERT INTO essay_checkpoints (
        essay_id,
        user_id,
        checkpoint_number,
        version_number,
        essay_content,
        essay_title,
        essay_prompt,
        version_name,
        is_fresh_draft,
        parent_checkpoint_id,
        has_ai_feedback,
        is_active,
        ai_model,
        total_comments,
        overall_comments,
        inline_comments,
        opening_sentence_comments,
        transition_comments,
        paragraph_specific_comments,
        average_confidence_score,
        average_quality_score
    ) VALUES (
        essay_uuid,
        user_uuid,
        next_version,
        next_version,
        essay_content,
        essay_title,
        essay_prompt,
        'Version ' || next_version::text || ' (with AI Feedback)',
        false,
        parent_checkpoint_id,
        true,
        true,
        ai_model_param,
        total_comments_param,
        overall_comments_param,
        inline_comments_param,
        opening_sentence_comments_param,
        transition_comments_param,
        paragraph_specific_comments_param,
        average_confidence_score_param,
        average_quality_score_param
    ) RETURNING id INTO new_checkpoint_id;
    
    RETURN new_checkpoint_id;
END;
$$ LANGUAGE plpgsql;
