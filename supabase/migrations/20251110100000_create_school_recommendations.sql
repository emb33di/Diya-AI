-- Create school_recommendations table
CREATE TABLE IF NOT EXISTS public.school_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  school_type TEXT NOT NULL CHECK (school_type IN ('public', 'private', 'liberal_arts', 'research_university', 'community_college', 'technical_institute')),
  school_ranking TEXT,
  acceptance_rate TEXT,
  ed_deadline TEXT,
  first_round_deadline TEXT,
  notes TEXT,
  student_thesis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries by student_id
CREATE INDEX IF NOT EXISTS idx_school_recommendations_student_id ON public.school_recommendations(student_id);

-- Create index for school name searches
CREATE INDEX IF NOT EXISTS idx_school_recommendations_school ON public.school_recommendations(school);

-- Enable RLS
ALTER TABLE public.school_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own school recommendations" ON public.school_recommendations;
CREATE POLICY "Users can view their own school recommendations" 
ON public.school_recommendations 
FOR SELECT 
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can insert their own school recommendations" ON public.school_recommendations;
CREATE POLICY "Users can insert their own school recommendations" 
ON public.school_recommendations 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can update their own school recommendations" ON public.school_recommendations;
CREATE POLICY "Users can update their own school recommendations" 
ON public.school_recommendations 
FOR UPDATE 
USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can delete their own school recommendations" ON public.school_recommendations;
CREATE POLICY "Users can delete their own school recommendations" 
ON public.school_recommendations 
FOR DELETE 
USING (auth.uid() = student_id);

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_school_recommendations_updated_at ON public.school_recommendations;
CREATE TRIGGER update_school_recommendations_updated_at
BEFORE UPDATE ON public.school_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column(); 