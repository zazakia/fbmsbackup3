# FBMS Troubleshooting Guide

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [Authentication Issues](#authentication-issues)
3. [Database Connection Problems](#database-connection-problems)
4. [Performance Issues](#performance-issues)
5. [Payment Integration Problems](#payment-integration-problems)
6. [POS System Issues](#pos-system-issues)
7. [Inventory Management Problems](#inventory-management-problems)
8. [Report Generation Issues](#report-generation-issues)
9. [Mobile and Responsive Issues](#mobile-and-responsive-issues)
10. [Deployment and Environment Issues](#deployment-and-environment-issues)
11. [Data Integrity Problems](#data-integrity-problems)
12. [System Monitoring and Logs](#system-monitoring-and-logs)

## Quick Reference

### Emergency Contacts
- **System Administrator**: admin@company.com
- **Technical Support**: support@company.com
- **Emergency Hotline**: +63-XXX-XXX-XXXX

### Critical System Commands
```bash
# Check system status
systemctl status fbms

# Restart application
systemctl restart fbms

# Check database connection
psql -h your-host -U postgres -d fbms_db -c "SELECT 1;"

# View application logs
tail -f /var/log/fbms/application.log

# Check disk space
df -h

# Check memory usage
free -h
```

### Common Error Codes
- **AUTH001**: Invalid credentials
- **DB001**: Database connection failed
- **PAY001**: Payment gateway timeout
- **INV001**: Insufficient inventory
- **RPT001**: Report generation failed

## Authentication Issues

### Problem: Users Cannot Login

#### Symptoms
- "Invalid credentials" error with correct password
- Login page keeps refreshing
- Session expires immediately

#### Diagnosis Steps
1. **Check User Account Status**:
   ```sql
   SELECT id, email, is_active, last_login 
   FROM users 
   WHERE email = 'user@example.com';
   ```

2. **Verify Password Hash**:
   ```sql
   SELECT auth.users.email, auth.users.encrypted_password 
   FROM auth.users 
   WHERE email = 'user@example.com';
   ```

3. **Check Authentication Logs**:
   ```bash
   grep "authentication" /var/log/fbms/auth.log | tail -20
   ```

#### Solutions

**Solution 1: Reset User Password**
```javascript
// Admin function to reset password
const resetUserPassword = async (email, newPassword) => {
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );
  
  if (error) {
    console.error('Password reset failed:', error);
    return false;
  }
  
  return true;
};
```

**Solution 2: Reactivate User Account**
```sql
UPDATE users 
SET is_active = true, 
    updated_at = NOW() 
WHERE email = 'user@example.com';
```

**Solution 3: Clear Session Data**
```javascript
// Clear browser storage
localStorage.clear();
sessionStorage.clear();

// Clear Supabase session
await supabase.auth.signOut();
```

### Problem: Session Expires Too Quickly

#### Symptoms
- Users logged out after short periods
- "Session expired" messages frequently

#### Diagnosis Steps
1. **Check JWT Token Expiry**:
   ```javascript
   const session = supabase.auth.session();
   console.log('Token expires at:', new Date(session.expires_at * 1000));
   ```

2. **Verify Refresh Token**:
   ```javascript
   const { data, error } = await supabase.auth.refreshSession();
   console.log('Refresh result:', data, error);
   ```

#### Solutions

**Solution 1: Configure Session Duration**
```javascript
// In Supabase dashboard, adjust JWT expiry
// Or implement automatic refresh
const refreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.error('Session refresh failed:', error);
    // Redirect to login
    window.location.href = '/login';
  }
};

// Set up automatic refresh
setInterval(refreshSession, 50 * 60 * 1000); // 50 minutes
```

### Problem: OAuth Login Fails

#### Symptoms
- Google/GitHub login redirects but doesn't authenticate
- OAuth callback errors

#### Diagnosis Steps
1. **Check OAuth Configuration**:
   ```bash
   # Verify environment variables
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   ```

2. **Check Redirect URLs**:
   - Verify redirect URLs in OAuth provider settings
   - Ensure HTTPS is used in production

#### Solutions

**Solution 1: Update OAuth Settings**
```javascript
// Correct OAuth configuration
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

**Solution 2: Handle OAuth Callback**
```javascript
// In auth callback component
useEffect(() => {
  const handleAuthCallback = async () => {
    const { data, error } = await supabase.auth.getSessionFromUrl();
    if (error) {
      console.error('OAuth callback error:', error);
      navigate('/login?error=oauth_failed');
    } else {
      navigate('/dashboard');
    }
  };
  
  handleAuthCallback();
}, []);
```

## Database Connection Problems

### Problem: Database Connection Timeouts

#### Symptoms
- "Connection timeout" errors
- Slow query responses
- Application hangs on database operations

#### Diagnosis Steps
1. **Check Database Status**:
   ```sql
   SELECT 
     count(*) as active_connections,
     max(now() - query_start) as longest_query
   FROM pg_stat_activity 
   WHERE state = 'active';
   ```

2. **Monitor Connection Pool**:
   ```sql
   SELECT 
     datname,
     numbackends,
     xact_commit,
     xact_rollback
   FROM pg_stat_database 
   WHERE datname = 'fbms_db';
   ```

3. **Check for Blocking Queries**:
   ```sql
   SELECT 
     blocked_locks.pid AS blocked_pid,
     blocked_activity.usename AS blocked_user,
     blocking_locks.pid AS blocking_pid,
     blocking_activity.usename AS blocking_user,
     blocked_activity.query AS blocked_statement,
     blocking_activity.query AS blocking_statement
   FROM pg_catalog.pg_locks blocked_locks
   JOIN pg_catalog.pg_stat_activity blocked_activity 
     ON blocked_activity.pid = blocked_locks.pid
   JOIN pg_catalog.pg_locks blocking_locks 
     ON blocking_locks.locktype = blocked_locks.locktype
   JOIN pg_catalog.pg_stat_activity blocking_activity 
     ON blocking_activity.pid = blocking_locks.pid
   WHERE NOT blocked_locks.granted;
   ```

#### Solutions

**Solution 1: Optimize Connection Pool**
```javascript
// Adjust Supabase client configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-my-custom-header': 'my-app-name' },
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```

**Solution 2: Kill Long-Running Queries**
```sql
-- Find and kill long-running queries
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Kill specific query
SELECT pg_terminate_backend(pid) WHERE pid = 12345;
```

**Solution 3: Database Maintenance**
```sql
-- Update table statistics
ANALYZE;

-- Vacuum tables to reclaim space
VACUUM ANALYZE;

-- Reindex if necessary
REINDEX DATABASE fbms_db;
```

### Problem: Database Locks and Deadlocks

#### Symptoms
- Transactions hanging indefinitely
- "Deadlock detected" errors
- Users unable to save data

#### Diagnosis Steps
1. **Check Current Locks**:
   ```sql
   SELECT 
     t.relname,
     l.locktype,
     l.mode,
     l.granted,
     a.usename,
     a.query,
     a.query_start
   FROM pg_locks l
   JOIN pg_stat_activity a ON l.pid = a.pid
   JOIN pg_class t ON l.relation = t.oid
   WHERE NOT l.granted;
   ```

#### Solutions

**Solution 1: Implement Retry Logic**
```javascript
const executeWithRetry = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === '40P01' && i < maxRetries - 1) { // Deadlock
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
};
```

**Solution 2: Optimize Transaction Scope**
```javascript
// Bad: Long-running transaction
const badUpdate = async () => {
  const { data, error } = await supabase.rpc('begin_transaction');
  // ... many operations ...
  await supabase.rpc('commit_transaction');
};

// Good: Short transactions
const goodUpdate = async () => {
  const updates = prepareUpdates();
  const { data, error } = await supabase
    .from('table')
    .update(updates)
    .eq('id', id);
};
```

## Performance Issues

### Problem: Slow Page Load Times

#### Symptoms
- Pages take more than 3 seconds to load
- Users report sluggish interface
- High bounce rates

#### Diagnosis Steps
1. **Check Network Performance**:
   ```javascript
   // Measure page load time
   const startTime = performance.now();
   window.addEventListener('load', () => {
     const loadTime = performance.now() - startTime;
     console.log('Page load time:', loadTime, 'ms');
   });
   ```

2. **Analyze Bundle Size**:
   ```bash
   # Analyze build output
   pnpm build
   npx vite-bundle-analyzer dist
   ```

3. **Check Database Query Performance**:
   ```sql
   -- Enable query logging
   ALTER SYSTEM SET log_statement = 'all';
   ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
   
   -- Check slow queries
   SELECT 
     query,
     calls,
     total_time,
     mean_time
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

#### Solutions

**Solution 1: Implement Code Splitting**
```javascript
// Lazy load components
const CustomerManagement = lazy(() => import('./components/customers/CustomerManagement'));
const InventoryManagement = lazy(() => import('./components/inventory/InventoryManagement'));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <CustomerManagement />
</Suspense>
```

**Solution 2: Optimize Database Queries**
```sql
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_sales_created_at ON sales(created_at);
CREATE INDEX CONCURRENTLY idx_customers_email ON customers(email);
CREATE INDEX CONCURRENTLY idx_products_sku ON products(sku);

-- Optimize complex queries
-- Before: N+1 query problem
SELECT * FROM sales;
-- Then for each sale:
SELECT * FROM customers WHERE id = sale.customer_id;

-- After: Single query with JOIN
SELECT s.*, c.name as customer_name 
FROM sales s 
LEFT JOIN customers c ON s.customer_id = c.id;
```

**Solution 3: Implement Caching**
```javascript
// Client-side caching with React Query
import { useQuery } from 'react-query';

const useProducts = () => {
  return useQuery(
    'products',
    () => supabase.from('products').select('*'),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};

// Server-side caching with Redis (if available)
const getCachedData = async (key) => {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchFromDatabase();
  await redis.setex(key, 300, JSON.stringify(data)); // Cache for 5 minutes
  return data;
};
```

### Problem: High Memory Usage

#### Symptoms
- Browser tabs crash
- System becomes unresponsive
- Out of memory errors

#### Diagnosis Steps
1. **Monitor Memory Usage**:
   ```javascript
   // Check memory usage
   if (performance.memory) {
     console.log('Used:', performance.memory.usedJSHeapSize);
     console.log('Total:', performance.memory.totalJSHeapSize);
     console.log('Limit:', performance.memory.jsHeapSizeLimit);
   }
   ```

2. **Profile Memory Leaks**:
   - Use Chrome DevTools Memory tab
   - Take heap snapshots before and after operations
   - Look for detached DOM nodes

#### Solutions

**Solution 1: Fix Memory Leaks**
```javascript
// Bad: Event listeners not cleaned up
useEffect(() => {
  const handleResize = () => setWindowSize(window.innerWidth);
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
}, []);

// Good: Proper cleanup
useEffect(() => {
  const handleResize = () => setWindowSize(window.innerWidth);
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

**Solution 2: Optimize Large Lists**
```javascript
// Use virtualization for large lists
import { FixedSizeList as List } from 'react-window';

const ProductList = ({ products }) => (
  <List
    height={600}
    itemCount={products.length}
    itemSize={50}
    itemData={products}
  >
    {({ index, style, data }) => (
      <div style={style}>
        {data[index].name}
      </div>
    )}
  </List>
);
```

## Payment Integration Problems

### Problem: GCash Payment Failures

#### Symptoms
- Payment status shows "pending" indefinitely
- QR codes not generating
- Payment verification fails

#### Diagnosis Steps
1. **Check GCash API Status**:
   ```javascript
   const checkGCashStatus = async () => {
     try {
       const response = await fetch('https://api.gcash.com/status');
       console.log('GCash API Status:', response.status);
     } catch (error) {
       console.error('GCash API unreachable:', error);
     }
   };
   ```

2. **Verify API Credentials**:
   ```javascript
   // Check if credentials are properly configured
   console.log('GCash Merchant ID:', process.env.VITE_GCASH_MERCHANT_ID);
   console.log('GCash API Key exists:', !!process.env.VITE_GCASH_API_KEY);
   ```

3. **Check Payment Logs**:
   ```bash
   grep "gcash" /var/log/fbms/payment.log | tail -20
   ```

#### Solutions

**Solution 1: Implement Payment Retry Logic**
```javascript
const processGCashPayment = async (paymentData, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/gcash/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      if (attempt === maxRetries) {
        throw new Error('Payment failed after maximum retries');
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
};
```

**Solution 2: Implement Payment Status Polling**
```javascript
const pollPaymentStatus = async (paymentId) => {
  const maxPolls = 30; // 5 minutes with 10-second intervals
  let polls = 0;
  
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      polls++;
      
      try {
        const status = await checkPaymentStatus(paymentId);
        
        if (status === 'completed' || status === 'failed') {
          clearInterval(interval);
          resolve(status);
        }
        
        if (polls >= maxPolls) {
          clearInterval(interval);
          reject(new Error('Payment status check timeout'));
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 10000); // Check every 10 seconds
  });
};
```

### Problem: PayMaya Integration Issues

#### Symptoms
- Card payments rejected
- Webhook notifications not received
- Payment amounts incorrect

#### Diagnosis Steps
1. **Verify Webhook Configuration**:
   ```javascript
   // Check webhook endpoint
   const testWebhook = async () => {
     const response = await fetch('/api/paymaya/webhook/test', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ test: true })
     });
     console.log('Webhook test:', response.status);
   };
   ```

2. **Validate Payment Amounts**:
   ```javascript
   const validatePaymentAmount = (amount) => {
     // PayMaya expects amounts in centavos
     const centavos = Math.round(amount * 100);
     console.log('Amount in PHP:', amount);
     console.log('Amount in centavos:', centavos);
     return centavos;
   };
   ```

#### Solutions

**Solution 1: Fix Webhook Handling**
```javascript
// Proper webhook signature verification
const verifyWebhookSignature = (payload, signature, secret) => {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// Webhook handler
app.post('/api/paymaya/webhook', (req, res) => {
  const signature = req.headers['paymaya-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, process.env.PAYMAYA_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  processPaymentWebhook(req.body);
  res.status(200).send('OK');
});
```

## POS System Issues

### Problem: Barcode Scanner Not Working

#### Symptoms
- Camera not activating
- Barcodes not recognized
- Scanner interface not appearing

#### Diagnosis Steps
1. **Check Camera Permissions**:
   ```javascript
   const checkCameraPermission = async () => {
     try {
       const stream = await navigator.mediaDevices.getUserMedia({ video: true });
       console.log('Camera access granted');
       stream.getTracks().forEach(track => track.stop());
       return true;
     } catch (error) {
       console.error('Camera access denied:', error);
       return false;
     }
   };
   ```

2. **Test Barcode Detection**:
   ```javascript
   // Test with known barcode
   const testBarcode = '1234567890123';
   const product = await findProductByBarcode(testBarcode);
   console.log('Product found:', product);
   ```

#### Solutions

**Solution 1: Handle Camera Permissions**
```javascript
const BarcodeScanner = () => {
  const [hasPermission, setHasPermission] = useState(null);
  
  useEffect(() => {
    const requestPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
      } catch (error) {
        setHasPermission(false);
        console.error('Camera permission denied:', error);
      }
    };
    
    requestPermission();
  }, []);
  
  if (hasPermission === false) {
    return (
      <div className="text-center p-4">
        <p>Camera access is required for barcode scanning.</p>
        <button onClick={() => window.location.reload()}>
          Grant Permission
        </button>
      </div>
    );
  }
  
  return <BarcodeReader onScan={handleScan} />;
};
```

**Solution 2: Fallback Manual Entry**
```javascript
const ProductSelector = () => {
  const [scanMode, setScanMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  
  const handleManualEntry = async () => {
    if (manualBarcode) {
      const product = await findProductByBarcode(manualBarcode);
      if (product) {
        addToCart(product);
        setManualBarcode('');
      } else {
        toast.error('Product not found');
      }
    }
  };
  
  return (
    <div>
      {scanMode ? (
        <BarcodeScanner onScan={addToCart} />
      ) : (
        <div>
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Enter barcode manually"
          />
          <button onClick={handleManualEntry}>Add Product</button>
        </div>
      )}
      <button onClick={() => setScanMode(!scanMode)}>
        {scanMode ? 'Manual Entry' : 'Scan Barcode'}
      </button>
    </div>
  );
};
```

### Problem: Cart Calculations Incorrect

#### Symptoms
- Subtotals don't match item totals
- Tax calculations wrong
- Discounts not applied correctly

#### Diagnosis Steps
1. **Verify Calculation Logic**:
   ```javascript
   const debugCartCalculation = (cart) => {
     console.log('Cart items:', cart.items);
     
     const subtotal = cart.items.reduce((sum, item) => {
       const itemTotal = item.quantity * item.price;
       console.log(`Item ${item.name}: ${item.quantity} x ${item.price} = ${itemTotal}`);
       return sum + itemTotal;
     }, 0);
     
     console.log('Subtotal:', subtotal);
     console.log('Tax rate:', cart.taxRate);
     console.log('Tax amount:', subtotal * cart.taxRate);
     console.log('Discount:', cart.discount);
     console.log('Final total:', subtotal + (subtotal * cart.taxRate) - cart.discount);
   };
   ```

#### Solutions

**Solution 1: Fix Calculation Precision**
```javascript
// Use proper decimal handling
const calculateCartTotal = (items, taxRate = 0.12, discount = 0) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.price);
  }, 0);
  
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + taxAmount - discount) * 100) / 100;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount,
    discount,
    total
  };
};
```

**Solution 2: Validate Calculations**
```javascript
const validateCartCalculation = (cart) => {
  const expected = calculateCartTotal(cart.items, cart.taxRate, cart.discount);
  const actual = cart.totals;
  
  const tolerance = 0.01; // 1 centavo tolerance
  
  if (Math.abs(expected.total - actual.total) > tolerance) {
    console.error('Cart calculation mismatch:', { expected, actual });
    return false;
  }
  
  return true;
};
```

## Inventory Management Problems

### Problem: Stock Levels Incorrect

#### Symptoms
- Negative stock quantities
- Stock not updating after sales
- Inventory movements not recorded

#### Diagnosis Steps
1. **Check Stock Movement History**:
   ```sql
   SELECT 
     product_id,
     movement_type,
     quantity,
     created_at,
     reference
   FROM inventory_movements 
   WHERE product_id = 'product_id_here'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

2. **Verify Stock Calculation**:
   ```sql
   SELECT 
     p.id,
     p.name,
     p.stock_quantity as recorded_stock,
     COALESCE(SUM(
       CASE 
         WHEN im.movement_type = 'in' THEN im.quantity
         WHEN im.movement_type = 'out' THEN -im.quantity
         ELSE 0
       END
     ), 0) as calculated_stock
   FROM products p
   LEFT JOIN inventory_movements im ON p.id = im.product_id
   WHERE p.id = 'product_id_here'
   GROUP BY p.id, p.name, p.stock_quantity;
   ```

#### Solutions

**Solution 1: Fix Stock Synchronization**
```javascript
const syncProductStock = async (productId) => {
  // Calculate actual stock from movements
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('movement_type, quantity')
    .eq('product_id', productId);
  
  const calculatedStock = movements.reduce((stock, movement) => {
    return movement.movement_type === 'in' 
      ? stock + movement.quantity 
      : stock - movement.quantity;
  }, 0);
  
  // Update product stock
  const { error } = await supabase
    .from('products')
    .update({ stock_quantity: calculatedStock })
    .eq('id', productId);
  
  if (error) {
    console.error('Stock sync failed:', error);
    return false;
  }
  
  return true;
};
```

**Solution 2: Implement Stock Validation**
```javascript
const validateStockOperation = async (productId, quantity, operation) => {
  const { data: product } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();
  
  if (operation === 'out' && product.stock_quantity < quantity) {
    throw new Error(`Insufficient stock. Available: ${product.stock_quantity}, Requested: ${quantity}`);
  }
  
  return true;
};
```

### Problem: Low Stock Alerts Not Working

#### Symptoms
- No notifications for low stock items
- Reorder points not triggering alerts
- Email notifications not sent

#### Diagnosis Steps
1. **Check Alert Configuration**:
   ```sql
   SELECT 
     id,
     name,
     stock_quantity,
     reorder_point,
     CASE 
       WHEN stock_quantity <= reorder_point THEN 'LOW STOCK'
       ELSE 'OK'
     END as status
   FROM products
   WHERE stock_quantity <= reorder_point;
   ```

2. **Verify Notification Service**:
   ```javascript
   const testNotificationService = async () => {
     try {
       await sendTestNotification('Low stock alert test');
       console.log('Notification service working');
     } catch (error) {
       console.error('Notification service failed:', error);
     }
   };
   ```

#### Solutions

**Solution 1: Fix Alert Logic**
```javascript
const checkLowStockItems = async () => {
  const { data: lowStockItems } = await supabase
    .from('products')
    .select('id, name, stock_quantity, reorder_point')
    .lte('stock_quantity', 'reorder_point');
  
  for (const item of lowStockItems) {
    await sendLowStockAlert(item);
    
    // Log alert
    await supabase.from('stock_alerts').insert({
      product_id: item.id,
      alert_type: 'low_stock',
      current_stock: item.stock_quantity,
      reorder_point: item.reorder_point,
      sent_at: new Date().toISOString()
    });
  }
};

// Schedule to run every hour
setInterval(checkLowStockItems, 60 * 60 * 1000);
```

## Report Generation Issues

### Problem: Reports Not Loading

#### Symptoms
- Blank report pages
- "No data available" messages
- Report generation timeouts

#### Diagnosis Steps
1. **Check Data Query**:
   ```sql
   -- Test report query manually
   SELECT 
     DATE(created_at) as date,
     COUNT(*) as transaction_count,
     SUM(total) as total_sales
   FROM sales
   WHERE created_at >= '2024-01-01'
   GROUP BY DATE(created_at)
   ORDER BY date;
   ```

2. **Verify Date Filters**:
   ```javascript
   const debugDateFilter = (startDate, endDate) => {
     console.log('Start date:', startDate);
     console.log('End date:', endDate);
     console.log('Date range valid:', startDate <= endDate);
     console.log('Start date format:', new Date(startDate).toISOString());
     console.log('End date format:', new Date(endDate).toISOString());
   };
   ```

#### Solutions

**Solution 1: Fix Date Handling**
```javascript
const generateSalesReport = async (startDate, endDate) => {
  // Ensure proper date formatting
  const start = new Date(startDate).toISOString().split('T')[0];
  const end = new Date(endDate).toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      total,
      created_at,
      customer:customers(name)
    `)
    .gte('created_at', `${start}T00:00:00`)
    .lte('created_at', `${end}T23:59:59`)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Report query failed:', error);
    throw error;
  }
  
  return data;
};
```

**Solution 2: Add Report Caching**
```javascript
const getCachedReport = async (reportType, params) => {
  const cacheKey = `report_${reportType}_${JSON.stringify(params)}`;
  
  // Check cache first
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    
    // Use cache if less than 5 minutes old
    if (age < 5 * 60 * 1000) {
      return data;
    }
  }
  
  // Generate new report
  const data = await generateReport(reportType, params);
  
  // Cache result
  localStorage.setItem(cacheKey, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
  
  return data;
};
```

## Mobile and Responsive Issues

### Problem: Mobile Interface Not Working

#### Symptoms
- Buttons too small to tap
- Text not readable on mobile
- Horizontal scrolling required

#### Diagnosis Steps
1. **Check Viewport Configuration**:
   ```html
   <!-- Ensure proper viewport meta tag -->
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

2. **Test Responsive Breakpoints**:
   ```javascript
   const checkBreakpoints = () => {
     const width = window.innerWidth;
     console.log('Screen width:', width);
     console.log('Mobile:', width < 768);
     console.log('Tablet:', width >= 768 && width < 1024);
     console.log('Desktop:', width >= 1024);
   };
   ```

#### Solutions

**Solution 1: Fix Touch Targets**
```css
/* Ensure minimum touch target size */
.btn, .touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* Improve mobile form inputs */
.form-input {
  font-size: 16px; /* Prevents zoom on iOS */
  padding: 12px;
  border-radius: 8px;
}

/* Mobile-friendly navigation */
@media (max-width: 768px) {
  .desktop-nav {
    display: none;
  }
  
  .mobile-nav {
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
  }
}
```

**Solution 2: Implement Mobile-First Design**
```javascript
const MobileOptimizedComponent = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return (
    <div className={`component ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
};
```

## Deployment and Environment Issues

### Problem: Environment Variables Not Loading

#### Symptoms
- API calls failing with authentication errors
- Features not working in production
- Configuration values undefined

#### Diagnosis Steps
1. **Check Environment Variables**:
   ```bash
   # In production environment
   echo $VITE_SUPABASE_URL
   echo $VITE_SUPABASE_ANON_KEY
   
   # Check if variables are available in build
   grep -r "VITE_" dist/
   ```

2. **Verify Build Process**:
   ```bash
   # Check build logs
   pnpm build 2>&1 | grep -i error
   
   # Verify environment file
   cat .env.production
   ```

#### Solutions

**Solution 1: Fix Environment Configuration**
```bash
# Ensure proper environment file naming
# Development: .env.local or .env
# Production: .env.production

# Verify variable naming (must start with VITE_ for Vite)
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# Not accessible in frontend:
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

**Solution 2: Add Environment Validation**
```javascript
// Validate required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_APP_URL'
];

const validateEnvironment = () => {
  const missing = requiredEnvVars.filter(
    varName => !import.meta.env[varName]
  );
  
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Call during app initialization
validateEnvironment();
```

### Problem: Build Failures

#### Symptoms
- Build process exits with errors
- TypeScript compilation errors
- Missing dependencies

#### Diagnosis Steps
1. **Check Build Logs**:
   ```bash
   pnpm build --verbose
   ```

2. **Verify Dependencies**:
   ```bash
   pnpm audit
   pnpm outdated
   ```

#### Solutions

**Solution 1: Fix TypeScript Errors**
```bash
# Run type checking
pnpm tsc --noEmit

# Fix common issues
# - Add missing type definitions
# - Update import statements
# - Fix type annotations
```

**Solution 2: Update Dependencies**
```bash
# Update all dependencies
pnpm update

# Or update specific packages
pnpm update @supabase/supabase-js
pnpm update react react-dom

# Clear cache if needed
pnpm store prune
rm -rf node_modules
pnpm install
```

## Data Integrity Problems

### Problem: Data Corruption or Loss

#### Symptoms
- Missing records
- Corrupted data fields
- Inconsistent relationships

#### Diagnosis Steps
1. **Check Data Integrity**:
   ```sql
   -- Check for orphaned records
   SELECT s.id, s.customer_id 
   FROM sales s 
   LEFT JOIN customers c ON s.customer_id = c.id 
   WHERE s.customer_id IS NOT NULL AND c.id IS NULL;
   
   -- Check for duplicate records
   SELECT email, COUNT(*) 
   FROM customers 
   GROUP BY email 
   HAVING COUNT(*) > 1;
   
   -- Verify foreign key constraints
   SELECT conname, conrelid::regclass, confrelid::regclass
   FROM pg_constraint 
   WHERE contype = 'f';
   ```

#### Solutions

**Solution 1: Implement Data Validation**
```javascript
const validateSaleData = (saleData) => {
  const errors = [];
  
  if (!saleData.items || saleData.items.length === 0) {
    errors.push('Sale must have at least one item');
  }
  
  if (saleData.total <= 0) {
    errors.push('Sale total must be greater than zero');
  }
  
  if (saleData.customer_id) {
    // Verify customer exists
    const customerExists = await checkCustomerExists(saleData.customer_id);
    if (!customerExists) {
      errors.push('Invalid customer ID');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return true;
};
```

**Solution 2: Add Data Recovery Procedures**
```sql
-- Create data recovery functions
CREATE OR REPLACE FUNCTION recover_orphaned_sales()
RETURNS INTEGER AS $$
DECLARE
  recovered_count INTEGER := 0;
BEGIN
  -- Move orphaned sales to a recovery table
  INSERT INTO recovered_sales 
  SELECT s.* 
  FROM sales s 
  LEFT JOIN customers c ON s.customer_id = c.id 
  WHERE s.customer_id IS NOT NULL AND c.id IS NULL;
  
  GET DIAGNOSTICS recovered_count = ROW_COUNT;
  
  -- Remove orphaned sales from main table
  DELETE FROM sales s 
  WHERE EXISTS (
    SELECT 1 FROM recovered_sales r WHERE r.id = s.id
  );
  
  RETURN recovered_count;
END;
$$ LANGUAGE plpgsql;
```

## System Monitoring and Logs

### Log File Locations
```bash
# Application logs
/var/log/fbms/application.log
/var/log/fbms/error.log
/var/log/fbms/auth.log
/var/log/fbms/payment.log

# System logs
/var/log/nginx/access.log
/var/log/nginx/error.log
/var/log/postgresql/postgresql.log

# Deployment logs
/var/log/fbms/deployment.log
/var/log/fbms/backup.log
```

### Monitoring Commands
```bash
# Monitor application logs in real-time
tail -f /var/log/fbms/application.log

# Search for specific errors
grep -i "error" /var/log/fbms/application.log | tail -20

# Monitor system resources
htop
iostat -x 1
netstat -tulpn

# Check disk space
df -h
du -sh /var/log/fbms/*

# Monitor database connections
psql -h localhost -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Health Check Script
```bash
#!/bin/bash
# System health check

echo "=== FBMS System Health Check ==="
echo "Date: $(date)"
echo

# Check application status
echo "Application Status:"
systemctl is-active fbms && echo "✅ Application running" || echo "❌ Application stopped"

# Check database connectivity
echo "Database Status:"
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1 && \
  echo "✅ Database connected" || echo "❌ Database connection failed"

# Check disk space
echo "Disk Space:"
df -h | grep -E "(/$|/var)" | while read line; do
  usage=$(echo $line | awk '{print $5}' | sed 's/%//')
  if [ $usage -gt 80 ]; then
    echo "⚠️  High disk usage: $line"
  else
    echo "✅ Disk usage OK: $line"
  fi
done

# Check memory usage
echo "Memory Usage:"
free -h | grep Mem | awk '{
  used=$3; total=$2; 
  print "Used: " used " / " total
}'

# Check recent errors
echo "Recent Errors:"
error_count=$(grep -c "ERROR" /var/log/fbms/application.log | tail -100)
if [ $error_count -gt 10 ]; then
  echo "⚠️  High error count: $error_count errors in last 100 log entries"
else
  echo "✅ Error count normal: $error_count errors"
fi

echo
echo "=== Health Check Complete ==="
```

---

*This troubleshooting guide should be updated regularly as new issues are discovered and resolved. For issues not covered in this guide, please contact the technical support team with detailed error messages and steps to reproduce the problem.*