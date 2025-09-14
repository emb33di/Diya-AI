#!/bin/bash

# Deployment script for Editor in Chief agent
# This script deploys the Editor in Chief agent and runs the database migration

set -e  # Exit on any error

echo "🚀 Deploying Editor in Chief Agent"
echo "=================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 Step 1: Deploying Editor in Chief Edge Function..."
supabase functions deploy ai_agent_editor_chief

if [ $? -eq 0 ]; then
    echo "✅ Editor in Chief agent deployed successfully!"
else
    echo "❌ Failed to deploy Editor in Chief agent"
    exit 1
fi

echo ""
echo "📋 Step 2: Running database migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
else
    echo "❌ Database migration failed"
    exit 1
fi

echo ""
echo "📋 Step 3: Updating orchestrator with Editor Chief integration..."
supabase functions deploy generate-essay-comments-orchestrator

if [ $? -eq 0 ]; then
    echo "✅ Orchestrator updated successfully!"
else
    echo "❌ Failed to update orchestrator"
    exit 1
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "✅ Editor in Chief agent deployed"
echo "✅ Database schema updated"
echo "✅ Orchestrator integrated"
echo ""
echo "🧪 Next steps:"
echo "   1. Run the test script: python test_editor_chief_agent.py"
echo "   2. Test in the frontend application"
echo "   3. Monitor agent performance"
echo ""
echo "📚 Documentation:"
echo "   - Agent prompt: supabase/functions/ai_agent_editor_chief/index.ts"
echo "   - Database schema: supabase/migrations/20250116000004_add_editor_chief_agent_type.sql"
echo "   - Test script: test_editor_chief_agent.py"
