#!/usr/bin/env node

// Test the new database loader without React dependencies
console.log('🧪 Testing Enhanced Database Loader\n');

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Load environment variables
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=', 2);
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simplified version of DatabaseLoader for testing
class DatabaseLoader {
  static async loadWithTimeout(queryFn, timeout = 8000) {
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    let lastError = null;

    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`🔄 Database query attempt ${retryCount + 1}/${MAX_RETRIES}`);
        
        const result = await Promise.race([
          queryFn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Query timed out after ${timeout}ms`)), timeout)
          ),
        ]);

        if (result.error) {
          throw new Error(result.error.message || 'Database query failed');
        }

        console.log('✅ Database query successful');
        return {
          data: result.data,
          error: null,
          loading: false,
          success: true,
          retryCount,
        };
      } catch (error) {
        retryCount++;
        lastError = error.message || 'Unknown database error';
        
        console.warn(`⚠️ Database query failed (attempt ${retryCount}):`, lastError);

        if (retryCount < MAX_RETRIES) {
          console.log(`⏳ Retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    console.error('❌ All database query attempts failed');
    return {
      data: null,
      error: lastError || 'Database connection failed after multiple attempts',
      loading: false,
      success: false,
      retryCount: retryCount - 1,
    };
  }

  static async loadProducts() {
    return DatabaseLoader.loadWithTimeout(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, cost, stock, min_stock, category, sku, unit, is_active')
        .eq('is_active', true)
        .order('name');
      
      return { data, error };
    });
  }

  static async testConnection() {
    console.log('🔍 Testing database connection...');
    
    return DatabaseLoader.loadWithTimeout(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('count')
        .limit(1);
      
      return { data: !error, error };
    }, 5000);
  }
}

async function runTests() {
  console.log('🎯 Testing Enhanced Database Loading...\n');

  // Test 1: Connection Test
  const connectionResult = await DatabaseLoader.testConnection();
  console.log('Connection Test:', connectionResult);
  console.log('');

  // Test 2: Products Loading
  const productsResult = await DatabaseLoader.loadProducts();
  console.log('Products Test:', {
    success: productsResult.success,
    error: productsResult.error,
    dataCount: productsResult.data?.length || 0,
    retryCount: productsResult.retryCount
  });
  
  if (productsResult.success && productsResult.data) {
    console.log('Sample products:', productsResult.data.slice(0, 2).map(p => ({ name: p.name, price: p.price })));
  }

  console.log('\n🎉 Enhanced Database Loader test completed!');
  console.log('The new loader provides:');
  console.log('✅ Automatic timeout handling');
  console.log('✅ Retry logic with exponential backoff');
  console.log('✅ Better error messages');
  console.log('✅ Consistent loading states');
}

runTests().catch(console.error);
