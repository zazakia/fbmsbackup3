#!/bin/bash

# Enhanced FBMS Staging Deploy Script
# Usage: ./scripts/deploy-staging.sh [commit-message] [--platform=netlify|vercel|both] [--skip-git] [--force-push]
# Examples:
#   ./scripts/deploy-staging.sh "test new feature"
#   ./scripts/deploy-staging.sh "fix bug" --platform=vercel
#   ./scripts/deploy-staging.sh "update" --platform=both --skip-git

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

# Default values
COMMIT_MSG=""
DEPLOY_PLATFORM="netlify"
SKIP_GIT=false
FORCE_PUSH=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --platform=*)
            DEPLOY_PLATFORM="${1#*=}"
            shift
            ;;
        --skip-git)
            SKIP_GIT=true
            shift
            ;;
        --force-push)
            FORCE_PUSH=true
            shift
            ;;
        --help|-h)
            echo "Enhanced FBMS Staging Deploy Script"
            echo "Usage: $0 [commit-message] [options]"
            echo ""
            echo "Options:"
            echo "  --platform=TARGET    Deploy to platform (netlify, vercel, both)"
            echo "  --skip-git          Skip git operations"
            echo "  --force-push        Force push to remote"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 'test new feature'"
            echo "  $0 'fix bug' --platform=vercel"
            echo "  $0 'update' --platform=both --skip-git"
            exit 0
            ;;
        *)
            if [ -z "$COMMIT_MSG" ]; then
                COMMIT_MSG="$1"
            fi
            shift
            ;;
    esac
done

# Load commit message generator
source "$(dirname "$0")/utils/commit-message-generator.sh" 2>/dev/null || {
    warn "Commit message generator not found. Using default message."
}

# Set default commit message if not provided
if [ -z "$COMMIT_MSG" ]; then
    if command -v generate_smart_commit_message &> /dev/null; then
        log "Auto-generating commit message..."
        COMMIT_MSG=$(generate_smart_commit_message "" "staging")
        log "Generated message: '$COMMIT_MSG'"
    else
        COMMIT_MSG="Staging update $(date +'%Y-%m-%d %H:%M')"
    fi
fi

# Validate platform
case $DEPLOY_PLATFORM in
    netlify|vercel|both)
        ;;
    *)
        error "Invalid platform: $DEPLOY_PLATFORM"
        log "Supported platforms: netlify, vercel, both"
        exit 1
        ;;
esac

# Deployment functions
deploy_to_netlify_staging() {
    log "🌐 Deploying to Netlify staging..."
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        warn "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi

    # Check authentication
    if ! netlify status &> /dev/null; then
        warn "Not logged into Netlify. Please authenticate..."
        netlify login
    fi

    # Deploy to staging (preview deployment)
    log "Creating Netlify preview deployment..."
    DEPLOY_OUTPUT=$(netlify deploy --dir=dist --json 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        NETLIFY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o '"deploy_url":"[^"]*"' | head -1 | sed 's/"deploy_url":"//g' | sed 's/"//g')
        NETLIFY_PREVIEW=$(echo "$DEPLOY_OUTPUT" | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"//g' | sed 's/"//g')
        log "✅ Netlify staging deployment successful!"
        log "🔗 Preview URL: $NETLIFY_PREVIEW"
        log "📋 Deploy URL: $NETLIFY_URL"
        
        # Export for summary
        export STAGING_NETLIFY_URL="$NETLIFY_PREVIEW"
    else
        error "Netlify staging deployment failed!"
        return 1
    fi
}

deploy_to_vercel_staging() {
    log "⚡ Deploying to Vercel staging..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        warn "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi

    # Check authentication
    if ! vercel whoami &> /dev/null; then
        warn "Not logged into Vercel. Please authenticate..."
        vercel login
    fi

    # Deploy to staging (preview deployment)
    log "Creating Vercel preview deployment..."
    VERCEL_OUTPUT=$(vercel --yes 2>&1)
    
    if [ $? -eq 0 ]; then
        VERCEL_URL=$(echo "$VERCEL_OUTPUT" | grep -o 'https://[^[:space:]]*' | tail -1)
        log "✅ Vercel staging deployment successful!"
        log "🔗 Preview URL: $VERCEL_URL"
        
        # Export for summary
        export STAGING_VERCEL_URL="$VERCEL_URL"
    else
        error "Vercel staging deployment failed!"
        error "$VERCEL_OUTPUT"
        return 1
    fi
}

deploy_to_staging() {
    case $DEPLOY_PLATFORM in
        "netlify")
            deploy_to_netlify_staging
            ;;
        "vercel")
            deploy_to_vercel_staging
            ;;
        "both")
            deploy_to_netlify_staging
            deploy_to_vercel_staging
            ;;
    esac
}

header "🚀 FBMS Staging Deploy Script"
log "Platform: $DEPLOY_PLATFORM"
log "Skip Git: $SKIP_GIT"

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

# Git workflow (if not skipped)
if [ "$SKIP_GIT" = false ]; then
    # 1. CHECK FOR CHANGES
    header "📋 Checking for changes..."
    
    HAS_CHANGES=false
    if ! git diff-index --quiet HEAD --; then
        HAS_CHANGES=true
    fi
    
    # Check for staged changes
    HAS_STAGED=false
    if ! git diff-index --quiet --cached HEAD --; then
        HAS_STAGED=true
    fi
    
    # Check for untracked files
    HAS_UNTRACKED=false
    if [ -n "$(git ls-files --others --exclude-standard)" ]; then
        HAS_UNTRACKED=true
    fi
    
    if [ "$HAS_CHANGES" = true ] || [ "$HAS_STAGED" = true ] || [ "$HAS_UNTRACKED" = true ]; then
        log "Changes detected, proceeding with commit and push..."
        
        # 2. GIT WORKFLOW
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
        if [ "$FORCE_PUSH" = true ]; then
            warn "Force pushing to remote..."
            git push origin "$CURRENT_BRANCH" --force-with-lease
        else
            git push origin "$CURRENT_BRANCH"
        fi
        
        log "✅ Successfully pushed to GitHub!"
    else
        # Check if we need to push existing commits
        LOCAL=$(git rev-parse HEAD)
        REMOTE=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "")
        
        if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
            if git merge-base --is-ancestor $REMOTE $LOCAL; then
                log "Local branch is ahead of remote. Pushing..."
                if [ "$FORCE_PUSH" = true ]; then
                    git push origin $CURRENT_BRANCH --force-with-lease
                else
                    git push origin $CURRENT_BRANCH
                fi
                log "✅ Successfully pushed to GitHub!"
            else
                warn "No changes to commit and branch is up to date"
            fi
        else
            warn "No changes to commit"
        fi
    fi
else
    log "⏭️  Skipping git operations (--skip-git flag)"
fi

# 3. BUILD & DEPLOY TO STAGING
header "🏗️  Building and Deploying to Staging"

# Build the project
log "Building project for staging..."
if ! npm run build; then
    error "Build failed!"
    exit 1
fi

# Deploy to selected platform(s)
deploy_to_staging

# 4. SUMMARY
header "🎉 Staging Deployment Complete!"

if [ "$SKIP_GIT" = false ]; then
    log "✅ Code pushed to GitHub: $CURRENT_BRANCH"
    log "📝 Commit: $COMMIT_MSG"
fi

log "🌐 Deployed to: $DEPLOY_PLATFORM"

# Show deployment URLs
if [ -n "$STAGING_NETLIFY_URL" ]; then
    log "🔗 Netlify Staging: $STAGING_NETLIFY_URL"
fi

if [ -n "$STAGING_VERCEL_URL" ]; then
    log "🔗 Vercel Staging: $STAGING_VERCEL_URL"
fi

# Show repository info
if [ "$SKIP_GIT" = false ]; then
    REPO_URL=$(git remote get-url origin 2>/dev/null || echo "No remote origin")
    log "📁 Repository: $REPO_URL"
    
    # Show recent commits
    log "📊 Recent commits:"
    git log --oneline -3
fi

# Instructions for next steps
header "📋 Next Steps"
if [ -n "$STAGING_NETLIFY_URL" ]; then
    log "1. Test Netlify staging at: $STAGING_NETLIFY_URL"
fi
if [ -n "$STAGING_VERCEL_URL" ]; then
    log "1. Test Vercel staging at: $STAGING_VERCEL_URL"
fi
log "2. If everything looks good, run: ./scripts/deploy-production.sh --platform=$DEPLOY_PLATFORM"
log "3. Or merge to main branch for automatic production deployment"

header "✨ Staging Deployment Complete!" 