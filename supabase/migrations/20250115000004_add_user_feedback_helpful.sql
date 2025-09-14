-- Add user feedback field to essay_comments table for AI fine-tuning
-- This allows users to rate whether AI comments are helpful

-- Add user_feedback_helpful column to track user satisfaction with AI comments
ALTER TABLE public.essay_comments 
ADD COLUMN user_feedback_helpful BOOLEAN DEFAULT NULL CHECK (user_feedback_helpful IN (true, false, NULL));

-- Add index for performance on feedback queries
CREATE INDEX idx_essay_comments_user_feedback ON essay_comments(user_feedback_helpful);

-- Add composite index for AI comment feedback analysis
CREATE INDEX idx_essay_comments_ai_feedback ON essay_comments(ai_generated, user_feedback_helpful) WHERE ai_generated = true;

-- Add comment explaining the new column
COMMENT ON COLUMN essay_comments.user_feedback_helpful IS 'User feedback on AI comment helpfulness: true (helpful), false (not helpful), NULL (no feedback yet)';

-- Add constraint to ensure only AI-generated comments can have user feedback
-- This prevents confusion with user-generated comments
ALTER TABLE public.essay_comments 
ADD CONSTRAINT essay_comments_user_feedback_ai_only 
CHECK (
  (ai_generated = false AND user_feedback_helpful IS NULL) OR 
  (ai_generated = true)
);

-- Create function to get AI comment feedback statistics
CREATE OR REPLACE FUNCTION get_ai_comment_feedback_stats()
RETURNS TABLE (
  total_ai_comments BIGINT,
  helpful_feedback_count BIGINT,
  not_helpful_feedback_count BIGINT,
  no_feedback_count BIGINT,
  helpful_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_ai_comments,
    COUNT(*) FILTER (WHERE user_feedback_helpful = true) as helpful_feedback_count,
    COUNT(*) FILTER (WHERE user_feedback_helpful = false) as not_helpful_feedback_count,
    COUNT(*) FILTER (WHERE user_feedback_helpful IS NULL) as no_feedback_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND(
          (COUNT(*) FILTER (WHERE user_feedback_helpful = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
          2
        )
      ELSE 0 
    END as helpful_percentage
  FROM essay_comments 
  WHERE ai_generated = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get feedback stats by agent type
CREATE OR REPLACE FUNCTION get_ai_comment_feedback_by_agent()
RETURNS TABLE (
  agent_type VARCHAR(20),
  total_comments BIGINT,
  helpful_count BIGINT,
  not_helpful_count BIGINT,
  helpful_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ec.agent_type, 'unknown') as agent_type,
    COUNT(*) as total_comments,
    COUNT(*) FILTER (WHERE ec.user_feedback_helpful = true) as helpful_count,
    COUNT(*) FILTER (WHERE ec.user_feedback_helpful = false) as not_helpful_count,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND(
          (COUNT(*) FILTER (WHERE ec.user_feedback_helpful = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
          2
        )
      ELSE 0 
    END as helpful_percentage
  FROM essay_comments ec
  WHERE ec.ai_generated = true
  GROUP BY ec.agent_type
  ORDER BY total_comments DESC;
END;
$$ LANGUAGE plpgsql;
