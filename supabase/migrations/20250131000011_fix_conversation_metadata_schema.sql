-- Fix conversation_metadata table schema to match migration files
-- This migration aligns the actual database schema with the expected schema

-- Change conversation_id from UUID to TEXT to match migration files
-- First, we need to handle any existing data carefully
-- We'll create a temporary column, migrate data, drop old column, and rename

-- Add new TEXT column for conversation_id
ALTER TABLE "public"."conversation_metadata" 
ADD COLUMN "conversation_id_text" TEXT;

-- Migrate existing UUID data to TEXT format
UPDATE "public"."conversation_metadata" 
SET "conversation_id_text" = "conversation_id"::TEXT;

-- Drop the old UUID column
ALTER TABLE "public"."conversation_metadata" 
DROP COLUMN "conversation_id";

-- Rename the new column to conversation_id
ALTER TABLE "public"."conversation_metadata" 
RENAME COLUMN "conversation_id_text" TO "conversation_id";

-- Make conversation_id NOT NULL
ALTER TABLE "public"."conversation_metadata" 
ALTER COLUMN "conversation_id" SET NOT NULL;

-- Add missing columns from migration files
ALTER TABLE "public"."conversation_metadata" 
ADD COLUMN "audio_url" TEXT;

ALTER TABLE "public"."conversation_metadata" 
ADD COLUMN "session_number" INTEGER DEFAULT 1;

ALTER TABLE "public"."conversation_metadata" 
ADD COLUMN "duration_seconds" INTEGER;

ALTER TABLE "public"."conversation_metadata" 
ADD COLUMN "message_count" INTEGER DEFAULT 0;

-- Drop columns that are not in the migration files
ALTER TABLE "public"."conversation_metadata" 
DROP COLUMN IF EXISTS "key_topics";

ALTER TABLE "public"."conversation_metadata" 
DROP COLUMN IF EXISTS "action_items";

-- Update indexes to match the new schema
DROP INDEX IF EXISTS "idx_conversation_metadata_conversation_id";
CREATE INDEX IF NOT EXISTS "idx_conversation_metadata_conversation_id" ON "public"."conversation_metadata"("conversation_id");

-- Add comment
COMMENT ON TABLE "public"."conversation_metadata" IS 'Stores conversation transcripts, summaries, and metadata for voice sessions';
