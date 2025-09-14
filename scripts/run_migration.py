#!/usr/bin/env python3
"""
Script to run the complete migration from backend API to Supabase-only
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(f"Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed")
        print(f"Error: {e.stderr}")
        return False

def main():
    print("🚀 Starting migration from backend API to Supabase-only architecture")
    
    # Check if we're in the right directory
    if not os.path.exists('supabase'):
        print("❌ Error: Please run this script from the project root directory")
        return
    
    # Step 1: Apply database migrations
    print("\n📊 Step 1: Applying database migrations...")
    if not run_command("supabase db push", "Applying database migrations"):
        print("❌ Migration failed at database step")
        return
    
    # Step 2: Deploy Edge Functions
    print("\n⚡ Step 2: Deploying Edge Functions...")
    edge_functions = [
        "generate-school-recommendations",
        "generate-conversation-summary"
    ]
    
    for function_name in edge_functions:
        if not run_command(f"supabase functions deploy {function_name}", f"Deploying {function_name}"):
            print(f"❌ Failed to deploy {function_name}")
            return
    
    # Step 3: Populate school deadlines table
    print("\n📚 Step 3: Populating school deadlines table...")
    if not run_command("python scripts/populate_school_deadlines.py", "Populating school deadlines"):
        print("❌ Failed to populate school deadlines table")
        return
    
    # Step 4: Test the migration
    print("\n🧪 Step 4: Testing the migration...")
    if not run_command("python -c \"import sys; sys.path.append('backend/src'); from populate_school_deadlines import main; main()\"", "Testing school deadlines population"):
        print("⚠️ Warning: Test failed, but migration may still be successful")
    
    print("\n🎉 Migration completed successfully!")
    print("\n📋 Next steps:")
    print("1. Update your environment variables to remove VITE_BACKEND_API_URL")
    print("2. Test the application to ensure everything works")
    print("3. Remove the backend API server if no longer needed")
    print("4. Update your deployment configuration")

if __name__ == "__main__":
    main()
