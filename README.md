# Diya AI

An AI-powered college counseling platform that gives every student access to personalized admissions guidance — 24/7 voice conversations, essay feedback, school recommendations, and full application management.

Built by Ivy League alumni from Harvard and the University of Chicago.

## Features

### Voice AI Counselor
Real-time voice conversations with an AI counselor trained on college admissions. Students can ask questions, brainstorm ideas, and get guidance on any part of the application process — just by talking.

### Essay Writing & Feedback
A rich-text essay editor with AI-powered scoring and paragraph-level feedback. Essays are graded across multiple dimensions (structure, narrative, voice, etc.) with actionable suggestions. Students can also escalate essays for expert human review.

### School Recommendations
AI-generated college lists personalized to each student's profile, preferences, and goals — powered by Google Gemini. Includes rankings, requirements, deadlines, and fit analysis.

### Application Tracker
Centralized dashboard for managing deadlines, application tasks, test scores, transcripts, recommendations, and financial aid across all target schools.

### Resume & Activity Builder
Tools to organize extracurriculars, achievements, and work experience into a structured resume format ready for applications.

### Counselor Portal
A dedicated portal for partner counselors (e.g. IvySummit) to review student essays, leave feedback, and manage their caseload.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| UI | Shadcn/UI, Radix, Tailwind CSS |
| Editor | TipTap (ProseMirror) |
| State | Zustand, TanStack React Query |
| Backend | Supabase (PostgreSQL, Edge Functions, Auth, Storage) |
| Voice AI | ElevenLabs, Outspeed |
| AI/LLM | Google Gemini API |
| Payments | Stripe, Razorpay |
| Analytics | Google Analytics, LogRocket |
| Deployment | Vercel |

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- API keys for ElevenLabs, Google Gemini, and Stripe/Razorpay

### Setup

```bash
# Install dependencies
npm install

# Copy environment template and fill in your keys
cp .env.example .env.local

# Start the development server
npm run dev
```

### Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_ELEVENLABS_API_KEY` | ElevenLabs API key for voice AI |
| `VITE_ELEVENLABS_AGENT_ID` | ElevenLabs agent ID |
| `GOOGLE_API_KEY` | Google Gemini API key |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments |

## Project Structure

```
src/
  components/       # Reusable UI components
    essay/          # Essay editor and scoring
    ui/             # Shadcn/UI primitives
  pages/            # Route-level page components
  services/         # API and business logic
  hooks/            # Custom React hooks
  stores/           # Zustand state stores
  integrations/     # Third-party client setup (Supabase)
  utils/            # Shared utilities

supabase/
  functions/        # Edge Functions (payments, emails, AI)
  migrations/       # Database schema migrations

scripts/            # Admin and setup scripts
```

## Deployment

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

The frontend deploys to Vercel. Supabase handles the backend, database, auth, and edge functions.

## License

All rights reserved.
