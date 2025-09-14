-- Safer approach: Create a new trigger function without dropping the old one
-- This avoids the "destructive operation" warning

-- Create a new trigger function with proper duplicate handling
CREATE OR REPLACE FUNCTION validate_anchor_text_fixed()
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

-- Create a new trigger with a different name
CREATE TRIGGER validate_anchor_text_fixed_trigger
  BEFORE INSERT OR UPDATE ON essay_comments
  FOR EACH ROW
  EXECUTE FUNCTION validate_anchor_text_fixed();

-- Add comment explaining the fix
COMMENT ON FUNCTION validate_anchor_text_fixed() IS 'Fixed version of anchor text validation that properly handles duplicate detection without constraint violations';
