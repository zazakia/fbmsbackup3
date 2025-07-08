import React from 'react';
import { Eye, EyeOff, Menu, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

interface MenuItem {
  id: string;
  label: string;
  description: string;
  category: string;
}

const MenuVisibilitySettings: React.FC = () => {
  const { menuVisibility, setMenuVisibility, toggleAllMenus } = useSettingsStore();

  const menuItems: MenuItem[] = [
    // Core Modules
    { id: 'dashboard', label: 'Dashboard', description: 'Main dashboard and overview', category: 'Core' },
    { id: 'settings', label: 'Settings', description: 'System configuration and preferences', category: 'Core' },
    
    // Business Operations
    { id: 'sales', label: 'Sales & POS', description: 'Point of sale system and sales management', category: 'Operations' },
    { id: 'inventory', label: 'Inventory', description: 'Stock management and tracking', category: 'Operations' },
    { id: 'purchases', label: 'Purchases', description: 'Purchase orders and supplier management', category: 'Operations' },
    { id: 'customers', label: 'Customers', description: 'Customer information and management', category: 'Operations' },
    { id: 'customerTransactions', label: 'Customer Transactions', description: 'Customer transaction history', category: 'Operations' },
    { id: 'suppliers', label: 'Suppliers', description: 'Supplier management and contacts', category: 'Operations' },
    
    // Financial
    { id: 'expenses', label: 'Expenses', description: 'Expense tracking and management', category: 'Financial' },
    { id: 'payroll', label: 'Payroll', description: 'Employee payroll and compensation', category: 'Financial' },
    { id: 'accounting', label: 'Accounting', description: 'Financial accounting and bookkeeping', category: 'Financial' },
    { id: 'reports', label: 'Reports & Analytics', description: 'Business reports and analytics', category: 'Financial' },
    { id: 'bir', label: 'BIR Forms', description: 'Philippine tax forms and compliance', category: 'Financial' },
    
    // Management
    { id: 'branches', label: 'Multi-Branch', description: 'Multiple branch management', category: 'Management' },
    { id: 'operations', label: 'Operations', description: 'Operational management tools', category: 'Management' },
    { id: 'cashier', label: 'Cashier POS', description: 'Dedicated cashier interface', category: 'Management' },
    { id: 'marketing', label: 'Marketing', description: 'Marketing campaigns and promotions', category: 'Management' },
    { id: 'loyalty', label: 'Loyalty Programs', description: 'Customer loyalty and rewards', category: 'Management' },
    
    // System
    { id: 'backup', label: 'Cloud Backup', description: 'Data backup and recovery', category: 'System' },
    { id: 'testing', label: 'Testing Suite', description: 'System testing and diagnostics', category: 'System' },
    
    // Admin Only
    { id: 'adminDashboard', label: 'Admin Dashboard', description: 'Administrative control panel', category: 'Admin' },
    { id: 'userRoles', label: 'User Role Management', description: 'User permissions and roles', category: 'Admin' },
    { id: 'dataHistory', label: 'Data History', description: 'System data history and tracking', category: 'Admin' },
  ];

  const categories = ['Core', 'Operations', 'Financial', 'Management', 'System', 'Admin'];

  const handleToggle = (menuId: string) => {
    setMenuVisibility(menuId, !menuVisibility[menuId as keyof typeof menuVisibility]);
  };

  const handleToggleAll = (visible: boolean) => {
    toggleAllMenus(visible);
  };

  const getVisibleCount = () => {
    return Object.values(menuVisibility).filter(Boolean).length;
  };

  const getTotalCount = () => {
    return Object.keys(menuVisibility).length;
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Menu className="h-5 w-5" />
          Menu Visibility Settings
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Control which menu items appear in the side navigation
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="font-medium text-gray-900">Menu Items</h4>
            <p className="text-sm text-gray-600">
              {getVisibleCount()} of {getTotalCount()} menu items visible
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleToggleAll(true)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              Show All
            </button>
            <button
              onClick={() => handleToggleAll(false)}
              className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1"
            >
              <EyeOff className="h-4 w-4" />
              Hide All
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {categories.map(category => (
            <div key={category} className="space-y-3">
              <h5 className="font-medium text-gray-800 text-sm uppercase tracking-wide">
                {category}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {menuItems
                  .filter(item => item.category === category)
                  .map(item => {
                    const isVisible = menuVisibility[item.id as keyof typeof menuVisibility];
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border transition-all ${
                          isVisible 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h6 className="font-medium text-gray-900 text-sm">
                                {item.label}
                              </h6>
                              {isVisible ? (
                                <Eye className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {item.description}
                            </p>
                          </div>
                          <button
                            onClick={() => handleToggle(item.id)}
                            className={`ml-3 transition-colors ${
                              isVisible ? 'text-green-600' : 'text-gray-400'
                            }`}
                          >
                            {isVisible ? (
                              <ToggleRight className="h-6 w-6" />
                            ) : (
                              <ToggleLeft className="h-6 w-6" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="font-medium text-blue-900">Menu Visibility Information</h5>
              <p className="text-sm text-blue-700 mt-1">
                Changes take effect immediately. Hidden menu items will not appear in the side navigation,
                but you can still access them if you have the direct URL.
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• Settings and Dashboard cannot be hidden (core functionality)</li>
                <li>• Menu visibility is saved per user</li>
                <li>• Admin menus are only visible to users with admin permissions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuVisibilitySettings;