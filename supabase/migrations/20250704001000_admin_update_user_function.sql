-- =============================================
-- Admin User Update Function
-- Allows admins to bypass RLS for user updates
-- =============================================

-- Create admin function to update users (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_update_user(
  user_id UUID,
  update_data JSONB
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
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if the current user is an admin
  SELECT u.role INTO current_user_role 
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Only allow admins to use this function
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only admins can use this function';
  END IF;
  
  -- Perform the update with elevated privileges
  UPDATE public.users SET
    email = COALESCE((update_data->>'email')::TEXT, email),
    first_name = COALESCE((update_data->>'first_name')::TEXT, first_name),
    last_name = COALESCE((update_data->>'last_name')::TEXT, last_name),
    role = COALESCE((update_data->>'role')::TEXT, role),
    department = COALESCE((update_data->>'department')::TEXT, department),
    is_active = COALESCE((update_data->>'is_active')::BOOLEAN, is_active),
    updated_at = COALESCE((update_data->>'updated_at')::TIMESTAMPTZ, NOW())
  WHERE users.id = user_id;
  
  -- Return the updated user
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
  WHERE u.id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_update_user(UUID, JSONB) TO authenticated;

-- Alternative: Simple admin update function that uses direct SQL
CREATE OR REPLACE FUNCTION public.admin_update_user_simple(
  target_user_id UUID,
  new_email TEXT DEFAULT NULL,
  new_first_name TEXT DEFAULT NULL,
  new_last_name TEXT DEFAULT NULL,
  new_role TEXT DEFAULT NULL,
  new_department TEXT DEFAULT NULL,
  new_is_active BOOLEAN DEFAULT NULL
)
RETURNS SETOF public.users
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check if the current user is an admin
  SELECT u.role INTO current_user_role 
  FROM public.users u 
  WHERE u.id = auth.uid();
  
  -- Only allow admins to use this function
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only admins can use this function';
  END IF;
  
  -- Perform the update
  UPDATE public.users SET
    email = COALESCE(new_email, email),
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    role = COALESCE(new_role, role),
    department = COALESCE(new_department, department),
    is_active = COALESCE(new_is_active, is_active),
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Return the updated user
  RETURN QUERY
  SELECT * FROM public.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_update_user_simple(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Create a function to check if current user can edit another user
CREATE OR REPLACE FUNCTION public.can_edit_user(target_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_role TEXT;
  current_user_id UUID;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  
  -- If not authenticated, return false
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Users can always edit themselves
  IF current_user_id = target_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if current user is admin
  SELECT u.role INTO current_user_role 
  FROM public.users u 
  WHERE u.id = current_user_id;
  
  -- Admins can edit anyone
  IF current_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Otherwise, no permission
  RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_edit_user(UUID) TO authenticated;

-- Update the RLS policy to use the helper function
DROP POLICY IF EXISTS "Users can update based on permissions" ON public.users;

CREATE POLICY "Users can update based on permissions" ON public.users
  FOR UPDATE USING (
    public.can_edit_user(id)
  );

-- Add comment for documentation
COMMENT ON FUNCTION public.admin_update_user(UUID, JSONB) IS 
  'Admin function to update user data bypassing RLS policies. Only accessible by admin users.';

COMMENT ON FUNCTION public.admin_update_user_simple(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) IS 
  'Simple admin function to update user data with individual parameters. Only accessible by admin users.';

COMMENT ON FUNCTION public.can_edit_user(UUID) IS 
  'Helper function to check if the current user can edit the specified user. Returns true for self-edits and admin edits.';

-- Migration completion message
DO $$ 
BEGIN
    RAISE NOTICE 'Admin user update functions created successfully!';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '- admin_update_user(user_id, jsonb_data) - JSONB version';
    RAISE NOTICE '- admin_update_user_simple(...) - Parameter version';
    RAISE NOTICE '- can_edit_user(user_id) - Permission checker';
END $$;