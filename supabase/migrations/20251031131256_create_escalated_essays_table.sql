-- Create escalated_essays table
-- This table stores snapshots of essays when students escalate them to the founder
-- for review and feedback

CREATE TABLE IF NOT EXISTS public.escalated_essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Snapshot of essay state at escalation time
  essay_title TEXT NOT NULL,
  essay_content JSONB NOT NULL, -- Full semantic document snapshot (blocks, metadata)
  essay_prompt TEXT,
  word_limit TEXT,
  word_count INTEGER DEFAULT 0,
  character_count INTEGER DEFAULT 0,
  
  -- Current AI comments at time of escalation (snapshot from semantic_annotations)
  ai_comments_snapshot JSONB DEFAULT '[]'::jsonb, -- Array of comment objects
  
  -- Semantic document ID at time of escalation (for reference)
  semantic_document_id UUID REFERENCES semantic_documents(id),
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'reviewed', 'sent_back')),
  
  -- Founder feedback (when reviewed)
  founder_feedback TEXT, -- Overall feedback from founder
  founder_edited_content JSONB, -- Edited version if founder makes changes
  founder_comments JSONB DEFAULT '[]'::jsonb, -- Array of founder comments (similar structure to AI comments)
  
  -- Timestamps
  escalated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  sent_back_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_escalated_essays_essay_id ON escalated_essays(essay_id);
CREATE INDEX IF NOT EXISTS idx_escalated_essays_user_id ON escalated_essays(user_id);
CREATE INDEX IF NOT EXISTS idx_escalated_essays_status ON escalated_essays(status);
CREATE INDEX IF NOT EXISTS idx_escalated_essays_escalated_at ON escalated_essays(escalated_at DESC);
CREATE INDEX IF NOT EXISTS idx_escalated_essays_pending ON escalated_essays(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_escalated_essays_in_review ON escalated_essays(status) WHERE status = 'in_review';

-- Create trigger for updated_at
CREATE TRIGGER update_escalated_essays_updated_at
  BEFORE UPDATE ON escalated_essays
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.escalated_essays ENABLE ROW LEVEL SECURITY;

-- RLS Policies will be created in a separate migration after is_founder column is added
-- (Need founder role check in policies)

-- Add comments
COMMENT ON TABLE escalated_essays IS 'Stores snapshots of essays when students escalate them to founder for review';
COMMENT ON COLUMN escalated_essays.essay_content IS 'Full semantic document snapshot with blocks and metadata at time of escalation';
COMMENT ON COLUMN escalated_essays.ai_comments_snapshot IS 'Snapshot of all AI comments (from semantic_annotations) at time of escalation';
COMMENT ON COLUMN escalated_essays.status IS 'Current status: pending (awaiting founder), in_review, reviewed, sent_back';
COMMENT ON COLUMN escalated_essays.founder_comments IS 'Comments added by founder during review (JSON array)';
COMMENT ON COLUMN escalated_essays.founder_edited_content IS 'Optional edited version of essay content if founder makes direct edits';

