#!/usr/bin/env node
// Fix JWT Authentication for Local Supabase

// Standard local Supabase JWT secret used by most installations
const JWT_SECRET = 'your-super-secret-jwt-token-with-at-least-32-characters-long';
const ISSUER = 'supabase';

// Common local Supabase JWT tokens - try these in sequence
const COMMON_LOCAL_TOKENS = [
    // Standard demo token
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJuXp0L4xdYPL2nTCFKKqcchHuJOY0PZc',
    
    // Alternative standard token
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE5NTcxMjkyMDB9.IotU_8FMxp8nZx4Pf0FJYCe9NdLOEBDw8oGOEQ4wHHw',
    
    // Another common variation
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiZXhwIjoyMDAwMDAwMDAwfQ.zZhPp5D2HVhN_3kx7U0WKM8fPKCbZJf1AXNzUqL9F6E',
];

const SERVICE_ROLE_TOKENS = [
    // Standard service role token
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
    
    // Alternative service role
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTk1NzEyOTIwMH0.NheG0SZS6amKNhq-0O1zXRN2Uq0GYXxNNmJFJzwKSFc',
];

const SUPABASE_URL = 'http://127.0.0.1:54321';

async function testToken(token, tokenType = 'anon') {
    console.log(`\n🧪 Testing ${tokenType} token:`, token.substring(0, 50) + '...');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?limit=1`, {
            headers: {
                'apikey': token,
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 200) {
            const data = await response.json();
            console.log(`   ✅ SUCCESS! Got ${data.length} products`);
            console.log(`   📊 First product:`, data[0]?.name || 'No products found');
            return token;
        } else if (response.status === 401) {
            const error = await response.json();
            console.log(`   ❌ Unauthorized: ${error.message}`);
        } else {
            const text = await response.text();
            console.log(`   ⚠️ Other error: ${text.substring(0, 100)}`);
        }
    } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    return null;
}

async function findWorkingToken() {
    console.log('🔍 Finding working JWT token for local Supabase...\n');
    
    console.log('Testing Anonymous (anon) tokens:');
    for (const token of COMMON_LOCAL_TOKENS) {
        const workingToken = await testToken(token, 'anon');
        if (workingToken) {
            console.log('\n🎉 FOUND WORKING ANON TOKEN!');
            console.log('Copy this token to your .env.local file:');
            console.log(`VITE_PUBLIC_SUPABASE_ANON_KEY=${workingToken}`);
            return workingToken;
        }
    }
    
    console.log('\n🔍 Testing Service Role tokens (more powerful):');
    for (const token of SERVICE_ROLE_TOKENS) {
        const workingToken = await testToken(token, 'service_role');
        if (workingToken) {
            console.log('\n🎉 FOUND WORKING SERVICE ROLE TOKEN!');
            console.log('Copy this token to your .env.local file:');
            console.log(`VITE_PUBLIC_SUPABASE_ANON_KEY=${workingToken}`);
            console.log('SUPABASE_SERVICE_ROLE_KEY=' + workingToken);
            return workingToken;
        }
    }
    
    console.log('\n❌ No working tokens found. The Supabase instance might be using a custom JWT secret.');
    console.log('💡 Try using the Supabase CLI to get the correct tokens:');
    console.log('   supabase status');
    
    return null;
}

// Run the token finder
findWorkingToken().then(token => {
    if (token) {
        console.log('\n📝 Next steps:');
        console.log('1. Update your .env.local with the working token');
        console.log('2. Restart the development server');
        console.log('3. Test the app at http://localhost:5181');
    }
}).catch(console.error);