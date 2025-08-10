// Test remote Supabase connection
import { createClient } from '@supabase/supabase-js';

const REMOTE_CONFIG = {
  url: 'https://coqjcziquviehgyifhek.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcWpjemlxdXZpZWhneWlmaGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDUzOTMsImV4cCI6MjA2NDk4MTM5M30.NSdUfHdeXLwBCcY9UO4s3LoSEBm4AuU0Jh5BLIcoQ5E'
};

async function testConnection() {
  console.log('🧪 Testing remote Supabase connection...');
  console.log('URL:', REMOTE_CONFIG.url);
  
  const supabase = createClient(REMOTE_CONFIG.url, REMOTE_CONFIG.anonKey);
  
  try {
    // Test 1: Basic table access
    console.log('📋 Testing table access...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Table access failed:', usersError.message);
    } else {
      console.log('✅ Table access successful:', users);
    }
    
    // Test 2: Auth service
    console.log('🔐 Testing auth service...');
    const { data: session } = await supabase.auth.getSession();
    console.log('✅ Auth service accessible, session:', session ? 'Active' : 'None');
    
    // Test 3: Login attempt
    console.log('🔑 Testing login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@fbms.com',
      password: 'Qweasd145698@'
    });
    
    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
    } else {
      console.log('✅ Login successful:', loginData.user?.email);
      
      // Test authenticated request
      const { data: authUsers, error: authError } = await supabase
        .from('users')
        .select('*')
        .limit(5);
      
      if (authError) {
        console.error('❌ Authenticated request failed:', authError.message);
      } else {
        console.log('✅ Authenticated request successful, found', authUsers.length, 'users');
      }
    }
    
  } catch (error) {
    console.error('💥 Connection test failed:', error.message);
  }
}

testConnection();