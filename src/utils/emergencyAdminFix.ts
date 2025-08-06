/**
 * Emergency Admin Fix Utility
 * Comprehensive fix for admin access issues
 */

import { supabase } from './supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

export const emergencyAdminFix = async (userEmail: string = 'cybergada@gmail.com') => {
  try {
    console.group('🚨 Emergency Admin Fix');
    console.log('🎯 Target user:', userEmail);
    
    // Step 1: Check current user status
    console.log('🔍 Step 1: Checking current user status...');
    const { data: currentUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError);
      return false;
    }
    
    if (currentUser) {
      console.log('📊 Current user found:', {
        email: currentUser.email,
        role: currentUser.role,
        active: currentUser.is_active,
        id: currentUser.id
      });
    } else {
      console.log('❌ User not found in database');
    }
    
    // Step 2: Force update to admin role
    console.log('🔄 Step 2: Forcing admin role update...');
    
    let updateResult;
    if (currentUser) {
      // Update existing user
      updateResult = await supabase
        .from('users')
        .update({ 
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail)
        .select();
    } else {
      // Create new user
      updateResult = await supabase
        .from('users')
        .insert({
          email: userEmail,
          first_name: 'Cyber',
          last_name: 'Gada',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
    }
    
    if (updateResult.error) {
      console.error('❌ Update failed:', updateResult.error);
      return false;
    }
    
    if (updateResult.data && updateResult.data.length > 0) {
      console.log('✅ Database update successful:', updateResult.data[0]);
    }
    
    // Step 3: Verify the update
    console.log('🔍 Step 3: Verifying update...');
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return false;
    }
    
    console.log('✅ Verification successful:', {
      email: verifyUser.email,
      role: verifyUser.role,
      active: verifyUser.is_active,
      updated: verifyUser.updated_at
    });
    
    // Step 4: Force auth store refresh
    console.log('🔄 Step 4: Forcing auth store refresh...');
    
    const authStore = useSupabaseAuthStore.getState();
    
    // Force refresh current session
    const { error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Session refresh failed:', sessionError);
    } else {
      console.log('✅ Session refreshed');
    }
    
    // Force auth store to check auth again
    await authStore.checkAuth();
    console.log('✅ Auth store refreshed');
    
    // Step 5: Final verification
    console.log('🔍 Step 5: Final verification...');
    const currentAuthUser = authStore.user;
    if (currentAuthUser) {
      console.log('📊 Auth store user:', {
        email: currentAuthUser.email,
        role: currentAuthUser.role,
        active: currentAuthUser.is_active
      });
      
      if (currentAuthUser.role === 'admin') {
        console.log('🎉 SUCCESS: Admin access granted!');
        console.log('📝 Please refresh the page to see all admin features');
      } else {
        console.log('⚠️  WARNING: Auth store still shows old role');
        console.log('📝 Please logout and login again, or refresh the page');
      }
    } else {
      console.log('❌ No auth user found in store');
    }
    
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    console.groupEnd();
    return false;
  }
};

export const forcePageRefresh = () => {
  console.log('🔄 Forcing page refresh in 2 seconds...');
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, 2000);
};

export const clearAuthCache = async () => {
  try {
    console.log('🗑️  Clearing auth cache...');
    
    // Clear any local storage auth data
    if (typeof window !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.includes('supabase')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        window.localStorage.removeItem(key);
        console.log('🗑️  Removed:', key);
      });
    }
    
    // Force sign out and sign back in
    await supabase.auth.signOut();
    console.log('🚪 Signed out');
    
    return true;
  } catch (error) {
    console.error('❌ Cache clear failed:', error);
    return false;
  }
};

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as unknown as {
    emergencyAdminFix: typeof emergencyAdminFix;
    forcePageRefresh: typeof forcePageRefresh;
    clearAuthCache: typeof clearAuthCache;
  }).emergencyAdminFix = emergencyAdminFix;
  (window as unknown as {
    emergencyAdminFix: typeof emergencyAdminFix;
    forcePageRefresh: typeof forcePageRefresh;
    clearAuthCache: typeof clearAuthCache;
  }).forcePageRefresh = forcePageRefresh;
  (window as unknown as {
    emergencyAdminFix: typeof emergencyAdminFix;
    forcePageRefresh: typeof forcePageRefresh;
    clearAuthCache: typeof clearAuthCache;
  }).clearAuthCache = clearAuthCache;
}