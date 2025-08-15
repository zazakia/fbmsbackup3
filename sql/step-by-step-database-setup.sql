-- =============================================
-- Step-by-Step Database Setup for FBMS
-- Run each section separately if needed
-- =============================================

-- STEP 1: Fix Users Table First (MOST IMPORTANT)
-- =============================================

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns one by one to avoid conflicts
DO $$ 
BEGIN
    -- Add role column
    BEGIN
        ALTER TABLE public.users ADD COLUMN role VARCHAR(20) DEFAULT 'viewer';
        ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'employee', 'viewer'));
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column role already exists';
        WHEN others THEN 
            RAISE NOTICE 'Could not add role column: %', SQLERRM;
    END;

    -- Add status column
    BEGIN
        ALTER TABLE public.users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive', 'suspended'));
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column status already exists';
        WHEN others THEN 
            RAISE NOTICE 'Could not add status column: %', SQLERRM;
    END;

    -- Add department column
    BEGIN
        ALTER TABLE public.users ADD COLUMN department VARCHAR(100);
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column department already exists';
        WHEN others THEN 
            RAISE NOTICE 'Could not add department column: %', SQLERRM;
    END;

    -- Add full_name column
    BEGIN
        ALTER TABLE public.users ADD COLUMN full_name VARCHAR(255);
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column full_name already exists';
        WHEN others THEN 
            RAISE NOTICE 'Could not add full_name column: %', SQLERRM;
    END;

    -- Add last_sign_in_at column
    BEGIN
        ALTER TABLE public.users ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column last_sign_in_at already exists';
        WHEN others THEN 
            RAISE NOTICE 'Could not add last_sign_in_at column: %', SQLERRM;
    END;

    RAISE NOTICE 'Users table setup completed';
END $$;

-- STEP 2: Make current user admin
-- =============================================

-- Insert current user as admin (safe upsert)
DO $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.users (id, email, role, status, full_name) 
        VALUES (
            auth.uid(),
            (SELECT email FROM auth.users WHERE id = auth.uid()),
            'admin',
            'active',
            'Admin User'
        )
        ON CONFLICT (id) DO UPDATE SET
            role = CASE 
                WHEN public.users.role IS NULL OR public.users.role = 'viewer' 
                THEN 'admin' 
                ELSE public.users.role 
            END,
            status = COALESCE(public.users.status, 'active'),
            email = EXCLUDED.email,
            updated_at = NOW();
            
        RAISE NOTICE 'Current user set as admin';
    ELSE
        RAISE NOTICE 'No authenticated user found';
    END IF;
END $$;

-- STEP 3: Enable RLS and create policies for users
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Create new policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON public.users TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

SELECT 'STEP 1-3 COMPLETED: Users table is ready for admin features' as message;

-- =============================================
-- STEP 4: Create Suppliers Table
-- =============================================

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

-- Enable RLS for suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create suppliers policies
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;
CREATE POLICY "Users can view suppliers" ON public.suppliers
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers can manage suppliers" ON public.suppliers;
CREATE POLICY "Managers can manage suppliers" ON public.suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Create indexes for suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON public.suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON public.suppliers(created_at);

-- Grant permissions
GRANT ALL ON public.suppliers TO authenticated;

SELECT 'STEP 4 COMPLETED: Suppliers table created' as message;

-- =============================================
-- STEP 5: Create Transactions Table
-- =============================================

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

-- Create transaction_items table
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

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Create transactions policies
DROP POLICY IF EXISTS "Users can view transactions" ON public.transactions;
CREATE POLICY "Users can view transactions" ON public.transactions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage transactions" ON public.transactions;
CREATE POLICY "Users can manage transactions" ON public.transactions
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Create transaction items policies
DROP POLICY IF EXISTS "Users can view transaction items" ON public.transaction_items;
CREATE POLICY "Users can view transaction items" ON public.transaction_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_id
            AND (t.created_by = auth.uid() OR
                 EXISTS (
                     SELECT 1 FROM public.users 
                     WHERE id = auth.uid() 
                     AND role IN ('admin', 'manager')
                 ))
        )
    );

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON public.transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);

-- Grant permissions
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.transaction_items TO authenticated;

SELECT 'STEP 5 COMPLETED: Transactions tables created' as message;

-- =============================================
-- STEP 6: Create Audit Log Table
-- =============================================

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

-- Enable RLS for audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create audit log policies (admin only)
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log" ON public.audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.audit_log(timestamp);

-- Grant permissions
GRANT SELECT ON public.audit_log TO authenticated;

SELECT 'STEP 6 COMPLETED: Audit log table created' as message;

-- =============================================
-- STEP 7: Update Customers Table
-- =============================================

-- Add transaction tracking columns to customers
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE public.customers ADD COLUMN total_purchases INTEGER DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column total_purchases already exists in customers';
    END;

    BEGIN
        ALTER TABLE public.customers ADD COLUMN total_spent DECIMAL(15,2) DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column total_spent already exists in customers';
    END;

    BEGIN
        ALTER TABLE public.customers ADD COLUMN last_purchase_date TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column last_purchase_date already exists in customers';
    END;

    BEGIN
        ALTER TABLE public.customers ADD COLUMN average_order_value DECIMAL(15,2) DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column average_order_value already exists in customers';
    END;

    BEGIN
        ALTER TABLE public.customers ADD COLUMN purchase_frequency INTEGER DEFAULT 0;
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column purchase_frequency already exists in customers';
    END;

    RAISE NOTICE 'Customers table updated with transaction tracking columns';
END $$;

-- Create indexes for customer stats
CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON public.customers(total_spent);
CREATE INDEX IF NOT EXISTS idx_customers_last_purchase ON public.customers(last_purchase_date);

SELECT 'STEP 7 COMPLETED: Customers table updated' as message;

-- =============================================
-- STEP 8: Insert Sample Data
-- =============================================

-- Insert sample suppliers
INSERT INTO public.suppliers (name, contact_person, email, phone, address, city, country) VALUES
('ABC Supplies Inc.', 'John Doe', 'john@abcsupplies.com', '+63-912-345-6789', '123 Business St.', 'Manila', 'Philippines'),
('XYZ Trading Co.', 'Jane Smith', 'jane@xyztrading.com', '+63-917-987-6543', '456 Commerce Ave.', 'Quezon City', 'Philippines')
ON CONFLICT (email) DO NOTHING;

SELECT 'STEP 8 COMPLETED: Sample data inserted' as message;

-- =============================================
-- FINAL MESSAGE
-- =============================================

SELECT 'ALL STEPS COMPLETED SUCCESSFULLY! 
🎉 Your database is now ready for all admin features:
✅ User Role Management
✅ Supplier Management  
✅ Customer Transactions
✅ Audit History Tracking

You can now use all the new admin features in the application!' as final_message;