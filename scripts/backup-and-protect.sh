#!/bin/bash

# FBMS Comprehensive Backup and Protection Script
# This script performs complete system backup and implements protection measures

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_BASE_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="backup_$DATE.log"
RETENTION_DAYS=30

# Functions
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

# Create backup directories
create_backup_structure() {
    log "Creating backup directory structure..."
    
    mkdir -p "$BACKUP_BASE_DIR/database"
    mkdir -p "$BACKUP_BASE_DIR/application"
    mkdir -p "$BACKUP_BASE_DIR/configuration"
    mkdir -p "$BACKUP_BASE_DIR/uploads"
    mkdir -p "$BACKUP_BASE_DIR/logs"
    
    success "Backup directory structure created"
}

# Database backup
backup_database() {
    log "Starting database backup..."
    
    local db_backup_dir="$BACKUP_BASE_DIR/database"
    local backup_file="fbms_db_backup_$DATE.sql"
    
    # Check if Supabase CLI is available
    if command -v supabase &> /dev/null; then
        # Use Supabase CLI for backup
        log "Using Supabase CLI for database backup..."
        
        # Create manual backup point
        supabase db backup create --name "manual-backup-$DATE" || warning "Could not create Supabase backup point"
        
        # Export schema and data
        if [ ! -z "$DATABASE_URL" ]; then
            pg_dump "$DATABASE_URL" > "$db_backup_dir/$backup_file"
            gzip "$db_backup_dir/$backup_file"
            success "Database backup completed: $backup_file.gz"
        else
            warning "DATABASE_URL not set, skipping pg_dump backup"
        fi
    else
        warning "Supabase CLI not available, skipping database backup"
    fi
}

# Application backup
backup_application() {
    log "Starting application backup..."
    
    local app_backup_dir="$BACKUP_BASE_DIR/application"
    
    # Backup source code (Git repository)
    if [ -d ".git" ]; then
        log "Backing up Git repository..."
        git bundle create "$app_backup_dir/fbms_repo_$DATE.bundle" --all
        success "Git repository backup completed"
    fi
    
    # Backup build artifacts
    if [ -d "dist" ]; then
        log "Backing up build artifacts..."
        tar -czf "$app_backup_dir/build_$DATE.tar.gz" dist/
        success "Build artifacts backup completed"
    fi
    
    # Backup node_modules (optional, for quick recovery)
    if [ -d "node_modules" ] && [ "$BACKUP_NODE_MODULES" = "true" ]; then
        log "Backing up node_modules..."
        tar -czf "$app_backup_dir/node_modules_$DATE.tar.gz" node_modules/
        success "Node modules backup completed"
    fi
    
    # Backup package files
    if [ -f "package.json" ]; then
        cp package.json "$app_backup_dir/package_$DATE.json"
        cp package-lock.json "$app_backup_dir/package-lock_$DATE.json" 2>/dev/null || true
        success "Package files backup completed"
    fi
}

# Configuration backup
backup_configuration() {
    log "Starting configuration backup..."
    
    local config_backup_dir="$BACKUP_BASE_DIR/configuration"
    
    # Backup environment template (not actual .env for security)
    if [ -f ".env.example" ]; then
        cp .env.example "$config_backup_dir/env_example_$DATE"
    fi
    
    # Backup deployment configurations
    [ -f "netlify.toml" ] && cp netlify.toml "$config_backup_dir/netlify_$DATE.toml"
    [ -f "vercel.json" ] && cp vercel.json "$config_backup_dir/vercel_$DATE.json"
    
    # Backup build configurations
    [ -f "vite.config.ts" ] && cp vite.config.ts "$config_backup_dir/vite_config_$DATE.ts"
    [ -f "tailwind.config.js" ] && cp tailwind.config.js "$config_backup_dir/tailwind_config_$DATE.js"
    [ -f "tsconfig.json" ] && cp tsconfig.json "$config_backup_dir/tsconfig_$DATE.json"
    [ -f "eslint.config.js" ] && cp eslint.config.js "$config_backup_dir/eslint_config_$DATE.js"
    
    # Backup Supabase configuration
    if [ -d "supabase" ]; then
        tar -czf "$config_backup_dir/supabase_config_$DATE.tar.gz" supabase/
        success "Supabase configuration backup completed"
    fi
    
    success "Configuration backup completed"
}

# Uploads and user data backup
backup_uploads() {
    log "Starting uploads backup..."
    
    local uploads_backup_dir="$BACKUP_BASE_DIR/uploads"
    
    # Backup Supabase storage buckets (if CLI available and configured)
    if command -v supabase &> /dev/null; then
        # List and backup storage buckets
        log "Backing up Supabase storage buckets..."
        
        # Common bucket names (adjust based on your setup)
        buckets=("receipts" "documents" "avatars" "reports")
        
        for bucket in "${buckets[@]}"; do
            if supabase storage list "$bucket" &>/dev/null; then
                mkdir -p "$uploads_backup_dir/$bucket"
                supabase storage download --bucket "$bucket" --destination "$uploads_backup_dir/$bucket/" || warning "Could not backup bucket: $bucket"
            fi
        done
        
        # Create archive of all uploads
        if [ -d "$uploads_backup_dir" ] && [ "$(ls -A $uploads_backup_dir)" ]; then
            tar -czf "$uploads_backup_dir/uploads_$DATE.tar.gz" -C "$uploads_backup_dir" .
            # Clean up individual directories
            find "$uploads_backup_dir" -type d -not -name "." -not -name ".." -exec rm -rf {} + 2>/dev/null || true
            success "Uploads backup completed"
        fi
    else
        warning "Supabase CLI not available, skipping uploads backup"
    fi
}

# Logs backup
backup_logs() {
    log "Starting logs backup..."
    
    local logs_backup_dir="$BACKUP_BASE_DIR/logs"
    
    # Backup application logs
    if [ -d "logs" ]; then
        tar -czf "$logs_backup_dir/app_logs_$DATE.tar.gz" logs/
    fi
    
    # Backup deployment logs
    [ -f "deployment.log" ] && cp deployment.log "$logs_backup_dir/deployment_$DATE.log"
    [ -f "dev.log" ] && cp dev.log "$logs_backup_dir/dev_$DATE.log"
    
    # Backup current backup log
    cp "$LOG_FILE" "$logs_backup_dir/"
    
    success "Logs backup completed"
}

# Verify backup integrity
verify_backups() {
    log "Verifying backup integrity..."
    
    local verification_failed=false
    
    # Check database backup
    if [ -f "$BACKUP_BASE_DIR/database/fbms_db_backup_$DATE.sql.gz" ]; then
        if [ -s "$BACKUP_BASE_DIR/database/fbms_db_backup_$DATE.sql.gz" ]; then
            success "Database backup verification passed"
        else
            error "Database backup file is empty"
            verification_failed=true
        fi
    fi
    
    # Check application backup
    if [ -f "$BACKUP_BASE_DIR/application/fbms_repo_$DATE.bundle" ]; then
        if git bundle verify "$BACKUP_BASE_DIR/application/fbms_repo_$DATE.bundle" &>/dev/null; then
            success "Repository backup verification passed"
        else
            warning "Repository backup verification failed"
            verification_failed=true
        fi
    fi
    
    # Check configuration backup
    config_files=$(find "$BACKUP_BASE_DIR/configuration" -name "*$DATE*" | wc -l)
    if [ $config_files -gt 0 ]; then
        success "Configuration backup verification passed ($config_files files)"
    else
        warning "No configuration backup files found"
    fi
    
    if [ "$verification_failed" = true ]; then
        error "Backup verification failed"
    else
        success "All backup verifications passed"
    fi
}

# Upload to cloud storage (if configured)
upload_to_cloud() {
    log "Checking for cloud storage configuration..."
    
    # AWS S3 upload
    if [ ! -z "$AWS_BACKUP_BUCKET" ] && command -v aws &> /dev/null; then
        log "Uploading backups to AWS S3..."
        aws s3 sync "$BACKUP_BASE_DIR" "s3://$AWS_BACKUP_BUCKET/fbms-backups/$DATE/" --exclude "*.log"
        success "Backups uploaded to AWS S3"
    fi
    
    # Google Cloud Storage upload
    if [ ! -z "$GCS_BACKUP_BUCKET" ] && command -v gsutil &> /dev/null; then
        log "Uploading backups to Google Cloud Storage..."
        gsutil -m rsync -r "$BACKUP_BASE_DIR" "gs://$GCS_BACKUP_BUCKET/fbms-backups/$DATE/"
        success "Backups uploaded to Google Cloud Storage"
    fi
    
    # If no cloud storage configured
    if [ -z "$AWS_BACKUP_BUCKET" ] && [ -z "$GCS_BACKUP_BUCKET" ]; then
        warning "No cloud storage configured, backups stored locally only"
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    # Clean up local backups
    find "$BACKUP_BASE_DIR" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_BASE_DIR" -type d -empty -delete 2>/dev/null || true
    
    # Clean up old log files
    find . -name "backup_*.log" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    success "Old backups cleaned up"
}

# Generate backup report
generate_backup_report() {
    log "Generating backup report..."
    
    local report_file="backup_report_$DATE.txt"
    
    cat > "$report_file" << EOF
FBMS Backup Report
==================
Date: $(date)
Backup ID: $DATE

Backup Summary:
- Database: $([ -f "$BACKUP_BASE_DIR/database/fbms_db_backup_$DATE.sql.gz" ] && echo "✅ Completed" || echo "❌ Failed")
- Application: $([ -f "$BACKUP_BASE_DIR/application/fbms_repo_$DATE.bundle" ] && echo "✅ Completed" || echo "❌ Failed")
- Configuration: $([ -d "$BACKUP_BASE_DIR/configuration" ] && echo "✅ Completed" || echo "❌ Failed")
- Uploads: $([ -f "$BACKUP_BASE_DIR/uploads/uploads_$DATE.tar.gz" ] && echo "✅ Completed" || echo "❌ Failed")
- Logs: $([ -d "$BACKUP_BASE_DIR/logs" ] && echo "✅ Completed" || echo "❌ Failed")

Backup Sizes:
$(du -sh "$BACKUP_BASE_DIR"/* 2>/dev/null || echo "No backup files found")

Storage Locations:
- Local: $BACKUP_BASE_DIR/
$([ ! -z "$AWS_BACKUP_BUCKET" ] && echo "- AWS S3: s3://$AWS_BACKUP_BUCKET/fbms-backups/$DATE/")
$([ ! -z "$GCS_BACKUP_BUCKET" ] && echo "- GCS: gs://$GCS_BACKUP_BUCKET/fbms-backups/$DATE/")

Next Steps:
1. Verify backup integrity
2. Test restore procedures
3. Update disaster recovery documentation

For recovery procedures, see: docs/BACKUP_RECOVERY_PROCEDURES.md
EOF
    
    success "Backup report generated: $report_file"
}

# Send notification (if configured)
send_notification() {
    log "Sending backup completion notification..."
    
    local status="SUCCESS"
    local message="FBMS backup completed successfully at $(date)"
    
    # Slack notification
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"📦 $message\"}" \
            "$SLACK_WEBHOOK_URL" &>/dev/null || warning "Failed to send Slack notification"
    fi
    
    # Email notification (if mail command available)
    if command -v mail &> /dev/null && [ ! -z "$BACKUP_NOTIFICATION_EMAIL" ]; then
        echo "$message" | mail -s "FBMS Backup Completed" "$BACKUP_NOTIFICATION_EMAIL" || warning "Failed to send email notification"
    fi
    
    success "Notifications sent"
}

# Main backup process
main() {
    log "Starting FBMS comprehensive backup process..."
    
    # Check if running as scheduled job
    if [ "$1" = "--scheduled" ]; then
        log "Running as scheduled backup job"
    fi
    
    # Create backup structure
    create_backup_structure
    
    # Perform backups
    backup_database
    backup_application
    backup_configuration
    backup_uploads
    backup_logs
    
    # Verify backups
    verify_backups
    
    # Upload to cloud (if configured)
    upload_to_cloud
    
    # Clean up old backups
    cleanup_old_backups
    
    # Generate report
    generate_backup_report
    
    # Send notifications
    send_notification
    
    success "🎉 Comprehensive backup process completed successfully!"
    log "Backup ID: $DATE"
    log "Log file: $LOG_FILE"
    
    # Display backup summary
    echo
    echo "Backup Summary:"
    echo "==============="
    du -sh "$BACKUP_BASE_DIR"/* 2>/dev/null || echo "No backup files created"
}

# Handle script interruption
trap 'error "Backup process interrupted"' INT TERM

# Run main function
main "$@"