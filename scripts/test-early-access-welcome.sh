#!/bin/bash

# Test Early Access Welcome Email Function
# This script tests the send-early-access-welcome edge function

set -e

echo "🧪 Testing Early Access Welcome Email Function..."

# Function URL
FUNCTION_URL="https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/send-early-access-welcome"

# Test data
TEST_EMAIL="test@example.com"
TEST_FIRST_NAME="Test"
TEST_PROGRAM_TYPE="undergraduate"
TEST_TRIAL_END_DATE="2025-02-15T00:00:00.000Z"

echo "📧 Sending test email to: $TEST_EMAIL"
echo "👤 First name: $TEST_FIRST_NAME"
echo "🎓 Program type: $TEST_PROGRAM_TYPE"
echo "📅 Trial end date: $TEST_TRIAL_END_DATE"
echo ""

# Make the test request
echo "🚀 Making test request..."

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"firstName\": \"$TEST_FIRST_NAME\",
    \"programType\": \"$TEST_PROGRAM_TYPE\",
    \"trialEndDate\": \"$TEST_TRIAL_END_DATE\"
  }")

# Extract HTTP code and response body
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE:/d')

echo "📊 Response:"
echo "   HTTP Code: $HTTP_CODE"
echo "   Body: $RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Test successful! Email should have been sent."
    echo "   Check the email logs in Supabase dashboard for confirmation."
else
    echo "❌ Test failed with HTTP code: $HTTP_CODE"
    echo "   Response: $RESPONSE_BODY"
    exit 1
fi

echo ""
echo "🔍 To check email logs:"
echo "   supabase functions logs send-early-access-welcome --tail"
echo ""
echo "📧 To test with real email:"
echo "   Replace test@example.com with your actual email address"
