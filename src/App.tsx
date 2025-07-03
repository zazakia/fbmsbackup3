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
  CreditCard
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import VersionSelector from './components/VersionSelector';
import EnhancedVersionMenu from './components/EnhancedVersionMenu';
import SupabaseAuthBanner from './components/auth/SupabaseAuthBanner';
import { useToastStore } from './store/toastStore';
import { useThemeStore } from './store/themeStore';
import { setupDevAuth } from './utils/supabase';
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

  // Initialize theme and development auth on app load
  useEffect(() => {
    initializeTheme();
    setupDevAuth(); // Setup development authentication
  }, [initializeTheme]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'sales', label: 'Sales & POS', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'purchases', label: 'Purchases', icon: Receipt },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'payroll', label: 'Payroll', icon: UserCheck },
    { id: 'accounting', label: 'Accounting', icon: Calculator },
    { id: 'reports', label: 'Reports & Analytics', icon: FileText },
    { id: 'bir', label: 'BIR Forms', icon: FileSpreadsheet },
    { id: 'branches', label: 'Multi-Branch', icon: Building2 },
    { id: 'operations', label: 'Operations', icon: Activity },
    { id: 'cashier', label: 'Cashier POS', icon: CreditCard },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'loyalty', label: 'Loyalty Programs', icon: Gift },
    { id: 'backup', label: 'Cloud Backup', icon: Cloud },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleVersionChange = (module: string, isEnhanced: boolean) => {
    setEnhancedVersions(prev => ({
      ...prev,
      [module]: isEnhanced
    }));
  };

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <LazyDashboard />;
      case 'sales':
        return enhancedVersions.sales ? <LazyEnhancedPOSSystem /> : <LazyPOSSystem />;
      case 'inventory':
        return enhancedVersions.inventory ? <LazyEnhancedInventoryManagement /> : <LazyInventoryManagement />;
      case 'purchases':
        return enhancedVersions.purchases ? <LazyEnhancedPurchaseManagement /> : <LazyPurchaseManagement />;
      case 'customers':
        return <LazyCustomerManagement />;
      case 'expenses':
        return <LazyExpenseTracking />;
      case 'payroll':
        return <LazyPayrollManagement />;
      case 'accounting':
        return enhancedVersions.accounting ? <LazyEnhancedAccountingManagement /> : <LazyAccountingManagement />;
      case 'reports':
        return enhancedVersions.reports ? <LazyEnhancedReportsDashboard /> : <LazyReportsDashboard />;
      case 'bir':
        return <LazyBIRForms />;
      case 'branches':
        return <LazyBranchManagement />;
      case 'operations':
        return <LazyManagerOperations />;
      case 'cashier':
        return <LazyCashierPOS />;
      case 'marketing':
        return <LazyMarketingCampaigns />;
      case 'loyalty':
        return <LazyLoyaltyPrograms />;
      case 'backup':
        return <LazyCloudBackup />;
      case 'settings':
        return <LazySettingsPage />;
      default:
        return <LazyDashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <ProtectedRoute>
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
            <div className="p-6">
              {/* Supabase Authentication Banner */}
              <SupabaseAuthBanner />
              
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