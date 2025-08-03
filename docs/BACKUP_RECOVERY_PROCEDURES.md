# FBMS Backup and Recovery Procedures

## Overview
This document outlines the backup and recovery procedures for the Filipino Business Management System (FBMS). Regular backups are essential for data protection and business continuity.

## Backup Strategy

### Backup Types
1. **Database Backups**: Complete PostgreSQL database dumps
2. **Application Backups**: Source code and configuration files
3. **User Data Backups**: Uploaded files and documents
4. **Configuration Backups**: Environment variables and settings

### Backup Schedule
- **Daily**: Automated database backups at 2:00 AM
- **Weekly**: Full system backup every Sunday at 1:00 AM
- **Monthly**: Archive backup for long-term storage
- **Before Updates**: Manual backup before any system updates

## Database Backup Procedures

### Automated Daily Backup
```bash
#!/bin/bash
# Daily database backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
DB_NAME="fbms_production"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database dump
pg_dump $DB_NAME > $BACKUP_DIR/fbms_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/fbms_backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Database backup completed: fbms_backup_$DATE.sql.gz"
```

### Manual Database Backup
```bash
# Connect to Supabase and create backup
supabase db dump --file backup_$(date +%Y%m%d).sql

# Or using pg_dump directly
pg_dump -h your-supabase-host -U postgres -d postgres > backup.sql
```

### Supabase Backup via Dashboard
1. Login to Supabase Dashboard
2. Navigate to Settings → Database
3. Click "Download backup"
4. Save the backup file securely

## Application Backup Procedures

### Source Code Backup
```bash
#!/bin/bash
# Application backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/application"
PROJECT_DIR="/var/www/fbms"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create application archive
tar -czf $BACKUP_DIR/fbms_app_$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    $PROJECT_DIR

echo "Application backup completed: fbms_app_$DATE.tar.gz"
```

### Configuration Backup
```bash
#!/bin/bash
# Configuration backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/config"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup environment files
cp .env $BACKUP_DIR/env_$DATE
cp .env.production $BACKUP_DIR/env_production_$DATE

# Backup Supabase configuration
cp supabase/config.toml $BACKUP_DIR/supabase_config_$DATE.toml

# Backup deployment scripts
tar -czf $BACKUP_DIR/scripts_$DATE.tar.gz scripts/

echo "Configuration backup completed"
```

## Recovery Procedures

### Database Recovery

#### Complete Database Restore
```bash
# Stop application services
sudo systemctl stop fbms

# Drop existing database (CAUTION!)
dropdb fbms_production

# Create new database
createdb fbms_production

# Restore from backup
gunzip -c /backups/database/fbms_backup_YYYYMMDD_HHMMSS.sql.gz | psql fbms_production

# Restart application services
sudo systemctl start fbms
```

#### Partial Data Recovery
```sql
-- Restore specific table from backup
-- First, create a temporary database
CREATE DATABASE temp_restore;

-- Restore backup to temporary database
\i /backups/database/fbms_backup_YYYYMMDD_HHMMSS.sql

-- Copy specific data
INSERT INTO production.customers 
SELECT * FROM temp_restore.customers 
WHERE created_at > '2024-01-01';

-- Drop temporary database
DROP DATABASE temp_restore;
```

### Application Recovery

#### Complete Application Restore
```bash
# Stop services
sudo systemctl stop nginx
sudo systemctl stop fbms

# Backup current installation
mv /var/www/fbms /var/www/fbms_backup_$(date +%Y%m%d)

# Extract backup
cd /var/www
tar -xzf /backups/application/fbms_app_YYYYMMDD_HHMMSS.tar.gz

# Restore configuration
cp /backups/config/env_YYYYMMDD /var/www/fbms/.env

# Install dependencies
cd /var/www/fbms
npm install

# Build application
npm run build

# Start services
sudo systemctl start fbms
sudo systemctl start nginx
```

#### Configuration Recovery
```bash
# Restore environment configuration
cp /backups/config/env_YYYYMMDD .env
cp /backups/config/env_production_YYYYMMDD .env.production

# Restore Supabase configuration
cp /backups/config/supabase_config_YYYYMMDD.toml supabase/config.toml

# Restart application
sudo systemctl restart fbms
```

## Disaster Recovery Plan

### Recovery Time Objectives (RTO)
- **Critical Systems**: 4 hours maximum downtime
- **Non-Critical Systems**: 24 hours maximum downtime
- **Data Recovery**: 1 hour maximum data loss

### Recovery Point Objectives (RPO)
- **Database**: Maximum 1 hour of data loss
- **Application**: Maximum 24 hours of configuration loss
- **User Files**: Maximum 4 hours of file loss

### Emergency Contacts
- **System Administrator**: admin@fbms.ph
- **Database Administrator**: dba@fbms.ph
- **Technical Support**: support@fbms.ph
- **Emergency Hotline**: +63 2 8123-4567

### Disaster Recovery Steps

#### Step 1: Assessment
1. Identify the scope of the disaster
2. Determine affected systems and data
3. Estimate recovery time requirements
4. Notify stakeholders and users

#### Step 2: Infrastructure Recovery
1. Provision new infrastructure if needed
2. Restore network connectivity
3. Set up basic services (DNS, load balancers)
4. Verify security configurations

#### Step 3: Data Recovery
1. Restore database from latest backup
2. Verify data integrity
3. Apply any available transaction logs
4. Test database connectivity

#### Step 4: Application Recovery
1. Deploy application from backup
2. Restore configuration files
3. Update environment variables
4. Test application functionality

#### Step 5: Validation and Testing
1. Perform smoke tests on critical functions
2. Verify user authentication
3. Test POS system operations
4. Validate reporting functionality

#### Step 6: Go-Live
1. Update DNS records if needed
2. Notify users of system restoration
3. Monitor system performance
4. Document lessons learned

## Backup Monitoring and Alerts

### Backup Verification
```bash
#!/bin/bash
# Backup verification script

BACKUP_DIR="/backups/database"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.sql.gz | head -1)

# Check if backup exists
if [ ! -f "$LATEST_BACKUP" ]; then
    echo "ERROR: No backup found"
    exit 1
fi

# Check backup age (should be less than 25 hours old)
BACKUP_AGE=$(find $LATEST_BACKUP -mtime +1)
if [ -n "$BACKUP_AGE" ]; then
    echo "WARNING: Backup is older than 24 hours"
fi

# Test backup integrity
gunzip -t $LATEST_BACKUP
if [ $? -eq 0 ]; then
    echo "SUCCESS: Backup integrity verified"
else
    echo "ERROR: Backup file is corrupted"
    exit 1
fi
```

### Automated Alerts
```bash
# Add to crontab for daily backup monitoring
0 3 * * * /scripts/verify_backup.sh | mail -s "FBMS Backup Status" admin@fbms.ph
```

## Best Practices

### Backup Security
1. **Encryption**: Encrypt all backup files
2. **Access Control**: Limit access to backup files
3. **Secure Storage**: Store backups in secure locations
4. **Regular Testing**: Test backup restoration regularly

### Storage Management
1. **Multiple Locations**: Store backups in multiple locations
2. **Cloud Storage**: Use cloud storage for off-site backups
3. **Retention Policy**: Implement proper retention policies
4. **Monitoring**: Monitor backup storage usage

### Documentation
1. **Procedure Updates**: Keep procedures up to date
2. **Recovery Testing**: Document recovery test results
3. **Contact Information**: Maintain current contact lists
4. **Change Management**: Document all changes to procedures

## Compliance Requirements

### Data Protection
- **GDPR Compliance**: Ensure backup procedures comply with data protection laws
- **Data Retention**: Follow legal requirements for data retention
- **Access Logging**: Log all access to backup files
- **Audit Trail**: Maintain audit trail for all backup operations

### Business Continuity
- **Regular Testing**: Test recovery procedures quarterly
- **Documentation**: Keep all procedures documented and current
- **Training**: Train staff on recovery procedures
- **Communication**: Maintain communication plans for disasters

---

*This document should be reviewed and updated quarterly or after any significant system changes.*