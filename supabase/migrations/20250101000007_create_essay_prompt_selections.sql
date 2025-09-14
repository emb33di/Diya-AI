-- Create essay_prompt_selections table
CREATE TABLE public.essay_prompt_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  college_name TEXT NOT NULL,
  prompt_number TEXT NOT NULL,
  prompt TEXT NOT NULL,
  word_limit TEXT NOT NULL,
  selected BOOLEAN DEFAULT false,
  essay_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_essay_prompt_selections_user_id ON public.essay_prompt_selections(user_id);
CREATE INDEX idx_essay_prompt_selections_school_name ON public.essay_prompt_selections(school_name);

-- Enable RLS
ALTER TABLE public.essay_prompt_selections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own essay prompt selections" 
ON public.essay_prompt_selections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own essay prompt selections" 
ON public.essay_prompt_selections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essay prompt selections" 
ON public.essay_prompt_selections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essay prompt selections" 
ON public.essay_prompt_selections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_essay_prompt_selections_updated_at
BEFORE UPDATE ON public.essay_prompt_selections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
