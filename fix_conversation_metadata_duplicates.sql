-- Step 3 Part B: Fix the Root Cause - Database Migration
-- This script fixes the duplicate conversation_id issue in conversation_metadata table

-- Step 1: First, let's see what duplicates exist
SELECT 
    conversation_id, 
    COUNT(*) as duplicate_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM conversation_metadata 
GROUP BY conversation_id 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Delete duplicate records, keeping only the most recent one
-- This will remove all but the latest record for each conversation_id
WITH ranked_records AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY conversation_id 
               ORDER BY created_at DESC
           ) as rn
    FROM conversation_metadata
)
DELETE FROM conversation_metadata 
WHERE id IN (
    SELECT id 
    FROM ranked_records 
    WHERE rn > 1
);

-- Step 3: Add UNIQUE constraint to prevent future duplicates
-- First, let's check if the constraint already exists
DO $$
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversation_metadata_conversation_id_key'
        AND table_name = 'conversation_metadata'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE conversation_metadata 
        ADD CONSTRAINT conversation_metadata_conversation_id_key 
        UNIQUE (conversation_id);
        
        RAISE NOTICE 'Unique constraint added successfully';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Step 4: Verify the fix
-- Check that there are no more duplicates
SELECT 
    conversation_id, 
    COUNT(*) as record_count
FROM conversation_metadata 
GROUP BY conversation_id 
HAVING COUNT(*) > 1;

-- If the above query returns no rows, the fix was successful!

-- Step 5: Show the final state of the conversation_metadata table
SELECT 
    conversation_id,
    user_id,
    created_at,
    message_count,
    LENGTH(transcript) as transcript_length
FROM conversation_metadata 
ORDER BY created_at DESC 
LIMIT 10;
