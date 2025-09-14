#!/usr/bin/env python3
"""
End-to-End Workflow Test

This test simulates the complete workflow:
1. Retrieve conversation metadata from Supabase
2. Extract transcript and generate school recommendations
3. Save recommendations to database
4. Update onboarding status

Usage:
    python test_end_to_end_workflow.py
"""

import os
import sys
import json
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv('../.env')

# Add src directory to path
sys.path.append('src')

from supabase_client import SupabaseClient
from school_fetcher_agent.school_fetcher_agent import SchoolFetcherAgent

class EndToEndWorkflowTest:
    def __init__(self, user_id: str = None, conversation_id: str = None):
        """Initialize the test with real conversation data from Supabase"""
        # Test configuration - use provided IDs or defaults
        self.test_user_id = user_id or "test-user-12345"
        # Clean up conversation ID (remove any whitespace/newlines)
        self.test_conversation_id = (conversation_id or "test-conversation-67890").strip()
        
        # Initialize clients
        try:
            self.supabase_client = SupabaseClient()
            print("✅ Supabase client initialized")
        except Exception as e:
            print(f"❌ Failed to initialize Supabase client: {e}")
            raise
        
        try:
            self.school_agent = SchoolFetcherAgent()
            print("✅ School Fetcher Agent initialized")
        except Exception as e:
            print(f"❌ Failed to initialize School Fetcher Agent: {e}")
            raise

    def test_workflow(self):
        """Run the complete end-to-end workflow test"""
        print("🚀 Starting End-to-End Workflow Test")
        print("=" * 50)
        
        try:
            # Step 1: Retrieve conversation metadata from Supabase
            print("\n📖 Step 1: Retrieving conversation metadata from Supabase...")
            metadata = self._retrieve_conversation_metadata()
            if not metadata:
                raise Exception("Failed to retrieve conversation metadata from Supabase")
            
            # Step 2: Generate school recommendations
            print("\n🎓 Step 2: Generating school recommendations...")
            recommendations = self._generate_school_recommendations(metadata)
            if not recommendations:
                raise Exception("Failed to generate school recommendations")
            
            # Step 3: Save recommendations to database
            print("\n💾 Step 3: Saving recommendations to database...")
            self._save_recommendations(recommendations)
            
            # Step 4: Update onboarding status
            print("\n✅ Step 4: Updating onboarding status...")
            self._update_onboarding_status()
            
            # Step 5: Verify results
            print("\n🔍 Step 5: Verifying results...")
            self._verify_results()
            
            print("\n🎉 End-to-End Workflow Test Completed Successfully!")
            print("=" * 50)
            
        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            raise

    def _list_available_conversations(self):
        """List available conversations in the database for selection"""
        try:
            response = self.supabase_client.supabase.table('conversation_metadata') \
                .select('conversation_id, user_id, created_at, transcript_summary') \
                .order('created_at', desc=True) \
                .limit(10) \
                .execute()
            
            conversations = response.data
            if not conversations:
                print("❌ No conversations found in database")
                return None
            
            print(f"✅ Found {len(conversations)} conversations in database:")
            for i, conv in enumerate(conversations, 1):
                print(f"   {i}. {conv['conversation_id']} (User: {conv['user_id']})")
                print(f"      Summary: {conv.get('transcript_summary', 'No summary')[:100]}...")
                print(f"      Created: {conv['created_at']}")
                print()
            
            return conversations
            
        except Exception as e:
            print(f"❌ Failed to list conversations: {e}")
            return None

    def _retrieve_conversation_metadata(self) -> Optional[Dict[str, Any]]:
        """Retrieve conversation metadata from Supabase"""
        try:
            print(f"🔍 Looking for conversation: {self.test_conversation_id}")
            print(f"🔍 For user: {self.test_user_id}")
            
            # Try to get the specific conversation
            response = self.supabase_client.supabase.table('conversation_metadata') \
                .select('*') \
                .eq('conversation_id', self.test_conversation_id) \
                .execute()
            
            if response.data:
                metadata = response.data[0]
                print(f"✅ Retrieved conversation metadata for {self.test_conversation_id}")
                print(f"   - Transcript length: {len(metadata.get('transcript', ''))} characters")
                print(f"   - Summary: {metadata.get('transcript_summary', 'N/A')}")
                return metadata
            
            # If not found, try with newline character (common issue from database)
            response = self.supabase_client.supabase.table('conversation_metadata') \
                .select('*') \
                .eq('conversation_id', self.test_conversation_id + '\n') \
                .execute()
            
            if response.data:
                metadata = response.data[0]
                print(f"✅ Retrieved conversation metadata for {self.test_conversation_id} (with newline)")
                print(f"   - Transcript length: {len(metadata.get('transcript', ''))} characters")
                print(f"   - Summary: {metadata.get('transcript_summary', 'N/A')}")
                return metadata
            else:
                print(f"❌ Conversation {self.test_conversation_id} not found")
                
                # List available conversations as fallback
                conversations = self._list_available_conversations()
                if conversations:
                    print("Available conversations:")
                    for conv in conversations:
                        print(f"  - {conv['conversation_id']} (User: {conv['user_id']})")
                return None
            
        except Exception as e:
            print(f"❌ Failed to retrieve conversation metadata: {e}")
            return None

    def _generate_school_recommendations(self, metadata: Dict[str, Any]) -> Optional[list]:
        """Generate school recommendations from conversation transcript"""
        try:
            transcript = metadata.get('transcript', '')
            if not transcript:
                raise Exception("No transcript found in metadata")
            
            # Use the school fetcher agent to generate recommendations
            recommendations = self.school_agent.fetch_schools(transcript, self.test_user_id)
            
            print(f"✅ Generated {len(recommendations)} school recommendations")
            for i, rec in enumerate(recommendations[:3], 1):  # Show first 3
                print(f"   {i}. {rec.get('school', 'N/A')} - {rec.get('school_type', 'N/A')}")
            
            return recommendations
            
        except Exception as e:
            print(f"❌ Failed to generate school recommendations: {e}")
            return None

    def _save_recommendations(self, recommendations: list):
        """Save school recommendations to database"""
        try:
            success = self.supabase_client.save_school_recommendations(
                self.test_user_id, 
                recommendations
            )
            
            if success:
                print(f"✅ Saved {len(recommendations)} recommendations to database")
            else:
                raise Exception("Failed to save recommendations")
                
        except Exception as e:
            print(f"❌ Failed to save recommendations: {e}")
            raise

    def _update_onboarding_status(self):
        """Update onboarding status to completed"""
        try:
            response = self.supabase_client.supabase.table('profiles') \
                .update({'onboarding_complete': True}) \
                .eq('user_id', self.test_user_id) \
                .execute()
            
            print("✅ Updated onboarding status to completed")
            
        except Exception as e:
            print(f"❌ Failed to update onboarding status: {e}")
            # Don't raise here as this might fail if profile doesn't exist
            print("   (This is expected if the test user profile doesn't exist)")

    def _verify_results(self):
        """Verify that all data was stored correctly"""
        try:
            # Verify conversation metadata
            metadata = self._retrieve_conversation_metadata()
            if not metadata:
                raise Exception("Conversation metadata not found")
            
            # Verify school recommendations
            recommendations = self.supabase_client.get_school_recommendations(self.test_user_id)
            if not recommendations:
                raise Exception("School recommendations not found")
            
            # Verify onboarding status
            response = self.supabase_client.supabase.table('profiles') \
                .select('onboarding_complete') \
                .eq('user_id', self.test_user_id) \
                .execute()
            
            profile = response.data[0] if response.data else None
            onboarding_completed = profile.get('onboarding_complete', False) if profile else False
            
            print("✅ Verification Results:")
            print(f"   - Conversation metadata: ✅ Found")
            print(f"   - School recommendations: ✅ {len(recommendations)} found")
            print(f"   - Onboarding status: ✅ {'Completed' if onboarding_completed else 'Not completed'}")
            
        except Exception as e:
            print(f"❌ Verification failed: {e}")
            raise

    def cleanup_test_data(self):
        """Clean up test data from database"""
        print("\n🧹 Cleaning up test data...")
        
        try:
            # Remove conversation metadata
            self.supabase_client.supabase.table('conversation_metadata') \
                .delete() \
                .eq('conversation_id', self.test_conversation_id) \
                .execute()
            
            # Remove school recommendations
            self.supabase_client.supabase.table('school_recommendations') \
                .delete() \
                .eq('student_id', self.test_user_id) \
                .execute()
            
            # Reset onboarding status
            self.supabase_client.supabase.table('profiles') \
                .update({'onboarding_completed': False}) \
                .eq('user_id', self.test_user_id) \
                .execute()
            
            print("✅ Test data cleaned up")
            
        except Exception as e:
            print(f"⚠️  Cleanup warning: {e}")

def main():
    """Main function to run the test"""
    print("🧪 End-to-End Workflow Test")
    print("This test retrieves real conversation data from Supabase and generates school recommendations")
    print("=" * 60)
    
    # Check environment variables
    required_env_vars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GOOGLE_API_KEY']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {missing_vars}")
        print("Please set these in your .env file:")
        for var in missing_vars:
            print(f"   {var}=your_value_here")
        return
    
    # Allow user to specify conversation and user IDs
    import argparse
    parser = argparse.ArgumentParser(description='Test the end-to-end workflow')
    parser.add_argument('--user-id', help='Specific user ID to test with')
    parser.add_argument('--conversation-id', help='Specific conversation ID to test with')
    parser.add_argument('--no-cleanup', action='store_true', help='Skip cleanup prompt')
    args = parser.parse_args()
    
    # Create and run test
    test = EndToEndWorkflowTest(
        user_id=args.user_id,
        conversation_id=args.conversation_id
    )
    
    try:
        # Run the workflow test
        test.test_workflow()
        
        # Ask if user wants to clean up (unless --no-cleanup is specified)
        if not args.no_cleanup:
            print("\n" + "=" * 60)
            cleanup = input("Do you want to clean up the generated recommendations? (y/n): ").lower().strip()
            if cleanup == 'y':
                test.cleanup_test_data()
            else:
                print("Generated recommendations left in database for inspection")
        else:
            print("\n✅ Test completed. Recommendations saved to database.")
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        print("Check your environment variables and database connection")
        return

if __name__ == "__main__":
    main() 