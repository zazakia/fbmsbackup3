-- Check if user exists and update to admin role
DO $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(
        SELECT 1 FROM public.users 
        WHERE email = 'cybergada@gmail.com'
    ) INTO user_exists;
    
    IF user_exists THEN
        -- Update existing user to admin role
        UPDATE public.users 
        SET 
            role = 'admin',
            updated_at = NOW()
        WHERE email = 'cybergada@gmail.com';
        
        RAISE NOTICE 'User cybergada@gmail.com updated to admin role successfully';
    ELSE
        -- Create new user with admin role
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
        
        RAISE NOTICE 'User cybergada@gmail.com created with admin role successfully';
    END IF;
    
    -- Display user details
    RAISE NOTICE 'User details:';
    RAISE NOTICE 'Email: %', (SELECT email FROM public.users WHERE email = 'cybergada@gmail.com');
    RAISE NOTICE 'Role: %', (SELECT role FROM public.users WHERE email = 'cybergada@gmail.com');
    RAISE NOTICE 'Active: %', (SELECT is_active FROM public.users WHERE email = 'cybergada@gmail.com');
END $$;