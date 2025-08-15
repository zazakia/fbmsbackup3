-- SIMPLE FIX: Disable RLS and enable anonymous access
-- Run this in Supabase SQL Editor Dashboard

-- 1. Disable RLS on core tables
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY; 
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

-- 2. Try to disable RLS on other common tables (ignore errors if they don't exist)
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on purchase_orders';
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on sales';
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on expenses';
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.expense_categories DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on expense_categories';
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Disabled RLS on users';
    EXCEPTION
        WHEN undefined_table THEN NULL;
    END;
END $$;

-- 3. Grant all permissions to anonymous role for development
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- 4. Also grant to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Success message
SELECT 'RLS disabled and permissions granted! App should now work.' as status;