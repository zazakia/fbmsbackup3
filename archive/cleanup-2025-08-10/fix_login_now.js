// IMMEDIATE FIX for login issue
// Run this in browser console at http://localhost:5180

console.log('🚨 EMERGENCY FIX: Clearing localStorage database mode');
console.log('Current localStorage:', localStorage.getItem('fbms-settings-store'));

// Clear the problematic settings
localStorage.removeItem('fbms-settings-store');
console.log('✅ Cleared localStorage - app will now use remote database');

// Force page refresh to reinitialize Supabase client
console.log('🔄 Refreshing page to apply changes...');
setTimeout(() => {
    window.location.reload();
}, 500);