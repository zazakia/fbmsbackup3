-- Fix Users Table: Add Missing Columns
-- Run this script in your Supabase SQL Editor

-- Add missing columns to users table
DO $$ 
BEGIN
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN role VARCHAR(20) DEFAULT 'viewer';
        ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'employee', 'viewer'));
        RAISE NOTICE 'Added role column to users table';
    ELSE
        RAISE NOTICE 'Role column already exists';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'status' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive', 'suspended'));
        RAISE NOTICE 'Added status column to users table';
    ELSE
        RAISE NOTICE 'Status column already exists';
    END IF;

    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'full_name' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN full_name VARCHAR(255);
        RAISE NOTICE 'Added full_name column to users table';
    ELSE
        RAISE NOTICE 'Full_name column already exists';
    END IF;

    -- Add department column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'department' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN department VARCHAR(100);
        RAISE NOTICE 'Added department column to users table';
    ELSE
        RAISE NOTICE 'Department column already exists';
    END IF;

    -- Add last_sign_in_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_sign_in_at' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_sign_in_at column to users table';
    ELSE
        RAISE NOTICE 'Last_sign_in_at column already exists';
    END IF;
END $$;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create/Update policies for users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON public.users TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Make current authenticated user an admin (if not already)
DO $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.users (id, email, role, status, full_name) 
        VALUES (
            auth.uid(),
            (SELECT email FROM auth.users WHERE id = auth.uid()),
            'admin',
            'active',
            COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()), 'Admin User')
        )
        ON CONFLICT (id) DO UPDATE SET
            role = CASE 
                WHEN public.users.role IS NULL OR public.users.role = 'viewer' 
                THEN 'admin' 
                ELSE public.users.role 
            END,
            status = COALESCE(public.users.status, 'active'),
            email = EXCLUDED.email,
            updated_at = NOW();
            
        RAISE NOTICE 'Current user set as admin';
    ELSE
        RAISE NOTICE 'No authenticated user found';
    END IF;
END $$;

SELECT 'Users table has been fixed! You can now use the User Role Management feature.' as result;