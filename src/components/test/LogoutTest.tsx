import React, { useState, useEffect } from 'react';
import { LogOut, RefreshCw, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { 
  enhancedLogout, 
  quickLogoutFix, 
  isStuckInLogout, 
  forceResetAuthState,
  LogoutResult 
} from '../../utils/logoutFix';

interface LogoutTestState {
  isTestingLogout: boolean;
  lastLogoutResult: LogoutResult | null;
  isStuck: boolean;
  consecutiveFailures: number;
}

const LogoutTest: React.FC = () => {
  const { user, logout, isLoading, isAuthenticated, hasLoggedOut } = useSupabaseAuthStore();
  const [testState, setTestState] = useState<LogoutTestState>({
    isTestingLogout: false,
    lastLogoutResult: null,
    isStuck: false,
    consecutiveFailures: 0
  });

  // Check if stuck in logout state periodically
  useEffect(() => {
    const checkStuckInterval = setInterval(() => {
      const stuck = isStuckInLogout();
      setTestState(prev => ({ ...prev, isStuck: stuck }));
    }, 2000);

    return () => clearInterval(checkStuckInterval);
  }, []);

  const handleStandardLogout = async () => {
    setTestState(prev => ({ ...prev, isTestingLogout: true }));
    
    try {
      await logout();
      setTestState(prev => ({ 
        ...prev, 
        isTestingLogout: false,
        consecutiveFailures: 0
      }));
    } catch (error) {
      setTestState(prev => ({ 
        ...prev, 
        isTestingLogout: false,
        consecutiveFailures: prev.consecutiveFailures + 1
      }));
      console.error('Standard logout failed:', error);
    }
  };

  const handleEnhancedLogout = async () => {
    setTestState(prev => ({ ...prev, isTestingLogout: true }));
    
    try {
      const result = await enhancedLogout();
      setTestState(prev => ({ 
        ...prev, 
        isTestingLogout: false,
        lastLogoutResult: result,
        consecutiveFailures: result.success ? 0 : prev.consecutiveFailures + 1
      }));
    } catch (error) {
      setTestState(prev => ({ 
        ...prev, 
        isTestingLogout: false,
        consecutiveFailures: prev.consecutiveFailures + 1
      }));
      console.error('Enhanced logout failed:', error);
    }
  };

  const handleQuickFix = async () => {
    setTestState(prev => ({ ...prev, isTestingLogout: true }));
    
    try {
      const success = await quickLogoutFix();
      setTestState(prev => ({ 
        ...prev, 
        isTestingLogout: false,
        consecutiveFailures: success ? 0 : prev.consecutiveFailures + 1
      }));
    } catch (error) {
      setTestState(prev => ({ 
        ...prev, 
        isTestingLogout: false,
        consecutiveFailures: prev.consecutiveFailures + 1
      }));
      console.error('Quick logout fix failed:', error);
    }
  };

  const handleForceReset = () => {
    forceResetAuthState();
    setTestState(prev => ({ 
      ...prev, 
      consecutiveFailures: 0,
      lastLogoutResult: null,
      isStuck: false
    }));
  };

  const getStatusIcon = () => {
    if (testState.isStuck) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    if (!isAuthenticated && hasLoggedOut) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (isAuthenticated) {
      return <Info className="h-5 w-5 text-blue-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (testState.isStuck) {
      return 'Stuck in logout state - use Force Reset';
    }
    if (!isAuthenticated && hasLoggedOut) {
      return 'Successfully logged out';
    }
    if (isAuthenticated) {
      return `Logged in as ${user?.email}`;
    }
    return 'Unknown auth state';
  };

  const getStatusColor = () => {
    if (testState.isStuck) {
      return 'border-yellow-200 bg-yellow-50';
    }
    if (!isAuthenticated && hasLoggedOut) {
      return 'border-green-200 bg-green-50';
    }
    if (isAuthenticated) {
      return 'border-blue-200 bg-blue-50';
    }
    return 'border-red-200 bg-red-50';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Logout Functionality Test</h2>
          <p className="text-sm text-gray-600 mt-1">
            Test different logout scenarios and diagnose authentication issues
          </p>
        </div>

        {/* Status Panel */}
        <div className={`p-4 border-b border-gray-200 ${getStatusColor()}`}>
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div className="flex-1">
              <div className="font-medium text-gray-900">{getStatusText()}</div>
              <div className="text-sm text-gray-600 mt-1">
                Auth State: authenticated={String(isAuthenticated)}, 
                hasLoggedOut={String(hasLoggedOut)}, 
                isLoading={String(isLoading)}
              </div>
              {testState.consecutiveFailures > 0 && (
                <div className="text-sm text-red-600 mt-1">
                  ⚠️ {testState.consecutiveFailures} consecutive logout failures
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard Logout */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Standard Logout
              </label>
              <button
                onClick={handleStandardLogout}
                disabled={!isAuthenticated || testState.isTestingLogout}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testState.isTestingLogout ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Standard Logout
              </button>
              <p className="text-xs text-gray-500">
                Uses the regular auth store logout method
              </p>
            </div>

            {/* Enhanced Logout */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Enhanced Logout
              </label>
              <button
                onClick={handleEnhancedLogout}
                disabled={testState.isTestingLogout}
                className="w-full flex items-center justify-center px-4 py-2 border border-blue-300 rounded-md shadow-sm bg-blue-50 text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testState.isTestingLogout ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Enhanced Logout
              </button>
              <p className="text-xs text-gray-500">
                Uses comprehensive logout with timeout and cleanup
              </p>
            </div>

            {/* Quick Fix */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quick Fix
              </label>
              <button
                onClick={handleQuickFix}
                disabled={testState.isTestingLogout}
                className="w-full flex items-center justify-center px-4 py-2 border border-green-300 rounded-md shadow-sm bg-green-50 text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testState.isTestingLogout ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Quick Fix
              </button>
              <p className="text-xs text-gray-500">
                Quick logout fix for immediate issues
              </p>
            </div>

            {/* Force Reset */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Force Reset
              </label>
              <button
                onClick={handleForceReset}
                className="w-full flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm bg-red-50 text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Reset Auth
              </button>
              <p className="text-xs text-gray-500">
                Force reset auth state without Supabase call
              </p>
            </div>
          </div>
        </div>

        {/* Last Result */}
        {testState.lastLogoutResult && (
          <div className="px-6 py-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Last Logout Result</h3>
            <div className={`p-3 rounded-md ${
              testState.lastLogoutResult.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-start space-x-2">
                {testState.lastLogoutResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    {testState.lastLogoutResult.message}
                  </p>
                  <p className="text-xs text-gray-600">
                    {testState.lastLogoutResult.actionsCompleted.length} actions completed
                  </p>
                  {testState.lastLogoutResult.errors && testState.lastLogoutResult.errors.length > 0 && (
                    <div className="text-xs text-red-600">
                      Errors: {testState.lastLogoutResult.errors.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <details className="space-y-2">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">
              Debug Information
            </summary>
            <div className="text-xs text-gray-600 space-y-1 mt-2">
              <div>User: {user ? JSON.stringify({email: user.email, role: user.role}) : 'null'}</div>
              <div>Is Authenticated: {String(isAuthenticated)}</div>
              <div>Has Logged Out: {String(hasLoggedOut)}</div>
              <div>Is Loading: {String(isLoading)}</div>
              <div>Is Stuck: {String(testState.isStuck)}</div>
              <div>Consecutive Failures: {testState.consecutiveFailures}</div>
              <div>LocalStorage Auth Keys: {
                Object.keys(localStorage).filter(k => 
                  k.includes('auth') || k.includes('supabase') || k.includes('fbms')
                ).join(', ') || 'none'
              }</div>
            </div>
          </details>
        </div>
      </div>

      {/* Console Commands */}
      <div className="mt-6 bg-gray-900 text-gray-100 rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Console Commands</h3>
        <div className="text-xs space-y-1 font-mono">
          <div>fbmsLogoutFix() - Run enhanced logout</div>
          <div>fbmsQuickLogout() - Run quick logout fix</div>
          <div>fbmsForceReset() - Force reset auth state</div>
          <div>fbmsCheckStuck() - Check if stuck in logout</div>
        </div>
      </div>
    </div>
  );
};

export default LogoutTest;
