-- Fix Products Table RLS Policies
-- This migration ensures proper access to products table for all authenticated users

-- First, check if RLS is enabled and disable it temporarily to fix policies
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies (using CASCADE to handle dependencies)
DO $$
BEGIN
    -- Drop all existing policies on products table
    DROP POLICY IF EXISTS "Users can view business products" ON public.products CASCADE;
    DROP POLICY IF EXISTS "Managers can insert products" ON public.products CASCADE;
    DROP POLICY IF EXISTS "Managers can update products" ON public.products CASCADE;
    DROP POLICY IF EXISTS "Only admins can delete products" ON public.products CASCADE;
    DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products CASCADE;
    DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products CASCADE;
    DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products CASCADE;
    DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products CASCADE;
    
    RAISE NOTICE 'Dropped existing policies on products table';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Some policies may not have existed: %', SQLERRM;
END $$;

-- Re-enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create new simple policies that work with current user system
-- Allow all authenticated users to view products
CREATE POLICY "Authenticated users can view products" ON public.products
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert products  
CREATE POLICY "Authenticated users can insert products" ON public.products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update products
CREATE POLICY "Authenticated users can update products" ON public.products
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete products
CREATE POLICY "Authenticated users can delete products" ON public.products
    FOR DELETE USING (auth.role() = 'authenticated');

-- Apply similar fixes to other tables that might have issues

-- Categories table
DO $$
BEGIN
    -- Check if categories table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'categories' AND table_schema = 'public') THEN
        ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view business categories" ON public.categories CASCADE;
        DROP POLICY IF EXISTS "Managers can insert categories" ON public.categories CASCADE;
        DROP POLICY IF EXISTS "Managers can update categories" ON public.categories CASCADE;
        DROP POLICY IF EXISTS "Only admins can delete categories" ON public.categories CASCADE;
        DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories CASCADE;
        DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories CASCADE;
        DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories CASCADE;
        DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories CASCADE;

        ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Authenticated users can view categories" ON public.categories
            FOR SELECT USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can insert categories" ON public.categories
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can update categories" ON public.categories
            FOR UPDATE USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can delete categories" ON public.categories
            FOR DELETE USING (auth.role() = 'authenticated');
            
        RAISE NOTICE 'Updated categories table policies';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error updating categories policies: %', SQLERRM;
END $$;

-- Customers table
DO $$
BEGIN
    -- Check if customers table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view business customers" ON public.customers CASCADE;
        DROP POLICY IF EXISTS "Users can insert customers" ON public.customers CASCADE;
        DROP POLICY IF EXISTS "Users can update customers" ON public.customers CASCADE;
        DROP POLICY IF EXISTS "Only admins can delete customers" ON public.customers CASCADE;
        DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers CASCADE;
        DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers CASCADE;
        DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers CASCADE;
        DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers CASCADE;

        ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Authenticated users can view customers" ON public.customers
            FOR SELECT USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can insert customers" ON public.customers
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can update customers" ON public.customers
            FOR UPDATE USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can delete customers" ON public.customers
            FOR DELETE USING (auth.role() = 'authenticated');
            
        RAISE NOTICE 'Updated customers table policies';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error updating customers policies: %', SQLERRM;
END $$;

-- Suppliers table
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view business suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Managers can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Managers can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Only admins can delete suppliers" ON public.suppliers;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert suppliers" ON public.suppliers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete suppliers" ON public.suppliers
    FOR DELETE USING (auth.role() = 'authenticated');

-- Purchase orders table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
        ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view business purchase orders" ON public.purchase_orders;
        DROP POLICY IF EXISTS "Managers can insert purchase orders" ON public.purchase_orders;
        DROP POLICY IF EXISTS "Managers can update purchase orders" ON public.purchase_orders;
        DROP POLICY IF EXISTS "Only admins can delete purchase orders" ON public.purchase_orders;

        ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Authenticated users can view purchase orders" ON public.purchase_orders
            FOR SELECT USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can insert purchase orders" ON public.purchase_orders
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can update purchase orders" ON public.purchase_orders
            FOR UPDATE USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can delete purchase orders" ON public.purchase_orders
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Sales table
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sales') THEN
        ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view business sales" ON public.sales;
        DROP POLICY IF EXISTS "Cashiers can insert sales" ON public.sales;
        DROP POLICY IF EXISTS "Managers can update sales" ON public.sales;
        DROP POLICY IF EXISTS "Only admins can delete sales" ON public.sales;

        ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Authenticated users can view sales" ON public.sales
            FOR SELECT USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can insert sales" ON public.sales
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can update sales" ON public.sales
            FOR UPDATE USING (auth.role() = 'authenticated');

        CREATE POLICY "Authenticated users can delete sales" ON public.sales
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Add note about the policy changes
DO $$ 
BEGIN
    RAISE NOTICE 'RLS Policies Updated Successfully!';
    RAISE NOTICE 'All authenticated users now have full access to:';
    RAISE NOTICE '- Products table';
    RAISE NOTICE '- Categories table';  
    RAISE NOTICE '- Customers table';
    RAISE NOTICE '- Suppliers table';
    RAISE NOTICE '- Purchase orders table (if exists)';
    RAISE NOTICE '- Sales table (if exists)';
    RAISE NOTICE 'This enables the FBMS app to function properly in development.';
END $$;