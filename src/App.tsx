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
  FileSpreadsheet
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { useToastStore } from './store/toastStore';
import { useThemeStore } from './store/themeStore';
import {
  LazyDashboard,
  LazyPOSSystem,
  LazyInventoryManagement,
  LazyPurchaseManagement,
  LazyExpenseTracking,
  LazyAccountingManagement,
  LazyPayrollManagement,
  LazyReportsDashboard,
  LazyBIRForms,
  LazyBranchManagement,
  LazySettingsPage,
  LazyCustomerManagement
} from './utils/lazyComponents';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');
  const { toasts, removeToast } = useToastStore();
  const { initializeTheme } = useThemeStore();

  // Initialize theme on app load
  useEffect(() => {
    initializeTheme();
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
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <LazyDashboard />;
      case 'sales':
        return <LazyPOSSystem />;
      case 'inventory':
        return <LazyInventoryManagement />;
      case 'purchases':
        return <LazyPurchaseManagement />;
      case 'customers':
        return <LazyCustomerManagement />;
      case 'expenses':
        return <LazyExpenseTracking />;
      case 'payroll':
        return <LazyPayrollManagement />;
      case 'accounting':
        return <LazyAccountingManagement />;
      case 'reports':
        return <LazyReportsDashboard />;
      case 'bir':
        return <LazyBIRForms />;
      case 'branches':
        return <LazyBranchManagement />;
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
            <Suspense fallback={<LoadingSpinner message="Loading module..." size="lg" className="min-h-[400px]" />}>
              {renderContent()}
            </Suspense>
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
        
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </ProtectedRoute>
    </ErrorBoundary>
  );
};

export default App;