-- Step 1: Check if schema exists and create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'fbms') THEN
        CREATE SCHEMA fbms;
        RAISE NOTICE 'Created fbms schema';
    ELSE
        RAISE NOTICE 'fbms schema already exists';
    END IF;
END $$;

-- Step 2: Drop and recreate tables to ensure clean state
DROP TABLE IF EXISTS fbms.customers CASCADE;
DROP TABLE IF EXISTS fbms.users CASCADE;

-- Step 3: Create customers table
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

-- Step 4: Create users table
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

-- Step 5: Grant permissions to all roles
GRANT USAGE ON SCHEMA fbms TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA fbms TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA fbms TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA fbms TO postgres, anon, authenticated, service_role;

-- Step 6: Insert test data
INSERT INTO fbms.customers (first_name, last_name, email, phone) 
VALUES ('John', 'Doe', 'john@example.com', '+63123456789');

INSERT INTO fbms.users (email, first_name, last_name, role) 
VALUES ('admin@example.com', 'Admin', 'User', 'admin');

-- Step 7: Verify tables exist
SELECT 'fbms.customers' as table_name, COUNT(*) as record_count FROM fbms.customers
UNION ALL
SELECT 'fbms.users' as table_name, COUNT(*) as record_count FROM fbms.users;