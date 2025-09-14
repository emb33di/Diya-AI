##TODO: Add top 4 majors to school list and rank based on those

import json
import google.generativeai as genai
from typing import List, Dict, Any, Optional
import os
import sys

# Add the src directory to the path to import supabase_client
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from supabase_client import SupabaseClient

class SchoolFetcherAgent:
    def __init__(self, api_key=None):
        """Initialize the SchoolFetcherAgent with Gemini API, school database, and Supabase client"""
        if api_key is None:
            api_key = os.getenv('GOOGLE_API_KEY')
        
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Initialize Supabase client
        try:
            self.supabase_client = SupabaseClient()
            print("Successfully initialized Supabase client")
        except Exception as e:
            print(f"Warning: Could not initialize Supabase client: {e}")
            self.supabase_client = None
        
        # Load the school database
        self.schools_database = self._load_schools_database()
        
        # Load the prompt template
        try:
            with open('src/school_fetcher_agent/prompts/school_fetcher_agent_prompt.txt', 'r') as f:
                self.prompt_template = f.read()
        except FileNotFoundError:
            # Fallback prompt if file not found
            self.prompt_template = """You are an expert college admissions counselor. Analyze this conversation and provide EXACTLY 10 school recommendations from the provided school database.

IMPORTANT: You must provide EXACTLY 10 schools with this specific distribution:
- 5 TARGET schools (moderate difficulty, good fit)
- 2 REACH schools (more challenging, aspirational)
- 3 SAFETY schools (easier to get into, backup options)

Available schools data:
{schools_data}

Based on the conversation transcript, identify the best matches from the school database and provide recommendations in JSON format.

Conversation Transcript:
{transcript}

Provide EXACTLY 10 schools in this JSON format:
{{
  "school_name": "Exact school name from database",
  "school_type": "public/private/liberal_arts/research_university",
  "school_ranking": "ranking from database",
  "acceptance_rate": "percentage from database",
  "ed_deadline": "YYYY-MM-DD or N/A",
  "first_round_deadline": "YYYY-MM-DD",
  "notes": "why this school matches",
  "student_thesis": "why student fits this school",
  "category": "target/reach/safety"
}}

Ensure you provide exactly 5 target, 2 reach, and 3 safety schools."""
    
    def _load_schools_database(self) -> List[Dict[str, Any]]:
        """Load the schools database from JSON file"""
        try:
            # Try multiple possible paths for schools.json
            possible_paths = [
                'schools.json',  # Current directory
                'src/school_fetcher_agent/schools.json',  # From backend root
                '../schools.json',  # From src directory
                '../../src/school_fetcher_agent/schools.json'  # From backend root
            ]
            
            for path in possible_paths:
                try:
                    with open(path, 'r') as f:
                        data = json.load(f)
                        print(f"Successfully loaded schools database from: {path}")
                        return data.get('schools', [])
                except FileNotFoundError:
                    continue
            
            print("Warning: schools.json not found in any expected location. Using empty database.")
            return []
        except json.JSONDecodeError as e:
            print(f"Error loading schools database: {e}")
            return []
    
    def _prepare_schools_data_for_prompt(self) -> str:
        """Prepare a condensed version of schools data for the AI prompt"""
        schools_summary = []
        
        # Use all available schools since there are only 99
        for school in self.schools_database:
            summary = {
                "name": school["name"],
                "ranking": school["ranking"],
                "city": school["city"],
                "state": school["state"],
                "climate": school["climate"],
                "tier": school["tier"],
                "acceptance_rate": school["acceptance_rate"],
                "sat_range": school["sat_range"],
                "act_range": school["act_range"],
                "annual_tuition_usd": school["annual_tuition_usd"],
                "total_estimated_cost_usd": school["total_estimated_cost_usd"],
                "average_scholarship_usd": school["average_scholarship_usd"],
                "percent_international_aid": school["percent_international_aid"],
                "need_blind_for_internationals": school["need_blind_for_internationals"]
            }
            schools_summary.append(summary)
        
        return json.dumps(schools_summary, indent=2)
    
    def _categorize_schools(self, schools: List[Dict[str, Any]], student_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Categorize schools as reach, target, or safety based on acceptance rates and student profile"""
        categorized_schools = []
        
        for school in schools:
            # Extract acceptance rate as float
            acceptance_rate_str = school.get('acceptance_rate', '0%')
            acceptance_rate = float(acceptance_rate_str.replace('%', ''))
            
            # Get student's SAT score
            student_sat = student_profile.get('sat_score', 0)
            
            # Get school's SAT range
            sat_range = school.get('sat_range', '0-0')
            try:
                sat_min, sat_max = map(int, sat_range.split('-'))
            except:
                sat_min, sat_max = 0, 0
            
            # Categorize based on acceptance rate and SAT scores
            if acceptance_rate < 15 or (student_sat < sat_min):
                category = "reach"
            elif acceptance_rate > 40 or (student_sat > sat_max + 50):
                category = "safety"
            else:
                category = "target"
            
            # Add category to school data
            school['category'] = category
            categorized_schools.append(school)
        
        return categorized_schools

    def _ensure_proper_distribution(self, schools: List[Dict[str, Any]], student_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Ensure exactly 10 schools with proper distribution: 5 target, 2 reach, 3 safety
        """
        # First, categorize any schools that don't have categories
        for school in schools:
            if 'category' not in school:
                # Extract acceptance rate as float
                acceptance_rate_str = school.get('acceptance_rate', '0%')
                acceptance_rate = float(acceptance_rate_str.replace('%', ''))
                
                # Get student's SAT score
                student_sat = student_profile.get('sat_score', 0)
                
                # Get school's SAT range
                sat_range = school.get('sat_range', '0-0')
                try:
                    sat_min, sat_max = map(int, sat_range.split('-'))
                except:
                    sat_min, sat_max = 0, 0
                
                # Categorize based on acceptance rate and SAT scores
                if acceptance_rate < 15 or (student_sat < sat_min):
                    school['category'] = "reach"
                elif acceptance_rate > 40 or (student_sat > sat_max + 50):
                    school['category'] = "safety"
                else:
                    school['category'] = "target"
        
        # Separate schools by category
        reach_schools = [s for s in schools if s.get('category') == 'reach']
        target_schools = [s for s in schools if s.get('category') == 'target']
        safety_schools = [s for s in schools if s.get('category') == 'safety']
        
        # If we don't have enough schools, try to generate more
        if len(schools) < 10:
            print(f"Warning: Only {len(schools)} schools found, trying to generate more...")
            # This could trigger another AI call to generate more schools
            # For now, we'll work with what we have
        
        # Ensure proper distribution (5 target, 2 reach, 3 safety)
        final_schools = []
        
        # Add target schools (up to 5)
        final_schools.extend(target_schools[:5])
        
        # Add reach schools (up to 2)
        final_schools.extend(reach_schools[:2])
        
        # Add safety schools (up to 3)
        final_schools.extend(safety_schools[:3])
        
        # If we still don't have 10, fill with remaining schools
        remaining_slots = 10 - len(final_schools)
        if remaining_slots > 0:
            remaining_schools = [s for s in schools if s not in final_schools]
            final_schools.extend(remaining_schools[:remaining_slots])
        
        # If we have more than 10, trim to exactly 10
        if len(final_schools) > 10:
            final_schools = final_schools[:10]
        
        # Ensure we have exactly 10 schools
        if len(final_schools) < 10:
            print(f"Warning: Only {len(final_schools)} schools available, less than requested 10")
        
        # Count categories for verification
        target_count = len([s for s in final_schools if s.get('category') == 'target'])
        reach_count = len([s for s in final_schools if s.get('category') == 'reach'])
        safety_count = len([s for s in final_schools if s.get('category') == 'safety'])
        
        print(f"Final distribution: {target_count} target, {reach_count} reach, {safety_count} safety schools")
        
        return final_schools

    def fetch_schools_from_conversation(self, conversation_id: str, student_id: str) -> List[Dict[str, Any]]:
        """
        Fetch school recommendations using conversation ID from Supabase.
        
        Args:
            conversation_id (str): The conversation ID to look up in Supabase
            student_id (str): Unique identifier for the student
            
        Returns:
            List[Dict[str, Any]]: List of school recommendations with all required fields
        """
        if not self.supabase_client:
            raise ValueError("Supabase client not initialized")
        
        # Get transcript from Supabase
        transcript = self.supabase_client.get_conversation_transcript(conversation_id)
        
        if not transcript:
            raise ValueError(f"No transcript found for conversation ID: {conversation_id}")
        
        print(f"Retrieved transcript from conversation {conversation_id}")
        
        # Process the transcript and get recommendations
        recommendations = self.fetch_schools(transcript, student_id)
        
        # Save recommendations to Supabase
        if recommendations:
            self.supabase_client.save_school_recommendations(student_id, recommendations)
        
        return recommendations

    def fetch_schools(self, transcript: str, student_id: str) -> List[Dict[str, Any]]:
        """
        Analyze a student-counselor conversation transcript and return relevant school recommendations.
        
        Args:
            transcript (str): The conversation transcript between student and counselor
            student_id (str): Unique identifier for the student
            
        Returns:
            List[Dict[str, Any]]: List of school recommendations with all required fields
        """
        try:
            # Extract student profile from transcript
            student_profile = self._extract_student_profile(transcript)
            
            # Prepare the schools data for the prompt
            schools_data = self._prepare_schools_data_for_prompt()
            
            # Prepare the prompt with the transcript and schools data
            prompt = self.prompt_template.format(
                transcript=transcript,
                schools_data=schools_data
            )
            
            # Generate response from Gemini
            response = self.model.generate_content(prompt)
            
            # Parse the JSON response
            response_text = response.text
            
            # Extract JSON from the response
            try:
                # Try to find JSON in the response
                start_idx = response_text.find('[')
                end_idx = response_text.rfind(']') + 1
                
                if start_idx != -1 and end_idx != 0:
                    json_str = response_text[start_idx:end_idx]
                    ai_recommendations = json.loads(json_str)
                else:
                    # If no array found, try to find individual school objects
                    ai_recommendations = self._extract_schools_from_text(response_text)
                
                # Match AI recommendations with actual school data
                validated_schools = []
                for ai_rec in ai_recommendations:
                    matched_school = self._match_school_with_database(ai_rec)
                    if matched_school:
                        matched_school['student_id'] = student_id
                        # Use the category from AI if provided, otherwise categorize
                        if 'category' in ai_rec:
                            matched_school['category'] = ai_rec['category']
                        validated_schools.append(matched_school)
                
                # Ensure we have exactly 10 schools with proper distribution
                final_schools = self._ensure_proper_distribution(validated_schools, student_profile)
                
                return final_schools
                
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON response: {e}")
                print(f"Response text: {response_text}")
                # Try to extract schools from malformed JSON
                ai_recommendations = self._extract_schools_from_text(response_text)
                validated_schools = []
                for ai_rec in ai_recommendations:
                    matched_school = self._match_school_with_database(ai_rec)
                    if matched_school:
                        matched_school['student_id'] = student_id
                        # Use the category from AI if provided, otherwise categorize
                        if 'category' in ai_rec:
                            matched_school['category'] = ai_rec['category']
                        validated_schools.append(matched_school)
                
                # Ensure we have exactly 10 schools with proper distribution
                final_schools = self._ensure_proper_distribution(validated_schools, student_profile)
                
                return final_schools
                
        except Exception as e:
            print(f"Error in fetch_schools: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _extract_student_profile(self, transcript: str) -> Dict[str, Any]:
        """Extract student profile information from transcript"""
        profile = {
            'gpa': 0,
            'sat_score': 0,
            'act_score': 0,
            'interests': [],
            'preferences': {}
        }
        
        # Simple extraction - in a real system, this would be more sophisticated
        lines = transcript.lower().split('\n')
        for line in lines:
            if 'gpa' in line:
                # Extract GPA
                import re
                gpa_match = re.search(r'(\d+\.\d+)', line)
                if gpa_match:
                    profile['gpa'] = float(gpa_match.group(1))
            
            if 'sat' in line:
                # Extract SAT score
                import re
                sat_match = re.search(r'(\d{3,4})', line)
                if sat_match:
                    profile['sat_score'] = int(sat_match.group(1))
        
        return profile
    
    def _match_school_with_database(self, ai_recommendation: Dict[str, Any]) -> Dict[str, Any]:
        """Match AI recommendation with actual school data from database"""
        school_name = ai_recommendation.get('school', '').strip()
        
        # Find exact match first
        for school in self.schools_database:
            if school['name'].lower() == school_name.lower():
                return self._create_validated_school(school, ai_recommendation)
        
        # Try partial matching
        for school in self.schools_database:
            if school_name.lower() in school['name'].lower() or school['name'].lower() in school_name.lower():
                return self._create_validated_school(school, ai_recommendation)
        
        # If no match found, return None
        print(f"Warning: Could not match school '{school_name}' with database")
        return None
    
    def _create_validated_school(self, db_school: Dict[str, Any], ai_rec: Dict[str, Any]) -> Dict[str, Any]:
        """Create a validated school recommendation using database data and AI insights"""
        return {
            'school': db_school['name'],
            'school_type': self._determine_school_type(db_school),
            'school_ranking': str(db_school['ranking']),
            'acceptance_rate': db_school['acceptance_rate'],
            'ed_deadline': ai_rec.get('ed_deadline', 'N/A'),
            'first_round_deadline': ai_rec.get('first_round_deadline', 'N/A'),
            'notes': ai_rec.get('notes', 'N/A'),
            'student_thesis': ai_rec.get('student_thesis', 'N/A'),
            # Additional database fields
            'city': db_school['city'],
            'state': db_school['state'],
            'climate': db_school['climate'],
            'tier': db_school['tier'],
            'sat_range': db_school['sat_range'],
            'act_range': db_school['act_range'],
            'annual_tuition_usd': db_school['annual_tuition_usd'],
            'total_estimated_cost_usd': db_school['total_estimated_cost_usd'],
            'average_scholarship_usd': db_school['average_scholarship_usd'],
            'percent_international_aid': db_school['percent_international_aid'],
            'need_blind_for_internationals': db_school['need_blind_for_internationals']
        }
    
    def _determine_school_type(self, school: Dict[str, Any]) -> str:
        """Determine school type based on tier and other characteristics"""
        tier = school.get('tier', '').lower()
        
        if 'ivy league' in tier:
            return 'private'
        elif 'public' in tier:
            return 'public'
        elif 'private' in tier:
            return 'private'
        else:
            return 'private'  # Default to private for most top schools
    
    def _extract_schools_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Extract school data from text when JSON parsing fails"""
        schools = []
        
        # Try to find JSON objects in the text
        import re
        
        # Pattern to match JSON objects
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.findall(json_pattern, text)
        
        for match in matches:
            try:
                school = json.loads(match)
                if 'school_name' in school:  # Updated to match new field name
                    schools.append(school)
            except json.JSONDecodeError:
                continue
        
        # If no JSON objects found, try to parse line by line
        if not schools:
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('{') and line.endswith('}'):
                    try:
                        school = json.loads(line)
                        if 'school_name' in school:
                            schools.append(school)
                    except json.JSONDecodeError:
                        continue
        
        return schools

# Example usage
if __name__ == "__main__":
    agent = SchoolFetcherAgent()
    
    # Example transcript
    sample_transcript = """
    Student: I'm interested in computer science and want to go to a school with good financial aid.
    I have a 3.8 GPA and 1400 SAT. I'm from California and prefer to stay on the West Coast.
    
    Counselor: What's your budget range and are you open to both public and private schools?
    
    Student: I'd like to keep costs under $30k per year after aid. I'm open to both types of schools.
    """
    
    schools = agent.fetch_schools(sample_transcript, "student_123")
    print("=" * 60)
    print(f"Found {len(schools)} school recommendations:")
    print("=" * 60)
    
    for i, school in enumerate(schools, 1):
        print(f"\n{i}. {school['school_name']}")
        print(f"   Type: {school['school_type']}")
        print(f"   Ranking: {school['school_ranking']}")
        print(f"   Acceptance Rate: {school['acceptance_rate']}")
        print(f"   Category: {school.get('category', 'N/A').upper()}")
        print(f"   Location: {school.get('city', 'N/A')}, {school.get('state', 'N/A')}")
        print(f"   Climate: {school.get('climate', 'N/A')}")
        print(f"   Notes: {school.get('notes', 'N/A')}")
        print(f"   Student Thesis: {school.get('student_thesis', 'N/A')}")
        print("-" * 40) 