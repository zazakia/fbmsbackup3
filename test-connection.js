#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
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

console.log('🔧 Testing Supabase Connection...\n');

// Get environment variables
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

console.log('📋 Environment Variables:');
console.log(`URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`Key: ${supabaseAnonKey ? `✅ Set (${supabaseAnonKey.length} chars)` : '❌ Missing'}`);
console.log();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables. Please check your .env.local file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('🔗 Testing basic connection...');
    
    // Test 1: Basic connection
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError && sessionError.message !== 'JWT expired') {
      console.error('❌ Session check failed:', sessionError.message);
      return false;
    }
    console.log('✅ Session check passed');

    // Test 2: Database access
    console.log('🗄️  Testing database access...');
    const { data: products, error: dbError } = await supabase
      .from('products')
      .select('count')
      .limit(1);
      
    if (dbError) {
      console.error('❌ Database access failed:', dbError.message);
      console.error('   Code:', dbError.code);
      console.error('   Details:', dbError.details);
      console.error('   Hint:', dbError.hint);
      return false;
    }
    console.log('✅ Database access successful');

    // Test 3: Product creation
    console.log('📦 Testing product creation...');
    const testProduct = {
      name: `Test Product ${Date.now()}`,
      description: 'Connection test product',
      sku: `TEST-${Date.now()}`,
      category: 'Test Category',
      price: 10.00,
      cost: 5.00,
      stock: 1,
      min_stock: 1,
      unit: 'piece',
      is_active: true
    };

    const { data: newProduct, error: createError } = await supabase
      .from('products')
      .insert([testProduct])
      .select()
      .single();
      
    if (createError) {
      console.error('❌ Product creation failed:', createError.message);
      console.error('   Code:', createError.code);
      console.error('   Details:', createError.details);
      console.error('   Hint:', createError.hint);
      return false;
    }
    console.log('✅ Product creation successful:', newProduct.name);

    // Clean up test product
    await supabase
      .from('products')
      .delete()
      .eq('id', newProduct.id);
    console.log('🧹 Test product cleaned up');

    console.log('\n🎉 All tests passed! Supabase connection is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test script crashed:', error);
    process.exit(1);
  });
