# Diya Voice AI Counselor

A comprehensive AI-powered college counseling platform that provides 24/7 voice-based guidance for college applications, essay writing, and school selection.

> Deployment trigger - November 2024

## 🎯 Overview

Diya transforms the college application process by offering personalized voice conversations with an AI counselor. Users can speak naturally about their goals, concerns, and questions, receiving real-time guidance and personalized school recommendations.

## 🏗️ Architecture

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn UI components
- **Styling**: Tailwind CSS
- **Voice Integration**: Outspeed React SDK
- **State Management**: React hooks and context
- **Build Tool**: Vite

### Backend (Python + FastAPI)
- **Framework**: FastAPI with Uvicorn
- **AI Integration**: Google Gemini API for school recommendations
- **Database**: Supabase (PostgreSQL)
- **Environment**: Python virtual environment

### Voice AI (Outspeed)
- **Voice Agent**: Custom Outspeed agent for college counseling
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
- ✅ **Voice Integration**: Outspeed SDK integration
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
- ✅ **Outspeed API Integration**: Metadata retrieval (transcript, summary, audio)
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
│   │   ├── outspeedAPI.ts      # Outspeed integration
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
- Outspeed API key
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

## 🗄️ Database Migration Troubleshooting

### Common Database Schema Issues

When you encounter errors like `"Could not find the 'column_name' column of 'table_name' in the schema cache"`, it usually means there's a mismatch between your local migrations and the remote database schema.

### Quick Diagnosis Steps

1. **Check Migration Status**
   ```bash
   # Link to your remote project first
   supabase link --project-ref YOUR_PROJECT_ID
   
   # Check which migrations are applied locally vs remotely
   supabase migrations list --linked
   ```

2. **Identify Missing Migrations**
   - Look for migrations that show in the "Local" column but are empty in the "Remote" column
   - These are migrations that exist locally but haven't been applied to the remote database

3. **Apply Missing Migrations**
   ```bash
   # Push all missing migrations to remote database
   supabase db push --linked --include-all
   ```

### Detailed Migration Workflow

#### Step 1: Link to Remote Project
```bash
# Replace with your actual project reference ID
supabase link --project-ref oliclbcxukqddxlfxuuc
```

#### Step 2: Check Migration Status
```bash
supabase migrations list --linked
```

**Expected Output:**
```
Local          | Remote         | Time (UTC)          
----------------|----------------|---------------------
20241220       | 20241220       | 20241220            
20250131000001 |                | 2025-01-31 00:00:01  ← Missing on remote
20250131000002 |                | 2025-01-31 00:00:02  ← Missing on remote
```

#### Step 3: Apply Missing Migrations
```bash
# This will prompt you to confirm the migration push
supabase db push --linked --include-all
```

#### Step 4: Verify Success
```bash
# Check that all migrations are now applied
supabase migrations list --linked
```

**Expected Output After Fix:**
```
Local          | Remote         | Time (UTC)          
----------------|----------------|---------------------
20241220       | 20241220       | 20241220            
20250131000001 | 20250131000001 | 2025-01-31 00:00:01  ← Now applied
20250131000002 | 20250131000002 | 2025-01-31 00:00:02  ← Now applied
```

### Common Error Patterns

#### Error: `"Could not find the 'application_concerns' column"`
- **Cause**: Migration `20250131000001_add_undergraduate_prompt_fields.sql` not applied
- **Solution**: Run `supabase db push --linked --include-all`

#### Error: `"relation 'table_name' does not exist"`
- **Cause**: Table creation migration not applied
- **Solution**: Check migration status and push missing migrations

#### Error: `"duplicate key value violates unique constraint"`
- **Cause**: Migration applied multiple times or data conflict
- **Solution**: Check migration history and resolve data conflicts

### Migration File Naming Issues

Some migration files may be skipped due to incorrect naming patterns:
```
❌ Bad: 20250118T000000_fix_essay_prompts_table_structure.sql
✅ Good: 20250118000000_fix_essay_prompts_table_structure.sql
```

**Fix naming issues:**
```bash
# Rename files to follow the pattern: YYYYMMDDHHMMSS_name.sql
mv 20250118T000000_fix_essay_prompts_table_structure.sql 20250118000000_fix_essay_prompts_table_structure.sql
```

### Emergency Recovery

If migrations are completely broken:

1. **Reset Local Database**
   ```bash
   supabase db reset
   ```

2. **Pull Remote Schema**
   ```bash
   supabase db pull --linked
   ```

3. **Generate New Migration**
   ```bash
   supabase db diff --linked -f new_migration_name
   ```

### Best Practices

1. **Always check migration status** before deploying
2. **Test migrations locally** before pushing to remote
3. **Keep migration files properly named** with timestamp format
4. **Document schema changes** in migration comments
5. **Backup database** before major schema changes

### Troubleshooting Checklist

- [ ] Is Supabase CLI installed? (`which supabase`)
- [ ] Is project linked? (`supabase status`)
- [ ] Are there missing migrations? (`supabase migrations list --linked`)
- [ ] Are migration files properly named?
- [ ] Have migrations been pushed? (`supabase db push --linked --include-all`)
- [ ] Is the error resolved after migration push?

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
3. **Supabase Integration**: Test at `/backend-integration`

### Supabase Integration Testing
The application now uses Supabase Edge Functions instead of a separate backend API. All functionality is accessible through the Supabase client in the frontend.

## 📈 Performance

- **Frontend**: Optimized with Vite build
- **Backend**: FastAPI with async operations
- **Database**: Indexed queries for fast retrieval
- **Voice**: Real-time processing with Outspeed
- **Caching**: Local storage for offline support

## 🔄 Data Flow

1. **User starts conversation** → Outspeed agent initializes
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
