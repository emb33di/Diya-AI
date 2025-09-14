#!/usr/bin/env python3
"""
Test script for the SchoolFetcherAgent
"""

import os
import json
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv('../../.env')

sys.path.append('../../')

from school_fetcher_agent import SchoolFetcherAgent

def test_school_fetcher():
    """Test the school fetcher agent with a sample transcript"""
    
    # Set up the API key
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("Please set GOOGLE_API_KEY environment variable")
        return
    
    # Initialize the agent
    agent = SchoolFetcherAgent()
    
    # Sample transcript with economics and international business interests (no climate preferences)
    sample_transcript = """
    Student: I'm interested in economics and international business. I have a 3.8 GPA and 1400 SAT. 
    I'm from California and I'm looking for schools with strong international business programs and good 
    financial aid for international students.
    
    Counselor: That's great! Tell me more about your academic interests and what you're looking for in a school.
    
    Student: I want to study economics with a focus on international business applications. I'm particularly 
    interested in schools that have study abroad programs and strong connections with international companies. 
    I'm also looking for schools that offer good financial aid since I'm an international student.
    
    Counselor: What about school size and location preferences?
    
    Student: I prefer medium to large universities with diverse student populations. I want to be in a city or 
    urban area with good internship opportunities, especially for international business.
    """
    
    print("Analyzing transcript and fetching school recommendations...")
    print("=" * 60)
    
    # Fetch schools
    schools = agent.fetch_schools(sample_transcript, "student_123")
    
    print(f"Found {len(schools)} school recommendations:")
    print("=" * 60)
    
    # Display results
    for i, school in enumerate(schools, 1):
        print(f"\n{i}. {school['school']}")
        print(f"   Type: {school['school_type']}")
        print(f"   Ranking: {school['school_ranking']}")
        print(f"   Acceptance Rate: {school['acceptance_rate']}")
        print(f"   Location: {school.get('city', 'N/A')}, {school.get('state', 'N/A')}")
        print(f"   Climate: {school.get('climate', 'N/A')}")
        print(f"   ED Deadline: {school['ed_deadline']}")
        print(f"   First Round Deadline: {school['first_round_deadline']}")
        print(f"   Notes: {school['notes']}")
        print(f"   Student Thesis: {school['student_thesis']}")
        print("-" * 40)
    
    # Save results to JSON file in the school_fetcher_agent directory
    output_file = 'src/school_fetcher_agent/school_recommendations.json'
    with open(output_file, 'w') as f:
        json.dump(schools, f, indent=2)
    print(f"\nResults saved to {output_file}")

if __name__ == "__main__":
    test_school_fetcher() 