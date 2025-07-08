import { createClient } from '@supabase/supabase-js';
// import { createAdminAccountIfNeeded } from './setupAdmin'; // Disabled for security

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;
// Note: Service role key is not exposed to browser for security reasons
// We'll use the anon key and rely on RLS policies

// Supabase client configuration
if (import.meta.env.DEV) {
  console.log('Environment:', import.meta.env.MODE);
}

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

// Function to setup development authentication - SECURITY: Admin auto-setup disabled
export async function setupDevAuth() {
  if (import.meta.env.DEV) {
    try {
      // SECURITY: No longer auto-creates admin accounts
      console.log('🔒 Secure authentication mode enabled');
      
      // Check if we already have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('Development mode: Please register and login through the application');
        console.log('💡 Use the registration form to create new accounts');
        console.log('👤 Admin roles must be assigned through the database or admin panel');
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