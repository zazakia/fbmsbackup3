# Supabase Setup Guide - Enable Real Data Saving

## Current Status

The application now has **two modes**:

1. **Mock Data Mode** (Default) - Uses local mock data for development
2. **Real Data Mode** - Saves data to Supabase database

## How to Enable Real Data Saving

### Option 1: Use the Built-in Authentication Banner

1. **Start the application** - You'll see a yellow banner saying "Development Mode - Using Mock Data"
2. **Click "Login"** in the banner
3. **Create an account** or **log in** with existing credentials
4. **Green banner appears** - "Connected to Supabase - Data will be saved to database"

### Option 2: Manual Supabase Setup

#### Step 1: Create a User in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **Authentication** → **Users**
4. Click **"Add User"**
5. Enter email and password (e.g., `admin@example.com` / `admin123`)

#### Step 2: Update RLS Policies (Optional)

If you're still getting 401 errors, you may need to update the Row Level Security policies:

1. Go to **SQL Editor** in your Supabase dashboard
2. Run this SQL to create permissive policies:

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Create permissive policies for development
CREATE POLICY "Allow all operations on customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Allow all operations on users" ON public.users FOR ALL USING (true);

-- Grant permissions to anon role as well
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;
```

#### Step 3: Add Missing Database Columns

If you want full customer functionality, run this SQL to add missing columns:

```sql
-- Add missing columns to the customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS province VARCHAR(100),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_purchases DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS business_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS birthday TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_purchase TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_contact TIMESTAMP WITH TIME ZONE;
```

## How It Works

### Authentication Flow

1. **App starts** → Checks if user is authenticated with Supabase
2. **If authenticated** → Uses real Supabase API calls
3. **If not authenticated** → Falls back to mock data (development only)

### Data Persistence

- **Mock Data**: Stored in memory, lost on page refresh
- **Real Data**: Stored in Supabase database, persists permanently

### Console Messages

Watch the browser console for these messages:

- `"Creating customer in Supabase..."` - Real data saving
- `"Fetching customers from Supabase..."` - Real data loading
- `"Not authenticated with Supabase, using mock data for development"` - Mock data mode

## Troubleshooting

### Still Getting 401 Errors?

1. **Check authentication status** - Look for the banner at the top of the app
2. **Verify user exists** - Check Supabase Authentication → Users
3. **Check RLS policies** - Run the SQL above to create permissive policies
4. **Check environment variables** - Ensure `.env.local` has correct Supabase URL and keys

### Data Not Saving?

1. **Check console logs** - Look for "Creating customer in Supabase..." messages
2. **Verify authentication** - Green banner should be visible
3. **Check network tab** - Look for successful POST requests to Supabase
4. **Check Supabase logs** - Go to Supabase dashboard → Logs

### Need to Reset?

1. **Clear browser storage** - Clear localStorage and sessionStorage
2. **Logout and login again** - Use the banner to re-authenticate
3. **Check Supabase session** - Go to Supabase dashboard → Authentication → Users

## Production Deployment

For production, you should:

1. **Remove mock data fallbacks** - Set `import.meta.env.DEV` to false
2. **Enforce authentication** - Remove the authentication bypass in `ProtectedRoute`
3. **Use proper RLS policies** - Create secure, role-based policies
4. **Set up proper user management** - Use Supabase Auth with proper user roles

## Benefits of Real Data Mode

✅ **Data Persistence** - Data survives page refreshes and browser restarts  
✅ **Multi-user Support** - Multiple users can access the same data  
✅ **Real-time Updates** - Changes sync across all connected clients  
✅ **Backup & Recovery** - Supabase provides automatic backups  
✅ **Scalability** - Can handle large amounts of data  
✅ **Security** - Row Level Security protects your data  

## Benefits of Mock Data Mode

✅ **Fast Development** - No authentication setup required  
✅ **Offline Development** - Works without internet connection  
✅ **No Database Costs** - No Supabase usage charges  
✅ **Quick Testing** - Instant feedback for UI changes  
✅ **Demo Purposes** - Easy to show functionality without setup 