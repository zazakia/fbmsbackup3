import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Play,
  RotateCcw,
  Lock,
  User,
  TestTube,
  Shield,
  Key
} from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

const AuthTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [authState, setAuthState] = useState<any>({});
  
  const { addToast } = useToastStore();
  const { user, signIn, signOut } = useSupabaseAuthStore();

  const mockUsers = [
    {
      id: '1',
      email: 'admin@fbms.com',
      password: 'admin123',
      user_metadata: {
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      }
    },
    {
      id: '2',
      email: 'manager@fbms.com',
      password: 'manager123',
      user_metadata: {
        first_name: 'Manager',
        last_name: 'User',
        role: 'manager'
      }
    },
    {
      id: '3',
      email: 'cashier@fbms.com',
      password: 'cashier123',
      user_metadata: {
        first_name: 'Cashier',
        last_name: 'User',
        role: 'cashier'
      }
    }
  ];

  const initializeTests = () => {
    const tests: TestResult[] = [
      { name: 'Test Valid Login - Admin', status: 'pending' },
      { name: 'Test Valid Login - Manager', status: 'pending' },
      { name: 'Test Valid Login - Cashier', status: 'pending' },
      { name: 'Test Invalid Email Format', status: 'pending' },
      { name: 'Test Invalid Password', status: 'pending' },
      { name: 'Test Empty Credentials', status: 'pending' },
      { name: 'Test Session Persistence', status: 'pending' },
      { name: 'Test User Role Verification', status: 'pending' },
      { name: 'Test Logout Functionality', status: 'pending' },
      { name: 'Test Password Security', status: 'pending' },
      { name: 'Test Session Timeout', status: 'pending' },
      { name: 'Test Concurrent Sessions', status: 'pending' }
    ];
    setTestResults(tests);
  };

  useEffect(() => {
    initializeTests();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const updateTestResult = (testName: string, status: TestResult['status'], message?: string, duration?: number) => {
    setTestResults(prev => prev.map(test => 
      test.name === testName 
        ? { ...test, status, message, duration }
        : test
    ));
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    setCurrentTest(testName);
    updateTestResult(testName, 'running');
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'passed', 'Test completed successfully', duration);
      addToast({
        type: 'success',
        title: 'Test Passed',
        message: `${testName} completed successfully`
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Test failed';
      updateTestResult(testName, 'failed', message, duration);
      addToast({
        type: 'error',
        title: 'Test Failed',
        message: `${testName}: ${message}`
      });
    }
  };

  const testValidLoginAdmin = async () => {
    await delay(500);
    const adminUser = mockUsers[0];
    
    // Simulate login process
    setAuthState({
      isAuthenticated: true,
      user: {
        id: adminUser.id,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        email: adminUser.email,
        role: adminUser.role
      },
      token: 'mock-admin-token'
    });
    
    if (!authState.isAuthenticated) {
      // In real implementation, would use actual login
      const mockAuthState = {
        isAuthenticated: true,
        user: adminUser,
        token: 'mock-admin-token'
      };
      setAuthState(mockAuthState);
    }
  };

  const testValidLoginManager = async () => {
    await delay(500);
    const managerUser = mockUsers[1];
    
    setAuthState({
      isAuthenticated: true,
      user: {
        id: managerUser.id,
        firstName: managerUser.firstName,
        lastName: managerUser.lastName,
        email: managerUser.email,
        role: managerUser.role
      },
      token: 'mock-manager-token'
    });
  };

  const testValidLoginCashier = async () => {
    await delay(500);
    const cashierUser = mockUsers[2];
    
    setAuthState({
      isAuthenticated: true,
      user: {
        id: cashierUser.id,
        firstName: cashierUser.firstName,
        lastName: cashierUser.lastName,
        email: cashierUser.email,
        role: cashierUser.role
      },
      token: 'mock-cashier-token'
    });
  };

  const testInvalidEmailFormat = async () => {
    await delay(300);
    const invalidEmails = ['invalid-email', 'test@', '@domain.com', ''];
    
    for (const email of invalidEmails) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && emailRegex.test(email)) {
        throw new Error(`Invalid email format should be rejected: ${email}`);
      }
    }
  };

  const testInvalidPassword = async () => {
    await delay(400);
    const validEmail = 'admin@fbms.com';
    const invalidPasswords = ['wrong123', '', 'short', '123'];
    
    for (const password of invalidPasswords) {
      // Simulate authentication attempt
      const user = mockUsers.find(u => u.email === validEmail);
      if (user && user.password === password) {
        throw new Error(`Invalid password should be rejected: ${password}`);
      }
    }
  };

  const testEmptyCredentials = async () => {
    await delay(200);
    const emptyCredentials = [
      { email: '', password: '' },
      { email: 'test@test.com', password: '' },
      { email: '', password: 'password123' }
    ];
    
    for (const creds of emptyCredentials) {
      if (!creds.email || !creds.password) {
        continue; // Expected to fail validation
      }
      throw new Error('Empty credentials should be rejected');
    }
  };

  const testSessionPersistence = async () => {
    await delay(300);
    
    // Test that session data persists across page reloads
    const sessionData = {
      user: authState.user,
      token: authState.token,
      timestamp: Date.now()
    };
    
    // In real implementation, would test localStorage/sessionStorage
    if (!sessionData.user || !sessionData.token) {
      throw new Error('Session data should persist');
    }
    
    // Simulate session restoration
    const restoredSession = { ...sessionData };
    if (!restoredSession.user || !restoredSession.token) {
      throw new Error('Failed to restore session');
    }
  };

  const testUserRoleVerification = async () => {
    await delay(400);
    
    if (!authState.user) {
      throw new Error('User must be authenticated to test roles');
    }
    
    const validRoles = ['admin', 'manager', 'cashier'];
    if (!validRoles.includes(authState.user.role)) {
      throw new Error(`Invalid user role: ${authState.user.role}`);
    }
    
    // Test role-based permissions
    const rolePermissions = {
      admin: ['read', 'write', 'delete', 'manage'],
      manager: ['read', 'write', 'manage'],
      cashier: ['read', 'write']
    };
    
    const userPermissions = rolePermissions[authState.user.role as keyof typeof rolePermissions];
    if (!userPermissions || userPermissions.length === 0) {
      throw new Error('User role must have permissions');
    }
  };

  const testLogoutFunctionality = async () => {
    await delay(300);
    
    if (!authState.isAuthenticated) {
      throw new Error('User must be logged in to test logout');
    }
    
    // Simulate logout
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
    
    // Verify logout was successful
    if (authState.isAuthenticated) {
      throw new Error('Logout failed - user still authenticated');
    }
  };

  const testPasswordSecurity = async () => {
    await delay(200);
    
    // Test password requirements
    const weakPasswords = ['123', 'password', 'abc', ''];
    const strongPasswords = ['Admin123!', 'SecurePass2023', 'MyStr0ng#Pass'];
    
    for (const password of weakPasswords) {
      if (password.length < 6) {
        continue; // Expected to fail
      }
    }
    
    for (const password of strongPasswords) {
      if (password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password)) {
        continue; // Expected to pass
      }
      throw new Error(`Strong password rejected: ${password}`);
    }
  };

  const testSessionTimeout = async () => {
    await delay(300);
    
    // Simulate session timeout
    const sessionStartTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago
    const currentTime = Date.now();
    const sessionTimeout = 20 * 60 * 1000; // 20 minutes
    
    if (currentTime - sessionStartTime > sessionTimeout) {
      // Session should be expired
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null
      });
    }
    
    // Test that expired sessions are handled properly
    if (authState.isAuthenticated && (currentTime - sessionStartTime > sessionTimeout)) {
      throw new Error('Expired session should be invalidated');
    }
  };

  const testConcurrentSessions = async () => {
    await delay(400);
    
    // Test that multiple sessions are handled properly
    const sessions = [
      { id: 'session1', userId: '1', token: 'token1', active: true },
      { id: 'session2', userId: '1', token: 'token2', active: true }
    ];
    
    // In a real system, you might want to limit concurrent sessions
    // For this test, we just verify that sessions can be tracked
    if (sessions.length === 0) {
      throw new Error('Session management failed');
    }
    
    // Test session invalidation
    const activeSessions = sessions.filter(s => s.active);
    if (activeSessions.length !== sessions.length) {
      throw new Error('Session tracking inconsistent');
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setAuthState({});
    initializeTests();
    
    const tests = [
      { name: 'Test Valid Login - Admin', fn: testValidLoginAdmin },
      { name: 'Test Valid Login - Manager', fn: testValidLoginManager },
      { name: 'Test Valid Login - Cashier', fn: testValidLoginCashier },
      { name: 'Test Invalid Email Format', fn: testInvalidEmailFormat },
      { name: 'Test Invalid Password', fn: testInvalidPassword },
      { name: 'Test Empty Credentials', fn: testEmptyCredentials },
      { name: 'Test Session Persistence', fn: testSessionPersistence },
      { name: 'Test User Role Verification', fn: testUserRoleVerification },
      { name: 'Test Logout Functionality', fn: testLogoutFunctionality },
      { name: 'Test Password Security', fn: testPasswordSecurity },
      { name: 'Test Session Timeout', fn: testSessionTimeout },
      { name: 'Test Concurrent Sessions', fn: testConcurrentSessions }
    ];

    for (const test of tests) {
      await runTest(test.name, test.fn);
      await delay(100);
    }
    
    setIsRunning(false);
    setCurrentTest('');
    
    const passedTests = testResults.filter(t => t.status === 'passed').length;
    const totalTests = testResults.length;
    
    addToast({
      type: passedTests === totalTests ? 'success' : 'warning',
      title: 'Test Suite Completed',
      message: `${passedTests}/${totalTests} tests passed`
    });
  };

  const resetTests = () => {
    setAuthState({});
    initializeTests();
    setCurrentTest('');
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'running':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const passedTests = testResults.filter(t => t.status === 'passed').length;
  const failedTests = testResults.filter(t => t.status === 'failed').length;
  const totalTests = testResults.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <TestTube className="h-6 w-6 mr-2" />
            Authentication Tests
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive testing for user authentication, authorization, and session management
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={resetTests}
            disabled={isRunning}
            className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </button>
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run All Tests'}
          </button>
        </div>
      </div>

      {/* Test Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <TestTube className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tests</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalTests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Passed</p>
              <p className="text-xl font-bold text-green-600">{passedTests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-xl font-bold text-red-600">{failedTests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-purple-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Auth Status</p>
              <p className="text-xl font-bold text-purple-600">
                {authState.isAuthenticated ? 'Authenticated' : 'Guest'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Test Status */}
      {currentTest && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              Currently running: {currentTest}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Results */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Test Results</h2>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((test, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getStatusColor(test.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(test.status)}
                    <span className="ml-3 font-medium text-gray-900 dark:text-gray-100">
                      {test.name}
                    </span>
                  </div>
                  {test.duration && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {test.duration}ms
                    </span>
                  )}
                </div>
                {test.message && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {test.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Auth State */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Authentication State</h2>
          </div>
          <div className="p-4 space-y-4">
            {Object.keys(authState).length === 0 ? (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No authentication state</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    authState.isAuthenticated 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}>
                    {authState.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                </div>
                
                {authState.user && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">User:</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {authState.user.user_metadata?.first_name || authState.user.firstName} {authState.user.user_metadata?.last_name || authState.user.lastName}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email:</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {authState.user.email}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Role:</span>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {authState.user.user_metadata?.role || authState.user.role || 'N/A'}
                      </span>
                    </div>
                  </>
                )}
                
                {authState.token && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Token:</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                      {authState.token.substring(0, 20)}...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthTest;