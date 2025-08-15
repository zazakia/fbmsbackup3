#!/usr/bin/env node
// Local Supabase Connection Test
// Run with: node LOCAL_CONNECTION_TEST.js

console.log('🧪 Testing Local Supabase Connection...\n');

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJuXp0L4xdYPL2nTCFKKqcchHuJOY0PZc';

// Test 1: Basic connectivity
async function testConnectivity() {
    console.log('1️⃣ Testing basic connectivity...');
    try {
        const response = await fetch(`${LOCAL_SUPABASE_URL}/rest/v1/`, {
            method: 'HEAD',
            headers: {
                'apikey': LOCAL_ANON_KEY,
                'Authorization': `Bearer ${LOCAL_ANON_KEY}`
            }
        });
        
        console.log(`   Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            console.log('   ✅ Basic connectivity: SUCCESS');
            return true;
        } else {
            console.log('   ❌ Basic connectivity: FAILED');
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Basic connectivity: ERROR - ${error.message}`);
        return false;
    }
}

// Test 2: Schema availability
async function testSchema() {
    console.log('\n2️⃣ Testing schema availability...');
    try {
        const response = await fetch(`${LOCAL_SUPABASE_URL}/rest/v1/`, {
            headers: {
                'apikey': LOCAL_ANON_KEY,
                'Authorization': `Bearer ${LOCAL_ANON_KEY}`,
                'Accept': 'application/vnd.pgrst.object+json'
            }
        });
        
        if (response.status === 503) {
            console.log('   ⏳ Schema cache loading...');
            return false;
        } else if (response.ok) {
            console.log('   ✅ Schema: READY');
            return true;
        } else {
            console.log(`   ❌ Schema: ERROR ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Schema test: ERROR - ${error.message}`);
        return false;
    }
}

// Test 3: Products table access
async function testProductsTable() {
    console.log('\n3️⃣ Testing products table access...');
    try {
        const response = await fetch(`${LOCAL_SUPABASE_URL}/rest/v1/products?limit=1`, {
            headers: {
                'apikey': LOCAL_ANON_KEY,
                'Authorization': `Bearer ${LOCAL_ANON_KEY}`,
                'Accept': 'application/json'
            }
        });
        
        const text = await response.text();
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
        
        if (response.ok) {
            try {
                const data = JSON.parse(text);
                console.log(`   ✅ Products table: ACCESSIBLE (${Array.isArray(data) ? data.length : 'unknown'} records)`);
                return true;
            } catch (parseError) {
                console.log('   ⚠️ Products table: Response not valid JSON');
                return false;
            }
        } else {
            console.log('   ❌ Products table: NOT ACCESSIBLE');
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Products table: ERROR - ${error.message}`);
        return false;
    }
}

// Test 4: Insert test
async function testInsert() {
    console.log('\n4️⃣ Testing insert capability...');
    try {
        const testProduct = {
            name: 'Connection Test Product',
            sku: `TEST-${Date.now()}`,
            category: 'Test Category',
            price: 99.99,
            cost: 50.00,
            stock: 10,
            min_stock: 5,
            unit: 'pcs',
            is_active: true
        };
        
        const response = await fetch(`${LOCAL_SUPABASE_URL}/rest/v1/products`, {
            method: 'POST',
            headers: {
                'apikey': LOCAL_ANON_KEY,
                'Authorization': `Bearer ${LOCAL_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(testProduct)
        });
        
        const text = await response.text();
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
        
        if (response.status === 201) {
            console.log('   ✅ Insert test: SUCCESS');
            return true;
        } else {
            console.log('   ❌ Insert test: FAILED');
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Insert test: ERROR - ${error.message}`);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting comprehensive local Supabase tests...\n');
    
    const connectivityOk = await testConnectivity();
    if (!connectivityOk) {
        console.log('\n❌ FAILED: Cannot establish basic connection to Supabase');
        return;
    }
    
    // Wait a bit for schema to load if needed
    let schemaOk = await testSchema();
    if (!schemaOk) {
        console.log('   ⏳ Waiting 5 seconds for schema to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        schemaOk = await testSchema();
    }
    
    if (!schemaOk) {
        console.log('\n❌ FAILED: Schema not ready. Database may still be initializing.');
        return;
    }
    
    const productsOk = await testProductsTable();
    if (!productsOk) {
        console.log('\n❌ FAILED: Cannot access products table. Schema may be missing.');
        return;
    }
    
    const insertOk = await testInsert();
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Basic Connectivity: ${connectivityOk ? '✅' : '❌'}`);
    console.log(`   Schema Ready: ${schemaOk ? '✅' : '❌'}`);
    console.log(`   Products Table: ${productsOk ? '✅' : '❌'}`);
    console.log(`   Insert Capability: ${insertOk ? '✅' : '❌'}`);
    
    if (connectivityOk && schemaOk && productsOk && insertOk) {
        console.log('\n🎉 ALL TESTS PASSED! Local Supabase is fully functional.');
    } else {
        console.log('\n⚠️ Some tests failed. Check the issues above.');
    }
}

// Run the tests
runAllTests().catch(error => {
    console.error('❌ Test runner error:', error);
});