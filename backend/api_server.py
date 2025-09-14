#!/usr/bin/env python3
"""
FastAPI server for the School Fetcher Agent
"""

import os
import sys
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Load environment variables
load_dotenv('.env')

# Add src directory to path
sys.path.append('src')

from src.school_fetcher_agent.school_fetcher_agent import SchoolFetcherAgent
from src.conversation_resume_agent import ConversationResumeAgent
# Deadline sync service removed - functionality will be reimplemented later

# Initialize FastAPI app
app = FastAPI(
    title="School Fetcher Agent API",
    description="API for generating school recommendations from conversation transcripts",
    version="1.0.0"
)

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080", "http://localhost:8081"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class RecommendationRequest(BaseModel):
    conversation_id: str
    user_id: str

class SchoolRecommendation(BaseModel):
    school: str
    school_type: str
    school_ranking: str
    acceptance_rate: str
    category: str
    notes: str
    student_thesis: str
    city: Optional[str] = None
    state: Optional[str] = None
    climate: Optional[str] = None

class RecommendationResponse(BaseModel):
    success: bool
    recommendations: List[SchoolRecommendation]
    message: str
    conversation_id: str
    user_id: str

class HealthResponse(BaseModel):
    status: str
    message: str
    supabase_connected: bool
    google_api_configured: bool

class ConversationResumeRequest(BaseModel):
    user_id: str

class BrainstormingRequest(BaseModel):
    conversation_id: str
    user_id: str

class BrainstormingSummary(BaseModel):
    key_themes: List[str]
    personal_stories: List[str]
    essay_angles: List[str]
    writing_prompts: List[str]
    structure_suggestions: List[str]

class BrainstormingResponse(BaseModel):
    success: bool
    summary: Optional[BrainstormingSummary] = None
    message: str
    conversation_id: str
    user_id: str

class DeadlineSyncRequest(BaseModel):
    user_id: str

class DeadlineSyncResponse(BaseModel):
    success: bool
    message: str
    conversation_id: str
    user_id: str
    schools_updated: int
    total_schools: int

# Initialize the school fetcher agent
try:
    agent = SchoolFetcherAgent()
    print("✅ School Fetcher Agent initialized successfully")
except Exception as e:
    print(f"❌ Error initializing School Fetcher Agent: {e}")
    agent = None

# Deadline sync service removed - functionality will be reimplemented later

@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    supabase_connected = agent is not None and agent.supabase_client is not None
    google_api_configured = os.getenv('GOOGLE_API_KEY') is not None
    
    return HealthResponse(
        status="healthy" if agent else "unhealthy",
        message="School Fetcher Agent API is running" if agent else "Agent not initialized",
        supabase_connected=supabase_connected,
        google_api_configured=google_api_configured
    )

@app.post("/api/recommendations", response_model=RecommendationResponse)
async def generate_recommendations(request: RecommendationRequest):
    """
    Generate school recommendations from a conversation transcript
    
    Args:
        request: Contains conversation_id and user_id
        
    Returns:
        List of school recommendations with detailed information
    """
    if not agent:
        raise HTTPException(status_code=500, detail="School Fetcher Agent not initialized")
    
    try:
        print(f"🎯 Generating recommendations for conversation: {request.conversation_id}")
        print(f"👤 User ID: {request.user_id}")
        
        # Generate recommendations using the agent
        recommendations = agent.fetch_schools_from_conversation(
            request.conversation_id, 
            request.user_id
        )
        
        if not recommendations:
            return RecommendationResponse(
                success=False,
                recommendations=[],
                message="No recommendations generated. Check if conversation exists and has a transcript.",
                conversation_id=request.conversation_id,
                user_id=request.user_id
            )
        
        # Convert to Pydantic models
        school_recommendations = []
        for rec in recommendations:
            school_recommendations.append(SchoolRecommendation(
                school=rec.get('school', ''),
                school_type=rec.get('school_type', ''),
                school_ranking=rec.get('school_ranking', ''),
                acceptance_rate=rec.get('acceptance_rate', ''),
                category=rec.get('category', ''),
                notes=rec.get('notes', ''),
                student_thesis=rec.get('student_thesis', ''),
                city=rec.get('city'),
                state=rec.get('state'),
                climate=rec.get('climate')
            ))
        
        print(f"✅ Generated {len(school_recommendations)} recommendations")
        
        return RecommendationResponse(
            success=True,
            recommendations=school_recommendations,
            message=f"Successfully generated {len(school_recommendations)} school recommendations",
            conversation_id=request.conversation_id,
            user_id=request.user_id
        )
        
    except ValueError as e:
        # Handle specific errors like missing transcript
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"❌ Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/recommendations/{user_id}", response_model=RecommendationResponse)
async def get_user_recommendations(user_id: str):
    """
    Retrieve existing school recommendations for a user
    
    Args:
        user_id: The user's ID
        
    Returns:
        List of previously generated recommendations
    """
    if not agent or not agent.supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        # Get recommendations from Supabase
        recommendations = agent.supabase_client.get_school_recommendations(user_id)
        
        if not recommendations:
            return RecommendationResponse(
                success=False,
                recommendations=[],
                message="No existing recommendations found for this user",
                conversation_id="",
                user_id=user_id
            )
        
        # Convert to Pydantic models
        school_recommendations = []
        for rec in recommendations:
            school_recommendations.append(SchoolRecommendation(
                school=rec.get('school', ''),
                school_type=rec.get('school_type', ''),
                school_ranking=rec.get('school_ranking', ''),
                acceptance_rate=rec.get('acceptance_rate', ''),
                category=rec.get('category', ''),
                notes=rec.get('notes', ''),
                student_thesis=rec.get('student_thesis', ''),
                city=rec.get('city'),
                state=rec.get('state'),
                climate=rec.get('climate')
            ))
        
        return RecommendationResponse(
            success=True,
            recommendations=school_recommendations,
            message=f"Retrieved {len(school_recommendations)} existing recommendations",
            conversation_id="",
            user_id=user_id
        )
        
    except Exception as e:
        print(f"❌ Error retrieving recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/conversations/{conversation_id}/transcript")
async def get_conversation_transcript(conversation_id: str):
    """
    Retrieve the transcript for a specific conversation
    
    Args:
        conversation_id: The conversation ID
        
    Returns:
        The conversation transcript
    """
    if not agent or not agent.supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        transcript = agent.supabase_client.get_conversation_transcript(conversation_id)
        
        if not transcript:
            raise HTTPException(status_code=404, detail=f"No transcript found for conversation: {conversation_id}")
        
        return {
            "conversation_id": conversation_id,
            "transcript": transcript,
            "transcript_length": len(transcript)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error retrieving transcript: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/conversation-resume-context")
async def get_conversation_resume_context(request: ConversationResumeRequest):
    """Get AI-generated context for resuming conversations"""
    try:
        print(f"🔍 Generating conversation resume context for user: {request.user_id}")
        
        # Initialize the conversation resume agent
        agent = ConversationResumeAgent()
        
        # Get the context
        context_data = agent.get_previous_conversation_context(request.user_id)
        
        if context_data:
            print(f"✅ Generated context for {context_data['session_count']} sessions")
            print(f"📊 Context data being sent to frontend:")
            print(f"   - Session count: {context_data['session_count']}")
            print(f"   - Context length: {len(context_data['context'])} characters")
            print(f"   - Context preview: {context_data['context'][:200]}...")
            return {
                "success": True,
                "context": context_data['context'],
                "session_count": context_data['session_count'],
                "conversations": context_data['conversations']
            }
        else:
            print("❌ No context generated")
            return {
                "success": False,
                "context": None,
                "session_count": 0,
                "message": "No previous conversations found"
            }
            
    except Exception as e:
        print(f"❌ Error generating conversation resume context: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/brainstorming", response_model=BrainstormingResponse)
async def generate_brainstorming_summary(request: BrainstormingRequest):
    """
    Generate a brainstorming summary for a conversation.
    
    Args:
        request: Contains conversation_id and user_id.
        
    Returns:
        A BrainstormingSummary object.
    """
    try:
        print(f"🧠 Generating brainstorming summary for conversation: {request.conversation_id}")
        print(f"👤 User ID: {request.user_id}")
        
        # Initialize the conversation resume agent
        conversation_agent = ConversationResumeAgent()
        
        # Generate brainstorming summary using the agent
        summary_data = conversation_agent.generate_brainstorming_summary(
            request.conversation_id,
            request.user_id
        )
        
        if not summary_data:
            return BrainstormingResponse(
                success=False,
                summary=None,
                message="No brainstorming summary generated. Check if conversation exists and has a transcript.",
                conversation_id=request.conversation_id,
                user_id=request.user_id
            )
        
        # Convert to Pydantic models
        summary = BrainstormingSummary(
            key_themes=summary_data.get('key_themes', []),
            personal_stories=summary_data.get('personal_stories', []),
            essay_angles=summary_data.get('essay_angles', []),
            writing_prompts=summary_data.get('writing_prompts', []),
            structure_suggestions=summary_data.get('structure_suggestions', [])
        )
        
        print(f"✅ Generated brainstorming summary with {len(summary.key_themes)} themes")
        
        return BrainstormingResponse(
            success=True,
            summary=summary,
            message=f"Successfully generated brainstorming summary with {len(summary.key_themes)} themes",
            conversation_id=request.conversation_id,
            user_id=request.user_id
        )
        
    except ValueError as e:
        # Handle specific errors like missing transcript
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"❌ Error generating brainstorming summary: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ============================================================================
# DEADLINE ENDPOINTS
# ============================================================================

@app.post("/api/deadlines/sync", response_model=DeadlineSyncResponse)
async def sync_deadlines_for_user(request: DeadlineSyncRequest):
    """Sync deadlines for a user's school list based on official deadlines data"""
    try:
        # Import supabase client
        from src.supabase_client import SupabaseClient
        supabase = SupabaseClient()
        
        # Load deadlines data from JSON file
        import json
        import os
        
        deadlines_file_path = os.path.join(os.path.dirname(__file__), 'src', 'deadline_tracker', 'deadlines_2026.json')
        
        if not os.path.exists(deadlines_file_path):
            raise HTTPException(status_code=500, detail="Deadlines data file not found")
        
        with open(deadlines_file_path, 'r') as f:
            deadlines_data = json.load(f)
        
        # Get user's school recommendations
        response = supabase.supabase.table('school_recommendations').select('*').eq('student_id', request.user_id).execute()
        
        # Check if response has data
        if not hasattr(response, 'data') or not response.data:
            raise HTTPException(status_code=500, detail="Database error: No data returned")
        
        user_schools = response.data
        schools_updated = 0
        
        # Helper function to parse deadline strings
        def parse_deadline(deadline_str: str) -> str:
            if deadline_str == 'N/A':
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
        
        # Update each school with deadline information
        for school_rec in user_schools:
            school_name = school_rec.get('school', '')
            
            # Find matching deadline data
            deadline_info = None
            for deadline in deadlines_data:
                if deadline['School'] == school_name:
                    deadline_info = deadline
                    break
            
            if deadline_info:
                # Parse deadlines using the correct field names from JSON
                early_action_deadline = parse_deadline(deadline_info["Early Action"])
                early_decision_1_deadline = parse_deadline(deadline_info["Early Decision 1"])
                early_decision_2_deadline = parse_deadline(deadline_info["Early Decision 2"])
                regular_decision_deadline = parse_deadline(deadline_info["Regular Decision"])
                
                # Update the school recommendation with deadline data
                from datetime import datetime
                update_response = supabase.supabase.table('school_recommendations').update({
                    'early_action_deadline': early_action_deadline,
                    'early_decision_1_deadline': early_decision_1_deadline,
                    'early_decision_2_deadline': early_decision_2_deadline,
                    'regular_decision_deadline': regular_decision_deadline,
                    'last_updated': datetime.now().isoformat()
                }).eq('id', school_rec['id']).execute()
                
                # Check if update was successful
                if hasattr(update_response, 'data') and update_response.data:
                    schools_updated += 1
        
        return DeadlineSyncResponse(
            success=True,
            message=f"Successfully synced deadlines for {schools_updated} out of {len(user_schools)} schools",
            conversation_id="",  # Not applicable for this endpoint
            user_id=request.user_id,
            schools_updated=schools_updated,
            total_schools=len(user_schools)
        )
        
    except Exception as e:
        print(f"Error syncing deadlines: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/deadlines/{user_id}")
async def get_user_deadlines(user_id: str):
    """Get user's deadlines with calculated urgency and progress"""
    try:
        # Import supabase client
        try:
            from src.supabase_client import SupabaseClient
        except ImportError:
            sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
            from supabase_client import SupabaseClient
        
        supabase = SupabaseClient()
        
        # Load deadlines data from JSON file for auto-population
        import json
        import os
        
        deadlines_file_path = os.path.join(os.path.dirname(__file__), 'src', 'deadline_tracker', 'deadlines_2026.json')
        
        # Try alternative path if the first one doesn't exist
        if not os.path.exists(deadlines_file_path):
            deadlines_file_path = os.path.join('backend', 'src', 'deadline_tracker', 'deadlines_2026.json')
        
        deadlines_data = []
        if os.path.exists(deadlines_file_path):
            with open(deadlines_file_path, 'r') as f:
                deadlines_data = json.load(f)
        
        # Helper function to parse deadline strings
        def parse_deadline(deadline_str: str) -> str:
            if deadline_str == 'N/A' or not deadline_str or deadline_str.strip() == '':
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
        
        # Get user's school recommendations with deadline data
        response = supabase.supabase.table('school_recommendations').select('*').eq('student_id', user_id).execute()
        
        # Check if response has data
        if not hasattr(response, 'data') or not response.data:
            return {
                "success": True,
                "deadlines": [],
                "total": 0
            }
        
        user_schools = response.data
        deadlines = []
        
        # Helper function to calculate days remaining
        def calculate_days_remaining(deadline_str: str) -> int:
            if not deadline_str:
                return None
            
            try:
                from datetime import datetime
                deadline_date = datetime.strptime(deadline_str, "%B %d, %Y")
                now = datetime.now()
                
                diff = deadline_date - now
                return diff.days
            except:
                return None
        
        # Helper function to determine urgency level
        def get_urgency_level(days_remaining: int) -> str:
            if days_remaining is None:
                return 'low'
            if days_remaining <= 7:
                return 'critical'
            if days_remaining <= 14:
                return 'high'
            if days_remaining <= 30:
                return 'medium'
            return 'low'
        
        # Process each school and auto-populate missing deadlines
        for school_rec in user_schools:
            # Check if deadlines are missing and auto-populate them
            if not school_rec.get('regular_decision_deadline') and deadlines_data:
                school_name = school_rec.get('school', '')
                
                # Find matching deadline data
                deadline_info = None
                for deadline in deadlines_data:
                    if deadline.get('School') == school_name:
                        deadline_info = deadline
                        break
                
                if deadline_info:
                    # Parse deadlines using the correct field names from JSON
                    early_action_deadline = parse_deadline(deadline_info.get("Early Action", ""))
                    early_decision_1_deadline = parse_deadline(deadline_info.get("Early Decision 1", ""))
                    early_decision_2_deadline = parse_deadline(deadline_info.get("Early Decision 2", ""))
                    regular_decision_deadline = parse_deadline(deadline_info.get("Regular Decision", ""))
                    
                    # Update the school recommendation with deadline data in database
                    try:
                        from datetime import datetime
                        update_response = supabase.supabase.table('school_recommendations').update({
                            'early_action_deadline': early_action_deadline,
                            'early_decision_1_deadline': early_decision_1_deadline,
                            'early_decision_2_deadline': early_decision_2_deadline,
                            'regular_decision_deadline': regular_decision_deadline,
                            'last_updated': datetime.now().isoformat()
                        }).eq('id', school_rec['id']).execute()
                        
                        # Update the local record for immediate use
                        if hasattr(update_response, 'data') and update_response.data:
                            school_rec['early_action_deadline'] = early_action_deadline
                            school_rec['early_decision_1_deadline'] = early_decision_1_deadline
                            school_rec['early_decision_2_deadline'] = early_decision_2_deadline
                            school_rec['regular_decision_deadline'] = regular_decision_deadline
                    except Exception as e:
                        print(f"Error auto-populating deadlines for {school_name}: {e}")
            # Determine the most relevant deadline
            primary_deadline = None
            deadline_type = 'Regular Decision'
            
            if school_rec.get('early_decision_1_deadline'):
                ed1_days = calculate_days_remaining(school_rec['early_decision_1_deadline'])
                if ed1_days and ed1_days > 0:
                    primary_deadline = school_rec['early_decision_1_deadline']
                    deadline_type = 'Early Decision 1'
            
            if not primary_deadline and school_rec.get('early_action_deadline'):
                ea_days = calculate_days_remaining(school_rec['early_action_deadline'])
                if ea_days and ea_days > 0:
                    primary_deadline = school_rec['early_action_deadline']
                    deadline_type = 'Early Action'
            
            if not primary_deadline and school_rec.get('regular_decision_deadline'):
                rd_days = calculate_days_remaining(school_rec['regular_decision_deadline'])
                if rd_days:
                    primary_deadline = school_rec['regular_decision_deadline']
                    deadline_type = 'Regular Decision'
            
            # Calculate days remaining for the primary deadline
            days_remaining = calculate_days_remaining(primary_deadline) if primary_deadline else None
            urgency_level = get_urgency_level(days_remaining)
            
            # Helper function to get the best available deadline
            def get_best_deadline():
                # Priority: ED1 > EA > ED2 > RD
                if school_rec.get('early_decision_1_deadline'):
                    return school_rec['early_decision_1_deadline']
                elif school_rec.get('early_action_deadline'):
                    return school_rec['early_action_deadline']
                elif school_rec.get('early_decision_2_deadline'):
                    return school_rec['early_decision_2_deadline']
                elif school_rec.get('regular_decision_deadline'):
                    return school_rec['regular_decision_deadline']
                else:
                    return 'TBD'
            
            # Get the most relevant deadline for tasks
            task_deadline = get_best_deadline()
            
            # Generate default tasks with actual deadlines
            tasks = [
                {
                    "id": f"{school_rec['id']}-common-app",
                    "title": "Common Application",
                    "description": "Complete the Common Application form",
                    "dueDate": task_deadline,
                    "completed": False,
                    "priority": "high"
                },
                {
                    "id": f"{school_rec['id']}-personal-statement",
                    "title": "Personal Statement",
                    "description": "Write and revise personal statement essay",
                    "dueDate": task_deadline,
                    "completed": False,
                    "priority": "high"
                },
                {
                    "id": f"{school_rec['id']}-supplemental-essays",
                    "title": "Supplemental Essays",
                    "description": "Complete school-specific supplemental essays",
                    "dueDate": task_deadline,
                    "completed": False,
                    "priority": "medium"
                },
                {
                    "id": f"{school_rec['id']}-recommendations",
                    "title": "Letters of Recommendation",
                    "description": "Request and follow up on recommendation letters",
                    "dueDate": task_deadline,
                    "completed": False,
                    "priority": "medium"
                },
                {
                    "id": f"{school_rec['id']}-test-scores",
                    "title": "Test Scores",
                    "description": "Submit official test scores",
                    "dueDate": task_deadline,
                    "completed": False,
                    "priority": "low"
                },
                {
                    "id": f"{school_rec['id']}-financial-aid",
                    "title": "Financial Aid Forms",
                    "description": "Complete FAFSA and CSS Profile",
                    "dueDate": task_deadline,
                    "completed": False,
                    "priority": "low"
                }
            ]
            
            deadline_info = {
                "id": school_rec['id'],
                "schoolName": school_rec.get('school', ''),
                "category": school_rec.get('category', 'target'),
                "earlyActionDeadline": school_rec.get('early_action_deadline'),
                "earlyDecision1Deadline": school_rec.get('early_decision_1_deadline'),
                "earlyDecision2Deadline": school_rec.get('early_decision_2_deadline'),
                "regularDecisionDeadline": school_rec.get('regular_decision_deadline'),
                "applicationStatus": school_rec.get('application_status', 'not_started'),
                "daysRemaining": days_remaining,
                "urgencyLevel": urgency_level,
                "tasks": tasks
            }
            
            deadlines.append(deadline_info)
        
        # Sort by urgency (critical first, then by days remaining)
        deadlines.sort(key=lambda x: (
            {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}[x['urgencyLevel']],
            x['daysRemaining'] if x['daysRemaining'] is not None else float('inf')
        ))
        
        return {
            "success": True,
            "deadlines": deadlines,
            "total": len(deadlines)
        }
        
    except Exception as e:
        print(f"Error getting user deadlines: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Conversation Resume API is running"}

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 