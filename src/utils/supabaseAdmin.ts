import { supabase } from './supabase';

// Helper function to execute admin functions
export async function executeAdminUpdate(userId: string, updateData: any) {
  try {
    // First check if the admin update function exists
    const { data: adminResult, error: adminError } = await supabase.rpc('admin_update_user_simple', {
      target_user_id: userId,
      new_email: updateData.email || null,
      new_first_name: updateData.first_name || null,
      new_last_name: updateData.last_name || null,
      new_role: updateData.role || null,
      new_department: updateData.department || null,
      new_is_active: updateData.is_active !== undefined ? updateData.is_active : null
    });

    if (!adminError && adminResult) {
      return { data: adminResult[0], error: null };
    }

    console.log('Admin function not available, using direct update:', adminError);

    // Fallback: Direct update with elevated permissions
    const { data: result, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single();

    return { data: result, error };
  } catch (error) {
    console.error('Admin update failed:', error);
    return { data: null, error };
  }
}

// Create the admin functions in the database if they don't exist
export async function ensureAdminFunctions() {
  try {
    // Try to create the admin update function
    const functionSQL = `
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
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: functionSQL });
    
    if (error) {
      console.log('Could not create admin function via RPC:', error);
    } else {
      console.log('Admin function created successfully');
    }
  } catch (error) {
    console.log('Admin function setup not available:', error);
  }
}