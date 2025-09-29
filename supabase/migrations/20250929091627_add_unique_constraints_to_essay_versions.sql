-- Add unique constraints to essay_versions table to fix versioning issues
-- This migration adds the missing unique constraints that prevent multiple active versions per essay

-- Add unique constraint to ensure only one active version per essay
CREATE UNIQUE INDEX IF NOT EXISTS idx_essay_versions_unique_active 
ON essay_versions(essay_id) 
WHERE is_active = true;

-- Add unique constraint to ensure unique version numbers per essay
CREATE UNIQUE INDEX IF NOT EXISTS idx_essay_versions_unique_version 
ON essay_versions(essay_id, version_number);

-- Add comments to explain the constraints
COMMENT ON INDEX idx_essay_versions_unique_active IS 'Ensures only one active version per essay to prevent versioning conflicts';
COMMENT ON INDEX idx_essay_versions_unique_version IS 'Ensures unique version numbers per essay for proper version tracking';
