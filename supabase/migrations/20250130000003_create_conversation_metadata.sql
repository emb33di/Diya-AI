-- Create conversation_metadata table for storing conversation transcripts and summaries
CREATE TABLE IF NOT EXISTS conversation_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,
  transcript TEXT,
  audio_url TEXT,
  session_number INTEGER DEFAULT 1,
  duration_seconds INTEGER,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_conversation_id ON conversation_metadata(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_user_id ON conversation_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_created_at ON conversation_metadata(created_at);

-- Add RLS policies
ALTER TABLE conversation_metadata ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own conversation metadata
DROP POLICY IF EXISTS "Users can view their own conversation metadata" ON conversation_metadata;
CREATE POLICY "Users can view their own conversation metadata" ON conversation_metadata
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own conversation metadata
DROP POLICY IF EXISTS "Users can insert their own conversation metadata" ON conversation_metadata;
CREATE POLICY "Users can insert their own conversation metadata" ON conversation_metadata
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own conversation metadata
DROP POLICY IF EXISTS "Users can update their own conversation metadata" ON conversation_metadata;
CREATE POLICY "Users can update their own conversation metadata" ON conversation_metadata
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE conversation_metadata IS 'Stores conversation transcripts, summaries, and metadata for voice sessions';
