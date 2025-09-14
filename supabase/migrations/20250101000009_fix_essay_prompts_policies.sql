-- Add INSERT policy for essay_prompts table
CREATE POLICY "Anyone can insert essay prompts" 
ON public.essay_prompts 
FOR INSERT 
WITH CHECK (true);

-- Add UPDATE policy for essay_prompts table
CREATE POLICY "Anyone can update essay prompts" 
ON public.essay_prompts 
FOR UPDATE 
USING (true);

-- Add DELETE policy for essay_prompts table
CREATE POLICY "Anyone can delete essay prompts" 
ON public.essay_prompts 
FOR DELETE 
USING (true);
