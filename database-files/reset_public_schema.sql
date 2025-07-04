-- Script to reset public schema and create users and customers tables with proper policies
-- WARNING: This will delete ALL tables in the public schema

-- Step 1: Drop all existing tables in public schema
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all triggers first
    FOR r IN (SELECT t.tgname as triggername, c.relname as tablename
              FROM pg_trigger t
              JOIN pg_class c ON t.tgrelid = c.oid
              JOIN pg_namespace n ON c.relnamespace = n.oid
              WHERE n.nspname = 'public' AND t.tgname NOT LIKE 'RI_%') 
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.triggername) || 
                ' ON public.' || quote_ident(r.tablename);
    END LOOP;
    
    -- Drop all tables (CASCADE will handle policies automatically)
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions in public schema
    FOR r IN (SELECT p.proname as funcname, pg_get_function_identity_arguments(p.oid) as args
              FROM pg_proc p 
              JOIN pg_namespace n ON p.pronamespace = n.oid 
              WHERE n.nspname = 'public') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.funcname) || '(' || r.args || ') CASCADE';
    END LOOP;
END $$;

-- Step 2: Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Step 3: Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Philippines',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON public.customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
-- Users policies - allow authenticated users to manage their own data and admins to manage all
CREATE POLICY "Users can view all users" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert users" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Customers policies - allow authenticated users to manage customers
CREATE POLICY "Authenticated users can view customers" ON public.customers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert customers" ON public.customers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update customers" ON public.customers
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete customers" ON public.customers
    FOR DELETE USING (auth.role() = 'authenticated');

-- Step 8: Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Confirmation message
SELECT 'Public schema has been reset with users and customers tables created successfully' AS status;