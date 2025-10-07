-- Fix missing application tasks for schools
-- This migration addresses the issue where schools exist but no application tasks are created for them

-- Create a function to create default tasks for a school
CREATE OR REPLACE FUNCTION create_default_tasks_for_school(school_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert default tasks if they don't exist
  INSERT INTO public.school_application_tasks (school_recommendation_id, task_name, task_type, priority)
  SELECT 
      school_id,
      'Application Form',
      'application_form',
      'high'
  WHERE NOT EXISTS (
      SELECT 1 FROM public.school_application_tasks 
      WHERE school_recommendation_id = school_id 
      AND task_type = 'application_form'
  );

  INSERT INTO public.school_application_tasks (school_recommendation_id, task_name, task_type, priority)
  SELECT 
      school_id,
      'Essays',
      'essays',
      'high'
  WHERE NOT EXISTS (
      SELECT 1 FROM public.school_application_tasks 
      WHERE school_recommendation_id = school_id 
      AND task_type = 'essays'
  );

  INSERT INTO public.school_application_tasks (school_recommendation_id, task_name, task_type, priority)
  SELECT 
      school_id,
      'Test Scores',
      'test_scores',
      'low'
  WHERE NOT EXISTS (
      SELECT 1 FROM public.school_application_tasks 
      WHERE school_recommendation_id = school_id 
      AND task_type = 'test_scores'
  );

  INSERT INTO public.school_application_tasks (school_recommendation_id, task_name, task_type, priority)
  SELECT 
      school_id,
      'Financial Aid Forms',
      'financial_aid',
      'low'
  WHERE NOT EXISTS (
      SELECT 1 FROM public.school_application_tasks 
      WHERE school_recommendation_id = school_id 
      AND task_type = 'financial_aid'
  );
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to automatically create tasks when a school is added
CREATE OR REPLACE FUNCTION trigger_create_tasks_for_new_school()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default tasks for the newly inserted school
  PERFORM create_default_tasks_for_school(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS create_tasks_for_new_school ON public.school_recommendations;
CREATE TRIGGER create_tasks_for_new_school
  AFTER INSERT ON public.school_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_tasks_for_new_school();

-- Create missing tasks for all existing schools that don't have tasks
DO $$
DECLARE
  school_record RECORD;
BEGIN
  -- Loop through all schools that don't have any tasks
  FOR school_record IN 
    SELECT id FROM public.school_recommendations 
    WHERE id NOT IN (
      SELECT DISTINCT school_recommendation_id 
      FROM public.school_application_tasks
    )
  LOOP
    -- Create default tasks for this school
    PERFORM create_default_tasks_for_school(school_record.id);
  END LOOP;
END $$;
