# 🚨 Fix for 404 Error: activity_logs table missing

## Problem Analysis
Your frontend application at `http://localhost:5180/` is trying to access a `activity_logs` table via the Supabase REST API, but this table doesn't exist in your database, causing a 404 error.

**Error Details:**
```
Supabase HTTP error {
  "status": 404,
  "statusText": "",
  "url": "https://coqjcziquviehgyifhek.supabase.co/rest/v1/activity_logs",
  "body": {}
}
```

## ✅ Solution

### Option 1: Use Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/coqjcziquviehgyifhek/editor
2. Copy and paste the content from `create_activity_logs.sql` 
3. Click "Run" to execute the SQL

### Option 2: Use psql directly
```bash
# Get your connection string from Supabase dashboard
psql "your-connection-string-here" -f create_activity_logs.sql
```

### Option 3: Use Supabase CLI (if migrations work)
```bash
supabase db push --include-all
```

## 📊 What the activity_logs table provides:

### Table Structure:
- `id` - Primary key (UUID)
- `user_id` - Reference to authenticated user
- `user_email` - User's email for easy identification
- `action` - Type of action (create, update, delete, login, etc.)
- `entity_type` - What was affected (product, order, customer, etc.)
- `entity_id` - ID of the affected record
- `entity_name` - Human-readable name of the affected entity
- `description` - Detailed description of what happened
- `details` - JSON object with additional metadata
- `ip_address` - User's IP address
- `user_agent` - Browser/client information
- `session_id` - Session identifier
- `created_at` - When the activity occurred
- `updated_at` - When the record was last modified

### Security Features:
- ✅ Row Level Security (RLS) enabled
- ✅ Proper authentication policies
- ✅ Indexed for performance
- ✅ Audit trail capabilities

## 🔧 Frontend Integration

Once the table is created, your frontend can:

### View recent activities:
```javascript
const { data, error } = await supabase
  .from('activity_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);
```

### Log user activities:
```javascript
const logActivity = async (action, entityType, entityId, description, details = {}) => {
  const { error } = await supabase
    .from('activity_logs')
    .insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: details.name,
      description,
      details,
      user_agent: navigator.userAgent
    });
};
```

### Example usage in your ERP:
```javascript
// Log when a product is created
await logActivity('create', 'product', productId, 'New product added to inventory', {
  product_name: 'Sample Product',
  sku: 'SKU-001',
  category: 'Electronics'
});

// Log when a purchase order is updated
await logActivity('update', 'purchase_order', orderId, 'Purchase order status changed', {
  old_status: 'draft',
  new_status: 'approved',
  po_number: 'PO-001'
});
```

## 🎯 Verification

After creating the table, verify it works:

1. **Check table exists:**
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'activity_logs';
   ```

2. **Test insert:**
   ```sql
   INSERT INTO activity_logs (action, entity_type, description) 
   VALUES ('test', 'verification', 'Testing activity logs table');
   ```

3. **Check data:**
   ```sql
   SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5;
   ```

## 📝 Next Steps

1. ✅ Create the table (using one of the options above)
2. 🔄 Refresh your frontend application
3. ✅ Verify the 404 error is resolved
4. 📊 Start logging user activities in your ERP system
5. 🎨 Add activity logs display to your admin dashboard

The error should be completely resolved once the `activity_logs` table is created in your database!
