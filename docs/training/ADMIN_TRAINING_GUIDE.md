# FBMS Administrator Training Guide

## Table of Contents
1. [Administrator Role Overview](#administrator-role-overview)
2. [System Setup and Configuration](#system-setup-and-configuration)
3. [User Management](#user-management)
4. [System Settings](#system-settings)
5. [Security Management](#security-management)
6. [Database Administration](#database-administration)
7. [Backup and Recovery](#backup-and-recovery)
8. [Performance Monitoring](#performance-monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Administrator Role Overview

### Responsibilities
As a system administrator, you have full access to all FBMS features and are responsible for:

- **System Configuration**: Setting up and maintaining system settings
- **User Management**: Creating, managing, and deactivating user accounts
- **Security**: Ensuring system security and compliance
- **Data Management**: Overseeing data integrity and backups
- **Performance**: Monitoring and optimizing system performance
- **Support**: Providing technical support to users
- **Compliance**: Ensuring BIR and regulatory compliance

### Access Levels
Administrators have access to:
- All business modules (POS, Inventory, Customers, etc.)
- User management and role assignment
- System settings and configuration
- Financial data and sensitive information
- Database management tools
- Backup and recovery functions
- System logs and monitoring tools

## System Setup and Configuration

### Initial System Setup

#### 1. Environment Configuration
```bash
# Set up environment variables
cp .env.example .env

# Configure essential variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_NAME="Your Business Name"
VITE_APP_URL=https://your-domain.com
```

#### 2. Database Setup
1. **Access Database Settings**:
   - Navigate to Settings → Database
   - Verify connection status
   - Run initial setup scripts if needed

2. **Configure Row Level Security**:
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
   -- ... (repeat for all tables)
   ```

#### 3. Company Information Setup
1. Navigate to Settings → Company Information
2. Fill in required fields:
   - Company Name
   - Address
   - Tax Identification Number (TIN)
   - Business Registration Number
   - Contact Information
   - Logo Upload

#### 4. Tax Configuration
1. Go to Settings → Tax Settings
2. Configure:
   - VAT Rate (default: 12%)
   - Withholding Tax Rates
   - Tax-exempt categories
   - BIR form settings

### Payment Gateway Configuration

#### GCash Setup
1. **Obtain GCash Merchant Account**:
   - Register with GCash for Business
   - Get Merchant ID and API credentials
   - Configure webhook URLs

2. **Configure in FBMS**:
   ```javascript
   // In Settings → Payment Gateways → GCash
   {
     "merchantId": "your_gcash_merchant_id",
     "apiKey": "your_gcash_api_key",
     "webhookUrl": "https://your-domain.com/api/gcash/webhook",
     "environment": "production" // or "sandbox" for testing
   }
   ```

#### PayMaya Setup
1. **Obtain PayMaya Merchant Account**:
   - Register with PayMaya Business
   - Get Public and Secret keys
   - Configure webhook endpoints

2. **Configure in FBMS**:
   ```javascript
   // In Settings → Payment Gateways → PayMaya
   {
     "publicKey": "your_paymaya_public_key",
     "secretKey": "your_paymaya_secret_key",
     "webhookUrl": "https://your-domain.com/api/paymaya/webhook",
     "environment": "production"
   }
   ```

### Email Configuration

#### SMTP Setup
1. Navigate to Settings → Email Configuration
2. Configure SMTP settings:
   ```
   SMTP Host: smtp.gmail.com (for Gmail)
   SMTP Port: 587
   Username: your-email@gmail.com
   Password: your-app-password
   Encryption: TLS
   ```

3. **Test Email Configuration**:
   - Click "Send Test Email"
   - Verify email delivery
   - Check spam folder if not received

## User Management

### Creating User Accounts

#### Step-by-Step Process
1. **Navigate to User Management**:
   - Go to Settings → User Management
   - Click "Add New User"

2. **Fill User Information**:
   ```
   First Name: John
   Last Name: Doe
   Email: john.doe@company.com
   Role: Select appropriate role
   Department: Sales/Accounting/Management
   ```

3. **Set Initial Password**:
   - Generate secure password
   - Check "Require password change on first login"
   - Send credentials via secure method

4. **Assign Permissions**:
   - Select role-based permissions
   - Customize specific module access
   - Set data access restrictions

### Role Management

#### Available Roles
1. **Admin**: Full system access
2. **Manager**: Operations and reporting access
3. **Cashier**: POS and basic customer management
4. **Accountant**: Financial and compliance access

#### Role Configuration
```javascript
// Example role configuration
const roles = {
  admin: {
    permissions: ['*'], // All permissions
    modules: ['*'],     // All modules
    dataAccess: 'all'   // All data
  },
  manager: {
    permissions: [
      'view_reports',
      'manage_inventory',
      'manage_customers',
      'view_sales'
    ],
    modules: [
      'dashboard',
      'inventory',
      'customers',
      'reports',
      'pos'
    ],
    dataAccess: 'branch' // Branch-specific data
  },
  cashier: {
    permissions: [
      'process_sales',
      'view_customers',
      'view_inventory'
    ],
    modules: [
      'pos',
      'customers'
    ],
    dataAccess: 'limited' // Limited data access
  }
};
```

### User Account Management

#### Deactivating Users
1. Navigate to User Management
2. Find user in list
3. Click "Deactivate"
4. Confirm deactivation
5. User loses access immediately

#### Resetting Passwords
1. Select user from list
2. Click "Reset Password"
3. Choose method:
   - Generate new password
   - Send reset email
   - Allow user to reset

#### Monitoring User Activity
1. Go to Settings → User Activity
2. View login history
3. Monitor failed login attempts
4. Check user permissions usage

## System Settings

### Module Configuration

#### Enabling/Disabling Features
1. **Navigate to Settings → Modules**
2. **Toggle Features**:
   - Standard vs Enhanced versions
   - Module visibility by role
   - Feature-specific settings

#### Version Management
```javascript
// Configure feature versions
const moduleSettings = {
  pos: {
    version: 'enhanced', // 'standard' or 'enhanced'
    features: {
      barcodeScanning: true,
      advancedDiscounts: true,
      splitPayments: true
    }
  },
  inventory: {
    version: 'enhanced',
    features: {
      multiLocation: true,
      batchTracking: true,
      autoReorder: true
    }
  }
};
```

### Business Configuration

#### Location Management
1. **Add Business Locations**:
   - Go to Settings → Locations
   - Add main store, warehouse, branches
   - Configure location-specific settings

2. **Location Settings**:
   ```
   Location Name: Main Store
   Address: Complete address
   Contact: Phone and email
   Type: Store/Warehouse/Branch
   Active: Yes/No
   ```

#### Product Categories
1. Navigate to Settings → Product Categories
2. Create category hierarchy:
   ```
   Electronics
   ├── Smartphones
   ├── Laptops
   └── Accessories
   
   Clothing
   ├── Men's Wear
   ├── Women's Wear
   └── Children's Wear
   ```

### Notification Settings

#### Configure Alerts
1. **Low Stock Alerts**:
   - Set threshold levels
   - Configure notification recipients
   - Set notification frequency

2. **Payment Notifications**:
   - Failed payment alerts
   - Successful payment confirmations
   - Daily payment summaries

3. **System Alerts**:
   - Error notifications
   - Backup status alerts
   - Security warnings

## Security Management

### Access Control

#### Password Policies
1. Navigate to Settings → Security → Password Policy
2. Configure requirements:
   ```
   Minimum Length: 8 characters
   Require Uppercase: Yes
   Require Numbers: Yes
   Require Special Characters: Yes
   Password Expiry: 90 days
   Prevent Reuse: Last 5 passwords
   ```

#### Session Management
1. **Configure Session Settings**:
   ```
   Session Timeout: 8 hours
   Idle Timeout: 30 minutes
   Maximum Concurrent Sessions: 3
   Force Logout on Password Change: Yes
   ```

2. **Monitor Active Sessions**:
   - View current user sessions
   - Force logout if needed
   - Identify suspicious activity

### Audit Logging

#### Enable Comprehensive Logging
1. Go to Settings → Security → Audit Logging
2. Configure logging levels:
   ```
   Authentication Events: All
   Data Changes: All
   System Access: All
   Failed Attempts: All
   Administrative Actions: All
   ```

#### Review Audit Logs
1. Navigate to Reports → Audit Logs
2. Filter by:
   - Date range
   - User
   - Action type
   - Module

### Data Protection

#### Backup Encryption
1. **Configure Backup Encryption**:
   ```bash
   # Set encryption key
   BACKUP_ENCRYPTION_KEY=your_secure_key
   
   # Enable encryption in backup script
   gpg --cipher-algo AES256 --compress-algo 1 --symmetric \
       --output backup.sql.gpg backup.sql
   ```

#### Data Retention Policies
1. Set retention periods:
   ```
   Transaction Data: 7 years
   User Activity Logs: 1 year
   System Logs: 6 months
   Backup Files: 1 year
   ```

## Database Administration

### Regular Maintenance

#### Daily Tasks
1. **Check Database Status**:
   ```sql
   -- Monitor active connections
   SELECT count(*) as active_connections 
   FROM pg_stat_activity 
   WHERE state = 'active';
   
   -- Check database size
   SELECT pg_size_pretty(pg_database_size('fbms_db'));
   ```

2. **Monitor Performance**:
   ```sql
   -- Check slow queries
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

#### Weekly Tasks
1. **Update Statistics**:
   ```sql
   ANALYZE;
   ```

2. **Check Index Usage**:
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0;
   ```

#### Monthly Tasks
1. **Vacuum Database**:
   ```sql
   VACUUM ANALYZE;
   ```

2. **Check Table Bloat**:
   ```sql
   SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables 
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

### Performance Optimization

#### Index Management
1. **Create Performance Indexes**:
   ```sql
   -- Sales performance indexes
   CREATE INDEX CONCURRENTLY idx_sales_created_at ON sales(created_at);
   CREATE INDEX CONCURRENTLY idx_sales_customer_id ON sales(customer_id);
   
   -- Product indexes
   CREATE INDEX CONCURRENTLY idx_products_sku ON products(sku);
   CREATE INDEX CONCURRENTLY idx_products_barcode ON products(barcode);
   ```

2. **Monitor Index Performance**:
   ```sql
   SELECT 
     schemaname,
     tablename,
     indexname,
     idx_scan,
     idx_tup_read,
     idx_tup_fetch
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

## Backup and Recovery

### Automated Backup Setup

#### Configure Backup Schedule
1. **Set up Cron Jobs**:
   ```bash
   # Edit crontab
   crontab -e
   
   # Add backup schedules
   0 2 * * * /scripts/backup-database.sh
   30 2 * * * /scripts/backup-application.sh
   0 1 * * 0 /scripts/backup-full-system.sh
   ```

2. **Backup Script Configuration**:
   ```bash
   #!/bin/bash
   # backup-database.sh
   
   DB_HOST="your-db-host"
   DB_NAME="fbms_db"
   DB_USER="postgres"
   BACKUP_DIR="/backups/database"
   
   # Create backup
   pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > \
     "$BACKUP_DIR/fbms_backup_$(date +%Y%m%d_%H%M%S).sql"
   
   # Compress backup
   gzip "$BACKUP_DIR/fbms_backup_$(date +%Y%m%d_%H%M%S).sql"
   ```

### Recovery Procedures

#### Database Recovery
1. **Point-in-Time Recovery**:
   ```bash
   # Stop application
   systemctl stop fbms
   
   # Restore from backup
   gunzip -c backup_file.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   
   # Start application
   systemctl start fbms
   ```

2. **Verify Recovery**:
   ```sql
   -- Check data integrity
   SELECT COUNT(*) FROM customers;
   SELECT COUNT(*) FROM products;
   SELECT COUNT(*) FROM sales;
   
   -- Verify recent data
   SELECT * FROM sales ORDER BY created_at DESC LIMIT 10;
   ```

## Performance Monitoring

### System Monitoring

#### Key Metrics to Monitor
1. **Application Performance**:
   - Page load times
   - API response times
   - Error rates
   - User session duration

2. **Database Performance**:
   - Query execution times
   - Connection count
   - Lock waits
   - Index usage

3. **System Resources**:
   - CPU usage
   - Memory consumption
   - Disk space
   - Network traffic

#### Monitoring Tools Setup
1. **Application Monitoring**:
   ```javascript
   // Performance monitoring service
   class PerformanceMonitor {
     static trackPageLoad(pageName) {
       const startTime = performance.now();
       return {
         end: () => {
           const loadTime = performance.now() - startTime;
           this.logMetric('page_load', { page: pageName, loadTime });
         }
       };
     }
   }
   ```

2. **Database Monitoring**:
   ```sql
   -- Create monitoring view
   CREATE VIEW system_performance AS
   SELECT 
     'active_connections' as metric,
     count(*) as value
   FROM pg_stat_activity
   WHERE state = 'active'
   UNION ALL
   SELECT 
     'database_size' as metric,
     pg_database_size(current_database()) as value;
   ```

### Performance Optimization

#### Application Optimization
1. **Enable Caching**:
   ```javascript
   // Implement caching strategy
   const cache = new Map();
   
   const getCachedData = async (key, fetchFunction) => {
     if (cache.has(key)) {
       return cache.get(key);
     }
     
     const data = await fetchFunction();
     cache.set(key, data);
     
     // Set expiry
     setTimeout(() => cache.delete(key), 5 * 60 * 1000);
     
     return data;
   };
   ```

2. **Optimize Queries**:
   ```sql
   -- Use EXPLAIN to analyze queries
   EXPLAIN ANALYZE SELECT * FROM sales 
   WHERE created_at >= '2024-01-01' 
   ORDER BY created_at DESC;
   
   -- Add appropriate indexes
   CREATE INDEX CONCURRENTLY idx_sales_created_at_desc 
   ON sales(created_at DESC);
   ```

## Troubleshooting

### Common Issues and Solutions

#### Authentication Problems
1. **Users Cannot Login**:
   - Check user account status
   - Verify password hash
   - Review authentication logs
   - Reset password if needed

2. **Session Expires Quickly**:
   - Check JWT token configuration
   - Verify refresh token mechanism
   - Adjust session timeout settings

#### Performance Issues
1. **Slow Page Loading**:
   - Check network connectivity
   - Analyze bundle size
   - Review database query performance
   - Implement caching

2. **Database Slowdown**:
   - Check for long-running queries
   - Monitor connection pool
   - Update table statistics
   - Add missing indexes

#### Data Issues
1. **Data Inconsistencies**:
   - Run data integrity checks
   - Verify foreign key constraints
   - Check for orphaned records
   - Implement data validation

### Emergency Procedures

#### System Down
1. **Immediate Actions**:
   - Check system status
   - Review error logs
   - Verify database connectivity
   - Check server resources

2. **Recovery Steps**:
   - Restart application services
   - Clear cache if needed
   - Restore from backup if necessary
   - Notify users of status

#### Data Corruption
1. **Assessment**:
   - Identify affected data
   - Determine corruption extent
   - Check backup availability
   - Estimate recovery time

2. **Recovery**:
   - Stop application
   - Restore from clean backup
   - Verify data integrity
   - Resume operations

## Best Practices

### Security Best Practices
1. **Regular Security Reviews**:
   - Monthly access reviews
   - Quarterly security audits
   - Annual penetration testing
   - Continuous monitoring

2. **User Management**:
   - Principle of least privilege
   - Regular password updates
   - Immediate access revocation for terminated users
   - Multi-factor authentication where possible

### Operational Best Practices
1. **Regular Maintenance**:
   - Daily system health checks
   - Weekly performance reviews
   - Monthly backup testing
   - Quarterly disaster recovery drills

2. **Documentation**:
   - Keep procedures updated
   - Document all changes
   - Maintain configuration records
   - Record troubleshooting solutions

### Performance Best Practices
1. **Monitoring**:
   - Set up automated alerts
   - Regular performance baselines
   - Proactive capacity planning
   - Continuous optimization

2. **Backup Strategy**:
   - Multiple backup locations
   - Regular recovery testing
   - Automated backup verification
   - Clear recovery procedures

---

*This administrator training guide should be reviewed and updated regularly to reflect system changes and new best practices. Regular training sessions should be conducted to ensure administrators stay current with system capabilities and procedures.*