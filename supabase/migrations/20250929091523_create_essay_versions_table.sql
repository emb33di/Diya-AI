-- Create essay_versions table with current structure
-- This migration creates the essay_versions table that was missing from the migration history

CREATE TABLE IF NOT EXISTS public.essay_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  version_number INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL,
  version_name TEXT,
  version_description TEXT,
  is_active BOOLEAN DEFAULT false,
  semantic_document_id UUID REFERENCES semantic_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- AI feedback related columns
  is_fresh_draft BOOLEAN DEFAULT false,
  has_ai_feedback BOOLEAN DEFAULT false,
  essay_content TEXT,
  essay_title TEXT,
  essay_prompt TEXT,
  ai_feedback_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_model VARCHAR(50) DEFAULT 'gemini-2.5-flash-lite',
  total_comments INTEGER DEFAULT 0,
  overall_comments INTEGER DEFAULT 0,
  inline_comments INTEGER DEFAULT 0,
  opening_sentence_comments INTEGER DEFAULT 0,
  transition_comments INTEGER DEFAULT 0,
  paragraph_specific_comments INTEGER DEFAULT 0,
  average_confidence_score DECIMAL(3,2),
  average_quality_score DECIMAL(3,2)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_essay_versions_essay_id ON essay_versions(essay_id);
CREATE INDEX IF NOT EXISTS idx_essay_versions_user_id ON essay_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_essay_versions_semantic_document_id ON essay_versions(semantic_document_id);
CREATE INDEX IF NOT EXISTS idx_essay_versions_active ON essay_versions(essay_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_essay_versions_ai_model ON essay_versions(ai_model);
CREATE INDEX IF NOT EXISTS idx_essay_versions_has_ai_feedback ON essay_versions(has_ai_feedback);
CREATE INDEX IF NOT EXISTS idx_essay_versions_is_fresh_draft ON essay_versions(is_fresh_draft);

-- Add constraint to ensure semantic_document_id is provided for new versions
ALTER TABLE public.essay_versions 
ADD CONSTRAINT IF NOT EXISTS essay_versions_semantic_document_required 
CHECK (semantic_document_id IS NOT NULL);

-- Add unique constraints to prevent versioning issues
CREATE UNIQUE INDEX IF NOT EXISTS idx_essay_versions_unique_active 
ON essay_versions(essay_id) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_essay_versions_unique_version 
ON essay_versions(essay_id, version_number);

-- Enable RLS
ALTER TABLE public.essay_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own essay versions" ON essay_versions
  FOR SELECT USING (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own essay versions" ON essay_versions
  FOR INSERT WITH CHECK (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own essay versions" ON essay_versions
  FOR UPDATE USING (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own essay versions" ON essay_versions
  FOR DELETE USING (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

-- Add comments
COMMENT ON TABLE essay_versions IS 'Stores different versions of essays with AI feedback and version management';
COMMENT ON COLUMN essay_versions.version_number IS 'Sequential version number for this essay';
COMMENT ON COLUMN essay_versions.is_active IS 'Whether this version is currently active (only one per essay)';
COMMENT ON COLUMN essay_versions.semantic_document_id IS 'Links each essay version to its own semantic document for isolated comment management';
COMMENT ON COLUMN essay_versions.is_fresh_draft IS 'True if this version is a fresh draft without AI comments';
COMMENT ON COLUMN essay_versions.has_ai_feedback IS 'Whether this version has AI-generated feedback/comments';
