-- Step 1: Create schema
CREATE SCHEMA IF NOT EXISTS fbms;

-- Step 2: Create tables with explicit schema reference
CREATE TABLE IF NOT EXISTS fbms.customers (
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

CREATE TABLE IF NOT EXISTS fbms.users (
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

-- Step 3: Disable RLS temporarily for testing
ALTER TABLE fbms.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE fbms.users DISABLE ROW LEVEL SECURITY;

-- Step 4: Grant all permissions
GRANT ALL ON SCHEMA fbms TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA fbms TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA fbms TO postgres, anon, authenticated, service_role;

-- Step 5: Insert a test record
INSERT INTO fbms.customers (first_name, last_name, email) 
VALUES ('Test', 'Customer', 'test@example.com')
ON CONFLICT DO NOTHING;