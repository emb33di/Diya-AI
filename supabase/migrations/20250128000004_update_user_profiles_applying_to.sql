-- Constrain the applying_to field to use the school_program_type enum
ALTER TABLE public.user_profiles 
ALTER COLUMN applying_to TYPE school_program_type 
USING applying_to::school_program_type;

-- Add index for the field
CREATE INDEX IF NOT EXISTS idx_user_profiles_applying_to ON public.user_profiles(applying_to);
