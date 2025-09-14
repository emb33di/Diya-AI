-- Create school_deadlines table for static deadline data
CREATE TABLE public.school_deadlines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_name TEXT NOT NULL UNIQUE,
    early_action_deadline TEXT,
    early_decision_1_deadline TEXT,
    early_decision_2_deadline TEXT,
    regular_decision_deadline TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for school name lookups
CREATE INDEX idx_school_deadlines_school_name ON public.school_deadlines(school_name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_school_deadlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_school_deadlines_updated_at
BEFORE UPDATE ON public.school_deadlines
FOR EACH ROW
EXECUTE FUNCTION update_school_deadlines_updated_at();

-- Enable RLS
ALTER TABLE public.school_deadlines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all authenticated users to read)
CREATE POLICY "Anyone can view school deadlines" 
ON public.school_deadlines 
FOR SELECT 
USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage school deadlines" 
ON public.school_deadlines 
FOR ALL 
USING (auth.role() = 'service_role');
