-- Fix the duplicate detection trigger to properly set duplicate_of_comment_id
-- This fixes the constraint violation error

-- Drop the existing trigger
DROP TRIGGER IF EXISTS validate_anchor_text_trigger ON essay_comments;

-- Recreate the trigger function with proper duplicate handling
CREATE OR REPLACE FUNCTION validate_anchor_text()
RETURNS TRIGGER AS $$
DECLARE
  duplicate_count INTEGER;
  duplicate_comment_id UUID;
BEGIN
  -- Check for similar comments on the same essay
  SELECT COUNT(*), MIN(id) INTO duplicate_count, duplicate_comment_id
  FROM essay_comments 
  WHERE essay_id = NEW.essay_id 
    AND id != NEW.id
    AND comment_text = NEW.comment_text
    AND comment_type = NEW.comment_type
    AND created_at > NOW() - INTERVAL '1 hour'; -- Only check recent comments
    
  IF duplicate_count > 0 THEN
    NEW.is_duplicate := true;
    NEW.duplicate_of_comment_id := duplicate_comment_id; -- Set the reference to the original comment
    NEW.comment_priority := NEW.comment_priority - 2; -- Lower priority for duplicates
  ELSE
    NEW.is_duplicate := false; -- Ensure it's explicitly set to false
    NEW.duplicate_of_comment_id := NULL; -- Ensure it's explicitly set to null
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER validate_anchor_text_trigger
  BEFORE INSERT OR UPDATE ON essay_comments
  FOR EACH ROW
  EXECUTE FUNCTION validate_anchor_text();

-- Add comment explaining the fix
COMMENT ON FUNCTION validate_anchor_text() IS 'Validates anchor text and detects duplicates, properly setting duplicate_of_comment_id to satisfy constraint';
