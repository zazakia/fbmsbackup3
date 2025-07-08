/**
 * React Console Fix for Admin Access
 * This works by accessing React DevTools and your app's state
 */

async function reactConsoleFix() {
  console.group('🚨 REACT CONSOLE ADMIN FIX');
  
  try {
    console.log('🔍 Step 1: Finding React app instance...');
    
    // Try to find React root and app state
    let reactRoot = null;
    let appElement = null;
    
    // Method 1: Try to find React root
    const rootElement = document.querySelector('#root');
    if (rootElement && rootElement._reactInternals) {
      reactRoot = rootElement._reactInternals;
      console.log('✅ Found React root via _reactInternals');
    } else if (rootElement && rootElement._reactInternalInstance) {
      reactRoot = rootElement._reactInternalInstance;
      console.log('✅ Found React root via _reactInternalInstance');
    }
    
    // Method 2: Use React DevTools global
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('✅ Found React DevTools hook');
      const reactDevTools = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      // Try to find Fiber nodes
      const fiberNodes = reactDevTools.getFiberRoots ? reactDevTools.getFiberRoots(1) : [];
      if (fiberNodes && fiberNodes.size > 0) {
        reactRoot = Array.from(fiberNodes)[0];
        console.log('✅ Found Fiber root');
      }
    }
    
    // Method 3: Direct access to Zustand stores
    console.log('🔍 Step 2: Looking for Zustand stores...');
    
    // Check if Zustand stores are available globally
    let authStore = null;
    
    // Try various ways to access the auth store
    if (window.useSupabaseAuthStore) {
      authStore = window.useSupabaseAuthStore.getState();
      console.log('✅ Found auth store in window');
    } else {
      // Try to find Zustand stores in the global scope
      const zustandStores = Object.keys(window).filter(key => 
        key.includes('Store') || key.includes('store') || key.includes('zustand')
      );
      
      console.log('Found potential stores:', zustandStores);
      
      // Look for auth-related stores
      for (const storeKey of zustandStores) {
        const store = window[storeKey];
        if (store && typeof store.getState === 'function') {
          const state = store.getState();
          if (state && (state.user || state.isAuthenticated !== undefined)) {
            authStore = state;
            console.log(`✅ Found auth store via ${storeKey}`);
            break;
          }
        }
      }
    }
    
    // Method 4: Direct API calls using fetch
    console.log('🔄 Step 3: Making direct API calls...');
    
    // Get current page URL to determine the API base
    const currentUrl = window.location.origin;
    const supabaseUrl = currentUrl.includes('localhost') 
      ? 'http://localhost:54321' 
      : 'https://coqjcziquviehgyifhek.supabase.co'; // Replace with your actual Supabase URL
    
    // Try to get auth token from localStorage
    let authToken = null;
    const localStorageKeys = Object.keys(localStorage);
    
    for (const key of localStorageKeys) {
      if (key.includes('supabase') && key.includes('auth')) {
        try {
          const authData = JSON.parse(localStorage.getItem(key) || '{}');
          if (authData.access_token || authData.session?.access_token) {
            authToken = authData.access_token || authData.session.access_token;
            console.log('✅ Found auth token in localStorage');
            break;
          }
        } catch (e) {
          // Continue looking
        }
      }
    }
    
    if (!authToken) {
      console.log('⚠️  No auth token found, trying anonymous request...');
      
      // Try to use the anon key (this should be safe for reading)
      authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    }
    
    // Make direct API call to update user
    console.log('🔄 Step 4: Updating user via API...');
    
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.cybergada@gmail.com`, {
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
    
    if (updateResponse.ok) {
      const updateResult = await updateResponse.json();
      console.log('✅ User updated via API:', updateResult);
    } else {
      console.log('⚠️  Update failed, trying to create user...');
      
      // Try to create user
      const createResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
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
      
      if (createResponse.ok) {
        const createResult = await createResponse.json();
        console.log('✅ User created via API:', createResult);
      } else {
        console.error('❌ Failed to create user via API');
        const errorText = await createResponse.text();
        console.error('Error:', errorText);
      }
    }
    
    // Step 5: Verify the update
    console.log('🔍 Step 5: Verifying update...');
    
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
        console.log('🎉 SUCCESS: User is now admin!');
        
        // Step 6: Update local auth store if available
        if (authStore && window.useSupabaseAuthStore?.setState) {
          const currentUser = authStore.user;
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              role: 'admin',
              firstName: verifyResult[0].first_name,
              lastName: verifyResult[0].last_name,
              isActive: verifyResult[0].is_active
            };
            
            window.useSupabaseAuthStore.setState({
              user: updatedUser,
              isAuthenticated: true,
              error: null
            });
            
            console.log('✅ Local auth store updated');
          }
        }
        
        console.log('🔄 Refreshing page in 3 seconds...');
        setTimeout(() => {
          window.location.reload();
        }, 3000);
        
        console.groupEnd();
        return true;
      }
    }
    
    console.log('⚠️  Please try logging out and logging back in');
    console.groupEnd();
    return false;
    
  } catch (error) {
    console.error('❌ React console fix failed:', error);
    console.groupEnd();
    return false;
  }
}

// Method to show all available debugging info
function showDebugInfo() {
  console.group('🔍 DEBUG INFO');
  
  console.log('=== WINDOW OBJECTS ===');
  const relevantKeys = Object.keys(window).filter(key => 
    key.includes('supabase') || 
    key.includes('auth') || 
    key.includes('Store') ||
    key.includes('store') ||
    key.includes('react') ||
    key.includes('zustand')
  );
  console.log('Relevant window keys:', relevantKeys);
  
  console.log('=== LOCAL STORAGE ===');
  const storageKeys = Object.keys(localStorage);
  console.log('All localStorage keys:', storageKeys);
  
  const authKeys = storageKeys.filter(key => 
    key.includes('supabase') || key.includes('auth') || key.includes('fbms')
  );
  console.log('Auth-related keys:', authKeys);
  
  authKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, JSON.parse(value || '{}'));
    } catch (e) {
      console.log(`${key}:`, value);
    }
  });
  
  console.log('=== REACT DEVTOOLS ===');
  console.log('React DevTools available:', !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
  
  console.log('=== DOM ELEMENTS ===');
  const root = document.querySelector('#root');
  console.log('Root element:', root);
  console.log('Root _reactInternals:', !!root?._reactInternals);
  console.log('Root _reactInternalInstance:', !!root?._reactInternalInstance);
  
  console.groupEnd();
}

// Make functions available globally
window.reactConsoleFix = reactConsoleFix;
window.showDebugInfo = showDebugInfo;

console.log('🚨 Admin fix tools loaded!');
console.log('📝 Run showDebugInfo() to see what\'s available');
console.log('📝 Run reactConsoleFix() to attempt the fix');

// Auto-run debug info
showDebugInfo();