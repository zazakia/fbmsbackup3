#!/bin/bash

# FBMS Auto-Git-Push Automation Starter Script
# Cross-platform shell script for Unix/Linux/macOS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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
    echo -e "${CYAN}====================================${NC}"
    echo -e "${CYAN}   FBMS Auto-Git-Push Automation${NC}"
    echo -e "${CYAN}====================================${NC}"
    echo ""
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

print_header

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    print_error "Please install Node.js from https://nodejs.org/"
    exit 1
fi

print_status "Node.js version: $(node --version)"

# Change to project directory
cd "$PROJECT_DIR"
print_status "Working directory: $PWD"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository!"
    print_error "Please run this from your project root directory."
    exit 1
fi

print_status "Git repository detected"

# Show current git status
print_status "Current git status:"
git status --short 2>/dev/null || echo "No changes"
echo ""

# Check if the auto-git-push script exists
AUTO_PUSH_SCRIPT="$SCRIPT_DIR/auto-git-push.js"
if [ ! -f "$AUTO_PUSH_SCRIPT" ]; then
    print_error "Auto-git-push script not found: $AUTO_PUSH_SCRIPT"
    exit 1
fi

print_status "Starting auto-git-push automation..."
print_status "Press Ctrl+C to stop"
echo ""

# Default parameters - you can modify these or pass them as arguments
DEFAULT_ARGS=""

# Parse command line arguments and pass them through
if [ $# -gt 0 ]; then
    print_status "Using custom arguments: $@"
    node "$AUTO_PUSH_SCRIPT" "$@"
else
    print_status "Using default 2-minute intervals..."
    print_status "Use --help for more options"
    echo ""
    node "$AUTO_PUSH_SCRIPT" $DEFAULT_ARGS
fi

# Capture exit code
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    print_status "Auto-git-push stopped gracefully"
else
    print_error "Auto-git-push exited with error code $EXIT_CODE"
fi

exit $EXIT_CODE