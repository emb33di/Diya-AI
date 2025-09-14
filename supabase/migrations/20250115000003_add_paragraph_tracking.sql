-- Add paragraph tracking to essay checkpoints for change detection
-- This enables exact paragraph matching between essay versions

-- Add paragraph tracking fields to essay_checkpoints
ALTER TABLE public.essay_checkpoints 
ADD COLUMN IF NOT EXISTS paragraph_hashes JSONB, -- Array of paragraph content hashes for this version
ADD COLUMN IF NOT EXISTS paragraph_count INTEGER DEFAULT 0, -- Number of paragraphs in this version
ADD COLUMN IF NOT EXISTS paragraph_changes JSONB; -- Track which paragraphs changed from previous version

-- Create index for paragraph hash queries
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_paragraph_hashes ON essay_checkpoints USING GIN (paragraph_hashes);

-- Add comment explaining the new fields
COMMENT ON COLUMN essay_checkpoints.paragraph_hashes IS 'Array of SHA-256 hashes for each paragraph content for exact matching';
COMMENT ON COLUMN essay_checkpoints.paragraph_count IS 'Total number of paragraphs in this essay version';
COMMENT ON COLUMN essay_checkpoints.paragraph_changes IS 'JSON object tracking which paragraphs changed: {changed: [0,2,3], unchanged: [1,4]}';

-- Create a function to generate paragraph hashes
CREATE OR REPLACE FUNCTION generate_paragraph_hashes(essay_content TEXT)
RETURNS JSONB AS $$
DECLARE
    paragraphs TEXT[];
    hashes JSONB := '[]'::jsonb;
    paragraph_hash TEXT;
    paragraph TEXT;
BEGIN
    -- Split content into paragraphs using the same logic as the AI functions
    -- This ensures consistency with the paragraph extraction used in comment generation
    WITH processed_content AS (
        SELECT regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(
                            regexp_replace(
                                regexp_replace(
                                    regexp_replace(essay_content, '</p>\s*<p[^>]*>', '\n\n', 'gi'),
                                    '<p[^>]*>', '', 'gi'
                                ),
                                '</p>', '', 'gi'
                            ),
                            '<br\s*\/?>', '\n', 'gi'
                        ),
                        '<[^>]*>', '', 'g'
                    ),
                    '&nbsp;', ' ', 'g'
                ),
                '&amp;', '&', 'g'
            ),
            '&lt;', '<', 'g'
        ) AS content
    ),
    split_paragraphs AS (
        SELECT trim(unnest(string_to_array(
            regexp_replace(content, '\n\s*\n', '\n\n', 'g'), 
            '\n\n'
        ))) AS paragraph
        FROM processed_content
        WHERE length(trim(content)) > 0
    )
    SELECT array_agg(paragraph) INTO paragraphs
    FROM split_paragraphs
    WHERE length(trim(paragraph)) > 0;
    
    -- Generate SHA-256 hash for each paragraph
    FOR paragraph IN SELECT unnest(paragraphs)
    LOOP
        paragraph_hash := encode(digest(trim(paragraph), 'sha256'), 'hex');
        hashes := hashes || to_jsonb(paragraph_hash);
    END LOOP;
    
    RETURN hashes;
END;
$$ LANGUAGE plpgsql;

-- Create a function to compare paragraph changes between two checkpoints
CREATE OR REPLACE FUNCTION compare_paragraph_changes(
    current_checkpoint_id UUID,
    previous_checkpoint_id UUID
)
RETURNS JSONB AS $$
DECLARE
    current_hashes JSONB;
    previous_hashes JSONB;
    changed_paragraphs INTEGER[] := '{}';
    unchanged_paragraphs INTEGER[] := '{}';
    i INTEGER;
    current_hash TEXT;
    previous_hash TEXT;
BEGIN
    -- Get paragraph hashes for both checkpoints
    SELECT paragraph_hashes INTO current_hashes
    FROM essay_checkpoints 
    WHERE id = current_checkpoint_id;
    
    SELECT paragraph_hashes INTO previous_hashes
    FROM essay_checkpoints 
    WHERE id = previous_checkpoint_id;
    
    -- If no previous checkpoint, all paragraphs are new
    IF previous_hashes IS NULL THEN
        FOR i IN 0..jsonb_array_length(current_hashes) - 1 LOOP
            changed_paragraphs := changed_paragraphs || i;
        END LOOP;
    ELSE
        -- Compare each paragraph
        FOR i IN 0..jsonb_array_length(current_hashes) - 1 LOOP
            current_hash := current_hashes->>i;
            
            -- Check if this paragraph index exists in previous version
            IF i < jsonb_array_length(previous_hashes) THEN
                previous_hash := previous_hashes->>i;
                
                -- Compare hashes
                IF current_hash = previous_hash THEN
                    unchanged_paragraphs := unchanged_paragraphs || i;
                ELSE
                    changed_paragraphs := changed_paragraphs || i;
                END IF;
            ELSE
                -- New paragraph (beyond previous version length)
                changed_paragraphs := changed_paragraphs || i;
            END IF;
        END LOOP;
    END IF;
    
    RETURN jsonb_build_object(
        'changed', to_jsonb(changed_paragraphs),
        'unchanged', to_jsonb(unchanged_paragraphs),
        'total_current', jsonb_array_length(current_hashes),
        'total_previous', COALESCE(jsonb_array_length(previous_hashes), 0)
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to update paragraph tracking when creating a new checkpoint
CREATE OR REPLACE FUNCTION update_checkpoint_paragraph_tracking(
    checkpoint_uuid UUID
)
RETURNS VOID AS $$
DECLARE
    essay_content TEXT;
    paragraph_hashes JSONB;
    paragraph_count INTEGER;
    parent_checkpoint_id UUID;
    paragraph_changes JSONB;
BEGIN
    -- Get the checkpoint data
    SELECT ec.essay_content, ec.parent_checkpoint_id
    INTO essay_content, parent_checkpoint_id
    FROM essay_checkpoints ec
    WHERE ec.id = checkpoint_uuid;
    
    -- Generate paragraph hashes
    paragraph_hashes := generate_paragraph_hashes(essay_content);
    paragraph_count := jsonb_array_length(paragraph_hashes);
    
    -- Compare with previous checkpoint if it exists
    IF parent_checkpoint_id IS NOT NULL THEN
        paragraph_changes := compare_paragraph_changes(checkpoint_uuid, parent_checkpoint_id);
    ELSE
        -- First checkpoint - all paragraphs are new
        paragraph_changes := jsonb_build_object(
            'changed', (SELECT jsonb_agg(i) FROM generate_series(0, paragraph_count - 1) AS i),
            'unchanged', '[]'::jsonb,
            'total_current', paragraph_count,
            'total_previous', 0
        );
    END IF;
    
    -- Update the checkpoint with paragraph tracking data
    UPDATE essay_checkpoints
    SET 
        paragraph_hashes = paragraph_hashes,
        paragraph_count = paragraph_count,
        paragraph_changes = paragraph_changes
    WHERE id = checkpoint_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get unchanged paragraphs with existing comments
CREATE OR REPLACE FUNCTION get_unchanged_paragraphs_with_comments(
    essay_uuid UUID,
    checkpoint_uuid UUID
)
RETURNS TABLE(
    paragraph_index INTEGER,
    paragraph_text TEXT,
    has_existing_comments BOOLEAN,
    comment_count INTEGER
) AS $$
DECLARE
    paragraph_changes JSONB;
    unchanged_indices INTEGER[];
    essay_content TEXT;
    paragraphs TEXT[];
    i INTEGER;
    paragraph_index INTEGER;
    paragraph_text TEXT;
    comment_count INTEGER;
BEGIN
    -- Get paragraph changes data
    SELECT ec.paragraph_changes, ec.essay_content
    INTO paragraph_changes, essay_content
    FROM essay_checkpoints ec
    WHERE ec.id = checkpoint_uuid;
    
    -- Extract unchanged paragraph indices
    SELECT array_agg(value::INTEGER) INTO unchanged_indices
    FROM jsonb_array_elements(paragraph_changes->'unchanged');
    
    -- Split essay into paragraphs (same logic as hash generation)
    WITH processed_content AS (
        SELECT regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(
                            regexp_replace(
                                regexp_replace(
                                    regexp_replace(essay_content, '</p>\s*<p[^>]*>', '\n\n', 'gi'),
                                    '<p[^>]*>', '', 'gi'
                                ),
                                '</p>', '', 'gi'
                            ),
                            '<br\s*\/?>', '\n', 'gi'
                        ),
                        '<[^>]*>', '', 'g'
                    ),
                    '&nbsp;', ' ', 'g'
                ),
                '&amp;', '&', 'g'
            ),
            '&lt;', '<', 'g'
        ) AS content
    ),
    split_paragraphs AS (
        SELECT trim(unnest(string_to_array(
            regexp_replace(content, '\n\s*\n', '\n\n', 'g'), 
            '\n\n'
        ))) AS paragraph
        FROM processed_content
        WHERE length(trim(content)) > 0
    )
    SELECT array_agg(paragraph) INTO paragraphs
    FROM split_paragraphs
    WHERE length(trim(paragraph)) > 0;
    
    -- Return unchanged paragraphs with comment information
    FOR i IN 1..array_length(unchanged_indices, 1) LOOP
        paragraph_index := unchanged_indices[i];
        
        -- Get paragraph text (1-indexed to 0-indexed conversion)
        IF paragraph_index < array_length(paragraphs, 1) THEN
            paragraph_text := paragraphs[paragraph_index + 1];
            
            -- Check for existing comments on this paragraph
            SELECT COUNT(*) INTO comment_count
            FROM essay_comments ec
            WHERE ec.essay_id = essay_uuid
            AND ec.checkpoint_id = checkpoint_uuid
            AND ec.paragraph_index = paragraph_index
            AND ec.ai_generated = true;
            
            paragraph_index := paragraph_index; -- Return 0-indexed
            has_existing_comments := (comment_count > 0);
            
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
