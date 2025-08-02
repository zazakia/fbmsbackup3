-- FINAL FIX - Completely disable RLS temporarily
-- Run this in Supabase SQL editor

-- 1. DISABLE RLS on both tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;

-- 2. UPDATE your user to admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'cybergada@gmail.com';

-- 3. Verify the update worked
SELECT id, email, role FROM users WHERE email = 'cybergada@gmail.com';