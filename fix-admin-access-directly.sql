-- =============================================
-- Direct Admin Access Fix for cybergada@gmail.com
-- =============================================

-- This script fixes admin access without migration conflicts
-- Run this directly in your database

-- First, check which schema has the users table
SELECT 
    table_schema, 
    table_name,
    'Users table found' as status
FROM information_schema.tables 
WHERE table_name = 'users' 
AND table_schema IN ('public', 'fbms');

-- Fix admin access in public schema (most likely)
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Check if public.users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RAISE NOTICE 'Found public.users table';
        
        -- Update existing user to admin
        UPDATE public.users 
        SET 
            role = 'admin',
            updated_at = NOW()
        WHERE email = 'cybergada@gmail.com';
        
        GET DIAGNOSTICS user_count = ROW_COUNT;
        
        IF user_count > 0 THEN
            RAISE NOTICE '✅ Updated % user(s) to admin role in public.users', user_count;
        ELSE
            RAISE NOTICE 'No existing user found, creating new admin user in public.users';
            
            -- Create new admin user
            INSERT INTO public.users (
                id, 
                email, 
                first_name, 
                last_name, 
                role, 
                is_active, 
                created_at, 
                updated_at
            ) VALUES (
                gen_random_uuid(),
                'cybergada@gmail.com',
                'Cyber',
                'Gada',
                'admin',
                true,
                NOW(),
                NOW()
            );
            
            RAISE NOTICE '✅ Created new admin user in public.users';
        END IF;
        
        -- Verify the user
        SELECT COUNT(*) INTO user_count
        FROM public.users 
        WHERE email = 'cybergada@gmail.com' AND role = 'admin';
        
        RAISE NOTICE '✅ Verification: Found % admin user(s) with email cybergada@gmail.com in public.users', user_count;
        
    ELSE
        RAISE NOTICE '❌ public.users table not found';
    END IF;
END $$;

-- Fix admin access in fbms schema (if it exists)
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Check if fbms.users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'fbms' AND table_name = 'users') THEN
        RAISE NOTICE 'Found fbms.users table';
        
        -- Update existing user to admin
        UPDATE fbms.users 
        SET 
            role = 'admin',
            updated_at = NOW()
        WHERE email = 'cybergada@gmail.com';
        
        GET DIAGNOSTICS user_count = ROW_COUNT;
        
        IF user_count > 0 THEN
            RAISE NOTICE '✅ Updated % user(s) to admin role in fbms.users', user_count;
        ELSE
            RAISE NOTICE 'No existing user found, creating new admin user in fbms.users';
            
            -- Create new admin user
            INSERT INTO fbms.users (
                id, 
                email, 
                first_name, 
                last_name, 
                role, 
                is_active, 
                created_at, 
                updated_at
            ) VALUES (
                gen_random_uuid(),
                'cybergada@gmail.com',
                'Cyber',
                'Gada',
                'admin',
                true,
                NOW(),
                NOW()
            );
            
            RAISE NOTICE '✅ Created new admin user in fbms.users';
        END IF;
        
        -- Verify the user
        SELECT COUNT(*) INTO user_count
        FROM fbms.users 
        WHERE email = 'cybergada@gmail.com' AND role = 'admin';
        
        RAISE NOTICE '✅ Verification: Found % admin user(s) with email cybergada@gmail.com in fbms.users', user_count;
        
    ELSE
        RAISE NOTICE '❌ fbms.users table not found';
    END IF;
END $$;

-- Final verification - show all users with cybergada email
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'FINAL VERIFICATION RESULTS:';
    RAISE NOTICE '==========================================';
    
    -- Check public schema
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        FOR rec IN 
            SELECT 'public' as schema_name, email, role, is_active, id
            FROM public.users 
            WHERE email = 'cybergada@gmail.com'
        LOOP
            RAISE NOTICE 'Schema: % | Email: % | Role: % | Active: % | ID: %', 
                rec.schema_name, rec.email, rec.role, rec.is_active, rec.id;
        END LOOP;
    END IF;
    
    -- Check fbms schema
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'fbms' AND table_name = 'users') THEN
        FOR rec IN 
            SELECT 'fbms' as schema_name, email, role, is_active, id
            FROM fbms.users 
            WHERE email = 'cybergada@gmail.com'
        LOOP
            RAISE NOTICE 'Schema: % | Email: % | Role: % | Active: % | ID: %', 
                rec.schema_name, rec.email, rec.role, rec.is_active, rec.id;
        END LOOP;
    END IF;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Admin access fix completed!';
    RAISE NOTICE 'Please refresh your browser and login again.';
    RAISE NOTICE '==========================================';
END $$;