import React, { useState, Suspense, useEffect } from 'react';
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
  TestTube
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import PermissionGuard from './components/PermissionGuard';
import { ToastContainer } from './components/Toast';
import VersionSelector from './components/VersionSelector';
import EnhancedVersionMenu from './components/EnhancedVersionMenu';
import { useToastStore } from './store/toastStore';
import { useThemeStore } from './store/themeStore';
import { useSupabaseAuthStore } from './store/supabaseAuthStore';
import { canAccessModule } from './utils/permissions';
import { setupDevAuth } from './utils/supabase';
import { NavigationProvider } from './contexts/NavigationContext';
import TestDashboard from './components/test/TestDashboard';
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
  const [enhancedVersions, setEnhancedVersions] = useState<Record<string, boolean>>({
    sales: false,
    inventory: false,
    accounting: false,
    purchases: false,
    reports: false
  });
  const { toasts, removeToast } = useToastStore();
  const { initializeTheme } = useThemeStore();
  const { user } = useSupabaseAuthStore();

  // Initialize theme and development auth on app load
  useEffect(() => {
    initializeTheme();
    setupDevAuth(); // Setup development authentication
  }, [initializeTheme]);

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, module: 'dashboard' },
    { id: 'sales', label: 'Sales & POS', icon: ShoppingCart, module: 'pos' },
    { id: 'inventory', label: 'Inventory', icon: Package, module: 'inventory' },
    { id: 'purchases', label: 'Purchases', icon: Receipt, module: 'purchases' },
    { id: 'customers', label: 'Customers', icon: Users, module: 'customers' },
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
    { id: 'settings', label: 'Settings', icon: Settings, module: 'settings' }
  ];

  // Filter menu items based on user role permissions
  const menuItems = allMenuItems.filter(item => {
    if (!user || !user.role) {
      // Show basic items for unauthenticated users
      return ['dashboard', 'settings'].includes(item.id);
    }
    return canAccessModule(user.role, item.module);
  });

  const handleVersionChange = (module: string, isEnhanced: boolean) => {
    setEnhancedVersions(prev => ({
      ...prev,
      [module]: isEnhanced
    }));
  };

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

  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <NavigationProvider activeModule={activeModule} onModuleChange={setActiveModule}>
          <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex transition-colors duration-300">
          {/* Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen}
            menuItems={menuItems}
            activeModule={activeModule}
            onModuleChange={setActiveModule}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:ml-64">
            {/* Header */}
            <Header 
              onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
              activeModule={menuItems.find(item => item.id === activeModule)?.label || 'Dashboard'}
            />

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-950 transition-colors duration-300">
              <div className="p-3 sm:p-6">
                
                <VersionSelector 
                  currentModule={activeModule}
                  isEnhanced={enhancedVersions[activeModule] || false}
                  onVersionChange={(isEnhanced) => handleVersionChange(activeModule, isEnhanced)}
                />
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
              onClick={() => setSidebarOpen(false)}
            />
          )}
          </div>
        </NavigationProvider>
        
        {/* Enhanced Version Menu */}
        <EnhancedVersionMenu 
          enhancedVersions={enhancedVersions}
          onVersionChange={handleVersionChange}
          activeModule={activeModule}
        />
        
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </ProtectedRoute>
    </ErrorBoundary>
  );
};

export default App;