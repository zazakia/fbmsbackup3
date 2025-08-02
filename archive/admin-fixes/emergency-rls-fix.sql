-- EMERGENCY RLS POLICY FIX
-- This fixes the infinite recursion in the users table policies

-- 1. DISABLE RLS temporarily to break the recursion
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can update all users" ON users;
DROP POLICY IF EXISTS "Admin can insert users" ON users;
DROP POLICY IF EXISTS "Admin can delete users" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON users;

-- 3. CREATE SIMPLE, NON-RECURSIVE POLICIES
CREATE POLICY "allow_all_authenticated_users" ON users
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. RE-ENABLE RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. UPDATE EXISTING USER TO ADMIN
UPDATE users 
SET role = 'admin', 
    is_active = true,
    department = 'IT'
WHERE email = 'cybergada@gmail.com';

-- 6. VERIFY THE USER EXISTS
SELECT id, email, first_name, last_name, role, department, is_active 
FROM users 
WHERE email = 'cybergada@gmail.com';