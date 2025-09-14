-- Fix immediate priority issues in AI comment schema and design
-- This migration addresses critical schema alignment, validation, and error handling issues

-- 1. Fix Schema Alignment Issues
-- Add missing fields that AI outputs but database doesn't store
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS comment_nature VARCHAR(20) CHECK (comment_nature IN ('strength', 'weakness', 'combined', 'neutral')),
ADD COLUMN IF NOT EXISTS organization_category VARCHAR(30) CHECK (organization_category IN ('overall-strength', 'overall-weakness', 'overall-combined', 'inline')),
ADD COLUMN IF NOT EXISTS reconciliation_source VARCHAR(20) CHECK (reconciliation_source IN ('strength', 'weakness', 'both', 'none')),
ADD COLUMN IF NOT EXISTS reconciliation_type VARCHAR(30) CHECK (reconciliation_type IN ('reconciled', 'strength-enhanced', 'weakness-enhanced', 'balanced')),
ADD COLUMN IF NOT EXISTS original_source VARCHAR(20) CHECK (original_source IN ('strength', 'weakness', 'both')),
ADD COLUMN IF NOT EXISTS score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS score_color VARCHAR(20);

-- 2. Add Comment Quality and Validation Fields
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS comment_quality_score DECIMAL(3,2) CHECK (comment_quality_score >= 0 AND comment_quality_score <= 1),
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_of_comment_id UUID REFERENCES essay_comments(id),
ADD COLUMN IF NOT EXISTS anchor_text_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS anchor_text_validation_error TEXT,
ADD COLUMN IF NOT EXISTS comment_priority INTEGER DEFAULT 5 CHECK (comment_priority >= 1 AND comment_priority <= 10);

-- 3. Add Error Handling and Resilience Fields
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS generation_method VARCHAR(30) DEFAULT 'ai' CHECK (generation_method IN ('ai', 'fallback', 'manual', 'retry')),
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS generation_error TEXT,
ADD COLUMN IF NOT EXISTS is_fallback_comment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fallback_reason TEXT;

-- 4. Add AI Model and Context Tracking
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS prompt_hash VARCHAR(64), -- Hash of the prompt used for generation
ADD COLUMN IF NOT EXISTS generation_context JSONB, -- Store context like essay length, prompt type, etc.
ADD COLUMN IF NOT EXISTS generation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_essay_comments_duplicate ON essay_comments(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_essay_comments_priority ON essay_comments(comment_priority);
CREATE INDEX IF NOT EXISTS idx_essay_comments_generation_method ON essay_comments(generation_method);
CREATE INDEX IF NOT EXISTS idx_essay_comments_anchor_validated ON essay_comments(anchor_text_validated);
CREATE INDEX IF NOT EXISTS idx_essay_comments_quality_score ON essay_comments(comment_quality_score);
CREATE INDEX IF NOT EXISTS idx_essay_comments_model_version ON essay_comments(ai_model_version);

-- 6. Add constraints for data integrity
-- Ensure fallback comments have a reason
ALTER TABLE public.essay_comments 
ADD CONSTRAINT essay_comments_fallback_reason_check 
CHECK (
  (is_fallback_comment = false) OR 
  (is_fallback_comment = true AND fallback_reason IS NOT NULL)
);

-- Ensure duplicate comments reference a valid parent
ALTER TABLE public.essay_comments 
ADD CONSTRAINT essay_comments_duplicate_reference_check 
CHECK (
  (is_duplicate = false) OR 
  (is_duplicate = true AND duplicate_of_comment_id IS NOT NULL)
);

-- 7. Create function to validate anchor text
CREATE OR REPLACE FUNCTION validate_anchor_text()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called by application code to validate anchor text
  -- For now, just mark as needing validation
  IF NEW.anchor_text IS NOT NULL AND NEW.anchor_text_validated = false THEN
    NEW.anchor_text_validation_error := 'Pending validation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to detect duplicate comments
CREATE OR REPLACE FUNCTION detect_duplicate_comments()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Check for similar comments on the same essay
  SELECT COUNT(*) INTO duplicate_count
  FROM essay_comments 
  WHERE essay_id = NEW.essay_id 
    AND id != NEW.id
    AND comment_text = NEW.comment_text
    AND comment_type = NEW.comment_type
    AND created_at > NOW() - INTERVAL '1 hour'; -- Only check recent comments
    
  IF duplicate_count > 0 THEN
    NEW.is_duplicate := true;
    NEW.comment_priority := NEW.comment_priority - 2; -- Lower priority for duplicates
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to calculate comment priority
CREATE OR REPLACE FUNCTION calculate_comment_priority()
RETURNS TRIGGER AS $$
BEGIN
  -- Base priority calculation
  NEW.comment_priority := 5; -- Default priority
  
  -- Increase priority for high-confidence comments
  IF NEW.confidence_score >= 0.8 THEN
    NEW.comment_priority := NEW.comment_priority + 2;
  ELSIF NEW.confidence_score >= 0.6 THEN
    NEW.comment_priority := NEW.comment_priority + 1;
  END IF;
  
  -- Increase priority for opening sentence comments
  IF NEW.comment_subcategory = 'opening-sentence' THEN
    NEW.comment_priority := NEW.comment_priority + 2;
  END IF;
  
  -- Increase priority for transition comments
  IF NEW.comment_subcategory = 'transition' THEN
    NEW.comment_priority := NEW.comment_priority + 1;
  END IF;
  
  -- Decrease priority for fallback comments
  IF NEW.is_fallback_comment = true THEN
    NEW.comment_priority := NEW.comment_priority - 3;
  END IF;
  
  -- Ensure priority stays within bounds
  NEW.comment_priority := GREATEST(1, LEAST(10, NEW.comment_priority));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers
CREATE TRIGGER trigger_validate_anchor_text
  BEFORE INSERT OR UPDATE ON essay_comments
  FOR EACH ROW
  EXECUTE FUNCTION validate_anchor_text();

CREATE TRIGGER trigger_detect_duplicates
  BEFORE INSERT ON essay_comments
  FOR EACH ROW
  EXECUTE FUNCTION detect_duplicate_comments();

CREATE TRIGGER trigger_calculate_priority
  BEFORE INSERT OR UPDATE ON essay_comments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_comment_priority();

-- 11. Add comments explaining new fields
COMMENT ON COLUMN essay_comments.comment_nature IS 'Nature of the comment: strength, weakness, combined, or neutral';
COMMENT ON COLUMN essay_comments.organization_category IS 'How the comment is organized: overall vs inline';
COMMENT ON COLUMN essay_comments.reconciliation_source IS 'Source of reconciliation for balanced feedback';
COMMENT ON COLUMN essay_comments.comment_quality_score IS 'Quality score for the comment (0-1)';
COMMENT ON COLUMN essay_comments.is_duplicate IS 'Whether this comment is a duplicate of another';
COMMENT ON COLUMN essay_comments.anchor_text_validated IS 'Whether the anchor text has been validated against current essay content';
COMMENT ON COLUMN essay_comments.comment_priority IS 'Priority of the comment (1-10, higher is more important)';
COMMENT ON COLUMN essay_comments.generation_method IS 'How the comment was generated: ai, fallback, manual, or retry';
COMMENT ON COLUMN essay_comments.is_fallback_comment IS 'Whether this is a fallback comment generated when AI failed';
COMMENT ON COLUMN essay_comments.ai_model_version IS 'Version of the AI model that generated this comment';
COMMENT ON COLUMN essay_comments.prompt_hash IS 'Hash of the prompt used for generation';
COMMENT ON COLUMN essay_comments.generation_context IS 'Context information about the generation process';

-- 12. Create view for high-priority comments
CREATE OR REPLACE VIEW high_priority_comments AS
SELECT 
  ec.*,
  e.title as essay_title,
  e.school_name
FROM essay_comments ec
JOIN essays e ON ec.essay_id = e.id
WHERE ec.comment_priority >= 7
  AND ec.resolved = false
  AND ec.is_duplicate = false
ORDER BY ec.comment_priority DESC, ec.confidence_score DESC;

-- 13. Create function to clean up old duplicate comments
CREATE OR REPLACE FUNCTION cleanup_duplicate_comments()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete duplicate comments older than 24 hours
  DELETE FROM essay_comments 
  WHERE is_duplicate = true 
    AND created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 14. Create function to validate all anchor texts for an essay
CREATE OR REPLACE FUNCTION validate_essay_anchor_texts(essay_uuid UUID)
RETURNS TABLE (
  comment_id UUID,
  anchor_text TEXT,
  is_valid BOOLEAN,
  validation_error TEXT
) AS $$
DECLARE
  essay_content TEXT;
BEGIN
  -- Get current essay content
  SELECT content::text INTO essay_content
  FROM essays 
  WHERE id = essay_uuid;
  
  -- Return validation results for all comments
  RETURN QUERY
  SELECT 
    ec.id,
    ec.anchor_text,
    CASE 
      WHEN essay_content ILIKE '%' || ec.anchor_text || '%' THEN true
      ELSE false
    END as is_valid,
    CASE 
      WHEN essay_content ILIKE '%' || ec.anchor_text || '%' THEN NULL
      ELSE 'Anchor text not found in current essay content'
    END as validation_error
  FROM essay_comments ec
  WHERE ec.essay_id = essay_uuid
    AND ec.anchor_text IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
