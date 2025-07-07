#!/bin/bash

# FBMS Staging Deploy Script
# Usage: ./scripts/deploy-staging.sh [commit-message]
# Example: ./scripts/deploy-staging.sh "test new feature"

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Get commit message or use default
COMMIT_MSG="${1:-Staging update $(date +'%Y-%m-%d %H:%M')}"

header "🚀 FBMS Staging Deploy Script"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "Please run this script from the project root directory"
    exit 1
fi

# Check if git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "Not in a git repository!"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
log "Current branch: $CURRENT_BRANCH"

# 1. CHECK FOR CHANGES
header "📋 Checking for changes..."
if git diff-index --quiet HEAD --; then
    warn "No changes to commit. Skipping git push..."
    SKIP_PUSH=true
else
    log "Changes detected, proceeding with commit and push..."
    SKIP_PUSH=false
fi

# 2. GIT WORKFLOW (if changes exist)
if [ "$SKIP_PUSH" = false ]; then
    header "📦 Git Workflow"
    
    # Show what will be committed
    log "Files to be committed:"
    git status --short
    
    # Add all changes
    log "Adding all changes..."
    git add .
    
    # Commit
    log "Committing with message: '$COMMIT_MSG'"
    git commit -m "$COMMIT_MSG"
    
    # Push to GitHub
    log "Pushing to GitHub..."
    git push origin "$CURRENT_BRANCH"
    
    log "✅ Successfully pushed to GitHub!"
else
    log "⏭️  Skipping git push (no changes)"
fi

# 3. BUILD & DEPLOY TO STAGING
header "🏗️  Building and Deploying to Staging"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    error "Netlify CLI not found!"
    echo "Install with: npm install -g netlify-cli"
    exit 1
fi

# Check if logged into Netlify
if ! netlify status &> /dev/null; then
    warn "Not logged into Netlify. Running 'netlify login'..."
    netlify login
fi

# Build the project
log "Building project for staging..."
npm run build

# Deploy to staging (preview deployment)
log "Deploying to Netlify staging..."
STAGING_URL=$(netlify deploy --dir=dist --json | grep -o '"url":"[^"]*"' | sed 's/"url":"//g' | sed 's/"//g')

# 4. SUMMARY
header "🎉 Staging Deployment Complete!"

if [ "$SKIP_PUSH" = false ]; then
    log "✅ Code pushed to GitHub: $CURRENT_BRANCH"
    log "📝 Commit: $COMMIT_MSG"
fi

log "🌐 Deployed to Netlify Staging"
log "🔗 Staging URL: $STAGING_URL"

# Show repository info
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "No remote origin")
log "📁 Repository: $REPO_URL"

# Show recent commits
log "📊 Recent commits:"
git log --oneline -3

# Instructions for next steps
header "📋 Next Steps"
log "1. Test your changes at: $STAGING_URL"
log "2. If everything looks good, run: ./scripts/deploy-production.sh"
log "3. Or merge to main branch for automatic production deployment"

header "✨ Staging Deployment Complete!" 