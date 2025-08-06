# FBMS Technical Administration Guide

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Installation and Setup](#installation-and-setup)
3. [Database Administration](#database-administration)
4. [User Management](#user-management)
5. [Security Configuration](#security-configuration)
6. [Performance Monitoring](#performance-monitoring)
7. [Backup and Recovery](#backup-and-recovery)
8. [Troubleshooting](#troubleshooting)
9. [API Documentation](#api-documentation)
10. [Deployment Management](#deployment-management)

## System Architecture

### Technology Stack
- **Frontend**: React 18.3.1 with TypeScript, Vite build tool
- **Backend**: Supabase (PostgreSQL database, Authentication, Real-time)
- **Styling**: Tailwind CSS with mobile-responsive design
- **State Management**: Zustand with persistence
- **Testing**: Vitest with React Testing Library
- **Deployment**: Netlify/Vercel with automated CI/CD

### Application Structure
```
src/
├── components/          # React components organized by feature
├── store/              # Zustand state management stores
├── utils/              # Utility functions and helpers
├── api/                # API service layer
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── services/           # Business logic services
└── styles/             # CSS and styling files
```

### Database Schema
```sql
-- Core Tables
users                   # User accounts and authentication
user_settings          # User preferences and configurations
customers              # Customer database
products               # Product catalog
sales                  # Sales transactions
sale_items             # Individual sale line items
inventory_movements    # Stock movement tracking
suppliers              # Supplier information
purchase_orders        # Purchase order management
expenses               # Expense tracking
employees              # Employee records
payroll_periods        # Payroll processing periods
accounts               # Chart of accounts
journal_entries        # Accounting journal entries
audit_logs             # System audit trail
```

## Installation and Setup

### Prerequisites
- Node.js 18+ and pnpm package manager
- Supabase account and project
- Domain name and SSL certificate
- Email service (SMTP) for notifications

### Environment Configuration
Create `.env` file with required variables:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

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
VITE_APP_URL=https://your-domain.com
VITE_APP_NAME="Your Business Name"
VITE_ENVIRONMENT=production
```

### Database Setup
1. **Create Supabase Project**:
   ```bash
   # Initialize Supabase
   npx supabase init
   npx supabase start
   ```

2. **Run Migrations**:
   ```bash
   # Apply database migrations
   npx supabase db push
   
   # Or manually run migration files
   psql -h your-db-host -U postgres -d your-db-name -f supabase/migrations/latest.sql
   ```

3. **Setup Row Level Security (RLS)**:
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
   ALTER TABLE products ENABLE ROW LEVEL SECURITY;
   -- ... (repeat for all tables)
   
   -- Create security policies
   CREATE POLICY "Users can view own data" ON users
     FOR SELECT USING (auth.uid() = id);
   ```

### Application Deployment
1. **Build Application**:
   ```bash
   pnpm install
   pnpm build
   ```

2. **Deploy to Netlify**:
   ```bash
   # Using Netlify CLI
   netlify deploy --prod --dir=dist
   
   # Or configure automatic deployment from Git
   ```

3. **Configure Domain and SSL**:
   - Set up custom domain in Netlify/Vercel
   - Configure SSL certificate (automatic with Netlify)
   - Update CORS settings in Supabase

## Database Administration

### Regular Maintenance Tasks

#### Daily Tasks
```sql
-- Check database size and growth
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Check for long-running queries
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

#### Weekly Tasks
```sql
-- Update table statistics
ANALYZE;

-- Check for unused indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename, indexname;

-- Vacuum tables to reclaim space
VACUUM ANALYZE;
```

#### Monthly Tasks
```sql
-- Full database backup
pg_dump -h your-host -U postgres -d your-database > backup_$(date +%Y%m%d).sql

-- Check table bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_stat_get_live_tuples(c.oid) as live_tuples,
  pg_stat_get_dead_tuples(c.oid) as dead_tuples
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Performance Optimization

#### Index Management
```sql
-- Create indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_sales_created_at ON sales(created_at);
CREATE INDEX CONCURRENTLY idx_customers_email ON customers(email);
CREATE INDEX CONCURRENTLY idx_products_sku ON products(sku);
CREATE INDEX CONCURRENTLY idx_sale_items_product_id ON sale_items(product_id);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_sales_customer_date ON sales(customer_id, created_at);
CREATE INDEX CONCURRENTLY idx_inventory_product_location ON inventory_movements(product_id, location_id);
```

#### Query Optimization
```sql
-- Monitor slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Explain query plans for optimization
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM sales s
JOIN sale_items si ON s.id = si.sale_id
WHERE s.created_at >= '2024-01-01';
```

## User Management

### User Roles and Permissions
```sql
-- Create custom roles
CREATE ROLE fbms_admin;
CREATE ROLE fbms_manager;
CREATE ROLE fbms_cashier;
CREATE ROLE fbms_accountant;

-- Grant permissions to roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO fbms_admin;
GRANT SELECT, INSERT, UPDATE ON sales, sale_items, customers TO fbms_cashier;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO fbms_manager;
GRANT SELECT, INSERT, UPDATE ON accounts, journal_entries, expenses TO fbms_accountant;
```

### User Account Management
```javascript
// Create new user (Admin function)
const createUser = async (userData) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      first_name: userData.firstName,
      last_name: userData.lastName,
      role: userData.role,
      department: userData.department
    }
  });
  
  if (error) throw error;
  
  // Insert user profile
  await supabase.from('users').insert({
    id: data.user.id,
    email: userData.email,
    first_name: userData.firstName,
    last_name: userData.lastName,
    role: userData.role,
    is_active: true
  });
  
  return data;
};

// Update user role
const updateUserRole = async (userId, newRole) => {
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);
    
  if (error) throw error;
};

// Deactivate user account
const deactivateUser = async (userId) => {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId);
    
  if (error) throw error;
};
```

### Session Management
```javascript
// Monitor active sessions
const getActiveSessions = async () => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('user_id, action, created_at')
    .eq('action', 'login')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
    
  return data;
};

// Force logout user
const forceLogout = async (userId) => {
  // Invalidate user sessions
  const { error } = await supabase.auth.admin.signOut(userId);
  if (error) throw error;
  
  // Log security action
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'force_logout',
    details: { reason: 'Administrative action' }
  });
};
```

## Security Configuration

### Authentication Security
```javascript
// Configure password policy
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90, // days
  preventReuse: 5 // last 5 passwords
};

// Implement rate limiting
const rateLimiter = {
  loginAttempts: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDuration: 30 * 60 * 1000 // 30 minutes
  },
  apiRequests: {
    maxRequests: 100,
    windowMs: 60 * 1000 // 1 minute
  }
};
```

### Data Encryption
```sql
-- Encrypt sensitive data at rest
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt customer data
UPDATE customers 
SET phone = pgp_sym_encrypt(phone, 'encryption_key')
WHERE phone IS NOT NULL;

-- Create function for decryption
CREATE OR REPLACE FUNCTION decrypt_phone(encrypted_phone bytea)
RETURNS text AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_phone, 'encryption_key');
END;
$$ LANGUAGE plpgsql;
```

### Audit Logging
```sql
-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, operation, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, operation, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, operation, old_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Performance Monitoring

### Application Performance Monitoring
```javascript
// Performance monitoring service
class PerformanceMonitor {
  static trackPageLoad(pageName) {
    const startTime = performance.now();
    
    return {
      end: () => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        // Log performance metric
        this.logMetric('page_load', {
          page: pageName,
          loadTime: loadTime,
          timestamp: new Date().toISOString()
        });
        
        // Alert if load time exceeds threshold
        if (loadTime > 3000) {
          this.alertSlowPerformance(pageName, loadTime);
        }
      }
    };
  }
  
  static trackApiCall(endpoint, method) {
    const startTime = performance.now();
    
    return {
      end: (success = true) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.logMetric('api_call', {
          endpoint,
          method,
          responseTime,
          success,
          timestamp: new Date().toISOString()
        });
      }
    };
  }
  
  static logMetric(type, data) {
    // Send to monitoring service or log locally
    console.log(`[PERFORMANCE] ${type}:`, data);
    
    // Store in database for analysis
    supabase.from('performance_metrics').insert({
      metric_type: type,
      data: data,
      created_at: new Date().toISOString()
    });
  }
}
```

### Database Performance Monitoring
```sql
-- Monitor database performance
CREATE VIEW performance_summary AS
SELECT 
  'connections' as metric,
  count(*) as value
FROM pg_stat_activity
UNION ALL
SELECT 
  'active_queries' as metric,
  count(*) as value
FROM pg_stat_activity 
WHERE state = 'active'
UNION ALL
SELECT 
  'database_size' as metric,
  pg_database_size(current_database()) as value;

-- Monitor table sizes and growth
CREATE VIEW table_sizes AS
SELECT 
  schemaname,
  tablename,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
```

## Backup and Recovery

### Automated Backup Strategy
```bash
#!/bin/bash
# backup-script.sh

# Configuration
DB_HOST="your-db-host"
DB_NAME="your-db-name"
DB_USER="postgres"
BACKUP_DIR="/backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/fbms_backup_$(date +%Y%m%d_%H%M%S).sql"

# Create database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_FILE.gz s3://your-backup-bucket/

# Clean up old backups
find $BACKUP_DIR -name "fbms_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log backup completion
echo "$(date): Backup completed - $BACKUP_FILE.gz" >> $BACKUP_DIR/backup.log
```

### Recovery Procedures
```bash
#!/bin/bash
# restore-script.sh

# Configuration
DB_HOST="your-db-host"
DB_NAME="your-db-name"
DB_USER="postgres"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

# Confirm restoration
echo "WARNING: This will overwrite the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restoration cancelled."
  exit 1
fi

# Create backup of current database before restoration
echo "Creating backup of current database..."
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > "pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"

# Drop existing connections
echo "Terminating active connections..."
psql -h $DB_HOST -U $DB_USER -d postgres -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Restore database
echo "Restoring database from $BACKUP_FILE..."
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | psql -h $DB_HOST -U $DB_USER -d $DB_NAME
else
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $BACKUP_FILE
fi

echo "Database restoration completed."
```

### Point-in-Time Recovery
```sql
-- Enable point-in-time recovery
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'cp %p /backup/archive/%f';

-- Create base backup
SELECT pg_start_backup('base_backup');
-- Copy data directory
SELECT pg_stop_backup();

-- Recovery configuration (recovery.conf)
restore_command = 'cp /backup/archive/%f %p'
recovery_target_time = '2024-01-15 14:30:00'
```

## Troubleshooting

### Common Issues and Solutions

#### Database Connection Issues
```javascript
// Connection pool monitoring
const monitorConnections = async () => {
  const { data, error } = await supabase
    .from('pg_stat_activity')
    .select('*')
    .eq('datname', 'your-database-name');
    
  if (data.length > 80) { // Alert if too many connections
    console.warn('High connection count:', data.length);
    // Implement connection cleanup or scaling
  }
};

// Connection retry logic
const connectWithRetry = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await supabase.from('users').select('count');
      if (!error) return true;
    } catch (err) {
      console.log(`Connection attempt ${i + 1} failed:`, err);
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

#### Performance Issues
```sql
-- Identify slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  (total_time/calls) as avg_time_ms
FROM pg_stat_statements 
WHERE calls > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Check for missing indexes
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
ORDER BY seq_tup_read DESC;

-- Analyze table statistics
SELECT 
  schemaname,
  tablename,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE last_analyze < NOW() - INTERVAL '1 week';
```

#### Memory and Resource Issues
```bash
# Monitor system resources
#!/bin/bash

# Check memory usage
free -h

# Check disk space
df -h

# Check CPU usage
top -bn1 | grep "Cpu(s)"

# Check database processes
ps aux | grep postgres

# Monitor log files for errors
tail -f /var/log/postgresql/postgresql.log | grep ERROR
```

### Error Logging and Monitoring
```javascript
// Centralized error logging
class ErrorLogger {
  static async logError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context: context,
      user_id: context.userId,
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    // Log to database
    await supabase.from('error_logs').insert(errorData);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorData);
    }
    
    // Send to external monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry, LogRocket, etc.
    }
  }
  
  static async getErrorStats(timeframe = '24 hours') {
    const { data, error } = await supabase
      .from('error_logs')
      .select('message, count(*)')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .group('message')
      .order('count', { ascending: false });
      
    return data;
  }
}
```

## API Documentation

### Authentication Endpoints
```javascript
// Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin"
  }
}

// Refresh Token
POST /auth/refresh
{
  "refresh_token": "refresh_token"
}
```

### Business API Endpoints
```javascript
// Products
GET /api/products              // List products
POST /api/products             // Create product
PUT /api/products/:id          // Update product
DELETE /api/products/:id       // Delete product

// Sales
GET /api/sales                 // List sales
POST /api/sales                // Create sale
GET /api/sales/:id             // Get sale details

// Customers
GET /api/customers             // List customers
POST /api/customers            // Create customer
PUT /api/customers/:id         // Update customer

// Reports
GET /api/reports/sales         // Sales reports
GET /api/reports/inventory     // Inventory reports
GET /api/reports/financial     // Financial reports
```

### Rate Limiting
```javascript
// Rate limiting configuration
const rateLimits = {
  '/api/auth/login': { requests: 5, window: '15m' },
  '/api/sales': { requests: 100, window: '1m' },
  '/api/products': { requests: 200, window: '1m' },
  '/api/reports': { requests: 10, window: '1m' }
};
```

## Deployment Management

### CI/CD Pipeline Configuration
```yaml
# .github/workflows/deploy.yml
name: Deploy FBMS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test --run
      
      - name: Run linting
        run: pnpm lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build application
        run: pnpm build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

### Environment Management
```bash
# Production deployment script
#!/bin/bash

# Set environment
export NODE_ENV=production

# Build application
echo "Building application..."
pnpm install --frozen-lockfile
pnpm build

# Run database migrations
echo "Running database migrations..."
npx supabase db push --linked

# Deploy to production
echo "Deploying to production..."
netlify deploy --prod --dir=dist

# Verify deployment
echo "Verifying deployment..."
curl -f https://your-domain.com/health || exit 1

echo "Deployment completed successfully!"
```

### Health Checks and Monitoring
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {}
  };
  
  try {
    // Check database connection
    const { data, error } = await supabase.from('users').select('count');
    health.services.database = error ? 'error' : 'ok';
    
    // Check external services
    health.services.gcash = await checkGCashStatus();
    health.services.paymaya = await checkPayMayaStatus();
    
    res.json(health);
  } catch (error) {
    health.status = 'error';
    health.error = error.message;
    res.status(500).json(health);
  }
});
```

---

*This technical administration guide provides comprehensive information for system administrators managing the FBMS application. For additional technical support, please refer to the troubleshooting section or contact the development team.*