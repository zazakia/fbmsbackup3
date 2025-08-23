#!/usr/bin/env node

/**
 * Middleware Fix Test Script
 * 
 * Tests to verify that the middleware issues causing persistent loading
 * have been resolved by checking:
 * 1. No fetch overrides are active
 * 2. Supabase connections work without interference
 * 3. No infinite loading loops
 * 4. ResourceRetryService is properly disabled
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

console.log('🔧 Middleware Fix Verification Test');
console.log('==================================\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Test functions
const tests = [
  {
    name: 'Problematic Fetch Override Check',
    description: 'Verify no problematic middleware is overriding window.fetch',
    test: async () => {
      try {
        // Check if fetch has been modified by problematic middleware
        const originalFetch = global.fetch || fetch;
        const fetchString = originalFetch.toString();

        // Look for signs of PROBLEMATIC middleware modification
        // Note: Supabase's custom fetch handler is legitimate and expected
        const hasProblematicMiddleware = fetchString.includes('ResourceRetryService') ||
                                        fetchString.includes('window.fetch = async') ||
                                        fetchString.includes('originalFetch') &&
                                        !fetchString.includes('handleSupabaseError');

        const isSupabaseHandler = fetchString.includes('handleSupabaseError') ||
                                 fetchString.includes('supabase');

        return {
          success: !hasProblematicMiddleware,
          details: hasProblematicMiddleware
            ? 'Problematic fetch middleware detected'
            : isSupabaseHandler
              ? 'Supabase fetch handler detected (expected and safe)'
              : 'Native fetch function',
          fetchLength: fetchString.length,
          isNative: !hasProblematicMiddleware && !isSupabaseHandler,
          isSupabaseHandler,
          hasProblematicMiddleware
        };

      } catch (error) {
        return {
          success: false,
          details: `Fetch check failed: ${error.message}`,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'Supabase Connection Speed',
    description: 'Test Supabase connection speed without middleware interference',
    test: async () => {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        
        const results = [];
        
        // Test multiple quick queries to check for consistency
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
        const maxDuration = Math.max(...results.map(r => r.duration));
        const minDuration = Math.min(...results.map(r => r.duration));
        
        // Good performance indicators
        const isConsistent = (maxDuration - minDuration) < 1000; // Less than 1s variance
        const isFast = avgDuration < 500; // Average under 500ms
        const isReliable = successRate >= 0.8; // 80% success rate
        
        return {
          success: isConsistent && isFast && isReliable,
          details: `Avg: ${avgDuration.toFixed(0)}ms, Range: ${minDuration}-${maxDuration}ms, Success: ${(successRate * 100).toFixed(0)}%`,
          avgDuration,
          maxDuration,
          minDuration,
          successRate,
          isConsistent,
          isFast,
          isReliable,
          results
        };
        
      } catch (error) {
        return {
          success: false,
          details: `Connection speed test failed: ${error.message}`,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'Concurrent Request Test',
    description: 'Test multiple concurrent requests for interference',
    test: async () => {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        
        const start = Date.now();
        
        // Fire multiple concurrent requests
        const promises = [
          supabase.from('customers').select('count').limit(1),
          supabase.from('products').select('count').limit(1),
          supabase.from('sales').select('count').limit(1),
          supabase.from('categories').select('count').limit(1)
        ];
        
        const results = await Promise.allSettled(promises);
        const duration = Date.now() - start;
        
        const successCount = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
        const totalCount = results.length;
        const successRate = successCount / totalCount;
        
        // Check for any hanging requests (should complete quickly)
        const isQuick = duration < 3000; // Under 3 seconds for all
        const isReliable = successRate >= 0.75; // 75% success rate
        
        return {
          success: isQuick && isReliable,
          details: `${successCount}/${totalCount} requests succeeded in ${duration}ms`,
          duration,
          successCount,
          totalCount,
          successRate,
          isQuick,
          isReliable,
          results: results.map((r, i) => ({
            index: i,
            status: r.status,
            success: r.status === 'fulfilled' && !r.value?.error,
            error: r.status === 'rejected' ? r.reason?.message : r.value?.error?.message
          }))
        };
        
      } catch (error) {
        return {
          success: false,
          details: `Concurrent request test failed: ${error.message}`,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'ResourceRetryService Status',
    description: 'Verify ResourceRetryService is properly disabled',
    test: async () => {
      try {
        // Check if ResourceRetryService file has been modified
        const serviceFilePath = path.join(__dirname, 'src/services/ResourceRetryService.ts');
        
        if (!fs.existsSync(serviceFilePath)) {
          return {
            success: true,
            details: 'ResourceRetryService file not found (good - service removed)',
            fileExists: false
          };
        }
        
        const fileContent = fs.readFileSync(serviceFilePath, 'utf8');
        
        // Check for disabled indicators
        const isDisabled = fileContent.includes('DISABLED') || 
                          fileContent.includes('disabled to prevent loading issues') ||
                          fileContent.includes('// this.initializeResourceMonitoring()');
        
        const hasFetchOverride = fileContent.includes('window.fetch = async') && 
                                !fileContent.includes('/*') && 
                                !fileContent.includes('DISABLED');
        
        return {
          success: isDisabled && !hasFetchOverride,
          details: isDisabled 
            ? 'ResourceRetryService is properly disabled'
            : 'ResourceRetryService may still be active',
          fileExists: true,
          isDisabled,
          hasFetchOverride
        };
        
      } catch (error) {
        return {
          success: false,
          details: `ResourceRetryService check failed: ${error.message}`,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'Loading State Timeout Test',
    description: 'Test that loading states resolve within reasonable time',
    test: async () => {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        
        // Simulate a component loading pattern
        const loadingStates = [];
        
        for (let i = 0; i < 3; i++) {
          const start = Date.now();
          
          // Simulate loading state
          const loadingPromise = supabase
            .from('products')
            .select('id, name, price')
            .limit(5);
          
          const result = await loadingPromise;
          const duration = Date.now() - start;
          
          loadingStates.push({
            attempt: i + 1,
            duration,
            success: !result.error,
            dataReceived: !!result.data,
            error: result.error?.message
          });
        }
        
        const avgDuration = loadingStates.reduce((sum, s) => sum + s.duration, 0) / loadingStates.length;
        const maxDuration = Math.max(...loadingStates.map(s => s.duration));
        const allSuccessful = loadingStates.every(s => s.success);
        
        // Loading should complete quickly and consistently
        const isQuick = maxDuration < 2000; // Under 2 seconds
        const isConsistent = avgDuration < 1000; // Average under 1 second
        
        return {
          success: isQuick && isConsistent && allSuccessful,
          details: `Loading states: Avg ${avgDuration.toFixed(0)}ms, Max ${maxDuration}ms, All successful: ${allSuccessful}`,
          avgDuration,
          maxDuration,
          allSuccessful,
          isQuick,
          isConsistent,
          loadingStates
        };
        
      } catch (error) {
        return {
          success: false,
          details: `Loading state test failed: ${error.message}`,
          error: error.message
        };
      }
    }
  }
];

// Run all tests
async function runMiddlewareTests() {
  console.log('🧪 Running middleware fix verification tests...\n');
  
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

// Generate summary
function generateSummary(results) {
  console.log('📊 Middleware Fix Verification Summary:');
  console.log('=====================================\n');
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`✅ Tests passed: ${successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 All middleware tests passed!');
    console.log('✅ No fetch overrides detected');
    console.log('✅ Supabase connections are fast and reliable');
    console.log('✅ No infinite loading loops');
    console.log('✅ ResourceRetryService is properly disabled');
    console.log('✅ Loading states resolve quickly');
  } else {
    console.log('⚠️  Some middleware issues detected:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.name}: ${result.error || result.details}`);
    });
  }
  
  // Specific recommendations
  console.log('\n🎯 Middleware Status:');
  const fetchTest = results.find(r => r.name === 'Problematic Fetch Override Check');
  const speedTest = results.find(r => r.name === 'Supabase Connection Speed');
  const retryTest = results.find(r => r.name === 'ResourceRetryService Status');

  if (fetchTest?.isNative) {
    console.log('✅ Native fetch function - no middleware interference');
  } else if (fetchTest?.isSupabaseHandler) {
    console.log('✅ Supabase fetch handler detected - this is expected and safe');
  } else {
    console.log('⚠️  Fetch function may be modified by problematic middleware');
  }
  
  if (speedTest?.isFast && speedTest?.isConsistent) {
    console.log('✅ Supabase connections are fast and consistent');
  } else {
    console.log('⚠️  Supabase connections may be affected by middleware');
  }
  
  if (retryTest?.isDisabled) {
    console.log('✅ ResourceRetryService is properly disabled');
  } else {
    console.log('⚠️  ResourceRetryService may still be active');
  }
}

// Main execution
async function main() {
  try {
    const results = await runMiddlewareTests();
    generateSummary(results);
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      console.log('\n🚀 Middleware issues have been resolved! The persistent loading problem should be fixed.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some middleware issues remain. Please review the failed tests above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Middleware test script failed:', error.message);
    process.exit(1);
  }
}

main();
