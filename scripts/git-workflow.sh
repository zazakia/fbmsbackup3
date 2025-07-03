#!/bin/bash

# Git Workflow Script for FBMS
# Usage: ./scripts/git-workflow.sh [commit_message] [branch_name] [--deploy]

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

# Function to deploy to Netlify
deploy_to_netlify() {
    print_header "Deploying to Netlify"
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        print_error "Netlify CLI not found. Please install it with: npm install -g netlify-cli"
        return 1
    fi

    # Build the project
    print_status "Building project..."
    npm run build

    # Deploy to Netlify
    print_status "Deploying to Netlify..."
    netlify deploy --prod --dir=dist

    print_status "Deployment completed successfully!"
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

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --deploy|-d)
            SHOULD_DEPLOY=true
            shift
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

# Get commit message from argument or prompt
if [ -z "$COMMIT_MESSAGE" ]; then
    echo -n "Enter commit message: "
    read COMMIT_MESSAGE
fi

# Get branch name from argument or use current
if [ -z "$BRANCH_NAME" ]; then
    BRANCH_NAME="$CURRENT_BRANCH"
fi

# Check if there are changes to commit
if git diff-index --quiet HEAD --; then
    print_warning "No changes to commit!"
    
    # If no changes but deploy flag is set, still deploy
    if [ "$SHOULD_DEPLOY" = true ]; then
        deploy_to_netlify
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
git push origin "$BRANCH_NAME"

# Step 5: Deploy if flag is set
if [ "$SHOULD_DEPLOY" = true ]; then
    deploy_to_netlify
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