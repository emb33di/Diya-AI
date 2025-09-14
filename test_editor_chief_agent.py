#!/usr/bin/env python3
"""
Test script for the Editor in Chief agent
This script tests the individual Editor in Chief agent and its integration with the orchestrator.
"""

import requests
import json
import os
from typing import Dict, Any

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://your-project.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'your-service-key')

def test_editor_chief_agent():
    """Test the Editor in Chief agent individually"""
    print("🧪 Testing Editor in Chief Agent...")
    
    # Sample essay content for testing
    essay_content = """
    Growing up in a small town, I always felt like I was meant for something bigger. 
    When I was twelve, my grandmother fell ill, and I became her primary caregiver. 
    This experience taught me the value of compassion and responsibility. I learned 
    to balance school, family, and personal growth while caring for someone I loved.
    
    Through this challenge, I discovered my passion for healthcare. I volunteered 
    at the local hospital and shadowed doctors during my junior year. These 
    experiences confirmed that medicine is my calling. I want to become a doctor 
    who not only heals patients but also provides emotional support to families 
    during difficult times.
    
    My goal is to attend a university with strong pre-med programs and research 
    opportunities. I believe my experiences have prepared me to succeed academically 
    while making a meaningful contribution to the campus community.
    """
    
    essay_prompt = "Describe a significant challenge you've faced and how it has shaped your character and goals."
    
    # Sample previous comments from other agents
    previous_comments = [
        {
            "agent_type": "strengths",
            "comment_text": "Strong personal narrative with clear character development"
        },
        {
            "agent_type": "weaknesses", 
            "comment_text": "Could use more specific examples and details"
        },
        {
            "agent_type": "tone",
            "comment_text": "Authentic voice comes through well"
        }
    ]
    
    try:
        # Call the Editor in Chief agent
        url = f"{SUPABASE_URL}/functions/v1/ai_agent_editor_chief"
        
        payload = {
            "essayContent": essay_content,
            "essayPrompt": essay_prompt,
            "previousComments": previous_comments
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
        }
        
        print(f"📡 Calling Editor Chief agent at {url}")
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Editor Chief agent responded successfully!")
            
            # Validate response structure
            if data.get('success'):
                comments = data.get('comments', [])
                overall_assessment = data.get('overall_assessment', {})
                
                print(f"📊 Generated {len(comments)} editorial comments")
                
                # Display comments
                for i, comment in enumerate(comments, 1):
                    print(f"\n📝 Comment {i}:")
                    print(f"   Text: {comment.get('comment_text', 'N/A')}")
                    print(f"   Nature: {comment.get('comment_nature', 'N/A')}")
                    print(f"   Category: {comment.get('comment_category', 'N/A')}")
                    print(f"   Priority: {comment.get('priority_level', 'N/A')}")
                    print(f"   Decision: {comment.get('editorial_decision', 'N/A')}")
                    print(f"   Impact: {comment.get('impact_assessment', 'N/A')}")
                    print(f"   Confidence: {comment.get('confidence_score', 'N/A')}")
                
                # Display overall assessment
                print(f"\n📈 Overall Assessment:")
                print(f"   Essay Strength Score: {overall_assessment.get('essay_strength_score', 'N/A')}/10")
                print(f"   Admissions Readiness: {overall_assessment.get('admissions_readiness', 'N/A')}")
                
                key_strengths = overall_assessment.get('key_strengths', [])
                if key_strengths:
                    print(f"   Key Strengths:")
                    for strength in key_strengths:
                        print(f"     • {strength}")
                
                critical_weaknesses = overall_assessment.get('critical_weaknesses', [])
                if critical_weaknesses:
                    print(f"   Critical Weaknesses:")
                    for weakness in critical_weaknesses:
                        print(f"     • {weakness}")
                
                recommended_actions = overall_assessment.get('recommended_actions', [])
                if recommended_actions:
                    print(f"   Recommended Actions:")
                    for action in recommended_actions:
                        print(f"     • {action}")
                
                return True
            else:
                print(f"❌ Editor Chief agent failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Editor Chief agent: {str(e)}")
        return False

def test_orchestrator_integration():
    """Test the Editor in Chief agent integration with the orchestrator"""
    print("\n🧪 Testing Editor Chief Integration with Orchestrator...")
    
    # Sample essay content for testing
    essay_content = """
    The sound of rain on my bedroom window always reminds me of that summer 
    when everything changed. I was fifteen, and my family had just moved to 
    a new city. I felt lost and disconnected from everything familiar. 
    
    One day, I discovered a community garden in my neighborhood. I started 
    volunteering there, learning about plants and helping neighbors grow 
    their own food. Through this experience, I found my passion for 
    environmental science and community service.
    
    Now I want to study environmental science in college to help create 
    sustainable solutions for our planet. I believe that small actions 
    can lead to big changes, and I want to be part of that positive impact.
    """
    
    essay_prompt = "Describe a time when you discovered something new about yourself or your interests."
    
    try:
        # Call the orchestrator
        url = f"{SUPABASE_URL}/functions/v1/generate-essay-comments-orchestrator"
        
        payload = {
            "essayId": "test-essay-123",
            "essayContent": essay_content,
            "essayPrompt": essay_prompt,
            "userId": "test-user-456"
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
        }
        
        print(f"📡 Calling orchestrator at {url}")
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Orchestrator responded successfully!")
            
            if data.get('success'):
                agent_results = data.get('agentResults', {})
                editor_chief_result = agent_results.get('editorChief', {})
                
                print(f"📊 Editor Chief agent result:")
                print(f"   Success: {editor_chief_result.get('success', False)}")
                print(f"   Comments: {len(editor_chief_result.get('comments', []))}")
                
                if editor_chief_result.get('success'):
                    comments = editor_chief_result.get('comments', [])
                    print(f"   Editor Chief generated {len(comments)} comments")
                    
                    # Show first comment as example
                    if comments:
                        first_comment = comments[0]
                        print(f"   Sample comment: {first_comment.get('commentText', 'N/A')[:100]}...")
                else:
                    print(f"   Error: {editor_chief_result.get('error', 'Unknown error')}")
                
                # Check structured comments
                structured_comments = data.get('structuredComments', {})
                overall_comments = structured_comments.get('overall', {})
                editor_chief_comments = overall_comments.get('editorChief', [])
                
                print(f"📋 Editor Chief comments in structured format: {len(editor_chief_comments)}")
                
                return True
            else:
                print(f"❌ Orchestrator failed: {data.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing orchestrator integration: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Editor in Chief Agent Tests")
    print("=" * 50)
    
    # Check configuration
    if not SUPABASE_URL or SUPABASE_URL == 'https://your-project.supabase.co':
        print("❌ Please set SUPABASE_URL environment variable")
        return
    
    if not SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_KEY == 'your-service-key':
        print("❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable")
        return
    
    # Run tests
    tests_passed = 0
    total_tests = 2
    
    # Test 1: Individual Editor Chief agent
    if test_editor_chief_agent():
        tests_passed += 1
        print("✅ Editor Chief agent test PASSED")
    else:
        print("❌ Editor Chief agent test FAILED")
    
    # Test 2: Orchestrator integration
    if test_orchestrator_integration():
        tests_passed += 1
        print("✅ Orchestrator integration test PASSED")
    else:
        print("❌ Orchestrator integration test FAILED")
    
    # Summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Editor in Chief agent is ready for deployment.")
    else:
        print("⚠️  Some tests failed. Please check the configuration and try again.")

if __name__ == "__main__":
    main()
