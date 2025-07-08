-- =============================================
-- FBMS Database Security and Constraint Enhancements
-- =============================================

-- Add additional constraints and security enhancements to existing tables

-- =============================================
-- 1. ENHANCE USERS TABLE CONSTRAINTS
-- =============================================

-- Add check constraints
ALTER TABLE public.users 
ADD CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT check_role_valid CHECK (role IN ('admin', 'manager', 'cashier', 'accountant')),
ADD CONSTRAINT check_first_name_length CHECK (length(first_name) >= 2 AND length(first_name) <= 50),
ADD CONSTRAINT check_last_name_length CHECK (length(last_name) >= 2 AND length(last_name) <= 50),
ADD CONSTRAINT check_department_length CHECK (department IS NULL OR length(department) <= 100);

-- Add unique constraint on email
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- =============================================
-- 2. ENHANCE CUSTOMERS TABLE CONSTRAINTS
-- =============================================

ALTER TABLE public.customers 
ADD CONSTRAINT check_customer_first_name_length CHECK (length(first_name) >= 2 AND length(first_name) <= 50),
ADD CONSTRAINT check_customer_last_name_length CHECK (length(last_name) >= 2 AND length(last_name) <= 50),
ADD CONSTRAINT check_customer_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT check_customer_phone_format CHECK (phone IS NULL OR phone ~* '^(\+63|0)[0-9]{10}$'),
ADD CONSTRAINT check_customer_address_length CHECK (address IS NULL OR length(address) <= 500);

-- =============================================
-- 3. ENHANCE PRODUCTS TABLE CONSTRAINTS
-- =============================================

ALTER TABLE public.products 
ADD CONSTRAINT check_product_name_length CHECK (length(name) >= 2 AND length(name) <= 200),
ADD CONSTRAINT check_product_sku_format CHECK (sku ~* '^[A-Z0-9_-]+$'),
ADD CONSTRAINT check_product_price_positive CHECK (price >= 0),
ADD CONSTRAINT check_product_cost_positive CHECK (cost >= 0),
ADD CONSTRAINT check_product_stock_non_negative CHECK (stock >= 0),
ADD CONSTRAINT check_product_min_stock_non_negative CHECK (min_stock >= 0),
ADD CONSTRAINT check_product_unit_length CHECK (length(unit) <= 20),
ADD CONSTRAINT check_product_category_length CHECK (length(category) >= 2 AND length(category) <= 100);

-- Ensure SKU is uppercase
CREATE OR REPLACE FUNCTION enforce_uppercase_sku() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.sku = UPPER(NEW.sku);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_uppercase_sku 
    BEFORE INSERT OR UPDATE ON public.products 
    FOR EACH ROW EXECUTE FUNCTION enforce_uppercase_sku();

-- =============================================
-- 4. ENHANCE SUPPLIERS TABLE CONSTRAINTS
-- =============================================

ALTER TABLE public.suppliers 
ADD CONSTRAINT check_supplier_name_length CHECK (length(name) >= 2 AND length(name) <= 200),
ADD CONSTRAINT check_supplier_contact_person_length CHECK (contact_person IS NULL OR length(contact_person) <= 100),
ADD CONSTRAINT check_supplier_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT check_supplier_phone_format CHECK (phone IS NULL OR phone ~* '^(\+63|0)[0-9]{10}$'),
ADD CONSTRAINT check_supplier_address_length CHECK (address IS NULL OR length(address) <= 500);

-- =============================================
-- 5. ENHANCE SALES TABLE CONSTRAINTS
-- =============================================

ALTER TABLE public.sales 
ADD CONSTRAINT check_sales_subtotal_positive CHECK (subtotal >= 0),
ADD CONSTRAINT check_sales_tax_non_negative CHECK (tax >= 0),
ADD CONSTRAINT check_sales_discount_non_negative CHECK (discount >= 0),
ADD CONSTRAINT check_sales_total_positive CHECK (total > 0),
ADD CONSTRAINT check_sales_payment_method CHECK (payment_method IN ('cash', 'card', 'gcash', 'paymaya', 'bank_transfer', 'check')),
ADD CONSTRAINT check_sales_payment_status CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded', 'cancelled')),
ADD CONSTRAINT check_sales_status CHECK (status IN ('draft', 'completed', 'cancelled', 'refunded')),
ADD CONSTRAINT check_sales_customer_name_length CHECK (customer_name IS NULL OR length(customer_name) <= 200);

-- =============================================
-- 6. ENHANCE EXPENSES TABLE CONSTRAINTS
-- =============================================

ALTER TABLE public.expenses 
ADD CONSTRAINT check_expense_description_length CHECK (length(description) >= 5 AND length(description) <= 500),
ADD CONSTRAINT check_expense_amount_positive CHECK (amount > 0),
ADD CONSTRAINT check_expense_tax_amount_non_negative CHECK (tax_amount >= 0),
ADD CONSTRAINT check_expense_total_amount_positive CHECK (total_amount > 0),
ADD CONSTRAINT check_expense_status CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
ADD CONSTRAINT check_expense_payment_method CHECK (payment_method IS NULL OR payment_method IN ('cash', 'check', 'bank_transfer', 'card')),
ADD CONSTRAINT check_expense_recurring_interval CHECK (
    (is_recurring = false AND recurring_interval IS NULL) OR 
    (is_recurring = true AND recurring_interval IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'))
);

-- =============================================
-- 7. ENHANCE EMPLOYEES TABLE CONSTRAINTS
-- =============================================

ALTER TABLE public.employees 
ADD CONSTRAINT check_employee_first_name_length CHECK (length(first_name) >= 2 AND length(first_name) <= 50),
ADD CONSTRAINT check_employee_last_name_length CHECK (length(last_name) >= 2 AND length(last_name) <= 50),
ADD CONSTRAINT check_employee_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT check_employee_phone_format CHECK (phone ~* '^(\+63|0)[0-9]{10}$'),
ADD CONSTRAINT check_employee_basic_salary_positive CHECK (basic_salary >= 0),
ADD CONSTRAINT check_employee_employment_type CHECK (employment_type IN ('Regular', 'Contractual', 'Probationary', 'Part-time')),
ADD CONSTRAINT check_employee_status CHECK (status IN ('Active', 'Inactive', 'Terminated', 'Resigned')),
ADD CONSTRAINT check_employee_sss_format CHECK (sss_number IS NULL OR sss_number ~* '^[0-9]{2}-[0-9]{7}-[0-9]{1}$'),
ADD CONSTRAINT check_employee_philhealth_format CHECK (philhealth_number IS NULL OR philhealth_number ~* '^[0-9]{2}-[0-9]{9}-[0-9]{1}$'),
ADD CONSTRAINT check_employee_pagibig_format CHECK (pagibig_number IS NULL OR pagibig_number ~* '^[0-9]{4}-[0-9]{4}-[0-9]{4}$'),
ADD CONSTRAINT check_employee_tin_format CHECK (tin_number IS NULL OR tin_number ~* '^[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]{3}$'),
ADD CONSTRAINT check_employee_hire_date_not_future CHECK (hire_date <= CURRENT_DATE),
ADD CONSTRAINT check_employee_birth_date_reasonable CHECK (birth_date >= CURRENT_DATE - INTERVAL '100 years' AND birth_date <= CURRENT_DATE - INTERVAL '16 years');

-- =============================================
-- 8. ENHANCE PAYROLL ENTRIES CONSTRAINTS
-- =============================================

ALTER TABLE public.payroll_entries 
ADD CONSTRAINT check_payroll_basic_salary_non_negative CHECK (basic_salary >= 0),
ADD CONSTRAINT check_payroll_allowances_non_negative CHECK (allowances >= 0),
ADD CONSTRAINT check_payroll_gross_pay_non_negative CHECK (gross_pay >= 0),
ADD CONSTRAINT check_payroll_contributions_non_negative CHECK (
    sss_contribution >= 0 AND 
    philhealth_contribution >= 0 AND 
    pagibig_contribution >= 0
),
ADD CONSTRAINT check_payroll_tax_non_negative CHECK (withholding_tax >= 0),
ADD CONSTRAINT check_payroll_deductions_non_negative CHECK (
    other_deductions >= 0 AND 
    total_deductions >= 0
),
ADD CONSTRAINT check_payroll_net_pay_non_negative CHECK (net_pay >= 0),
ADD CONSTRAINT check_payroll_overtime_non_negative CHECK (
    overtime_hours >= 0 AND 
    overtime_rate >= 0 AND 
    overtime_pay >= 0
),
ADD CONSTRAINT check_payroll_leave_non_negative CHECK (
    leave_days >= 0 AND 
    leave_pay >= 0
),
ADD CONSTRAINT check_payroll_status CHECK (status IN ('Draft', 'Approved', 'Paid', 'Cancelled')),
ADD CONSTRAINT check_payroll_payment_method CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Check', 'GCash', 'PayMaya'));

-- =============================================
-- 9. CREATE AUDIT LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES public.users(id),
    user_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- =============================================
-- 10. CREATE SECURITY EVENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'login_attempt', 'login_success', 'login_failure', 
        'password_reset', 'account_locked', 'permission_denied',
        'data_export', 'bulk_operation', 'suspicious_activity'
    )),
    user_id UUID REFERENCES public.users(id),
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    success BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON public.security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);

-- =============================================
-- 11. CREATE DATA VALIDATION FUNCTIONS
-- =============================================

-- Function to validate Philippine TIN
CREATE OR REPLACE FUNCTION validate_philippine_tin(tin TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN tin IS NULL OR tin ~* '^[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]{3}$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate Philippine phone numbers
CREATE OR REPLACE FUNCTION validate_philippine_phone(phone TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN phone IS NULL OR phone ~* '^(\+63|0)[0-9]{10}$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate email format
CREATE OR REPLACE FUNCTION validate_email_format(email TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 12. CREATE AUDIT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[] := '{}';
    field_name TEXT;
BEGIN
    -- Skip audit for audit_logs and security_events tables to avoid recursion
    IF TG_TABLE_NAME IN ('audit_logs', 'security_events') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Convert records to JSONB
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSE -- UPDATE
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Find changed fields
        FOR field_name IN SELECT jsonb_object_keys(new_data) LOOP
            IF old_data->field_name IS DISTINCT FROM new_data->field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;
    END IF;

    -- Insert audit log
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_fields,
        user_id,
        user_email
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        old_data,
        new_data,
        changed_fields,
        COALESCE(auth.uid(), NULL),
        COALESCE(auth.jwt() ->> 'email', NULL)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 13. CREATE AUDIT TRIGGERS FOR KEY TABLES
-- =============================================

-- Users audit
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Products audit
CREATE TRIGGER products_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Sales audit
CREATE TRIGGER sales_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Expenses audit
CREATE TRIGGER expenses_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Employees audit
CREATE TRIGGER employees_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =============================================
-- 14. ENABLE RLS FOR NEW TABLES
-- =============================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 15. CREATE RLS POLICIES FOR NEW TABLES
-- =============================================

-- Audit logs policies (admin only)
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs 
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Security events policies (admin only)
CREATE POLICY "Only admins can view security events" ON public.security_events 
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System can insert security events" ON public.security_events 
    FOR INSERT WITH CHECK (true);

-- =============================================
-- 16. GRANT PERMISSIONS FOR NEW TABLES
-- =============================================

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT ON public.security_events TO authenticated;

-- =============================================
-- 17. CREATE PERFORMANCE INDEXES
-- =============================================

-- Composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products(category, is_active);
CREATE INDEX IF NOT EXISTS idx_sales_date_status ON public.sales(created_at, status);
CREATE INDEX IF NOT EXISTS idx_expenses_date_category ON public.expenses(date, category);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_employees_department_status ON public.employees(department, status);

-- Text search indexes
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_customers_search ON public.customers USING gin(to_tsvector('english', first_name || ' ' || last_name));

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
DO $$ 
BEGIN
    RAISE NOTICE 'FBMS Database Security and Constraints Enhanced Successfully!';
    RAISE NOTICE 'Added: Check constraints, audit logging, security events, validation functions';
    RAISE NOTICE 'Enhanced: Data integrity, input validation, performance indexes';
    RAISE NOTICE 'Security: Audit trails for all critical operations';
END $$;