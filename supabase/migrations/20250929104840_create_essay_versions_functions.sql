-- Create database functions for semantic essay versioning
-- This migration creates atomic functions to handle essay_versions table operations
-- Similar to the legacy essay_checkpoints functions but adapted for the semantic system

-- Create a function to get the next version number for an essay
CREATE OR REPLACE FUNCTION get_next_essay_version_number(essay_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM essay_versions
    WHERE essay_id = essay_uuid;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Create a function to create a fresh draft version (semantic system)
CREATE OR REPLACE FUNCTION create_fresh_draft_essay_version(
    essay_uuid UUID,
    user_uuid UUID,
    semantic_document_uuid UUID,
    version_content JSONB,
    version_name_param TEXT DEFAULT NULL,
    version_description_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_version_id UUID;
    next_version INTEGER;
    parent_version_id UUID;
BEGIN
    -- Get the next version number
    next_version := get_next_essay_version_number(essay_uuid);
    
    -- Get the most recent version as parent (if any)
    SELECT id INTO parent_version_id
    FROM essay_versions
    WHERE essay_id = essay_uuid
    ORDER BY version_number DESC
    LIMIT 1;
    
    -- Deactivate all existing active versions for this essay FIRST
    -- This prevents the unique constraint violation
    UPDATE essay_versions
    SET is_active = false
    WHERE essay_id = essay_uuid AND is_active = true;
    
    -- Create the new version
    INSERT INTO essay_versions (
        essay_id,
        user_id,
        version_number,
        content,
        version_name,
        version_description,
        is_active,
        semantic_document_id,
        is_fresh_draft,
        has_ai_feedback
    ) VALUES (
        essay_uuid,
        user_uuid,
        next_version,
        version_content,
        COALESCE(version_name_param, 'Version ' || next_version::text),
        COALESCE(version_description_param, 'Fresh draft without previous comments'),
        true,
        semantic_document_uuid,
        true,
        false
    ) RETURNING id INTO new_version_id;
    
    RETURN new_version_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to create a version with AI feedback (semantic system)
CREATE OR REPLACE FUNCTION create_ai_feedback_essay_version(
    essay_uuid UUID,
    user_uuid UUID,
    semantic_document_uuid UUID,
    version_content JSONB,
    essay_content_param TEXT,
    essay_title_param TEXT DEFAULT NULL,
    essay_prompt_param TEXT DEFAULT NULL,
    version_name_param TEXT DEFAULT NULL,
    version_description_param TEXT DEFAULT NULL,
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
    new_version_id UUID;
    next_version INTEGER;
    parent_version_id UUID;
BEGIN
    -- Get the next version number
    next_version := get_next_essay_version_number(essay_uuid);
    
    -- Get the most recent version as parent (if any)
    SELECT id INTO parent_version_id
    FROM essay_versions
    WHERE essay_id = essay_uuid
    ORDER BY version_number DESC
    LIMIT 1;
    
    -- Deactivate all existing active versions for this essay FIRST
    -- This prevents the unique constraint violation
    UPDATE essay_versions
    SET is_active = false
    WHERE essay_id = essay_uuid AND is_active = true;
    
    -- Create the new version with AI feedback
    INSERT INTO essay_versions (
        essay_id,
        user_id,
        version_number,
        content,
        version_name,
        version_description,
        is_active,
        semantic_document_id,
        is_fresh_draft,
        has_ai_feedback,
        essay_content,
        essay_title,
        essay_prompt,
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
        version_content,
        COALESCE(version_name_param, 'Version ' || next_version::text),
        COALESCE(version_description_param, 'Version with AI-generated feedback'),
        true,
        semantic_document_uuid,
        false,
        true,
        essay_content_param,
        essay_title_param,
        essay_prompt_param,
        ai_model_param,
        total_comments_param,
        overall_comments_param,
        inline_comments_param,
        opening_sentence_comments_param,
        transition_comments_param,
        paragraph_specific_comments_param,
        average_confidence_score_param,
        average_quality_score_param
    ) RETURNING id INTO new_version_id;
    
    RETURN new_version_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to switch to a specific version (make it active)
CREATE OR REPLACE FUNCTION switch_to_essay_version(
    essay_uuid UUID,
    version_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    version_exists BOOLEAN;
BEGIN
    -- Check if the version exists and belongs to the essay
    SELECT EXISTS(
        SELECT 1 FROM essay_versions 
        WHERE id = version_uuid AND essay_id = essay_uuid
    ) INTO version_exists;
    
    IF NOT version_exists THEN
        RETURN false;
    END IF;
    
    -- Deactivate all existing active versions for this essay
    UPDATE essay_versions
    SET is_active = false
    WHERE essay_id = essay_uuid AND is_active = true;
    
    -- Activate the specified version
    UPDATE essay_versions
    SET is_active = true
    WHERE id = version_uuid AND essay_id = essay_uuid;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get the active version for an essay
CREATE OR REPLACE FUNCTION get_active_essay_version(essay_uuid UUID)
RETURNS TABLE (
    id UUID,
    essay_id UUID,
    user_id UUID,
    version_number INTEGER,
    content JSONB,
    version_name TEXT,
    version_description TEXT,
    is_active BOOLEAN,
    semantic_document_id UUID,
    is_fresh_draft BOOLEAN,
    has_ai_feedback BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ev.id,
        ev.essay_id,
        ev.user_id,
        ev.version_number,
        ev.content,
        ev.version_name,
        ev.version_description,
        ev.is_active,
        ev.semantic_document_id,
        ev.is_fresh_draft,
        ev.has_ai_feedback,
        ev.created_at,
        ev.updated_at
    FROM essay_versions ev
    WHERE ev.essay_id = essay_uuid AND ev.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get all versions for an essay
CREATE OR REPLACE FUNCTION get_essay_versions(essay_uuid UUID)
RETURNS TABLE (
    id UUID,
    essay_id UUID,
    user_id UUID,
    version_number INTEGER,
    content JSONB,
    version_name TEXT,
    version_description TEXT,
    is_active BOOLEAN,
    semantic_document_id UUID,
    is_fresh_draft BOOLEAN,
    has_ai_feedback BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ev.id,
        ev.essay_id,
        ev.user_id,
        ev.version_number,
        ev.content,
        ev.version_name,
        ev.version_description,
        ev.is_active,
        ev.semantic_document_id,
        ev.is_fresh_draft,
        ev.has_ai_feedback,
        ev.created_at,
        ev.updated_at
    FROM essay_versions ev
    WHERE ev.essay_id = essay_uuid
    ORDER BY ev.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments to explain the functions
COMMENT ON FUNCTION get_next_essay_version_number(UUID) IS 'Gets the next version number for an essay, ensuring sequential numbering';
COMMENT ON FUNCTION create_fresh_draft_essay_version(UUID, UUID, UUID, JSONB, TEXT, TEXT) IS 'Creates a new fresh draft version atomically, preventing race conditions';
COMMENT ON FUNCTION create_ai_feedback_essay_version(UUID, UUID, UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, VARCHAR, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, DECIMAL, DECIMAL) IS 'Creates a new version with AI feedback atomically, preventing race conditions';
COMMENT ON FUNCTION switch_to_essay_version(UUID, UUID) IS 'Switches to a specific version by making it active and deactivating others';
COMMENT ON FUNCTION get_active_essay_version(UUID) IS 'Gets the currently active version for an essay';
COMMENT ON FUNCTION get_essay_versions(UUID) IS 'Gets all versions for an essay ordered by version number descending';
