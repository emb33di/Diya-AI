#!/bin/bash

# Test Weekly Deadline Emails Function
# This script tests the Edge Function with sample data

set -e

echo "🧪 Testing Weekly Deadline Emails Function..."

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Get project URL from config
PROJECT_URL=$(grep 'project_id' supabase/config.toml | cut -d'"' -f2)
FUNCTION_URL="https://${PROJECT_URL}.supabase.co/functions/v1/weekly-deadline-emails"

echo "📋 Function URL: ${FUNCTION_URL}"

# Check if we have an API key
if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Warning: SUPABASE_ANON_KEY environment variable is not set"
    echo "   You can find this in your Supabase project dashboard under Settings > API"
    echo "   Or you can test manually using the Supabase dashboard"
    echo ""
    echo "📝 Manual testing command:"
    echo "   curl -X GET '${FUNCTION_URL}?manual=true' \\"
    echo "     -H 'Authorization: Bearer YOUR_ANON_KEY'"
    echo ""
    echo "🔗 Or test via Supabase Dashboard:"
    echo "   1. Go to Edge Functions > weekly-deadline-emails"
    echo "   2. Click 'Invoke function'"
    echo "   3. Use method: GET"
    echo "   4. Add query parameter: manual=true"
    echo "   5. Click 'Invoke'"
    exit 0
fi

echo "🚀 Testing function with manual trigger..."

# Test the function
RESPONSE=$(curl -s -X GET "${FUNCTION_URL}?manual=true" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")

echo "📊 Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Check if the response indicates success
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ Function test completed successfully!"
    echo ""
    echo "📈 Expected stats in response:"
    echo "   - total_users: Number of users with upcoming deadlines"
    echo "   - emails_sent: Number of emails successfully sent"
    echo "   - emails_failed: Number of emails that failed to send"
    echo "   - users_with_upcoming_deadlines: Users who received emails"
else
    echo ""
    echo "❌ Function test failed or returned an error"
    echo "   Check the response above for error details"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check Edge Function logs in Supabase Dashboard"
    echo "   2. Verify environment variables are set correctly"
    echo "   3. Ensure Resend API key is valid"
    echo "   4. Check that users have school recommendations with deadlines"
fi

echo ""
echo "📋 Additional testing options:"
echo "   1. Check cron job status:"
echo "      SELECT * FROM cron.job WHERE jobname = 'weekly-deadline-emails';"
echo ""
echo "   2. View recent cron executions:"
echo "      SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'weekly-deadline-emails') ORDER BY start_time DESC LIMIT 5;"
echo ""
echo "   3. Check Edge Function logs:"
echo "      Supabase Dashboard > Edge Functions > weekly-deadline-emails > Logs"
echo ""
echo "   4. Verify email delivery:"
echo "      Check Resend dashboard for sent emails"
