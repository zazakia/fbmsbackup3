import React from 'react';
import { ShoppingCart, Package, Receipt, FileText } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { canAccessModule } from '../utils/permissions';

const QuickActions: React.FC = () => {
  const { onModuleChange } = useNavigation();
  const { user } = useSupabaseAuthStore();

  const actions = [
    { 
      icon: ShoppingCart, 
      label: 'New Sale', 
      color: 'bg-blue-500 hover:bg-blue-600',
      moduleId: 'sales',
      module: 'pos'
    },
    { 
      icon: Package, 
      label: 'Add Product', 
      color: 'bg-green-500 hover:bg-green-600',
      moduleId: 'inventory',
      module: 'inventory'
    },
    { 
      icon: Receipt, 
      label: 'Record Expense', 
      color: 'bg-purple-500 hover:bg-purple-600',
      moduleId: 'expenses',
      module: 'expenses'
    },
    { 
      icon: FileText, 
      label: 'Generate Report', 
      color: 'bg-indigo-500 hover:bg-indigo-600',
      moduleId: 'reports',
      module: 'reports'
    }
  ];

  const handleActionClick = (action: typeof actions[0]) => {
    // Check if user has permission to access this module
    if (user && !canAccessModule(user.role, action.module)) {
      return; // Don't navigate if no permission
    }
    onModuleChange(action.moduleId);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => {
          const hasPermission = !user || canAccessModule(user.role, action.module);
          return (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              disabled={!hasPermission}
              className={`${
                hasPermission 
                  ? `${action.color} hover:shadow-md` 
                  : 'bg-gray-300 cursor-not-allowed'
              } text-white p-4 rounded-lg transition-colors flex flex-col items-center space-y-2`}
              title={hasPermission ? `Go to ${action.label}` : `No permission to access ${action.label}`}
            >
              <action.icon className="h-6 w-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Activities</h3>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
            Sale #1234 completed
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
            New product added
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
            Expense recorded
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;