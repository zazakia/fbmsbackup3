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

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

// Supabase client configuration
if (ENV.DEV) {
  console.log('Environment:', ENV.MODE);
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

// Enhanced error handler for auth and HTTP errors
const handleSupabaseError = async (input: RequestInfo, init?: RequestInit) => {
  const res = await fetch(input as RequestInfo, init as RequestInit);
  
  if (!res.ok) {
    try {
      const body = await res.clone().json().catch(() => null);
      
      // Check for auth errors
      if (body && body.error) {
        const errorMessage = body.error.message || body.error;
        
        // Handle refresh token errors specifically
        if (errorMessage.includes('refresh_token_not_found') || 
            errorMessage.includes('Invalid Refresh Token') ||
            errorMessage.includes('Refresh Token Not Found')) {
          console.warn('🔄 Refresh token error detected, clearing invalid session...');
          
          // Clear invalid tokens from storage
          const authKeys = Object.keys(localStorage).filter(key => 
            key.includes('supabase.auth') || 
            key.startsWith('sb-') ||
            key.includes('refresh_token') ||
            key.includes('access_token')
          );
          
          authKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ Removed invalid token:', key);
          });
          
          // Clear session storage as well
          sessionStorage.clear();
          
          // Force a clean auth state
          if (typeof window !== 'undefined' && window.location) {
            console.log('🔄 Redirecting to clear session...');
            // Small delay to prevent infinite loops
            setTimeout(() => {
              window.location.href = window.location.origin + '?auth_error=token_expired';
            }, 100);
          }
        }
      }
      
      if (ENV.DEV) {
        console.error('Supabase HTTP error', {
          status: res.status,
          statusText: res.statusText,
          url: typeof input === 'string' ? input : (input as Request).url,
          body
        });
      }
    } catch (err) {
      // Ignore JSON parsing errors
    }
  }
  
  return res;
};

// Create the main Supabase client
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Add custom token refresh error handling
      debug: ENV.DEV
    },
    global: {
      fetch: handleSupabaseError
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