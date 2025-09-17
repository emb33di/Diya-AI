-- Create semantic documents table
CREATE TABLE IF NOT EXISTS semantic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create semantic annotations table
CREATE TABLE IF NOT EXISTS semantic_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES semantic_documents(id) ON DELETE CASCADE,
  block_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('comment', 'suggestion', 'critique', 'praise', 'question', 'highlight')),
  author TEXT NOT NULL CHECK (author IN ('ai', 'user')),
  content TEXT NOT NULL,
  target_text TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_semantic_documents_metadata_essay_id 
ON semantic_documents ((metadata->>'essayId'));

CREATE INDEX IF NOT EXISTS idx_semantic_annotations_document_id 
ON semantic_annotations(document_id);

CREATE INDEX IF NOT EXISTS idx_semantic_annotations_block_id 
ON semantic_annotations(block_id);

CREATE INDEX IF NOT EXISTS idx_semantic_annotations_author 
ON semantic_annotations(author);

CREATE INDEX IF NOT EXISTS idx_semantic_annotations_resolved 
ON semantic_annotations(resolved);

CREATE INDEX IF NOT EXISTS idx_semantic_annotations_type 
ON semantic_annotations(type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_semantic_documents_updated_at 
  BEFORE UPDATE ON semantic_documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_semantic_annotations_updated_at 
  BEFORE UPDATE ON semantic_annotations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE semantic_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_annotations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (assuming you have a users table with id field)
-- You may need to adjust these based on your actual user authentication setup

-- Policy for semantic_documents - users can only access their own documents
CREATE POLICY "Users can view their own semantic documents" ON semantic_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM essays 
      WHERE essays.id = (metadata->>'essayId')::UUID 
      AND essays.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own semantic documents" ON semantic_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM essays 
      WHERE essays.id = (metadata->>'essayId')::UUID 
      AND essays.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own semantic documents" ON semantic_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM essays 
      WHERE essays.id = (metadata->>'essayId')::UUID 
      AND essays.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own semantic documents" ON semantic_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM essays 
      WHERE essays.id = (metadata->>'essayId')::UUID 
      AND essays.user_id = auth.uid()
    )
  );

-- Policy for semantic_annotations - users can only access annotations for their documents
CREATE POLICY "Users can view annotations for their documents" ON semantic_annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM semantic_documents sd
      JOIN essays e ON e.id = (sd.metadata->>'essayId')::UUID
      WHERE sd.id = document_id 
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert annotations for their documents" ON semantic_annotations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM semantic_documents sd
      JOIN essays e ON e.id = (sd.metadata->>'essayId')::UUID
      WHERE sd.id = document_id 
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update annotations for their documents" ON semantic_annotations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM semantic_documents sd
      JOIN essays e ON e.id = (sd.metadata->>'essayId')::UUID
      WHERE sd.id = document_id 
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete annotations for their documents" ON semantic_annotations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM semantic_documents sd
      JOIN essays e ON e.id = (sd.metadata->>'essayId')::UUID
      WHERE sd.id = document_id 
      AND e.user_id = auth.uid()
    )
  );

-- Add comments to tables
COMMENT ON TABLE semantic_documents IS 'Stores semantic document structure with stable block-based architecture';
COMMENT ON TABLE semantic_annotations IS 'Stores comments and annotations anchored to semantic document blocks';

COMMENT ON COLUMN semantic_documents.blocks IS 'JSON array of document blocks with stable IDs';
COMMENT ON COLUMN semantic_documents.metadata IS 'Document metadata including essayId, prompt, wordLimit, etc.';
COMMENT ON COLUMN semantic_annotations.block_id IS 'Stable reference to the document block this annotation belongs to';
COMMENT ON COLUMN semantic_annotations.target_text IS 'Optional specific text within the block that this annotation targets';
COMMENT ON COLUMN semantic_annotations.metadata IS 'Additional annotation metadata like confidence scores, agent types, etc.';
