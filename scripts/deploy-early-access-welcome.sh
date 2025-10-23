#!/bin/bash

# Deploy Early Access Welcome Email Function
# This script deploys the send-early-access-welcome edge function

set -e

echo "🚀 Deploying Early Access Welcome Email Function..."

# Check if we're in the right directory
if [ ! -f "supabase/functions/send-early-access-welcome/index.ts" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Expected file: supabase/functions/send-early-access-welcome/index.ts"
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "   Install it from: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if user is logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Error: Not logged in to Supabase"
    echo "   Run: supabase login"
    exit 1
fi

echo "📦 Deploying send-early-access-welcome function..."

# Deploy the function
supabase functions deploy send-early-access-welcome

echo "✅ Early access welcome email function deployed successfully!"
echo ""
echo "📧 Function Details:"
echo "   • Function Name: send-early-access-welcome"
echo "   • URL: https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/send-early-access-welcome"
echo "   • Purpose: Sends welcome emails to early access users"
echo ""
echo "🔧 Required Environment Variables (should already be set):"
echo "   • RESEND_API_KEY: Your Resend API key"
echo "   • RESEND_FROM: mihir@meetdiya.com"
echo ""
echo "🧪 To test the function:"
echo "   curl -X POST 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/send-early-access-welcome' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "     -d '{"
echo "       \"email\": \"test@example.com\","
echo "       \"firstName\": \"Test\","
echo "       \"programType\": \"undergraduate\","
echo "       \"trialEndDate\": \"2025-02-15T00:00:00.000Z\""
echo "     }'"
echo ""
echo "🎉 Early access users will now receive welcome emails!"
