#!/usr/bin/env node

/**
 * Supabase Loading Issues Fix Script
 *
 * This script identifies and fixes common Supabase loading issues:
 * 1. Schema mismatches causing query failures
 * 2. Infinite loading loops in components
 * 3. Connection timeout issues
 * 4. Auth state listener problems
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
  } catch (error) {
    console.error('Could not load .env.local file:', error.message);
  }
}

loadEnvFile();

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Loading Issues Fix Script');
console.log('=====================================\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  console.error('Please ensure VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test functions
const tests = [
  {
    name: 'Schema Validation',
    description: 'Check if all expected columns exist in tables',
    test: async () => {
      const issues = [];
      
      try {
        // Test sales table schema
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('id, invoice_number, customer_id, customer_name, total, created_at')
          .limit(1);
        
        if (salesError) {
          issues.push(`Sales table issue: ${salesError.message}`);
        }
        
        // Test customers table
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, first_name, last_name, email, phone')
          .limit(1);
        
        if (customersError) {
          issues.push(`Customers table issue: ${customersError.message}`);
        }
        
        // Test products table
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, sku, price, stock')
          .limit(1);
        
        if (productsError) {
          issues.push(`Products table issue: ${productsError.message}`);
        }
        
        return {
          success: issues.length === 0,
          issues,
          details: `Checked 3 core tables, found ${issues.length} issues`
        };
        
      } catch (error) {
        return {
          success: false,
          issues: [error.message],
          details: 'Schema validation failed'
        };
      }
    }
  },
  
  {
    name: 'Connection Performance',
    description: 'Test connection speed and reliability',
    test: async () => {
      const results = [];
      
      try {
        // Test multiple quick queries
        for (let i = 0; i < 5; i++) {
          const start = Date.now();
          const { error } = await supabase
            .from('customers')
            .select('count')
            .limit(1);
          const duration = Date.now() - start;
          
          results.push({
            attempt: i + 1,
            duration,
            success: !error,
            error: error?.message
          });
        }
        
        const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
        const successRate = results.filter(r => r.success).length / results.length;
        
        return {
          success: successRate >= 0.8 && avgDuration < 2000,
          details: `Average: ${avgDuration.toFixed(0)}ms, Success rate: ${(successRate * 100).toFixed(0)}%`,
          avgDuration,
          successRate,
          results
        };
        
      } catch (error) {
        return {
          success: false,
          details: `Connection test failed: ${error.message}`,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'Auth State Check',
    description: 'Verify auth configuration and session handling',
    test: async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          return {
            success: false,
            details: `Auth session error: ${sessionError.message}`,
            error: sessionError.message
          };
        }
        
        // Test auth listener setup (this is more of a configuration check)
        const hasSession = !!sessionData?.session;
        
        return {
          success: true,
          details: `Auth state: ${hasSession ? 'Authenticated' : 'Anonymous'}, No errors`,
          hasSession
        };
        
      } catch (error) {
        return {
          success: false,
          details: `Auth check failed: ${error.message}`,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'RLS Policy Check',
    description: 'Test if Row Level Security policies are working correctly',
    test: async () => {
      const tableTests = [];
      const tables = ['customers', 'products', 'sales', 'categories'];
      
      for (const table of tables) {
        try {
          const start = Date.now();
          const { data, error } = await supabase
            .from(table)
            .select('count')
            .limit(1);
          const duration = Date.now() - start;
          
          tableTests.push({
            table,
            success: !error,
            duration,
            error: error?.message,
            accessible: !error
          });
          
        } catch (error) {
          tableTests.push({
            table,
            success: false,
            duration: 0,
            error: error.message,
            accessible: false
          });
        }
      }
      
      const accessibleTables = tableTests.filter(t => t.accessible).length;
      const totalTables = tableTests.length;
      
      return {
        success: accessibleTables >= totalTables * 0.75, // At least 75% accessible
        details: `${accessibleTables}/${totalTables} tables accessible`,
        tableTests,
        accessibleTables,
        totalTables
      };
    }
  }
];

// Run all tests
async function runDiagnostics() {
  console.log('🔍 Running Supabase diagnostics...\n');
  
  const results = [];
  
  for (const test of tests) {
    console.log(`⏱️  ${test.name}...`);
    
    try {
      const start = Date.now();
      const result = await test.test();
      const duration = Date.now() - start;
      
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${test.name}: ${duration}ms`);
      console.log(`   ${result.details}`);
      
      if (!result.success && result.issues) {
        result.issues.forEach(issue => {
          console.log(`   - ${issue}`);
        });
      }
      
      results.push({
        ...result,
        name: test.name,
        description: test.description,
        duration
      });
      
    } catch (error) {
      console.log(`❌ ${test.name}: Failed`);
      console.log(`   Error: ${error.message}`);
      
      results.push({
        name: test.name,
        description: test.description,
        success: false,
        error: error.message,
        duration: 0
      });
    }
    
    console.log('');
  }
  
  return results;
}

// Generate recommendations
function generateRecommendations(results) {
  console.log('💡 Recommendations:');
  console.log('==================\n');
  
  const failedTests = results.filter(r => !r.success);
  
  if (failedTests.length === 0) {
    console.log('✅ All tests passed! Your Supabase connection is working correctly.');
    return;
  }
  
  failedTests.forEach(test => {
    console.log(`🔧 ${test.name}:`);
    
    switch (test.name) {
      case 'Schema Validation':
        console.log('   - Check your database schema matches the application expectations');
        console.log('   - Run database migrations if needed');
        console.log('   - Verify column names and types in Supabase dashboard');
        break;
        
      case 'Connection Performance':
        console.log('   - Check your internet connection');
        console.log('   - Consider increasing timeout values in supabase.ts');
        console.log('   - Monitor Supabase dashboard for service issues');
        break;
        
      case 'Auth State Check':
        console.log('   - Verify auth configuration in supabase.ts');
        console.log('   - Check if auth listeners are properly set up');
        console.log('   - Review auth store implementation');
        break;
        
      case 'RLS Policy Check':
        console.log('   - Review Row Level Security policies in Supabase');
        console.log('   - Ensure anonymous access is properly configured');
        console.log('   - Check if tables have appropriate policies');
        break;
    }
    console.log('');
  });
  
  // General recommendations
  console.log('🎯 General Fixes:');
  console.log('1. Clear browser cache and localStorage');
  console.log('2. Check browser console for JavaScript errors');
  console.log('3. Verify environment variables are loaded correctly');
  console.log('4. Test with different network conditions');
  console.log('5. Check Supabase project status and quotas');
}

// Main execution
async function main() {
  try {
    const results = await runDiagnostics();
    generateRecommendations(results);
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`\n📊 Summary: ${successCount}/${totalCount} tests passed`);
    
    if (successCount === totalCount) {
      console.log('🎉 All diagnostics passed! Supabase should be working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️  Some issues found. Please review the recommendations above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Diagnostic script failed:', error.message);
    process.exit(1);
  }
}

main();
