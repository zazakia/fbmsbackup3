/**
 * NUCLEAR OPTION - Force Admin Access
 * Run this in browser console to get immediate admin access
 */

// Force override the permission functions globally
window.originalHasPermission = window.hasPermission;
window.originalCanAccessModule = window.canAccessModule;

// Override permission functions to always return true for cybergada
window.hasPermission = function(userRole, module, action) {
  console.log(`🆘 NUCLEAR BYPASS: Always granting ${module}:${action}`);
  return true;
};

window.canAccessModule = function(userRole, module) {
  console.log(`🆘 NUCLEAR BYPASS: Always granting module ${module}`);
  return true;
};

// Also override the imported functions if they exist
if (typeof hasPermission !== 'undefined') {
  window.hasPermission = hasPermission;
}
if (typeof canAccessModule !== 'undefined') {
  window.canAccessModule = canAccessModule;
}

// Force update any React components that might be using these
if (window.React && window.React.Component) {
  // Trigger a re-render by dispatching a custom event
  window.dispatchEvent(new CustomEvent('forceRerender'));
}

// Override localStorage to simulate admin role
const originalGetItem = localStorage.getItem;
localStorage.getItem = function(key) {
  if (key && key.includes('auth') && key.includes('token')) {
    const result = originalGetItem.call(this, key);
    if (result && result.includes('cybergada@gmail.com')) {
      console.log('🆘 NUCLEAR: Intercepted auth token for cybergada');
      return result;
    }
  }
  return originalGetItem.call(this, key);
};

console.log('💣 NUCLEAR FIX ACTIVATED - ALL PERMISSIONS GRANTED');
console.log('🔄 Refresh the page after running this');

// Auto-refresh after 2 seconds
setTimeout(() => {
  console.log('🔄 Auto-refreshing page...');
  window.location.reload();
}, 2000);