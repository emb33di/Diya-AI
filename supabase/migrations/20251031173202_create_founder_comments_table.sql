-- Create founder_comments table
-- This table stores founder comments linked to specific essays
-- Allows for better querying and management of founder feedback separate from escalation snapshots

CREATE TABLE IF NOT EXISTS public.founder_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  escalation_id UUID REFERENCES escalated_essays(id) ON DELETE SET NULL,
  block_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'suggestion', 'critique', 'praise', 'question', 'highlight')),
  content TEXT NOT NULL,
  target_text TEXT,
  position_start INTEGER,
  position_end INTEGER,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_founder_comments_essay_id ON founder_comments(essay_id);
CREATE INDEX IF NOT EXISTS idx_founder_comments_escalation_id ON founder_comments(escalation_id);
CREATE INDEX IF NOT EXISTS idx_founder_comments_block_id ON founder_comments(block_id);
CREATE INDEX IF NOT EXISTS idx_founder_comments_resolved ON founder_comments(resolved);
CREATE INDEX IF NOT EXISTS idx_founder_comments_type ON founder_comments(type);
CREATE INDEX IF NOT EXISTS idx_founder_comments_created_at ON founder_comments(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_founder_comments_updated_at
  BEFORE UPDATE ON founder_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.founder_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view founder comments for their own essays
CREATE POLICY "Users can view founder comments for their essays" ON founder_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM essays
      WHERE essays.id = founder_comments.essay_id
      AND essays.user_id = auth.uid()
    )
  );

-- RLS Policy: Founders can insert comments
CREATE POLICY "Founders can insert comments" ON founder_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_founder = true
    )
  );

-- RLS Policy: Founders can update their comments
CREATE POLICY "Founders can update comments" ON founder_comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_founder = true
    )
  );

-- RLS Policy: Founders can delete their comments
CREATE POLICY "Founders can delete comments" ON founder_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_founder = true
    )
  );

-- Add comments
COMMENT ON TABLE founder_comments IS 'Stores founder comments linked to specific essays for better querying and display';
COMMENT ON COLUMN founder_comments.essay_id IS 'Links comment to the user''s essay';
COMMENT ON COLUMN founder_comments.escalation_id IS 'Optional reference to the escalation that triggered this comment (for tracking)';
COMMENT ON COLUMN founder_comments.block_id IS 'Stable reference to the document block this comment targets';
COMMENT ON COLUMN founder_comments.type IS 'Type of comment: comment, suggestion, critique, praise, question, highlight';
COMMENT ON COLUMN founder_comments.target_text IS 'Optional specific text within the block that this comment targets';
COMMENT ON COLUMN founder_comments.position_start IS 'Start position of target text within block (if applicable)';
COMMENT ON COLUMN founder_comments.position_end IS 'End position of target text within block (if applicable)';
COMMENT ON COLUMN founder_comments.metadata IS 'Additional comment metadata';

