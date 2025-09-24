-- Create essay checkpoints table for storing essay versions with AI feedback
CREATE TABLE public.essay_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL, -- REFERENCES essays(id) ON DELETE CASCADE, -- Will add FK constraint later
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Checkpoint metadata
  checkpoint_number INTEGER NOT NULL DEFAULT 1,
  essay_content TEXT NOT NULL,
  essay_title TEXT,
  essay_prompt TEXT,
  
  -- AI feedback metadata
  ai_feedback_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_model VARCHAR(50) DEFAULT 'gemini-2.5-flash-lite',
  total_comments INTEGER DEFAULT 0,
  
  -- Comment counts by category
  overall_comments INTEGER DEFAULT 0,
  inline_comments INTEGER DEFAULT 0,
  opening_sentence_comments INTEGER DEFAULT 0,
  transition_comments INTEGER DEFAULT 0,
  paragraph_specific_comments INTEGER DEFAULT 0,
  
  -- Quality metrics
  average_confidence_score DECIMAL(3,2),
  average_quality_score DECIMAL(3,2),
  
  -- Status
  is_active BOOLEAN DEFAULT false, -- Only one checkpoint can be active per essay
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_essay_checkpoints_essay_id ON essay_checkpoints(essay_id);
CREATE INDEX idx_essay_checkpoints_user_id ON essay_checkpoints(user_id);
CREATE INDEX idx_essay_checkpoints_checkpoint_number ON essay_checkpoints(essay_id, checkpoint_number);
CREATE INDEX idx_essay_checkpoints_active ON essay_checkpoints(essay_id, is_active) WHERE is_active = true;
CREATE INDEX idx_essay_checkpoints_created_at ON essay_checkpoints(created_at);

-- Create unique constraint to ensure only one active checkpoint per essay
CREATE UNIQUE INDEX idx_essay_checkpoints_unique_active ON essay_checkpoints(essay_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.essay_checkpoints ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own essay checkpoints" ON essay_checkpoints
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own essay checkpoints" ON essay_checkpoints
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essay checkpoints" ON essay_checkpoints
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essay checkpoints" ON essay_checkpoints
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_essay_checkpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_essay_checkpoints_updated_at
  BEFORE UPDATE ON essay_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_essay_checkpoints_updated_at();

-- Add comment to table
COMMENT ON TABLE essay_checkpoints IS 'Stores essay versions with AI feedback as checkpoints for iterative improvement';
