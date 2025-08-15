-- Test database connection and permissions
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
SELECT COUNT(*) as category_count FROM public.categories;

-- 5. Insert test category if none exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Test Category') THEN
        INSERT INTO public.categories (name, description, is_active)
        VALUES ('Test Category', 'Test category for debugging', true);
        RAISE NOTICE 'Inserted test category';
    END IF;
END $$;

-- 6. Final verification
SELECT 'Final verification...' as test_step;
SELECT 
    'Products: ' || COUNT(*) as summary
FROM public.products
UNION ALL
SELECT 
    'Categories: ' || COUNT(*) as summary
FROM public.categories;

-- 7. Check permissions
SELECT 'Checking permissions...' as test_step;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasinsertacl,
    hasselectacl
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('products', 'categories', 'customers', 'suppliers')
ORDER BY tablename;

SELECT 'Test completed successfully!' as result;