/**
 * Comprehensive Logout Fix for Supabase Authentication Issues
 * 
 * This utility addresses common logout problems including:
 * - Session not being properly cleared
 * - Auth state listener conflicts
 * - Persistent storage not being cleaned
 * - Token refresh errors during logout
 * - Infinite logout loops
 */

import { supabase, supabaseAnon } from './supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

// Extend window interface for logout timeout tracking
declare global {
  interface Window {
    logoutTimeoutCount?: number;
  }
}

export interface LogoutResult {
  success: boolean;
  message: string;
  errors?: string[];
  actionsCompleted: string[];
}

// Prevent multiple simultaneous logout attempts
let isLogoutInProgress = false;
let lastLogoutAttempt = 0;

/**
 * Enhanced logout function that handles all edge cases
 */
export async function enhancedLogout(): Promise<LogoutResult> {
  // Debounce logout attempts - prevent multiple calls within 2 seconds
  const now = Date.now();
  if (isLogoutInProgress || (now - lastLogoutAttempt < 2000)) {
    console.log('🔄 Logout already in progress or too recent, skipping...');
    return {
      success: true,
      message: 'Logout already in progress or recently completed',
      actionsCompleted: ['Skipped duplicate logout attempt']
    };
  }
  
  isLogoutInProgress = true;
  lastLogoutAttempt = now;
  
  const actionsCompleted: string[] = [];
  const errors: string[] = [];
  
  try {
    console.log('🚪 Starting enhanced logout process...');
    
    // Step 1: Prevent new auth state change events during logout
    const authStateChangeListener: any = null;
    try {
      // Get the current auth store state before clearing
      const currentStore = useSupabaseAuthStore.getState();
      actionsCompleted.push('Retrieved current auth state');
      
      // Set loading state to prevent UI issues
      useSupabaseAuthStore.setState({ isLoading: true });
      actionsCompleted.push('Set loading state');
      
      // Step 2: Clear Supabase session with timeout
      console.log('🔄 Signing out from Supabase...');
      
      const logoutPromise = supabaseAnon.auth.signOut({
        scope: 'global' // Sign out from all devices
      });
      
      // Add timeout to prevent hanging logout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 10000)
      );
      
      try {
        const { error: signOutError } = await Promise.race([
          logoutPromise,
          timeoutPromise
        ]) as any;
        
        if (signOutError) {
          errors.push(`Supabase signOut error: ${signOutError.message}`);
          console.warn('⚠️ Supabase logout error:', signOutError.message);
        } else {
          actionsCompleted.push('Signed out from Supabase');
        }
      } catch (timeoutError) {
        errors.push('Logout request timed out');
        // Reduce warning frequency - only log every 3rd timeout to avoid spam
        if (!window.logoutTimeoutCount) window.logoutTimeoutCount = 0;
        window.logoutTimeoutCount++;
        
        if (window.logoutTimeoutCount % 3 === 1) {
          console.warn('⚠️ Logout timed out, proceeding with local cleanup (warning ' + window.logoutTimeoutCount + ')');
        }
      }
      
    } catch (authError) {
      errors.push(`Auth error during logout: ${authError}`);
      console.error('🚨 Auth error during logout:', authError);
    }
    
    // Step 3: Force clear all storage (even if Supabase logout failed)
    console.log('🗑️ Clearing all auth storage...');
    
    try {
      // Clear localStorage auth data
      const keysToRemove: string[] = [];
      
      // Get all localStorage keys first to avoid iteration issues
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('supabase') ||
          key.includes('auth') ||
          key.includes('fbms') ||
          key.includes('sb-') ||
          key.includes('token') ||
          key.startsWith('sb-')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (err) {
          console.warn(`Failed to remove localStorage key ${key}:`, err);
        }
      });
      
      actionsCompleted.push(`Cleared ${keysToRemove.length} localStorage items`);
      
      // Clear sessionStorage completely
      try {
        sessionStorage.clear();
        actionsCompleted.push('Cleared sessionStorage');
      } catch (err) {
        errors.push('Failed to clear sessionStorage');
      }
      
    } catch (storageError) {
      errors.push(`Storage cleanup error: ${storageError}`);
    }
    
    // Step 4: Force reset auth store state
    console.log('🔄 Resetting auth store state...');
    
    try {
      useSupabaseAuthStore.setState({
        user: null,
        userRole: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        hasLoggedOut: true,
        pendingEmailVerification: false,
        passwordResetSent: false
      });
      
      actionsCompleted.push('Reset auth store state');
    } catch (storeError) {
      errors.push(`Auth store reset error: ${storeError}`);
    }
    
    // Step 5: Clear any persisted zustand state
    try {
      // Force clear the persisted state
      if (typeof window !== 'undefined' && window.localStorage) {
        const persistKeys = [
          'fbms-supabase-auth',
          'zustand-auth',
          'auth-storage'
        ];
        
        persistKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (err) {
            console.warn(`Failed to remove persist key ${key}:`, err);
          }
        });
        
        actionsCompleted.push('Cleared persisted state');
      }
    } catch (persistError) {
      errors.push(`Persist cleanup error: ${persistError}`);
    }
    
    // Step 6: Force garbage collection if available
    try {
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
        actionsCompleted.push('Triggered garbage collection');
      }
    } catch (gcError) {
      // Ignore GC errors
    }
    
    // Step 7: Verify logout success
    console.log('🔍 Verifying logout...');
    
    let verificationSuccess = true;
    try {
      // Check if session is really cleared
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (session) {
        verificationSuccess = false;
        errors.push('Session still exists after logout');
      } else {
        actionsCompleted.push('Verified session cleared');
      }
      
      if (sessionError) {
        // Session error might be expected after logout
        console.log('Session check error (may be expected):', sessionError.message);
      }
      
    } catch (verifyError) {
      // Verification errors are often expected after logout
      actionsCompleted.push('Logout verification completed (with expected errors)');
    }
    
    // Step 8: Final cleanup - dispatch custom event for components to react
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout-complete', {
          detail: { 
            timestamp: new Date().toISOString(),
            actionsCompleted,
            hasErrors: errors.length > 0
          }
        }));
        
        actionsCompleted.push('Dispatched logout complete event');
      }
    } catch (eventError) {
      errors.push(`Event dispatch error: ${eventError}`);
    }
    
    const isSuccess = errors.length === 0 || (errors.length <= 2 && actionsCompleted.length >= 5);
    
    console.log(`${isSuccess ? '✅' : '⚠️'} Logout process completed:`, {
      success: isSuccess,
      actionsCompleted: actionsCompleted.length,
      errors: errors.length
    });
    
    return {
      success: isSuccess,
      message: isSuccess 
        ? 'Logout completed successfully' 
        : 'Logout completed with some issues (but user is logged out)',
      errors: errors.length > 0 ? errors : undefined,
      actionsCompleted
    };
    
  } catch (criticalError) {
    console.error('🚨 Critical logout error:', criticalError);
    
    // Emergency fallback - force local logout
    try {
      useSupabaseAuthStore.setState({
        user: null,
        userRole: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        hasLoggedOut: true,
        pendingEmailVerification: false,
        passwordResetSent: false
      });
      
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      actionsCompleted.push('Emergency local logout completed');
    } catch (emergencyError) {
      errors.push(`Emergency logout failed: ${emergencyError}`);
    }
    
    return {
      success: false,
      message: 'Logout failed but emergency cleanup completed',
      errors: [`Critical error: ${criticalError}`, ...errors],
      actionsCompleted
    };
  } finally {
    // Always reset the logout progress flag
    isLogoutInProgress = false;
  }
}

/**
 * Quick logout fix for immediate use
 */
export async function quickLogoutFix(): Promise<boolean> {
  try {
    const result = await enhancedLogout();
    return result.success;
  } catch (error) {
    console.error('Quick logout fix failed:', error);
    return false;
  }
}

/**
 * Check if user is stuck in a logout state
 */
export function isStuckInLogout(): boolean {
  try {
    const authStore = useSupabaseAuthStore.getState();
    return authStore.isLoading && authStore.hasLoggedOut;
  } catch (error) {
    return false;
  }
}

/**
 * Force reset auth state without going through logout process
 */
export function forceResetAuthState(): void {
  try {
    useSupabaseAuthStore.setState({
      user: null,
      userRole: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasLoggedOut: true,
      pendingEmailVerification: false,
      passwordResetSent: false
    });
    
    console.log('✅ Auth state force reset completed');
  } catch (error) {
    console.error('❌ Auth state force reset failed:', error);
  }
}

// Export utility for browser console access
if (typeof window !== 'undefined') {
  (window as any).fbmsLogoutFix = enhancedLogout;
  (window as any).fbmsQuickLogout = quickLogoutFix;
  (window as any).fbmsForceReset = forceResetAuthState;
  (window as any).fbmsCheckStuck = isStuckInLogout;
}
