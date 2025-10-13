#!/bin/bash

# Script to deploy admin signup notification system
# Usage: ./scripts/deploy-admin-notifications.sh

set -e

echo "🚀 Deploying Admin Signup Notification System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Deploy Edge Function
echo -e "${BLUE}Step 1: Deploying edge function...${NC}"
supabase functions deploy send-admin-signup-notification

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Edge function deployed successfully${NC}"
else
    echo -e "${YELLOW}⚠ Edge function deployment failed${NC}"
    exit 1
fi

echo ""

# Step 2: Apply Database Migration
echo -e "${BLUE}Step 2: Applying database migration...${NC}"
supabase db push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migration applied successfully${NC}"
else
    echo -e "${YELLOW}⚠ Database migration failed${NC}"
    exit 1
fi

echo ""

# Step 3: Check pg_net extension
echo -e "${BLUE}Step 3: Checking pg_net extension...${NC}"
echo -e "${YELLOW}Please manually verify pg_net is enabled in your Supabase Dashboard:${NC}"
echo "  1. Go to: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/database/extensions"
echo "  2. Search for 'pg_net'"
echo "  3. Enable it if not already enabled"
echo ""
echo "Or run this SQL in the SQL Editor:"
echo "  CREATE EXTENSION IF NOT EXISTS pg_net;"

echo ""

# Step 4: Verify environment variables
echo -e "${BLUE}Step 4: Verifying environment variables...${NC}"
echo -e "${YELLOW}Make sure these secrets are set in your Supabase project:${NC}"
echo "  - RESEND_API_KEY"
echo "  - RESEND_FROM"
echo ""
echo "Check at: https://supabase.com/dashboard/project/oliclbcxukqddxlfxuuc/settings/functions"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Enable pg_net extension (see Step 3 above)"
echo "  2. Test the system by creating a test user account"
echo "  3. Check mihir@meetdiya.com for the notification email"
echo ""
echo "For testing and troubleshooting, see: ADMIN_SIGNUP_NOTIFICATIONS_GUIDE.md"

