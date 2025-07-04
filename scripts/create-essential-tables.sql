-- =============================================
-- Essential Database Tables for FBMS Admin Features
-- Run this script in your Supabase SQL Editor
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Fix users table (add missing columns)
DO $$ 
BEGIN
    -- Add role column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'employee', 'viewer'));
    END IF;

    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'status' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));
    END IF;

    -- Add other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'department' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN department VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'full_name' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN full_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_sign_in_at' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Philippines',
    postal_code VARCHAR(20),
    tax_id VARCHAR(50),
    payment_terms VARCHAR(10) DEFAULT '30',
    credit_limit DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    notes TEXT,
    total_purchases DECIMAL(15,2) DEFAULT 0,
    last_purchase_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    supplier_id UUID REFERENCES public.suppliers(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('sale', 'purchase', 'return', 'refund')),
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    payment_method VARCHAR(50) DEFAULT 'cash',
    reference_number VARCHAR(100) UNIQUE,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    items_count INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create transaction_items table
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create audit_log table for history tracking
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES auth.users(id),
    user_email VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 6. Update customers table with transaction tracking columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'total_purchases' AND table_schema = 'public') THEN
        ALTER TABLE public.customers ADD COLUMN total_purchases INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'total_spent' AND table_schema = 'public') THEN
        ALTER TABLE public.customers ADD COLUMN total_spent DECIMAL(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'last_purchase_date' AND table_schema = 'public') THEN
        ALTER TABLE public.customers ADD COLUMN last_purchase_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'average_order_value' AND table_schema = 'public') THEN
        ALTER TABLE public.customers ADD COLUMN average_order_value DECIMAL(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'purchase_frequency' AND table_schema = 'public') THEN
        ALTER TABLE public.customers ADD COLUMN purchase_frequency INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create trigger functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[] := ARRAY[]::TEXT[];
    field_name TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSE -- UPDATE
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        FOR field_name IN SELECT jsonb_object_keys(new_data) LOOP
            IF old_data->field_name IS DISTINCT FROM new_data->field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;
    END IF;

    INSERT INTO public.audit_log (
        table_name, record_id, action, old_data, new_data, changed_fields,
        user_id, user_email, timestamp
    ) VALUES (
        TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, old_data, new_data, changed_fields,
        auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), NOW()
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to update customer statistics
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.status = 'completed' AND NEW.customer_id IS NOT NULL THEN
            UPDATE public.customers 
            SET 
                total_purchases = (SELECT COUNT(*) FROM public.transactions WHERE customer_id = NEW.customer_id AND status = 'completed'),
                total_spent = (SELECT COALESCE(SUM(total_amount), 0) FROM public.transactions WHERE customer_id = NEW.customer_id AND status = 'completed'),
                last_purchase_date = (SELECT MAX(transaction_date) FROM public.transactions WHERE customer_id = NEW.customer_id AND status = 'completed'),
                average_order_value = (SELECT COALESCE(AVG(total_amount), 0) FROM public.transactions WHERE customer_id = NEW.customer_id AND status = 'completed')
            WHERE id = NEW.customer_id;
        END IF;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        IF OLD.customer_id IS NOT NULL THEN
            UPDATE public.customers 
            SET 
                total_purchases = (SELECT COUNT(*) FROM public.transactions WHERE customer_id = OLD.customer_id AND status = 'completed'),
                total_spent = (SELECT COALESCE(SUM(total_amount), 0) FROM public.transactions WHERE customer_id = OLD.customer_id AND status = 'completed'),
                last_purchase_date = (SELECT MAX(transaction_date) FROM public.transactions WHERE customer_id = OLD.customer_id AND status = 'completed'),
                average_order_value = (SELECT COALESCE(AVG(total_amount), 0) FROM public.transactions WHERE customer_id = OLD.customer_id AND status = 'completed')
            WHERE id = OLD.customer_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON public.suppliers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON public.transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_stats_trigger ON public.transactions;
CREATE TRIGGER update_customer_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Add audit triggers
DROP TRIGGER IF EXISTS audit_customers_trigger ON public.customers;
CREATE TRIGGER audit_customers_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_suppliers_trigger ON public.suppliers;
CREATE TRIGGER audit_suppliers_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_transactions_trigger ON public.transactions;
CREATE TRIGGER audit_transactions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON public.suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON public.transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Suppliers policies
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;
CREATE POLICY "Users can view suppliers" ON public.suppliers
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers can manage suppliers" ON public.suppliers;
CREATE POLICY "Managers can manage suppliers" ON public.suppliers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Transactions policies
DROP POLICY IF EXISTS "Users can view transactions" ON public.transactions;
CREATE POLICY "Users can view transactions" ON public.transactions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage transactions" ON public.transactions;
CREATE POLICY "Users can manage transactions" ON public.transactions
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    );

-- Audit log policies (admin only)
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log" ON public.audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Grant permissions
GRANT ALL ON public.suppliers TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transaction_items TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

-- Make current user admin
INSERT INTO public.users (id, email, role, status, full_name) 
SELECT 
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'admin',
    'active',
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()), 'Admin User')
WHERE auth.uid() IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    role = CASE WHEN public.users.role IS NULL OR public.users.role = 'viewer' THEN 'admin' ELSE public.users.role END,
    status = COALESCE(public.users.status, 'active'),
    email = EXCLUDED.email,
    updated_at = NOW();

-- Insert sample data
INSERT INTO public.suppliers (name, contact_person, email, phone, address, city, country) VALUES
('ABC Supplies Inc.', 'John Doe', 'john@abcsupplies.com', '+63-912-345-6789', '123 Business St.', 'Manila', 'Philippines'),
('XYZ Trading Co.', 'Jane Smith', 'jane@xyztrading.com', '+63-917-987-6543', '456 Commerce Ave.', 'Quezon City', 'Philippines')
ON CONFLICT (email) DO NOTHING;

SELECT 'Essential tables created successfully! Admin features are now ready to use.' as message;