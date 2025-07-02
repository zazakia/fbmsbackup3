-- Create the fbms schema
CREATE SCHEMA fbms;

-- Create customers table in fbms schema
CREATE TABLE fbms.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Philippines',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table in fbms schema  
CREATE TABLE fbms.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for now (we'll enable it later)
ALTER TABLE fbms.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE fbms.users DISABLE ROW LEVEL SECURITY;

-- Grant permissions to access the schema and tables
GRANT USAGE ON SCHEMA fbms TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA fbms TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA fbms TO anon, authenticated;

-- Insert test data
INSERT INTO fbms.customers (first_name, last_name, email, phone) 
VALUES ('John', 'Doe', 'john@example.com', '+63123456789');

INSERT INTO fbms.users (email, first_name, last_name, role) 
VALUES ('admin@example.com', 'Admin', 'User', 'admin');