import React from 'react';
import {
  DollarSign,
  CreditCard,
  Monitor,
  Receipt,
  ShoppingCart,
  ShoppingBag,
  BarChart3,
  Package,
  Users,
  FileText,
  Calculator,
  Building2,
  TrendingUp,
  Settings,
  Truck,
  UserCheck
} from 'lucide-react';

interface MainMenuButtonsProps {
  onNavigate: (moduleId: string) => void;
}

interface MenuButton {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleId: string;
  color?: string;
  gradient?: boolean;
  badge?: number;
}

const MainMenuButtons: React.FC<MainMenuButtonsProps> = ({ onNavigate }) => {
  // Main menu buttons grid inspired by TinderaWebPedlerV0
  const menuButtons: MenuButton[] = [
    // Row 1: Core Financial Operations
    { id: 'sales', label: 'Sales & POS', icon: DollarSign, moduleId: 'sales', color: 'purple' },
    { id: 'credit', label: 'Credit Mgmt', icon: CreditCard, moduleId: 'customers', color: 'purple' },
    { id: 'payments', label: 'Payments', icon: Monitor, moduleId: 'accounting', color: 'purple' },
    { id: 'expenses', label: 'Expenses', icon: Receipt, moduleId: 'expenses', color: 'purple' },

    // Row 2: Sales & Inventory  
    { id: 'pos', label: 'Tindera POS', icon: Monitor, moduleId: 'tindera-pos', color: 'purple', gradient: true },
    { id: 'receipts', label: 'Sales History', icon: ShoppingCart, moduleId: 'sales-history', color: 'purple' },
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag, moduleId: 'purchases', color: 'purple' },
    { id: 'reports', label: 'Reports', icon: BarChart3, moduleId: 'reports', color: 'purple' },

    // Row 3: Business Management
    { id: 'inventory', label: 'Inventory', icon: Package, moduleId: 'inventory', color: 'purple' },
    { id: 'customers', label: 'Customers', icon: Users, moduleId: 'customers', color: 'purple' },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, moduleId: 'suppliers', color: 'purple' },
    { id: 'products', label: 'Products', icon: FileText, moduleId: 'inventory', color: 'purple' },

    // Row 4: Advanced Features
    { id: 'accounting', label: 'Accounting', icon: Calculator, moduleId: 'accounting', color: 'purple' },
    { id: 'branches', label: 'Branches', icon: Building2, moduleId: 'branches', color: 'purple' },
    { id: 'payroll', label: 'Payroll', icon: UserCheck, moduleId: 'payroll', color: 'purple' },
    { id: 'settings', label: 'Settings', icon: Settings, moduleId: 'settings', color: 'purple' }
  ];

  const handleButtonClick = (button: MenuButton) => {
    onNavigate(button.moduleId);
  };

  const getButtonStyles = (button: MenuButton) => {
    if (button.gradient) {
      return 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200';
    }
    
    return `bg-purple-100 hover:bg-purple-200 text-purple-600 transition-colors duration-200`;
  };

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-dark-700 transition-colors duration-300">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Quick Access Menu
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Access all business modules with one click
        </p>
      </div>

      {/* Services Grid - 4 columns on desktop, responsive on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {menuButtons.map((button) => (
          <div key={button.id} className="text-center">
            <button
              onClick={() => handleButtonClick(button)}
              className={`w-full h-16 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 ${getButtonStyles(button)} rounded-lg flex items-center justify-center mb-2 mx-auto relative group`}
            >
              <button.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              
              {/* Badge for specific buttons */}
              {button.badge && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {button.badge}
                </div>
              )}
              
              {/* Hover effect overlay */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-10 bg-white transition-opacity duration-200"></div>
            </button>
            
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2 leading-tight">
              {button.label}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-purple-600">₱156.7K</div>
            <div className="text-xs text-gray-500">Today's Sales</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">1,234</div>
            <div className="text-xs text-gray-500">Transactions</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">89%</div>
            <div className="text-xs text-gray-500">Satisfaction</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainMenuButtons;