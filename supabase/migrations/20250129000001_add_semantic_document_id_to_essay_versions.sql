-- Add semantic_document_id field to essay_versions table
-- This links each version to its own semantic document for comment isolation

-- Add the semantic_document_id column
ALTER TABLE public.essay_versions 
ADD COLUMN semantic_document_id UUID REFERENCES semantic_documents(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_essay_versions_semantic_document_id ON essay_versions(semantic_document_id);

-- Add comment explaining the new field
COMMENT ON COLUMN essay_versions.semantic_document_id IS 'Links each essay version to its own semantic document for isolated comment management';

-- Add constraint to ensure semantic_document_id is provided for new versions
-- This ensures proper version isolation
ALTER TABLE public.essay_versions 
ADD CONSTRAINT essay_versions_semantic_document_required 
CHECK (semantic_document_id IS NOT NULL);
