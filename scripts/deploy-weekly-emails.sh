#!/bin/bash

# Deploy Weekly Deadline Emails System
# This script deploys the Edge Function and sets up the cron job

set -e

echo "🚀 Deploying Weekly Deadline Emails System..."

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "📋 Checking environment variables..."

# Check if required environment variables are set
if [ -z "$RESEND_API_KEY" ]; then
    echo "⚠️  Warning: RESEND_API_KEY environment variable is not set"
    echo "   Please set it in your Supabase project dashboard under Settings > Edge Functions"
fi

if [ -z "$RESEND_FROM" ]; then
    echo "⚠️  Warning: RESEND_FROM environment variable is not set"
    echo "   Please set it in your Supabase project dashboard under Settings > Edge Functions"
fi

echo "🔧 Deploying Edge Function..."

# Deploy the weekly deadline emails function
supabase functions deploy weekly-deadline-emails

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Error: Failed to deploy Edge Function"
    exit 1
fi

echo "🗄️  Applying database migration..."

# Apply the cron job migration
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migration applied successfully"
else
    echo "❌ Error: Failed to apply database migration"
    exit 1
fi

echo "🧪 Testing the function..."

# Test the function with manual trigger
PROJECT_URL=$(grep 'project_id' supabase/config.toml | cut -d'"' -f2)
FUNCTION_URL="https://${PROJECT_URL}.supabase.co/functions/v1/weekly-deadline-emails"

echo "Testing function at: ${FUNCTION_URL}?manual=true"

# Note: This would require an API key to test, so we'll just show the command
echo "📝 To test manually, run:"
echo "   curl -X GET '${FUNCTION_URL}?manual=true' \\"
echo "     -H 'Authorization: Bearer YOUR_ANON_KEY'"

echo ""
echo "🎉 Weekly Deadline Emails System deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Set environment variables in Supabase Dashboard:"
echo "      - RESEND_API_KEY"
echo "      - RESEND_FROM"
echo "   2. Test the function manually using the curl command above"
echo "   3. Monitor the cron job in Supabase Dashboard > Database > Cron Jobs"
echo "   4. Check Edge Function logs for execution details"
echo ""
echo "📅 The cron job is scheduled to run every Monday at 9:00 AM UTC"
echo "📧 Emails will be sent to users with upcoming deadlines (within 60 days)"
echo ""
echo "🔍 To monitor:"
echo "   - Cron jobs: SELECT * FROM cron.job WHERE jobname = 'weekly-deadline-emails';"
echo "   - Execution history: SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'weekly-deadline-emails');"
echo "   - Edge Function logs: Supabase Dashboard > Edge Functions > Logs"
