#!/bin/bash
# FBMS Continuous Deployment Status Checker
# This script checks the status of continuous deployment configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo -e "${BLUE}🔍 Checking Continuous Deployment Configuration${NC}"
echo "=================================================="

# Check Git setup
echo ""
print_info "Checking Git Repository Setup..."
if [ -d .git ]; then
    print_success "Git repository initialized"
    
    # Check remote
    if git remote get-url origin >/dev/null 2>&1; then
        REMOTE_URL=$(git remote get-url origin)
        print_success "Git remote configured: $REMOTE_URL"
        
        # Check if it's the expected GitHub repo
        if [[ "$REMOTE_URL" == *"github.com"* && "$REMOTE_URL" == *"fbmsbackup3"* ]]; then
            print_success "Connected to correct GitHub repository"
        else
            print_warning "Remote URL doesn't match expected repository"
        fi
    else
        print_error "No git remote configured"
    fi
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    print_info "Current branch: $CURRENT_BRANCH"
    
    # Check if main branch exists
    if git branch -r | grep -q "origin/main"; then
        print_success "Main branch exists on remote"
    else
        print_warning "Main branch not found on remote"
    fi
else
    print_error "Not a git repository"
    exit 1
fi

# Check GitHub Actions workflows
echo ""
print_info "Checking GitHub Actions Configuration..."
if [ -d .github/workflows ]; then
    print_success "GitHub Actions workflows directory exists"
    
    # Check for deployment workflows
    if [ -f .github/workflows/deploy.yml ]; then
        print_success "Production deployment workflow (deploy.yml) found"
    else
        print_error "Production deployment workflow missing"
    fi
    
    if [ -f .github/workflows/deploy-staging.yml ]; then
        print_success "Staging deployment workflow (deploy-staging.yml) found"
    else
        print_warning "Staging deployment workflow missing"
    fi
    
    # List all workflows
    echo "   Available workflows:"
    for workflow in .github/workflows/*.yml .github/workflows/*.yaml; do
        if [ -f "$workflow" ]; then
            echo "   - $(basename "$workflow")"
        fi
    done
else
    print_error "GitHub Actions workflows directory missing"
fi

# Check Netlify configuration
echo ""
print_info "Checking Netlify Configuration..."
if [ -f netlify.toml ]; then
    print_success "netlify.toml configuration file found"
    
    # Check for required settings
    if grep -q "publish = \"dist\"" netlify.toml; then
        print_success "Publish directory configured correctly"
    else
        print_warning "Publish directory configuration may be incorrect"
    fi
    
    if grep -q "command = \"npm run build\"" netlify.toml; then
        print_success "Build command configured correctly"
    else
        print_warning "Build command may not be configured"
    fi
else
    print_error "netlify.toml configuration file missing"
fi

# Check local Netlify connection
if command -v netlify &> /dev/null; then
    print_success "Netlify CLI installed"
    
    # Check if we can get status (requires auth)
    if netlify status >/dev/null 2>&1; then
        print_success "Netlify CLI authenticated"
        print_info "$(netlify status 2>/dev/null | head -3 | tail -1)"
    else
        print_warning "Netlify CLI not authenticated (run 'netlify login')"
    fi
else
    print_error "Netlify CLI not installed"
fi

# Check Vercel configuration  
echo ""
print_info "Checking Vercel Configuration..."
if [ -f vercel.json ]; then
    print_success "vercel.json configuration file found"
    
    # Check for required settings
    if grep -q "\"outputDirectory\": \"dist\"" vercel.json; then
        print_success "Output directory configured correctly"
    else
        print_warning "Output directory configuration may be incorrect"
    fi
    
    if grep -q "\"buildCommand\": \"npm run build\"" vercel.json; then
        print_success "Build command configured correctly"
    else
        print_warning "Build command may not be configured"
    fi
    
    if grep -q "\"github\":" vercel.json; then
        print_success "GitHub integration configured"
    else
        print_warning "GitHub integration may not be configured"
    fi
else
    print_error "vercel.json configuration file missing"
fi

# Check local Vercel connection
if command -v vercel &> /dev/null; then
    print_success "Vercel CLI installed"
    
    # Check authentication
    if VERCEL_USER=$(vercel whoami 2>/dev/null); then
        print_success "Vercel CLI authenticated as: $VERCEL_USER"
    else
        print_warning "Vercel CLI not authenticated (run 'vercel login')"
    fi
    
    # Check project link
    if [ -f .vercel/project.json ]; then
        print_success "Vercel project linked"
        if command -v jq &> /dev/null; then
            PROJECT_ID=$(jq -r '.projectId' .vercel/project.json 2>/dev/null)
            print_info "Project ID: $PROJECT_ID"
        fi
    else
        print_warning "Vercel project not linked (run 'vercel link')"
    fi
else
    print_error "Vercel CLI not installed"
fi

# Check package.json scripts
echo ""
print_info "Checking Package.json Deployment Scripts..."
if [ -f package.json ]; then
    print_success "package.json found"
    
    # Check for deployment scripts
    if grep -q "\"deploy:cli\"" package.json; then
        print_success "CLI deployment scripts configured"
    else
        print_warning "CLI deployment scripts missing"
    fi
    
    if grep -q "\"deploy:netlify\"" package.json; then
        print_success "Netlify deployment script found"
    else
        print_warning "Netlify deployment script missing"
    fi
    
    if grep -q "\"deploy:vercel\"" package.json; then
        print_success "Vercel deployment script found"
    else
        print_warning "Vercel deployment script missing"
    fi
else
    print_error "package.json not found"
fi

# Check build requirements
echo ""
print_info "Checking Build Requirements..."
if [ -f package.json ]; then
    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
        
        # Check if it's Node 18+
        if [[ "$NODE_VERSION" == v1[8-9]* ]] || [[ "$NODE_VERSION" == v2[0-9]* ]]; then
            print_success "Node.js version is compatible"
        else
            print_warning "Node.js version may be too old (recommend 18+)"
        fi
    else
        print_error "Node.js not installed"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm installed: $NPM_VERSION"
    else
        print_error "npm not installed"
    fi
    
    # Check if dependencies are installed
    if [ -d node_modules ]; then
        print_success "Dependencies installed"
    else
        print_warning "Dependencies not installed (run 'npm install')"
    fi
else
    print_error "package.json not found"
fi

# Summary and recommendations
echo ""
echo -e "${BLUE}📋 Summary and Next Steps${NC}"
echo "================================"

# Check if everything is ready
READY=true

# Critical checks
if [ ! -d .github/workflows ] || [ ! -f .github/workflows/deploy.yml ]; then
    print_error "Missing GitHub Actions workflows"
    READY=false
fi

if [ ! -f netlify.toml ] || [ ! -f vercel.json ]; then
    print_error "Missing platform configuration files"
    READY=false
fi

if ! command -v netlify &> /dev/null || ! command -v vercel &> /dev/null; then
    print_error "Missing CLI tools"
    READY=false
fi

if [ "$READY" = true ]; then
    print_success "Continuous deployment setup is complete!"
    echo ""
    print_info "To activate continuous deployment:"
    echo "1. Add secrets to GitHub repository settings"
    echo "2. Authenticate CLI tools if needed (netlify login, vercel login)"
    echo "3. Push to main branch to trigger first deployment"
    echo ""
    print_info "Test deployment with:"
    echo "   git add -A && git commit -m 'test: trigger CD' && git push origin main"
else
    print_warning "Continuous deployment setup needs attention"
    echo ""
    print_info "Please address the issues above and run this script again"
fi

echo ""
print_info "For detailed setup instructions, see: CONTINUOUS_DEPLOYMENT_SETUP.md"
