import { resetAllAuthTokens, resetPasswordTokens, resetSessionTokens, devResetAllTokens, checkTokenStatus } from './tokenReset';

/**
 * Development console commands for debugging and token management
 * Access via browser console: window.fbmsDevCommands
 */

export const devCommands = {
  /**
   * Check current token status
   */
  checkTokens() {
    const status = checkTokenStatus();
    console.group('🔍 FBMS Token Status');
    console.log('Password Reset Token:', status.hasPasswordReset ? '✅ Active' : '❌ None');
    console.log('Auth Session:', status.hasAuthSession ? '✅ Active' : '❌ None');
    console.log('Stored Auth:', status.hasStoredAuth ? '✅ Yes' : '❌ No');
    console.log('LocalStorage Keys:', status.localStorageKeys);
    console.log('SessionStorage Keys:', status.sessionStorageKeys);
    console.groupEnd();
    return status;
  },

  /**
   * Reset password tokens only
   */
  resetPasswordTokens() {
    console.log('🔄 Resetting password tokens...');
    const result = resetPasswordTokens();
    console.log(result.success ? '✅' : '❌', result.message);
    if (result.resetItems) {
      console.log('Reset items:', result.resetItems);
    }
    return result;
  },

  /**
   * Reset all auth tokens (except current session)
   */
  resetAuthTokens() {
    console.log('🔄 Resetting all auth tokens...');
    const result = resetAllAuthTokens();
    console.log(result.success ? '✅' : '❌', result.message);
    if (result.resetItems) {
      console.log('Reset items:', result.resetItems);
    }
    return result;
  },

  /**
   * Reset session (will log out)
   */
  async resetSession() {
    if (confirm('This will log you out. Continue?')) {
      console.log('🔄 Resetting session tokens...');
      const result = await resetSessionTokens();
      console.log(result.success ? '✅' : '❌', result.message);
      return result;
    }
    console.log('❌ Session reset cancelled');
  },

  /**
   * Complete application reset (development only)
   */
  devReset() {
    if (!import.meta.env.DEV) {
      console.error('❌ Development commands only available in development mode');
      return;
    }
    
    if (confirm('⚠️ This will completely reset the application and reload the page. Continue?')) {
      console.log('🔄 Performing complete application reset...');
      const result = devResetAllTokens();
      console.log(result.success ? '✅' : '❌', result.message);
      return result;
    }
    console.log('❌ Complete reset cancelled');
  },

  /**
   * Show help for available commands
   */
  help() {
    console.group('🛠️ FBMS Development Commands');
    console.log('%c🔍 checkTokens()', 'color: #3b82f6', '- Check current token status');
    console.log('%c🔄 resetPasswordTokens()', 'color: #f59e0b', '- Reset password tokens only');
    console.log('%c🔄 resetAuthTokens()', 'color: #f97316', '- Reset all auth tokens (keep session)');
    console.log('%c🔄 resetSession()', 'color: #ef4444', '- Reset session tokens (will log out)');
    if (import.meta.env.DEV) {
      console.log('%c💥 devReset()', 'color: #8b5cf6', '- Complete application reset (dev only)');
    }
    console.log('%c❓ help()', 'color: #059669', '- Show this help message');
    console.groupEnd();
    
    console.log('%cUsage:', 'font-weight: bold; color: #1f2937');
    console.log('window.fbmsDevCommands.checkTokens()');
    console.log('window.fbmsDevCommands.resetPasswordTokens()');
    
    return 'Commands listed above ⬆️';
  },

  /**
   * Quick shortcuts
   */
  shortcuts: {
    ct: () => devCommands.checkTokens(),
    rpt: () => devCommands.resetPasswordTokens(), 
    rat: () => devCommands.resetAuthTokens(),
    rs: () => devCommands.resetSession(),
    dr: () => devCommands.devReset(),
    h: () => devCommands.help()
  }
};

// Expose to window object in development
if (import.meta.env.DEV) {
  (window as any).fbmsDevCommands = devCommands;
  (window as any).fbmsDev = devCommands.shortcuts; // Short aliases
  
  // Welcome message
  console.log(
    '%c🚀 FBMS Development Commands Available!', 
    'background: linear-gradient(90deg, #3b82f6, #8b5cf6); color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold'
  );
  console.log('Type %cfbmsDevCommands.help()%c for available commands', 'color: #3b82f6; font-weight: bold', '');
  console.log('Quick shortcuts: %cfbmsDev.h()%c, %cfbmsDev.ct()%c, %cfbmsDev.rat()%c', 
    'color: #f59e0b; font-weight: bold', '',
    'color: #f59e0b; font-weight: bold', '',
    'color: #f59e0b; font-weight: bold', ''
  );
}

/**
 * Keyboard shortcuts for token reset
 */
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (event) => {
    // Only in development mode
    if (!import.meta.env.DEV) return;
    
    // Ctrl/Cmd + Shift + R + T = Reset Tokens
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
      event.preventDefault();
      console.log('🎹 Keyboard shortcut: Reset Tokens');
      devCommands.help();
    }
    
    // Ctrl/Cmd + Shift + R + S = Reset Session
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
      event.preventDefault();
      console.log('🎹 Keyboard shortcut: Reset Session');
      devCommands.resetSession();
    }
  });
}

export default devCommands;