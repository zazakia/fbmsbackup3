#!/bin/bash

# Enhanced Git Workflow Script for FBMS
# Usage: ./scripts/git-workflow.sh [commit_message] [branch_name] [--deploy] [--force-push] [--sync]
# Examples:
#   ./scripts/git-workflow.sh "Update features"
#   ./scripts/git-workflow.sh "Fix bug" main --deploy
#   ./scripts/git-workflow.sh --sync  # Sync with remote without committing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to deploy to multiple platforms
deploy_to_platforms() {
    local deploy_target="${1:-netlify}"
    
    print_header "Deploying to $deploy_target"
    
    # Build the project first
    print_status "Building project..."
    if ! npm run build; then
        print_error "Build failed!"
        return 1
    fi
    
    case $deploy_target in
        "netlify")
            deploy_to_netlify
            ;;
        "vercel")
            deploy_to_vercel
            ;;
        "both")
            deploy_to_netlify
            deploy_to_vercel
            ;;
        *)
            print_error "Unknown deployment target: $deploy_target"
            print_status "Supported targets: netlify, vercel, both"
            return 1
            ;;
    esac
}

# Function to deploy to Netlify
deploy_to_netlify() {
    print_status "🌐 Deploying to Netlify..."
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        print_error "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi

    # Check authentication
    if ! netlify status &> /dev/null; then
        print_warning "Not logged into Netlify. Please authenticate..."
        netlify login
    fi

    # Deploy to Netlify
    print_status "Deploying to Netlify production..."
    DEPLOY_OUTPUT=$(netlify deploy --prod --dir=dist --json 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        NETLIFY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"//g' | sed 's/"//g')
        print_status "✅ Netlify deployment successful!"
        print_status "🔗 URL: $NETLIFY_URL"
    else
        print_error "Netlify deployment failed!"
        return 1
    fi
}

# Function to deploy to Vercel
deploy_to_vercel() {
    print_status "⚡ Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi

    # Check authentication
    if ! vercel whoami &> /dev/null; then
        print_warning "Not logged into Vercel. Please authenticate..."
        vercel login
    fi

    # Deploy to Vercel
    print_status "Deploying to Vercel production..."
    VERCEL_OUTPUT=$(vercel --prod --yes 2>&1)
    
    if [ $? -eq 0 ]; then
        VERCEL_URL=$(echo "$VERCEL_OUTPUT" | grep -o 'https://[^[:space:]]*' | tail -1)
        print_status "✅ Vercel deployment successful!"
        print_status "🔗 URL: $VERCEL_URL"
    else
        print_error "Vercel deployment failed!"
        print_error "$VERCEL_OUTPUT"
        return 1
    fi
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository!"
    exit 1
fi

# Parse arguments
COMMIT_MESSAGE=""
BRANCH_NAME=""
SHOULD_DEPLOY=false
FORCE_PUSH=false
SYNC_ONLY=false
AUTO_STASH=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --deploy|-d)
            SHOULD_DEPLOY=true
            shift
            ;;
        --force-push|-f)
            FORCE_PUSH=true
            shift
            ;;
        --sync|-s)
            SYNC_ONLY=true
            shift
            ;;
        --stash)
            AUTO_STASH=true
            shift
            ;;
        --help|-h)
            echo "Enhanced Git Workflow Script"
            echo "Usage: $0 [commit_message] [branch_name] [options]"
            echo ""
            echo "Options:"
            echo "  --deploy, -d     Deploy after successful push"
            echo "  --force-push, -f Force push to remote (use with caution)"
            echo "  --sync, -s       Sync with remote without committing"
            echo "  --stash          Auto-stash uncommitted changes"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 'Update features'"
            echo "  $0 'Fix bug' main --deploy"
            echo "  $0 --sync"
            exit 0
            ;;
        *)
            if [ -z "$COMMIT_MESSAGE" ]; then
                COMMIT_MESSAGE="$1"
            elif [ -z "$BRANCH_NAME" ]; then
                BRANCH_NAME="$1"
            fi
            shift
            ;;
    esac
done

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
print_status "Current branch: $CURRENT_BRANCH"

# Load commit message generator
source "$(dirname "$0")/utils/commit-message-generator.sh" 2>/dev/null || {
    print_warning "Commit message generator not found. Using manual input."
}

# Get commit message from argument or auto-generate
if [ -z "$COMMIT_MESSAGE" ]; then
    if command -v generate_smart_commit_message &> /dev/null; then
        print_status "Auto-generating commit message..."
        COMMIT_MESSAGE=$(generate_smart_commit_message)
        print_status "Generated message: '$COMMIT_MESSAGE'"
        
        # Ask for confirmation
        echo -n "Use this message? (y/N): "
        read -r USE_GENERATED
        if [ "$USE_GENERATED" != "y" ] && [ "$USE_GENERATED" != "Y" ]; then
            echo -n "Enter custom commit message: "
            read COMMIT_MESSAGE
        fi
    else
        echo -n "Enter commit message: "
        read COMMIT_MESSAGE
    fi
fi

# Get branch name from argument or use current
if [ -z "$BRANCH_NAME" ]; then
    BRANCH_NAME="$CURRENT_BRANCH"
fi

# Handle sync-only mode
if [ "$SYNC_ONLY" = true ]; then
    print_header "Syncing with Remote Repository"
    
    # Fetch latest changes
    print_status "Fetching latest changes from remote..."
    git fetch origin
    
    # Check if we're behind
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "")
    
    if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
        if git merge-base --is-ancestor $LOCAL $REMOTE; then
            print_status "Branch is behind remote. Fast-forwarding..."
            git merge origin/$CURRENT_BRANCH --ff-only
        elif git merge-base --is-ancestor $REMOTE $LOCAL; then
            print_status "Branch is ahead of remote. Pushing local changes..."
            git push origin $CURRENT_BRANCH
        else
            print_warning "Branches have diverged. Manual intervention required."
            print_status "Recent local commits:"
            git log --oneline -3
            print_status "Recent remote commits:"
            git log --oneline -3 origin/$CURRENT_BRANCH
            exit 1
        fi
    else
        print_status "Branch is up to date with remote"
    fi
    
    print_header "Sync Complete!"
    exit 0
fi

# Handle auto-stash
if [ "$AUTO_STASH" = true ]; then
    print_status "Auto-stashing uncommitted changes..."
    git stash push -m "Auto-stash before workflow $(date)"
fi

# Check if there are changes to commit
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

if [ "$HAS_CHANGES" = false ] && [ "$HAS_STAGED" = false ] && [ "$HAS_UNTRACKED" = false ]; then
    print_warning "No changes to commit!"
    
    # Check if we need to push existing commits
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "")
    
    if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
        if git merge-base --is-ancestor $REMOTE $LOCAL; then
            print_status "Local branch is ahead of remote. Pushing..."
            if [ "$FORCE_PUSH" = true ]; then
                git push origin $CURRENT_BRANCH --force-with-lease
            else
                git push origin $CURRENT_BRANCH
            fi
        fi
    fi
    
    # If no changes but deploy flag is set, still deploy
    if [ "$SHOULD_DEPLOY" = true ]; then
        deploy_to_platforms "netlify"
    fi
    exit 0
fi

print_header "Starting Git Workflow"

# Step 1: Check git status
print_status "Checking git status..."
git status --short

# Step 2: Add all changes
print_status "Adding all changes..."
git add .

# Step 3: Commit changes
print_status "Committing changes with message: '$COMMIT_MESSAGE'"
git commit -m "$COMMIT_MESSAGE"

# Step 4: Push to remote
print_status "Pushing to remote repository..."

# Check if remote branch exists
if git ls-remote --heads origin "$BRANCH_NAME" | grep -q "$BRANCH_NAME"; then
    # Remote branch exists, check for conflicts
    git fetch origin
    
    if [ "$FORCE_PUSH" = true ]; then
        print_warning "Force pushing to remote (--force-with-lease)..."
        git push origin "$BRANCH_NAME" --force-with-lease
    else
        # Try regular push first
        if ! git push origin "$BRANCH_NAME" 2>/dev/null; then
            print_warning "Push rejected. Attempting to merge remote changes..."
            
            # Fetch and try to merge
            git fetch origin
            if git merge origin/"$BRANCH_NAME" --no-edit; then
                print_status "Merged remote changes successfully. Pushing again..."
                git push origin "$BRANCH_NAME"
            else
                print_error "Merge conflicts detected. Please resolve manually."
                print_status "Run: git status && git mergetool"
                exit 1
            fi
        fi
    fi
else
    # First push to new remote branch
    print_status "Creating new remote branch: $BRANCH_NAME"
    git push -u origin "$BRANCH_NAME"
fi

# Step 5: Deploy if flag is set
if [ "$SHOULD_DEPLOY" = true ]; then
    deploy_to_platforms "netlify"
fi

# Step 6: Create pull request (if not on main branch)
if [ "$BRANCH_NAME" != "main" ]; then
    print_status "Creating pull request..."
    
    # Check if gh CLI is installed
    if command -v gh &> /dev/null; then
        print_status "Using GitHub CLI to create pull request..."
        gh pr create --title "$COMMIT_MESSAGE" --body "Automated PR from git-workflow script"
    else
        print_warning "GitHub CLI not found. Please create pull request manually:"
        echo "Visit: https://github.com/zazakia/filipino-business-management-system/compare/main...$BRANCH_NAME"
    fi
else
    print_status "On main branch - no pull request needed"
fi

# Step 7: Show summary
print_header "Workflow Complete!"
print_status "Changes committed and pushed to: $BRANCH_NAME"
print_status "Commit message: $COMMIT_MESSAGE"

if [ "$SHOULD_DEPLOY" = true ]; then
    print_status "Deployment completed"
fi

# Show recent commits
print_status "Recent commits:"
git log --oneline -3

# Show repository URL
REMOTE_URL=$(git remote get-url origin)
print_status "Repository: $REMOTE_URL"

print_header "Done!" 