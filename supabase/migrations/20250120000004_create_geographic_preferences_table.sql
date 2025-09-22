-- Create table for multiple geographic preferences
CREATE TABLE public.geographic_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preference TEXT NOT NULL CHECK (preference IN ('US', 'UK', 'Canada')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geographic_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for geographic_preferences
CREATE POLICY "Users can view their own geographic preferences" 
ON public.geographic_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own geographic preferences" 
ON public.geographic_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own geographic preferences" 
ON public.geographic_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own geographic preferences" 
ON public.geographic_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Remove the single geographic_preference field from user_profiles
ALTER TABLE public.user_profiles 
DROP COLUMN IF EXISTS geographic_preference;
