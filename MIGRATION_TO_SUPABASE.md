# Migration to Supabase-Only Architecture

This document describes the migration from a backend API + Supabase architecture to a Supabase-only architecture.

## Overview

The application has been migrated from using a Python FastAPI backend server to using Supabase Edge Functions and direct database queries. This simplifies the architecture, reduces deployment complexity, and improves performance.

## What Changed

### Removed Components
- Python FastAPI backend server (`backend/` directory)
- Backend API service calls
- Environment variables for backend API URL

### New Components
- Supabase Edge Functions for AI processing
- Direct Supabase database queries
- New service classes for Supabase integration

## New Architecture

### Database Tables
- `school_deadlines` - Static deadline data for all schools
- `brainstorming_summaries` - Generated brainstorming summaries
- `resume_context_summaries` - Generated resume context summaries
- Existing tables remain unchanged

### Edge Functions
- `generate-school-recommendations` - Generates school recommendations using AI
- `generate-conversation-summary` - Generates brainstorming and resume context summaries

### Services
- `SchoolRecommendationService` - Handles school recommendation generation
- `ConversationProcessingService` - Handles conversation analysis
- `DeadlineService` - Updated to use Supabase directly

## Migration Steps

1. **Apply Database Migrations**
   ```bash
   supabase db push
   ```

2. **Deploy Edge Functions**
   ```bash
   supabase functions deploy generate-school-recommendations
   supabase functions deploy generate-conversation-summary
   ```

3. **Populate School Deadlines**
   ```bash
   python scripts/populate_school_deadlines.py
   ```

4. **Update Environment Variables**
   - Remove `VITE_BACKEND_API_URL` from your environment
   - Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set

## Benefits

### Performance
- Direct database queries are faster than API calls
- No network latency between frontend and database
- Reduced server load

### Simplicity
- One less service to maintain
- Fewer environment variables
- Simpler deployment process

### Reliability
- No backend server to fail
- Supabase handles scaling automatically
- Better error handling with RLS policies

### Cost
- Reduced server costs
- Pay only for what you use with Supabase

## Testing the Migration

1. **Test School Recommendations**
   - Complete the onboarding flow
   - Verify school recommendations are generated

2. **Test Deadline Syncing**
   - Go to the School List page
   - Click "Sync Deadlines"
   - Verify deadlines are populated

3. **Test Brainstorming**
   - Start a brainstorming session
   - Complete the conversation
   - Verify summary is generated

## Rollback Plan

If issues arise, you can rollback by:
1. Reverting the code changes
2. Restarting the backend API server
3. Updating environment variables

## Environment Variables

### Required
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `GOOGLE_API_KEY` - For AI processing in Edge Functions

### Removed
- `VITE_BACKEND_API_URL` - No longer needed

## Monitoring

Monitor the application using:
- Supabase Dashboard for database queries
- Supabase Edge Functions logs
- Browser developer tools for frontend errors

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Verify environment variables are set correctly
3. Ensure database migrations are applied
4. Check RLS policies are configured properly
