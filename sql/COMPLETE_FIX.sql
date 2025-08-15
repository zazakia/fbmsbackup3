-- COMPLETE FIX: Enable anonymous access + disable RLS
-- Run this in Supabase SQL Editor Dashboard

-- 1. Disable RLS on all core tables (already done but ensuring it's complete)
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY; 
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on additional tables if they exist
DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'purchase_orders', 'sales', 'expenses', 'expense_categories',
        'users', 'employees', 'payroll_entries', 'stock_movements',
        'journal_entries', 'accounts'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'Disabled RLS on table: %', table_name;
        END IF;
    END LOOP;
END $$;

-- 3. Create policies that allow anonymous access (as backup)
DO $$
DECLARE
    table_names TEXT[] := ARRAY['products', 'categories', 'customers', 'suppliers'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            -- Drop existing policies first
            EXECUTE format('DROP POLICY IF EXISTS "Anonymous access for %s" ON public.%I CASCADE', table_name, table_name);
            
            -- Create new anonymous access policy
            EXECUTE format('CREATE POLICY "Anonymous access for %s" ON public.%I FOR ALL USING (true) WITH CHECK (true)', table_name, table_name);
            RAISE NOTICE 'Created anonymous access policy for: %', table_name;
        END IF;
    END LOOP;
END $$;

-- 4. Grant permissions to anonymous role
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 5. Create a development user for testing (optional)
DO $$
BEGIN
    -- Create a test user if it doesn't exist
    IF NOT EXISTS (SELECT FROM public.users WHERE email = 'dev@test.com') THEN
        INSERT INTO public.users (id, email, first_name, last_name, role, is_active)
        VALUES (
            'dev-user-' || extract(epoch from now())::text,
            'dev@test.com',
            'Dev',
            'User',
            'admin',
            true
        );
        RAISE NOTICE 'Created development user: dev@test.com';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not create dev user (table may not exist): %', SQLERRM;
END $$;

-- Success message
SELECT 'Complete fix applied! Anonymous access enabled, RLS disabled.' as status;