#!/usr/bin/env python3
"""
Script to populate school_deadlines table with data from deadlines_2026.json
"""

import json
import os
import sys
from supabase import create_client, Client

# Add the backend src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'src'))

def load_deadlines_data():
    """Load deadlines data from JSON file"""
    deadlines_file = os.path.join(os.path.dirname(__file__), '..', 'backend', 'src', 'deadline_tracker', 'deadlines_2026.json')
    
    if not os.path.exists(deadlines_file):
        print(f"Error: Deadlines file not found at {deadlines_file}")
        return None
    
    with open(deadlines_file, 'r') as f:
        return json.load(f)

def parse_deadline(deadline_str: str) -> str:
    """Parse deadline string and return formatted date"""
    if deadline_str == 'N/A' or not deadline_str or deadline_str.strip() == '':
        return None
    
    # Extract the date part (handle cases like "November 1 (restricted early action)")
    import re
    date_match = re.search(r'(\w+)\s+(\d+)', deadline_str)
    if not date_match:
        return None
    
    month = date_match.group(1)
    day = date_match.group(2)
    current_year = 2026  # Use 2026 as the base year for deadlines
    
    return f"{month} {day}, {current_year}"

def main():
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    
    # Initialize Supabase client
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        return
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Load deadlines data
    deadlines_data = load_deadlines_data()
    if not deadlines_data:
        return
    
    print(f"Loading {len(deadlines_data)} school deadlines...")
    
    # Prepare data for insertion
    school_deadlines = []
    for school_data in deadlines_data:
        school_name = school_data.get('School', '').strip()
        if not school_name:
            continue
            
        deadline_record = {
            'school_name': school_name,
            'early_action_deadline': parse_deadline(school_data.get('Early Action', '')),
            'early_decision_1_deadline': parse_deadline(school_data.get('Early Decision 1', '')),
            'early_decision_2_deadline': parse_deadline(school_data.get('Early Decision 2', '')),
            'regular_decision_deadline': parse_deadline(school_data.get('Regular Decision', ''))
        }
        school_deadlines.append(deadline_record)
    
    # Insert data into Supabase
    try:
        # Clear existing data first
        print("Clearing existing school deadlines...")
        supabase.table('school_deadlines').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        
        # Insert new data
        print("Inserting school deadlines...")
        result = supabase.table('school_deadlines').insert(school_deadlines).execute()
        
        print(f"Successfully inserted {len(school_deadlines)} school deadlines")
        
        # Verify insertion
        count_result = supabase.table('school_deadlines').select('id', count='exact').execute()
        print(f"Total school deadlines in database: {count_result.count}")
        
    except Exception as e:
        print(f"Error inserting data: {e}")

if __name__ == "__main__":
    main()
