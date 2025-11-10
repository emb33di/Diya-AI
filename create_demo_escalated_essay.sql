-- Create a demo escalated essay for IvySummit portal
-- This script creates a test essay and escalates it with partner_slug = 'ivysummit'

-- Step 1: Get or use an existing user (using the first authenticated user)
DO $$
DECLARE
  demo_user_id UUID;
  demo_essay_id UUID;
  demo_semantic_doc_id UUID;
  essay_content JSONB;
  word_count_val INTEGER := 587; -- Below 650 word limit
  char_count_val INTEGER;
BEGIN
  -- Get the first authenticated user (or you can specify a specific user_id)
  SELECT id INTO demo_user_id 
  FROM auth.users 
  WHERE email IS NOT NULL 
  LIMIT 1;
  
  -- If no user exists, we can't proceed
  IF demo_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated users found. Please create a user first.';
  END IF;
  
  -- Create a semantic document for the essay
  INSERT INTO semantic_documents (title, blocks, metadata)
  VALUES (
    'Why Harvard',
    '[
      {
        "id": "block-1",
        "type": "paragraph",
        "content": "Harvard University has always represented the pinnacle of academic excellence and intellectual rigor. As I reflect on my journey and aspirations, I recognize that Harvard is not merely an institution, but a community of scholars, innovators, and leaders who are committed to making a meaningful impact on the world. My desire to join this community stems from a deep appreciation for Harvard''s commitment to fostering critical thinking, interdisciplinary collaboration, and global citizenship.",
        "position": 0,
        "annotations": [],
        "metadata": {}
      },
      {
        "id": "block-2",
        "type": "paragraph",
        "content": "Throughout my academic career, I have consistently sought challenges that push me beyond my comfort zone. Whether it was leading research projects in molecular biology or organizing community service initiatives, I have always been driven by curiosity and a desire to contribute to something larger than myself. Harvard''s emphasis on both academic excellence and social responsibility aligns perfectly with my values and goals. The opportunity to learn from world-renowned faculty members and collaborate with peers who share my passion for discovery is something I find incredibly compelling.",
        "position": 1,
        "annotations": [],
        "metadata": {}
      },
      {
        "id": "block-3",
        "type": "paragraph",
        "content": "What particularly draws me to Harvard is its commitment to creating leaders who are not only academically accomplished but also ethically grounded and globally aware. The university''s diverse community and emphasis on cross-cultural understanding will provide me with perspectives that I cannot gain elsewhere. I am excited about the prospect of engaging with students from different backgrounds, cultures, and experiences, as I believe that true learning happens when diverse minds come together to solve complex problems.",
        "position": 2,
        "annotations": [],
        "metadata": {}
      },
      {
        "id": "block-4",
        "type": "paragraph",
        "content": "As I look toward my future, I envision myself contributing to the field of biomedical research, with a particular focus on developing treatments for rare genetic disorders. Harvard''s cutting-edge research facilities, combined with its collaborative approach to scientific inquiry, would provide the ideal environment for me to pursue these goals. I am eager to work alongside faculty members who are at the forefront of their fields and to contribute to research that has the potential to transform lives.",
        "position": 3,
        "annotations": [],
        "metadata": {}
      },
      {
        "id": "block-5",
        "type": "paragraph",
        "content": "In conclusion, Harvard represents more than just a prestigious university to me—it represents a community where I can grow intellectually, contribute meaningfully, and prepare myself to make a lasting impact on the world. I am confident that my passion for learning, my commitment to excellence, and my desire to serve others align with Harvard''s mission and values. I am excited about the possibility of joining the Harvard community and contributing to its legacy of excellence and innovation.",
        "position": 4,
        "annotations": [],
        "metadata": {}
      }
    ]'::jsonb,
    '{
      "essayId": null,
      "prompt": "Why Harvard",
      "wordLimit": 650,
      "totalWordCount": 587,
      "totalCharacterCount": 0,
      "lastSaved": "2025-11-10T14:50:00Z"
    }'::jsonb
  )
  RETURNING id INTO demo_semantic_doc_id;
  
  -- Calculate character count from blocks
  char_count_val := (
    SELECT COALESCE(SUM(LENGTH(block->>'content')), 0)
    FROM jsonb_array_elements((
      SELECT blocks FROM semantic_documents WHERE id = demo_semantic_doc_id
    )) AS block
  );
  
  -- Update character count in metadata
  UPDATE semantic_documents
  SET metadata = jsonb_set(metadata, '{totalCharacterCount}', to_jsonb(char_count_val))
  WHERE id = demo_semantic_doc_id;
  
  -- Create an essay record
  INSERT INTO essays (
    user_id,
    title,
    content,
    school_name,
    prompt_text,
    word_limit,
    word_count,
    character_count,
    status
  )
  VALUES (
    demo_user_id,
    'Why Harvard',
    jsonb_build_object(
      'blocks', (
        SELECT blocks FROM semantic_documents WHERE id = demo_semantic_doc_id
      ),
      'metadata', jsonb_build_object(
        'totalWordCount', word_count_val,
        'totalCharacterCount', char_count_val,
        'lastSaved', '2025-11-10T14:50:00Z'
      )
    ),
    'Harvard University',
    'Why Harvard',
    '650',
    word_count_val,
    char_count_val,
    'draft'
  )
  RETURNING id INTO demo_essay_id;
  
  -- Create the escalated essay with partner_slug = 'ivysummit' (normalized to lowercase)
  INSERT INTO escalated_essays (
    essay_id,
    user_id,
    essay_title,
    essay_content,
    essay_prompt,
    word_limit,
    word_count,
    character_count,
    semantic_document_id,
    status,
    partner_slug,
    ai_comments_snapshot
  )
  VALUES (
    demo_essay_id,
    demo_user_id,
    'Why Harvard',
    jsonb_build_object(
      'id', demo_semantic_doc_id::text,
      'title', 'Why Harvard',
      'blocks', (SELECT blocks FROM semantic_documents WHERE id = demo_semantic_doc_id),
      'metadata', (SELECT metadata FROM semantic_documents WHERE id = demo_semantic_doc_id),
      'createdAt', (SELECT created_at FROM semantic_documents WHERE id = demo_semantic_doc_id),
      'updatedAt', (SELECT updated_at FROM semantic_documents WHERE id = demo_semantic_doc_id)
    ),
    'Why Harvard',
    '650',
    word_count_val,
    char_count_val,
    demo_semantic_doc_id,
    'pending',
    'ivysummit', -- Normalized to lowercase as per our code
    '[]'::jsonb
  );
  
  RAISE NOTICE 'Demo escalated essay created successfully!';
  RAISE NOTICE 'Essay ID: %', demo_essay_id;
  RAISE NOTICE 'User ID: %', demo_user_id;
  RAISE NOTICE 'Semantic Document ID: %', demo_semantic_doc_id;
  RAISE NOTICE 'Partner Slug: ivysummit';
  
END $$;

