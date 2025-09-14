-- Create conversation_tracking table
CREATE TABLE IF NOT EXISTS conversation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  conversation_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  conversation_ended_at TIMESTAMP WITH TIME ZONE,
  metadata_retrieved BOOLEAN DEFAULT FALSE,
  metadata_retrieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_tracking_conversation_id ON conversation_tracking(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tracking_user_id ON conversation_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tracking_ended_at ON conversation_tracking(conversation_ended_at);
CREATE INDEX IF NOT EXISTS idx_conversation_tracking_metadata_retrieved ON conversation_tracking(metadata_retrieved);

-- Add RLS policies
ALTER TABLE conversation_tracking ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own conversations
CREATE POLICY "Users can view their own conversation tracking" ON conversation_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own conversations
CREATE POLICY "Users can insert their own conversation tracking" ON conversation_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own conversations
CREATE POLICY "Users can update their own conversation tracking" ON conversation_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE conversation_tracking IS 'Tracks conversation sessions between users and Diya'; 