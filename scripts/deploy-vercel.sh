#!/bin/bash

# Enhanced FBMS Vercel-Only Deploy Script
# Usage: ./scripts/deploy-vercel.sh [commit-message] [--production] [--skip-git] [--force-push]
# Examples:
#   ./scripts/deploy-vercel.sh "test deployment"
#   ./scripts/deploy-vercel.sh "hotfix" --production
#   ./scripts/deploy-vercel.sh "update" --skip-git --production

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
PRODUCTION=false
SKIP_GIT=false
FORCE_PUSH=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --production|-p)
            PRODUCTION=true
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
            echo "Enhanced FBMS Vercel-Only Deploy Script"
            echo "Usage: $0 [commit-message] [options]"
            echo ""
            echo "Options:"
            echo "  --production, -p     Deploy to production (default: preview)"
            echo "  --skip-git          Skip git operations"
            echo "  --force-push        Force push to remote"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 'test deployment'"
            echo "  $0 'hotfix' --production"
            echo "  $0 'update' --skip-git --production"
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

# Set default commit message if not provided
if [ -z "$COMMIT_MSG" ]; then
    if [ "$PRODUCTION" = true ]; then
        COMMIT_MSG="Vercel production deployment $(date +'%Y-%m-%d %H:%M')"
    else
        COMMIT_MSG="Vercel preview deployment $(date +'%Y-%m-%d %H:%M')"
    fi
fi

# Vercel deployment functions
deploy_to_vercel_preview() {
    log "⚡ Deploying to Vercel preview..."
    
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

    # Deploy to preview
    log "Creating Vercel preview deployment..."
    VERCEL_OUTPUT=$(vercel --yes 2>&1)
    
    if [ $? -eq 0 ]; then
        VERCEL_URL=$(echo "$VERCEL_OUTPUT" | grep -o 'https://[^[:space:]]*' | tail -1)
        log "✅ Vercel preview deployment successful!"
        log "🔗 Preview URL: $VERCEL_URL"
        
        # Export for summary
        export VERCEL_PREVIEW_URL="$VERCEL_URL"
    else
        error "Vercel preview deployment failed!"
        error "$VERCEL_OUTPUT"
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
        export VERCEL_PROD_URL="$VERCEL_URL"
    else
        error "Vercel production deployment failed!"
        error "$VERCEL_OUTPUT"
        return 1
    fi
}

deploy_to_vercel() {
    if [ "$PRODUCTION" = true ]; then
        deploy_to_vercel_production
    else
        deploy_to_vercel_preview
    fi
}

header "🚀 FBMS Vercel Deploy Script"
if [ "$PRODUCTION" = true ]; then
    log "Mode: Production Deployment"
else
    log "Mode: Preview Deployment"
fi
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

# Production deployment safety checks
if [ "$PRODUCTION" = true ]; then
    warn "⚠️  VERCEL PRODUCTION DEPLOYMENT WARNING ⚠️"
    log "You are about to deploy to Vercel PRODUCTION environment"
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

    # Confirmation prompt
    echo
    warn "🚨 FINAL CONFIRMATION REQUIRED 🚨"
    read -p "Deploy to Vercel PRODUCTION? Type 'DEPLOY' to confirm: " -r CONFIRMATION
    if [ "$CONFIRMATION" != "DEPLOY" ]; then
        log "Deployment cancelled by user."
        exit 1
    fi
fi

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

# 3. BUILD & DEPLOY TO VERCEL
header "🏗️  Building and Deploying to Vercel"

# Build the project
log "Building project for deployment..."
if ! npm run build; then
    error "Build failed!"
    exit 1
fi

# Deploy to Vercel
deploy_to_vercel

# 4. SUMMARY
header "🎉 Vercel Deployment Complete!"

if [ "$SKIP_GIT" = false ]; then
    log "✅ Code pushed to GitHub: $CURRENT_BRANCH"
    log "📝 Commit: $COMMIT_MSG"
fi

if [ "$PRODUCTION" = true ]; then
    log "🌐 Deployed to Vercel Production"
    if [ -n "$VERCEL_PROD_URL" ]; then
        log "🔗 Production URL: $VERCEL_PROD_URL"
    fi
else
    log "🌐 Deployed to Vercel Preview"
    if [ -n "$VERCEL_PREVIEW_URL" ]; then
        log "🔗 Preview URL: $VERCEL_PREVIEW_URL"
    fi
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
if [ "$PRODUCTION" = true ]; then
    if [ -n "$VERCEL_PROD_URL" ]; then
        log "1. Test production site at: $VERCEL_PROD_URL"
    fi
    log "2. Monitor deployment logs in Vercel dashboard"
    log "3. Verify all features are working correctly"
    log "4. Update DNS settings if needed"
else
    if [ -n "$VERCEL_PREVIEW_URL" ]; then
        log "1. Test preview site at: $VERCEL_PREVIEW_URL"
    fi
    log "2. If everything looks good, run: ./scripts/deploy-vercel.sh --production"
    log "3. Or use the multi-platform script: ./scripts/deploy-production.sh --platform=vercel"
fi

header "✨ Vercel Deployment Complete!"