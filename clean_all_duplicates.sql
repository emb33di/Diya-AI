-- Clean up ALL duplicates before adding the unique constraint
-- This script removes all duplicate conversation_id records, keeping only the most recent

-- Step 1: Show all duplicates in the database
SELECT 
    conversation_id, 
    COUNT(*) as duplicate_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM conversation_metadata 
GROUP BY conversation_id 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Delete ALL duplicate records, keeping only the most recent one for each conversation_id
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

-- Step 3: Verify no duplicates remain
SELECT 
    conversation_id, 
    COUNT(*) as record_count
FROM conversation_metadata 
GROUP BY conversation_id 
HAVING COUNT(*) > 1;

-- Step 4: Now add the unique constraint (should work now)
ALTER TABLE conversation_metadata 
ADD CONSTRAINT conversation_metadata_conversation_id_key 
UNIQUE (conversation_id);

-- Step 5: Final verification
SELECT 
    conversation_id,
    user_id,
    created_at,
    message_count,
    LENGTH(transcript) as transcript_length
FROM conversation_metadata 
ORDER BY created_at DESC 
LIMIT 10;
