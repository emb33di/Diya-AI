#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv('../.env')

# Add src directory to path
sys.path.append('src')

from supabase import create_client

def main():
    print("🔍 Checking Supabase Database")
    print("=" * 40)
    
    # Check environment variables
    print("Environment variables:")
    print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT SET')}")
    print(f"SUPABASE_ANON_KEY: {os.getenv('SUPABASE_ANON_KEY', 'NOT SET')[:20]}...")
    print()
    
    try:
        # Try with anon key first
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase with anon key")
        
        # Check conversation_metadata table
        print("\n📋 Checking conversation_metadata table...")
        try:
            response = supabase.table('conversation_metadata').select('*').execute()
            print(f"Found {len(response.data)} conversations")
            
            for conv in response.data:
                print(f"  - ID: {conv.get('conversation_id', 'N/A')}")
                print(f"    User: {conv.get('user_id', 'N/A')}")
                print(f"    Has transcript: {'Yes' if conv.get('transcript') else 'No'}")
                print()
        except Exception as e:
            print(f"❌ Error with anon key: {e}")
        
        # Try with service role key
        print("\n🔄 Trying with service role key...")
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Connected to Supabase with service role key")
        
        response = supabase.table('conversation_metadata').select('*').execute()
        print(f"Found {len(response.data)} conversations")
        
        for conv in response.data:
            print(f"  - ID: {conv.get('conversation_id', 'N/A')}")
            print(f"    User: {conv.get('user_id', 'N/A')}")
            print(f"    Has transcript: {'Yes' if conv.get('transcript') else 'No'}")
            print()
        
        # Check profiles table
        print("\n👥 Checking profiles table...")
        response = supabase.table('profiles').select('*').execute()
        print(f"Found {len(response.data)} profiles")
        
        for profile in response.data:
            print(f"  - User: {profile.get('user_id', 'N/A')}")
            print(f"    Name: {profile.get('full_name', 'N/A')}")
            print()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main() 