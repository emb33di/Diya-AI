#!/usr/bin/env python3
"""
Final script to apply the category field migration
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

# Add backend/src to path
sys.path.append('backend/src')

from supabase_client import SupabaseClient

def main():
    print("🔧 Applying migration to add category field...")
    
    try:
        # Initialize Supabase client with service role key
        supabase = SupabaseClient()
        print("✅ Connected to Supabase")
        
        # First, let's check if the column already exists
        print("🔍 Checking if category column exists...")
        try:
            response = supabase.supabase.table('school_recommendations').select('category').limit(1).execute()
            print("✅ Category column already exists!")
            return
        except Exception as e:
            if "column school_recommendations.category does not exist" in str(e):
                print("❌ Category column does not exist - need to add it manually")
            else:
                print(f"❌ Error checking column: {e}")
        
        print("\n📝 To add the category column, please run this SQL in your Supabase dashboard:")
        print("=" * 60)
        print("""
        ALTER TABLE public.school_recommendations 
        ADD COLUMN category TEXT;

        COMMENT ON COLUMN public.school_recommendations.category IS 'Category of the school recommendation (e.g., dream, target, safety)';
        """)
        print("=" * 60)
        print("\nSteps:")
        print("1. Go to your Supabase Dashboard")
        print("2. Click 'SQL Editor' in the left sidebar")
        print("3. Paste the SQL above and click 'Run'")
        print("4. Then run the test again")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main() 