/**
 * Comprehensive Auth Error Handler
 * Handles various authentication errors including refresh token issues
 */

import { supabase } from './supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

export interface AuthErrorHandlerOptions {
  silent?: boolean;
  redirectOnError?: boolean;
  clearTokensOnError?: boolean;
}

export class AuthErrorHandler {
  private static instance: AuthErrorHandler;
  private errorCount = 0;
  private lastErrorTime = 0;
  private readonly ERROR_COOLDOWN = 5000; // 5 seconds

  private constructor() {}

  public static getInstance(): AuthErrorHandler {
    if (!AuthErrorHandler.instance) {
      AuthErrorHandler.instance = new AuthErrorHandler();
    }
    return AuthErrorHandler.instance;
  }

  /**
   * Handle various authentication errors
   */
  public handleAuthError(error: any, options: AuthErrorHandlerOptions = {}): boolean {
    const { silent = false, redirectOnError = true, clearTokensOnError = true } = options;
    
    // Prevent spam handling
    const now = Date.now();
    if (now - this.lastErrorTime < this.ERROR_COOLDOWN) {
      return false;
    }
    
    this.lastErrorTime = now;
    this.errorCount++;

    if (!silent) {
      console.group('🚨 Auth Error Handler');
      console.log('Error:', error);
      console.log('Options:', options);
      console.log('Error count:', this.errorCount);
    }

    const errorMessage = this.extractErrorMessage(error);
    const errorType = this.classifyError(errorMessage);

    if (!silent) {
      console.log('Error type:', errorType);
      console.log('Error message:', errorMessage);
    }

    let handled = false;

    switch (errorType) {
      case 'REFRESH_TOKEN_ERROR':
        handled = this.handleRefreshTokenError(clearTokensOnError, redirectOnError);
        break;
      
      case 'SESSION_EXPIRED':
        handled = this.handleSessionExpired(clearTokensOnError, redirectOnError);
        break;
      
      case 'INVALID_TOKEN':
        handled = this.handleInvalidToken(clearTokensOnError, redirectOnError);
        break;
      
      case 'NETWORK_ERROR':
        handled = this.handleNetworkError();
        break;
      
      case 'RATE_LIMIT':
        handled = this.handleRateLimit();
        break;
      
      default:
        handled = this.handleGenericError(error);
        break;
    }

    if (!silent) {
      console.log('Handled:', handled);
      console.groupEnd();
    }

    return handled;
  }

  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    if (error?.error) return error.error;
    return 'Unknown error';
  }

  private classifyError(message: string): string {
    const msg = message.toLowerCase();
    
    if (msg.includes('refresh_token_not_found') || 
        msg.includes('invalid refresh token') ||
        msg.includes('refresh token not found') ||
        msg.includes('refresh token expired')) {
      return 'REFRESH_TOKEN_ERROR';
    }
    
    if (msg.includes('session expired') ||
        msg.includes('jwt expired') ||
        msg.includes('token expired')) {
      return 'SESSION_EXPIRED';
    }
    
    if (msg.includes('invalid token') ||
        msg.includes('malformed token') ||
        msg.includes('invalid jwt')) {
      return 'INVALID_TOKEN';
    }
    
    if (msg.includes('network') ||
        msg.includes('fetch') ||
        msg.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    
    if (msg.includes('rate limit') ||
        msg.includes('too many requests')) {
      return 'RATE_LIMIT';
    }
    
    return 'UNKNOWN';
  }

  private handleRefreshTokenError(clearTokens: boolean, redirect: boolean): boolean {
    console.warn('🔄 Handling refresh token error...');
    
    if (clearTokens) {
      this.clearAuthTokens();
    }
    
    // Force logout from auth store
    const authStore = useSupabaseAuthStore.getState();
    authStore.logout().catch(console.error);
    
    if (redirect && typeof window !== 'undefined') {
      this.redirectToLogin('refresh_token_error');
    }
    
    return true;
  }

  private handleSessionExpired(clearTokens: boolean, redirect: boolean): boolean {
    console.warn('⏰ Handling session expired...');
    
    if (clearTokens) {
      this.clearAuthTokens();
    }
    
    const authStore = useSupabaseAuthStore.getState();
    authStore.logout().catch(console.error);
    
    if (redirect && typeof window !== 'undefined') {
      this.redirectToLogin('session_expired');
    }
    
    return true;
  }

  private handleInvalidToken(clearTokens: boolean, redirect: boolean): boolean {
    console.warn('🚫 Handling invalid token...');
    
    if (clearTokens) {
      this.clearAuthTokens();
    }
    
    const authStore = useSupabaseAuthStore.getState();
    authStore.logout().catch(console.error);
    
    if (redirect && typeof window !== 'undefined') {
      this.redirectToLogin('invalid_token');
    }
    
    return true;
  }

  private handleNetworkError(): boolean {
    console.warn('🌐 Network error detected, will retry automatically');
    // Don't clear tokens or redirect for network errors
    return false;
  }

  private handleRateLimit(): boolean {
    console.warn('🚦 Rate limit detected, backing off...');
    // Don't clear tokens or redirect for rate limits
    return false;
  }

  private handleGenericError(error: any): boolean {
    console.warn('❓ Unhandled auth error:', error);
    return false;
  }

  private clearAuthTokens(): void {
    console.log('🗑️ Clearing all auth tokens...');
    
    // Clear localStorage tokens
    const authKeys = Object.keys(localStorage).filter(key =>
      key.includes('supabase.auth') ||
      key.startsWith('sb-') ||
      key.includes('refresh_token') ||
      key.includes('access_token') ||
      key === 'fbms-supabase-auth'
    );

    authKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log('🗑️ Removed:', key);
    });

    // Clear session storage
    sessionStorage.clear();
    
    console.log('✅ Auth tokens cleared');
  }

  private redirectToLogin(reason: string): void {
    console.log(`🔄 Redirecting to login (reason: ${reason})...`);
    
    // Small delay to prevent infinite loops and allow cleanup
    setTimeout(() => {
      const params = new URLSearchParams();
      params.set('auth_error', reason);
      params.set('timestamp', Date.now().toString());
      
      const newUrl = `${window.location.origin}/?${params.toString()}`;
      window.location.href = newUrl;
    }, 500);
  }

  /**
   * Check and handle URL parameters for auth errors
   */
  public handleUrlAuthErrors(): void {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    
    if (authError) {
      console.log(`🔍 Found auth error in URL: ${authError}`);
      
      // Clear the URL parameters
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Show user-friendly message based on error type
      this.showUserMessage(authError);
    }
  }

  private showUserMessage(errorType: string): void {
    let message = '';
    
    switch (errorType) {
      case 'refresh_token_error':
      case 'session_expired':
      case 'invalid_token':
        message = 'Your session has expired. Please log in again.';
        break;
      case 'token_expired':
        message = 'Your login session has expired. Please sign in again.';
        break;
      default:
        message = 'Authentication error. Please log in again.';
        break;
    }
    
    // Show message to user (could integrate with toast system)
    console.log(`📢 User message: ${message}`);
    
    // If you have a toast system, uncomment:
    // import { useToastStore } from '../store/toastStore';
    // const { addToast } = useToastStore.getState();
    // addToast({
    //   type: 'warning',
    //   title: 'Session Expired',
    //   message
    // });
  }

  /**
   * Reset error count (useful for testing)
   */
  public resetErrorCount(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }

  /**
   * Get current error statistics
   */
  public getErrorStats(): { errorCount: number; lastErrorTime: number } {
    return {
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime
    };
  }
}

// Export singleton instance
export const authErrorHandler = AuthErrorHandler.getInstance();

// Auto-handle URL auth errors on module load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    authErrorHandler.handleUrlAuthErrors();
  }, 100);
}

// Export utility functions
export const handleAuthError = (error: any, options?: AuthErrorHandlerOptions) => 
  authErrorHandler.handleAuthError(error, options);

export const clearAuthTokens = () => authErrorHandler.clearAuthTokens?.();

export const resetAuthErrorCount = () => authErrorHandler.resetErrorCount();
