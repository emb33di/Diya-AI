import os
from supabase import create_client, Client
from typing import Optional, Dict, Any

class SupabaseClient:
    def __init__(self):
        """Initialize Supabase client with environment variables"""
        supabase_url = os.getenv('SUPABASE_URL')
        # Use service role key for backend operations to bypass RLS
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
    

    
    def save_school_recommendations(self, student_id: str, recommendations: list) -> bool:
        """
        Save school recommendations to the school_recommendations table with automatic deadline population
        Overwrites any existing recommendations for the student
        
        Args:
            student_id (str): The student's user ID
            recommendations (list): List of school recommendation dictionaries
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # First, delete any existing recommendations for this student
            print(f"Deleting existing recommendations for student {student_id}...")
            delete_response = self.supabase.table('school_recommendations') \
                .delete() \
                .eq('student_id', student_id) \
                .execute()
            
            print(f"Deleted {len(delete_response.data) if delete_response.data else 0} existing recommendations")
            
            # Load deadlines data for automatic population
            deadlines_data = self._load_deadlines_data()
            
            # Prepare data for insertion with automatic deadline population
            data_to_insert = []
            for rec in recommendations:
                school_name = rec.get('school', '')
                
                # Find matching deadline data
                deadline_info = self._find_school_deadline(school_name, deadlines_data)
                
                data_to_insert.append({
                    'student_id': student_id,
                    'school': school_name,
                    'school_type': rec.get('school_type', ''),
                    'school_ranking': rec.get('school_ranking', ''),
                    'acceptance_rate': rec.get('acceptance_rate', ''),
                    'ed_deadline': rec.get('ed_deadline', ''),
                    'first_round_deadline': rec.get('first_round_deadline', ''),
                    'notes': rec.get('notes', ''),
                    'student_thesis': rec.get('student_thesis', ''),
                    'category': rec.get('category', ''),
                    # Automatically populate deadline fields
                    'early_action_deadline': deadline_info.get('early_action_deadline'),
                    'early_decision_1_deadline': deadline_info.get('early_decision_1_deadline'),
                    'early_decision_2_deadline': deadline_info.get('early_decision_2_deadline'),
                    'regular_decision_deadline': deadline_info.get('regular_decision_deadline'),
                    'application_status': 'not_started'
                })
            
            # Insert new recommendations into database
            response = self.supabase.table('school_recommendations') \
                .insert(data_to_insert) \
                .execute()
            
            print(f"Successfully saved {len(recommendations)} new school recommendations with deadlines to database")
            return True
            
        except Exception as e:
            print(f"Error saving school recommendations: {e}")
            return False
    
    def _load_deadlines_data(self) -> list:
        """Load deadlines data from JSON file"""
        try:
            import json
            deadlines_file_path = os.path.join(os.path.dirname(__file__), 'deadline_tracker', 'deadlines_2026.json')
            with open(deadlines_file_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load deadlines data: {e}")
            return []
    
    def _find_school_deadline(self, school_name: str, deadlines_data: list) -> dict:
        """Find deadline information for a specific school"""
        for deadline in deadlines_data:
            if deadline.get('School') == school_name:
                return self._parse_deadlines(deadline)
        return {}
    
    def _parse_deadlines(self, deadline_info: dict) -> dict:
        """Parse deadline strings into proper format"""
        def parse_deadline(deadline_str: str) -> str:
            if deadline_str == 'N/A' or not deadline_str:
                return None
            # Extract the date part (handle cases like "November 1 (restricted early action)")
            import re
            date_match = re.search(r'(\w+)\s+(\d+)', deadline_str)
            if not date_match:
                return None
            
            month = date_match.group(1)
            day = date_match.group(2)
            current_year = 2025  # Use 2025 as the base year for deadlines
            
            return f"{month} {day}, {current_year}"
        
        return {
            'early_action_deadline': parse_deadline(deadline_info.get("Early Action", "")),
            'early_decision_1_deadline': parse_deadline(deadline_info.get("Early Decision 1", "")),
            'early_decision_2_deadline': parse_deadline(deadline_info.get("Early Decision 2", "")),
            'regular_decision_deadline': parse_deadline(deadline_info.get("Regular Decision", ""))
        }
    
    def get_school_recommendations(self, student_id: str) -> list:
        """
        Retrieve school recommendations for a student
        
        Args:
            student_id (str): The student's user ID
            
        Returns:
            list: List of school recommendations
        """
        try:
            response = self.supabase.table('school_recommendations') \
                .select('*') \
                .eq('student_id', student_id) \
                .order('created_at', desc=True) \
                .execute()
            
            return response.data if response.data else []
            
        except Exception as e:
            print(f"Error retrieving school recommendations: {e}")
            return [] 