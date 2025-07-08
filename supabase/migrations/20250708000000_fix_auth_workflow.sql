-- =============================================
-- Fix Auth Workflow - Comprehensive Solution
-- =============================================

-- Step 1: Ensure cybergada@gmail.com is admin (handle both schemas)
-- Update in public schema if exists
UPDATE public.users 
SET 
    role = 'admin',
    updated_at = NOW()
WHERE email = 'cybergada@gmail.com';

-- Update in fbms schema if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'fbms' AND table_name = 'users') THEN
        UPDATE fbms.users 
        SET 
            role = 'admin',
            updated_at = NOW()
        WHERE email = 'cybergada@gmail.com';
    END IF;
END $$;

-- Create cybergada user in public schema if not exists
INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    is_active, 
    created_at, 
    updated_at
) 
SELECT 
    gen_random_uuid(),
    'cybergada@gmail.com',
    'Cyber',
    'Gada',
    'admin',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'cybergada@gmail.com'
);

-- Create cybergada user in fbms schema if table exists and user doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'fbms' AND table_name = 'users') THEN
        INSERT INTO fbms.users (
            id, 
            email, 
            first_name, 
            last_name, 
            role, 
            is_active, 
            created_at, 
            updated_at
        ) 
        SELECT 
            gen_random_uuid(),
            'cybergada@gmail.com',
            'Cyber',
            'Gada',
            'admin',
            true,
            NOW(),
            NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM fbms.users WHERE email = 'cybergada@gmail.com'
        );
    END IF;
END $$;

-- Step 2: Fix auth triggers to preserve existing roles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_update();
DROP FUNCTION IF EXISTS public.handle_user_delete();

-- Create FIXED trigger functions that preserve existing roles
CREATE OR REPLACE FUNCTION public.handle_new_user_fixed()
RETURNS TRIGGER AS $$
BEGIN
  -- CRITICAL FIX: Only create user if they don't exist, preserve existing roles
  INSERT INTO public.users (id, email, first_name, last_name, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    -- FIXED: Use a safe default role that can be changed by admin
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- CRITICAL: Never overwrite existing users
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create FIXED update function that preserves roles
CREATE OR REPLACE FUNCTION public.handle_user_update_fixed()
RETURNS TRIGGER AS $$
BEGIN
  -- FIXED: Only update email and timestamp, never update role
  UPDATE public.users 
  SET 
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create FIXED delete function
CREATE OR REPLACE FUNCTION public.handle_user_delete_fixed()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft delete - preserve all data
  UPDATE public.users 
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create FIXED triggers
CREATE TRIGGER on_auth_user_created_fixed
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_fixed();

CREATE TRIGGER on_auth_user_updated_fixed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update_fixed();

CREATE TRIGGER on_auth_user_deleted_fixed
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete_fixed();

-- Step 3: Create admin role update function
CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  target_user_id UUID,
  new_role TEXT,
  admin_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  admin_role TEXT;
BEGIN
  -- Check if admin user has admin role
  SELECT role INTO admin_role
  FROM public.users
  WHERE id = admin_user_id AND is_active = true;
  
  IF admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admin users can update roles';
  END IF;
  
  -- Update user role
  UPDATE public.users
  SET 
    role = new_role,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create user existence check function
CREATE OR REPLACE FUNCTION public.user_exists_in_system(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.users 
    WHERE email = user_email AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create function to get user with proper role
CREATE OR REPLACE FUNCTION public.get_user_with_role(
  user_id UUID DEFAULT NULL,
  user_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  department TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Try by ID first, then by email
  IF user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      u.id, u.email, u.first_name, u.last_name, 
      u.role, u.department, u.is_active, 
      u.created_at, u.updated_at
    FROM public.users u
    WHERE u.id = user_id AND u.is_active = true;
  ELSIF user_email IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      u.id, u.email, u.first_name, u.last_name, 
      u.role, u.department, u.is_active, 
      u.created_at, u.updated_at
    FROM public.users u
    WHERE u.email = user_email AND u.is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant proper permissions
GRANT EXECUTE ON FUNCTION public.user_exists_in_system(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_with_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT, UUID) TO authenticated;

-- Step 7: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_email_active ON public.users(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_role_active ON public.users(role) WHERE is_active = true;

-- Step 8: Final verification
DO $$
DECLARE
  cybergada_user RECORD;
BEGIN
  SELECT * INTO cybergada_user
  FROM public.users
  WHERE email = 'cybergada@gmail.com';
  
  IF FOUND THEN
    RAISE NOTICE '✅ Cybergada user found:';
    RAISE NOTICE '  Email: %', cybergada_user.email;
    RAISE NOTICE '  Role: %', cybergada_user.role;
    RAISE NOTICE '  Active: %', cybergada_user.is_active;
    RAISE NOTICE '  ID: %', cybergada_user.id;
  ELSE
    RAISE NOTICE '❌ Cybergada user not found';
  END IF;
  
  RAISE NOTICE '🎯 Auth workflow fix migration completed successfully!';
END $$;