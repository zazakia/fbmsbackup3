-- Fix RLS policies to allow anonymous access for development
-- This enables the app to work without authentication during development

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can manage purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can manage expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Authenticated users can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can manage accounts" ON public.accounts;
DROP POLICY IF EXISTS "Authenticated users can manage journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can manage payroll_periods" ON public.payroll_periods;
DROP POLICY IF EXISTS "Authenticated users can manage payroll_entries" ON public.payroll_entries;
DROP POLICY IF EXISTS "Authenticated users can manage leave_records" ON public.leave_records;
DROP POLICY IF EXISTS "Authenticated users can manage time_records" ON public.time_records;

-- Create permissive policies for development (allows all access)
CREATE POLICY "Allow all operations on customers" ON public.customers FOR ALL USING (true);
CREATE POLICY "Allow all operations on categories" ON public.categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true);
CREATE POLICY "Allow all operations on suppliers" ON public.suppliers FOR ALL USING (true);
CREATE POLICY "Allow all operations on purchase_orders" ON public.purchase_orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on sales" ON public.sales FOR ALL USING (true);
CREATE POLICY "Allow all operations on expense_categories" ON public.expense_categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on expenses" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Allow all operations on accounts" ON public.accounts FOR ALL USING (true);
CREATE POLICY "Allow all operations on journal_entries" ON public.journal_entries FOR ALL USING (true);
CREATE POLICY "Allow all operations on employees" ON public.employees FOR ALL USING (true);
CREATE POLICY "Allow all operations on payroll_periods" ON public.payroll_periods FOR ALL USING (true);
CREATE POLICY "Allow all operations on payroll_entries" ON public.payroll_entries FOR ALL USING (true);
CREATE POLICY "Allow all operations on leave_records" ON public.leave_records FOR ALL USING (true);
CREATE POLICY "Allow all operations on time_records" ON public.time_records FOR ALL USING (true);

-- Grant permissions to anon role for development
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Confirmation message
DO $$ 
BEGIN
    RAISE NOTICE 'RLS policies updated to allow anonymous access for development';
    RAISE NOTICE 'All tables now permit CRUD operations without authentication';
END $$;