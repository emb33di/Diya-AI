-- Fix school_archive table schema to match school_recommendations
-- This ensures all deadline fields are present and properly structured

-- First, check if the table exists and has the right structure
-- If any columns are missing, add them

-- Add missing deadline columns if they don't exist
DO $$ 
BEGIN
    -- Add early_action_deadline if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_archive' 
        AND column_name = 'early_action_deadline'
    ) THEN
        ALTER TABLE public.school_archive ADD COLUMN early_action_deadline TEXT;
    END IF;

    -- Add early_decision_1_deadline if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_archive' 
        AND column_name = 'early_decision_1_deadline'
    ) THEN
        ALTER TABLE public.school_archive ADD COLUMN early_decision_1_deadline TEXT;
    END IF;

    -- Add early_decision_2_deadline if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_archive' 
        AND column_name = 'early_decision_2_deadline'
    ) THEN
        ALTER TABLE public.school_archive ADD COLUMN early_decision_2_deadline TEXT;
    END IF;

    -- Add regular_decision_deadline if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_archive' 
        AND column_name = 'regular_decision_deadline'
    ) THEN
        ALTER TABLE public.school_archive ADD COLUMN regular_decision_deadline TEXT;
    END IF;

    -- Add application_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_archive' 
        AND column_name = 'application_status'
    ) THEN
        ALTER TABLE public.school_archive ADD COLUMN application_status TEXT DEFAULT 'not_started' CHECK (application_status IN ('not_started', 'in_progress', 'completed', 'overdue'));
    END IF;

    -- Add last_updated if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_archive' 
        AND column_name = 'last_updated'
    ) THEN
        ALTER TABLE public.school_archive ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Add comments for the deadline fields
COMMENT ON COLUMN public.school_archive.early_action_deadline IS 'Early Action deadline from official deadlines data';
COMMENT ON COLUMN public.school_archive.early_decision_1_deadline IS 'Early Decision 1 deadline from official deadlines data';
COMMENT ON COLUMN public.school_archive.early_decision_2_deadline IS 'Early Decision 2 deadline from official deadlines data';
COMMENT ON COLUMN public.school_archive.regular_decision_deadline IS 'Regular Decision deadline from official deadlines data';
COMMENT ON COLUMN public.school_archive.application_status IS 'Current status of the application process';

-- Create index for deadline queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_school_archive_deadlines ON public.school_archive(regular_decision_deadline, early_decision_1_deadline, early_action_deadline);

-- Create function to update last_updated timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_school_archive_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic last_updated updates if it doesn't exist
DROP TRIGGER IF EXISTS update_school_archive_last_updated ON public.school_archive;
CREATE TRIGGER update_school_archive_last_updated
BEFORE UPDATE ON public.school_archive
FOR EACH ROW
EXECUTE FUNCTION update_school_archive_last_updated();
