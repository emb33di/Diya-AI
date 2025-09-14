import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Google Gemini API Configuration
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# Validate required API keys
def validate_api_keys():
    """Validate that required API keys are set"""
    missing_keys = []
    
    if not GOOGLE_API_KEY:
        missing_keys.append('GOOGLE_API_KEY')
    
    if missing_keys:
        raise ValueError(f"Missing required API keys: {', '.join(missing_keys)}")
    
    return True 