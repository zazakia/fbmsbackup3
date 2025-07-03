import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;
// Note: Service role key is not exposed to browser for security reasons
// We'll use the anon key and rely on RLS policies

console.log('Supabase URL:', supabaseUrl);
console.log('Environment:', import.meta.env.MODE);

// Create the main Supabase client
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Export anon client for auth operations
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Function to setup development authentication
export async function setupDevAuth() {
  if (import.meta.env.DEV) {
    try {
      // Check if we already have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('Setting up development authentication...');
        
        // Try to sign in with a test user
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'admin@example.com',
          password: 'admin123'
        });
        
        if (error) {
          console.log('Test user login failed, trying to create one...');
          
          // Try to create a test user
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'admin@example.com',
            password: 'admin123',
            options: {
              data: {
                first_name: 'Admin',
                last_name: 'User'
              }
            }
          });
          
          if (signUpError) {
            console.log('Failed to create test user:', signUpError.message);
            console.log('Please create a user manually in Supabase or use the login form');
          } else {
            console.log('Test user created successfully');
          }
        } else {
          console.log('Development authentication successful');
        }
      } else {
        console.log('Already authenticated with Supabase');
      }
    } catch (error) {
      console.log('Development auth setup failed:', error);
    }
  }
}

// Function to check if user is authenticated with Supabase
export async function isSupabaseAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Function to get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
} 