/**
 * Use Your Existing Dev Commands to Fix Admin Access
 * This leverages the fbmsDevCommands that are already loaded
 */

async function useDevCommandsFix() {
  console.group('🛠️  DEV COMMANDS ADMIN FIX');
  
  try {
    // Check if dev commands are available
    if (typeof fbmsDevCommands === 'undefined') {
      console.error('❌ fbmsDevCommands not available');
      return false;
    }
    
    console.log('✅ fbmsDevCommands found!');
    console.log('Available commands:', Object.keys(fbmsDevCommands));
    
    // Show help to see what's available
    if (typeof fbmsDevCommands.help === 'function') {
      console.log('📝 Available dev commands:');
      fbmsDevCommands.help();
    }
    
    // Try to use any admin-related commands
    const potentialAdminCommands = [
      'setAdminRole',
      'forceAdminRole', 
      'makeAdmin',
      'setRole',
      'updateUserRole',
      'fixAdmin',
      'adminAccess',
      'grantAdmin'
    ];
    
    for (const cmdName of potentialAdminCommands) {
      if (typeof fbmsDevCommands[cmdName] === 'function') {
        console.log(`🎯 Found admin command: ${cmdName}`);
        try {
          await fbmsDevCommands[cmdName]('cybergada@gmail.com', 'admin');
          console.log(`✅ Successfully ran ${cmdName}`);
          break;
        } catch (e) {
          console.log(`⚠️  ${cmdName} failed:`, e.message);
        }
      }
    }
    
    // Try to access auth store directly through dev commands
    if (typeof fbmsDevCommands.getAuthStore === 'function') {
      const authStore = fbmsDevCommands.getAuthStore();
      if (authStore && authStore.user) {
        console.log('📊 Current auth store user:', authStore.user);
        
        // Try to manually update
        if (typeof authStore.setState === 'function') {
          authStore.setState({
            user: {
              ...authStore.user,
              role: 'admin'
            }
          });
          console.log('✅ Manually updated auth store role to admin');
        }
      }
    }
    
    // Check if there are any direct user manipulation commands
    const devShortcuts = window.fbmsDev || {};
    console.log('Dev shortcuts available:', Object.keys(devShortcuts));
    
    // Try using setupAdmin command mentioned in the logs
    if (typeof window.setupAdmin === 'function') {
      console.log('🔧 Found setupAdmin function, trying to run it...');
      try {
        await window.setupAdmin();
        console.log('✅ setupAdmin executed successfully');
      } catch (e) {
        console.log('⚠️  setupAdmin failed:', e.message);
      }
    }
    
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('❌ Dev commands fix failed:', error);
    console.groupEnd();
    return false;
  }
}

// Alternative: Direct Zustand store manipulation
function forceAdminRoleNow() {
  console.group('⚡ FORCE ADMIN ROLE');
  
  try {
    // Look for Zustand stores in window
    const possibleStores = Object.keys(window).filter(key => 
      key.includes('Store') || key.includes('useSupabase') || key.includes('auth')
    );
    
    console.log('🔍 Searching for auth stores:', possibleStores);
    
    for (const storeName of possibleStores) {
      const store = window[storeName];
      if (store && typeof store.getState === 'function') {
        const state = store.getState();
        if (state && state.user && state.user.email === 'cybergada@gmail.com') {
          console.log(`📍 Found auth store: ${storeName}`);
          console.log('Current user state:', state.user);
          
          if (typeof store.setState === 'function') {
            // Force admin role
            store.setState({
              user: {
                ...state.user,
                role: 'admin'
              },
              isAuthenticated: true,
              error: null
            });
            
            console.log('✅ FORCE UPDATED ROLE TO ADMIN!');
            console.log('🔄 Role should update immediately in UI');
            
            // Trigger a re-render
            if (typeof store.getState().refreshUser === 'function') {
              store.getState().refreshUser();
            }
            
            console.groupEnd();
            return true;
          }
        }
      }
    }
    
    console.error('❌ Could not find auth store to manipulate');
    console.groupEnd();
    return false;
    
  } catch (error) {
    console.error('❌ Force admin role failed:', error);
    console.groupEnd();
    return false;
  }
}

// Make functions available
window.useDevCommandsFix = useDevCommandsFix;
window.forceAdminRoleNow = forceAdminRoleNow;

console.log('🛠️  DEV COMMANDS FIX LOADED!');
console.log('📝 Primary: useDevCommandsFix()');
console.log('📝 Force: forceAdminRoleNow()');
console.log('📝 Setup: setupAdmin() (if available)');

// Auto-run the dev commands fix
useDevCommandsFix();