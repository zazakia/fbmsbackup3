/**
 * Emergency Admin Fix for Browser Console
 * This works with your React application's Supabase client
 */

import { supabase } from './supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

// Function that works in browser console
async function emergencyAdminFixConsole() {
  console.group('🚨 EMERGENCY ADMIN ACCESS FIX');
  
  try {
    console.log('🔄 Step 1: Updating database directly...');
    
    // Import the actual supabase client from your app
    const supabaseClient = (await import('./supabase')).supabase;
    
    console.log('✅ Found Supabase client from application');
    
    // Step 1: Update user in database
    const { data: updateResult, error: updateError } = await supabaseClient
      .from('users')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'cybergada@gmail.com')
      .select();
    
    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      
      // Try to create user if update failed
      console.log('🔄 Trying to create new admin user...');
      const { data: createResult, error: createError } = await supabaseClient
        .from('users')
        .insert({
          email: 'cybergada@gmail.com',
          first_name: 'Cyber',
          last_name: 'Gada',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (createError) {
        console.error('❌ User creation also failed:', createError);
        return false;
      }
      
      console.log('✅ New admin user created:', createResult);
    } else {
      console.log('✅ Database updated successfully:', updateResult);
    }
    
    // Step 2: Verify database update
    const { data: verifyUser, error: verifyError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('email', 'cybergada@gmail.com')
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return false;
    }
    
    console.log('✅ Database verification:', {
      email: verifyUser.email,
      role: verifyUser.role,
      active: verifyUser.is_active
    });
    
    // Step 3: Force auth store refresh
    console.log('🔄 Step 3: Refreshing auth store...');
    
    const authStoreModule = await import('../store/supabaseAuthStore');
    const authStore = authStoreModule.useSupabaseAuthStore.getState();
    
    // Force refresh
    await authStore.checkAuth();
    console.log('✅ Auth store refreshed');
    
    // Step 4: Manual auth store update
    const currentUser = authStore.user;
    if (currentUser && currentUser.email === 'cybergada@gmail.com') {
      const updatedUser = {
        ...currentUser,
        role: 'admin' as const,
        firstName: verifyUser.first_name,
        lastName: verifyUser.last_name,
        department: verifyUser.department,
        isActive: verifyUser.is_active
      };
      
      authStoreModule.useSupabaseAuthStore.setState({
        user: updatedUser,
        isAuthenticated: true,
        error: null
      });
      
      console.log('✅ Auth store manually updated');
    }
    
    console.log('🎉 SUCCESS: Admin access restored!');
    console.log('🔄 Refreshing page in 2 seconds...');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    console.groupEnd();
    return false;
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).emergencyAdminFixConsole = emergencyAdminFixConsole;
}

export { emergencyAdminFixConsole };