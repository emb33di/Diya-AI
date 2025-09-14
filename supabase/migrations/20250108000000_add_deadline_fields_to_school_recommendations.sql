-- Add comprehensive deadline fields to school_recommendations table
ALTER TABLE public.school_recommendations 
ADD COLUMN early_action_deadline TEXT,
ADD COLUMN early_decision_1_deadline TEXT,
ADD COLUMN early_decision_2_deadline TEXT,
ADD COLUMN regular_decision_deadline TEXT,
ADD COLUMN application_status TEXT DEFAULT 'not_started' CHECK (application_status IN ('not_started', 'in_progress', 'completed', 'overdue')),
ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add comment explaining the deadline fields
COMMENT ON COLUMN public.school_recommendations.early_action_deadline IS 'Early Action deadline from official deadlines data';
COMMENT ON COLUMN public.school_recommendations.early_decision_1_deadline IS 'Early Decision 1 deadline from official deadlines data';
COMMENT ON COLUMN public.school_recommendations.early_decision_2_deadline IS 'Early Decision 2 deadline from official deadlines data';
COMMENT ON COLUMN public.school_recommendations.regular_decision_deadline IS 'Regular Decision deadline from official deadlines data';
COMMENT ON COLUMN public.school_recommendations.application_status IS 'Current status of the application process';

-- Create index for deadline queries
CREATE INDEX idx_school_recommendations_deadlines ON public.school_recommendations(regular_decision_deadline, early_decision_1_deadline, early_action_deadline);

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_school_recommendations_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic last_updated updates
CREATE TRIGGER update_school_recommendations_last_updated
BEFORE UPDATE ON public.school_recommendations
FOR EACH ROW
EXECUTE FUNCTION update_school_recommendations_last_updated(); 