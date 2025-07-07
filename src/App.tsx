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
  CreditCard,
  TestTube,
  Shield,
  History,
  Truck,
  UserCog
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import PermissionGuard from './components/PermissionGuard';
import { ToastContainer } from './components/Toast';
import VersionSelector from './components/VersionSelector';
// import EnhancedVersionMenu from './components/EnhancedVersionMenu'; // Moved to settings
import { useToastStore } from './store/toastStore';
import { useThemeStore } from './store/themeStore';
import { useSupabaseAuthStore } from './store/supabaseAuthStore';
import { useSettingsStore } from './store/settingsStore';
import { canAccessModule } from './utils/permissions';
import { setupDevAuth } from './utils/supabase';
import { NavigationProvider } from './contexts/NavigationContext';
import './utils/devCommands'; // Initialize dev commands
import './styles/mobile-responsive.css'; // Mobile responsive styles
import TestDashboard from './components/test/TestDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import AuthCallback from './components/auth/AuthCallback';
import PerformanceMonitor from './components/PerformanceMonitor';
import { 
  LazyUserRoleManagement, 
  LazySupplierManagement, 
  LazyDataHistoryTracking, 
  LazyCustomerTransactionInterface 
} from './components/admin/LazyAdminComponents';
import {
  LazyDashboard,
  LazyPOSSystem,
  LazyInventoryManagement,
  LazyPurchaseManagement,
  LazyAccountingManagement,
  LazyReportsDashboard,
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
  LazyCashierPOS,
  LazyMarketingCampaigns,
  LazyLoyaltyPrograms,
  LazyCloudBackup
} from './utils/lazyComponents';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  const { toasts, removeToast } = useToastStore();
  const { initializeTheme } = useThemeStore();
  const { user } = useSupabaseAuthStore();
  const { enhancedVersions, menuVisibility } = useSettingsStore();

  // Check for OAuth callback
  const isOAuthCallback = window.location.hash.includes('access_token') || 
                         window.location.search.includes('code=') ||
                         window.location.pathname.includes('/auth/callback');

  // Initialize theme and development auth on app load
  useEffect(() => {
    initializeTheme();
    if (!isOAuthCallback) {
      setupDevAuth(); // Setup development authentication
    }
  }, [initializeTheme, isOAuthCallback]);

  // Map menu IDs to visibility keys
  const menuIdToVisibilityKey: Record<string, keyof typeof menuVisibility> = {
    'dashboard': 'dashboard',
    'sales': 'sales',
    'inventory': 'inventory',
    'purchases': 'purchases',
    'customers': 'customers',
    'customer-transactions': 'customerTransactions',
    'suppliers': 'suppliers',
    'expenses': 'expenses',
    'payroll': 'payroll',
    'accounting': 'accounting',
    'reports': 'reports',
    'bir': 'bir',
    'branches': 'branches',
    'operations': 'operations',
    'cashier': 'cashier',
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
    { id: 'inventory', label: 'Inventory', icon: Package, module: 'inventory' },
    { id: 'purchases', label: 'Purchases', icon: Receipt, module: 'purchases' },
    { id: 'customers', label: 'Customers', icon: Users, module: 'customers' },
    { id: 'customer-transactions', label: 'Customer Transactions', icon: Users, module: 'customers' },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, module: 'suppliers' },
    { id: 'expenses', label: 'Expenses', icon: DollarSign, module: 'expenses' },
    { id: 'payroll', label: 'Payroll', icon: UserCheck, module: 'payroll' },
    { id: 'accounting', label: 'Accounting', icon: Calculator, module: 'accounting' },
    { id: 'reports', label: 'Reports & Analytics', icon: FileText, module: 'reports' },
    { id: 'bir', label: 'BIR Forms', icon: FileSpreadsheet, module: 'bir' },
    { id: 'branches', label: 'Multi-Branch', icon: Building2, module: 'branches' },
    { id: 'operations', label: 'Operations', icon: Activity, module: 'dashboard' }, // Map to dashboard permissions
    { id: 'cashier', label: 'Cashier POS', icon: CreditCard, module: 'pos' },
    { id: 'marketing', label: 'Marketing', icon: Megaphone, module: 'reports' }, // Map to reports permissions for now
    { id: 'loyalty', label: 'Loyalty Programs', icon: Gift, module: 'customers' }, // Map to customers permissions
    { id: 'backup', label: 'Cloud Backup', icon: Cloud, module: 'settings' }, // Map to settings permissions
    { id: 'testing', label: 'Testing Suite', icon: TestTube, module: 'settings' }, // Map to settings permissions
    { id: 'admin-dashboard', label: 'Admin Dashboard', icon: Shield, module: 'admin-dashboard' }, // Admin only
    { id: 'user-roles', label: 'User Role Management', icon: UserCog, module: 'admin-dashboard' }, // Admin only
    { id: 'data-history', label: 'Data History', icon: History, module: 'admin-dashboard' }, // Admin only
    { id: 'settings', label: 'Settings', icon: Settings, module: 'settings' }
  ];

  // Filter menu items based on user role permissions and visibility settings
  const menuItems = useMemo(() => 
    allMenuItems.filter(item => {
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
    }), [user?.role, menuVisibility]);

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
    switch (activeModule) {
      case 'dashboard':
        return (
          <PermissionGuard module="dashboard">
            <LazyDashboard />
          </PermissionGuard>
        );
      case 'sales':
        return (
          <PermissionGuard module="pos">
            {enhancedVersions.sales ? <LazyEnhancedPOSSystem /> : <LazyPOSSystem />}
          </PermissionGuard>
        );
      case 'inventory':
        return (
          <PermissionGuard module="inventory">
            {enhancedVersions.inventory ? <LazyEnhancedInventoryManagement /> : <LazyInventoryManagement />}
          </PermissionGuard>
        );
      case 'purchases':
        return (
          <PermissionGuard module="purchases">
            {enhancedVersions.purchases ? <LazyEnhancedPurchaseManagement /> : <LazyPurchaseManagement />}
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
          <PermissionGuard module="expenses">
            <LazyExpenseTracking />
          </PermissionGuard>
        );
      case 'payroll':
        return (
          <PermissionGuard module="payroll">
            <LazyPayrollManagement />
          </PermissionGuard>
        );
      case 'accounting':
        return (
          <PermissionGuard module="accounting">
            {enhancedVersions.accounting ? <LazyEnhancedAccountingManagement /> : <LazyAccountingManagement />}
          </PermissionGuard>
        );
      case 'reports':
        return (
          <PermissionGuard module="reports">
            {enhancedVersions.reports ? <LazyEnhancedReportsDashboard /> : <LazyReportsDashboard />}
          </PermissionGuard>
        );
      case 'bir':
        return (
          <PermissionGuard module="bir">
            <LazyBIRForms />
          </PermissionGuard>
        );
      case 'branches':
        return (
          <PermissionGuard module="branches">
            <LazyBranchManagement />
          </PermissionGuard>
        );
      case 'operations':
        return (
          <PermissionGuard module="dashboard" requiredRole="manager">
            <LazyManagerOperations />
          </PermissionGuard>
        );
      case 'cashier':
        return (
          <PermissionGuard module="pos">
            <LazyCashierPOS />
          </PermissionGuard>
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
          <PermissionGuard module="settings" requiredRole="admin">
            <LazyCloudBackup />
          </PermissionGuard>
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
          <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex transition-colors duration-300">
          {/* Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen}
            menuItems={menuItems}
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
            onClose={closeSidebar}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:ml-64">
            {/* Header */}
            <Header 
              onMenuToggle={handleSidebarToggle}
              activeModule={menuItems.find(item => item.id === activeModule)?.label || 'Dashboard'}
            />

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-950 transition-colors duration-300">
              <div className="p-2 sm:p-4 md:p-6 pb-20 lg:pb-6 w-full max-w-full overflow-x-hidden">
                
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
      </ProtectedRoute>
    </ErrorBoundary>
  );
};

export default App;