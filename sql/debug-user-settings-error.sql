-- Debug script for user settings PGRST116 error
-- Run this in Supabase SQL Editor to investigate the issue

-- 1. Check if user_settings table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'user_settings'
) as table_exists;

-- 2. Check table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if there are any rows in user_settings
SELECT COUNT(*) as total_rows FROM public.user_settings;

-- 4. Look for the specific user ID from the error
-- Replace '123e4567-e89b-12d3-a456-426614174000' with the actual problematic user ID
SELECT * FROM public.user_settings 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- 5. Check what users exist in the users table
SELECT id, email, first_name, last_name, role, is_active 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Find users who don't have settings yet
SELECT u.id, u.email, u.first_name, u.last_name 
FROM public.users u 
LEFT JOIN public.user_settings us ON u.id = us.user_id 
WHERE us.user_id IS NULL 
  AND u.is_active = true;

-- 7. Check RLS policies on user_settings
SELECT * FROM pg_policies WHERE tablename = 'user_settings';

-- 8. Check if auth.users table is accessible (might fail due to permissions)
-- This query might fail in regular SQL editor, but worth trying
-- SELECT id, email FROM auth.users LIMIT 5;

-- 9. Test a simple insert to see if that works
-- This will help identify if it's a permissions issue
-- Uncomment the lines below to test (use a real user ID)
/*
INSERT INTO public.user_settings (
    user_id, 
    theme, 
    language, 
    timezone, 
    date_format, 
    time_format, 
    currency
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000',  -- Replace with real user ID
    'system', 
    'en', 
    'Asia/Manila', 
    'MM/dd/yyyy', 
    '12h', 
    'PHP'
) ON CONFLICT (user_id) DO NOTHING;
*/

-- 10. Check current user context (what user is currently authenticated)
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- 11. Test the exact query that's failing
-- This should reproduce the PGRST116 error if the user doesn't exist
-- Replace with the actual user ID from the error
-- SELECT * FROM public.user_settings 
-- WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- Result Analysis:
-- - If table_exists = false: The user_settings table hasn't been created
-- - If total_rows = 0: No settings exist yet for any user
-- - If the user query returns no rows: That specific user has no settings (normal for new users)
-- - If users exist but no settings: The auto-creation process isn't working
-- - If RLS policies are too restrictive: Users can't access their own settings
