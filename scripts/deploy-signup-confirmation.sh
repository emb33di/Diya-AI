#!/bin/bash

# Deploy Signup Confirmation Email Function
# This script deploys the Edge Function for sending signup confirmation emails

set -e

echo "🚀 Deploying Signup Confirmation Email Function..."

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

# Deploy the signup confirmation function
supabase functions deploy send-signup-confirmation

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Error: Failed to deploy Edge Function"
    exit 1
fi

echo "🧪 Testing the function..."

# Get project URL for testing
PROJECT_URL=$(grep 'project_id' supabase/config.toml | cut -d'"' -f2)
FUNCTION_URL="https://${PROJECT_URL}.supabase.co/functions/v1/send-signup-confirmation"

echo "📝 To test manually, run:"
echo "   curl -X POST '${FUNCTION_URL}' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "     -d '{\"email\":\"test@example.com\",\"firstName\":\"John\"}'"

echo ""
echo "🎉 Signup Confirmation Email Function deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Set environment variables in Supabase Dashboard:"
echo "      - RESEND_API_KEY"
echo "      - RESEND_FROM"
echo "   2. Update your Auth.tsx to call this function after successful signup"
echo "   3. Test the function manually using the curl command above"
echo ""
echo "📧 The function will send confirmation emails with:"
echo "   - Same styling as your weekly deadline emails"
echo "   - 'Confirm Your Email' button that navigates to https://www.meetdiya.com/auth"
echo "   - Professional Diya AI branding"
echo ""
echo "🔍 To monitor:"
echo "   - Edge Function logs: Supabase Dashboard > Edge Functions > Logs"
echo "   - Resend dashboard: https://resend.com/emails"
