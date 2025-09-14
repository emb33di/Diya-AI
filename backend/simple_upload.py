#!/usr/bin/env python3
"""
Simple script to upload essay prompts using the publishable key.
"""

import json
import sys
from pathlib import Path
from supabase import create_client

# Supabase credentials
SUPABASE_URL = "https://otlbklcvzbcbrnamgtsk.supabase.co"
SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bGJrbGN2emJjYnJuYW1ndHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjAwOTEsImV4cCI6MjA2OTc5NjA5MX0.UFqtHseTnep26jJIYW8_gjawq5ffPzG4PaePTU5FO7M"

def upload_essay_prompts():
    """Upload essay prompts from JSON file to Supabase."""
    
    # Initialize Supabase client
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
        return False
    
    # Read the JSON file
    json_file_path = Path(__file__).parent / "src" / "essay_fetcher_agent" / "prompt_repo_2025.json"
    
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find file {json_file_path}")
        return False
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in file {json_file_path}: {e}")
        return False
    
    print(f"Found {len(data)} colleges in the JSON file")
    
    # Prepare data for insertion
    prompts_to_insert = []
    
    for college_data in data:
        college_name = college_data.get('college_name', '')
        how_many = college_data.get('how_many', '')
        selection_type = college_data.get('selection_type', '')
        
        prompts = college_data.get('prompts', [])
        
        for prompt_data in prompts:
            prompt_record = {
                'college_name': college_name,
                'how_many': how_many,
                'selection_type': selection_type,
                'prompt_number': prompt_data.get('prompt_number', ''),
                'prompt': prompt_data.get('prompt', ''),
                'word_limit': prompt_data.get('word_limit', ''),
                'prompt_selection_type': prompt_data.get('selection_type', '')
            }
            prompts_to_insert.append(prompt_record)
    
    print(f"Prepared {len(prompts_to_insert)} prompts for insertion")
    
    # Insert data into Supabase
    try:
        # Clear existing data first
        print("Clearing existing essay prompts...")
        result = supabase.table('essay_prompts').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        print(f"Cleared {len(result.data) if result.data else 0} existing records")
        
        # Insert new data in batches to avoid timeout
        batch_size = 50
        total_inserted = 0
        
        for i in range(0, len(prompts_to_insert), batch_size):
            batch = prompts_to_insert[i:i + batch_size]
            result = supabase.table('essay_prompts').insert(batch).execute()
            
            if result.data:
                total_inserted += len(result.data)
                print(f"Inserted batch {i//batch_size + 1}/{(len(prompts_to_insert) + batch_size - 1)//batch_size}")
            else:
                print(f"Failed to insert batch {i//batch_size + 1}")
                return False
        
        print(f"Successfully inserted {total_inserted} essay prompts")
        return True
            
    except Exception as e:
        print(f"Error inserting data into Supabase: {e}")
        return False

if __name__ == "__main__":
    print("Starting essay prompts upload...")
    success = upload_essay_prompts()
    
    if success:
        print("✅ Essay prompts upload completed successfully!")
    else:
        print("❌ Essay prompts upload failed!")
        sys.exit(1)
