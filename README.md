# Diya Voice AI Counselor

A comprehensive AI-powered college counseling platform that provides 24/7 voice-based guidance for college applications, essay writing, and school selection.

## 🎯 Overview

Diya transforms the college application process by offering personalized voice conversations with an AI counselor. Users can speak naturally about their goals, concerns, and questions, receiving real-time guidance and personalized school recommendations.

## 🏗️ Architecture

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn UI components
- **Styling**: Tailwind CSS
- **Voice Integration**: ElevenLabs React SDK
- **State Management**: React hooks and context
- **Build Tool**: Vite

### Backend (Python + FastAPI)
- **Framework**: FastAPI with Uvicorn
- **AI Integration**: Google Gemini API for school recommendations
- **Database**: Supabase (PostgreSQL)
- **Environment**: Python virtual environment

### Voice AI (ElevenLabs)
- **Voice Agent**: Custom ElevenLabs agent for college counseling
- **Real-time Processing**: Live voice conversation handling
- **Metadata Storage**: Conversation transcripts and summaries

### Database (Supabase)
- **Tables**: 
  - `conversation_tracking` - Session management
  - `conversation_metadata` - Voice conversation data
  - `school_recommendations` - AI-generated recommendations
- **Security**: Row Level Security (RLS) policies
- **Authentication**: Supabase Auth integration

## 🚀 Implementation Steps

### Step 1: Core Infrastructure
- ✅ **Frontend Setup**: React + TypeScript + Vite
- ✅ **UI Components**: Shadcn UI integration
- ✅ **Routing**: React Router setup
- ✅ **Basic Pages**: Dashboard, Onboarding, Essays, etc.
- ✅ **Voice Integration**: ElevenLabs SDK integration
- ✅ **Backend Setup**: FastAPI server with health checks
- ✅ **Database**: Supabase connection and basic tables

### Step 2: Frontend Integration
- ✅ **Voice Conversation Interface**: Real-time voice chat
- ✅ **Conversation Management**: Start, pause, end conversations
- ✅ **Live Transcript**: Real-time conversation display
- ✅ **Progress Tracking**: Conversation state management
- ✅ **Backend Communication**: API integration for recommendations
- ✅ **Error Handling**: Toast notifications and error states
- ✅ **Responsive Design**: Mobile and desktop optimization

### Step 3: Voice Call Ending & Metadata Storage
- ✅ **Conversation Ending Trigger**: Automatic metadata capture
- ✅ **ElevenLabs API Integration**: Metadata retrieval (transcript, summary, audio)
- ✅ **Database Storage**: Conversation tracking and metadata tables
- ✅ **School Recommendations**: AI-powered recommendation generation
- ✅ **Conversation History**: View past conversations and metadata
- ✅ **Transcript Viewer**: Modal for viewing conversation details
- ✅ **Local Storage Fallbacks**: Offline data persistence
- ✅ **Error Recovery**: Graceful handling of API failures

## 📁 Project Structure

```
pathfinder-voice/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn UI components
│   │   ├── BrainstormChat.tsx
│   │   ├── EssayEditor.tsx
│   │   ├── TranscriptViewer.tsx
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── Onboarding.tsx  # Voice conversation interface
│   │   ├── ConversationHistory.tsx
│   │   ├── Dashboard.tsx
│   │   └── ...
│   ├── services/           # API services
│   │   └── backendAPI.ts   # Backend communication
│   ├── utils/              # Utility functions
│   │   ├── elevenLabsAPI.ts    # ElevenLabs integration
│   │   └── conversationStorage.ts # Database operations
│   ├── integrations/       # Third-party integrations
│   │   └── supabase/       # Supabase client and types
│   └── hooks/              # Custom React hooks
├── backend/
│   ├── api_server.py       # FastAPI server
│   ├── src/
│   │   ├── config.py       # Configuration
│   │   └── supabase_client.py
│   └── requirements.txt    # Python dependencies
├── supabase/
│   └── migrations/         # Database migrations
└── docs/                   # Documentation
```

## 🔧 Key Features

### Voice Conversation System
- **Real-time Voice Chat**: Natural conversation with AI counselor
- **Live Transcript**: Real-time conversation display
- **Session Management**: Start, pause, and end conversations
- **Metadata Capture**: Automatic storage of conversation data

### School Recommendation Engine
- **AI-Powered Analysis**: Google Gemini API integration
- **Personalized Suggestions**: Based on conversation content
- **Comprehensive Data**: School rankings, requirements, deadlines

### Conversation Management
- **History Tracking**: View all past conversations
- **Metadata Storage**: Transcripts, summaries, and audio URLs
- **Search & Filter**: Find specific conversations
- **Export Options**: Download transcripts and data

### User Experience
- **Responsive Design**: Works on all devices
- **Intuitive Interface**: Clean, modern UI
- **Error Handling**: Graceful error recovery
- **Loading States**: Smooth user feedback

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- Supabase account
- ElevenLabs API key
- Google Gemini API key

### Frontend Setup
```bash
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python api_server.py
```

### Environment Variables
Create a `.env` file in the root directory:
```env
# Frontend
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
VITE_ELEVENLABS_AGENT_ID=your_agent_id

# Backend
GOOGLE_API_KEY=your_gemini_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder to your hosting platform
```

### Backend (Railway/Render)
```bash
cd backend
# Deploy with requirements.txt and api_server.py
```

### Database (Supabase)
- Apply migrations: `supabase db push`
- Configure production environment variables
- Set up Row Level Security policies

## 📊 API Endpoints

### Backend (FastAPI)
- `GET /` - Health check
- `POST /api/recommendations` - Generate school recommendations
- `GET /api/health` - Backend status

### Supabase Tables
- `conversation_tracking` - Session management
- `conversation_metadata` - Voice conversation data
- `school_recommendations` - AI recommendations

## 🔒 Security Features

- **Row Level Security**: Database access control
- **Environment Variables**: Secure API key management
- **CORS Configuration**: Cross-origin request handling
- **Input Validation**: API request sanitization
- **Error Handling**: Secure error responses

## 🧪 Testing

### Manual Testing
1. **Voice Conversation**: Test at `/onboarding`
2. **Conversation History**: Test at `/conversation-history`
3. **Backend Integration**: Test at `/backend-integration`

### API Testing
```bash
# Test backend health
curl http://localhost:8000/

# Test recommendations
curl -X POST http://localhost:8000/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{"conversation_id": "test", "user_id": "test_user"}'
```

## 📈 Performance

- **Frontend**: Optimized with Vite build
- **Backend**: FastAPI with async operations
- **Database**: Indexed queries for fast retrieval
- **Voice**: Real-time processing with ElevenLabs
- **Caching**: Local storage for offline support

## 🔄 Data Flow

1. **User starts conversation** → ElevenLabs agent initializes
2. **Voice interaction** → Real-time processing and display
3. **User ends conversation** → Metadata capture and storage
4. **AI analysis** → School recommendation generation
5. **Data persistence** → Supabase storage with fallbacks
6. **User access** → Conversation history and recommendations

## 🎯 Future Enhancements

- **Multi-language Support**: International student guidance
- **Advanced Analytics**: User behavior insights
- **Integration APIs**: Connect with application platforms
- **Mobile App**: Native iOS/Android applications
- **AI Improvements**: Enhanced recommendation algorithms

## 📞 Support

For technical support or feature requests, please refer to the project documentation or create an issue in the repository.

---

**Diya Voice AI Counselor** - Transforming college applications through intelligent voice guidance.
