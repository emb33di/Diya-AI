-- Fix conversation_tracking table schema to match migration files
-- This migration aligns the actual database schema with the expected schema

-- First, let's check if we need to migrate any existing data
-- We'll rename the existing columns to match the expected schema

-- Rename session_id to conversation_id
ALTER TABLE "public"."conversation_tracking" 
RENAME COLUMN "session_id" TO "conversation_id";

-- Rename started_at to conversation_started_at
ALTER TABLE "public"."conversation_tracking" 
RENAME COLUMN "started_at" TO "conversation_started_at";

-- Rename ended_at to conversation_ended_at
ALTER TABLE "public"."conversation_tracking" 
RENAME COLUMN "ended_at" TO "conversation_ended_at";

-- Add missing columns
ALTER TABLE "public"."conversation_tracking" 
ADD COLUMN "metadata_retrieved" BOOLEAN DEFAULT FALSE;

ALTER TABLE "public"."conversation_tracking" 
ADD COLUMN "metadata_retrieved_at" TIMESTAMP WITH TIME ZONE;

-- Update conversation_type default to match migration files
ALTER TABLE "public"."conversation_tracking" 
ALTER COLUMN "conversation_type" SET DEFAULT 'onboarding_1';

-- Update existing records to have the correct conversation_type default
UPDATE "public"."conversation_tracking" 
SET "conversation_type" = 'onboarding_1' 
WHERE "conversation_type" = 'general' OR "conversation_type" IS NULL;

-- Drop the status column as it's not in the migration files
ALTER TABLE "public"."conversation_tracking" 
DROP COLUMN IF EXISTS "status";

-- Update indexes to match the new column names
DROP INDEX IF EXISTS "idx_conversation_tracking_ended_at";
CREATE INDEX IF NOT EXISTS "idx_conversation_tracking_conversation_ended_at" ON "public"."conversation_tracking"("conversation_ended_at");

-- Add comment
COMMENT ON TABLE "public"."conversation_tracking" IS 'Tracks conversation sessions between users and Diya';
