-- Add missing last_updated column to school_recommendations table
-- This fixes the "Could not find the 'last_updated' column" error

-- Add last_updated column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_recommendations' 
        AND column_name = 'last_updated'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.school_recommendations ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Add comment for the column
COMMENT ON COLUMN public.school_recommendations.last_updated IS 'Timestamp of last update to this record';

-- Create function to update last_updated timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_school_recommendations_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic last_updated updates if it doesn't exist
DROP TRIGGER IF EXISTS update_school_recommendations_last_updated ON public.school_recommendations;
CREATE TRIGGER update_school_recommendations_last_updated
BEFORE UPDATE ON public.school_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_school_recommendations_last_updated();
