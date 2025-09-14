-- Add required profile fields to user_profiles table
-- This migration adds year_of_study and school_board fields

-- Create enum for year of study
CREATE TYPE year_of_study AS ENUM ('11th', '12th', 'Graduate');

-- Create enum for school board
CREATE TYPE school_board AS ENUM ('ICSE', 'CBSE', 'IB', 'NIOS', 'CISCE', 'Other');

-- Add year_of_study field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS year_of_study year_of_study;

-- Add school_board field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS school_board school_board;

-- Add back sat_score and act_score fields if they were removed
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS sat_score INTEGER CHECK (sat_score >= 400 AND sat_score <= 1600);

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS act_score INTEGER CHECK (act_score >= 1 AND act_score <= 36);
