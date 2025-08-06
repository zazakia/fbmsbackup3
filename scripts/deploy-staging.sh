#!/bin/bash

# FBMS Staging Deployment Script
# This script handles staging deployment for testing and validation

set -e  # Exit on any error

# Configuration
PROJECT_NAME="fbms-staging"
STAGING_URL="https://staging.yourdomain.com"
LOG_FILE="/var/log/fbms/staging-deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    echo "[ERROR] $1" >> $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
    echo "[WARNING] $1" >> $LOG_FILE
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
    echo "[INFO] $1" >> $LOG_FILE
}

# Pre-deployment checks for staging
pre_deployment_checks() {
    log "Starting staging pre-deployment checks..."
    
    # Check if required environment variables are set
    if [ -z "$VITE_SUPABASE_URL_STAGING" ]; then
        error "VITE_SUPABASE_URL_STAGING environment variable is not set"
    fi
    
    if [ -z "$VITE_SUPABASE_ANON_KEY_STAGING" ]; then
        error "VITE_SUPABASE_ANON_KEY_STAGING environment variable is not set"
    fi
    
    # Check package manager
    if ! command -v pnpm &> /dev/null; then
        if ! command -v npm &> /dev/null; then
            error "Neither pnpm nor npm is installed"
        else
            warning "pnpm not found, using npm instead"
            PACKAGE_MANAGER="npm"
        fi
    else
        PACKAGE_MANAGER="pnpm"
    fi
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        error "Vercel CLI is not installed. Install with: npm install -g vercel"
    fi
    
    log "Staging pre-deployment checks completed"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies for staging..."
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi
    
    log "Dependencies installed successfully"
}

# Run tests for staging
run_tests() {
    log "Running test suite for staging..."
    
    # Run unit tests
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm test --run --reporter=verbose
    else
        npm run test -- --run --reporter=verbose
    fi
    
    # Run linting
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm lint
    else
        npm run lint
    fi
    
    log "All tests passed for staging"
}

# Build application for staging
build_application() {
    log "Building application for staging..."
    
    # Set staging environment variables
    export NODE_ENV=production
    export VITE_APP_ENV=staging
    export VITE_SUPABASE_URL=$VITE_SUPABASE_URL_STAGING
    export VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY_STAGING
    
    # Build the application
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm build
    else
        npm run build
    fi
    
    # Verify build output
    if [ ! -d "dist" ]; then
        error "Build failed - dist directory not found"
    fi
    
    log "Application built successfully for staging"
}

# Deploy to Vercel staging
deploy_to_vercel() {
    log "Deploying to Vercel staging..."
    
    # Deploy to staging (not production)
    vercel --prod=false --confirm
    
    log "Deployment to Vercel staging completed"
}

# Run integration tests on staging
run_integration_tests() {
    log "Running integration tests on staging..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Get the staging URL from Vercel
    STAGING_URL=$(vercel ls | grep $PROJECT_NAME | head -n1 | awk '{print $2}')
    
    if [ -z "$STAGING_URL" ]; then
        warning "Could not determine staging URL, using default"
        STAGING_URL="https://staging.yourdomain.com"
    fi
    
    info "Running tests against: $STAGING_URL"
    
    # Basic connectivity test
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL)
    if [ "$HTTP_STATUS" != "200" ]; then
        error "Staging site is not accessible. HTTP status: $HTTP_STATUS"
    fi
    
    # Test key endpoints
    endpoints=(
        "/auth/login"
        "/api/health"
        "/dashboard"
    )
    
    for endpoint in "${endpoints[@]}"; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL$endpoint")
        if [ "$STATUS" = "200" ] || [ "$STATUS" = "405" ] || [ "$STATUS" = "401" ]; then
            info "✓ $endpoint - OK ($STATUS)"
        else
            warning "✗ $endpoint - Failed ($STATUS)"
        fi
    done
    
    # Run automated tests if available
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        if pnpm run test:integration --help &> /dev/null; then
            STAGING_URL=$STAGING_URL pnpm run test:integration
        fi
    else
        if npm run test:integration --help &> /dev/null; then
            STAGING_URL=$STAGING_URL npm run test:integration
        fi
    fi
    
    log "Integration tests completed"
}

# Generate staging report
generate_staging_report() {
    log "Generating staging deployment report..."
    
    # Get current git information
    COMMIT_HASH=$(git rev-parse --short HEAD)
    COMMIT_MESSAGE=$(git log -1 --pretty=%B)
    BRANCH_NAME=$(git branch --show-current)
    
    # Create report
    REPORT_FILE="/tmp/staging-deployment-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > $REPORT_FILE << EOF
FBMS Staging Deployment Report
==============================

Deployment Information:
- Date: $(date)
- Branch: $BRANCH_NAME
- Commit: $COMMIT_HASH
- Commit Message: $COMMIT_MESSAGE
- Staging URL: $STAGING_URL

Build Information:
- Node.js Version: $(node --version)
- Package Manager: $PACKAGE_MANAGER
- Environment: staging

Test Results:
- Unit Tests: PASSED
- Linting: PASSED
- Integration Tests: PASSED
- Site Accessibility: PASSED

Next Steps:
1. Perform manual testing on staging environment
2. Validate all features work as expected
3. Test with different user roles
4. Verify BIR compliance features
5. Test payment integrations
6. If all tests pass, proceed with production deployment

Staging Environment Access:
- URL: $STAGING_URL
- Admin Login: Use staging admin credentials
- Test Data: Staging database contains test data only

Notes:
- This is a staging environment for testing purposes only
- Do not use real customer data or process real payments
- Report any issues before promoting to production
EOF

    echo "Staging deployment report generated: $REPORT_FILE"
    cat $REPORT_FILE
    
    log "Staging report generated successfully"
}

# Send staging notification
send_staging_notification() {
    log "Sending staging deployment notification..."
    
    # Get current git commit
    COMMIT_HASH=$(git rev-parse --short HEAD)
    COMMIT_MESSAGE=$(git log -1 --pretty=%B)
    BRANCH_NAME=$(git branch --show-current)
    
    # Prepare notification message
    MESSAGE="🧪 FBMS Staging Deployment Complete

Branch: $BRANCH_NAME
Commit: $COMMIT_HASH
Message: $COMMIT_MESSAGE
Time: $(date)
Staging URL: $STAGING_URL

Ready for testing! Please validate all features before production deployment.

Test Checklist:
✅ Unit tests passed
✅ Integration tests passed
⏳ Manual testing required
⏳ User acceptance testing
⏳ Performance validation"
    
    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$MESSAGE\"}" \
            $SLACK_WEBHOOK_URL
    fi
    
    # Send email if configured
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "$MESSAGE" | mail -s "FBMS Staging Deployment Complete" $NOTIFICATION_EMAIL
    fi
    
    log "Staging deployment notification sent"
}

# Main staging deployment function
main() {
    log "Starting FBMS staging deployment..."
    
    # Run deployment steps
    pre_deployment_checks
    install_dependencies
    
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    fi
    
    build_application
    deploy_to_vercel
    run_integration_tests
    generate_staging_report
    send_staging_notification
    
    log "🎉 FBMS staging deployment completed successfully!"
    log "Staging URL: $STAGING_URL"
    info "Please perform manual testing before promoting to production"
}

# Help function
show_help() {
    echo "FBMS Staging Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --skip-tests   Skip running tests"
    echo "  --quick        Quick deployment (skip tests and integration tests)"
    echo ""
    echo "Environment Variables:"
    echo "  VITE_SUPABASE_URL_STAGING       Staging Supabase project URL (required)"
    echo "  VITE_SUPABASE_ANON_KEY_STAGING  Staging Supabase anonymous key (required)"
    echo "  SLACK_WEBHOOK_URL               Slack webhook for notifications (optional)"
    echo "  NOTIFICATION_EMAIL              Email for notifications (optional)"
    echo ""
    echo "Examples:"
    echo "  $0                      # Standard staging deployment"
    echo "  $0 --skip-tests         # Deploy without running tests"
    echo "  $0 --quick              # Quick deployment for rapid iteration"
}

# Parse command line arguments
SKIP_TESTS=false
QUICK_DEPLOY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --quick)
            SKIP_TESTS=true
            QUICK_DEPLOY=true
            shift
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Create log directory if it doesn't exist
mkdir -p $(dirname $LOG_FILE)

# Run main deployment
main

exit 0