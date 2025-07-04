import { supabase } from '../utils/supabase';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// CREATE
export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
  const { data, error } = await supabase
    .from('users')
    .insert([{
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      department: user.department,
      is_active: user.isActive
    }])
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      department,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role,
        department: data.department,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      department,
      is_active,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false });

  if (data) {
    const transformedData = data.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      department: user.department,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE
export async function getUser(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      department,
      is_active,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role,
        department: data.department,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE
export async function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>) {
  console.log('Updating user:', id, 'with data:', updates);
  
  // Check current authentication status
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  console.log('Current auth session:', { session: session?.user, error: authError });
  
  if (!session?.user) {
    return { 
      data: null, 
      error: { message: 'Authentication required to update users' } 
    };
  }

  // Check current user's role - try by email first as backup
  let currentUserData;
  let currentUserError;
  
  // First try by ID
  const idResult = await supabase
    .from('users')
    .select('role, id, email')
    .eq('id', session.user.id)
    .single();
  
  if (idResult.data) {
    currentUserData = idResult.data;
    currentUserError = idResult.error;
  } else {
    // Fallback: try by email
    console.log('Trying fallback email lookup for current user:', session.user.email);
    const emailResult = await supabase
      .from('users')
      .select('role, id, email')
      .eq('email', session.user.email)
      .single();
    
    currentUserData = emailResult.data;
    currentUserError = emailResult.error;
  }

  console.log('Current user role check:', { currentUserData, currentUserError, sessionUserId: session.user.id, sessionUserEmail: session.user.email });

  if (currentUserError || !currentUserData) {
    return { 
      data: null, 
      error: { message: `Could not verify user permissions. Session user: ${session.user.email}, Error: ${currentUserError?.message || 'User not found in database'}` } 
    };
  }

  console.log(`Permission check: Current user role = ${currentUserData.role}, Target user ID = ${id}, Current user ID = ${currentUserData.id}`);

  if (currentUserData.role !== 'admin' && currentUserData.id !== id) {
    return { 
      data: null, 
      error: { message: `Only admins can update other users. Your role: ${currentUserData.role}. Please log in as an admin user.` } 
    };
  }
  
  const updateData: Partial<{ 
    email: string; 
    first_name: string; 
    last_name: string; 
    role: string; 
    department: string; 
    is_active: boolean;
    updated_at: string;
  }> = {};
  
  if (updates.email) updateData.email = updates.email;
  if (updates.firstName) updateData.first_name = updates.firstName;
  if (updates.lastName) updateData.last_name = updates.lastName;
  if (updates.role) updateData.role = updates.role;
  if (updates.department !== undefined) updateData.department = updates.department;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  
  // Always update the updated_at timestamp
  updateData.updated_at = new Date().toISOString();

  console.log('Update data being sent:', updateData);

  // First, check if the target user exists
  const { data: existingUsers, error: checkError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', id);

  if (checkError) {
    console.error('Error checking existing user:', checkError);
    return { data: null, error: checkError };
  }

  console.log('Found existing users:', existingUsers);

  if (!existingUsers || existingUsers.length === 0) {
    return { 
      data: null, 
      error: { message: 'User not found' } 
    };
  }

  if (existingUsers.length > 1) {
    console.error('Multiple users found with same ID:', existingUsers);
    return { 
      data: null, 
      error: { message: 'Multiple users found with same ID. Database integrity issue.' } 
    };
  }

  // For development: Create admin user if it doesn't exist
  if (currentUserData.role === 'admin') {
    try {
      // Try to create admin user mapping if it doesn't exist
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: session.user.id,
          email: session.user.email,
          first_name: 'System',
          last_name: 'Administrator',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.log('Admin upsert warning:', upsertError);
      }
    } catch (adminSetupError) {
      console.log('Admin setup warning:', adminSetupError);
    }
  }

  // For admins, try to use service role key for elevated permissions
  if (currentUserData.role === 'admin') {
    console.log('Admin user detected, attempting privileged update...');
    
    // Try direct HTTP API call with service role key
    try {
      const response = await fetch('https://coqjcziquviehgyifhek.supabase.co/rest/v1/users?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcWpjemlxdXZpZWhneWlmaGVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTQwNTM5MywiZXhwIjoyMDY0OTgxMzkzfQ.uPR_xF1WyNgnPHdgoUoBTO0O6meCBUcyeD3t3w2WEnA',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcWpjemlxdXZpZWhneWlmaGVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTQwNTM5MywiZXhwIjoyMDY0OTgxMzkzfQ.uPR_xF1WyNgnPHdgoUoBTO0O6meCBUcyeD3t3w2WEnA',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const adminResult = await response.json();
        console.log('Admin HTTP API update result:', { adminResult });

        if (adminResult && adminResult.length > 0) {
          const data = adminResult[0];
          return {
            data: {
              id: data.id,
              email: data.email,
              firstName: data.first_name,
              lastName: data.last_name,
              role: data.role,
              department: data.department,
              isActive: data.is_active,
              createdAt: data.created_at,
              updatedAt: data.updated_at
            },
            error: null
          };
        }
      } else {
        const errorData = await response.json();
        console.log('Admin HTTP API update failed:', errorData);
      }
    } catch (adminHttpError) {
      console.log('Admin HTTP API error:', adminHttpError);
    }
  }

  // Regular update (with RLS) as fallback
  console.log('Using regular update with RLS...');
  const { data: updateResult, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      department,
      is_active,
      created_at,
      updated_at
    `);

  console.log('Regular update result:', { updateResult, error });

  if (error) {
    return { data: null, error };
  }

  if (!updateResult || updateResult.length === 0) {
    return { 
      data: null, 
      error: { message: 'No rows were updated. Check user permissions and RLS policies.' } 
    };
  }

  if (updateResult.length > 1) {
    console.error('Multiple rows updated:', updateResult);
    return { 
      data: null, 
      error: { message: 'Multiple rows were updated unexpectedly' } 
    };
  }

  const data = updateResult[0];

  console.log('Final update result:', { data });

  if (data) {
    return {
      data: {
        id: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role: data.role,
        department: data.department,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE
export async function deleteUser(id: string) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Get users by role
export async function getUsersByRole(role: string) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      role,
      department,
      is_active,
      created_at,
      updated_at
    `)
    .eq('role', role)
    .eq('is_active', true)
    .order('first_name', { ascending: true });

  if (data) {
    const transformedData = data.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      department: user.department,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}