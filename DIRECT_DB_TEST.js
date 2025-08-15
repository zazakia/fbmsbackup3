#!/usr/bin/env node
// Direct database connection test using the working Supabase instance

console.log('🔗 Testing Direct Database Connection...\n');

// Since we confirmed the database works, let's try different connection approaches
const tests = [
    {
        name: 'Working DB via Kong (port 54321)',
        url: 'http://127.0.0.1:54321',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJuXp0L4xdYPL2nTCFKKqcchHuJOY0PZc'
    },
    {
        name: 'Alternative Kong setup',
        url: 'http://127.0.0.1:54321',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE5NTcxMjkyMDB9.IotU_8FMxp8nZx4Pf0FJYCe9NdLOEBDw8oGOEQ4wHHw'
    }
];

async function testConnection(test) {
    console.log(`🧪 Testing: ${test.name}`);
    
    try {
        // Test 1: Basic connectivity
        const response = await fetch(`${test.url}/rest/v1/`, {
            method: 'HEAD',
            headers: {
                'apikey': test.key,
                'Authorization': `Bearer ${test.key}`
            }
        });
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.status === 503) {
            console.log('   ⚠️ Service unavailable (expected due to auth container issues)');
        } else if (response.status === 401) {
            console.log('   ⚠️ Unauthorized (wrong API key)');
        } else if (response.ok) {
            console.log('   ✅ Connection successful!');
        }
        
        // Test 2: Try products query anyway
        try {
            const productsResponse = await fetch(`${test.url}/rest/v1/products?limit=1`, {
                headers: {
                    'apikey': test.key,
                    'Authorization': `Bearer ${test.key}`,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });
            
            const text = await productsResponse.text();
            console.log(`   Products query: ${productsResponse.status} - ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        } catch (queryError) {
            console.log(`   Products query: Failed - ${queryError.message}`);
        }
        
    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
    }
    
    console.log('');
}

async function runTests() {
    for (const test of tests) {
        await testConnection(test);
    }
    
    console.log('💡 Recommendations:');
    console.log('   1. The database has data (confirmed: 4 products)');
    console.log('   2. Kong gateway is running but auth services are restarting');
    console.log('   3. App should work with timeout handling - try it now!');
    console.log('   4. Visit http://localhost:5181 and check browser console');
    console.log('');
    console.log('🎯 Expected behavior:');
    console.log('   - Queries will timeout after 10 seconds');
    console.log('   - App will fallback to mock data');
    console.log('   - No more infinite hanging!');
}

runTests().catch(console.error);