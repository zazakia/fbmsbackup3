import React, { useState, Suspense, useEffect, useCallback, useMemo } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Receipt, 
  Users, 
  Calculator, 
  Settings,
  Home,
  DollarSign,
  FileText,
  UserCheck,
  Building2,
  FileSpreadsheet,
  Megaphone,
  Gift,
  Cloud,
  Activity,
  TestTube,
  Shield,
  History,
  Truck,
  UserCog,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import PermissionGuard from './components/PermissionGuard';
import { ToastContainer } from './components/Toast';
// import VersionSelector from './components/VersionSelector'; // Currently unused
// import EnhancedVersionMenu from './components/EnhancedVersionMenu'; // Moved to settings
import { useToastStore } from './store/toastStore';
import { useThemeStore } from './store/themeStore';
import { useSupabaseAuthStore } from './store/supabaseAuthStore';
import { useSettingsStore } from './store/settingsStore';
import { canAccessModule } from './utils/permissions';
import { setupDevAuth, testSupabaseConnection } from './utils/supabase';
import { NavigationProvider } from './contexts/NavigationContext';
import { useSecurity } from './hooks/useSecurity';
import './utils/devCommands'; // Initialize dev commands
import './utils/debugUser'; // Debug utilities  
import './utils/adminAccessTest'; // Admin access testing
import './utils/adminAccessFix'; // Admin access fix utilities
import { authErrorHandler } from './utils/authErrorHandler';
import './styles/mobile-responsive.css'; // Mobile responsive styles
import TestDashboard from './components/test/TestDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import AuthCallback from './components/auth/AuthCallback';
import PerformanceMonitor from './components/PerformanceMonitor';
import UserDebugInfo from './components/auth/UserDebugInfo';
// import HelpMenu from './components/help/HelpMenu';
import UserOnboardingTour from './components/help/UserOnboardingTour';
import { ErrorReporter } from './components/ErrorReporter';
import { errorMonitor } from './utils/errorMonitor';
// import { resourceRetryService } from './services/ResourceRetryService';
import { 
  LazyUserRoleManagement, 
  LazySupplierManagement, 
  LazyDataHistoryTracking, 
  LazyCustomerTransactionInterface 
} from './components/admin/LazyAdminComponents';
import {
  LazyDashboard,
  LazyEnhancedPOSSystem,
  LazyEnhancedInventoryManagement,
  LazyEnhancedPurchaseManagement,
  LazyEnhancedAccountingManagement,
  LazyEnhancedReportsDashboard,
  LazyExpenseTracking,
  LazyPayrollManagement,
  LazyBIRForms,
  LazyBranchManagement,
  LazySettingsPage,
  LazyCustomerManagement,
  LazyManagerOperations,
  LazyMarketingCampaigns,
  LazyLoyaltyPrograms,
  LazyCloudBackup,
  LazySalesHistory,
  LazyProductHistory
} from './utils/lazyComponents';
import { LazyProductCategories } from './utils/lazyComponents';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [showErrorReporter, setShowErrorReporter] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const { toasts, removeToast, addToast } = useToastStore();
  const { initializeTheme } = useThemeStore();
  const { user } = useSupabaseAuthStore();
  const { menuVisibility } = useSettingsStore();
  const { securityStatus } = useSecurity();
  console.log('Security status:', securityStatus); // TODO: Use security status in UI

  // Check for OAuth callback
  const isOAuthCallback = window.location.hash.includes('access_token') || 
                         window.location.search.includes('code=') ||
                         window.location.pathname.includes('/auth/callback');

  // Initialize theme, error monitoring, and development auth on app load
  useEffect(() => {
    initializeTheme();
    
    // Test Supabase connection after a brief delay to allow initialization
    setTimeout(() => {
      testSupabaseConnection().then((result) => {
        if (!result.connected) {
          addToast({
            type: 'error',
            title: 'Database Connection Error',
            message: `Failed to connect to database: ${result.error}`,
            duration: 10000
          });
        } else {
          console.log('✅ Database connection verified');
        }
      });
    }, 1000); // 1 second delay
    
    if (!isOAuthCallback) {
      setupDevAuth(); // Setup development authentication
    }
    
    // Initialize auth error handler for URL parameters
    authErrorHandler.handleUrlAuthErrors();
    
    // Initialize error monitoring
    const updateErrorCount = () => {
      const recentErrors = errorMonitor.getErrorsInLastMinutes(30);
      setErrorCount(recentErrors.length);
    };
    
    // Update error count immediately and on new errors
    updateErrorCount();
    const handleNewError = () => updateErrorCount();
    window.addEventListener('errorMonitor:newError', handleNewError);
    
    // Handle auto-copy notifications
    const handleAutoCopy = (event: CustomEvent) => {
      const { message } = event.detail;
      addToast({
        type: 'info',
        title: 'Auto-Copy',
        message: message + ' - Paste into Claude Code chat for instant fixes!',
        duration: 5000
      });
    };
    
    window.addEventListener('errorMonitor:autoCopy', handleAutoCopy);
    
    // Update error count periodically
    const interval = setInterval(updateErrorCount, 30000); // Every 30 seconds
    
    return () => {
      window.removeEventListener('errorMonitor:newError', handleNewError);
      window.removeEventListener('errorMonitor:autoCopy', handleAutoCopy);
      clearInterval(interval);
    };
  }, [initializeTheme, isOAuthCallback, addToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        // Help menu is handled by HelpMenu component
      }
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setShowOnboardingTour(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter menu items based on user role permissions and visibility settings
  const menuItems = useMemo(() => {
    // Map menu IDs to visibility keys
    const menuIdToVisibilityKey: Record<string, keyof typeof menuVisibility> = {
      'dashboard': 'dashboard',
      'sales': 'sales',
      'sales-history': 'sales',
      'inventory': 'inventory',
      'product-history': 'inventory',
      'purchases': 'purchases',
      'receiving-voucher': 'purchases',
      'customers': 'customers',
      'customer-transactions': 'customerTransactions',
      'suppliers': 'suppliers',
      'expenses': 'expenses',
      'payroll': 'payroll',
      'accounting': 'accounting',
      'reports': 'reports',
      'bir': 'bir',
      'branches': 'branches',
      'operations': 'dashboard', // Map operations to dashboard visibility setting
      'marketing': 'marketing',
      'loyalty': 'loyalty',
      'backup': 'backup',
      'testing': 'testing',
      'admin-dashboard': 'adminDashboard',
      'user-roles': 'userRoles',
      'data-history': 'dataHistory',
      'settings': 'settings'
    };

    const allMenuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home, module: 'dashboard' },
      { id: 'sales', label: 'Sales & POS', icon: ShoppingCart, module: 'pos' },
      { id: 'sales-history', label: 'Sales History', icon: Receipt, module: 'pos' },
      { id: 'inventory', label: 'Inventory', icon: Package, module: 'inventory' },
      { id: 'product-categories', label: 'Product Categories', icon: Package, module: 'inventory' },
      { id: 'product-history', label: 'Product History', icon: History, module: 'inventory' },
      { id: 'purchases', label: 'Purchases', icon: Receipt, module: 'purchases' },
      { id: 'receiving-voucher', label: 'Receiving Voucher', icon: Receipt, module: 'purchases' },
      { id: 'customers', label: 'Customers', icon: Users, module: 'customers' },
      { id: 'customer-transactions', label: 'Customer Transactions', icon: Users, module: 'customers' },
      { id: 'suppliers', label: 'Suppliers', icon: Truck, module: 'suppliers' },
      { id: 'expenses', label: 'Expenses', icon: DollarSign, module: 'expenses' },
      { id: 'payroll', label: 'Payroll', icon: UserCheck, module: 'payroll' },
      { id: 'accounting', label: 'Accounting', icon: Calculator, module: 'accounting' },
      { id: 'reports', label: 'Reports & Analytics', icon: FileText, module: 'reports' },
      { id: 'bir', label: 'BIR Forms', icon: FileSpreadsheet, module: 'bir' },
      { id: 'branches', label: 'Multi-Branch', icon: Building2, module: 'branches' },
      { id: 'operations', label: 'Operations', icon: Activity, module: 'operations' }, // Operations module
      { id: 'marketing', label: 'Marketing', icon: Megaphone, module: 'reports' }, // Map to reports permissions for now
      { id: 'loyalty', label: 'Loyalty Programs', icon: Gift, module: 'customers' }, // Map to customers permissions
      { id: 'backup', label: 'Cloud Backup', icon: Cloud, module: 'settings' }, // Map to settings permissions
      { id: 'testing', label: 'Testing Suite', icon: TestTube, module: 'settings' }, // Map to settings permissions
      { id: 'admin-dashboard', label: 'Admin Dashboard', icon: Shield, module: 'admin-dashboard' }, // Admin only
      { id: 'user-roles', label: 'User Role Management', icon: UserCog, module: 'admin-dashboard' }, // Admin only
      { id: 'data-history', label: 'Data History', icon: History, module: 'admin-dashboard' }, // Admin only
      { id: 'help', label: 'Help & Documentation', icon: HelpCircle, module: 'help' }, // Available to all users
      { id: 'settings', label: 'Settings', icon: Settings, module: 'settings' }
    ];

    return allMenuItems.filter(item => {
      // Exclude help module from main navigation
      if (item.id === 'help') {
        return false;
      }
      
      if (!user || !user.role) {
        // Show basic items for unauthenticated users
        return ['dashboard', 'settings'].includes(item.id);
      }
      
      // Check user permissions
      const hasPermission = canAccessModule(user.role, item.module);
      if (!hasPermission) return false;
      
      // Check visibility settings
      const visibilityKey = menuIdToVisibilityKey[item.id];
      if (visibilityKey && menuVisibility[visibilityKey] !== undefined) {
        // Force show dashboard and settings (core functionality)
        if (item.id === 'dashboard' || item.id === 'settings') {
          return true;
        }
        return menuVisibility[visibilityKey];
      }
      
      return true;
    });
  }, [user, menuVisibility]);

  // Version change handling is now in settings store

  const handleModuleChange = useCallback((moduleId: string) => {
    setActiveModule(moduleId);
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const renderContent = () => {
    try {
      console.info('[NAV] renderContent ->', activeModule);
      switch (activeModule) {
        case 'dashboard':
          return (
            <PermissionGuard module="dashboard">
              <LazyDashboard />
            </PermissionGuard>
          );
        case 'sales':
          console.info('[NAV] Loading POS module (sales -> pos)');
          return (
            <PermissionGuard module="pos">
              <LazyEnhancedPOSSystem />
            </PermissionGuard>
          );
        case 'sales-history':
          console.info('[NAV] Loading Sales History');
          return (
            <ErrorBoundary>
              <PermissionGuard module="pos">
                <LazySalesHistory />
              </PermissionGuard>
            </ErrorBoundary>
          );
        case 'inventory':
          return (
            <PermissionGuard module="inventory">
              <LazyEnhancedInventoryManagement />
            </PermissionGuard>
          );
        case 'product-categories':
          return (
            <PermissionGuard module="inventory">
              <LazyProductCategories />
            </PermissionGuard>
          );
        case 'product-history':
          return (
            <ErrorBoundary>
              <PermissionGuard module="inventory">
                <LazyProductHistory />
              </PermissionGuard>
            </ErrorBoundary>
          );
        case 'purchases':
          return (
            <PermissionGuard module="purchases">
              <LazyEnhancedPurchaseManagement />
            </PermissionGuard>
          );
        case 'receiving-voucher':
          return (
            <PermissionGuard module="purchases">
              <Suspense fallback={<LoadingSpinner />}>
                {React.createElement(React.lazy(() => import('./components/receiving/ReceivingVoucherEntry')))}
              </Suspense>
            </PermissionGuard>
          );
        case 'customers':
          return (
            <PermissionGuard module="customers">
              <LazyCustomerManagement />
            </PermissionGuard>
          );
        case 'customer-transactions':
          return (
            <PermissionGuard module="customers">
              <LazyCustomerTransactionInterface />
            </PermissionGuard>
          );
        case 'suppliers':
          return (
            <PermissionGuard module="suppliers">
              <LazySupplierManagement />
            </PermissionGuard>
          );
        case 'expenses':
          return (
            <ErrorBoundary>
              <PermissionGuard module="expenses">
                <LazyExpenseTracking />
              </PermissionGuard>
            </ErrorBoundary>
          );
        case 'payroll':
          return (
            <ErrorBoundary>
              <PermissionGuard module="payroll">
                <LazyPayrollManagement />
              </PermissionGuard>
            </ErrorBoundary>
          );
        case 'accounting':
          return (
            <PermissionGuard module="accounting">
              <LazyEnhancedAccountingManagement />
            </PermissionGuard>
          );
        case 'reports':
          return (
            <PermissionGuard module="reports">
              <LazyEnhancedReportsDashboard />
            </PermissionGuard>
          );
        case 'bir':
          return (
            <ErrorBoundary>
              <PermissionGuard module="bir">
                <LazyBIRForms />
              </PermissionGuard>
            </ErrorBoundary>
          );
        case 'branches':
          return (
            <PermissionGuard module="branches">
              <LazyBranchManagement />
            </PermissionGuard>
          );
        case 'operations':
          return (
            <ErrorBoundary>
              <PermissionGuard module="operations" requiredRole="manager">
                <LazyManagerOperations />
              </PermissionGuard>
            </ErrorBoundary>
          );
        case 'marketing':
          return (
            <PermissionGuard module="reports">
              <LazyMarketingCampaigns />
            </PermissionGuard>
          );
        case 'loyalty':
          return (
            <PermissionGuard module="customers">
              <LazyLoyaltyPrograms />
            </PermissionGuard>
          );
        case 'backup':
          return (
            <ErrorBoundary>
              <PermissionGuard module="settings" requiredRole="admin">
                <LazyCloudBackup />
              </PermissionGuard>
            </ErrorBoundary>
          );
        case 'testing':
          return (
            <PermissionGuard module="settings" requiredRole="admin">
              <TestDashboard />
            </PermissionGuard>
          );
        case 'admin-dashboard':
          return (
            <PermissionGuard module="admin-dashboard" requiredRole="admin">
              <AdminDashboard />
            </PermissionGuard>
          );
        case 'user-roles':
          return (
            <PermissionGuard module="admin-dashboard" requiredRole="admin">
              <LazyUserRoleManagement />
            </PermissionGuard>
          );
        case 'data-history':
          return (
            <PermissionGuard module="admin-dashboard" requiredRole="admin">
              <LazyDataHistoryTracking />
            </PermissionGuard>
          );
        case 'settings':
          return (
            <PermissionGuard module="settings">
              <LazySettingsPage />
            </PermissionGuard>
          );
        default:
          return (
            <PermissionGuard module="dashboard">
              <LazyDashboard />
            </PermissionGuard>
          );
      }
    } catch (err) {
      console.error('[NAV] renderContent error for module:', activeModule, err);
      return (
        <PermissionGuard module="dashboard">
          <LazyDashboard />
        </PermissionGuard>
      );
    }
  };

  // Handle OAuth callback
  if (isOAuthCallback) {
    return (
      <ErrorBoundary>
        <AuthCallback />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <NavigationProvider activeModule={activeModule} onModuleChange={handleModuleChange}>
          <div className="min-h-screen w-full bg-gray-50 dark:bg-dark-950 flex transition-colors duration-300">
          {/* Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen}
            menuItems={menuItems}
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
            onClose={closeSidebar}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
            {/* Header */}
            <Header 
              onMenuToggle={handleSidebarToggle}
              activeModule={menuItems.find(item => item.id === activeModule)?.label || 'Dashboard'}
            />

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-950 transition-colors duration-300">
              <div className="p-2 sm:p-4 md:p-6 pb-20 lg:pb-6 w-full min-w-0 overflow-x-hidden">
                
                {/* Version selector removed - now in settings */}
                <Suspense fallback={<LoadingSpinner message="Loading module..." size="lg" className="min-h-[400px]" />}>
                  {renderContent()}
                </Suspense>
              </div>
            </main>
          </div>

          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={closeSidebar}
            />
          )}

          {/* Bottom Navigation (Mobile Only) */}
          <BottomNavigation 
            menuItems={menuItems}
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
          />
          </div>
        </NavigationProvider>
        
        {/* Enhanced Version Menu moved to Settings */}
        
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
        
        {/* Performance Monitor (Development Only) */}
        <PerformanceMonitor />
        
        {/* User Debug Info (Development Only) */}
        {import.meta.env.DEV && <UserDebugInfo />}
        

        
        {/* User Onboarding Tour */}
        <UserOnboardingTour 
          isOpen={showOnboardingTour} 
          onClose={() => setShowOnboardingTour(false)} 
        />

        {/* Floating Error Monitor Button */}
        {errorCount > 0 && (
          <button
            onClick={() => setShowErrorReporter(true)}
            className="fixed bottom-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full p-3 shadow-lg transition-all duration-200 flex items-center space-x-2 group"
            title={`${errorCount} error${errorCount > 1 ? 's' : ''} detected - Click for details`}
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="bg-white text-red-500 rounded-full px-2 py-1 text-xs font-bold">
              {errorCount}
            </span>
            <span className="hidden group-hover:inline text-sm ml-2 whitespace-nowrap">
              View Errors
            </span>
          </button>
        )}

        {/* Error Reporter Modal */}
        <ErrorReporter 
          isOpen={showErrorReporter} 
          onClose={() => setShowErrorReporter(false)} 
        />
      </ProtectedRoute>
    </ErrorBoundary>
  );
};

export default App;