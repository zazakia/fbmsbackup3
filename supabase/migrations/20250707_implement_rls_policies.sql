-- Database RLS (Row Level Security) Policies for FBMS
-- This migration implements comprehensive security policies for all tables
-- Based on user roles: admin, manager, cashier, employee

-- Enable RLS on all tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create user roles enum if not exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'cashier', 'employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create business_users table for role management
CREATE TABLE IF NOT EXISTS public.business_users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    business_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on business_users
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.business_users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is manager or admin
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's business_id
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT business_id 
        FROM public.business_users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES FOR BUSINESS_USERS TABLE
-- ============================================================================

-- Users can view their own record and admins can view all
CREATE POLICY "Users can view own record" ON public.business_users
    FOR SELECT USING (
        id = auth.uid() OR is_admin()
    );

-- Only admins can insert new users
CREATE POLICY "Only admins can insert users" ON public.business_users
    FOR INSERT WITH CHECK (is_admin());

-- Users can update their own profile, admins can update all
CREATE POLICY "Users can update own profile" ON public.business_users
    FOR UPDATE USING (
        id = auth.uid() OR is_admin()
    );

-- Only admins can delete users
CREATE POLICY "Only admins can delete users" ON public.business_users
    FOR DELETE USING (is_admin());

-- ============================================================================
-- SALES AND TRANSACTIONS POLICIES
-- ============================================================================

-- Create sales table if not exists (example structure)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    cashier_id UUID REFERENCES public.business_users(id),
    customer_id UUID,
    total DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Sales policies
CREATE POLICY "Users can view sales from same business" ON public.sales
    FOR SELECT USING (
        business_id = get_user_business_id()
    );

-- Cashiers and above can insert sales
CREATE POLICY "Cashiers can insert sales" ON public.sales
    FOR INSERT WITH CHECK (
        get_user_role() IN ('admin', 'manager', 'cashier') 
        AND business_id = get_user_business_id()
    );

-- Managers and admins can update sales
CREATE POLICY "Managers can update sales" ON public.sales
    FOR UPDATE USING (
        is_manager_or_admin() 
        AND business_id = get_user_business_id()
    );

-- Only admins can delete sales
CREATE POLICY "Only admins can delete sales" ON public.sales
    FOR DELETE USING (
        is_admin() 
        AND business_id = get_user_business_id()
    );

-- ============================================================================
-- INVENTORY POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    name TEXT NOT NULL,
    sku TEXT,
    price DECIMAL(10,2),
    cost DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- All users can view products from their business
CREATE POLICY "Users can view business products" ON public.products
    FOR SELECT USING (
        business_id = get_user_business_id()
    );

-- Managers and admins can insert products
CREATE POLICY "Managers can insert products" ON public.products
    FOR INSERT WITH CHECK (
        is_manager_or_admin() 
        AND business_id = get_user_business_id()
    );

-- Managers and admins can update products
CREATE POLICY "Managers can update products" ON public.products
    FOR UPDATE USING (
        is_manager_or_admin() 
        AND business_id = get_user_business_id()
    );

-- Only admins can delete products
CREATE POLICY "Only admins can delete products" ON public.products
    FOR DELETE USING (
        is_admin() 
        AND business_id = get_user_business_id()
    );

-- ============================================================================
-- CUSTOMER POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- All users can view customers from their business
CREATE POLICY "Users can view business customers" ON public.customers
    FOR SELECT USING (
        business_id = get_user_business_id()
    );

-- All authenticated users can insert customers
CREATE POLICY "Users can insert customers" ON public.customers
    FOR INSERT WITH CHECK (
        business_id = get_user_business_id()
    );

-- All users can update customers
CREATE POLICY "Users can update customers" ON public.customers
    FOR UPDATE USING (
        business_id = get_user_business_id()
    );

-- Only managers and admins can delete customers
CREATE POLICY "Managers can delete customers" ON public.customers
    FOR DELETE USING (
        is_manager_or_admin() 
        AND business_id = get_user_business_id()
    );

-- ============================================================================
-- FINANCIAL DATA POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    account TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT CHECK (type IN ('debit', 'credit')),
    description TEXT,
    reference_id UUID,
    date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.business_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Only managers and admins can view financial data
CREATE POLICY "Managers can view journal entries" ON public.journal_entries
    FOR SELECT USING (
        is_manager_or_admin() 
        AND business_id = get_user_business_id()
    );

-- Only managers and admins can insert journal entries
CREATE POLICY "Managers can insert journal entries" ON public.journal_entries
    FOR INSERT WITH CHECK (
        is_manager_or_admin() 
        AND business_id = get_user_business_id()
    );

-- Only admins can update journal entries
CREATE POLICY "Only admins can update journal entries" ON public.journal_entries
    FOR UPDATE USING (
        is_admin() 
        AND business_id = get_user_business_id()
    );

-- Only admins can delete journal entries
CREATE POLICY "Only admins can delete journal entries" ON public.journal_entries
    FOR DELETE USING (
        is_admin() 
        AND business_id = get_user_business_id()
    );

-- ============================================================================
-- AUDIT LOG POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL,
    user_id UUID REFERENCES public.business_users(id),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        is_admin() 
        AND business_id = get_user_business_id()
    );

-- System can insert audit logs (no user restrictions for logging)
CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- No updates or deletes allowed on audit logs
CREATE POLICY "No updates on audit logs" ON public.audit_logs
    FOR UPDATE USING (false);

CREATE POLICY "No deletes on audit logs" ON public.audit_logs
    FOR DELETE USING (false);

-- ============================================================================
-- TRIGGERS FOR AUDIT LOGGING
-- ============================================================================

-- Create audit log trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    business_id_val UUID;
BEGIN
    -- Get business_id from the record
    business_id_val := COALESCE(NEW.business_id, OLD.business_id);
    
    INSERT INTO public.audit_logs (
        business_id,
        user_id,
        table_name,
        operation,
        old_data,
        new_data
    ) VALUES (
        business_id_val,
        auth.uid(),
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to important tables
DROP TRIGGER IF EXISTS audit_sales ON public.sales;
CREATE TRIGGER audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_products ON public.products;
CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_customers ON public.customers;
CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_journal_entries ON public.journal_entries;
CREATE TRIGGER audit_journal_entries
    AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- BUSINESS SEPARATION POLICIES
-- ============================================================================

-- Create businesses table for multi-tenancy
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    tin TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own business
CREATE POLICY "Users can view own business" ON public.businesses
    FOR SELECT USING (
        id = get_user_business_id() OR is_admin()
    );

-- Only admins can manage businesses
CREATE POLICY "Only admins can manage businesses" ON public.businesses
    FOR ALL USING (is_admin());

-- ============================================================================
-- SECURITY FUNCTIONS FOR APPLICATION
-- ============================================================================

-- Function to safely get user data
CREATE OR REPLACE FUNCTION get_current_user_data()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    role user_role,
    business_id UUID,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bu.id,
        bu.email,
        bu.role,
        bu.business_id,
        bu.is_active
    FROM public.business_users bu
    WHERE bu.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check specific permission
CREATE OR REPLACE FUNCTION has_permission(required_role user_role)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    user_role_val := get_user_role();
    
    -- Admin has all permissions
    IF user_role_val = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Check role hierarchy
    CASE required_role
        WHEN 'employee' THEN
            RETURN user_role_val IN ('employee', 'cashier', 'manager', 'admin');
        WHEN 'cashier' THEN
            RETURN user_role_val IN ('cashier', 'manager', 'admin');
        WHEN 'manager' THEN
            RETURN user_role_val IN ('manager', 'admin');
        WHEN 'admin' THEN
            RETURN user_role_val = 'admin';
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create indexes for better performance with RLS
CREATE INDEX IF NOT EXISTS idx_business_users_business_id ON public.business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON public.sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_business_id ON public.journal_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON public.audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default admin user (this should be customized for production)
INSERT INTO public.business_users (id, email, role, business_id, is_active)
SELECT 
    id,
    email,
    'admin'::user_role,
    gen_random_uuid(), -- Generate a default business_id
    true
FROM auth.users
WHERE email = 'admin@fbms.com'
ON CONFLICT (id) DO NOTHING;

-- Create default business
INSERT INTO public.businesses (id, name, tin, address, phone, email)
SELECT 
    bu.business_id,
    'FBMS Default Business',
    '123-456-789-000',
    '123 Business Street, Makati City, Metro Manila',
    '+63 912 345 6789',
    'business@fbms.com'
FROM public.business_users bu
WHERE bu.email = 'admin@fbms.com'
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_manager_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_data() TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission(user_role) TO authenticated;

-- End of RLS Policy Migration