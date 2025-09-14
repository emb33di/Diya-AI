#!/usr/bin/env python3
"""
One-time script to update existing school recommendations with deadline data
This fixes the legacy data that was created before automatic deadline population
"""

import os
import sys
import json
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

# Add backend src directory to path
sys.path.append('backend/src')

try:
    from src.supabase_client import SupabaseClient
    
    def update_existing_school_recommendations():
        """Update existing school recommendations with deadline data"""
        print("🔄 Updating existing school recommendations with deadline data...")
        
        # Initialize Supabase client
        supabase = SupabaseClient()
        
        # Load deadlines data
        deadlines_file_path = os.path.join('backend', 'src', 'deadline_tracker', 'deadlines_2026.json')
        
        if not os.path.exists(deadlines_file_path):
            print(f"❌ Deadlines file not found: {deadlines_file_path}")
            return False
        
        with open(deadlines_file_path, 'r') as f:
            deadlines_data = json.load(f)
        
        print(f"📊 Loaded {len(deadlines_data)} schools from deadlines database")
        
        # Get all school recommendations that don't have deadline data
        response = supabase.supabase.table('school_recommendations').select('*').execute()
        
        if not response.data:
            print("❌ No school recommendations found")
            return False
        
        schools_to_update = response.data
        print(f"📋 Found {len(schools_to_update)} school recommendations to check")
        
        # Helper function to parse deadline strings
        def parse_deadline(deadline_str: str) -> str:
            if deadline_str == 'N/A' or not deadline_str:
                return None
            # Extract the date part (handle cases like "November 1 (restricted early action)")
            date_match = re.search(r'(\w+)\s+(\d+)', deadline_str)
            if not date_match:
                return None
            
            month = date_match.group(1)
            day = date_match.group(2)
            current_year = 2026  # Use 2026 as the base year for deadlines
            
            return f"{month} {day}, {current_year}"
        
        updated_count = 0
        
        # Update each school with deadline information
        for school_rec in schools_to_update:
            school_name = school_rec.get('school', '')
            school_id = school_rec.get('id')
            

            # Skip if already has deadline data
            if school_rec.get('regular_decision_deadline'):
                continue
            
            # Find matching deadline data
            deadline_info = None
            for deadline in deadlines_data:
                if deadline.get('School') == school_name:
                    deadline_info = deadline
                    break
            
            if deadline_info:
                # Parse deadlines
                early_action_deadline = parse_deadline(deadline_info.get("Early Action", ""))
                early_decision_1_deadline = parse_deadline(deadline_info.get("Early Decision 1", ""))
                early_decision_2_deadline = parse_deadline(deadline_info.get("Early Decision 2", ""))
                regular_decision_deadline = parse_deadline(deadline_info.get("Regular Decision", ""))
                
                # Update the school recommendation with deadline data
                try:
                    update_response = supabase.supabase.table('school_recommendations').update({
                        'early_action_deadline': early_action_deadline,
                        'early_decision_1_deadline': early_decision_1_deadline,
                        'early_decision_2_deadline': early_decision_2_deadline,
                        'regular_decision_deadline': regular_decision_deadline,
                        'application_status': 'not_started'
                    }).eq('id', school_id).execute()
                    
                    if update_response.data:
                        updated_count += 1
                        print(f"✅ Updated deadlines for {school_name}")
                    
                except Exception as e:
                    print(f"⚠️  Error updating {school_name}: {e}")
            else:
                print(f"⚠️  No deadline data found for {school_name}")
        
        print(f"\n🎉 Successfully updated {updated_count} school recommendations with deadline data!")
        return True
    
    if __name__ == "__main__":
        print("🚀 Starting deadline data migration for existing school recommendations...")
        success = update_existing_school_recommendations()
        
        if success:
            print("\n✅ Migration completed successfully!")
            print("🔄 Refresh your deadlines page to see the updated data")
        else:
            print("\n❌ Migration failed")
            print("💡 Please check your database connection and try again")

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Make sure you're running this from the project root directory")
    print("💡 And that the backend dependencies are installed")
