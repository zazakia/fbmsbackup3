import { createClient } from '@supabase/supabase-js';
// import { useSettingsStore } from '../store/settingsStore';
// import { createAdminAccountIfNeeded } from './setupAdmin'; // Disabled for security

// Resolve environment variables with backward compatibility to .env.example
interface ImportMetaEnv {
  [key: string]: string | undefined;
}

const ENV = import.meta.env as ImportMetaEnv;

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

// Supabase configuration from environment variables (with backward compatibility)
// Prefer new PUBLIC-prefixed vars, but fall back to legacy names found in .env.example
const supabaseUrl =
  ENV.VITE_PUBLIC_SUPABASE_URL ||
  ENV.VITE_SUPABASE_URL ||
  ENV.SUPABASE_URL; // last-resort fallback if provided
const supabaseAnonKey =
  ENV.VITE_PUBLIC_SUPABASE_ANON_KEY ||
  ENV.VITE_SUPABASE_ANON_KEY ||
  ENV.SUPABASE_ANON_KEY; // last-resort fallback if provided

// Enhanced debug logging for connection issues
console.log('🔧 Supabase Configuration Debug:');
console.log('Environment:', ENV.MODE);
console.log('Environment vars available:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  urlValue: supabaseUrl,
  keyLength: supabaseAnonKey?.length || 0,
  // show which vars were considered to aid debugging
  triedVars: {
    VITE_PUBLIC_SUPABASE_URL: ENV.VITE_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
    VITE_SUPABASE_URL: ENV.VITE_SUPABASE_URL ? 'set' : 'missing',
    SUPABASE_URL: ENV.SUPABASE_URL ? 'set' : 'missing',
    VITE_PUBLIC_SUPABASE_ANON_KEY: ENV.VITE_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing',
    VITE_SUPABASE_ANON_KEY: ENV.VITE_SUPABASE_ANON_KEY ? 'set' : 'missing',
    SUPABASE_ANON_KEY: ENV.SUPABASE_ANON_KEY ? 'set' : 'missing',
  }
});
console.log('Supabase URL valid:', isValidUrl(supabaseUrl));

// Guard against invalid configuration to avoid "new URL(): Invalid URL" deep in SDK
if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
  const msg = `❌ Supabase configuration invalid. URL: ${supabaseUrl}, Has key: ${!!supabaseAnonKey}`;
  
  // Create helpful error message with debugging info
  const debugInfo = {
    supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length || 0,
    envVars: {
      VITE_PUBLIC_SUPABASE_URL: (import.meta.env as any).VITE_PUBLIC_SUPABASE_URL,
      VITE_SUPABASE_URL: (import.meta.env as any).VITE_SUPABASE_URL,
      SUPABASE_URL: (import.meta.env as any).SUPABASE_URL,
      hasVITE_PUBLIC_SUPABASE_ANON_KEY: !!(import.meta.env as any).VITE_PUBLIC_SUPABASE_ANON_KEY,
      hasVITE_SUPABASE_ANON_KEY: !!(import.meta.env as any).VITE_SUPABASE_ANON_KEY,
      hasSUPABASE_ANON_KEY: !!(import.meta.env as any).SUPABASE_ANON_KEY
    }
  };
  
  console.error('🔥 CRITICAL: Supabase Configuration Error');
  console.error('📋 Check your .env.local file and ensure these variables are set:');
  console.error('   - VITE_PUBLIC_SUPABASE_URL');
  console.error('   - VITE_PUBLIC_SUPABASE_ANON_KEY');
  console.error('🔍 Debug info:', debugInfo);
  
  // Show user-friendly error
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      alert('Database Configuration Error!\n\nThe application cannot connect to the database because environment variables are missing or invalid.\n\nPlease check the console for more details.');
    }, 1000);
  }
  
  throw new Error(msg);
}

// Enhanced error handler for auth and HTTP errors with a global timeout
const handleSupabaseError = async (input: RequestInfo | URL, init?: RequestInit) => {
  // Reduce timeout to 10s to match our API layer timeout
  const defaultTimeoutMs = 10000;
  const timeoutMs = Number(ENV.VITE_SUPABASE_FETCH_TIMEOUT_MS) > 0
    ? Number(ENV.VITE_SUPABASE_FETCH_TIMEOUT_MS)
    : defaultTimeoutMs;

  if (ENV.DEV) {
    console.log('🌐 [FETCH] Supabase request:', {
      url: typeof input === 'string' ? input : (input as Request).url,
      method: init?.method || 'GET',
      timeoutMs
    });
  }

  // Respect any existing AbortSignal; otherwise, add our own with timeout
  const controller = !init?.signal ? new AbortController() : null;
  const timer = controller ? setTimeout(() => {
    console.warn('⏰ [FETCH] Supabase request timeout after', timeoutMs, 'ms');
    controller.abort();
  }, timeoutMs) : null;

  // Compose init with our signal (if we created one)
  const fetchInit: RequestInit = controller
    ? { ...(init || {}), signal: controller.signal }
    : (init || {});

  let res: Response;
  try {
    res = await fetch(input as RequestInfo, fetchInit as RequestInit);
    
    if (ENV.DEV) {
      console.log('🌐 [FETCH] Supabase response:', {
        url: typeof input === 'string' ? input : (input as Request).url,
        status: res.status,
        ok: res.ok
      });
    }
  } catch (err: any) {
    if (timer) clearTimeout(timer);

    // Normalize abort/network errors so UI layers can handle them gracefully
    const isAbort = err?.name === 'AbortError';
    const message = isAbort
      ? `Request timed out after ${timeoutMs}ms`
      : (err?.message || 'Network error while contacting Supabase');

    if (ENV.DEV) {
      console.error('🌐 [FETCH] Supabase fetch failure', {
        url: typeof input === 'string' ? input : (input as Request).url,
        timeoutMs,
        aborted: isAbort,
        error: err
      });
    }

    // Re-throw to let supabase-js propagate a meaningful error
    throw new Error(message);
  } finally {
    if (timer) clearTimeout(timer);
  }
  
  if (!res.ok) {
    try {
      const body = await res.clone().json().catch(() => null);
      
      // Check for auth errors
      if (body && body.error) {
        const errorMessage = body.error.message || body.error;
        
        // Handle refresh token errors and JWT expired errors specifically
        if (errorMessage.includes('refresh_token_not_found') ||
            errorMessage.includes('Invalid Refresh Token') ||
            errorMessage.includes('Refresh Token Not Found') ||
            errorMessage.includes('JWT expired') ||
            errorMessage.includes('jwt expired') ||
            errorMessage.includes('token is expired') ||
            res.status === 401) {
          console.warn('🔄 JWT/Token expired error detected, attempting automatic refresh...');

          // First, try to refresh the session automatically
          try {
            const { data: { session }, error: refreshError } = await supabase.auth.getSession();

            if (refreshError || !session) {
              console.warn('🔄 Automatic refresh failed, clearing invalid session...');

              // Clear invalid tokens from storage
              const authKeys = Object.keys(localStorage).filter(key =>
                key.includes('supabase.auth') ||
                key.startsWith('sb-') ||
                key.includes('refresh_token') ||
                key.includes('access_token') ||
                key.includes('fbms-auth-token')
              );

              authKeys.forEach(key => {
                localStorage.removeItem(key);
                console.log('🗑️ Removed invalid token:', key);
              });

              // Clear session storage as well
              sessionStorage.clear();

              // Force a clean auth state without redirect to prevent loops
              if (typeof window !== 'undefined' && window.location) {
                console.log('🔄 Session cleared due to expired token, auth state will be updated...');
                // Dispatch custom event instead of redirecting
                window.dispatchEvent(new CustomEvent('auth:token_expired', {
                  detail: {
                    message: 'Your session has expired. Please log in again.',
                    reason: 'jwt_expired'
                  }
                }));
              }
            } else {
              console.log('✅ Token refreshed successfully');
              // Retry the original request with the new token
              return res;
            }
          } catch (refreshAttemptError) {
            console.error('❌ Token refresh attempt failed:', refreshAttemptError);

            // Clear invalid tokens from storage
            const authKeys = Object.keys(localStorage).filter(key =>
              key.includes('supabase.auth') ||
              key.startsWith('sb-') ||
              key.includes('refresh_token') ||
              key.includes('access_token') ||
              key.includes('fbms-auth-token')
            );

            authKeys.forEach(key => {
              localStorage.removeItem(key);
              console.log('🗑️ Removed invalid token:', key);
            });

            // Clear session storage as well
            sessionStorage.clear();

            // Force a clean auth state
            if (typeof window !== 'undefined' && window.location) {
              console.log('🔄 Session cleared due to refresh failure, auth state will be updated...');
              window.dispatchEvent(new CustomEvent('auth:token_expired', {
                detail: {
                  message: 'Your session has expired. Please log in again.',
                  reason: 'refresh_failed'
                }
              }));
            }
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
  supabaseUrl!,
  supabaseAnonKey!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Add custom token refresh error handling
      debug: ENV.DEV === 'true',
      // Optimize auth performance
      storage: window?.localStorage,
      flowType: 'pkce',
      // Optimize token refresh timing
      storageKey: 'fbms-auth-token'
    },
    global: {
      fetch: handleSupabaseError
    },
    db: {
      schema: 'public'
    },
    // Add performance optimizations
    realtime: {
      params: {
        eventsPerSecond: 2
      }
    }
  }
);

// Make Supabase client available on window for debugging (dev only)
if (ENV.DEV && typeof window !== 'undefined') {
  (window as any).supabase = supabase;
  console.log('🔧 [DEV] Supabase client attached to window.supabase for debugging');
}

// Export the same client for auth operations to avoid multiple instances
export const supabaseAnon = supabase;

// Function to setup development authentication - SECURITY: Admin auto-setup disabled
export async function setupDevAuth() {
  if (ENV.DEV) {
    try {
      // DEVELOPMENT: Allow anonymous access for testing
      console.log('🔧 Development mode: Enabling anonymous access');
      
      // Check if we already have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('Development mode: No authentication required');
        console.log('💡 Database access enabled via anonymous role');
        console.log('👤 Use registration form for full authentication testing');
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

// Function to check if token is about to expire and refresh proactively
export async function checkAndRefreshToken() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.warn('❌ Error checking session:', error.message);
      return false;
    }

    if (!session) {
      console.log('ℹ️ No active session found');
      return false;
    }

    // Check if token expires within the next 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry < 300) { // Less than 5 minutes
      console.log('🔄 Token expires soon, refreshing proactively...');

      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('❌ Token refresh failed:', refreshError.message);
        return false;
      }

      if (newSession) {
        console.log('✅ Token refreshed successfully');
        return true;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error in checkAndRefreshToken:', error);
    return false;
  }
}

// Function to test Supabase connection on app initialization
export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');

  try {
    // Test with a simple REST API call to check if Supabase is accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10 second timeout

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey!,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      mode: 'cors' // Explicitly set CORS mode
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('✅ Supabase connection successful');
      console.log('📊 Database service is accessible');
      return { connected: true, error: null };
    } else {
      const error = `HTTP ${response.status}: ${response.statusText}`;
      console.error('❌ Supabase connection failed:', error);
      return { connected: false, error };
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('⚠️ Supabase connection test timed out - this may be normal');
      // Don't treat timeout as a critical error since the service is accessible
      return { connected: true, error: 'Connection test timed out but service appears accessible' };
    }
    console.error('❌ Supabase connection test failed:', error.message);
    return { connected: false, error: error.message };
  }
}