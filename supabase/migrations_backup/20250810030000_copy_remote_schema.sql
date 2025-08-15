-- Migration to copy remote schema structure to local Supabase

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS leave_records CASCADE;
DROP TABLE IF EXISTS payroll_entries CASCADE;
DROP TABLE IF EXISTS time_records CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'employee',
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    status TEXT,
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    theme TEXT,
    language TEXT,
    timezone TEXT,
    date_format TEXT,
    time_format TEXT,
    currency TEXT,
    display JSONB,
    notifications BOOLEAN,
    pos BOOLEAN,
    inventory BOOLEAN,
    accounting BOOLEAN,
    expenses BOOLEAN,
    payroll BOOLEAN,
    purchases BOOLEAN,
    suppliers BOOLEAN,
    branches BOOLEAN,
    bir BOOLEAN,
    admin_dashboard BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Accounts table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Journal entries table
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT,
    reference TEXT,
    lines JSONB DEFAULT '[]',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Expense categories table
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    bir_classification TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    vendor TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_interval TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    zip_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price DECIMAL(15,2) DEFAULT 0,
    cost DECIMAL(15,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    barcode TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase orders table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT NOT NULL,
    supplier_id UUID NOT NULL,
    supplier_name TEXT NOT NULL,
    items JSONB DEFAULT '[]',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    expected_date DATE,
    received_date DATE,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Sales table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL,
    customer_id UUID,
    customer_name TEXT,
    items JSONB DEFAULT '[]',
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    tax DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'active',
    notes TEXT,
    cashier_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock movements table
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    type TEXT NOT NULL,
    change INTEGER NOT NULL,
    resulting_stock INTEGER NOT NULL,
    reason TEXT,
    reference_id UUID,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    middle_name TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    birth_date DATE NOT NULL,
    hire_date DATE NOT NULL,
    position TEXT NOT NULL,
    department TEXT NOT NULL,
    basic_salary DECIMAL(15,2) DEFAULT 0,
    employment_type TEXT DEFAULT 'regular',
    status TEXT DEFAULT 'active',
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    emergency_contact JSONB,
    sss_number TEXT,
    philhealth_number TEXT,
    pagibig_number TEXT,
    tin_number TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    allowances JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payroll periods table
CREATE TABLE payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Time records table
CREATE TABLE time_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    date DATE NOT NULL,
    time_in TIME NOT NULL,
    time_out TIME,
    break_start TIME,
    break_end TIME,
    total_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status TEXT DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Payroll entries table
CREATE TABLE payroll_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    period_id UUID NOT NULL,
    basic_salary DECIMAL(15,2) DEFAULT 0,
    allowances DECIMAL(15,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    overtime_rate DECIMAL(15,2) DEFAULT 0,
    overtime_pay DECIMAL(15,2) DEFAULT 0,
    leave_days DECIMAL(4,2) DEFAULT 0,
    leave_pay DECIMAL(15,2) DEFAULT 0,
    thirteenth_month_pay DECIMAL(15,2) DEFAULT 0,
    gross_pay DECIMAL(15,2) DEFAULT 0,
    sss_contribution DECIMAL(15,2) DEFAULT 0,
    philhealth_contribution DECIMAL(15,2) DEFAULT 0,
    pagibig_contribution DECIMAL(15,2) DEFAULT 0,
    withholding_tax DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    net_pay DECIMAL(15,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'bank_transfer',
    payment_date DATE,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leave records table
CREATE TABLE leave_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days DECIMAL(4,2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    approved_by UUID,
    approved_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Foreign Key Constraints
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE expenses ADD CONSTRAINT expenses_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_fkey 
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE sales ADD CONSTRAINT sales_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES customers(id);

ALTER TABLE sales ADD CONSTRAINT sales_cashier_id_fkey 
    FOREIGN KEY (cashier_id) REFERENCES users(id);

ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES products(id);

ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE payroll_entries ADD CONSTRAINT payroll_entries_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(id);

ALTER TABLE payroll_entries ADD CONSTRAINT payroll_entries_period_id_fkey 
    FOREIGN KEY (period_id) REFERENCES payroll_periods(id);

ALTER TABLE time_records ADD CONSTRAINT time_records_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(id);

ALTER TABLE leave_records ADD CONSTRAINT leave_records_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(id);

ALTER TABLE leave_records ADD CONSTRAINT leave_records_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES users(id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period_id ON payroll_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_time_records_employee_date ON time_records(employee_id, date);