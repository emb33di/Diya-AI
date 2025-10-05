-- Fix school_recommendations table schema and add task completion tracking
-- This migration ensures all deadline fields exist and adds task completion functionality

-- First, add any missing deadline columns if they don't exist
DO $$ 
BEGIN
    -- Add early_action_deadline if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_recommendations' 
        AND column_name = 'early_action_deadline'
    ) THEN
        ALTER TABLE public.school_recommendations ADD COLUMN early_action_deadline TEXT;
    END IF;

    -- Add early_decision_1_deadline if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_recommendations' 
        AND column_name = 'early_decision_1_deadline'
    ) THEN
        ALTER TABLE public.school_recommendations ADD COLUMN early_decision_1_deadline TEXT;
    END IF;

    -- Add early_decision_2_deadline if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_recommendations' 
        AND column_name = 'early_decision_2_deadline'
    ) THEN
        ALTER TABLE public.school_recommendations ADD COLUMN early_decision_2_deadline TEXT;
    END IF;

    -- Add regular_decision_deadline if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_recommendations' 
        AND column_name = 'regular_decision_deadline'
    ) THEN
        ALTER TABLE public.school_recommendations ADD COLUMN regular_decision_deadline TEXT;
    END IF;

    -- Add application_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_recommendations' 
        AND column_name = 'application_status'
    ) THEN
        ALTER TABLE public.school_recommendations ADD COLUMN application_status TEXT DEFAULT 'not_started' CHECK (application_status IN ('not_started', 'in_progress', 'completed', 'overdue'));
    END IF;

    -- Add last_updated if it doesn't exist (this is the missing column causing the error)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_recommendations' 
        AND column_name = 'last_updated'
    ) THEN
        ALTER TABLE public.school_recommendations ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;

    -- Add category if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_recommendations' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE public.school_recommendations ADD COLUMN category TEXT DEFAULT 'target' CHECK (category IN ('reach', 'target', 'safety'));
    END IF;
END $$;

-- Add comments for the deadline fields
COMMENT ON COLUMN public.school_recommendations.early_action_deadline IS 'Early Action deadline from official deadlines data';
COMMENT ON COLUMN public.school_recommendations.early_decision_1_deadline IS 'Early Decision 1 deadline from official deadlines data';
COMMENT ON COLUMN public.school_recommendations.early_decision_2_deadline IS 'Early Decision 2 deadline from official deadlines data';
COMMENT ON COLUMN public.school_recommendations.regular_decision_deadline IS 'Regular Decision deadline from official deadlines data';
COMMENT ON COLUMN public.school_recommendations.application_status IS 'Current status of the application process';
COMMENT ON COLUMN public.school_recommendations.last_updated IS 'Timestamp of last update to this record';
COMMENT ON COLUMN public.school_recommendations.category IS 'School category: reach, target, or safety';

-- Create index for deadline queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_school_recommendations_deadlines ON public.school_recommendations(regular_decision_deadline, early_decision_1_deadline, early_action_deadline);

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

-- Create school_application_tasks table for task completion tracking
CREATE TABLE IF NOT EXISTS public.school_application_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_recommendation_id UUID NOT NULL REFERENCES public.school_recommendations(id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('application_form', 'essays', 'test_scores', 'financial_aid', 'recommendations', 'transcripts', 'portfolio')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_application_tasks_school_id ON public.school_application_tasks(school_recommendation_id);
CREATE INDEX IF NOT EXISTS idx_school_application_tasks_completed ON public.school_application_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_school_application_tasks_type ON public.school_application_tasks(task_type);

-- Create function to update updated_at timestamp for tasks
CREATE OR REPLACE FUNCTION update_school_application_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
    NEW.completed_at = now();
  ELSIF NEW.completed = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates for tasks
DROP TRIGGER IF EXISTS update_school_application_tasks_updated_at ON public.school_application_tasks;
CREATE TRIGGER update_school_application_tasks_updated_at
BEFORE UPDATE ON public.school_application_tasks
FOR EACH ROW
EXECUTE FUNCTION update_school_application_tasks_updated_at();

-- Enable RLS on tasks table
ALTER TABLE public.school_application_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tasks table
CREATE POLICY "Users can view tasks for their own school recommendations" 
ON public.school_application_tasks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.school_recommendations sr 
    WHERE sr.id = school_application_tasks.school_recommendation_id 
    AND sr.student_id = auth.uid()
  )
);

CREATE POLICY "Users can insert tasks for their own school recommendations" 
ON public.school_application_tasks 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.school_recommendations sr 
    WHERE sr.id = school_application_tasks.school_recommendation_id 
    AND sr.student_id = auth.uid()
  )
);

CREATE POLICY "Users can update tasks for their own school recommendations" 
ON public.school_application_tasks 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.school_recommendations sr 
    WHERE sr.id = school_application_tasks.school_recommendation_id 
    AND sr.student_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tasks for their own school recommendations" 
ON public.school_application_tasks 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.school_recommendations sr 
    WHERE sr.id = school_application_tasks.school_recommendation_id 
    AND sr.student_id = auth.uid()
  )
);

-- Insert default tasks for existing school recommendations
INSERT INTO public.school_application_tasks (school_recommendation_id, task_name, task_type, priority)
SELECT 
    id,
    'Application Form',
    'application_form',
    'high'
FROM public.school_recommendations
WHERE NOT EXISTS (
    SELECT 1 FROM public.school_application_tasks 
    WHERE school_recommendation_id = school_recommendations.id 
    AND task_type = 'application_form'
);

INSERT INTO public.school_application_tasks (school_recommendation_id, task_name, task_type, priority)
SELECT 
    id,
    'Essays',
    'essays',
    'high'
FROM public.school_recommendations
WHERE NOT EXISTS (
    SELECT 1 FROM public.school_application_tasks 
    WHERE school_recommendation_id = school_recommendations.id 
    AND task_type = 'essays'
);

INSERT INTO public.school_application_tasks (school_recommendation_id, task_name, task_type, priority)
SELECT 
    id,
    'Test Scores',
    'test_scores',
    'low'
FROM public.school_recommendations
WHERE NOT EXISTS (
    SELECT 1 FROM public.school_application_tasks 
    WHERE school_recommendation_id = school_recommendations.id 
    AND task_type = 'test_scores'
);

INSERT INTO public.school_application_tasks (school_recommendation_id, task_name, task_type, priority)
SELECT 
    id,
    'Financial Aid Forms',
    'financial_aid',
    'low'
FROM public.school_recommendations
WHERE NOT EXISTS (
    SELECT 1 FROM public.school_application_tasks 
    WHERE school_recommendation_id = school_recommendations.id 
    AND task_type = 'financial_aid'
);
