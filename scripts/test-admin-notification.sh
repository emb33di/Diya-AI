#!/bin/bash

# Script to test the admin signup notification system
# Usage: ./scripts/test-admin-notification.sh

set -e

echo "🧪 Testing Admin Signup Notification System..."
echo ""

# Get Supabase project details
PROJECT_REF="oliclbcxukqddxlfxuuc"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get anon key (you'll need to set this)
echo -e "${YELLOW}Enter your Supabase Anon Key:${NC}"
echo "(Find it at: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api)"
read -r ANON_KEY

if [ -z "$ANON_KEY" ]; then
    echo -e "${RED}Error: Anon key is required${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Testing edge function with sample data...${NC}"
echo ""

# Test payload
TEST_PAYLOAD='{
  "userId": "test-user-'$(date +%s)'",
  "email": "test.user@example.com",
  "fullName": "Test User",
  "applyingTo": "undergraduate",
  "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

echo "Sending request to: ${SUPABASE_URL}/functions/v1/send-admin-signup-notification"
echo ""

# Make the request
response=$(curl -s -w "\n%{http_code}" \
  --request POST "${SUPABASE_URL}/functions/v1/send-admin-signup-notification" \
  --header "Authorization: Bearer ${ANON_KEY}" \
  --header "Content-Type: application/json" \
  --data "${TEST_PAYLOAD}")

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)
# Extract response body (all but last line)
response_body=$(echo "$response" | head -n-1)

echo "Response Body:"
echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
echo ""
echo "HTTP Status Code: $http_code"
echo ""

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Test successful!${NC}"
    echo ""
    echo "Check mihir@meetdiya.com for a test email with subject:"
    echo "  '🎉 New User Signup: Test User'"
else
    echo -e "${RED}❌ Test failed with status code: $http_code${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Check that the edge function is deployed"
    echo "  - Verify RESEND_API_KEY is set in Supabase secrets"
    echo "  - Verify RESEND_FROM is set in Supabase secrets"
    echo "  - Check edge function logs: supabase functions logs send-admin-signup-notification"
fi

echo ""
echo -e "${BLUE}To view edge function logs:${NC}"
echo "  supabase functions logs send-admin-signup-notification --tail"

