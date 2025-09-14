-- Fix the create_fresh_draft_checkpoint function to prevent unique constraint violations
-- The issue was that the function was trying to insert a new active checkpoint
-- while another active checkpoint already existed, violating the unique constraint

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
