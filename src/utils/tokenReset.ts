import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

/**
 * Utility functions for resetting various types of tokens in the FBMS system
 */

export interface TokenResetResult {
  success: boolean;
  message: string;
  resetItems: string[];
}

/**
 * Reset all authentication-related tokens and state
 */
export function resetAllAuthTokens(): TokenResetResult {
  const resetItems: string[] = [];

  try {
    // Clear authentication store state
    const authStore = useSupabaseAuthStore.getState();
    
    // Clear password reset state
    authStore.clearPasswordResetState();
    resetItems.push('Password reset tokens');
    
    // Clear any errors
    authStore.clearError();
    resetItems.push('Authentication errors');
    
    // Clear local storage auth items
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('fbms')
    );
    
    authKeys.forEach(key => {
      if (key !== 'fbms-supabase-auth') { // Keep main auth state
        localStorage.removeItem(key);
        resetItems.push(`LocalStorage: ${key}`);
      }
    });
    
    // Clear session storage
    sessionStorage.clear();
    resetItems.push('Session storage');
    
    return {
      success: true,
      message: 'All authentication tokens reset successfully',
      resetItems
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Failed to reset tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resetItems
    };
  }
}

/**
 * Reset only password-related tokens
 */
export function resetPasswordTokens(): TokenResetResult {
  const resetItems: string[] = [];

  try {
    // Clear password reset state
    const authStore = useSupabaseAuthStore.getState();
    authStore.clearPasswordResetState();
    resetItems.push('Password reset state');
    
    // Clear any password-related localStorage items
    const passwordKeys = Object.keys(localStorage).filter(key => 
      key.includes('password') || key.includes('reset')
    );
    
    passwordKeys.forEach(key => {
      localStorage.removeItem(key);
      resetItems.push(`Password token: ${key}`);
    });
    
    return {
      success: true,
      message: 'Password tokens reset successfully',
      resetItems
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Failed to reset password tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resetItems
    };
  }
}

/**
 * Reset session tokens (force re-authentication)
 */
export async function resetSessionTokens(): Promise<TokenResetResult> {
  const resetItems: string[] = [];

  try {
    const authStore = useSupabaseAuthStore.getState();
    
    // Sign out from Supabase (clears session tokens)
    await authStore.logout();
    resetItems.push('Supabase session');
    
    // Clear any remaining session data
    sessionStorage.clear();
    resetItems.push('Browser session storage');
    
    // Clear auth-related localStorage (but keep user preferences)
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase.auth') || 
      key.includes('access_token') || 
      key.includes('refresh_token')
    );
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      resetItems.push(`Session token: ${key}`);
    });
    
    return {
      success: true,
      message: 'Session tokens reset successfully. Please log in again.',
      resetItems
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Failed to reset session tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resetItems
    };
  }
}

/**
 * Development utility: Reset everything and clear all app state
 */
export function devResetAllTokens(): TokenResetResult {
  const resetItems: string[] = [];

  try {
    // Clear all localStorage
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      localStorage.removeItem(key);
      resetItems.push(`LocalStorage: ${key}`);
    });
    
    // Clear all sessionStorage
    sessionStorage.clear();
    resetItems.push('All session storage');
    
    // Clear any cookies (if used)
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    resetItems.push('Browser cookies');
    
    // Force page reload to reset all state
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
    return {
      success: true,
      message: 'Complete application reset initiated. Page will reload...',
      resetItems
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Failed to reset application: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resetItems
    };
  }
}

/**
 * Check what tokens/state currently exist
 */
export function checkTokenStatus(): {
  hasPasswordReset: boolean;
  hasAuthSession: boolean;
  hasStoredAuth: boolean;
  localStorageKeys: string[];
  sessionStorageKeys: string[];
} {
  const authStore = useSupabaseAuthStore.getState();
  
  return {
    hasPasswordReset: authStore.passwordResetSent,
    hasAuthSession: authStore.isAuthenticated,
    hasStoredAuth: !!localStorage.getItem('fbms-supabase-auth'),
    localStorageKeys: Object.keys(localStorage),
    sessionStorageKeys: Object.keys(sessionStorage)
  };
}