-- Create essay_prompts table
CREATE TABLE public.essay_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_name TEXT NOT NULL,
  how_many TEXT NOT NULL,
  selection_type TEXT NOT NULL,
  prompt_number TEXT NOT NULL,
  prompt TEXT NOT NULL,
  word_limit TEXT NOT NULL,
  prompt_selection_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_essay_prompts_college_name ON public.essay_prompts(college_name);
CREATE INDEX idx_essay_prompts_selection_type ON public.essay_prompts(selection_type);

-- Enable RLS
ALTER TABLE public.essay_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (essay prompts should be accessible to all users)
CREATE POLICY "Anyone can view essay prompts" 
ON public.essay_prompts 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_essay_prompts_updated_at
BEFORE UPDATE ON public.essay_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
