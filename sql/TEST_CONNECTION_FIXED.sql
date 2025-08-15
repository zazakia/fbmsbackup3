-- Test database connection and permissions (FIXED VERSION)
-- Run this in Supabase SQL Editor to verify setup

-- 1. Test basic table access
SELECT 'Testing products table...' as test_step;
SELECT COUNT(*) as product_count FROM public.products;

-- 2. Test if we can insert data directly
SELECT 'Testing direct insert...' as test_step;
INSERT INTO public.products (name, sku, category, price, cost, stock, min_stock, unit, is_active)
VALUES ('Test Product', 'TEST-001', 'Test Category', 99.99, 50.00, 10, 5, 'pcs', true)
ON CONFLICT (sku) DO NOTHING;

-- 3. Check what we have after insert
SELECT 'Current products in database...' as test_step;
SELECT id, name, sku, category, price, stock, is_active, created_at
FROM public.products 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Test categories table
SELECT 'Testing categories table...' as test_step;
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'categories' AND table_schema = 'public') THEN
        RAISE NOTICE 'Categories table exists';
        PERFORM COUNT(*) FROM public.categories;
    ELSE
        RAISE NOTICE 'Categories table does not exist';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error accessing categories: %', SQLERRM;
END $$;

-- 5. Insert test category if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'categories' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Test Category') THEN
            INSERT INTO public.categories (name, description, is_active)
            VALUES ('Test Category', 'Test category for debugging', true);
            RAISE NOTICE 'Inserted test category';
        END IF;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not insert test category: %', SQLERRM;
END $$;

-- 6. Check RLS status on tables
SELECT 'Checking RLS status...' as test_step;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('products', 'categories', 'customers', 'suppliers')
ORDER BY tablename;

-- 7. List all tables in public schema
SELECT 'Available tables...' as test_step;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 8. Test anonymous access by checking current role
SELECT 'Current database role...' as test_step;
SELECT 
    current_user as current_role,
    session_user as session_role;

-- 9. Final verification with product data
SELECT 'Final product check...' as test_step;
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
    MAX(created_at) as latest_product_date
FROM public.products;

SELECT 'Test completed successfully!' as result;