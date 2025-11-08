-- Create guest_essays table for temporary storage of anonymous user preview essays
-- This table stores essay data temporarily (7 days) before migration to user accounts

CREATE TABLE IF NOT EXISTS public.guest_essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Essay data (same structure as essays table)
  title TEXT NOT NULL,
  school_name TEXT,
  prompt_text TEXT NOT NULL,
  word_limit TEXT,
  essay_content TEXT NOT NULL, -- Full essay text
  
  -- Semantic document data (stored as JSONB)
  semantic_document JSONB NOT NULL, -- Full SemanticDocument object with blocks
  semantic_annotations JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of Annotation objects
  
  -- Grading scores
  grading_scores JSONB, -- { bigPicture: number, tone: number, clarity: number }
  
  -- Session tracking
  session_id TEXT, -- Optional: browser session ID for cleanup
  user_agent TEXT,
  ip_address TEXT,
  
  -- Expiration (auto-cleanup old entries)
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_guest_essays_session_id ON guest_essays(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_essays_expires_at ON guest_essays(expires_at);
CREATE INDEX IF NOT EXISTS idx_guest_essays_created_at ON guest_essays(created_at);

-- Auto-cleanup function (optional, can be handled by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_guest_essays()
RETURNS void AS $$
BEGIN
  DELETE FROM guest_essays WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_guest_essays() TO authenticated;

-- Explicitly disable RLS for guest_essays table
-- This table is for anonymous users who don't have authentication
-- We'll rely on session_id and expiration for security instead
ALTER TABLE public.guest_essays DISABLE ROW LEVEL SECURITY;

-- Grant permissions for anonymous access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_essays TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_essays TO authenticated;

-- Add comment to table
COMMENT ON TABLE public.guest_essays IS 'Temporary storage for anonymous user preview essays. Data expires after 7 days and is migrated to user accounts upon signup.';

