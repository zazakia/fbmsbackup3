/**
 * Fix Cybergada Admin Access - Comprehensive Solution
 * This utility will properly update the database and force auth store refresh
 */

import { supabase } from './supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

export const fixCybergadaAdminAccess = async () => {
  console.group('🚨 FIXING CYBERGADA ADMIN ACCESS');
  
  try {
    // Step 1: Force database update
    console.log('🔄 Step 1: Forcing database update...');
    
    const { data: updateResult, error: updateError } = await supabase
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
      console.log('🔄 Attempting to create user...');
      const { data: createResult, error: createError } = await supabase
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
        console.error('❌ User creation failed:', createError);
        return false;
      }
      
      console.log('✅ User created successfully:', createResult);
    } else {
      console.log('✅ Database updated successfully:', updateResult);
    }
    
    // Step 2: Verify database update
    console.log('🔍 Step 2: Verifying database update...');
    
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'cybergada@gmail.com')
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return false;
    }
    
    console.log('✅ Database verification successful:', {
      email: verifyUser.email,
      role: verifyUser.role,
      active: verifyUser.is_active,
      updated: verifyUser.updated_at
    });
    
    if (verifyUser.role !== 'admin') {
      console.error('❌ Database role is still not admin:', verifyUser.role);
      return false;
    }
    
    // Step 3: Force auth store refresh
    console.log('🔄 Step 3: Forcing auth store refresh...');
    
    const authStore = useSupabaseAuthStore.getState();
    const currentUser = authStore.user;
    
    if (!currentUser) {
      console.error('❌ No current user in auth store');
      return false;
    }
    
    console.log('📊 Current auth store user:', {
      email: currentUser.email,
      role: currentUser.role,
      active: currentUser.isActive
    });
    
    // Step 4: Manually update auth store with correct role
    console.log('🔄 Step 4: Manually updating auth store...');
    
    const updatedUser = {
      ...currentUser,
      role: 'admin' as const,
      firstName: verifyUser.first_name,
      lastName: verifyUser.last_name,
      department: verifyUser.department,
      isActive: verifyUser.is_active
    };
    
    // Force update the auth store
    useSupabaseAuthStore.setState({
      user: updatedUser,
      isAuthenticated: true,
      error: null
    });
    
    console.log('✅ Auth store updated manually');
    
    // Step 5: Refresh session and re-check auth
    console.log('🔄 Step 5: Refreshing session...');
    
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Session refresh failed:', sessionError);
    } else {
      console.log('✅ Session refreshed');
    }
    
    // Force auth check
    await authStore.checkAuth();
    console.log('✅ Auth check forced');
    
    // Step 6: Final verification
    console.log('🔍 Step 6: Final verification...');
    
    const finalAuthUser = useSupabaseAuthStore.getState().user;
    if (finalAuthUser) {
      console.log('📊 Final auth user:', {
        email: finalAuthUser.email,
        role: finalAuthUser.role,
        active: finalAuthUser.isActive
      });
      
      if (finalAuthUser.role === 'admin') {
        console.log('🎉 SUCCESS: Admin access granted!');
        console.log('🔄 Page refresh recommended to see all admin features');
        
        // Auto-refresh page in 3 seconds
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            console.log('🔄 Auto-refreshing page...');
            window.location.reload();
          }
        }, 3000);
        
        return true;
      } else {
        console.error('❌ Auth store still shows wrong role:', finalAuthUser.role);
        console.log('⚠️  Manual logout/login may be required');
      }
    } else {
      console.error('❌ No final auth user found');
    }
    
    console.groupEnd();
    return false;
    
  } catch (error) {
    console.error('❌ Fix failed with error:', error);
    console.groupEnd();
    return false;
  }
};

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).fixCybergadaAdminAccess = fixCybergadaAdminAccess;
}