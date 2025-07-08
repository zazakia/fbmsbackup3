/**
 * Emergency Admin Access Fix
 * Run this directly in your application's browser console
 */

async function emergencyAdminFix() {
  console.group('🚨 EMERGENCY ADMIN ACCESS FIX');
  
  try {
    // Try to get Supabase client from various possible locations
    let supabase = null;
    
    if (window.supabase) {
      supabase = window.supabase;
    } else if (window.__supabase) {
      supabase = window.__supabase;
    } else if (window.supabaseClient) {
      supabase = window.supabaseClient;
    } else {
      console.error('❌ Supabase client not found in window object');
      console.log('📝 Please make sure you are on the application page and logged in');
      return false;
    }
    
    console.log('✅ Found Supabase client');
    
    // Step 1: Update user in database
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
      
      // Try to create user if update failed
      console.log('🔄 Trying to create new admin user...');
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
        console.error('❌ User creation also failed:', createError);
        console.log('📝 Please contact system administrator');
        return false;
      }
      
      console.log('✅ New admin user created:', createResult);
    } else {
      console.log('✅ Database updated successfully:', updateResult);
    }
    
    // Step 2: Verify database update
    console.log('🔍 Step 2: Verifying database...');
    
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
      id: verifyUser.id
    });
    
    if (verifyUser.role !== 'admin') {
      console.error('❌ Database role is still not admin:', verifyUser.role);
      return false;
    }
    
    // Step 3: Force auth store refresh
    console.log('🔄 Step 3: Refreshing auth store...');
    
    // Try different ways to access the auth store
    let authStore = null;
    
    if (window.useSupabaseAuthStore) {
      authStore = window.useSupabaseAuthStore.getState();
    } else if (window.authStore) {
      authStore = window.authStore;
    } else {
      console.log('⚠️  Auth store not found in window, trying React DevTools method...');
      
      // Try to access React state through DevTools
      const reactRoot = document.querySelector('#root')._reactInternalInstance || 
                       document.querySelector('#root')._reactInternals;
      
      if (reactRoot) {
        console.log('📱 Found React root, attempting state refresh...');
      }
    }
    
    if (authStore && authStore.checkAuth) {
      await authStore.checkAuth();
      console.log('✅ Auth store refreshed via checkAuth()');
      
      // Manually update auth store if possible
      if (authStore.user && window.useSupabaseAuthStore && window.useSupabaseAuthStore.setState) {
        const updatedUser = {
          ...authStore.user,
          role: 'admin',
          firstName: verifyUser.first_name,
          lastName: verifyUser.last_name,
          department: verifyUser.department,
          isActive: verifyUser.is_active
        };
        
        window.useSupabaseAuthStore.setState({
          user: updatedUser,
          isAuthenticated: true,
          error: null
        });
        
        console.log('✅ Auth store manually updated');
      }
    } else {
      console.log('⚠️  Could not access auth store directly');
    }
    
    // Step 4: Force page refresh
    console.log('🔄 Step 4: Forcing page refresh...');
    console.log('🎉 Admin access should be restored after refresh!');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    console.log('📝 Please try logging out and logging back in');
    console.groupEnd();
    return false;
  }
}

// Alternative method using SQL execution if available
async function sqlFix() {
  console.group('🔧 SQL FIX METHOD');
  
  try {
    // This works if SQL execution is available
    const supabase = window.supabase || window.supabaseClient;
    
    if (!supabase) {
      console.error('❌ Supabase client not found');
      return false;
    }
    
    const { data, error } = await supabase.rpc('sql', {
      query: `
        UPDATE public.users 
        SET role = 'admin', updated_at = NOW() 
        WHERE email = 'cybergada@gmail.com';
        
        INSERT INTO public.users (email, first_name, last_name, role, is_active, created_at, updated_at)
        SELECT 'cybergada@gmail.com', 'Cyber', 'Gada', 'admin', true, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'cybergada@gmail.com');
        
        SELECT email, role, is_active FROM public.users WHERE email = 'cybergada@gmail.com';
      `
    });
    
    if (error) {
      console.error('❌ SQL execution failed:', error);
      return false;
    }
    
    console.log('✅ SQL fix executed:', data);
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('❌ SQL fix failed:', error);
    console.groupEnd();
    return false;
  }
}

// Run the emergency fix
console.log('🚨 Starting emergency admin access fix...');
console.log('📝 If this fails, try running sqlFix() manually');

emergencyAdminFix().then(success => {
  if (!success) {
    console.log('🔄 Trying alternative SQL method...');
    sqlFix();
  }
});

// Make functions available globally
window.emergencyAdminFix = emergencyAdminFix;
window.sqlFix = sqlFix;