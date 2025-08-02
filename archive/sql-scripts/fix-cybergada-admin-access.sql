-- =============================================
-- Fix Admin Access for cybergada@gmail.com
-- =============================================

-- First, let's check current user status
DO $$
DECLARE
    current_user_record RECORD;
    user_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🔍 Checking current user status for cybergada@gmail.com';
    
    -- Check if user exists and get current details
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE email = 'cybergada@gmail.com'
    ) INTO user_exists;
    
    IF user_exists THEN
        SELECT * INTO current_user_record 
        FROM public.users 
        WHERE email = 'cybergada@gmail.com';
        
        RAISE NOTICE '📊 Current User Details:';
        RAISE NOTICE '  Email: %', current_user_record.email;
        RAISE NOTICE '  Role: %', current_user_record.role;
        RAISE NOTICE '  Active: %', current_user_record.is_active;
        RAISE NOTICE '  ID: %', current_user_record.id;
        RAISE NOTICE '  Created: %', current_user_record.created_at;
        RAISE NOTICE '  Updated: %', current_user_record.updated_at;
        
        -- Force update to admin role
        UPDATE public.users 
        SET 
            role = 'admin',
            updated_at = NOW()
        WHERE email = 'cybergada@gmail.com';
        
        RAISE NOTICE '✅ User role updated to admin successfully';
        
        -- Verify the update
        SELECT * INTO current_user_record 
        FROM public.users 
        WHERE email = 'cybergada@gmail.com';
        
        RAISE NOTICE '🔄 Updated User Details:';
        RAISE NOTICE '  Email: %', current_user_record.email;
        RAISE NOTICE '  Role: %', current_user_record.role;
        RAISE NOTICE '  Active: %', current_user_record.is_active;
        RAISE NOTICE '  Updated: %', current_user_record.updated_at;
        
    ELSE
        RAISE NOTICE '❌ User not found, creating new admin user';
        
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
        
        RAISE NOTICE '✅ New admin user created successfully';
    END IF;
    
    RAISE NOTICE '🎯 Admin access fix completed for cybergada@gmail.com';
END $$;

-- Additional verification query
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
FROM public.users 
WHERE email = 'cybergada@gmail.com';