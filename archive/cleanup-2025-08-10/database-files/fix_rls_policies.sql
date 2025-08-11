-- Fix RLS policies for development
-- This script creates permissive policies to allow access during development

-- Option 1: Disable RLS temporarily for development
-- ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;

-- Option 2: Create permissive policies for development (recommended)
-- Drop existing policies
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

-- Verify the changes
SELECT 'RLS policies updated for development' as message;