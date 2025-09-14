#!/usr/bin/env python3
"""
Test script for the three new AI agents: tone, clarity, and grammar_spelling
This script tests each agent individually and then tests the orchestrator integration.
"""

import requests
import json
import os
from typing import Dict, Any

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://your-project.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Test essay content
TEST_ESSAY = """
Growing up in a small town, I always felt like I was meant for something bigger. When I was twelve years old, my grandmother passed away, and it was during this difficult time that I discovered my passion for helping others. She had been the heart of our family, always there to listen and offer wisdom when we needed it most.

After her death, I noticed how much my family struggled to cope with the loss. My parents were overwhelmed with grief, and my younger siblings didn't understand how to process their emotions. I realized that I had a natural ability to comfort people and help them through difficult times. This experience taught me that I wanted to pursue a career in psychology, specifically focusing on grief counseling and family therapy.

Throughout high school, I volunteered at our local community center, where I helped organize support groups for families dealing with loss. I also started a peer counseling program at my school, training other students to recognize signs of emotional distress in their classmates. These experiences have reinforced my desire to become a psychologist who can help families navigate through their most challenging moments.

I believe that my personal experience with loss, combined with my natural empathy and communication skills, makes me uniquely qualified to pursue this career path. I am excited about the opportunity to study psychology at your university and eventually make a meaningful difference in the lives of families who are struggling with grief and loss.
"""

TEST_PROMPT = "Describe a significant challenge or setback you have faced and how you overcame it."

def test_tone_agent():
    """Test the tone agent individually"""
    print("🎭 Testing Tone Agent...")
    
    url = f"{SUPABASE_URL}/functions/v1/ai_agent_tone"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}'
    }
    data = {
        'essayContent': TEST_ESSAY,
        'essayPrompt': TEST_PROMPT
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Tone Agent Success: {result['success']}")
        print(f"📝 Comments Generated: {len(result['comments'])}")
        
        for i, comment in enumerate(result['comments'], 1):
            print(f"  {i}. [{comment['comment_nature']}] {comment['comment_text'][:100]}...")
            print(f"     Confidence: {comment['confidence_score']}")
        
        return result
    except Exception as e:
        print(f"❌ Tone Agent Error: {e}")
        return None

def test_clarity_agent():
    """Test the clarity agent individually"""
    print("\n🔍 Testing Clarity Agent...")
    
    url = f"{SUPABASE_URL}/functions/v1/ai_agent_clarity"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}'
    }
    data = {
        'essayContent': TEST_ESSAY,
        'essayPrompt': TEST_PROMPT
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Clarity Agent Success: {result['success']}")
        print(f"📝 Comments Generated: {len(result['comments'])}")
        
        for i, comment in enumerate(result['comments'], 1):
            print(f"  {i}. {comment['comment_text'][:100]}...")
            print(f"     Text Selection: {comment['text_selection']['start']}-{comment['text_selection']['end']}")
            print(f"     Confidence: {comment['confidence_score']}")
        
        return result
    except Exception as e:
        print(f"❌ Clarity Agent Error: {e}")
        return None

def test_grammar_spelling_agent():
    """Test the grammar & spelling agent individually"""
    print("\n📝 Testing Grammar & Spelling Agent...")
    
    url = f"{SUPABASE_URL}/functions/v1/ai_agent_grammar_spelling"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}'
    }
    data = {
        'essayContent': TEST_ESSAY,
        'essayPrompt': TEST_PROMPT
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Grammar & Spelling Agent Success: {result['success']}")
        print(f"📝 Comments Generated: {len(result['comments'])}")
        
        for i, comment in enumerate(result['comments'], 1):
            print(f"  {i}. {comment['comment_text'][:100]}...")
            print(f"     Text Selection: {comment['text_selection']['start']}-{comment['text_selection']['end']}")
            print(f"     Confidence: {comment['confidence_score']}")
        
        return result
    except Exception as e:
        print(f"❌ Grammar & Spelling Agent Error: {e}")
        return None

def test_orchestrator_integration():
    """Test the orchestrator with all agents including the new ones"""
    print("\n🎯 Testing Orchestrator Integration...")
    
    url = f"{SUPABASE_URL}/functions/v1/generate-essay-comments-orchestrator"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}'
    }
    data = {
        'essayId': 'test-essay-123',
        'essayContent': TEST_ESSAY,
        'essayPrompt': TEST_PROMPT,
        'essayTitle': 'Test Essay',
        'userId': 'test-user-456'
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ Orchestrator Success: {result['success']}")
        print(f"📝 Total Comments Generated: {len(result['comments'])}")
        
        # Check agent results
        agent_results = result.get('agentResults', {})
        print("\n🤖 Agent Results:")
        for agent_name, agent_result in agent_results.items():
            status = "✅" if agent_result['success'] else "❌"
            comment_count = len(agent_result['comments'])
            print(f"  {status} {agent_name}: {comment_count} comments")
            if agent_result.get('error'):
                print(f"     Error: {agent_result['error']}")
        
        # Check structured comments
        structured = result.get('structuredComments', {})
        print("\n📊 Structured Comments:")
        print(f"  Overall: {len(structured.get('overall', {}).get('tone', []))} tone comments")
        print(f"  Inline Clarity: {len(structured.get('inline', {}).get('clarity', []))} clarity comments")
        print(f"  Inline Grammar: {len(structured.get('inline', {}).get('grammarSpelling', []))} grammar comments")
        
        return result
    except Exception as e:
        print(f"❌ Orchestrator Error: {e}")
        return None

def main():
    """Run all tests"""
    print("🚀 Starting New AI Agents Test Suite")
    print("=" * 50)
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
        return
    
    # Test individual agents
    tone_result = test_tone_agent()
    clarity_result = test_clarity_agent()
    grammar_result = test_grammar_spelling_agent()
    
    # Test orchestrator integration
    orchestrator_result = test_orchestrator_integration()
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Summary:")
    print(f"  Tone Agent: {'✅ PASS' if tone_result and tone_result['success'] else '❌ FAIL'}")
    print(f"  Clarity Agent: {'✅ PASS' if clarity_result and clarity_result['success'] else '❌ FAIL'}")
    print(f"  Grammar Agent: {'✅ PASS' if grammar_result and grammar_result['success'] else '❌ FAIL'}")
    print(f"  Orchestrator: {'✅ PASS' if orchestrator_result and orchestrator_result['success'] else '❌ FAIL'}")
    
    if all([tone_result, clarity_result, grammar_result, orchestrator_result]):
        print("\n🎉 All tests passed! The new AI agents are working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the error messages above.")

if __name__ == "__main__":
    main()
