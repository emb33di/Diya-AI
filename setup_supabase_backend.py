#!/usr/bin/env python3
"""
Supabase Backend Setup Script for Diya AI Counselor
Project ID: oliclbcxukqddxlfxuuc

This script sets up the complete backend infrastructure for the Diya AI Counselor project.
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Error during {description}: {e}")
        print(f"Error output: {e.stderr}")
        return None

def setup_environment():
    """Set up environment variables"""
    print("\n🔧 Setting up environment variables...")
    
    env_content = """# Supabase Configuration for Project: oliclbcxukqddxlfxuuc
VITE_SUPABASE_URL=https://oliclbcxukqddxlfxuuc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saWNsYmN4dWtxZGR4bGZ4dXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjAwOTEsImV4cCI6MjA2OTc5NjA5MX0.UFqtHseTnep26jJIYW8_gjawq5ffPzG4PaePTU5FO7M

# Backend Configuration
SUPABASE_URL=https://oliclbcxukqddxlfxuuc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saWNsYmN4dWtxZGR4bGZ4dXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjAwOTEsImV4cCI6MjA2OTc5NjA5MX0.UFqtHseTnep26jJIYW8_gjawq5ffPzG4PaePTU5FO7M

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
"""
    
    # Create .env.local file
    with open('.env.local', 'w') as f:
        f.write(env_content)
    
    # Create landing/.env.local file
    landing_env_content = """# Supabase Configuration for Landing Page
VITE_SUPABASE_URL=https://oliclbcxukqddxlfxuuc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saWNsYmN4dWtxZGR4bGZ4dXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjAwOTEsImV4cCI6MjA2OTc5NjA5MX0.UFqtHseTnep26jJIYW8_gjawq5ffPzG4PaePTU5FO7M
"""
    
    os.makedirs('landing', exist_ok=True)
    with open('landing/.env.local', 'w') as f:
        f.write(landing_env_content)
    
    print("✅ Environment files created")

def setup_supabase_cli():
    """Set up Supabase CLI and link project"""
    print("\n🔧 Setting up Supabase CLI...")
    
    # Check if Supabase CLI is installed
    try:
        subprocess.run(['supabase', '--version'], check=True, capture_output=True)
        print("✅ Supabase CLI is already installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("📦 Installing Supabase CLI...")
        # Install Supabase CLI (macOS)
        run_command('brew install supabase/tap/supabase', 'Installing Supabase CLI')
    
    # Link to the project
    run_command('supabase link --project-ref oliclbcxukqddxlfxuuc', 'Linking to Supabase project')

def run_migrations():
    """Run database migrations"""
    print("\n🗄️ Running database migrations...")
    
    # Check if we're in the right directory
    if not os.path.exists('supabase'):
        print("❌ Supabase directory not found. Please run this script from the project root.")
        return False
    
    # Run migrations
    result = run_command('supabase db push', 'Pushing database schema')
    if result:
        print("✅ Database migrations completed")
        return True
    else:
        print("❌ Database migrations failed")
        return False

def setup_edge_functions():
    """Deploy edge functions"""
    print("\n⚡ Setting up edge functions...")
    
    functions_dir = Path('supabase/functions')
    if functions_dir.exists():
        result = run_command('supabase functions deploy', 'Deploying edge functions')
        if result:
            print("✅ Edge functions deployed")
            return True
        else:
            print("❌ Edge functions deployment failed")
            return False
    else:
        print("⚠️ No edge functions found to deploy")
        return True

def verify_setup():
    """Verify the setup"""
    print("\n🔍 Verifying setup...")
    
    # Check environment files
    if os.path.exists('.env.local'):
        print("✅ Main environment file exists")
    else:
        print("❌ Main environment file missing")
    
    if os.path.exists('landing/.env.local'):
        print("✅ Landing environment file exists")
    else:
        print("❌ Landing environment file missing")
    
    # Check Supabase config
    if os.path.exists('supabase/config.toml'):
        with open('supabase/config.toml', 'r') as f:
            content = f.read()
            if 'oliclbcxukqddxlfxuuc' in content:
                print("✅ Supabase config updated")
            else:
                print("❌ Supabase config not updated")
    
    print("\n🎉 Setup verification completed!")

def main():
    """Main setup function"""
    print("🚀 Setting up Supabase Backend for Diya AI Counselor")
    print("Project ID: oliclbcxukqddxlfxuuc")
    print("=" * 60)
    
    # Step 1: Setup environment
    setup_environment()
    
    # Step 2: Setup Supabase CLI
    setup_supabase_cli()
    
    # Step 3: Run migrations
    if run_migrations():
        print("✅ Database setup completed")
    else:
        print("❌ Database setup failed")
        return False
    
    # Step 4: Deploy edge functions
    if setup_edge_functions():
        print("✅ Edge functions setup completed")
    else:
        print("❌ Edge functions setup failed")
        return False
    
    # Step 5: Verify setup
    verify_setup()
    
    print("\n" + "=" * 60)
    print("🎉 Supabase Backend Setup Complete!")
    print("\n📋 Next Steps:")
    print("1. Update your service role key in .env.local")
    print("2. Add your AI API keys (Gemini, ElevenLabs)")
    print("3. Test the connection with: python backend/check_db.py")
    print("4. Start your development server")
    print("\n🔗 Project URL: https://oliclbcxukqddxlfxuuc.supabase.co")
    print("📊 Supabase Dashboard: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
