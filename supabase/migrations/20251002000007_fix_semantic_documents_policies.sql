-- Fix semantic_documents policies to handle missing essays table
-- This migration makes the policies conditional to avoid errors during database reset

-- Drop existing policies that reference essays table
DROP POLICY IF EXISTS "Users can view their own semantic documents" ON semantic_documents;
DROP POLICY IF EXISTS "Users can insert their own semantic documents" ON semantic_documents;
DROP POLICY IF EXISTS "Users can update their own semantic documents" ON semantic_documents;
DROP POLICY IF EXISTS "Users can delete their own semantic documents" ON semantic_documents;

-- Create policies that check if essays table exists first
CREATE POLICY "Users can view their own semantic documents" ON semantic_documents
  FOR SELECT USING (
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essays' AND table_schema = 'public')
      THEN EXISTS (
        SELECT 1 FROM essays 
        WHERE essays.id = (metadata->>'essayId')::UUID 
        AND essays.user_id = auth.uid()
      )
      ELSE true -- Allow access if essays table doesn't exist yet
    END
  );

CREATE POLICY "Users can insert their own semantic documents" ON semantic_documents
  FOR INSERT WITH CHECK (
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essays' AND table_schema = 'public')
      THEN EXISTS (
        SELECT 1 FROM essays 
        WHERE essays.id = (metadata->>'essayId')::UUID 
        AND essays.user_id = auth.uid()
      )
      ELSE true -- Allow access if essays table doesn't exist yet
    END
  );

CREATE POLICY "Users can update their own semantic documents" ON semantic_documents
  FOR UPDATE USING (
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essays' AND table_schema = 'public')
      THEN EXISTS (
        SELECT 1 FROM essays 
        WHERE essays.id = (metadata->>'essayId')::UUID 
        AND essays.user_id = auth.uid()
      )
      ELSE true -- Allow access if essays table doesn't exist yet
    END
  );

CREATE POLICY "Users can delete their own semantic documents" ON semantic_documents
  FOR DELETE USING (
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essays' AND table_schema = 'public')
      THEN EXISTS (
        SELECT 1 FROM essays 
        WHERE essays.id = (metadata->>'essayId')::UUID 
        AND essays.user_id = auth.uid()
      )
      ELSE true -- Allow access if essays table doesn't exist yet
    END
  );

-- Add comment explaining the fix
COMMENT ON POLICY "Users can view their own semantic documents" ON semantic_documents IS 'Conditional policy that checks for essays table existence to avoid migration errors';
