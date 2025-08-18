#!/bin/bash
# FBMS CLI-based deployment script
# This script handles deployment to both Netlify and Vercel using their respective CLIs

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
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Parse command line arguments
ENVIRONMENT="production"
PLATFORM="all"
SKIP_BUILD=false
SKIP_GIT=false
COMMIT_MESSAGE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-git)
            SKIP_GIT=true
            shift
            ;;
        -m|--message)
            COMMIT_MESSAGE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --env <env>       Environment: production, staging (default: production)"
            echo "  -p, --platform <plat> Platform: netlify, vercel, all (default: all)"
            echo "  --skip-build         Skip the build process"
            echo "  --skip-git           Skip git operations"
            echo "  -m, --message <msg>  Git commit message"
            echo "  -h, --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'production' or 'staging'."
    exit 1
fi

# Validate platform
if [[ "$PLATFORM" != "netlify" && "$PLATFORM" != "vercel" && "$PLATFORM" != "all" ]]; then
    print_error "Invalid platform: $PLATFORM. Must be 'netlify', 'vercel', or 'all'."
    exit 1
fi

print_header "Starting deployment to $PLATFORM ($ENVIRONMENT environment)"

# Check if we're in a git repository
if [[ ! -d .git ]] && [[ "$SKIP_GIT" == false ]]; then
    print_error "Not in a git repository. Use --skip-git to skip git operations."
    exit 1
fi

# Git operations (if not skipped)
if [[ "$SKIP_GIT" == false ]]; then
    print_status "Checking git status..."
    
    # Check if there are uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        print_warning "You have uncommitted changes."
        
        if [[ -z "$COMMIT_MESSAGE" ]]; then
            read -p "Enter commit message (or press Enter to skip git operations): " COMMIT_MESSAGE
        fi
        
        if [[ -n "$COMMIT_MESSAGE" ]]; then
            print_status "Adding and committing changes..."
            git add .
            git commit -m "$COMMIT_MESSAGE"
        else
            print_warning "Skipping git commit. Proceeding with deployment..."
        fi
    fi
    
    # Push to remote (if on a branch that tracks a remote)
    current_branch=$(git branch --show-current)
    if git rev-parse --verify "origin/$current_branch" >/dev/null 2>&1; then
        print_status "Pushing to origin/$current_branch..."
        git push origin "$current_branch"
    else
        print_warning "No upstream branch configured. Skipping git push."
    fi
fi

# Build the project (if not skipped)
if [[ "$SKIP_BUILD" == false ]]; then
    print_status "Building the project..."
    npm run build
    
    if [[ $? -ne 0 ]]; then
        print_error "Build failed. Aborting deployment."
        exit 1
    fi
    
    print_status "Build completed successfully."
else
    print_warning "Skipping build process."
    # Check if dist directory exists
    if [[ ! -d "dist" ]]; then
        print_error "No dist directory found. Cannot deploy without building first."
        exit 1
    fi
fi

# Deploy to platforms
deploy_netlify() {
    print_status "Deploying to Netlify ($ENVIRONMENT)..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        netlify deploy --prod --dir=dist
    else
        netlify deploy --dir=dist
    fi
    
    if [[ $? -eq 0 ]]; then
        print_status "Netlify deployment successful!"
    else
        print_error "Netlify deployment failed!"
        return 1
    fi
}

deploy_vercel() {
    print_status "Deploying to Vercel ($ENVIRONMENT)..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        vercel --prod
    else
        vercel
    fi
    
    if [[ $? -eq 0 ]]; then
        print_status "Vercel deployment successful!"
    else
        print_error "Vercel deployment failed!"
        return 1
    fi
}

# Execute deployments based on platform selection
case $PLATFORM in
    netlify)
        deploy_netlify
        ;;
    vercel)
        deploy_vercel
        ;;
    all)
        deploy_netlify
        deploy_vercel
        ;;
esac

print_header "Deployment completed!"

# Show deployment URLs (if available)
echo ""
echo "🚀 Your application has been deployed!"
echo "📊 Check deployment status:"
echo "   Netlify: https://app.netlify.com/sites/your-site-name/deploys"
echo "   Vercel: https://vercel.com/pinoygym-1432/your-project-name"
echo ""
