import json
import os
from typing import Dict, List, Optional
from supabase_client import SupabaseClient

class DeadlineSyncService:
    def __init__(self):
        """Initialize the deadline sync service"""
        self.supabase_client = SupabaseClient()
        self.deadlines_file_path = os.path.join(
            os.path.dirname(__file__), 
            'deadline_tracker', 
            'deadlines_2026.json'
        )
    
    def load_deadlines_data(self) -> List[Dict]:
        """Load deadlines data from the JSON file"""
        try:
            with open(self.deadlines_file_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading deadlines data: {e}")
            return []
    
    def normalize_school_name(self, school_name: str) -> str:
        """Normalize school names for better matching"""
        # Remove common suffixes and normalize
        name = school_name.strip()
        name = name.replace("University", "").replace("College", "").replace("Institute", "")
        name = name.replace("(MIT)", "").replace("(Caltech)", "")
        name = name.strip()
        return name.lower()
    
    def find_matching_school(self, deadline_school: str, school_recommendations: List[Dict]) -> Optional[Dict]:
        """Find a matching school in the recommendations by name"""
        normalized_deadline_name = self.normalize_school_name(deadline_school)
        
        for school in school_recommendations:
            normalized_rec_name = self.normalize_school_name(school.get('school', ''))
            if normalized_deadline_name == normalized_rec_name:
                return school
        
        return None
    
    def sync_deadlines_for_student(self, student_id: str) -> Dict:
        """Sync deadlines for a specific student's school recommendations"""
        try:
            # Get the student's school recommendations
            school_recommendations = self.supabase_client.get_school_recommendations(student_id)
            if not school_recommendations:
                return {
                    "success": False,
                    "message": "No school recommendations found for this student",
                    "schools_updated": 0
                }
            
            # Load deadlines data
            deadlines_data = self.load_deadlines_data()
            if not deadlines_data:
                return {
                    "success": False,
                    "message": "No deadlines data found",
                    "schools_updated": 0
                }
            
            schools_updated = 0
            update_errors = []
            
            # Process each school recommendation
            for school_rec in school_recommendations:
                school_name = school_rec.get('school', '')
                matching_deadline = None
                
                # Find matching deadline data
                for deadline_entry in deadlines_data:
                    if deadline_entry.get('School', '') == school_name:
                        matching_deadline = deadline_entry
                        break
                
                if matching_deadline:
                    # Update the school recommendation with deadline data
                    update_data = {
                        'early_action_deadline': matching_deadline.get('Early Action', 'N/A'),
                        'early_decision_1_deadline': matching_deadline.get('Early Decision 1', 'N/A'),
                        'early_decision_2_deadline': matching_deadline.get('Early Decision 2', 'N/A'),
                        'regular_decision_deadline': matching_deadline.get('Regular Decision', 'N/A')
                    }
                    
                    # Update in database
                    try:
                        response = self.supabase_client.supabase.table('school_recommendations') \
                            .update(update_data) \
                            .eq('id', school_rec['id']) \
                            .execute()
                        
                        if response.data:
                            schools_updated += 1
                            print(f"Updated deadlines for {school_name}")
                        else:
                            update_errors.append(f"Failed to update {school_name}")
                    
                    except Exception as e:
                        update_errors.append(f"Error updating {school_name}: {str(e)}")
                else:
                    print(f"No deadline data found for {school_name}")
            
            return {
                "success": True,
                "message": f"Successfully synced deadlines for {schools_updated} schools",
                "schools_updated": schools_updated,
                "errors": update_errors
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error syncing deadlines: {str(e)}",
                "schools_updated": 0
            }
    
    def sync_all_deadlines(self) -> Dict:
        """Sync deadlines for all students (admin function)"""
        try:
            # Get all school recommendations
            response = self.supabase_client.supabase.table('school_recommendations') \
                .select('*') \
                .execute()
            
            if not response.data:
                return {
                    "success": False,
                    "message": "No school recommendations found in database",
                    "total_schools": 0,
                    "schools_updated": 0
                }
            
            # Group by student
            students = {}
            for rec in response.data:
                student_id = rec['student_id']
                if student_id not in students:
                    students[student_id] = []
                students[student_id].append(rec)
            
            total_schools = len(response.data)
            total_updated = 0
            student_results = {}
            
            # Process each student
            for student_id, school_recs in students.items():
                result = self.sync_deadlines_for_student(student_id)
                student_results[student_id] = result
                if result['success']:
                    total_updated += result['schools_updated']
            
            return {
                "success": True,
                "message": f"Synced deadlines for {len(students)} students",
                "total_schools": total_schools,
                "schools_updated": total_updated,
                "student_results": student_results
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error syncing all deadlines: {str(e)}",
                "total_schools": 0,
                "schools_updated": 0
            }
    
    def get_deadline_summary(self, student_id: str) -> Dict:
        """Get a summary of deadlines for a student"""
        try:
            school_recommendations = self.supabase_client.get_school_recommendations(student_id)
            
            deadline_summary = {
                "upcoming_deadlines": [],
                "recent_deadlines": [],
                "schools_with_deadlines": 0,
                "total_schools": len(school_recommendations)
            }
            
            for school in school_recommendations:
                if any([
                    school.get('early_action_deadline'),
                    school.get('early_decision_1_deadline'),
                    school.get('early_decision_2_deadline'),
                    school.get('regular_decision_deadline')
                ]):
                    deadline_summary["schools_with_deadlines"] += 1
                    
                    # Add to summary (you can expand this with date parsing logic)
                    deadline_summary["upcoming_deadlines"].append({
                        "school": school.get('school'),
                        "deadlines": {
                            "early_action": school.get('early_action_deadline'),
                            "early_decision_1": school.get('early_decision_1_deadline'),
                            "early_decision_2": school.get('early_decision_2_deadline'),
                            "regular_decision": school.get('regular_decision_deadline')
                        }
                    })
            
            return deadline_summary
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error getting deadline summary: {str(e)}"
            } 