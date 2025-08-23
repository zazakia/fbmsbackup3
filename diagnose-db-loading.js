#!/usr/bin/env node

console.log('🔍 Database Loading Diagnostics\n');

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

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

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

console.log('Environment Configuration:');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Missing'}\n`);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test operations that might be causing slow loading
const tests = [
  {
    name: 'Basic Health Check',
    test: async () => {
      const start = Date.now();
      const { error } = await supabase.from('products').select('count').limit(1);
      const duration = Date.now() - start;
      return { success: !error, duration, error: error?.message };
    }
  },
  {
    name: 'Products Table Query',
    test: async () => {
      const start = Date.now();
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock')
        .limit(10);
      const duration = Date.now() - start;
      return { success: !error, duration, error: error?.message, count: data?.length || 0 };
    }
  },
  {
    name: 'Categories Query',
    test: async () => {
      const start = Date.now();
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .limit(10);
      const duration = Date.now() - start;
      return { success: !error, duration, error: error?.message, count: data?.length || 0 };
    }
  },
  {
    name: 'Customers Query',
    test: async () => {
      const start = Date.now();
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .limit(10);
      const duration = Date.now() - start;
      return { success: !error, duration, error: error?.message, count: data?.length || 0 };
    }
  },
  {
    name: 'Sales Query',
    test: async () => {
      const start = Date.now();
      const { data, error } = await supabase
        .from('sales')
        .select('id, total, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      const duration = Date.now() - start;
      return { success: !error, duration, error: error?.message, count: data?.length || 0 };
    }
  },
  {
    name: 'Auth Session Check',
    test: async () => {
      const start = Date.now();
      const { data, error } = await supabase.auth.getSession();
      const duration = Date.now() - start;
      return { success: !error, duration, error: error?.message, hasSession: !!data?.session };
    }
  },
  {
    name: 'Concurrent Queries Test',
    test: async () => {
      const start = Date.now();
      const promises = [
        supabase.from('products').select('count').limit(1),
        supabase.from('categories').select('count').limit(1),
        supabase.from('customers').select('count').limit(1)
      ];
      
      try {
        const results = await Promise.all(promises);
        const duration = Date.now() - start;
        const hasErrors = results.some(r => r.error);
        return { success: !hasErrors, duration, results: results.length };
      } catch (error) {
        const duration = Date.now() - start;
        return { success: false, duration, error: error.message };
      }
    }
  }
];

async function runDiagnostics() {
  console.log('🧪 Running Database Loading Tests...\n');
  
  for (const test of tests) {
    console.log(`⏱️  ${test.name}...`);
    
    try {
      const result = await test.test();
      
      if (result.success) {
        console.log(`✅ ${test.name}: ${result.duration}ms`);
        if (result.count !== undefined) console.log(`   Records: ${result.count}`);
        if (result.hasSession !== undefined) console.log(`   Has Session: ${result.hasSession}`);
        if (result.results !== undefined) console.log(`   Concurrent Results: ${result.results}`);
      } else {
        console.log(`❌ ${test.name}: ${result.duration}ms - ${result.error}`);
      }
    } catch (error) {
      console.log(`💥 ${test.name}: Failed - ${error.message}`);
    }
    
    console.log('');
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('🎯 Performance Analysis:');
  console.log('   - Times under 500ms: Good');
  console.log('   - Times 500ms-2s: Moderate');
  console.log('   - Times over 2s: Concerning');
  console.log('');
  
  console.log('💡 Recommendations:');
  console.log('   1. If all queries are slow, check network connectivity');
  console.log('   2. If auth is slow, consider auth caching');
  console.log('   3. If specific tables are slow, check database indexes');
  console.log('   4. If concurrent queries timeout, consider request batching');
}

runDiagnostics().catch(console.error);
