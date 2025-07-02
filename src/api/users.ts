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
  const updateData: Partial<{ email: string; first_name: string; last_name: string; role: string; is_active: boolean }> = {};
  
  if (updates.email) updateData.email = updates.email;
  if (updates.firstName) updateData.first_name = updates.firstName;
  if (updates.lastName) updateData.last_name = updates.lastName;
  if (updates.role) updateData.role = updates.role;
  if (updates.department !== undefined) updateData.department = updates.department;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { data, error } = await supabase
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