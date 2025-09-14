#!/usr/bin/env python3
"""
General FastAPI server for multiple agents and backend functionalities
"""

import os
import sys
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Load environment variables
load_dotenv('../.env')

# Add src directory to path
sys.path.append('src')

# Import agents
from school_fetcher_agent.school_fetcher_agent import SchoolFetcherAgent
# Future agents can be imported here:
# from essay_fetcher_agent.essay_fetcher_agent import EssayFetcherAgent
# from deadline_tracker_agent.deadline_tracker_agent import DeadlineTrackerAgent

# Initialize FastAPI app
app = FastAPI(
    title="Diya Voice Backend API",
    description="API for multiple agents and backend functionalities",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# BASE MODELS (Shared across all agents)
# ============================================================================

class BaseRequest(BaseModel):
    conversation_id: str
    user_id: str

class BaseResponse(BaseModel):
    success: bool
    message: str
    conversation_id: str
    user_id: str

class HealthResponse(BaseModel):
    status: str
    message: str
    agents: Dict[str, bool]
    supabase_connected: bool
    google_api_configured: bool

# ============================================================================
# SCHOOL FETCHER AGENT MODELS
# ============================================================================

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

class SchoolRecommendationResponse(BaseResponse):
    recommendations: List[SchoolRecommendation]

# ============================================================================
# ESSAY FETCHER AGENT MODELS (Future)
# ============================================================================

class EssayRecommendation(BaseModel):
    essay_type: str
    prompt: str
    word_count: int
    deadline: str
    tips: str

class EssayRecommendationResponse(BaseResponse):
    recommendations: List[EssayRecommendation]

# ============================================================================
# DEADLINE TRACKER MODELS
# ============================================================================

class DeadlineData(BaseModel):
    School: str
    early_action: str = Field(alias="Early Action")
    early_decision_1: str = Field(alias="Early Decision 1")
    early_decision_2: str = Field(alias="Early Decision 2")
    regular_decision: str = Field(alias="Regular Decision")

class DeadlineSyncRequest(BaseModel):
    user_id: str

class DeadlineSyncResponse(BaseResponse):
    schools_updated: int
    total_schools: int

# ============================================================================
# AGENT MANAGER
# ============================================================================

class AgentManager:
    """Manages multiple agents and their initialization"""
    
    def __init__(self):
        self.agents = {}
        self.initialize_agents()
    
    def initialize_agents(self):
        """Initialize all available agents"""
        try:
            # Initialize School Fetcher Agent
            self.agents['school_fetcher'] = SchoolFetcherAgent()
            print("✅ School Fetcher Agent initialized")
        except Exception as e:
            print(f"❌ Error initializing School Fetcher Agent: {e}")
            self.agents['school_fetcher'] = None
        
        # Future agents can be added here:
        # try:
        #     self.agents['essay_fetcher'] = EssayFetcherAgent()
        #     print("✅ Essay Fetcher Agent initialized")
        # except Exception as e:
        #     print(f"❌ Error initializing Essay Fetcher Agent: {e}")
        #     self.agents['essay_fetcher'] = None
    
    def get_agent(self, agent_name: str):
        """Get a specific agent by name"""
        return self.agents.get(agent_name)
    
    def get_agent_status(self) -> Dict[str, bool]:
        """Get status of all agents"""
        return {name: agent is not None for name, agent in self.agents.items()}

# Initialize agent manager
agent_manager = AgentManager()

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    agent_status = agent_manager.get_agent_status()
    supabase_connected = any(agent and agent.supabase_client for agent in agent_manager.agents.values())
    google_api_configured = os.getenv('GOOGLE_API_KEY') is not None
    
    return HealthResponse(
        status="healthy" if any(agent_status.values()) else "unhealthy",
        message="Backend API is running",
        agents=agent_status,
        supabase_connected=supabase_connected,
        google_api_configured=google_api_configured
    )

# ============================================================================
# SCHOOL FETCHER AGENT ENDPOINTS
# ============================================================================

@app.post("/api/schools/recommendations", response_model=SchoolRecommendationResponse)
async def generate_school_recommendations(request: BaseRequest):
    """Generate school recommendations based on conversation transcript"""
    try:
        # Get the school fetcher agent
        agent = agent_manager.get_agent("school_fetcher")
        if not agent:
            raise HTTPException(status_code=500, detail="School fetcher agent not available")
        
        # Generate recommendations
        recommendations = await agent.generate_recommendations(
            conversation_id=request.conversation_id,
            user_id=request.user_id
        )
        
        return SchoolRecommendationResponse(
            success=True,
            message="School recommendations generated successfully",
            conversation_id=request.conversation_id,
            user_id=request.user_id,
            recommendations=recommendations
        )
        
    except Exception as e:
        print(f"Error generating school recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/schools/recommendations/{user_id}", response_model=SchoolRecommendationResponse)
async def get_user_school_recommendations(user_id: str):
    """Get existing school recommendations for a user"""
    try:
        # Import supabase client
        from src.supabase_client import SupabaseClient
        supabase = SupabaseClient()
        
        # Fetch user's school recommendations
        response = supabase.supabase.table('school_recommendations').select('*').eq('student_id', user_id).execute()
        
        # Check if response has data (newer Supabase client doesn't have .error attribute)
        if not hasattr(response, 'data') or not response.data:
            raise HTTPException(status_code=500, detail="Database error: No data returned")
        
        # Convert to SchoolRecommendation format
        recommendations = []
        for rec in response.data:
            recommendation = SchoolRecommendation(
                school=rec.get('school', ''),
                school_type=rec.get('school_type', ''),
                school_ranking=rec.get('school_ranking', ''),
                acceptance_rate=rec.get('acceptance_rate', ''),
                category=rec.get('category', 'target'),
                notes=rec.get('notes', ''),
                student_thesis=rec.get('student_thesis', ''),
                city=rec.get('city'),
                state=rec.get('state'),
                climate=rec.get('climate')
            )
            recommendations.append(recommendation)
        
        return SchoolRecommendationResponse(
            success=True,
            message=f"Found {len(recommendations)} school recommendations",
            conversation_id="",  # Not applicable for this endpoint
            user_id=user_id,
            recommendations=recommendations
        )
        
    except Exception as e:
        print(f"Error fetching school recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# DEADLINE TRACKER ENDPOINTS
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
        
        # Check if response has data (newer Supabase client doesn't have .error attribute)
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
                
                # Check if update was successful (newer Supabase client doesn't have .error attribute)
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
        from src.supabase_client import SupabaseClient
        supabase = SupabaseClient()
        
        # Get user's school recommendations with deadline data
        response = supabase.supabase.table('school_recommendations').select('*').eq('student_id', user_id).execute()
        
        # Check if response has data (newer Supabase client doesn't have .error attribute)
        if not hasattr(response, 'data') or not response.data:
            raise HTTPException(status_code=500, detail="Database error: No data returned")
        
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
                
                # If the date has passed this year, use next year
                if deadline_date < now:
                    deadline_date = deadline_date.replace(year=deadline_date.year + 1)
                
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
        
        # Process each school
        for school_rec in user_schools:
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
            
            # Generate default tasks
            tasks = [
                {
                    "id": f"{school_rec['id']}-common-app",
                    "title": "Common Application",
                    "description": "Complete the Common Application form",
                    "dueDate": school_rec.get('regular_decision_deadline', 'TBD'),
                    "completed": False,
                    "priority": "high"
                },
                {
                    "id": f"{school_rec['id']}-personal-statement",
                    "title": "Personal Statement",
                    "description": "Write and revise personal statement essay",
                    "dueDate": school_rec.get('regular_decision_deadline', 'TBD'),
                    "completed": False,
                    "priority": "high"
                },
                {
                    "id": f"{school_rec['id']}-supplemental-essays",
                    "title": "Supplemental Essays",
                    "description": "Complete school-specific supplemental essays",
                    "dueDate": school_rec.get('regular_decision_deadline', 'TBD'),
                    "completed": False,
                    "priority": "medium"
                },
                {
                    "id": f"{school_rec['id']}-recommendations",
                    "title": "Letters of Recommendation",
                    "description": "Request and follow up on recommendation letters",
                    "dueDate": school_rec.get('regular_decision_deadline', 'TBD'),
                    "completed": False,
                    "priority": "medium"
                },
                {
                    "id": f"{school_rec['id']}-test-scores",
                    "title": "Test Scores",
                    "description": "Submit official test scores",
                    "dueDate": school_rec.get('regular_decision_deadline', 'TBD'),
                    "completed": False,
                    "priority": "low"
                },
                {
                    "id": f"{school_rec['id']}-financial-aid",
                    "title": "Financial Aid Forms",
                    "description": "Complete FAFSA and CSS Profile",
                    "dueDate": school_rec.get('regular_decision_deadline', 'TBD'),
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

# ============================================================================
# CONVERSATION RESUME ENDPOINTS
# ============================================================================

@app.get("/api/conversations/{conversation_id}/transcript")
async def get_conversation_transcript(conversation_id: str):
    """Get transcript for any conversation (shared across agents)"""
    # Use any agent with Supabase client
    for agent_name, agent in agent_manager.agents.items():
        if agent and agent.supabase_client:
            try:
                transcript = agent.supabase_client.get_conversation_transcript(conversation_id)
                if transcript:
                    return {
                        "conversation_id": conversation_id,
                        "transcript": transcript,
                        "transcript_length": len(transcript)
                    }
            except Exception:
                continue
    
    raise HTTPException(status_code=404, detail=f"No transcript found for conversation: {conversation_id}")

@app.get("/api/agents/status")
async def get_agents_status():
    """Get status of all agents"""
    return {
        "agents": agent_manager.get_agent_status(),
        "total_agents": len(agent_manager.agents),
        "available_agents": sum(1 for agent in agent_manager.agents.values() if agent is not None)
    }

if __name__ == "__main__":
    uvicorn.run(
        "api_server_general:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 