-- =============================================
-- FBMS Database Schema - Complete Setup
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- 1. USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
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

-- =============================================
-- 2. CUSTOMERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.customers (
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

-- =============================================
-- 3. PRODUCT CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    sku VARCHAR(100) NOT NULL UNIQUE,
    barcode VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'piece',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. SUPPLIERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(200),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    zip_code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. PURCHASE ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    supplier_name VARCHAR(200) NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    expected_date TIMESTAMP WITH TIME ZONE,
    received_date TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. SALES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id),
    customer_name VARCHAR(200),
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    cashier_id UUID NOT NULL REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 8. EXPENSE CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    bir_classification VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 9. EXPENSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    vendor VARCHAR(200),
    payment_method VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_interval VARCHAR(20),
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 10. CHART OF ACCOUNTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 11. JOURNAL ENTRIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    reference VARCHAR(100),
    description TEXT,
    lines JSONB NOT NULL DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 12. EMPLOYEES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    birth_date TIMESTAMP WITH TIME ZONE NOT NULL,
    hire_date TIMESTAMP WITH TIME ZONE NOT NULL,
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    employment_type VARCHAR(20) NOT NULL DEFAULT 'Regular',
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    allowances JSONB DEFAULT '[]',
    sss_number VARCHAR(20),
    philhealth_number VARCHAR(20),
    pagibig_number VARCHAR(20),
    tin_number VARCHAR(20),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    emergency_contact JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 13. PAYROLL PERIODS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month, year)
);

-- =============================================
-- 14. PAYROLL ENTRIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.payroll_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    period_id UUID NOT NULL REFERENCES public.payroll_periods(id),
    basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    allowances DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
    sss_contribution DECIMAL(12,2) NOT NULL DEFAULT 0,
    philhealth_contribution DECIMAL(12,2) NOT NULL DEFAULT 0,
    pagibig_contribution DECIMAL(12,2) NOT NULL DEFAULT 0,
    withholding_tax DECIMAL(12,2) NOT NULL DEFAULT 0,
    other_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
    overtime_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
    overtime_rate DECIMAL(8,2) NOT NULL DEFAULT 0,
    overtime_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
    leave_days DECIMAL(8,2) NOT NULL DEFAULT 0,
    leave_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
    thirteenth_month_pay DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'Bank Transfer',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 15. LEAVE RECORDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.leave_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    leave_type VARCHAR(20) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    days DECIMAL(8,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    approved_by UUID REFERENCES public.users(id),
    approved_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 16. TIME RECORDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.time_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    time_in TIMESTAMP WITH TIME ZONE NOT NULL,
    time_out TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE,
    break_end TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
    overtime_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Present',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CREATE TRIGGERS FOR updated_at COLUMNS
-- =============================================
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON public.customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON public.products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON public.employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_entries_updated_at 
    BEFORE UPDATE ON public.payroll_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE RLS POLICIES
-- =============================================

-- Users policies
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING (auth.uid()::text = id::text OR auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can delete users" ON public.users FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Customers policies
CREATE POLICY "Authenticated users can manage customers" ON public.customers FOR ALL USING (auth.role() = 'authenticated');

-- Categories policies
CREATE POLICY "Authenticated users can manage categories" ON public.categories FOR ALL USING (auth.role() = 'authenticated');

-- Products policies
CREATE POLICY "Authenticated users can manage products" ON public.products FOR ALL USING (auth.role() = 'authenticated');

-- Suppliers policies
CREATE POLICY "Authenticated users can manage suppliers" ON public.suppliers FOR ALL USING (auth.role() = 'authenticated');

-- Purchase orders policies
CREATE POLICY "Authenticated users can manage purchase orders" ON public.purchase_orders FOR ALL USING (auth.role() = 'authenticated');

-- Sales policies
CREATE POLICY "Authenticated users can manage sales" ON public.sales FOR ALL USING (auth.role() = 'authenticated');

-- Expense categories policies
CREATE POLICY "Authenticated users can manage expense categories" ON public.expense_categories FOR ALL USING (auth.role() = 'authenticated');

-- Expenses policies
CREATE POLICY "Authenticated users can manage expenses" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');

-- Accounts policies
CREATE POLICY "Authenticated users can manage accounts" ON public.accounts FOR ALL USING (auth.role() = 'authenticated');

-- Journal entries policies
CREATE POLICY "Authenticated users can manage journal entries" ON public.journal_entries FOR ALL USING (auth.role() = 'authenticated');

-- Employees policies
CREATE POLICY "Authenticated users can manage employees" ON public.employees FOR ALL USING (auth.role() = 'authenticated');

-- Payroll periods policies
CREATE POLICY "Authenticated users can manage payroll periods" ON public.payroll_periods FOR ALL USING (auth.role() = 'authenticated');

-- Payroll entries policies
CREATE POLICY "Authenticated users can manage payroll entries" ON public.payroll_entries FOR ALL USING (auth.role() = 'authenticated');

-- Leave records policies
CREATE POLICY "Authenticated users can manage leave records" ON public.leave_records FOR ALL USING (auth.role() = 'authenticated');

-- Time records policies
CREATE POLICY "Authenticated users can manage time records" ON public.time_records FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =============================================
-- INSERT SAMPLE DATA
-- =============================================

-- Sample Categories
INSERT INTO public.categories (name, description) VALUES
    ('Electronics', 'Electronic devices and accessories'),
    ('Clothing', 'Apparel and fashion items'),
    ('Food & Beverages', 'Food and drink products'),
    ('Office Supplies', 'Office and business supplies'),
    ('Personal Care', 'Health and beauty products')
ON CONFLICT (name) DO NOTHING;

-- Sample Expense Categories
INSERT INTO public.expense_categories (name, description, bir_classification) VALUES
    ('Office Rent', 'Monthly office rental payments', 'Rent Expense'),
    ('Utilities', 'Electricity, water, internet bills', 'Utilities Expense'),
    ('Office Supplies', 'Stationery, paper, ink cartridges', 'Office Supplies'),
    ('Marketing', 'Advertising and promotional expenses', 'Marketing Expense'),
    ('Travel', 'Business travel and transportation', 'Travel Expense'),
    ('Professional Fees', 'Legal, accounting, consulting fees', 'Professional Fees'),
    ('Insurance', 'Business insurance premiums', 'Insurance Expense'),
    ('Maintenance', 'Equipment and facility maintenance', 'Repairs and Maintenance')
ON CONFLICT (name) DO NOTHING;

-- Philippine Chart of Accounts
INSERT INTO public.accounts (code, name, type, description) VALUES
    ('1000', 'Cash', 'Asset', 'Cash on hand and in bank'),
    ('1100', 'Accounts Receivable', 'Asset', 'Money owed by customers'),
    ('1200', 'Inventory', 'Asset', 'Products for sale'),
    ('1300', 'Prepaid Expenses', 'Asset', 'Expenses paid in advance'),
    ('1400', 'Property, Plant & Equipment', 'Asset', 'Fixed assets'),
    ('1500', 'Accumulated Depreciation', 'Asset', 'Depreciation of fixed assets'),
    ('2000', 'Accounts Payable', 'Liability', 'Money owed to suppliers'),
    ('2100', 'Accrued Expenses', 'Liability', 'Expenses incurred but not yet paid'),
    ('2200', 'VAT Payable', 'Liability', 'VAT owed to BIR'),
    ('2300', 'Withholding Tax Payable', 'Liability', 'Withholding tax owed to BIR'),
    ('2400', 'SSS Payable', 'Liability', 'SSS contributions payable'),
    ('2500', 'PhilHealth Payable', 'Liability', 'PhilHealth contributions payable'),
    ('2600', 'Pag-IBIG Payable', 'Liability', 'Pag-IBIG contributions payable'),
    ('2700', 'Notes Payable', 'Liability', 'Short-term borrowings'),
    ('2800', 'Long-term Debt', 'Liability', 'Long-term borrowings'),
    ('3000', 'Capital', 'Equity', 'Owner equity'),
    ('3100', 'Retained Earnings', 'Equity', 'Accumulated profits'),
    ('3200', 'Drawings', 'Equity', 'Owner withdrawals'),
    ('4000', 'Sales Revenue', 'Income', 'Revenue from sales'),
    ('4100', 'Service Revenue', 'Income', 'Revenue from services'),
    ('4200', 'Interest Income', 'Income', 'Interest earned'),
    ('4300', 'Other Income', 'Income', 'Other revenue sources'),
    ('5000', 'Cost of Goods Sold', 'Expense', 'Direct costs of products sold'),
    ('6000', 'Salaries and Wages', 'Expense', 'Employee compensation'),
    ('6100', 'Rent Expense', 'Expense', 'Office and facility rent'),
    ('6200', 'Utilities Expense', 'Expense', 'Electricity, water, phone'),
    ('6300', 'Office Supplies', 'Expense', 'Office materials and supplies'),
    ('6400', 'Marketing Expense', 'Expense', 'Advertising and promotion'),
    ('6500', 'Travel Expense', 'Expense', 'Business travel costs'),
    ('6600', 'Professional Fees', 'Expense', 'Legal, accounting fees'),
    ('6700', 'Insurance Expense', 'Expense', 'Business insurance'),
    ('6800', 'Depreciation Expense', 'Expense', 'Asset depreciation'),
    ('6900', 'Interest Expense', 'Expense', 'Interest on borrowings'),
    ('7000', 'Other Expenses', 'Expense', 'Miscellaneous expenses')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON public.purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee_id ON public.payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period_id ON public.payroll_entries(period_id);

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
DO $$ 
BEGIN
    RAISE NOTICE 'FBMS Database Schema Created Successfully!';
    RAISE NOTICE 'Tables created: users, customers, categories, products, suppliers, purchase_orders, sales, expense_categories, expenses, accounts, journal_entries, employees, payroll_periods, payroll_entries, leave_records, time_records';
    RAISE NOTICE 'RLS policies enabled for all tables';
    RAISE NOTICE 'Sample data inserted for categories, expense categories, and chart of accounts';
END $$;