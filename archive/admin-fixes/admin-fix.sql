-- SQL to fix admin user role
-- Run this in your Supabase SQL Editor

-- First, check the current user
SELECT id, email, role, is_active, created_at 
FROM users 
WHERE email = 'cybergada@gmail.com';

-- Update the user role to admin
UPDATE users 
SET 
    role = 'admin',
    updated_at = NOW()
WHERE email = 'cybergada@gmail.com';

-- Verify the update
SELECT id, email, role, is_active, created_at, updated_at 
FROM users 
WHERE email = 'cybergada@gmail.com';

-- If the user doesn't exist in the users table, create them
-- (Replace 'YOUR_USER_ID' with the actual ID from Supabase Auth)
-- INSERT INTO users (id, email, first_name, last_name, role, is_active)
-- VALUES ('YOUR_USER_ID', 'cybergada@gmail.com', 'Admin', 'User', 'admin', true)
-- ON CONFLICT (id) DO UPDATE SET
-- role = 'admin',
-- updated_at = NOW();