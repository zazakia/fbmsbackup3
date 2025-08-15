// Copy and paste this into browser console to test Supabase directly
// This will help us isolate whether the issue is in our API layer or Supabase itself

console.log('🧪 Starting direct Supabase test...');

// Test 1: Check if Supabase client exists
if (typeof window.supabase === 'undefined') {
  console.error('❌ Supabase client not found on window object');
  console.log('💡 Try accessing from React DevTools or after page loads');
} else {
  console.log('✅ Supabase client found');
  
  // Test 2: Simple connectivity test
  console.log('🔍 Testing basic connectivity...');
  window.supabase.from('products').select('count').then(result => {
    console.log('✅ Count query result:', result);
  }).catch(err => {
    console.error('❌ Count query failed:', err);
  });
  
  // Test 3: Simple select with timeout
  console.log('🔍 Testing simple select with manual timeout...');
  const simpleQuery = window.supabase.from('products').select('id, name').limit(1);
  
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Manual timeout')), 5000)
  );
  
  Promise.race([simpleQuery, timeout])
    .then(result => {
      console.log('✅ Simple select succeeded:', result);
    })
    .catch(err => {
      console.error('❌ Simple select failed or timed out:', err);
    });
  
  // Test 4: Check auth state
  console.log('🔍 Checking auth state...');
  window.supabase.auth.getSession().then(result => {
    console.log('Auth session:', result);
  });
}

// Test 5: Direct fetch to Supabase REST API
console.log('🔍 Testing direct REST API call...');
const supabaseUrl = 'http://127.0.0.1:54321'; // Local Supabase URL
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJuXp0L4xdYPL2nTCFKKqcchHuJOY0PZc';

fetch(`${supabaseUrl}/rest/v1/products?limit=1`, {
  method: 'GET',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('Direct REST response status:', response.status);
  return response.json();
})
.then(data => {
  console.log('✅ Direct REST call succeeded:', data);
})
.catch(err => {
  console.error('❌ Direct REST call failed:', err);
});

console.log('🧪 All tests initiated. Check results above...');