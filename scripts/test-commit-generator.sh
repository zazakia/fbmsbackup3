#!/bin/bash

# Test script for commit message generator
# This script demonstrates the auto-generated commit messages

echo "🧪 Testing Auto-Generated Commit Messages"
echo "=========================================="

# Load the commit message generator
source "$(dirname "$0")/utils/commit-message-generator.sh" 2>/dev/null || {
    echo "❌ Could not load commit message generator"
    exit 1
}

echo "✅ Loaded commit message generator"
echo ""

# Test different scenarios
echo "📋 Testing different commit message scenarios:"
echo ""

# Test 1: Basic auto-generation
echo "1. Basic auto-generation (current changes):"
if git rev-parse --git-dir > /dev/null 2>&1; then
    BASIC_MSG=$(generate_smart_commit_message)
    echo "   Generated: '$BASIC_MSG'"
else
    echo "   ⚠️  Not in git repository - skipping"
fi
echo ""

# Test 2: Feature branch simulation
echo "2. Feature branch style:"
FEATURE_MSG=$(generate_commit_message "" "feature")
echo "   Generated: '$FEATURE_MSG'"
echo ""

# Test 3: Fix branch simulation
echo "3. Fix branch style:"
FIX_MSG=$(generate_commit_message "" "fix")
echo "   Generated: '$FIX_MSG'"
echo ""

# Test 4: Release branch simulation
echo "4. Release branch style:"
RELEASE_MSG=$(generate_commit_message "" "release")
echo "   Generated: '$RELEASE_MSG'"
echo ""

# Test 5: Update branch simulation
echo "5. Update branch style:"
UPDATE_MSG=$(generate_commit_message "" "update")
echo "   Generated: '$UPDATE_MSG'"
echo ""

# Test 6: Custom message override
echo "6. Custom message override:"
CUSTOM_MSG=$(generate_smart_commit_message "My custom commit message")
echo "   Generated: '$CUSTOM_MSG'"
echo ""

echo "✨ All tests completed!"
echo ""
echo "📝 How to use in your workflow:"
echo "   - Run any deployment script without a commit message"
echo "   - The script will auto-generate an intelligent message"
echo "   - You can confirm or provide your own message"
echo ""
echo "🚀 Examples:"
echo "   ./scripts/deploy-staging.sh                    # Auto-generates message"
echo "   ./scripts/deploy-production.sh                 # Auto-generates message"
echo "   ./scripts/git-workflow.sh                      # Auto-generates with confirmation"
echo "   ./scripts/deploy-vercel.sh --production        # Auto-generates message"