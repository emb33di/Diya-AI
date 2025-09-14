#!/usr/bin/env python3
"""
Conversation Resume Agent
Handles transcript retrieval, summarization, and context preparation for resumed conversations
"""

import os
import sys
import json
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv
import google.generativeai as genai

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from .supabase_client import SupabaseClient

# Load environment variables
load_dotenv()

class ConversationResumeAgent:
    def __init__(self):
        """Initialize the conversation resume agent"""
        self.supabase_client = SupabaseClient()
        
        # Initialize Google Gemini
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        self.summary_prompt = """You are an expert college admissions counselor. Analyze this conversation transcript and create a concise summary of the key points discussed.

Focus on:
- Student's academic background and interests (GPA, test scores, majors)
- College preferences and criteria (location, size, programs)
- Application timeline and deadlines
- Specific questions or concerns raised
- Any decisions or next steps discussed

IMPORTANT: Keep the summary under 150 words and focus ONLY on information that would be useful for continuing the conversation. Avoid repetition and be specific.

Conversation Transcript:
{transcript}

Provide a clear, structured summary:"""

        self.brainstorming_prompt = """You are an expert college admissions counselor and essay writing coach. Analyze this conversation transcript from an essay brainstorming session and create a structured summary of the key themes, stories, and angles discussed.

Focus on extracting:
1. Key themes and topics mentioned
2. Personal stories and experiences shared
3. Potential essay angles and approaches
4. Writing prompts that could help develop ideas
5. Structure suggestions for the essay

IMPORTANT: Return the analysis in the following JSON format exactly:

{{
  "key_themes": ["theme1", "theme2", "theme3"],
  "personal_stories": ["story1", "story2", "story3"],
  "essay_angles": ["angle1", "angle2", "angle3"],
  "writing_prompts": ["prompt1", "prompt2", "prompt3"],
  "structure_suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}}

Conversation Transcript:
{transcript}

Provide the analysis in the exact JSON format specified:"""

    def get_previous_conversation_context(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve and summarize previous conversation context"""
        try:
            print(f"🔍 Retrieving conversation context for user {user_id}")
            
            # Get conversation metadata from Supabase
            response = self.supabase_client.supabase.table('conversation_metadata') \
                .select('conversation_id, transcript, transcript_summary, created_at') \
                .eq('user_id', user_id) \
                .neq('transcript', '') \
                .order('created_at', desc=True) \
                .limit(3) \
                .execute()
            
            if not response.data:
                print("❌ No previous conversations found")
                return None
            
            print(f"✅ Found {len(response.data)} previous conversations")
            
            # Process each conversation
            conversation_contexts = []
            for i, conv in enumerate(response.data):
                transcript = conv.get('transcript', '')
                if not transcript or transcript.strip() == '':
                    continue
                
                print(f"📝 Processing conversation {i+1} (length: {len(transcript)} chars)")
                
                # Generate summary using our AI agent
                summary = self._generate_summary(transcript)
                
                if summary:
                    # Use chronological order (most recent first, so reverse the numbering)
                    session_num = len(response.data) - i
                    conversation_contexts.append({
                        'session_number': session_num,
                        'transcript': transcript,
                        'summary': summary,
                        'created_at': conv.get('created_at')
                    })
                    print(f"✅ Generated summary for session {session_num}")
                else:
                    print(f"⚠️ Failed to generate summary for conversation {i+1}")
            
            if not conversation_contexts:
                print("❌ No valid conversation contexts found")
                return None
            
            # Create combined context for ElevenLabs
            combined_context = self._create_combined_context(conversation_contexts)
            
            print(f"✅ Generated context for {len(conversation_contexts)} conversations")
            print(f"📏 Final context length: {len(combined_context)} characters")
            return {
                'context': combined_context,
                'session_count': len(conversation_contexts),
                'conversations': conversation_contexts
            }
            
        except Exception as e:
            print(f"❌ Error retrieving conversation context: {e}")
            return None

    def generate_brainstorming_summary(self, conversation_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Generate brainstorming summary from a conversation transcript"""
        try:
            print(f"🎯 Generating brainstorming summary for conversation {conversation_id}")
            
            # Get conversation transcript from Supabase
            response = self.supabase_client.supabase.table('conversation_metadata') \
                .select('transcript') \
                .eq('conversation_id', conversation_id) \
                .eq('user_id', user_id) \
                .single() \
                .execute()
            
            if not response.data or not response.data.get('transcript'):
                print("❌ No transcript found for conversation")
                return None
            
            transcript = response.data['transcript']
            print(f"📝 Found transcript ({len(transcript)} chars)")
            
            # Generate brainstorming summary using AI
            summary_data = self._generate_brainstorming_summary(transcript)
            
            if summary_data:
                print("✅ Generated brainstorming summary")
                return summary_data
            else:
                print("❌ Failed to generate brainstorming summary")
                return None
                
        except Exception as e:
            print(f"❌ Error generating brainstorming summary: {e}")
            return None

    def _generate_summary(self, transcript: str) -> Optional[str]:
        """Generate a summary of the conversation transcript"""
        try:
            # Clean up transcript if needed
            cleaned_transcript = transcript.strip()
            if not cleaned_transcript:
                return None
            
            # Generate summary using Gemini
            response = self.model.generate_content(
                self.summary_prompt.format(transcript=cleaned_transcript)
            )
            
            summary = response.text.strip()
            print(f"📋 Generated summary ({len(summary)} chars): {summary[:100]}...")
            
            return summary
            
        except Exception as e:
            print(f"❌ Error generating summary: {e}")
            return None

    def _generate_brainstorming_summary(self, transcript: str) -> Optional[Dict[str, Any]]:
        """Generate a structured brainstorming summary from conversation transcript"""
        try:
            # Clean up transcript if needed
            cleaned_transcript = transcript.strip()
            if not cleaned_transcript:
                return None
            
            # Generate brainstorming summary using Gemini
            response = self.model.generate_content(
                self.brainstorming_prompt.format(transcript=cleaned_transcript)
            )
            
            summary_text = response.text.strip()
            print(f"📋 Generated brainstorming summary ({len(summary_text)} chars)")
            
            # Parse the JSON response
            try:
                # Extract JSON from the response (in case there's additional text)
                json_start = summary_text.find('{')
                json_end = summary_text.rfind('}') + 1
                
                if json_start != -1 and json_end != 0:
                    json_str = summary_text[json_start:json_end]
                    summary_data = json.loads(json_str)
                    
                    # Validate the structure
                    required_keys = ['key_themes', 'personal_stories', 'essay_angles', 'writing_prompts', 'structure_suggestions']
                    if all(key in summary_data for key in required_keys):
                        print(f"✅ Parsed brainstorming summary with {len(summary_data.get('key_themes', []))} themes")
                        return summary_data
                    else:
                        print("⚠️ Invalid brainstorming summary structure")
                        return None
                else:
                    print("⚠️ No JSON found in response")
                    return None
                    
            except json.JSONDecodeError as e:
                print(f"❌ Error parsing JSON response: {e}")
                return None
            
        except Exception as e:
            print(f"❌ Error generating brainstorming summary: {e}")
            return None

    def _create_combined_context(self, conversations: List[Dict[str, Any]]) -> str:
        """Create combined context string for ElevenLabs"""
        context_parts = []
        
        # Reverse the order so most recent is last (more natural for conversation flow)
        for conv in reversed(conversations):
            session_num = conv['session_number']
            summary = conv['summary']
            
            # Add session number for clarity
            context_parts.append(f"Session {session_num}: {summary}")
        
        combined = "\n\n".join(context_parts)
        
        # If context is too long, truncate it
        max_length = 2000  # Reasonable limit for ElevenLabs
        if len(combined) > max_length:
            print(f"⚠️ Context too long ({len(combined)} chars), truncating to {max_length} chars")
            combined = combined[:max_length] + "..."
        
        return combined

    def get_resume_prompt_context(self, user_id: str) -> Optional[str]:
        """Get formatted context for ElevenLabs resume prompt"""
        context_data = self.get_previous_conversation_context(user_id)
        
        if not context_data:
            return None
        
        context = context_data['context']
        session_count = context_data['session_count']
        
        return f"""Previous Sessions ({session_count} total):

{context}

IMPORTANT: You are resuming a college counseling conversation. Use the context above to understand what has been discussed. Do not ask the student to repeat information already covered. Instead, acknowledge the previous discussion and continue from where you left off."""

# Test function
def test_conversation_resume_agent():
    """Test the conversation resume agent"""
    try:
        agent = ConversationResumeAgent()
        
        # Test with a specific user ID
        user_id = "test-user-id"  # Replace with actual user ID
        
        print("🧪 Testing Conversation Resume Agent...")
        
        context = agent.get_resume_prompt_context(user_id)
        
        if context:
            print("✅ Successfully generated resume context:")
            print(context)
        else:
            print("❌ No context generated")
            
    except Exception as e:
        print(f"❌ Error testing agent: {e}")

if __name__ == "__main__":
    test_conversation_resume_agent() 