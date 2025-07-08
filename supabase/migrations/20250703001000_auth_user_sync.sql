-- =============================================
-- Supabase Auth to Public Users Sync Migration
-- =============================================

-- Function to sync auth.users with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users when a new user is created in auth.users
  INSERT INTO public.users (id, email, first_name, last_name, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update public.users when auth.users is updated
  UPDATE public.users 
  SET 
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft delete in public.users when auth.users is deleted
  UPDATE public.users 
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on auth.users (Note: This requires elevated privileges)
-- These would typically be created by a Supabase admin or through the dashboard

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- =============================================
-- RLS Policies for Users Table with Auth Integration
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Enhanced RLS policies that use auth context
CREATE POLICY "Users can view users based on role" ON public.users
  FOR SELECT USING (
    auth.uid()::text = id::text OR -- Users can view their own profile
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid()::text 
      AND role IN ('admin', 'manager')
    ) -- Admins and managers can view all users
  );

CREATE POLICY "Authenticated users can insert users" ON public.users
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    (
      auth.uid()::text = id::text OR -- Allow user creation during signup
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid()::text 
        AND role = 'admin'
      ) -- Only admins can create other users
    )
  );

CREATE POLICY "Users can update based on permissions" ON public.users
  FOR UPDATE USING (
    auth.uid()::text = id::text OR -- Users can update their own profile
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid()::text 
      AND role = 'admin'
    ) -- Admins can update any user
  );

CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid()::text 
      AND role = 'admin'
    ) AND
    id != auth.uid()::text -- Admins cannot delete themselves
  );

-- =============================================
-- Helper Functions for User Management
-- =============================================

-- Function to get current user with role
CREATE OR REPLACE FUNCTION public.get_current_user()
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
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.department,
    u.is_active,
    u.created_at,
    u.updated_at
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
  user_id UUID,
  module_name TEXT,
  action_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO user_role 
  FROM public.users 
  WHERE id = user_id AND is_active = true;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin has all permissions
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Define role-based permissions (simplified for SQL)
  -- In practice, you might want to store this in a dedicated permissions table
  CASE 
    WHEN user_role = 'manager' THEN
      RETURN module_name IN ('dashboard', 'pos', 'inventory', 'customers', 'purchases', 'expenses', 'payroll', 'reports', 'branches', 'bir')
        AND action_name IN ('view', 'create', 'edit', 'export', 'transfer');
    
    WHEN user_role = 'cashier' THEN
      RETURN (module_name = 'dashboard' AND action_name = 'view') OR
             (module_name = 'pos' AND action_name IN ('view', 'create')) OR
             (module_name = 'inventory' AND action_name = 'view') OR
             (module_name = 'customers' AND action_name IN ('view', 'create', 'edit')) OR
             (module_name = 'reports' AND action_name = 'view');
    
    WHEN user_role = 'accountant' THEN
      RETURN (module_name = 'dashboard' AND action_name = 'view') OR
             (module_name = 'accounting' AND action_name IN ('view', 'create', 'edit')) OR
             (module_name = 'expenses' AND action_name IN ('view', 'create', 'edit')) OR
             (module_name = 'payroll' AND action_name IN ('view', 'create', 'edit')) OR
             (module_name = 'reports' AND action_name IN ('view', 'export')) OR
             (module_name = 'bir' AND action_name IN ('view', 'create', 'edit')) OR
             (module_name IN ('purchases', 'customers') AND action_name = 'view');
    
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Data Migration for Existing Auth Users
-- =============================================

-- Migrate existing auth users to public.users (if any)
-- This is a one-time migration
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  -- Note: Direct access to auth.users may not be available in all setups
  -- This would typically be handled during the migration process
  
  -- Create a default admin user if none exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'admin') THEN
    INSERT INTO public.users (id, email, first_name, last_name, role, is_active, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'admin@fbms.local',
      'System',
      'Administrator',
      'admin',
      true,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Default admin user created: admin@fbms.local';
  END IF;
  
  RAISE NOTICE 'User sync migration completed successfully';
END $$;

-- =============================================
-- Grant Permissions
-- =============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, TEXT, TEXT) TO authenticated;

-- =============================================
-- Completion Message
-- =============================================
DO $$ 
BEGIN
    RAISE NOTICE 'Auth-Users Sync Migration Completed Successfully!';
    RAISE NOTICE 'Features added:';
    RAISE NOTICE '- Automatic sync between auth.users and public.users';
    RAISE NOTICE '- Enhanced RLS policies with auth integration';
    RAISE NOTICE '- Helper functions for user management';
    RAISE NOTICE '- Permission checking functions';
    RAISE NOTICE 'Note: Triggers on auth.users may require superuser privileges';
END $$;