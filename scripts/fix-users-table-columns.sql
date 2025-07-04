-- Fix missing columns in users table
-- Run this script in your Supabase SQL Editor to add missing columns

-- Check if users table exists, if not create a basic one
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add role column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'employee', 'viewer'));
    END IF;

    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'status' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));
    END IF;

    -- Add department column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'department' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN department VARCHAR(100);
    END IF;

    -- Add full_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'full_name' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN full_name VARCHAR(255);
    END IF;

    -- Add last_sign_in_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_sign_in_at' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN last_sign_in_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add phone column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN phone VARCHAR(50);
    END IF;

    -- Add profile_image_url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'profile_image_url' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN profile_image_url TEXT;
    END IF;

    -- Add bio column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'bio' AND table_schema = 'public') THEN
        ALTER TABLE public.users ADD COLUMN bio TEXT;
    END IF;

    RAISE NOTICE 'Missing columns have been added to users table';
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Create RLS policies for users
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Insert or update current user as admin if they don't exist
INSERT INTO public.users (id, email, role, status, full_name) 
SELECT 
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'admin',
    'active',
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()), 'Admin User')
WHERE auth.uid() IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    role = CASE 
        WHEN public.users.role IS NULL OR public.users.role = 'viewer' THEN 'admin'
        ELSE public.users.role 
    END,
    status = COALESCE(public.users.status, 'active'),
    email = EXCLUDED.email,
    updated_at = NOW();

-- Grant necessary permissions
GRANT ALL ON public.users TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
SELECT 'Users table structure has been fixed! All missing columns have been added.' as message;