-- Direct Database Fix for Admin Access
-- This updates the role in the users table where the auth system reads from

UPDATE users 
SET role = 'admin' 
WHERE email = 'cybergada@gmail.com';

-- Verify the update
SELECT id, email, first_name, last_name, role, department, is_active 
FROM users 
WHERE email = 'cybergada@gmail.com';