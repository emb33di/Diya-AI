### Setup ###

1. **Install Dependencies**
   python3 -m pip install -r requirements.txt

### School Fetcher Agent ###

This system analyzes student-counselor conversations and provides relevant college recommendations using Google Gemini AI.

2. **Set up API Key**
   Create a `.env` file in the backend directory with your Google Gemini API key:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   ```
   
   Get your API key from: https://makersuite.google.com/app/apikey

3. **Run Supabase Migration**
   Apply the migration to create the school_recommendations table:
   ```bash
   supabase db push
   ```

## Usage

### Basic Usage

```python
from src.school_fetcher_agent import SchoolFetcherAgent

# Initialize the agent
agent = SchoolFetcherAgent()

# Analyze a transcript
transcript = """
Student: I'm interested in computer science and want to go to a school with good financial aid.
I have a 3.8 GPA and 1400 SAT. I'm from California and prefer to stay on the West Coast.

Counselor: What's your budget range and are you open to both public and private schools?

Student: I'd like to keep costs under $30k per year after aid. I'm open to both types of schools.
"""

# Get school recommendations
schools = agent.fetch_schools(transcript, "student_123")
```

### Test Script

Run the test script to see the system in action:
```bash
GOOGLE_API_KEY=your_api_key python3 test_school_fetcher.py
```

## Output Format

Each school recommendation includes:

- `school`: Full school name
- `school_type`: public/private/liberal_arts/research_university/community_college/technical_institute
- `school_ranking`: National ranking or "unranked"
- `acceptance_rate`: Percentage as string (e.g., "15%")
- `ed_deadline`: Early Decision deadline (YYYY-MM-DD or "N/A")
- `first_round_deadline`: Regular Decision or Early Action deadline
- `notes`: Brief explanation of why this school matches the student
- `student_thesis`: Why the student would be a good fit for this school
- `student_id`: The student's unique identifier

## Database Schema

The `school_recommendations` table stores all recommendations with proper indexing and Row Level Security (RLS) policies.

## Files

- `src/school_fetcher_agent.py`: Main agent class
- `src/prompts/school_fetcher_agent_prompt.txt`: AI prompt template
- `src/config.py`: Configuration management
- `test_school_fetcher.py`: Test script
- `requirements.txt`: Python dependencies
- `supabase/migrations/20250101000000_create_school_recommendations.sql`: Database schema 