import { supabase } from '../utils/supabase';
import { Customer } from '../types/business';

// CREATE
export async function createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'currentBalance' | 'creditLimit' | 'isActive' | 'lastPurchase'>) {
  const { data, error } = await supabase
    .from('customers')
    .insert([{
      first_name: customer.firstName,
      last_name: customer.lastName,
      email: customer.email || null,
      phone: customer.phone || null,
      address: customer.address || null,
      city: customer.city || null,
      state: customer.province || null,
      postal_code: customer.zipCode || null,
      country: 'Philippines'
    }])
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      created_at,
      updated_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        province: data.state,
        zipCode: data.postal_code,
        creditLimit: 0,
        currentBalance: 0,
        isActive: true,
        createdAt: new Date(data.created_at),
        lastPurchase: undefined
      },
      error: null
    };
  }

  return { data: null, error };
}

// READ ALL
export async function getCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false });

  if (data) {
    const transformedData = data.map(customer => ({
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      province: customer.state,
      zipCode: customer.postal_code,
      creditLimit: 0,
      currentBalance: 0,
      isActive: true,
      createdAt: new Date(customer.created_at),
      lastPurchase: undefined
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
}

// READ ONE
export async function getCustomer(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        province: data.state,
        zipCode: data.postal_code,
        creditLimit: 0,
        currentBalance: 0,
        isActive: true,
        createdAt: new Date(data.created_at),
        lastPurchase: undefined
      },
      error: null
    };
  }

  return { data: null, error };
}

// UPDATE
export async function updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>) {
  const updateData: Partial<{ 
    first_name: string; 
    last_name: string; 
    email: string; 
    phone: string; 
    address: string; 
    city: string; 
    state: string; 
    zip_code: string; 
    credit_limit: number; 
    current_balance: number; 
    is_active: boolean; 
    last_purchase: string; 
  }> = {};
  
  if (updates.firstName) updateData.first_name = updates.firstName;
  if (updates.lastName) updateData.last_name = updates.lastName;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.address !== undefined) updateData.address = updates.address;
  if (updates.city !== undefined) updateData.city = updates.city;
  if (updates.province !== undefined) updateData.state = updates.province;
  if (updates.zipCode !== undefined) updateData.postal_code = updates.zipCode;

  const { data, error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      created_at,
      updated_at
    `)
    .single();

  if (data) {
    return {
      data: {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        province: data.state,
        zipCode: data.postal_code,
        creditLimit: 0,
        currentBalance: 0,
        isActive: true,
        createdAt: new Date(data.created_at),
        lastPurchase: undefined
      },
      error: null
    };
  }

  return { data: null, error };
}

// DELETE
export async function deleteCustomer(id: string) {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);
  
  return { error };
}

// Search customers
export async function searchCustomers(query: string) {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      created_at,
      updated_at
    `)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('first_name', { ascending: true });

  if (data) {
    const transformedData = data.map(customer => ({
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      province: customer.state,
      zipCode: customer.postal_code,
      creditLimit: 0,
      currentBalance: 0,
      isActive: true,
      createdAt: new Date(customer.created_at),
      lastPurchase: undefined
    }));
    return { data: transformedData, error: null };
  }

  return { data: null, error };
} 