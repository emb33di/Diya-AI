# Weekly Deadline Emails Setup Guide

## Overview
This guide explains how to set up and deploy the weekly deadline reminder email system for Diya AI using Supabase Edge Functions and Resend.

## Components Created

### 1. Edge Function: `weekly-deadline-emails`
- **Location**: `supabase/functions/weekly-deadline-emails/index.ts`
- **Purpose**: Sends personalized weekly deadline reminder emails to users
- **Features**:
  - Queries user deadlines from `school_recommendations` table
  - Calculates urgency levels based on days remaining
  - Generates personalized HTML emails
  - Groups deadlines by urgency (critical, high, medium, low)
  - Includes action items and encouragement

### 2. Cron Job Migration
- **Location**: `supabase/migrations/20250120000000_create_weekly_deadline_email_cron.sql`
- **Purpose**: Automatically triggers the Edge Function every Monday at 9:00 AM UTC
- **Features**:
  - Uses PostgreSQL's `pg_cron` extension
  - Includes error logging and monitoring
  - Secure function execution with proper permissions

## Required Environment Variables

Set these in your Supabase project dashboard under Settings > Edge Functions:

```bash
# Resend API configuration (required)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=mihir@meetdiya.com

# Supabase configuration (automatically provided)
SUPABASE_URL=https://oliclbcxukqddxlfxuuc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Deployment Steps

### 1. Deploy the Edge Function
```bash
# Navigate to your project root
cd /Users/mihirbedi/Desktop/Business\ ideas/AI\ Counselor/Diya-AI

# Deploy the weekly deadline emails function
supabase functions deploy weekly-deadline-emails
```

### 2. Run the Migration
```bash
# Apply the cron job migration
supabase db push
```

### 3. Verify Deployment
```bash
# Test the function manually
curl -X GET 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/weekly-deadline-emails?manual=true' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

## Email Features

### Personalized Content
- **User-specific deadlines**: Only shows deadlines for schools the user is applying to
- **Urgency-based grouping**: Critical, high, medium, and low priority sections
- **Days remaining calculation**: Automatically calculates and displays days until deadline
- **Application status tracking**: Shows current status of each application

### Email Template
- **Professional design**: Clean, mobile-responsive HTML template
- **Diya AI branding**: Includes logo and consistent styling
- **Action items**: Provides specific tasks for the week
- **Encouragement**: Motivational messaging to keep users engaged
- **Dashboard link**: Direct link to full application dashboard

### Urgency Levels
- **🚨 Critical/Overdue**: Red styling, immediate attention needed
- **🔥 High Priority**: Orange styling, within 14 days
- **📅 Medium Priority**: Blue styling, within 30 days
- **📝 Low Priority**: Gray styling, more than 30 days

## Database Queries

The function queries the following tables:
- `school_recommendations`: User's school list with deadline data
- `user_profiles`: User email and name information
- Uses joins to get complete user information

## Monitoring and Logs

### Cron Job Monitoring
- Check cron job status: `SELECT * FROM cron.job WHERE jobname = 'weekly-deadline-emails';`
- View execution history: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'weekly-deadline-emails');`

### Edge Function Logs
- Monitor function execution in Supabase Dashboard > Edge Functions > Logs
- Check Resend dashboard for email delivery statistics

## Testing

### Manual Testing
```bash
# Test with manual trigger
curl -X GET 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/weekly-deadline-emails?manual=true' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

### Expected Response
```json
{
  "success": true,
  "message": "Weekly deadline emails sent successfully",
  "stats": {
    "total_users": 25,
    "emails_sent": 23,
    "emails_failed": 2,
    "users_with_upcoming_deadlines": 25
  }
}
```

## Troubleshooting

### Common Issues

1. **Function not deploying**
   - Check environment variables are set correctly
   - Verify Resend API key is valid
   - Check Supabase project URL

2. **Emails not sending**
   - Verify Resend API key permissions
   - Check email domain verification in Resend
   - Review Edge Function logs for errors

3. **Cron job not running**
   - Ensure `pg_cron` extension is enabled
   - Check cron job is scheduled correctly
   - Review cron job execution logs

### Debug Commands
```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- View scheduled jobs
SELECT * FROM cron.job;

-- Check recent job runs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Customization

### Email Frequency
To change the schedule, update the cron expression in the migration:
```sql
-- Change to daily at 8 AM UTC
'0 8 * * *'

-- Change to every 3 days at 10 AM UTC
'0 10 */3 * *'
```

### Email Content
Modify the `generateWeeklyDeadlineEmail()` function in the Edge Function to:
- Change styling and colors
- Add/remove sections
- Modify urgency thresholds
- Update branding elements

### Deadline Filtering
Adjust the deadline filtering logic in `getUsersWithUpcomingDeadlines()`:
- Change the 60-day lookahead period
- Modify urgency level calculations
- Add additional filtering criteria

## Security Considerations

- Function uses service role key for database access
- Email addresses are validated before sending
- Rate limiting prevents email spam
- CORS headers properly configured
- SQL injection protection through parameterized queries

## Performance Optimization

- Efficient database queries with proper indexing
- Batch processing with small delays to avoid rate limits
- Minimal memory footprint with streaming data processing
- Error handling prevents function crashes

## Cost Estimation

- **Supabase Edge Functions**: ~$0.10 per 1M requests
- **Resend**: $20/month for 50k emails
- **Database queries**: Minimal cost with efficient queries
- **Total estimated cost**: ~$20-25/month for moderate usage
