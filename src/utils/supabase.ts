import { createClient } from '@supabase/supabase-js';
import { useSettingsStore } from '../store/settingsStore';
// import { createAdminAccountIfNeeded } from './setupAdmin'; // Disabled for security

// Resolve environment variables with backward compatibility to .env.example
const ENV = import.meta.env as any;

// Helper to validate URL strings
function isValidUrl(value: string | undefined | null): boolean {
  if (!value || typeof value !== 'string') return false;
  try {
    // Must be absolute URL with protocol
     
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// Supabase configuration
const config = {
  url: 'https://coqjcziquviehgyifhek.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcWpjemlxdXZpZWhneWlmaGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDUzOTMsImV4cCI6MjA2NDk4MTM5M30.NSdUfHdeXLwBCcY9UO4s3LoSEBm4AuU0Jh5BLIcoQ5E'
};
const supabaseUrl = config.url;
const supabaseAnonKey = config.anonKey;

// Supabase client configuration
if (ENV.DEV) {
  console.log('Environment:', ENV.MODE);
  console.log('Database mode: remote');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase URL valid:', isValidUrl(supabaseUrl));
}

// Guard against invalid configuration to avoid "new URL(): Invalid URL" deep in SDK
if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
  const msg = `Supabase configuration invalid. URL: ${supabaseUrl}, Has key: ${!!supabaseAnonKey}`;
  // Log a clear error; throw to stop app early with actionable message
  console.error(msg, { supabaseUrl, hasAnonKey: !!supabaseAnonKey });
  throw new Error(msg);
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
    },
    global: {
      // Surface detailed errors from PostgREST
      fetch: async (input, init) => {
        const res = await fetch(input as RequestInfo, init as RequestInit);
        if (!res.ok && ENV.DEV) {
          try {
            const body = await res.clone().json().catch(() => null);
            console.error('Supabase HTTP error', {
              status: res.status,
              statusText: res.statusText,
              url: typeof input === 'string' ? input : (input as Request).url,
              body
            });
          } catch {
            // ignore
          }
        }
        return res;
      }
    },
    db: {
      schema: 'public'
    }
  }
);

// Export the same client for auth operations to avoid multiple instances
export const supabaseAnon = supabase;

// Function to setup development authentication - SECURITY: Admin auto-setup disabled
export async function setupDevAuth() {
  if (ENV.DEV) {
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