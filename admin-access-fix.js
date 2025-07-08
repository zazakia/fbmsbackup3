/**
 * Admin Access Fix Script - Run this in browser console
 * This will fix the cybergada@gmail.com user role issue
 */

// Step 1: Update database directly
async function fixAdminAccess() {
  console.group('🚨 ADMIN ACCESS FIX');
  
  try {
    // Get Supabase client from window
    const supabase = window.supabase || window.supabaseClient;
    
    if (!supabase) {
      console.error('❌ Supabase client not found');
      console.log('📝 Please ensure you are on the application page');
      return false;
    }
    
    // Step 1: Update database
    console.log('🔄 Step 1: Updating database...');
    
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
      return false;
    }
    
    console.log('✅ Database updated:', updateResult);
    
    // Step 2: Force auth store refresh
    console.log('🔄 Step 2: Refreshing auth store...');
    
    // Get auth store
    const authStore = window.useSupabaseAuthStore?.getState?.();
    
    if (!authStore) {
      console.error('❌ Auth store not found');
      return false;
    }
    
    // Force refresh
    await authStore.checkAuth();
    console.log('✅ Auth store refreshed');
    
    // Step 3: Manual auth store update
    console.log('🔄 Step 3: Manually updating auth store...');
    
    const currentUser = authStore.user;
    if (currentUser && currentUser.email === 'cybergada@gmail.com') {
      const updatedUser = {
        ...currentUser,
        role: 'admin'
      };
      
      // Force update
      window.useSupabaseAuthStore?.setState?.({
        user: updatedUser,
        isAuthenticated: true,
        error: null
      });
      
      console.log('✅ Auth store manually updated');
    }
    
    // Step 4: Verify
    console.log('🔍 Step 4: Verifying...');
    
    const finalUser = window.useSupabaseAuthStore?.getState?.()?.user;
    if (finalUser) {
      console.log('📊 Final user:', {
        email: finalUser.email,
        role: finalUser.role,
        active: finalUser.isActive
      });
      
      if (finalUser.role === 'admin') {
        console.log('🎉 SUCCESS: Admin access granted!');
        console.log('🔄 Refreshing page in 3 seconds...');
        
        setTimeout(() => {
          window.location.reload();
        }, 3000);
        
        return true;
      }
    }
    
    console.log('⚠️  May need manual logout/login');
    console.groupEnd();
    return false;
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    console.groupEnd();
    return false;
  }
}

// Run the fix
fixAdminAccess();