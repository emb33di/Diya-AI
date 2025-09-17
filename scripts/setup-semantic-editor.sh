#!/bin/bash

# Setup Script for Semantic Editor Architecture
# This script sets up the new semantic document system

set -e

echo "🚀 Setting up Semantic Editor Architecture..."

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
if [ -z "$GOOGLE_API_KEY" ]; then
    echo "⚠️  Warning: GOOGLE_API_KEY environment variable is not set"
    echo "   Please set it in your Supabase project dashboard under Settings > Edge Functions"
fi

echo "🗄️  Applying database migration..."

# Apply the semantic documents migration
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migration applied successfully"
else
    echo "❌ Error: Failed to apply database migration"
    exit 1
fi

echo "🔧 Deploying Edge Function..."

# Deploy the semantic comments function
supabase functions deploy generate-semantic-comments

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Error: Failed to deploy Edge Function"
    exit 1
fi

echo "🧪 Testing the setup..."

# Test if the new tables exist
echo "Checking if semantic_documents table exists..."
supabase db diff --schema public --file /dev/null 2>/dev/null | grep -q "semantic_documents" && echo "✅ semantic_documents table found" || echo "⚠️  semantic_documents table not found"

echo "Checking if semantic_annotations table exists..."
supabase db diff --schema public --file /dev/null 2>/dev/null | grep -q "semantic_annotations" && echo "✅ semantic_annotations table found" || echo "⚠️  semantic_annotations table not found"

echo ""
echo "🎉 Semantic Editor Architecture setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start your development server: npm run dev"
echo "   2. Navigate to the Essays page"
echo "   3. Create or select an essay to see the new semantic editor"
echo "   4. Try generating AI comments - they should now be stable!"
echo ""
echo "🔍 To test the new system:"
echo "   - Visit /semantic-editor-demo for a demo page"
echo "   - Create a new essay and try the AI commenting feature"
echo "   - Comments should no longer 'drift' from their targets"
echo ""
echo "📚 For more information, see SEMANTIC_ARCHITECTURE_README.md"
