-- Fix enum fields to be nullable TEXT fields
-- This ensures the fields can accept empty strings or null values

-- Drop any existing enum constraints and convert to TEXT
ALTER TABLE public.user_profiles 
ALTER COLUMN college_budget TYPE TEXT,
ALTER COLUMN financial_aid_importance TYPE TEXT,
ALTER COLUMN ideal_college_size TYPE TEXT,
ALTER COLUMN ideal_college_setting TYPE TEXT;

-- Ensure the fields are nullable
ALTER TABLE public.user_profiles 
ALTER COLUMN college_budget DROP NOT NULL,
ALTER COLUMN financial_aid_importance DROP NOT NULL,
ALTER COLUMN ideal_college_size DROP NOT NULL,
ALTER COLUMN ideal_college_setting DROP NOT NULL;
