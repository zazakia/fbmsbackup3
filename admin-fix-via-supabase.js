/**
 * WORKING Admin Fix - Via Supabase Client
 * This directly updates the users table which the auth system reads from
 */

async function fixAdminAccessNow() {
  console.group('🔧 SUPABASE ADMIN FIX');
  
  try {
    // Get the current Supabase client
    const supabase = window.supabase || window._supabase;
    if (!supabase) {
      console.error('❌ Supabase client not found');
      return false;
    }
    
    console.log('✅ Supabase client found');
    
    // Update the user role directly in the database
    const { data, error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('email', 'cybergada@gmail.com')
      .select();
    
    if (error) {
      console.error('❌ Database update failed:', error);
      return false;
    }
    
    console.log('✅ Database updated successfully:', data);
    
    // Now refresh the auth store to pick up the new role
    if (window.useSupabaseAuthStore) {
      const authStore = window.useSupabaseAuthStore.getState();
      if (authStore && typeof authStore.refreshUser === 'function') {
        await authStore.refreshUser();
        console.log('✅ Auth store refreshed');
      }
    }
    
    // Alternative: trigger a page refresh to load new role
    setTimeout(() => {
      console.log('🔄 Refreshing page to load new admin role...');
      window.location.reload();
    }, 1000);
    
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('❌ Admin fix failed:', error);
    console.groupEnd();
    return false;
  }
}

// Make function available
window.fixAdminAccessNow = fixAdminAccessNow;

console.log('🔧 SUPABASE ADMIN FIX LOADED!');
console.log('📝 Run: fixAdminAccessNow()');

// Auto-run the fix
fixAdminAccessNow();