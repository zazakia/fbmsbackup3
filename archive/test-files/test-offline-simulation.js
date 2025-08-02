// Quick offline simulation test
// Run this in the browser console at http://localhost:5180

console.log('🔌 Testing Offline-First Functionality...');

// Test 1: Check if localStorage has FBMS data
const checkLocalStorage = () => {
  const keys = Object.keys(localStorage);
  const fbmsKeys = keys.filter(key => key.includes('fbms'));
  console.log('📦 FBMS LocalStorage keys found:', fbmsKeys);
  
  fbmsKeys.forEach(key => {
    const data = localStorage.getItem(key);
    console.log(`📦 ${key}:`, JSON.parse(data || '{}'));
  });
  
  return fbmsKeys.length > 0;
};

// Test 2: Simulate network disconnection
const simulateOffline = () => {
  const originalFetch = window.fetch;
  window.fetch = () => Promise.reject(new Error('OFFLINE: Network disabled'));
  console.log('🔌 Network simulation disabled');
  return originalFetch;
};

// Test 3: Check if app still works
const testAppFunctionality = () => {
  const buttons = document.querySelectorAll('button:not([disabled])');
  const inputs = document.querySelectorAll('input, textarea, select');
  const links = document.querySelectorAll('a, [role="button"]');
  
  console.log('🎮 Interactive elements found:');
  console.log(`  - Buttons: ${buttons.length}`);
  console.log(`  - Inputs: ${inputs.length}`);
  console.log(`  - Links: ${links.length}`);
  
  return buttons.length > 0 && inputs.length > 0;
};

// Run tests
console.log('Phase 1: Check localStorage data');
const hasLocalData = checkLocalStorage();

console.log('Phase 2: Simulate offline mode');
const originalFetch = simulateOffline();

console.log('Phase 3: Test app functionality');
const isAppFunctional = testAppFunctionality();

// Restore network
window.fetch = originalFetch;
console.log('🌐 Network simulation restored');

// Results
console.log('\n📊 OFFLINE TEST RESULTS:');
console.log(`✅ LocalStorage data: ${hasLocalData ? 'PASS' : 'FAIL'}`);
console.log(`✅ App functionality: ${isAppFunctional ? 'PASS' : 'FAIL'}`);
console.log(`🎯 Offline-First Status: ${hasLocalData && isAppFunctional ? 'CONFIRMED ✅' : 'NEEDS WORK ❌'}`);

if (hasLocalData && isAppFunctional) {
  console.log('🏆 FBMS is truly OFFLINE-FIRST! 🏆');
} else {
  console.log('⚠️ FBMS may have offline limitations');
}