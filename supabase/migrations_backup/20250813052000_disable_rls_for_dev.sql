-- DEVELOPMENT ONLY: Disable RLS for easier development
-- WARNING: This removes security - only use in development environment

-- Disable RLS on all core tables for development ease
DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'products', 'categories', 'customers', 'suppliers', 
        'purchase_orders', 'sales', 'expenses', 'expense_categories',
        'users', 'employees', 'payroll_entries', 'stock_movements'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        -- Check if table exists before disabling RLS
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'Disabled RLS on table: %', table_name;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping', table_name;
        END IF;
    END LOOP;
END $$;

-- Status message
DO $$ 
BEGIN
    RAISE NOTICE '⚠️  DEVELOPMENT MODE: RLS Disabled';
    RAISE NOTICE 'All users can now access all data without restrictions.';
    RAISE NOTICE 'This is for development only - re-enable RLS for production!';
END $$;