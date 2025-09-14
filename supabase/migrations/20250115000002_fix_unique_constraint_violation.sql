-- Fix unique constraint violation in create_ai_feedback_checkpoint function
-- The function now deactivates existing checkpoints before inserting new one

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
