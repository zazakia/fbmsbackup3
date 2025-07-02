-- Create FBMS schema
CREATE SCHEMA IF NOT EXISTS fbms;

-- Create customers table
CREATE TABLE fbms.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Philippines',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE fbms.users (
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

-- Create indexes for better performance
CREATE INDEX idx_customers_email ON fbms.customers(email);
CREATE INDEX idx_customers_name ON fbms.customers(first_name, last_name);
CREATE INDEX idx_users_email ON fbms.users(email);
CREATE INDEX idx_users_role ON fbms.users(role);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON fbms.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON fbms.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE fbms.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fbms.users ENABLE ROW LEVEL SECURITY;

-- Create policies for customers (allow all operations for authenticated users)
CREATE POLICY "Allow all operations on customers for authenticated users" ON fbms.customers
    FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for users (allow all operations for authenticated users)
CREATE POLICY "Allow all operations on users for authenticated users" ON fbms.users
    FOR ALL USING (auth.role() = 'authenticated');