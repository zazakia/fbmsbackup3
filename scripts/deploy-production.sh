#!/bin/bash

# FBMS Production Deploy Script
# Usage: ./scripts/deploy-production.sh [commit-message]
# Example: ./scripts/deploy-production.sh "release v2.1.0"

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
COMMIT_MSG="${1:-Production release $(date +'%Y-%m-%d %H:%M')}"

header "🚀 FBMS Production Deploy Script"

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

# Safety check for production deployment
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    warn "⚠️  You're deploying from branch: $CURRENT_BRANCH"
    warn "⚠️  Production deployments should typically be from main/master branch"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled."
        exit 1
    fi
fi

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

# 3. BUILD & DEPLOY TO PRODUCTION
header "🏗️  Building and Deploying to Production"

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
log "Building project for production..."
npm run build

# Deploy to production
log "Deploying to Netlify production..."
PRODUCTION_URL=$(netlify deploy --prod --dir=dist --json | grep -o '"url":"[^"]*"' | sed 's/"url":"//g' | sed 's/"//g')

# 4. SUMMARY
header "🎉 Production Deployment Complete!"

if [ "$SKIP_PUSH" = false ]; then
    log "✅ Code pushed to GitHub: $CURRENT_BRANCH"
    log "📝 Commit: $COMMIT_MSG"
fi

log "🌐 Deployed to Netlify Production"
log "🔗 Production URL: $PRODUCTION_URL"

# Show repository info
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "No remote origin")
log "📁 Repository: $REPO_URL"

# Show recent commits
log "📊 Recent commits:"
git log --oneline -3

# Create a git tag for this release
header "🏷️  Creating Release Tag"
TAG_NAME="v$(date +'%Y.%m.%d-%H%M')"
log "Creating tag: $TAG_NAME"
git tag -a "$TAG_NAME" -m "Production release: $COMMIT_MSG"
git push origin "$TAG_NAME"
log "✅ Tag created and pushed: $TAG_NAME"

# Instructions for monitoring
header "📋 Post-Deployment Checklist"
log "1. ✅ Verify the site is working at: $PRODUCTION_URL"
log "2. ✅ Check all major features are functional"
log "3. ✅ Monitor error logs in Netlify dashboard"
log "4. ✅ Test user authentication and permissions"
log "5. ✅ Verify database connections are working"

header "✨ Production Deployment Complete!" 