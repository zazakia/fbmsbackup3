#!/bin/bash

# FBMS Production Deployment Script
# This script handles the complete production deployment process

set -e  # Exit on any error

# Configuration
PROJECT_NAME="fbms"
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
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    # Check npm/pnpm
    if command -v pnpm &> /dev/null; then
        PACKAGE_MANAGER="pnpm"
    elif command -v npm &> /dev/null; then
        PACKAGE_MANAGER="npm"
    else
        error "Neither npm nor pnpm is installed"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        error "Git is not installed"
    fi
    
    success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    if [ -d "$BUILD_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        BACKUP_NAME="backup-$(date +'%Y%m%d-%H%M%S')"
        cp -r "$BUILD_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    else
        warning "No existing build directory to backup"
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install --frozen-lockfile
    else
        npm ci
    fi
    
    success "Dependencies installed"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm test --run
    else
        npm run test -- --run
    fi
    
    success "All tests passed"
}

# Build application
build_application() {
    log "Building application..."
    
    # Clean previous build
    rm -rf "$BUILD_DIR"
    
    # Build
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm build
    else
        npm run build
    fi
    
    success "Application built successfully"
}

# Validate build
validate_build() {
    log "Validating build..."
    
    if [ ! -d "$BUILD_DIR" ]; then
        error "Build directory not found"
    fi
    
    if [ ! -f "$BUILD_DIR/index.html" ]; then
        error "index.html not found in build directory"
    fi
    
    # Check for critical files
    CRITICAL_FILES=("assets" "vite.svg")
    for file in "${CRITICAL_FILES[@]}"; do
        if [ ! -e "$BUILD_DIR/$file" ]; then
            warning "Critical file/directory missing: $file"
        fi
    done
    
    success "Build validation passed"
}

# Deploy to Netlify
deploy_netlify() {
    log "Deploying to Netlify..."
    
    if ! command -v netlify &> /dev/null; then
        error "Netlify CLI is not installed. Install with: npm install -g netlify-cli"
    fi
    
    # Deploy
    netlify deploy --prod --dir="$BUILD_DIR"
    
    success "Deployed to Netlify"
}

# Deploy to Vercel
deploy_vercel() {
    log "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        error "Vercel CLI is not installed. Install with: npm install -g vercel"
    fi
    
    # Deploy
    vercel --prod
    
    success "Deployed to Vercel"
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    if [ -d "$BACKUP_DIR" ]; then
        # Keep only last 5 backups
        cd "$BACKUP_DIR"
        ls -t | tail -n +6 | xargs -r rm -rf
        cd ..
        success "Old backups cleaned up"
    fi
}

# Main deployment function
main() {
    log "Starting production deployment for $PROJECT_NAME"
    
    # Parse command line arguments
    DEPLOY_TARGET="netlify"  # default
    SKIP_TESTS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --target)
                DEPLOY_TARGET="$2"
                shift 2
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--target netlify|vercel] [--skip-tests] [--help]"
                echo "  --target: Deployment target (netlify or vercel)"
                echo "  --skip-tests: Skip running tests"
                echo "  --help: Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    # Execute deployment steps
    check_prerequisites
    create_backup
    install_dependencies
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        warning "Skipping tests as requested"
    fi
    
    build_application
    validate_build
    
    # Deploy based on target
    case $DEPLOY_TARGET in
        netlify)
            deploy_netlify
            ;;
        vercel)
            deploy_vercel
            ;;
        *)
            error "Unknown deployment target: $DEPLOY_TARGET"
            ;;
    esac
    
    cleanup_backups
    
    success "Production deployment completed successfully!"
    log "Deployment log saved to: $LOG_FILE"
}

# Run main function with all arguments
main "$@"