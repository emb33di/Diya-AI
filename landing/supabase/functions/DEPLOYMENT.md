# Supabase Edge Functions Deployment Guide

## Functions Overview

This project includes two Edge Functions for handling waitlist functionality:

### 1. `waitlist-confirmation`
- **Purpose**: Sends confirmation emails to users who join the waitlist
- **Triggered by**: Database trigger when new record is inserted into `waitlist` table
- **Sends to**: The user's email address

### 2. `waitlist-email`
- **Purpose**: Sends notification emails to admin when new users join the waitlist
- **Triggered by**: Database trigger when new record is inserted into `waitlist` table (same trigger as confirmation)
- **Sends to**: Admin email address (configured via `NOTIFY_TO` env var)

## Required Environment Variables

Set these in your Supabase project dashboard under Settings > Edge Functions:

```bash
# Resend API configuration (required for both functions)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=mihir@meetdiya.com

# Admin notification email (for waitlist-email function)
NOTIFY_TO=mihir@meetdiya.com

# Supabase configuration (automatically provided)
SUPABASE_URL=https://oliclbcxukqddxlfxuuc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Deployment Commands

Deploy both functions to your Supabase project:

```bash
# Deploy waitlist confirmation function
supabase functions deploy waitlist-confirmation

# Deploy waitlist notification function  
supabase functions deploy waitlist-email
```

## Database Setup

The database trigger is already configured in the migration file:
- `supabase/migrations/add_waitlist_confirmation_trigger.sql`
- This trigger automatically calls **both** functions when new waitlist entries are added:
  - `waitlist-confirmation` (sends welcome email to user)
  - `waitlist-email` (sends notification email to admin)

## Testing

Test the functions using the Supabase dashboard or curl:

```bash
# Test waitlist-confirmation function
curl -X POST 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/waitlist-confirmation' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "INSERT",
    "schema": "public", 
    "table": "waitlist",
    "record": {
      "id": 1,
      "email": "test@example.com",
      "created_at": "2025-01-27T10:00:00Z"
    }
  }'

# Test waitlist-email function
curl -X POST 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/waitlist-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "INSERT",
    "schema": "public",
    "table": "waitlist", 
    "record": {
      "id": 1,
      "email": "test@example.com",
      "created_at": "2025-01-27T10:00:00Z"
    }
  }'
```

## Troubleshooting

1. **Email not sending**: Check that `RESEND_API_KEY` is set correctly and the sender email is verified in Resend
2. **Function not triggering**: Verify the database trigger is active and the webhook URL is correct
3. **TypeScript errors**: Ensure all dependencies are properly imported in `deno.json`

## Status

✅ **waitlist-confirmation**: Properly configured and deployed  
✅ **waitlist-email**: Fixed handler pattern and type annotations  
✅ **Database trigger**: Configured to call **both** functions automatically  
✅ **Dual email system**: User gets confirmation, admin gets notification
