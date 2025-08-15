#!/bin/bash

# Test Database Management Script
# Manages local Supabase instance for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_DB_URL="postgresql://postgres:postgres@127.0.0.1:54328/postgres"
LOCAL_API_URL="http://127.0.0.1:54321"
SEED_TEST_FILE="supabase/seed-test.sql"

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI is not installed. Please install it first:"
        echo "npm install -g supabase"
        exit 1
    fi
    log_success "Supabase CLI found"
}

# Check if Docker is running
check_docker() {
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker Desktop or Docker daemon."
        exit 1
    fi
    log_success "Docker is running"
}

# Start Supabase local instance
start_supabase() {
    log_info "Starting Supabase local instance..."
    
    if supabase status &> /dev/null; then
        log_warning "Supabase is already running"
        return 0
    fi
    
    supabase start
    
    if [ $? -eq 0 ]; then
        log_success "Supabase started successfully"
        echo ""
        log_info "Supabase services are available at:"
        supabase status
    else
        log_error "Failed to start Supabase"
        exit 1
    fi
}

# Stop Supabase local instance
stop_supabase() {
    log_info "Stopping Supabase local instance..."
    supabase stop
    log_success "Supabase stopped"
}

# Reset the test database
reset_test_db() {
    log_info "Resetting test database..."
    supabase db reset --local
    log_success "Test database reset completed"
}

# Seed test data
seed_test_data() {
    log_info "Seeding test data..."
    
    if [ ! -f "$SEED_TEST_FILE" ]; then
        log_error "Test seed file not found: $SEED_TEST_FILE"
        exit 1
    fi
    
    # Execute the seed file
    if command -v psql &> /dev/null; then
        psql "$SUPABASE_DB_URL" -f "$SEED_TEST_FILE"
        log_success "Test data seeded successfully"
    else
        log_warning "psql not found, trying alternative method..."
        
        # Use Supabase CLI to run SQL
        supabase db push --local
        log_success "Database migrations applied"
        
        log_info "Manual seed required. Please run the seed file manually:"
        echo "psql \"$SUPABASE_DB_URL\" -f \"$SEED_TEST_FILE\""
    fi
}

# Test database connection
test_connection() {
    log_info "Testing database connection..."
    
    # Test using Node.js connection script
    if [ -f "test-connection.js" ]; then
        node test-connection.js
    else
        # Fallback: simple curl test
        response=$(curl -s -o /dev/null -w "%{http_code}" "$LOCAL_API_URL/rest/v1/" \
            -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeo-pkc4y4I4UuQXX1WlCd3yW_vLX2-THqI")
        
        if [ "$response" -eq 200 ]; then
            log_success "Database connection successful"
        else
            log_error "Database connection failed (HTTP: $response)"
            exit 1
        fi
    fi
}

# Run tests with test database
run_tests() {
    local test_pattern="$1"
    
    log_info "Running tests with test database..."
    
    # Set environment variables for test database
    export VITE_TEST_SUPABASE_URL="$LOCAL_API_URL"
    export VITE_TEST_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZUI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeo-pkc4y4I4UuQXX1WlCd3yW_vLX2-THqI"
    
    if [ -n "$test_pattern" ]; then
        npm test -- --run "$test_pattern"
    else
        npm test -- --run
    fi
}

# Setup complete test environment
setup_test_env() {
    log_info "Setting up complete test environment..."
    
    check_supabase_cli
    check_docker
    start_supabase
    reset_test_db
    seed_test_data
    test_connection
    
    log_success "Test environment ready!"
    echo ""
    log_info "You can now run tests with:"
    echo "  npm test                    # Run all tests"
    echo "  npm test -- integration     # Run integration tests"
    echo "  ./scripts/test-db.sh test   # Run tests with this script"
}

# Cleanup test environment
cleanup_test_env() {
    log_info "Cleaning up test environment..."
    
    # Clear test data
    if supabase status &> /dev/null; then
        log_info "Clearing test data..."
        # Run cleanup SQL
        psql "$SUPABASE_DB_URL" -c "
            DELETE FROM public.sales_items WHERE id LIKE '%test%';
            DELETE FROM public.sales WHERE id LIKE '%test%';
            DELETE FROM public.purchase_order_items WHERE id LIKE '%test%';
            DELETE FROM public.purchase_orders WHERE id LIKE '%test%';
            DELETE FROM public.stock_movements WHERE id LIKE '%test%';
            DELETE FROM public.stock_alerts WHERE id LIKE '%test%';
            DELETE FROM public.products WHERE id LIKE '%test%';
            DELETE FROM public.customers WHERE id LIKE '%test%';
            DELETE FROM public.suppliers WHERE id LIKE '%test%';
            DELETE FROM public.categories WHERE id LIKE '%test%';
        " 2>/dev/null || log_warning "Could not clean test data (tables may not exist)"
    fi
    
    stop_supabase
    log_success "Test environment cleaned up"
}

# Show help
show_help() {
    echo "Test Database Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup       Setup complete test environment (start, reset, seed)"
    echo "  start       Start Supabase local instance"
    echo "  stop        Stop Supabase local instance"
    echo "  reset       Reset test database (clear and migrate)"
    echo "  seed        Seed test data"
    echo "  test        Test database connection"
    echo "  run [pattern] Run tests with test database"
    echo "  cleanup     Cleanup test environment and stop services"
    echo "  status      Show Supabase status"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup                    # Setup everything"
    echo "  $0 run integration          # Run integration tests"
    echo "  $0 run 'product.*test'      # Run product-related tests"
}

# Show Supabase status
show_status() {
    if supabase status &> /dev/null; then
        log_success "Supabase is running"
        supabase status
    else
        log_warning "Supabase is not running"
        echo "Run '$0 setup' to start the test environment"
    fi
}

# Main script
case "$1" in
    setup)
        setup_test_env
        ;;
    start)
        check_supabase_cli
        check_docker
        start_supabase
        ;;
    stop)
        stop_supabase
        ;;
    reset)
        reset_test_db
        ;;
    seed)
        seed_test_data
        ;;
    test)
        test_connection
        ;;
    run)
        check_supabase_cli
        if ! supabase status &> /dev/null; then
            log_error "Supabase is not running. Run '$0 setup' first."
            exit 1
        fi
        run_tests "$2"
        ;;
    cleanup)
        cleanup_test_env
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        log_error "No command specified"
        show_help
        exit 1
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
