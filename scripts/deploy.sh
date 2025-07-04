#!/bin/bash

# FBMS One-Command Deploy Script
# Usage: ./scripts/deploy.sh [commit-message]
# Example: ./scripts/deploy.sh "add new feature"

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Get commit message or use default
COMMIT_MSG="${1:-Update FBMS project $(date +'%Y-%m-%d %H:%M')}"

header "🚀 FBMS Deploy Script"

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

# 3. BUILD & DEPLOY TO NETLIFY
header "🏗️  Building and Deploying"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    error "Netlify CLI not found!"
    echo "Install with: npm install -g netlify-cli"
    echo "Or use manual deploy: npm run deploy"
    exit 1
fi

# Check if logged into Netlify
if ! netlify status &> /dev/null; then
    warn "Not logged into Netlify. Running 'netlify login'..."
    netlify login
fi

# Build the project
log "Building project..."
npm run build

# Deploy to Netlify
log "Deploying to Netlify..."
netlify deploy --prod --dir=dist

# 4. SUMMARY
header "🎉 Deployment Complete!"

if [ "$SKIP_PUSH" = false ]; then
    log "✅ Code pushed to GitHub: $CURRENT_BRANCH"
    log "📝 Commit: $COMMIT_MSG"
fi

log "🌐 Deployed to Netlify"
log "📊 Recent commits:"
git log --oneline -3

# Show repository info
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "No remote origin")
log "📁 Repository: $REPO_URL"

# Get Netlify site URL
SITE_URL=$(netlify status --json 2>/dev/null | grep -o '"url":"[^"]*"' | sed 's/"url":"//g' | sed 's/"//g' || echo "Check Netlify dashboard")
log "🔗 Live site: $SITE_URL"

# Suggest PR if not on main
if [ "$CURRENT_BRANCH" != "main" ] && [ "$SKIP_PUSH" = false ]; then
    warn "💡 Consider creating a pull request:"
    echo "   https://github.com/your-username/your-repo/compare/main...$CURRENT_BRANCH"
fi

header "✨ All Done!"