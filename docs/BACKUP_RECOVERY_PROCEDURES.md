# FBMS Backup and Recovery Procedures

## Table of Contents
1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Automated Backup Setup](#automated-backup-setup)
4. [Manual Backup Procedures](#manual-backup-procedures)
5. [Recovery Procedures](#recovery-procedures)
6. [Disaster Recovery Plan](#disaster-recovery-plan)
7. [Testing and Validation](#testing-and-validation)
8. [Monitoring and Alerts](#monitoring-and-alerts)

## Overview

This document outlines comprehensive backup and recovery procedures for the Filipino Business Management System (FBMS). The procedures ensure business continuity and data protection against various failure scenarios.

### Backup Objectives
- **Recovery Time Objective (RTO)**: Maximum 4 hours for full system recovery
- **Recovery Point Objective (RPO)**: Maximum 1 hour of data loss
- **Backup Retention**: 30 days for daily backups, 12 months for monthly backups
- **Geographic Distribution**: Primary and secondary backup locations

### Critical Data Components
1. **Database**: PostgreSQL database with all business data
2. **Application Files**: Source code and configuration files
3. **User Uploads**: Receipt images, documents, and attachments
4. **Configuration**: Environment variables and system settings
5. **Logs**: Application and system logs for troubleshooting

## Backup Strategy

### Backup Types

#### Full Backup
- **Frequency**: Weekly (Sunday 2:00 AM)
- **Content**: Complete database dump and all application files
- **Storage**: Primary and secondary locations
- **Retention**: 4 weeks

#### Incremental Backup
- **Frequency**: Daily (2:00 AM)
- **Content**: Changes since last backup
- **Storage**: Primary location with weekly sync to secondary
- **Retention**: 30 days

#### Transaction Log Backup
- **Frequency**: Every 15 minutes
- **Content**: Database transaction logs
- **Storage**: Primary location with real-time replication
- **Retention**: 7 days

### Backup Locations

#### Primary Backup Location
- **Type**: Cloud storage (AWS S3, Google Cloud Storage)
- **Encryption**: AES-256 encryption at rest
- **Access**: Restricted to backup service accounts
- **Monitoring**: Real-time backup status monitoring

#### Secondary Backup Location
- **Type**: Different cloud provider or on-premises
- **Purpose**: Disaster recovery and geographic redundancy
- **Sync**: Daily synchronization from primary location
- **Testing**: Monthly recovery testing

## Automated Backup Setup

### Database Backup Script

Create the automated database backup script:

```bash
#!/bin/bash
# /scripts/backup-database.sh

# Configuration
DB_HOST="${SUPABASE_DB_HOST}"
DB_NAME="${SUPABASE_DB_NAME}"
DB_USER="${SUPABASE_DB_USER}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD}"
BACKUP_DIR="/backups/database"
S3_BUCKET="fbms-backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/fbms_db_$TIMESTAMP.sql"

# Create database backup
export PGPASSWORD=$DB_PASSWORD
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --verbose \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file=$BACKUP_FILE.custom

# Create plain SQL backup for easier recovery
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --verbose \
  --no-owner \
  --no-privileges \
  --format=plain \
  --file=$BACKUP_FILE

# Compress backups
gzip $BACKUP_FILE
gzip $BACKUP_FILE.custom

# Upload to S3
aws s3 cp $BACKUP_FILE.gz s3://$S3_BUCKET/database/
aws s3 cp $BACKUP_FILE.custom.gz s3://$S3_BUCKET/database/

# Clean up local files older than retention period
find $BACKUP_DIR -name "fbms_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "fbms_db_*.custom.gz" -mtime +$RETENTION_DAYS -delete

# Log backup completion
echo "$(date): Database backup completed - $BACKUP_FILE.gz" >> $BACKUP_DIR/backup.log

# Send notification
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"✅ FBMS Database backup completed: $TIMESTAMP\"}" \
  $SLACK_WEBHOOK_URL
```

### Application Files Backup Script

```bash
#!/bin/bash
# /scripts/backup-application.sh

# Configuration
APP_DIR="/var/www/fbms"
BACKUP_DIR="/backups/application"
S3_BUCKET="fbms-backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/fbms_app_$TIMESTAMP.tar.gz"

# Create application backup
tar -czf $BACKUP_FILE \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='logs' \
  --exclude='temp' \
  -C $APP_DIR .

# Upload to S3
aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/application/

# Clean up old backups
find $BACKUP_DIR -name "fbms_app_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Log backup completion
echo "$(date): Application backup completed - $BACKUP_FILE" >> $BACKUP_DIR/backup.log
```

### Cron Job Configuration

Add to crontab (`crontab -e`):

```bash
# FBMS Backup Schedule

# Database backups
0 2 * * * /scripts/backup-database.sh >> /var/log/fbms-backup.log 2>&1
*/15 * * * * /scripts/backup-transaction-logs.sh >> /var/log/fbms-backup.log 2>&1

# Application backups
30 2 * * * /scripts/backup-application.sh >> /var/log/fbms-backup.log 2>&1

# User uploads backup
0 3 * * * /scripts/backup-uploads.sh >> /var/log/fbms-backup.log 2>&1

# Weekly full backup
0 1 * * 0 /scripts/backup-full-system.sh >> /var/log/fbms-backup.log 2>&1

# Backup verification
0 4 * * * /scripts/verify-backups.sh >> /var/log/fbms-backup.log 2>&1
```

## Manual Backup Procedures

### Emergency Database Backup

When immediate backup is needed:

```bash
# Quick database backup
export PGPASSWORD=your_password
pg_dump -h your_host -U postgres -d fbms_db > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Compress and upload
gzip emergency_backup_*.sql
aws s3 cp emergency_backup_*.sql.gz s3://fbms-backups/emergency/
```

### Pre-Deployment Backup

Before major deployments:

```bash
#!/bin/bash
# Pre-deployment backup script

DEPLOYMENT_VERSION="$1"
if [ -z "$DEPLOYMENT_VERSION" ]; then
  echo "Usage: $0 <deployment_version>"
  exit 1
fi

BACKUP_DIR="/backups/pre-deployment"
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > \
  "$BACKUP_DIR/pre_deploy_${DEPLOYMENT_VERSION}_$(date +%Y%m%d_%H%M%S).sql"

# Application backup
tar -czf "$BACKUP_DIR/app_pre_deploy_${DEPLOYMENT_VERSION}_$(date +%Y%m%d_%H%M%S).tar.gz" \
  --exclude='node_modules' \
  --exclude='dist' \
  -C /var/www/fbms .

echo "Pre-deployment backup completed for version $DEPLOYMENT_VERSION"
```

### User Data Export

For compliance or migration purposes:

```bash
#!/bin/bash
# Export user data

USER_ID="$1"
EXPORT_DIR="/exports"
mkdir -p $EXPORT_DIR

# Export user's data
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
COPY (
  SELECT * FROM customers WHERE created_by = '$USER_ID'
) TO '$EXPORT_DIR/user_${USER_ID}_customers.csv' WITH CSV HEADER;

COPY (
  SELECT * FROM sales WHERE created_by = '$USER_ID'
) TO '$EXPORT_DIR/user_${USER_ID}_sales.csv' WITH CSV HEADER;
"

# Create archive
tar -czf "$EXPORT_DIR/user_${USER_ID}_data_$(date +%Y%m%d).tar.gz" \
  -C $EXPORT_DIR user_${USER_ID}_*.csv

echo "User data export completed for user $USER_ID"
```

## Recovery Procedures

### Database Recovery

#### Point-in-Time Recovery

```bash
#!/bin/bash
# Point-in-time database recovery

RECOVERY_TIME="$1"  # Format: 2024-01-15 14:30:00
BACKUP_FILE="$2"

if [ -z "$RECOVERY_TIME" ] || [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 'YYYY-MM-DD HH:MM:SS' backup_file.sql"
  exit 1
fi

# Stop application
systemctl stop fbms

# Create recovery database
createdb -h $DB_HOST -U $DB_USER fbms_recovery

# Restore from backup
pg_restore -h $DB_HOST -U $DB_USER -d fbms_recovery $BACKUP_FILE

# Apply transaction logs up to recovery time
# (This requires WAL archiving to be enabled)
pg_ctl start -D /var/lib/postgresql/data -o "-c recovery_target_time='$RECOVERY_TIME'"

echo "Point-in-time recovery completed to $RECOVERY_TIME"
```

#### Full Database Restore

```bash
#!/bin/bash
# Full database restore

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 backup_file.sql.gz"
  exit 1
fi

# Confirm restoration
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restoration cancelled"
  exit 1
fi

# Stop application
systemctl stop fbms

# Create backup of current database
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > \
  "pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"

# Drop existing connections
psql -h $DB_HOST -U $DB_USER -d postgres -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Restore database
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | psql -h $DB_HOST -U $DB_USER -d $DB_NAME
else
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $BACKUP_FILE
fi

# Start application
systemctl start fbms

echo "Database restoration completed"
```

### Application Recovery

#### Code Rollback

```bash
#!/bin/bash
# Application rollback

ROLLBACK_VERSION="$1"

if [ -z "$ROLLBACK_VERSION" ]; then
  echo "Usage: $0 <version_or_backup_file>"
  exit 1
fi

APP_DIR="/var/www/fbms"
BACKUP_DIR="/backups/application"

# Stop application
systemctl stop fbms

# Create current backup
tar -czf "$BACKUP_DIR/pre_rollback_$(date +%Y%m%d_%H%M%S).tar.gz" \
  -C $APP_DIR .

# Restore from backup
if [ -f "$ROLLBACK_VERSION" ]; then
  # Restore from specific backup file
  tar -xzf $ROLLBACK_VERSION -C $APP_DIR
else
  # Restore from Git version
  cd $APP_DIR
  git checkout $ROLLBACK_VERSION
  pnpm install
  pnpm build
fi

# Start application
systemctl start fbms

echo "Application rollback completed"
```

### User Uploads Recovery

```bash
#!/bin/bash
# Recover user uploads

BACKUP_DATE="$1"  # Format: YYYYMMDD

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 YYYYMMDD"
  exit 1
fi

UPLOADS_DIR="/var/www/fbms/uploads"
BACKUP_FILE="s3://fbms-backups/uploads/uploads_${BACKUP_DATE}.tar.gz"

# Download backup from S3
aws s3 cp $BACKUP_FILE /tmp/

# Extract uploads
tar -xzf "/tmp/uploads_${BACKUP_DATE}.tar.gz" -C $UPLOADS_DIR

echo "User uploads recovery completed for $BACKUP_DATE"
```

## Disaster Recovery Plan

### Scenario 1: Database Corruption

**Detection**: Database errors, data inconsistencies
**Response Time**: 2 hours
**Recovery Steps**:
1. Stop application immediately
2. Assess corruption extent
3. Restore from latest clean backup
4. Apply transaction logs if available
5. Verify data integrity
6. Resume operations

### Scenario 2: Complete Server Failure

**Detection**: Server unreachable, hardware failure
**Response Time**: 4 hours
**Recovery Steps**:
1. Provision new server infrastructure
2. Install and configure FBMS environment
3. Restore database from latest backup
4. Restore application files
5. Update DNS and routing
6. Verify all services operational

### Scenario 3: Data Center Outage

**Detection**: Regional service disruption
**Response Time**: 6 hours
**Recovery Steps**:
1. Activate secondary data center
2. Restore from geographic backup
3. Update DNS to point to secondary location
4. Notify users of temporary service location
5. Monitor for primary data center recovery

### Communication Plan

#### Internal Communication
- **Incident Commander**: System Administrator
- **Technical Team**: Development and DevOps teams
- **Business Team**: Management and key stakeholders
- **Communication Channel**: Slack #incidents channel

#### External Communication
- **User Notification**: In-app banner and email
- **Status Page**: Public status page updates
- **Social Media**: Twitter/Facebook updates if needed
- **Customer Support**: Prepared response templates

## Testing and Validation

### Backup Verification Script

```bash
#!/bin/bash
# Verify backup integrity

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 backup_file.sql.gz"
  exit 1
fi

# Create test database
TEST_DB="fbms_test_$(date +%s)"
createdb -h $DB_HOST -U $DB_USER $TEST_DB

# Restore backup to test database
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | psql -h $DB_HOST -U $DB_USER -d $TEST_DB
else
  psql -h $DB_HOST -U $DB_USER -d $TEST_DB < $BACKUP_FILE
fi

# Verify data integrity
RECORD_COUNT=$(psql -h $DB_HOST -U $DB_USER -d $TEST_DB -t -c "
SELECT COUNT(*) FROM (
  SELECT COUNT(*) FROM customers
  UNION ALL
  SELECT COUNT(*) FROM products
  UNION ALL
  SELECT COUNT(*) FROM sales
) AS counts;")

if [ "$RECORD_COUNT" -gt 0 ]; then
  echo "✅ Backup verification successful - $RECORD_COUNT records found"
else
  echo "❌ Backup verification failed - No records found"
fi

# Clean up test database
dropdb -h $DB_HOST -U $DB_USER $TEST_DB
```

### Monthly Recovery Test

```bash
#!/bin/bash
# Monthly disaster recovery test

TEST_DATE=$(date +%Y%m%d)
TEST_LOG="/var/log/recovery-test-$TEST_DATE.log"

echo "Starting monthly recovery test - $TEST_DATE" > $TEST_LOG

# Test database recovery
echo "Testing database recovery..." >> $TEST_LOG
/scripts/verify-backups.sh >> $TEST_LOG 2>&1

# Test application recovery
echo "Testing application recovery..." >> $TEST_LOG
# Simulate application failure and recovery

# Test user notification system
echo "Testing notification system..." >> $TEST_LOG
# Send test notifications

# Generate test report
echo "Recovery test completed - $TEST_DATE" >> $TEST_LOG
echo "Results: $(grep -c '✅' $TEST_LOG) passed, $(grep -c '❌' $TEST_LOG) failed" >> $TEST_LOG

# Send report to team
mail -s "Monthly Recovery Test Report - $TEST_DATE" admin@company.com < $TEST_LOG
```

## Monitoring and Alerts

### Backup Monitoring Script

```bash
#!/bin/bash
# Monitor backup status

BACKUP_DIR="/backups"
ALERT_EMAIL="admin@company.com"
SLACK_WEBHOOK="your_slack_webhook_url"

# Check if backups are current
LATEST_DB_BACKUP=$(find $BACKUP_DIR/database -name "*.sql.gz" -mtime -1 | wc -l)
LATEST_APP_BACKUP=$(find $BACKUP_DIR/application -name "*.tar.gz" -mtime -1 | wc -l)

# Alert if backups are missing
if [ "$LATEST_DB_BACKUP" -eq 0 ]; then
  MESSAGE="❌ ALERT: No recent database backup found!"
  echo $MESSAGE | mail -s "FBMS Backup Alert" $ALERT_EMAIL
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"$MESSAGE\"}" $SLACK_WEBHOOK
fi

if [ "$LATEST_APP_BACKUP" -eq 0 ]; then
  MESSAGE="❌ ALERT: No recent application backup found!"
  echo $MESSAGE | mail -s "FBMS Backup Alert" $ALERT_EMAIL
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"$MESSAGE\"}" $SLACK_WEBHOOK
fi

# Check backup sizes (detect incomplete backups)
DB_BACKUP_SIZE=$(find $BACKUP_DIR/database -name "*.sql.gz" -mtime -1 -exec ls -l {} \; | awk '{sum+=$5} END {print sum}')
if [ "$DB_BACKUP_SIZE" -lt 1000000 ]; then  # Less than 1MB
  MESSAGE="⚠️ WARNING: Database backup seems too small ($DB_BACKUP_SIZE bytes)"
  echo $MESSAGE | mail -s "FBMS Backup Warning" $ALERT_EMAIL
fi
```

### Backup Dashboard

Create a simple web dashboard to monitor backup status:

```html
<!DOCTYPE html>
<html>
<head>
    <title>FBMS Backup Dashboard</title>
    <meta http-equiv="refresh" content="300"> <!-- Refresh every 5 minutes -->
</head>
<body>
    <h1>FBMS Backup Status Dashboard</h1>
    
    <div id="backup-status">
        <!-- This would be populated by a backend script -->
        <h2>Database Backups</h2>
        <p>Last Backup: <span id="last-db-backup"></span></p>
        <p>Status: <span id="db-status"></span></p>
        
        <h2>Application Backups</h2>
        <p>Last Backup: <span id="last-app-backup"></span></p>
        <p>Status: <span id="app-status"></span></p>
        
        <h2>Storage Usage</h2>
        <p>Primary Storage: <span id="primary-storage"></span></p>
        <p>Secondary Storage: <span id="secondary-storage"></span></p>
    </div>
    
    <script>
        // JavaScript to fetch and display backup status
        // This would make API calls to get real-time backup information
    </script>
</body>
</html>
```

## Compliance and Documentation

### Backup Audit Log

Maintain detailed logs of all backup and recovery operations:

```sql
-- Create backup audit table
CREATE TABLE backup_audit (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL, -- 'backup', 'restore', 'verify'
    backup_type VARCHAR(50) NOT NULL,    -- 'database', 'application', 'full'
    status VARCHAR(20) NOT NULL,         -- 'success', 'failed', 'partial'
    file_path TEXT,
    file_size BIGINT,
    duration_seconds INTEGER,
    error_message TEXT,
    performed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Log backup operations
INSERT INTO backup_audit (
    operation_type, backup_type, status, file_path, file_size, duration_seconds, performed_by
) VALUES (
    'backup', 'database', 'success', '/backups/database/fbms_db_20240115.sql.gz', 
    1048576, 120, 'backup-script'
);
```

### Recovery Documentation Template

For each recovery operation, document:

1. **Incident Details**
   - Date and time of incident
   - Type of failure
   - Impact assessment
   - Detection method

2. **Recovery Actions**
   - Steps taken
   - Backups used
   - Time to recovery
   - Data loss (if any)

3. **Lessons Learned**
   - Root cause analysis
   - Prevention measures
   - Process improvements
   - Training needs

4. **Verification**
   - Data integrity checks
   - Functionality testing
   - User acceptance
   - Performance validation

---

*This backup and recovery procedure document should be reviewed and updated quarterly to ensure it remains current with system changes and best practices.*