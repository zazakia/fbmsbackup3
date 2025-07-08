/**
 * Admin Access Fix Utility
 * Quick fix for admin access issues
 */

import { supabase } from './supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

export const fixAdminAccess = async (userEmail?: string) => {
  try {
    console.group('🔧 Admin Access Fix');
    
    // Get current session if no email provided
    if (!userEmail) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        userEmail = session.user.email;
      } else {
        console.error('❌ No user logged in and no email provided');
        return false;
      }
    }
    
    console.log('🎯 Target user:', userEmail);
    
    // Update user role to admin
    const { data, error } = await supabase
      .from('users')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('email', userEmail)
      .select();
    
    if (error) {
      console.error('❌ Database update failed:', error);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Role updated to admin successfully');
      console.log('📊 Updated user:', data[0]);
      
      // Refresh auth state
      const authStore = useSupabaseAuthStore.getState();
      await authStore.checkAuth();
      
      console.log('🔄 Auth state refreshed');
      console.log('📝 Please refresh the page if needed');
      
      console.groupEnd();
      return true;
    } else {
      console.error('❌ No user found with email:', userEmail);
      console.groupEnd();
      return false;
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    console.groupEnd();
    return false;
  }
};

export const checkAdminStatus = async (userEmail?: string) => {
  try {
    console.group('🔍 Admin Status Check');
    
    // Get current session if no email provided
    if (!userEmail) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        userEmail = session.user.email;
      } else {
        console.error('❌ No user logged in and no email provided');
        return null;
      }
    }
    
    // Check user in database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    if (error) {
      console.error('❌ Database query failed:', error);
      return null;
    }
    
    console.log('📧 Email:', user.email);
    console.log('👤 Role:', user.role);
    console.log('✅ Active:', user.is_active);
    console.log('🆔 ID:', user.id);
    
    const isAdmin = user.role === 'admin';
    console.log(isAdmin ? '✅ HAS ADMIN ACCESS' : '❌ NO ADMIN ACCESS');
    
    // Check auth store state
    const authStore = useSupabaseAuthStore.getState();
    if (authStore.user) {
      console.log('🏪 Auth Store Role:', authStore.user.role);
      console.log('🔐 Auth Store Match:', authStore.user.role === user.role ? '✅' : '❌');
    }
    
    console.groupEnd();
    return user;
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    console.groupEnd();
    return null;
  }
};

export const forceRefreshAuth = async () => {
  try {
    console.log('🔄 Forcing auth refresh...');
    
    const authStore = useSupabaseAuthStore.getState();
    await authStore.checkAuth();
    
    console.log('✅ Auth refreshed');
    
    // Also refresh the page
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Refresh failed:', error);
    return false;
  }
};

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as any).fixAdminAccess = fixAdminAccess;
  (window as any).checkAdminStatus = checkAdminStatus;
  (window as any).forceRefreshAuth = forceRefreshAuth;
}