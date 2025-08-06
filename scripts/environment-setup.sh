#!/bin/bash

# FBMS Environment Setup Script
# This script sets up the development and production environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        error "Please do not run this script as root"
    fi
}

# Install Node.js and pnpm
install_nodejs() {
    log "Installing Node.js and pnpm..."
    
    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log "Node.js is already installed: $NODE_VERSION"
        
        # Check if version is 18 or higher
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            warning "Node.js version is less than 18. Please upgrade to Node.js 18+"
        fi
    else
        # Install Node.js using NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install pnpm
    if ! command -v pnpm &> /dev/null; then
        log "Installing pnpm..."
        npm install -g pnpm
    else
        log "pnpm is already installed: $(pnpm --version)"
    fi
    
    success "Node.js and pnpm installation completed"
}

# Install system dependencies
install_system_dependencies() {
    log "Installing system dependencies..."
    
    # Update package list
    sudo apt-get update
    
    # Install required packages
    sudo apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        python3 \
        python3-pip \
        postgresql-client \
        jq \
        unzip
    
    success "System dependencies installed"
}

# Install development tools
install_dev_tools() {
    log "Installing development tools..."
    
    # Install Netlify CLI
    if ! command -v netlify &> /dev/null; then
        log "Installing Netlify CLI..."
        npm install -g netlify-cli
    else
        log "Netlify CLI is already installed"
    fi
    
    # Install Supabase CLI
    if ! command -v supabase &> /dev/null; then
        log "Installing Supabase CLI..."
        npm install -g supabase
    else
        log "Supabase CLI is already installed"
    fi
    
    # Install PM2 for process management
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        npm install -g pm2
    else
        log "PM2 is already installed"
    fi
    
    success "Development tools installed"
}

# Setup project dependencies
setup_project() {
    log "Setting up project dependencies..."
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        error "package.json not found. Please run this script from the project root directory."
    fi
    
    # Install project dependencies
    log "Installing project dependencies..."
    pnpm install
    
    success "Project dependencies installed"
}

# Create environment files
create_env_files() {
    log "Creating environment configuration files..."
    
    # Create .env.example if it doesn't exist
    if [ ! -f ".env.example" ]; then
        cat > .env.example << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Payment Gateway Configuration
VITE_GCASH_MERCHANT_ID=your_gcash_merchant_id
VITE_GCASH_API_KEY=your_gcash_api_key
VITE_PAYMAYA_PUBLIC_KEY=your_paymaya_public_key
VITE_PAYMAYA_SECRET_KEY=your_paymaya_secret_key

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# Application Configuration
VITE_APP_URL=http://localhost:5180
VITE_APP_NAME="Filipino Business Management System"
VITE_ENVIRONMENT=development

# Deployment Configuration
NETLIFY_SITE_ID=your_netlify_site_id
NETLIFY_AUTH_TOKEN=your_netlify_auth_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
EOF
        success "Created .env.example file"
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        cp .env.example .env
        warning "Created .env file from .env.example. Please update with your actual values."
    else
        log ".env file already exists"
    fi
    
    # Create production environment file
    if [ ! -f ".env.production" ]; then
        cat > .env.production << 'EOF'
# Production Environment Configuration
NODE_ENV=production

# Supabase Configuration (Production)
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Payment Gateway Configuration (Production)
VITE_GCASH_MERCHANT_ID=your_production_gcash_merchant_id
VITE_GCASH_API_KEY=your_production_gcash_api_key
VITE_PAYMAYA_PUBLIC_KEY=your_production_paymaya_public_key
VITE_PAYMAYA_SECRET_KEY=your_production_paymaya_secret_key

# Application Configuration (Production)
VITE_APP_URL=https://your-production-domain.com
VITE_APP_NAME="Filipino Business Management System"
VITE_ENVIRONMENT=production

# Deployment Configuration
NETLIFY_SITE_ID=your_netlify_site_id
NETLIFY_AUTH_TOKEN=your_netlify_auth_token
EOF
        success "Created .env.production file"
    fi
}

# Setup Git hooks
setup_git_hooks() {
    log "Setting up Git hooks..."
    
    # Create pre-commit hook
    mkdir -p .git/hooks
    
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Run linting before commit
echo "Running pre-commit checks..."

# Run ESLint
pnpm lint
if [ $? -ne 0 ]; then
    echo "ESLint failed. Please fix the issues before committing."
    exit 1
fi

# Run type checking
pnpm tsc --noEmit
if [ $? -ne 0 ]; then
    echo "TypeScript type checking failed. Please fix the issues before committing."
    exit 1
fi

echo "Pre-commit checks passed!"
EOF
    
    chmod +x .git/hooks/pre-commit
    success "Git pre-commit hook created"
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    # Check if Supabase is initialized
    if [ ! -f "supabase/config.toml" ]; then
        log "Initializing Supabase..."
        supabase init
    fi
    
    # Start local Supabase (optional)
    read -p "Do you want to start local Supabase for development? (y/n): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Starting local Supabase..."
        supabase start
        success "Local Supabase started"
    fi
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    directories=(
        "logs"
        "backups"
        "uploads"
        "temp"
        "docs/api"
        "docs/deployment"
        "scripts/utils"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log "Created directory: $dir"
        fi
    done
    
    success "Directories created"
}

# Setup PM2 ecosystem
setup_pm2() {
    log "Setting up PM2 ecosystem..."
    
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'fbms-dev',
      script: 'pnpm',
      args: 'dev',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5180
      }
    },
    {
      name: 'fbms-prod',
      script: 'pnpm',
      args: 'preview',
      cwd: './',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4173
      }
    }
  ]
};
EOF
    
    success "PM2 ecosystem configuration created"
}

# Verify installation
verify_installation() {
    log "Verifying installation..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        success "Node.js: $(node --version)"
    else
        error "Node.js not found"
    fi
    
    # Check pnpm
    if command -v pnpm &> /dev/null; then
        success "pnpm: $(pnpm --version)"
    else
        error "pnpm not found"
    fi
    
    # Check project dependencies
    if [ -d "node_modules" ]; then
        success "Project dependencies installed"
    else
        error "Project dependencies not found"
    fi
    
    # Check environment files
    if [ -f ".env" ]; then
        success "Environment file exists"
    else
        warning "Environment file not found"
    fi
    
    log "Installation verification completed"
}

# Display next steps
show_next_steps() {
    echo ""
    echo -e "${GREEN}🎉 Environment setup completed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Update .env file with your actual configuration values"
    echo "2. Update .env.production file with production values"
    echo "3. Configure your Supabase project and update database URLs"
    echo "4. Set up payment gateway accounts (GCash, PayMaya)"
    echo "5. Configure email service (SMTP) for notifications"
    echo "6. Run 'pnpm dev' to start the development server"
    echo "7. Run 'pnpm test' to verify everything is working"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  pnpm dev          - Start development server"
    echo "  pnpm build        - Build for production"
    echo "  pnpm test         - Run tests"
    echo "  pnpm lint         - Run linting"
    echo "  pm2 start ecosystem.config.js --env development"
    echo "  pm2 start ecosystem.config.js --env production"
    echo ""
}

# Main setup function
main() {
    log "Starting FBMS environment setup..."
    
    check_root
    install_system_dependencies
    install_nodejs
    install_dev_tools
    setup_project
    create_env_files
    create_directories
    setup_git_hooks
    setup_database
    setup_pm2
    verify_installation
    show_next_steps
    
    success "Environment setup completed!"
}

# Handle script interruption
trap 'error "Setup interrupted"' INT TERM

# Run main function
main "$@"