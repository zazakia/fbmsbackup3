#!/bin/bash

# Netlify CLI Setup Script
# Run this once to setup Netlify CLI for your project

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

header "🌐 Netlify CLI Setup"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    log "Installing Netlify CLI..."
    npm install -g netlify-cli
else
    log "✅ Netlify CLI already installed"
fi

# Login to Netlify
log "Logging into Netlify..."
netlify login

# Initialize/Link site
if [ ! -f ".netlify/state.json" ]; then
    log "Linking to Netlify site..."
    netlify init
else
    log "✅ Already linked to Netlify site"
fi

# Show status
header "📊 Netlify Status"
netlify status

log "✅ Setup complete! You can now use the deploy script."
echo ""
echo "Quick commands:"
echo "  npm run deploy:quick              # Deploy with auto-generated commit message"
echo "  npm run deploy:quick \"my message\"  # Deploy with custom commit message"
echo "  ./scripts/deploy.sh               # Direct script usage"