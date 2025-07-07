#!/bin/bash

# Shared Deployment Utilities for FBMS
# This file contains common functions for error handling, rollback, and utilities

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Global variables for rollback
ROLLBACK_COMMIT=""
ROLLBACK_BRANCH=""
ROLLBACK_STASH=""
DEPLOYMENT_STARTED=false
BUILD_CREATED=false
TEMP_FILES=()

# Logging functions
log() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a deployment.log
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a deployment.log
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a deployment.log
}

header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Rollback functions
setup_rollback() {
    local script_name="$1"
    log "Setting up rollback for $script_name..."
    
    # Get current state
    ROLLBACK_COMMIT=$(git rev-parse HEAD)
    ROLLBACK_BRANCH=$(git branch --show-current)
    
    # Check if there are uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        log "Stashing uncommitted changes for rollback..."
        ROLLBACK_STASH=$(git stash create "Pre-deployment backup $(date)")
        if [ -n "$ROLLBACK_STASH" ]; then
            log "Stash created: $ROLLBACK_STASH"
        fi
    fi
    
    # Set up trap for cleanup
    trap 'handle_deployment_error $?' EXIT
}

handle_deployment_error() {
    local exit_code=$1
    
    if [ $exit_code -ne 0 ]; then
        error "Deployment failed with exit code: $exit_code"
        
        if [ "$DEPLOYMENT_STARTED" = true ]; then
            warn "Initiating rollback procedures..."
            rollback_deployment
        fi
        
        cleanup_temp_files
        exit $exit_code
    fi
}

rollback_deployment() {
    header "🔄 Rolling Back Deployment"
    
    # Rollback git changes
    if [ -n "$ROLLBACK_COMMIT" ] && [ -n "$ROLLBACK_BRANCH" ]; then
        log "Rolling back to commit: $ROLLBACK_COMMIT"
        
        # Reset to original commit
        git reset --hard "$ROLLBACK_COMMIT"
        
        # Restore stashed changes if any
        if [ -n "$ROLLBACK_STASH" ]; then
            log "Restoring stashed changes..."
            git stash apply "$ROLLBACK_STASH"
        fi
        
        log "✅ Git rollback completed"
    fi
    
    # Clean up build artifacts
    if [ "$BUILD_CREATED" = true ]; then
        log "Cleaning up build artifacts..."
        rm -rf dist/ build/ .next/ 2>/dev/null || true
        log "✅ Build cleanup completed"
    fi
    
    # Clean up temp files
    cleanup_temp_files
}

cleanup_temp_files() {
    if [ ${#TEMP_FILES[@]} -gt 0 ]; then
        log "Cleaning up temporary files..."
        for file in "${TEMP_FILES[@]}"; do
            rm -f "$file" 2>/dev/null || true
        done
        log "✅ Temporary files cleaned up"
    fi
}

# Pre-deployment validation
validate_environment() {
    local platform="$1"
    
    header "🔍 Validating Environment"
    
    # Check if in git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "Not in a git repository!"
        return 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        error "package.json not found. Please run from project root."
        return 1
    fi
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js not installed!"
        return 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2)
    log "Node.js version: $node_version"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm not installed!"
        return 1
    fi
    
    # Platform-specific checks
    case $platform in
        "netlify")
            validate_netlify_cli
            ;;
        "vercel")
            validate_vercel_cli
            ;;
        "both")
            validate_netlify_cli
            validate_vercel_cli
            ;;
    esac
    
    log "✅ Environment validation passed"
}

validate_netlify_cli() {
    if ! command -v netlify &> /dev/null; then
        warn "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi
    
    if ! netlify status &> /dev/null; then
        warn "Not logged into Netlify. Please run 'netlify login' first."
        return 1
    fi
    
    log "✅ Netlify CLI validated"
}

validate_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        warn "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    if ! vercel whoami &> /dev/null; then
        warn "Not logged into Vercel. Please run 'vercel login' first."
        return 1
    fi
    
    log "✅ Vercel CLI validated"
}

# Safe build with error handling
safe_build() {
    header "🏗️  Building Project"
    
    # Create backup of existing dist if it exists
    if [ -d "dist" ]; then
        log "Backing up existing dist directory..."
        mv dist dist.backup.$(date +%s)
        TEMP_FILES+=("dist.backup.*")
    fi
    
    # Run build
    log "Running build process..."
    if npm run build; then
        BUILD_CREATED=true
        log "✅ Build completed successfully"
        return 0
    else
        error "Build failed!"
        
        # Restore backup if it exists
        local backup_dir=$(ls -t dist.backup.* 2>/dev/null | head -1)
        if [ -n "$backup_dir" ] && [ -d "$backup_dir" ]; then
            log "Restoring backup dist directory..."
            mv "$backup_dir" dist
        fi
        
        return 1
    fi
}

# Safe deployment with retry logic
safe_deploy() {
    local platform="$1"
    local environment="$2"  # "production" or "staging"
    local max_retries=3
    local retry_count=0
    
    DEPLOYMENT_STARTED=true
    
    while [ $retry_count -lt $max_retries ]; do
        log "Deployment attempt $((retry_count + 1)) of $max_retries..."
        
        case $platform in
            "netlify")
                if deploy_netlify_safe "$environment"; then
                    return 0
                fi
                ;;
            "vercel")
                if deploy_vercel_safe "$environment"; then
                    return 0
                fi
                ;;
        esac
        
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $max_retries ]; then
            warn "Deployment failed, retrying in 5 seconds..."
            sleep 5
        fi
    done
    
    error "Deployment failed after $max_retries attempts"
    return 1
}

deploy_netlify_safe() {
    local environment="$1"
    
    log "🌐 Deploying to Netlify ($environment)..."
    
    local deploy_cmd="netlify deploy --dir=dist --json"
    if [ "$environment" = "production" ]; then
        deploy_cmd="$deploy_cmd --prod"
    fi
    
    local deploy_output
    if deploy_output=$(eval "$deploy_cmd" 2>&1); then
        local url
        if [ "$environment" = "production" ]; then
            url=$(echo "$deploy_output" | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"//g' | sed 's/"//g')
        else
            url=$(echo "$deploy_output" | grep -o '"deploy_url":"[^"]*"' | head -1 | sed 's/"deploy_url":"//g' | sed 's/"//g')
        fi
        
        if [ -n "$url" ]; then
            log "✅ Netlify deployment successful!"
            log "🔗 URL: $url"
            export NETLIFY_DEPLOY_URL="$url"
            return 0
        fi
    fi
    
    error "Netlify deployment failed: $deploy_output"
    return 1
}

deploy_vercel_safe() {
    local environment="$1"
    
    log "⚡ Deploying to Vercel ($environment)..."
    
    local deploy_cmd="vercel --yes"
    if [ "$environment" = "production" ]; then
        deploy_cmd="$deploy_cmd --prod"
    fi
    
    local deploy_output
    if deploy_output=$(eval "$deploy_cmd" 2>&1); then
        local url=$(echo "$deploy_output" | grep -o 'https://[^[:space:]]*' | tail -1)
        
        if [ -n "$url" ]; then
            log "✅ Vercel deployment successful!"
            log "🔗 URL: $url"
            export VERCEL_DEPLOY_URL="$url"
            return 0
        fi
    fi
    
    error "Vercel deployment failed: $deploy_output"
    return 1
}

# Git operations with error handling
safe_git_push() {
    local branch="$1"
    local force_push="$2"
    
    log "Pushing to remote repository..."
    
    # Check if remote branch exists
    if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
        # Remote branch exists, check for conflicts
        git fetch origin
        
        if [ "$force_push" = true ]; then
            warn "Force pushing to remote (--force-with-lease)..."
            git push origin "$branch" --force-with-lease
        else
            # Try regular push first
            if ! git push origin "$branch" 2>/dev/null; then
                warn "Push rejected. Attempting to merge remote changes..."
                
                # Create a backup branch
                local backup_branch="${branch}-backup-$(date +%s)"
                git branch "$backup_branch"
                log "Created backup branch: $backup_branch"
                
                # Fetch and try to merge
                git fetch origin
                if git merge origin/"$branch" --no-edit; then
                    log "Merged remote changes successfully. Pushing again..."
                    git push origin "$branch"
                    
                    # Clean up backup branch
                    git branch -D "$backup_branch"
                else
                    error "Merge conflicts detected. Backup branch created: $backup_branch"
                    log "To resolve: git checkout $backup_branch && git mergetool"
                    return 1
                fi
            fi
        fi
    else
        # First push to new remote branch
        log "Creating new remote branch: $branch"
        git push -u origin "$branch"
    fi
    
    log "✅ Successfully pushed to GitHub!"
}

# Health check for deployed application
health_check() {
    local url="$1"
    local max_attempts=5
    local attempt=1
    
    if [ -z "$url" ]; then
        warn "No URL provided for health check"
        return 0
    fi
    
    log "Performing health check on: $url"
    
    while [ $attempt -le $max_attempts ]; do
        log "Health check attempt $attempt of $max_attempts..."
        
        if curl -s -f --max-time 10 "$url" > /dev/null; then
            log "✅ Health check passed!"
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            warn "Health check failed, retrying in 10 seconds..."
            sleep 10
        fi
        
        attempt=$((attempt + 1))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Success cleanup
deployment_success() {
    log "🎉 Deployment completed successfully!"
    
    # Clean up backup files
    rm -f dist.backup.* 2>/dev/null || true
    
    # Clear rollback variables
    ROLLBACK_COMMIT=""
    ROLLBACK_BRANCH=""
    ROLLBACK_STASH=""
    DEPLOYMENT_STARTED=false
    BUILD_CREATED=false
    
    # Clear the trap
    trap - EXIT
}

# Export functions for use in other scripts
export -f log warn error header
export -f setup_rollback handle_deployment_error rollback_deployment cleanup_temp_files
export -f validate_environment validate_netlify_cli validate_vercel_cli
export -f safe_build safe_deploy deploy_netlify_safe deploy_vercel_safe
export -f safe_git_push health_check deployment_success