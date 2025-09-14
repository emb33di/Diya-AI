#!/usr/bin/env python3
"""
Test script for the SchoolFetcherAgent with Supabase integration
"""

import os
import json
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv('../../.env')

sys.path.append('../../')

from school_fetcher_agent import SchoolFetcherAgent

def test_supabase_integration():
    """Test the school fetcher agent with Supabase integration"""
    
    # Set up the API key
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("Please set GOOGLE_API_KEY environment variable")
        return
    
    # Initialize the agent
    agent = SchoolFetcherAgent()
    
    # Test parameters
    conversation_id = "test_conversation_123"  # Replace with actual conversation ID
    student_id = "test_student_456"  # Replace with actual student ID
    
    print("Testing Supabase integration with SchoolFetcherAgent...")
    print("=" * 60)
    
    try:
        # Fetch schools using conversation ID from Supabase
        schools = agent.fetch_schools_from_conversation(conversation_id, student_id)
        
        print(f"Found {len(schools)} school recommendations:")
        print("=" * 60)
        
        # Display results
        for i, school in enumerate(schools, 1):
            print(f"\n{i}. {school['school']}")
            print(f"   Type: {school['school_type']}")
            print(f"   Ranking: {school['school_ranking']}")
            print(f"   Acceptance Rate: {school['acceptance_rate']}")
            print(f"   Category: {school.get('category', 'N/A')}")
            print(f"   Location: {school.get('city', 'N/A')}, {school.get('state', 'N/A')}")
            print(f"   Climate: {school.get('climate', 'N/A')}")
            print(f"   Notes: {school['notes']}")
            print(f"   Student Thesis: {school['student_thesis']}")
            print("-" * 40)
        
        # Save results to JSON file in the school_fetcher_agent directory
        output_file = 'src/school_fetcher_agent/supabase_school_recommendations.json'
        with open(output_file, 'w') as f:
            json.dump(schools, f, indent=2)
        print(f"\nResults saved to {output_file}")
        
    except Exception as e:
        print(f"Error during Supabase integration test: {e}")
        import traceback
        traceback.print_exc()

def test_supabase_client_directly():
    """Test the Supabase client directly"""
    print("\nTesting Supabase client directly...")
    print("=" * 60)
    
    try:
        from supabase_client import SupabaseClient
        
        client = SupabaseClient()
        
        # Test getting a transcript
        conversation_id = "test_conversation_123"
        transcript = client.get_conversation_transcript(conversation_id)
        
        if transcript:
            print(f"Successfully retrieved transcript for conversation {conversation_id}")
            print(f"Transcript length: {len(transcript)} characters")
        else:
            print(f"No transcript found for conversation {conversation_id}")
        
        # Test getting school recommendations
        student_id = "test_student_456"
        recommendations = client.get_school_recommendations(student_id)
        
        print(f"Found {len(recommendations)} existing recommendations for student {student_id}")
        
    except Exception as e:
        print(f"Error testing Supabase client: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Test Supabase client directly first
    test_supabase_client_directly()
    
    # Then test the full integration
    test_supabase_integration() 