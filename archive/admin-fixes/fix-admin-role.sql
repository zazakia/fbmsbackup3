-- Fix admin access by updating user role to admin
-- Replace 'your-email@example.com' with your actual email address

-- Check current user
SELECT id, email, role, is_active, first_name, last_name 
FROM users 
WHERE email = 'your-email@example.com';

-- Update user role to admin (replace email with your actual email)
UPDATE users 
SET role = 'admin', 
    updated_at = NOW()
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, email, role, is_active, first_name, last_name 
FROM users 
WHERE email = 'your-email@example.com';

-- Alternative: Update ALL users to admin (use with caution)
-- UPDATE users SET role = 'admin', updated_at = NOW();

-- Check all users and their roles
SELECT email, role, is_active FROM users ORDER BY created_at;