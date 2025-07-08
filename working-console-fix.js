/**
 * Working Console Fix - Bypasses Schema Issues
 * This directly updates the database and forces auth refresh
 */

async function workingConsoleFix() {
  console.group('🚨 WORKING CONSOLE FIX');
  
  try {
    console.log('🔍 Detecting your database configuration...');
    
    // Get your Supabase URL from the current page or localStorage
    let supabaseUrl = 'https://coqjcziquviehgyifhek.supabase.co'; // Default from your project
    const currentUrl = window.location.origin;
    
    if (currentUrl.includes('localhost')) {
      supabaseUrl = 'http://localhost:54321';
    }
    
    console.log('🎯 Using Supabase URL:', supabaseUrl);
    
    // Get auth token from localStorage
    let authToken = null;
    const localStorageKeys = Object.keys(localStorage);
    
    for (const key of localStorageKeys) {
      if (key.includes('supabase') || key.includes('auth') || key.includes('fbms')) {
        try {
          const value = localStorage.getItem(key);
          const data = JSON.parse(value || '{}');
          
          if (data.access_token) {
            authToken = data.access_token;
            console.log('✅ Found auth token in', key);
            break;
          } else if (data.session && data.session.access_token) {
            authToken = data.session.access_token;
            console.log('✅ Found session token in', key);
            break;
          }
        } catch (e) {
          // Continue looking
        }
      }
    }
    
    if (!authToken) {
      // Fallback to anon key
      authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
      console.log('⚠️  Using anon key as fallback');
    }
    
    // Step 1: Try to update user in public.users
    console.log('🔄 Step 1: Updating user in public.users...');
    
    const updatePublicResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.cybergada@gmail.com`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': authToken,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        role: 'admin',
        updated_at: new Date().toISOString()
      })
    });
    
    let publicUpdateSuccess = false;
    
    if (updatePublicResponse.ok) {
      const result = await updatePublicResponse.json();
      console.log('✅ Updated public.users:', result);
      publicUpdateSuccess = true;
    } else {
      const errorText = await updatePublicResponse.text();
      console.log('⚠️  public.users update failed:', errorText);
      
      // Try to create user in public.users
      console.log('🔄 Trying to create user in public.users...');
      
      const createPublicResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': authToken,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          email: 'cybergada@gmail.com',
          first_name: 'Cyber',
          last_name: 'Gada',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
      
      if (createPublicResponse.ok) {
        const createResult = await createPublicResponse.json();
        console.log('✅ Created user in public.users:', createResult);
        publicUpdateSuccess = true;
      } else {
        const createErrorText = await createPublicResponse.text();
        console.log('❌ Failed to create in public.users:', createErrorText);
      }
    }
    
    // Step 2: Try fbms schema as well (if it exists)
    console.log('🔄 Step 2: Trying fbms.users schema...');
    
    const updateFbmsResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.cybergada@gmail.com&schema=fbms`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': authToken,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        role: 'admin',
        updated_at: new Date().toISOString()
      })
    });
    
    if (updateFbmsResponse.ok) {
      const fbmsResult = await updateFbmsResponse.json();
      console.log('✅ Updated fbms.users:', fbmsResult);
    } else {
      console.log('⚠️  fbms.users not available or update failed');
    }
    
    // Step 3: Verify the update
    console.log('🔍 Step 3: Verifying updates...');
    
    const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.cybergada@gmail.com`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'apikey': authToken
      }
    });
    
    if (verifyResponse.ok) {
      const verifyResult = await verifyResponse.json();
      console.log('✅ Verification result:', verifyResult);
      
      if (verifyResult.length > 0 && verifyResult[0].role === 'admin') {
        console.log('🎉 SUCCESS: Database shows admin role!');
        
        // Step 4: Force browser refresh to clear any cached auth state
        console.log('🔄 Step 4: Clearing auth cache and refreshing...');
        
        // Clear relevant localStorage items
        const keysToRemove = [];
        for (const key of Object.keys(localStorage)) {
          if (key.includes('supabase') || key.includes('auth') || key.includes('fbms')) {
            keysToRemove.push(key);
          }
        }
        
        console.log('🗑️  Clearing cached auth data...');
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log('  Removed:', key);
        });
        
        // Clear session storage too
        sessionStorage.clear();
        console.log('🗑️  Cleared session storage');
        
        console.log('🔄 Refreshing page in 3 seconds...');
        console.log('📝 After refresh, login again to see admin access');
        
        setTimeout(() => {
          window.location.reload();
        }, 3000);
        
        console.groupEnd();
        return true;
      } else {
        console.log('❌ Role is still not admin in database');
      }
    } else {
      console.log('❌ Verification failed');
    }
    
    // If we get here, try the SQL approach
    console.log('🔄 Step 5: Trying SQL execution...');
    
    const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': authToken
      },
      body: JSON.stringify({
        query: `
          UPDATE public.users SET role = 'admin', updated_at = NOW() WHERE email = 'cybergada@gmail.com';
          INSERT INTO public.users (email, first_name, last_name, role, is_active, created_at, updated_at)
          SELECT 'cybergada@gmail.com', 'Cyber', 'Gada', 'admin', true, NOW(), NOW()
          WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'cybergada@gmail.com');
        `
      })
    });
    
    if (sqlResponse.ok) {
      console.log('✅ SQL execution successful');
      setTimeout(() => window.location.reload(), 2000);
      console.groupEnd();
      return true;
    }
    
    console.log('📝 Manual steps required:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log(`2. Run: UPDATE public.users SET role = 'admin' WHERE email = 'cybergada@gmail.com';`);
    console.log('3. Refresh your application');
    
    console.groupEnd();
    return false;
    
  } catch (error) {
    console.error('❌ Working console fix failed:', error);
    console.log('📝 Please try the manual database update method');
    console.groupEnd();
    return false;
  }
}

// Simpler version that just clears auth cache
function clearAuthAndRefresh() {
  console.group('🗑️  CLEAR AUTH CACHE');
  
  try {
    console.log('🔄 Clearing all auth-related cached data...');
    
    // Clear localStorage
    const keysToRemove = [];
    for (const key of Object.keys(localStorage)) {
      if (key.includes('supabase') || key.includes('auth') || key.includes('fbms') || key.includes('store')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('Removed:', key);
    });
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear any cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    console.log('✅ Auth cache cleared');
    console.log('🔄 Refreshing page...');
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('❌ Clear cache failed:', error);
    console.groupEnd();
    return false;
  }
}

// Make functions available
window.workingConsoleFix = workingConsoleFix;
window.clearAuthAndRefresh = clearAuthAndRefresh;

console.log('🚨 WORKING CONSOLE FIX LOADED!');
console.log('📝 Run: workingConsoleFix()');
console.log('📝 Or if that fails: clearAuthAndRefresh()');

// Auto-run the fix
workingConsoleFix();