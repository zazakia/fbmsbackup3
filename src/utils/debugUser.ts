/**
 * Debug utility to check user role and authentication status
 */

import { supabase } from './supabase';

export const debugUserRole = async (email: string) => {
  try {
    console.group('🔍 User Role Debug');
    
    // Check current session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', session ? 'Active' : 'None');
    
    if (session) {
      console.log('Session user email:', session.user.email);
      console.log('Session user ID:', session.user.id);
    }
    
    // Check user in database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Database query error:', error);
    } else if (user) {
      console.log('User found in database:');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Role:', user.role);
      console.log('- Active:', user.is_active);
      console.log('- First Name:', user.first_name);
      console.log('- Last Name:', user.last_name);
      console.log('- Created:', user.created_at);
    } else {
      console.log('User not found in database');
    }
    
    console.groupEnd();
    
    return user;
  } catch (error) {
    console.error('Debug error:', error);
    return null;
  }
};

export const updateUserRole = async (email: string, newRole: 'admin' | 'manager' | 'cashier' | 'accountant' | 'employee') => {
  try {
    console.log(`🔧 Updating user role for ${email} to ${newRole}...`);
    
    const { data, error } = await supabase
      .from('users')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select();
    
    if (error) {
      console.error('Role update error:', error);
      return false;
    }
    
    console.log('✅ Role updated successfully:', data);
    return true;
  } catch (error) {
    console.error('Update error:', error);
    return false;
  }
};

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as any).debugUser = debugUserRole;
  (window as any).updateUserRole = updateUserRole;
}