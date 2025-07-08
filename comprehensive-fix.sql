-- =============================================
-- Comprehensive Database Fix
-- Fixes schema issues and admin access
-- =============================================

-- Step 1: Fix cybergada admin access first
DO $$
DECLARE
    user_count INTEGER;
    schema_name TEXT;
BEGIN
    RAISE NOTICE '🔧 COMPREHENSIVE DATABASE FIX STARTING...';
    
    -- Check which schema has users table
    FOR schema_name IN SELECT table_schema FROM information_schema.tables 
                      WHERE table_name = 'users' AND table_schema IN ('public', 'fbms')
    LOOP
        RAISE NOTICE '✅ Found users table in schema: %', schema_name;
        
        -- Update existing user to admin
        EXECUTE format('UPDATE %I.users SET role = ''admin'', updated_at = NOW() WHERE email = ''cybergada@gmail.com''', schema_name);
        GET DIAGNOSTICS user_count = ROW_COUNT;
        
        IF user_count > 0 THEN
            RAISE NOTICE '✅ Updated % user(s) to admin in %I.users', user_count, schema_name;
        ELSE
            RAISE NOTICE '⚠️  No existing user found, creating admin user in %I.users', schema_name;
            
            -- Create admin user
            EXECUTE format('
                INSERT INTO %I.users (email, first_name, last_name, role, is_active, created_at, updated_at)
                VALUES (''cybergada@gmail.com'', ''Cyber'', ''Gada'', ''admin'', true, NOW(), NOW())
            ', schema_name);
            
            RAISE NOTICE '✅ Created admin user in %I.users', schema_name;
        END IF;
    END LOOP;
END $$;

-- Step 2: Fix user_settings table schema issues
DO $$
BEGIN
    -- Check if user_settings table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
        RAISE NOTICE '✅ user_settings table exists';
        
        -- Check if date_format column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'date_format') THEN
            RAISE NOTICE '⚠️  date_format column missing, adding it...';
            
            ALTER TABLE public.user_settings 
            ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy';
            
            RAISE NOTICE '✅ Added date_format column';
        ELSE
            RAISE NOTICE '✅ date_format column exists';
        END IF;
        
        -- Check other potentially missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'time_format') THEN
            ALTER TABLE public.user_settings 
            ADD COLUMN IF NOT EXISTS time_format VARCHAR(5) DEFAULT '12h' CHECK (time_format IN ('12h', '24h'));
            RAISE NOTICE '✅ Added time_format column';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ user_settings table does not exist, creating it...';
        
        -- Create the user_settings table
        CREATE TABLE public.user_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
            language VARCHAR(10) DEFAULT 'en',
            timezone VARCHAR(50) DEFAULT 'Asia/Manila',
            date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy',
            time_format VARCHAR(5) DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
            currency VARCHAR(10) DEFAULT 'PHP',
            notifications JSONB DEFAULT '{"enabled": true}'::jsonb,
            privacy JSONB DEFAULT '{"profileVisibility": "team"}'::jsonb,
            display JSONB DEFAULT '{"sidebarCollapsed": false}'::jsonb,
            reports JSONB DEFAULT '{"autoGenerate": {"daily": false}}'::jsonb,
            inventory JSONB DEFAULT '{"thresholds": {"lowStock": 10}}'::jsonb,
            security JSONB DEFAULT '{"twoFactorAuth": {"enabled": false}}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id)
        );
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
        
        -- Enable RLS
        ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view their own settings" ON public.user_settings
            FOR SELECT USING (auth.uid()::text = user_id::text);
        
        CREATE POLICY "Users can update their own settings" ON public.user_settings
            FOR UPDATE USING (auth.uid()::text = user_id::text);
        
        CREATE POLICY "Users can insert their own settings" ON public.user_settings
            FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
        
        RAISE NOTICE '✅ Created user_settings table with proper schema';
    END IF;
END $$;

-- Step 3: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Step 4: Verify everything is working
DO $$
DECLARE
    admin_user RECORD;
    settings_count INTEGER;
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🔍 VERIFICATION RESULTS:';
    RAISE NOTICE '===========================================';
    
    -- Check admin user
    SELECT * INTO admin_user FROM public.users WHERE email = 'cybergada@gmail.com';
    
    IF FOUND THEN
        RAISE NOTICE '✅ Admin user found:';
        RAISE NOTICE '  Email: %', admin_user.email;
        RAISE NOTICE '  Role: %', admin_user.role;
        RAISE NOTICE '  Active: %', admin_user.is_active;
        RAISE NOTICE '  ID: %', admin_user.id;
    ELSE
        RAISE NOTICE '❌ Admin user not found';
    END IF;
    
    -- Check user_settings table
    SELECT COUNT(*) INTO settings_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_settings';
    
    IF settings_count > 0 THEN
        RAISE NOTICE '✅ user_settings table exists';
        
        -- Check date_format column
        SELECT COUNT(*) INTO settings_count FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'date_format';
        
        IF settings_count > 0 THEN
            RAISE NOTICE '✅ date_format column exists';
        ELSE
            RAISE NOTICE '❌ date_format column missing';
        END IF;
    ELSE
        RAISE NOTICE '❌ user_settings table missing';
    END IF;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '🎉 COMPREHENSIVE FIX COMPLETED!';
    RAISE NOTICE '📝 Please refresh your application and try logging in';
    RAISE NOTICE '===========================================';
END $$;