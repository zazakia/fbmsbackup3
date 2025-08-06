#!/bin/bash

# FBMS Production Deployment Script
# This script handles the complete production deployment process

set -e  # Exit on any error

# Configuration
APP_NAME="FBMS"
ENVIRONMENT="production"
BUILD_DIR="dist"
BACKUP_DIR="backups"
LOG_FILE="deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ before proceeding."
    fi
    
    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        error "pnpm is not installed. Please install pnpm before proceeding."
    fi
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        warning "Netlify CLI is not installed. Installing now..."
        npm install -g netlify-cli
    fi
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        warning "Supabase CLI is not installed. Installing now..."
        npm install -g supabase
    fi
    
    success "Prerequisites check completed"
}

# Validate environment variables
validate_environment() {
    log "Validating environment variables..."
    
    required_vars=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_ANON_KEY"
        "NETLIFY_SITE_ID"
        "NETLIFY_AUTH_TOKEN"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        error "Missing required environment variables: ${missing_vars[*]}"
    fi
    
    success "Environment variables validated"
}

# Create backup
create_backup() {
    log "Creating backup of current deployment..."
    
    mkdir -p $BACKUP_DIR
    
    # Create timestamp for backup
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_NAME="fbms_backup_$TIMESTAMP"
    
    # Backup current build if it exists
    if [ -d "$BUILD_DIR" ]; then
        cp -r $BUILD_DIR "$BACKUP_DIR/$BACKUP_NAME"
        success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    else
        warning "No existing build found to backup"
    fi
}

# Run tests
run_tests() {
    log "Running test suite..."
    
    # Install dependencies if not already installed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        pnpm install --frozen-lockfile
    fi
    
    # Run linting
    log "Running ESLint..."
    pnpm lint || error "Linting failed"
    
    # Run unit tests
    log "Running unit tests..."
    pnpm test --run || error "Unit tests failed"
    
    # Run type checking
    log "Running TypeScript type checking..."
    pnpm tsc --noEmit || error "Type checking failed"
    
    success "All tests passed"
}

# Build application
build_application() {
    log "Building application for production..."
    
    # Clean previous build
    if [ -d "$BUILD_DIR" ]; then
        rm -rf $BUILD_DIR
    fi
    
    # Set production environment
    export NODE_ENV=production
    
    # Build the application
    pnpm build || error "Build failed"
    
    # Verify build output
    if [ ! -d "$BUILD_DIR" ]; then
        error "Build directory not found after build"
    fi
    
    # Check if index.html exists
    if [ ! -f "$BUILD_DIR/index.html" ]; then
        error "index.html not found in build directory"
    fi
    
    success "Application built successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Check if Supabase is linked
    if [ ! -f ".supabase/config.toml" ]; then
        warning "Supabase not linked. Skipping migrations."
        return
    fi
    
    # Run migrations
    supabase db push --linked || error "Database migrations failed"
    
    success "Database migrations completed"
}

# Deploy to Netlify
deploy_to_netlify() {
    log "Deploying to Netlify..."
    
    # Deploy to production
    netlify deploy --prod --dir=$BUILD_DIR || error "Netlify deployment failed"
    
    success "Deployment to Netlify completed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Get site URL from Netlify
    SITE_URL=$(netlify status --json | jq -r '.site.url')
    
    if [ "$SITE_URL" = "null" ] || [ -z "$SITE_URL" ]; then
        error "Could not retrieve site URL from Netlify"
    fi
    
    log "Site URL: $SITE_URL"
    
    # Check if site is accessible
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL")
    
    if [ "$HTTP_STATUS" != "200" ]; then
        error "Site is not accessible. HTTP Status: $HTTP_STATUS"
    fi
    
    # Check health endpoint if available
    HEALTH_URL="$SITE_URL/health"
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
    
    if [ "$HEALTH_STATUS" = "200" ]; then
        success "Health check passed"
    else
        warning "Health endpoint not available or failing"
    fi
    
    success "Deployment verification completed"
}

# Send deployment notification
send_notification() {
    log "Sending deployment notification..."
    
    # Get deployment info
    SITE_URL=$(netlify status --json | jq -r '.site.url')
    DEPLOY_ID=$(netlify status --json | jq -r '.site.deploy_id')
    
    # Create notification message
    MESSAGE="🚀 FBMS Production Deployment Completed
    
Environment: $ENVIRONMENT
Site URL: $SITE_URL
Deploy ID: $DEPLOY_ID
Timestamp: $(date)
    
Deployment was successful and site is accessible."
    
    # Log notification (in a real scenario, you might send to Slack, email, etc.)
    echo "$MESSAGE" >> deployment_notifications.log
    
    success "Deployment notification sent"
}

# Cleanup function
cleanup() {
    log "Performing cleanup..."
    
    # Remove temporary files
    rm -f .env.production.tmp
    
    # Clean up old backups (keep last 5)
    if [ -d "$BACKUP_DIR" ]; then
        cd $BACKUP_DIR
        ls -t | tail -n +6 | xargs -r rm -rf
        cd ..
    fi
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting $APP_NAME production deployment..."
    
    # Confirm production deployment
    echo -e "${YELLOW}WARNING: This will deploy to PRODUCTION environment.${NC}"
    read -p "Are you sure you want to continue? (yes/no): " -r
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Deployment cancelled by user"
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    create_backup
    run_tests
    build_application
    run_migrations
    deploy_to_netlify
    verify_deployment
    send_notification
    cleanup
    
    success "🎉 Production deployment completed successfully!"
    log "Site is now live and accessible"
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"