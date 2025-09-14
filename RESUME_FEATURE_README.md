# Resume Management Feature

This document describes the new Resume management feature added to the PathFinder application.

## Overview

The Resume feature allows users to:
- Upload resume files (PDF, DOC, DOCX)
- Maintain version control (Draft 1, Draft 2, etc.)
- Receive AI-powered feedback on strengths and weaknesses
- Download and manage their resume versions

## Components Added

### 1. Resume Page (`src/pages/Resume.tsx`)
- Main interface for resume management
- File upload with validation
- Version history display
- Feedback visualization
- Download and delete functionality

### 2. Resume Service (`src/services/resumeService.ts`)
- API integration with Supabase
- File upload and storage management
- Version control logic
- Feedback generation triggers

### 3. Database Schema (`supabase/migrations/20241220_create_resume_versions.sql`)
- `resume_versions` table with version control
- Storage bucket configuration
- Row Level Security (RLS) policies
- File management functions

### 4. Edge Function (`supabase/functions/generate-resume-feedback/index.ts`)
- AI-powered resume analysis
- Feedback generation
- Status management

## Features

### File Upload
- Supports PDF, DOC, and DOCX formats
- 5MB file size limit
- Automatic version numbering
- Progress tracking during upload

### Version Control
- Automatic version increment (v1, v2, v3, etc.)
- Unique version per user
- Version history with timestamps
- File metadata tracking

### AI Feedback
- Strengths analysis
- Weaknesses identification
- Overall score (0-100)
- Actionable suggestions
- Processing status tracking

### File Management
- Secure file storage in Supabase Storage
- User-specific file organization
- Download functionality
- Delete with cleanup

## Database Schema

```sql
CREATE TABLE resume_versions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    version INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    upload_date TIMESTAMPTZ NOT NULL,
    feedback JSONB,
    status TEXT NOT NULL DEFAULT 'processing',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    UNIQUE(user_id, version)
);
```

## Security

- Row Level Security (RLS) enabled
- User-specific file access
- Secure file storage with authentication
- Input validation and sanitization

## Navigation

The Resume tab has been added to the main navigation menu and is accessible at `/resume`.

## Future Enhancements

### TODO: AI Integration
The current implementation includes a placeholder for AI-powered resume analysis. To implement actual AI feedback:

1. **Text Extraction**: Use libraries like `pdf-parse` for PDF files and `mammoth` for DOCX files
2. **AI Analysis**: Integrate with OpenAI GPT-4, Anthropic Claude, or custom ML models
3. **Analysis Areas**:
   - ATS (Applicant Tracking System) compatibility
   - Keyword optimization for target roles
   - Format and structure analysis
   - Content quality and impact
   - Skills gap analysis
   - Industry-specific recommendations

### Example AI Integration:
```typescript
async function analyzeResumeWithAI(resumeText: string, targetRole?: string): Promise<ResumeFeedback> {
  const prompt = `
    Analyze this resume and provide feedback on:
    1. Key strengths and achievements
    2. Areas for improvement
    3. Overall score (0-100)
    4. Specific suggestions for enhancement
    
    Resume text: ${resumeText}
    ${targetRole ? `Target role: ${targetRole}` : ''}
  `
  
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3
  })
  
  return parseAIResponse(response.choices[0].message.content)
}
```

## Usage

1. Navigate to the Resume tab in the application
2. Click "Upload New Resume" to upload a file
3. Wait for processing to complete
4. View feedback in the "Resume Versions" tab
5. Download or delete versions as needed

## File Structure

```
src/
├── pages/
│   └── Resume.tsx                 # Main resume page component
├── services/
│   └── resumeService.ts           # Resume API service
supabase/
├── migrations/
│   └── 20241220_create_resume_versions.sql  # Database schema
└── functions/
    └── generate-resume-feedback/
        └── index.ts               # Edge function for AI feedback
```
