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

// Export the same client for auth operations to avoid multiple instances
export const supabaseAnon = supabase;

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
          console.log('Test user login failed:', error.message);
          console.log('You can use the login form to sign in or create a new account');
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