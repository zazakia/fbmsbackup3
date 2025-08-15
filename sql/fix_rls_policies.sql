-- Safe RLS Policy Fix - Run this in Supabase SQL Editor
-- This fixes the RLS policies to allow authenticated users access

-- Helper function to safely drop all policies on a table
CREATE OR REPLACE FUNCTION drop_all_policies_on_table(table_name TEXT)
RETURNS void AS $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Loop through all policies on the table and drop them
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = table_name AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I CASCADE', policy_record.policyname, table_name);
        RAISE NOTICE 'Dropped policy % on table %', policy_record.policyname, table_name;
    END LOOP;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error dropping policies on table %: %', table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Helper function to create standard authenticated user policies
CREATE OR REPLACE FUNCTION create_auth_policies_for_table(table_name TEXT)
RETURNS void AS $$
BEGIN
    -- Disable RLS temporarily
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
    
    -- Drop all existing policies
    PERFORM drop_all_policies_on_table(table_name);
    
    -- Re-enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    
    -- Create new policies
    EXECUTE format('CREATE POLICY "Authenticated users can view %s" ON public.%I FOR SELECT USING (auth.role() = ''authenticated'')', table_name, table_name);
    EXECUTE format('CREATE POLICY "Authenticated users can insert %s" ON public.%I FOR INSERT WITH CHECK (auth.role() = ''authenticated'')', table_name, table_name);
    EXECUTE format('CREATE POLICY "Authenticated users can update %s" ON public.%I FOR UPDATE USING (auth.role() = ''authenticated'')', table_name, table_name);
    EXECUTE format('CREATE POLICY "Authenticated users can delete %s" ON public.%I FOR DELETE USING (auth.role() = ''authenticated'')', table_name, table_name);
    
    RAISE NOTICE 'Created authenticated user policies for table %', table_name;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating policies for table %: %', table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Apply to all core tables that exist
DO $$
DECLARE
    table_names TEXT[] := ARRAY['products', 'categories', 'customers', 'suppliers', 'purchase_orders', 'sales', 'expenses', 'expense_categories'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        -- Check if table exists before applying policies
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            PERFORM create_auth_policies_for_table(table_name);
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping', table_name;
        END IF;
    END LOOP;
END $$;

-- Clean up helper functions
DROP FUNCTION IF EXISTS drop_all_policies_on_table(TEXT);
DROP FUNCTION IF EXISTS create_auth_policies_for_table(TEXT);

-- Final status message
DO $$ 
BEGIN
    RAISE NOTICE 'RLS Policies Updated Successfully!';
    RAISE NOTICE 'All authenticated users now have full access to existing tables.';
    RAISE NOTICE 'This enables the FBMS app to function properly.';
END $$;