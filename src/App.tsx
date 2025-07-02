import React, { useState } from 'react';
import { 
  BarChart3, 
  ShoppingCart, 
  Package, 
  Receipt, 
  Users, 
  Calculator, 
  TrendingUp, 
  Settings,
  Home,
  DollarSign,
  FileText,
  UserCheck,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import POSSystem from './components/pos/POSSystem';
import InventoryManagement from './components/inventory/InventoryManagement';
import PurchaseManagement from './components/purchases/PurchaseManagement';
import ExpenseTracking from './components/expenses/ExpenseTracking';
import AccountingManagement from './components/accounting/AccountingManagement';
import PayrollManagement from './components/payroll/PayrollManagement';
import ReportsDashboard from './components/reports/ReportsDashboard';
import BIRForms from './components/bir/BIRForms';
import BranchManagement from './components/branches/BranchManagement';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState('dashboard');

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
        return <Dashboard />;
      case 'sales':
        return <POSSystem />;
      case 'inventory':
        return <InventoryManagement />;
      case 'purchases':
        return <PurchaseManagement />;
      case 'customers':
        return <div className="p-6"><h2 className="text-2xl font-bold">Customer Management</h2><p className="text-gray-600 mt-2">CRM system coming soon...</p></div>;
      case 'expenses':
        return <ExpenseTracking />;
      case 'payroll':
        return <PayrollManagement />;
      case 'accounting':
        return <AccountingManagement />;
      case 'reports':
        return <ReportsDashboard />;
      case 'bir':
        return <BIRForms />;
      case 'branches':
        return <BranchManagement />;
      case 'settings':
        return <div className="p-6"><h2 className="text-2xl font-bold">Settings</h2><p className="text-gray-600 mt-2">System configuration coming soon...</p></div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
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
          <main className="flex-1 overflow-y-auto">
            {renderContent()}
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
    </ProtectedRoute>
  );
};

export default App;