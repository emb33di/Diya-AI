#!/usr/bin/env python3
"""
Simple test script for individual AI agents
Run this to test each agent separately before testing the orchestrator
"""

import requests
import json
import os

# Configuration - Update these with your actual values
SUPABASE_URL = "https://your-project.supabase.co"  # Replace with your Supabase URL
SUPABASE_SERVICE_KEY = "your-service-key-here"    # Replace with your service key

# Simple test essay
TEST_ESSAY = """
I have always been passionate about helping others. When I was in high school, I started volunteering at a local food bank. This experience taught me the importance of community service and giving back to those in need. I learned valuable leadership skills and developed a strong sense of empathy for people from different backgrounds.

Through my volunteer work, I discovered that I want to pursue a career in social work. I believe that everyone deserves access to resources and support, regardless of their circumstances. My goal is to make a positive impact in my community and help create a more equitable society for all.
"""

def test_agent(agent_name: str, url_suffix: str):
    """Test a specific agent"""
    print(f"\n🧪 Testing {agent_name} Agent...")
    
    url = f"{SUPABASE_URL}/functions/v1/{url_suffix}"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}'
    }
    data = {
        'essayContent': TEST_ESSAY
    }
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Success: {result['success']}")
        print(f"📝 Comments: {len(result['comments'])}")
        
        for i, comment in enumerate(result['comments'], 1):
            print(f"  {i}. {comment['comment_text'][:80]}...")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Test all three new agents"""
    print("🚀 Testing New AI Agents")
    print("=" * 40)
    
    # Test each agent
    tone_success = test_agent("Tone", "ai_agent_tone")
    clarity_success = test_agent("Clarity", "ai_agent_clarity")
    grammar_success = test_agent("Grammar & Spelling", "ai_agent_grammar_spelling")
    
    # Summary
    print("\n" + "=" * 40)
    print("📋 Results:")
    print(f"  Tone Agent: {'✅' if tone_success else '❌'}")
    print(f"  Clarity Agent: {'✅' if clarity_success else '❌'}")
    print(f"  Grammar Agent: {'✅' if grammar_success else '❌'}")
    
    if all([tone_success, clarity_success, grammar_success]):
        print("\n🎉 All agents working!")
    else:
        print("\n⚠️  Some agents failed. Check your configuration.")

if __name__ == "__main__":
    main()
