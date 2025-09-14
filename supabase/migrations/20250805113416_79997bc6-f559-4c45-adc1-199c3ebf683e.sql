-- Create tables for multiple SAT and ACT scores
CREATE TABLE public.sat_scores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 400 AND score <= 1600),
    year_taken INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.act_scores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 36),
    year_taken INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sat_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.act_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sat_scores
CREATE POLICY "Users can view their own SAT scores" 
ON public.sat_scores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SAT scores" 
ON public.sat_scores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SAT scores" 
ON public.sat_scores 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SAT scores" 
ON public.sat_scores 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for act_scores
CREATE POLICY "Users can view their own ACT scores" 
ON public.act_scores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ACT scores" 
ON public.act_scores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ACT scores" 
ON public.act_scores 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ACT scores" 
ON public.act_scores 
FOR DELETE 
USING (auth.uid() = user_id);

-- Remove the single SAT and ACT score fields from user_profiles
ALTER TABLE public.user_profiles 
DROP COLUMN IF EXISTS sat_score,
DROP COLUMN IF EXISTS act_score;