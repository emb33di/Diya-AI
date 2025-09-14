-- Create enums for dropdown options
CREATE TYPE citizenship_status AS ENUM ('U.S. Citizen', 'Permanent Resident', 'International Student', 'Other');
CREATE TYPE college_size AS ENUM ('Small (< 2,000 students)', 'Medium (2,000 - 15,000 students)', 'Large (> 15,000 students)');
CREATE TYPE college_setting AS ENUM ('Urban', 'Suburban', 'Rural', 'College Town');
CREATE TYPE geographic_preference AS ENUM ('In-state', 'Out-of-state', 'Northeast', 'West Coast', 'No Preference');
CREATE TYPE college_budget AS ENUM ('< $20,000', '$20,000 - $35,000', '$35,000 - $50,000', '$50,000 - $70,000', '> $70,000');
CREATE TYPE financial_aid_importance AS ENUM ('Crucial', 'Very Important', 'Somewhat Important', 'Not a factor');

-- Create user_profiles table
CREATE TABLE public.user_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal Information
    full_name TEXT,
    preferred_name TEXT,
    date_of_birth DATE,
    email_address TEXT,
    phone_number TEXT,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    citizenship_status citizenship_status,
    
    -- Academic Profile
    high_school_name TEXT,
    high_school_graduation_year INTEGER,
    gpa_unweighted DECIMAL(3,2),
    gpa_weighted DECIMAL(3,2),
    class_rank TEXT,
    sat_score INTEGER,
    act_score INTEGER,
    intended_majors TEXT,
    secondary_major_minor_interests TEXT,
    career_interests TEXT,
    
    -- College Preferences
    ideal_college_size college_size,
    ideal_college_setting college_setting,
    geographic_preference geographic_preference,
    must_haves TEXT,
    deal_breakers TEXT,
    
    -- Financial Information
    college_budget college_budget,
    financial_aid_importance financial_aid_importance,
    scholarship_interests TEXT[], -- Array for multi-select
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(user_id)
);

-- Create AP/IB exams table for multiple entries
CREATE TABLE public.ap_ib_exams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    year_taken INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_ib_exams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for ap_ib_exams
CREATE POLICY "Users can view their own exams" 
ON public.ap_ib_exams 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exams" 
ON public.ap_ib_exams 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exams" 
ON public.ap_ib_exams 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exams" 
ON public.ap_ib_exams 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();