#!/usr/bin/env python3
"""
Profile Extraction Agent
Extracts comprehensive profile information from onboarding conversation transcripts
and populates the user_profiles table with initial data.
"""

import os
import sys
import json
import re
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
import google.generativeai as genai

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from .supabase_client import SupabaseClient

# Load environment variables
load_dotenv()

class ProfileExtractionAgent:
    def __init__(self):
        """Initialize the profile extraction agent"""
        self.supabase_client = SupabaseClient()
        
        # Initialize Google Gemini
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        self.profile_extraction_prompt = """You are an expert college admissions counselor. Analyze this onboarding conversation transcript and extract comprehensive profile information about the student.

Extract the following information and return it in JSON format:

{{
  "personal_information": {{
    "full_name": "Student's full name",
    "preferred_name": "Preferred name or nickname",
    "email_address": "Email address if mentioned",
    "phone_number": "Phone number if mentioned"
  }},
  "academic_profile": {{
    "high_school_name": "Name of high school",
    "high_school_graduation_year": 2025,
    "school_board": "ICSE/CBSE/IB/NIOS/CISCE/Other",
    "year_of_study": "11th/12th/Graduate",
    "sat_score": 1400,
    "act_score": 32,
    "class_10_score": 85.5,
    "class_11_score": 87.2,
    "class_12_half_yearly_score": 89.1,
    "intended_majors": "Computer Science, Engineering",
    "secondary_major_minor_interests": "Mathematics, Physics",
    "career_interests": "Software development, AI research"
  }},
  "college_preferences": {{
    "ideal_college_size": "Small (< 2,000 students)/Medium (2,000 - 15,000 students)/Large (> 15,000 students)",
    "ideal_college_setting": "Urban/Suburban/Rural/College Town",
    "geographic_preference": "In-state/Out-of-state/Northeast/West Coast/No Preference",
    "must_haves": "Strong CS program, research opportunities",
    "deal_breakers": "No financial aid, too far from home"
  }},
  "financial_information": {{
    "college_budget": "< $20,000/$20,000 - $35,000/$35,000 - $50,000/$50,000 - $70,000/> $70,000",
    "financial_aid_importance": "Crucial/Very Important/Somewhat Important/Not a factor",
    "scholarship_interests": ["Merit-based", "Need-based", "STEM"]
  }}
}}

IMPORTANT RULES:
1. Only extract information that is explicitly mentioned in the conversation
2. Use null for fields that are not mentioned
3. For numeric fields, extract actual numbers if mentioned
4. For enum fields, use the exact values from the options provided
5. For arrays, include all mentioned items
6. Be conservative - if unsure, use null rather than guessing

Conversation Transcript:
{transcript}

Provide the extracted profile information in the exact JSON format specified:"""

    def extract_profile_from_conversation(self, conversation_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Extract profile information from a conversation transcript and save to user_profiles table
        
        Args:
            conversation_id (str): The conversation ID to extract from
            user_id (str): The user ID to save the profile for
            
        Returns:
            Dict[str, Any]: Extracted profile information or None if failed
        """
        try:
            print(f"🔍 Extracting profile from conversation: {conversation_id}")
            
            # Get transcript from Supabase
            transcript = self.supabase_client.get_conversation_transcript(conversation_id)
            
            if not transcript:
                print(f"❌ No transcript found for conversation: {conversation_id}")
                return None
            
            print(f"✅ Retrieved transcript ({len(transcript)} characters)")
            
            # Extract profile using AI
            profile_data = self._extract_profile_with_ai(transcript)
            
            if not profile_data:
                print("❌ Failed to extract profile data")
                return None
            
            # Save to user_profiles table
            success = self._save_profile_to_database(user_id, profile_data)
            
            if success:
                print(f"✅ Successfully saved profile for user: {user_id}")
                return profile_data
            else:
                print(f"❌ Failed to save profile for user: {user_id}")
                return None
                
        except Exception as e:
            print(f"❌ Error extracting profile: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _extract_profile_with_ai(self, transcript: str) -> Optional[Dict[str, Any]]:
        """Extract profile information using AI"""
        try:
            prompt = self.profile_extraction_prompt.format(transcript=transcript)
            
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                profile_data = json.loads(json_str)
                
                # Flatten the nested structure for database storage
                flattened_profile = self._flatten_profile_data(profile_data)
                return flattened_profile
            else:
                print("❌ No JSON found in AI response")
                return None
                
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing JSON response: {e}")
            print(f"Response: {response_text}")
            return None
        except Exception as e:
            print(f"❌ Error in AI extraction: {e}")
            return None

    def _flatten_profile_data(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Flatten nested profile data for database storage"""
        flattened = {}
        
        # Personal Information
        personal = profile_data.get('personal_information', {})
        flattened.update({
            'full_name': personal.get('full_name'),
            'preferred_name': personal.get('preferred_name'),
            'email_address': personal.get('email_address'),
            'phone_number': personal.get('phone_number')
        })
        
        # Academic Profile
        academic = profile_data.get('academic_profile', {})
        flattened.update({
            'high_school_name': academic.get('high_school_name'),
            'high_school_graduation_year': academic.get('high_school_graduation_year'),
            'school_board': academic.get('school_board'),
            'year_of_study': academic.get('year_of_study'),
            'sat_score': academic.get('sat_score'),
            'act_score': academic.get('act_score'),
            'class_10_score': academic.get('class_10_score'),
            'class_11_score': academic.get('class_11_score'),
            'class_12_half_yearly_score': academic.get('class_12_half_yearly_score'),
            'intended_majors': academic.get('intended_majors'),
            'secondary_major_minor_interests': academic.get('secondary_major_minor_interests'),
            'career_interests': academic.get('career_interests')
        })
        
        # College Preferences
        preferences = profile_data.get('college_preferences', {})
        flattened.update({
            'ideal_college_size': preferences.get('ideal_college_size'),
            'ideal_college_setting': preferences.get('ideal_college_setting'),
            'geographic_preference': preferences.get('geographic_preference'),
            'must_haves': preferences.get('must_haves'),
            'deal_breakers': preferences.get('deal_breakers')
        })
        
        # Financial Information
        financial = profile_data.get('financial_information', {})
        flattened.update({
            'college_budget': financial.get('college_budget'),
            'financial_aid_importance': financial.get('financial_aid_importance'),
            'scholarship_interests': financial.get('scholarship_interests', [])
        })
        
        return flattened

    def _save_profile_to_database(self, user_id: str, profile_data: Dict[str, Any]) -> bool:
        """Save extracted profile data to user_profiles table"""
        try:
            # Add user_id to the profile data
            profile_data['user_id'] = user_id
            
            # Remove null values to avoid database issues
            cleaned_data = {k: v for k, v in profile_data.items() if v is not None}
            
            # Upsert to user_profiles table
            response = self.supabase_client.supabase.table('user_profiles').upsert(cleaned_data).execute()
            
            if response.data:
                print(f"✅ Profile data saved successfully")
                return True
            else:
                print(f"❌ Failed to save profile data: {response}")
                return False
                
        except Exception as e:
            print(f"❌ Error saving profile to database: {e}")
            return False

# Example usage
if __name__ == "__main__":
    agent = ProfileExtractionAgent()
    
    # Test with a sample conversation
    sample_conversation_id = "test_conversation_123"
    sample_user_id = "test_user_456"
    
    result = agent.extract_profile_from_conversation(sample_conversation_id, sample_user_id)
    
    if result:
        print("✅ Profile extraction successful!")
        print(json.dumps(result, indent=2))
    else:
        print("❌ Profile extraction failed!")
