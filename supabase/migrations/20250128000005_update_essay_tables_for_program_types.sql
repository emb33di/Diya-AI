-- Add school_program_type field to essay_prompts table
ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS school_program_type school_program_type;

-- Add index for the new field
CREATE INDEX IF NOT EXISTS idx_essay_prompts_program_type ON public.essay_prompts(school_program_type);

-- Add school_program_type field to essay_prompt_selections table
ALTER TABLE public.essay_prompt_selections 
ADD COLUMN IF NOT EXISTS school_program_type school_program_type;

-- Add index for the new field
CREATE INDEX IF NOT EXISTS idx_essay_prompt_selections_program_type ON public.essay_prompt_selections(school_program_type);

-- Add school_program_type field to essays table
ALTER TABLE public.essays 
ADD COLUMN IF NOT EXISTS school_program_type school_program_type;

-- Add index for the new field
CREATE INDEX IF NOT EXISTS idx_essays_program_type ON public.essays(school_program_type);
