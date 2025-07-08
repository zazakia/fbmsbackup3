#!/bin/bash

# Enhanced FBMS Production Deploy Script
# Usage: ./scripts/deploy-production.sh [commit-message] [--platform=netlify|vercel|both] [--skip-git] [--force-push] [--tag] [--confirm]
# Examples:
#   ./scripts/deploy-production.sh "release v2.1.0"
#   ./scripts/deploy-production.sh "hotfix" --platform=vercel --tag
#   ./scripts/deploy-production.sh "update" --platform=both --skip-git --confirm

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
CREATE_TAG=false
REQUIRE_CONFIRMATION=false

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
        --tag)
            CREATE_TAG=true
            shift
            ;;
        --confirm)
            REQUIRE_CONFIRMATION=true
            shift
            ;;
        --help|-h)
            echo "Enhanced FBMS Production Deploy Script"
            echo "Usage: $0 [commit-message] [options]"
            echo ""
            echo "Options:"
            echo "  --platform=TARGET    Deploy to platform (netlify, vercel, both)"
            echo "  --skip-git          Skip git operations"
            echo "  --force-push        Force push to remote"
            echo "  --tag               Create git tag for release"
            echo "  --confirm           Skip confirmation prompt"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 'release v2.1.0'"
            echo "  $0 'hotfix' --platform=vercel --tag"
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
        COMMIT_MSG=$(generate_smart_commit_message "" "release")
        log "Generated message: '$COMMIT_MSG'"
    else
        COMMIT_MSG="Production release $(date +'%Y-%m-%d %H:%M')"
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

# Production deployment functions
deploy_to_netlify_production() {
    log "🌐 Deploying to Netlify production..."
    
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

    # Deploy to production
    log "Deploying to Netlify production..."
    DEPLOY_OUTPUT=$(netlify deploy --prod --dir=dist --json 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        NETLIFY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"//g' | sed 's/"//g')
        log "✅ Netlify production deployment successful!"
        log "🔗 Production URL: $NETLIFY_URL"
        
        # Export for summary
        export PROD_NETLIFY_URL="$NETLIFY_URL"
    else
        error "Netlify production deployment failed!"
        return 1
    fi
}

deploy_to_vercel_production() {
    log "⚡ Deploying to Vercel production..."
    
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

    # Deploy to production
    log "Deploying to Vercel production..."
    VERCEL_OUTPUT=$(vercel --prod --yes 2>&1)
    
    if [ $? -eq 0 ]; then
        VERCEL_URL=$(echo "$VERCEL_OUTPUT" | grep -o 'https://[^[:space:]]*' | tail -1)
        log "✅ Vercel production deployment successful!"
        log "🔗 Production URL: $VERCEL_URL"
        
        # Export for summary
        export PROD_VERCEL_URL="$VERCEL_URL"
    else
        error "Vercel production deployment failed!"
        error "$VERCEL_OUTPUT"
        return 1
    fi
}

deploy_to_production() {
    case $DEPLOY_PLATFORM in
        "netlify")
            deploy_to_netlify_production
            ;;
        "vercel")
            deploy_to_vercel_production
            ;;
        "both")
            deploy_to_netlify_production
            deploy_to_vercel_production
            ;;
    esac
}

header "🚀 FBMS Production Deploy Script"
log "Platform: $DEPLOY_PLATFORM"
log "Skip Git: $SKIP_GIT"
log "Create Tag: $CREATE_TAG"

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

# Safety checks for production deployment
warn "⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️"
log "You are about to deploy to PRODUCTION environment"
log "Platform: $DEPLOY_PLATFORM"
log "Branch: $CURRENT_BRANCH"
log "Commit message: $COMMIT_MSG"

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    warn "⚠️  You're deploying from branch: $CURRENT_BRANCH"
    warn "⚠️  Production deployments should typically be from main/master branch"
fi

# Pre-deployment checks
log "Running pre-deployment checks..."

# Check if tests pass (if test script exists)
if grep -q '"test"' package.json; then
    log "Running tests..."
    if ! npm test; then
        error "Tests failed! Aborting production deployment."
        exit 1
    fi
    log "✅ Tests passed"
fi

# Check if build works
log "Testing build process..."
if ! npm run build; then
    error "Build failed! Aborting production deployment."
    exit 1
fi
log "✅ Build test passed"

# Confirmation prompt (unless --confirm flag is used)
if [ "$REQUIRE_CONFIRMATION" = true ]; then
    echo
    warn "🚨 FINAL CONFIRMATION REQUIRED 🚨"
    read -p "Deploy to PRODUCTION on $DEPLOY_PLATFORM? Type 'DEPLOY' to confirm: " -r CONFIRMATION
    if [ "$CONFIRMATION" != "DEPLOY" ]; then
        log "Deployment cancelled by user."
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

# 2. GIT WORKFLOW (if not skipped and changes exist)
if [ "$SKIP_GIT" = false ] && [ "$SKIP_PUSH" = false ]; then
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
        # Try regular push first
        if ! git push origin "$CURRENT_BRANCH" 2>/dev/null; then
            warn "Push rejected. Attempting to merge remote changes..."
            
            # Fetch and try to merge
            git fetch origin
            if git merge origin/"$CURRENT_BRANCH" --no-edit; then
                log "Merged remote changes successfully. Pushing again..."
                git push origin "$CURRENT_BRANCH"
            else
                error "Merge conflicts detected. Please resolve manually."
                log "Run: git status && git mergetool"
                exit 1
            fi
        fi
    fi
    
    log "✅ Successfully pushed to GitHub!"
elif [ "$SKIP_GIT" = true ]; then
    log "⏭️  Skipping git operations (--skip-git flag)"
else
    log "⏭️  Skipping git push (no changes)"
fi

# 3. BUILD & DEPLOY TO PRODUCTION
header "🏗️  Building and Deploying to Production"

# Build the project
log "Building project for production..."
if ! npm run build; then
    error "Build failed! Aborting production deployment."
    exit 1
fi

# Deploy to selected platform(s)
deploy_to_production

# 4. SUMMARY
header "🎉 Production Deployment Complete!"

if [ "$SKIP_GIT" = false ] && [ "$SKIP_PUSH" = false ]; then
    log "✅ Code pushed to GitHub: $CURRENT_BRANCH"
    log "📝 Commit: $COMMIT_MSG"
fi

log "🌐 Deployed to: $DEPLOY_PLATFORM"

# Show deployment URLs
if [ -n "$PROD_NETLIFY_URL" ]; then
    log "🔗 Netlify Production: $PROD_NETLIFY_URL"
fi

if [ -n "$PROD_VERCEL_URL" ]; then
    log "🔗 Vercel Production: $PROD_VERCEL_URL"
fi

# Show repository info
if [ "$SKIP_GIT" = false ]; then
    REPO_URL=$(git remote get-url origin 2>/dev/null || echo "No remote origin")
    log "📁 Repository: $REPO_URL"
    
    # Show recent commits
    log "📊 Recent commits:"
    git log --oneline -3
fi

# Create a git tag for this release (if enabled)
if [ "$CREATE_TAG" = true ] && [ "$SKIP_GIT" = false ]; then
    header "🏷️  Creating Release Tag"
    TAG_NAME="v$(date +'%Y.%m.%d-%H%M')"
    log "Creating tag: $TAG_NAME"
    git tag -a "$TAG_NAME" -m "Production release: $COMMIT_MSG"
    git push origin "$TAG_NAME"
    log "✅ Tag created and pushed: $TAG_NAME"
fi

# Instructions for monitoring
header "📋 Post-Deployment Checklist"
if [ -n "$PROD_NETLIFY_URL" ]; then
    log "1. ✅ Verify Netlify site is working at: $PROD_NETLIFY_URL"
fi
if [ -n "$PROD_VERCEL_URL" ]; then
    log "1. ✅ Verify Vercel site is working at: $PROD_VERCEL_URL"
fi
log "2. ✅ Check all major features are functional"
log "3. ✅ Monitor error logs in platform dashboard"
log "4. ✅ Test user authentication and permissions"
log "5. ✅ Verify database connections are working"

header "✨ Production Deployment Complete!" 