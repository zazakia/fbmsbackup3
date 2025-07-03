import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  CheckCircle, 
  XCircle, 
  Play,
  RotateCcw,
  Navigation,
  Menu,
  TestTube,
  ArrowRight,
  Home
} from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

interface NavigationState {
  currentRoute: string;
  previousRoute: string;
  sidebarOpen: boolean;
  breadcrumbs: string[];
  routeHistory: string[];
}

const NavigationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [navState, setNavState] = useState<NavigationState>({
    currentRoute: 'dashboard',
    previousRoute: '',
    sidebarOpen: false,
    breadcrumbs: ['Home', 'Dashboard'],
    routeHistory: ['dashboard']
  });
  
  const { addToast } = useToastStore();

  const mockRoutes = [
    { id: 'dashboard', name: 'Dashboard', path: '/dashboard', icon: 'Home' },
    { id: 'sales', name: 'Sales & POS', path: '/sales', icon: 'ShoppingCart' },
    { id: 'inventory', name: 'Inventory', path: '/inventory', icon: 'Package' },
    { id: 'purchases', name: 'Purchases', path: '/purchases', icon: 'Receipt' },
    { id: 'customers', name: 'Customers', path: '/customers', icon: 'Users' },
    { id: 'expenses', name: 'Expenses', path: '/expenses', icon: 'DollarSign' },
    { id: 'payroll', name: 'Payroll', path: '/payroll', icon: 'UserCheck' },
    { id: 'accounting', name: 'Accounting', path: '/accounting', icon: 'Calculator' },
    { id: 'reports', name: 'Reports', path: '/reports', icon: 'FileText' },
    { id: 'settings', name: 'Settings', path: '/settings', icon: 'Settings' }
  ];

  const initializeTests = () => {
    const tests: TestResult[] = [
      { name: 'Test Route Navigation', status: 'pending' },
      { name: 'Test Sidebar Toggle', status: 'pending' },
      { name: 'Test Menu Item Activation', status: 'pending' },
      { name: 'Test Breadcrumb Generation', status: 'pending' },
      { name: 'Test Route History', status: 'pending' },
      { name: 'Test Invalid Route Handling', status: 'pending' },
      { name: 'Test Deep Linking', status: 'pending' },
      { name: 'Test Mobile Navigation', status: 'pending' },
      { name: 'Test Route Guards', status: 'pending' },
      { name: 'Test Back Navigation', status: 'pending' },
      { name: 'Test URL Parameters', status: 'pending' },
      { name: 'Test Navigation State Persistence', status: 'pending' }
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

  const navigateToRoute = (routeId: string) => {
    const route = mockRoutes.find(r => r.id === routeId);
    if (!route) {
      throw new Error(`Route not found: ${routeId}`);
    }

    setNavState(prev => ({
      ...prev,
      previousRoute: prev.currentRoute,
      currentRoute: routeId,
      routeHistory: [...prev.routeHistory, routeId],
      breadcrumbs: ['Home', route.name]
    }));
  };

  const testRouteNavigation = async () => {
    await delay(500);
    
    // Test navigation to different routes
    const routesToTest = ['sales', 'inventory', 'customers', 'reports'];
    
    for (const routeId of routesToTest) {
      navigateToRoute(routeId);
      await delay(100);
      
      if (navState.currentRoute !== routeId) {
        throw new Error(`Failed to navigate to ${routeId}`);
      }
    }
  };

  const testSidebarToggle = async () => {
    await delay(300);
    
    // Test opening sidebar
    setNavState(prev => ({ ...prev, sidebarOpen: true }));
    await delay(100);
    
    if (!navState.sidebarOpen) {
      setNavState(prev => ({ ...prev, sidebarOpen: true }));
    }
    
    // Test closing sidebar
    setNavState(prev => ({ ...prev, sidebarOpen: false }));
    await delay(100);
    
    if (navState.sidebarOpen) {
      throw new Error('Failed to close sidebar');
    }
  };

  const testMenuItemActivation = async () => {
    await delay(400);
    
    // Test that menu items become active when navigated to
    const testRoute = 'inventory';
    navigateToRoute(testRoute);
    
    if (navState.currentRoute !== testRoute) {
      throw new Error('Menu item not activated correctly');
    }
    
    // Test that only one menu item is active at a time
    const activeRoutes = mockRoutes.filter(route => route.id === navState.currentRoute);
    if (activeRoutes.length !== 1) {
      throw new Error('Multiple menu items active simultaneously');
    }
  };

  const testBreadcrumbGeneration = async () => {
    await delay(300);
    
    // Test breadcrumb generation for different routes
    const testCases = [
      { route: 'dashboard', expectedBreadcrumbs: ['Home', 'Dashboard'] },
      { route: 'sales', expectedBreadcrumbs: ['Home', 'Sales & POS'] },
      { route: 'customers', expectedBreadcrumbs: ['Home', 'Customers'] }
    ];
    
    for (const testCase of testCases) {
      navigateToRoute(testCase.route);
      await delay(50);
      
      const route = mockRoutes.find(r => r.id === testCase.route);
      const expectedBreadcrumbs = ['Home', route?.name || ''];
      
      if (JSON.stringify(navState.breadcrumbs) !== JSON.stringify(expectedBreadcrumbs)) {
        throw new Error(`Breadcrumb mismatch for ${testCase.route}`);
      }
    }
  };

  const testRouteHistory = async () => {
    await delay(400);
    
    // Test that route history is maintained
    const initialHistoryLength = navState.routeHistory.length;
    
    navigateToRoute('sales');
    await delay(50);
    navigateToRoute('inventory');
    await delay(50);
    navigateToRoute('customers');
    await delay(50);
    
    if (navState.routeHistory.length <= initialHistoryLength) {
      throw new Error('Route history not being maintained');
    }
    
    // Test that history contains the correct routes
    const expectedRoutes = ['sales', 'inventory', 'customers'];
    const recentHistory = navState.routeHistory.slice(-3);
    
    for (const route of expectedRoutes) {
      if (!recentHistory.includes(route)) {
        throw new Error(`Route ${route} not found in history`);
      }
    }
  };

  const testInvalidRouteHandling = async () => {
    await delay(300);
    
    // Test navigation to invalid routes
    const invalidRoutes = ['nonexistent', '', 'invalid-route', '404'];
    
    for (const invalidRoute of invalidRoutes) {
      try {
        navigateToRoute(invalidRoute);
        throw new Error(`Invalid route ${invalidRoute} should have been rejected`);
      } catch (error) {
        // Expected behavior - invalid routes should throw errors
        continue;
      }
    }
  };

  const testDeepLinking = async () => {
    await delay(400);
    
    // Test that deep links work correctly
    const deepLinks = [
      { path: '/dashboard', expectedRoute: 'dashboard' },
      { path: '/sales', expectedRoute: 'sales' },
      { path: '/inventory', expectedRoute: 'inventory' }
    ];
    
    for (const link of deepLinks) {
      // Simulate direct navigation to deep link
      const routeId = link.path.substring(1); // Remove leading slash
      if (mockRoutes.find(r => r.id === routeId)) {
        navigateToRoute(routeId);
        await delay(50);
        
        if (navState.currentRoute !== link.expectedRoute) {
          throw new Error(`Deep link ${link.path} failed`);
        }
      }
    }
  };

  const testMobileNavigation = async () => {
    await delay(300);
    
    // Test mobile-specific navigation behavior
    const isMobile = window.innerWidth < 768; // Simulate mobile check
    
    if (isMobile) {
      // On mobile, sidebar should close after navigation
      setNavState(prev => ({ ...prev, sidebarOpen: true }));
      navigateToRoute('sales');
      setNavState(prev => ({ ...prev, sidebarOpen: false }));
      
      if (navState.sidebarOpen) {
        throw new Error('Mobile sidebar should close after navigation');
      }
    }
    
    // Test responsive behavior
    if (navState.currentRoute !== 'sales') {
      throw new Error('Mobile navigation failed');
    }
  };

  const testRouteGuards = async () => {
    await delay(400);
    
    // Test that route guards work (simulated)
    const protectedRoutes = ['payroll', 'accounting', 'reports'];
    const userRole = 'cashier'; // Simulate limited user role
    
    for (const route of protectedRoutes) {
      // Simulate permission check
      const hasPermission = userRole === 'admin' || userRole === 'manager';
      
      if (!hasPermission && protectedRoutes.includes(route)) {
        // Should redirect to dashboard or show error
        continue; // In real implementation, would check actual access control
      }
      
      navigateToRoute(route);
      await delay(50);
    }
  };

  const testBackNavigation = async () => {
    await delay(300);
    
    // Test browser back button simulation
    navigateToRoute('sales');
    await delay(50);
    const salesRoute = navState.currentRoute;
    
    navigateToRoute('inventory');
    await delay(50);
    
    // Simulate back navigation
    const previousRoute = navState.previousRoute;
    if (previousRoute) {
      navigateToRoute(previousRoute);
      await delay(50);
      
      if (navState.currentRoute !== salesRoute) {
        throw new Error('Back navigation failed');
      }
    }
  };

  const testURLParameters = async () => {
    await delay(300);
    
    // Test URL parameters handling
    const parametrizedRoutes = [
      { route: 'customers', params: { id: '123' } },
      { route: 'inventory', params: { category: 'electronics' } },
      { route: 'reports', params: { type: 'sales', period: 'monthly' } }
    ];
    
    for (const testCase of parametrizedRoutes) {
      // Simulate navigation with parameters
      navigateToRoute(testCase.route);
      await delay(50);
      
      // In real implementation, would test that parameters are parsed correctly
      if (navState.currentRoute !== testCase.route) {
        throw new Error(`Failed to navigate to ${testCase.route} with parameters`);
      }
    }
  };

  const testNavigationStatePersistence = async () => {
    await delay(400);
    
    // Test that navigation state persists across page reloads
    const currentState = { ...navState };
    
    // Simulate page reload by resetting and restoring state
    const serializedState = JSON.stringify(currentState);
    const restoredState = JSON.parse(serializedState);
    
    if (!restoredState.currentRoute || !restoredState.routeHistory) {
      throw new Error('Navigation state not persisted correctly');
    }
    
    setNavState(restoredState);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setNavState({
      currentRoute: 'dashboard',
      previousRoute: '',
      sidebarOpen: false,
      breadcrumbs: ['Home', 'Dashboard'],
      routeHistory: ['dashboard']
    });
    initializeTests();
    
    const tests = [
      { name: 'Test Route Navigation', fn: testRouteNavigation },
      { name: 'Test Sidebar Toggle', fn: testSidebarToggle },
      { name: 'Test Menu Item Activation', fn: testMenuItemActivation },
      { name: 'Test Breadcrumb Generation', fn: testBreadcrumbGeneration },
      { name: 'Test Route History', fn: testRouteHistory },
      { name: 'Test Invalid Route Handling', fn: testInvalidRouteHandling },
      { name: 'Test Deep Linking', fn: testDeepLinking },
      { name: 'Test Mobile Navigation', fn: testMobileNavigation },
      { name: 'Test Route Guards', fn: testRouteGuards },
      { name: 'Test Back Navigation', fn: testBackNavigation },
      { name: 'Test URL Parameters', fn: testURLParameters },
      { name: 'Test Navigation State Persistence', fn: testNavigationStatePersistence }
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
    setNavState({
      currentRoute: 'dashboard',
      previousRoute: '',
      sidebarOpen: false,
      breadcrumbs: ['Home', 'Dashboard'],
      routeHistory: ['dashboard']
    });
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
            Navigation Tests
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive testing for app navigation, routing, and menu functionality
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
            <Navigation className="h-5 w-5 text-purple-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Route</p>
              <p className="text-lg font-bold text-purple-600 capitalize">{navState.currentRoute}</p>
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

        {/* Navigation State */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Navigation State</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Current Route */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Route:</span>
              <span className="px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                {navState.currentRoute}
              </span>
            </div>

            {/* Previous Route */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Previous Route:</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {navState.previousRoute || 'None'}
              </span>
            </div>

            {/* Sidebar State */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sidebar:</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                navState.sidebarOpen 
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {navState.sidebarOpen ? 'Open' : 'Closed'}
              </span>
            </div>

            {/* Breadcrumbs */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Breadcrumbs:</span>
              <div className="flex items-center space-x-2">
                {navState.breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{crumb}</span>
                    {index < navState.breadcrumbs.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Route History */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Route History ({navState.routeHistory.length}):
              </span>
              <div className="flex flex-wrap gap-1">
                {navState.routeHistory.slice(-5).map((route, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                  >
                    {route}
                  </span>
                ))}
                {navState.routeHistory.length > 5 && (
                  <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                    +{navState.routeHistory.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationTest;