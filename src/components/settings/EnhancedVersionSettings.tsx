import React from 'react';
import { 
  CheckCircle,
  Info,
  Zap,
  ShoppingCart,
  Package,
  Calculator,
  Receipt,
  BarChart3
} from 'lucide-react';

const EnhancedVersionSettings: React.FC = () => {
  const modules = [
    {
      id: 'sales',
      name: 'Sales & POS',
      icon: ShoppingCart,
      description: 'Advanced POS interface with enhanced checkout flow, integrated payment options, and real-time inventory updates.',
      features: ['Advanced checkout UI', 'Multiple payment methods', 'Real-time inventory sync', 'Customer loyalty integration']
    },
    {
      id: 'inventory',
      name: 'Inventory Management',
      icon: Package,
      description: 'Enhanced inventory management with barcode scanning, automated reorder points, and advanced analytics.',
      features: ['Barcode scanning', 'Automated reorders', 'Batch operations', 'Advanced analytics']
    },
    {
      id: 'accounting',
      name: 'Accounting',
      icon: Calculator,
      description: 'Comprehensive accounting with automated journal entries, financial statements, and tax calculations.',
      features: ['Automated entries', 'Financial statements', 'Tax calculations', 'Advanced reporting']
    },
    {
      id: 'purchases',
      name: 'Purchase Management',
      icon: Receipt,
      description: 'Advanced purchase order management with vendor comparisons, automated approvals, and integration.',
      features: ['Vendor comparisons', 'Automated approvals', 'Purchase analytics', 'Supplier integration']
    },
    {
      id: 'reports',
      name: 'Reports & Analytics',
      icon: BarChart3,
      description: 'Advanced reporting with custom dashboards, predictive analytics, and export options.',
      features: ['Custom dashboards', 'Predictive analytics', 'Advanced charts', 'Multiple export formats']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Enhanced Modules</h2>
            <p className="text-primary-100">All modules are now running in enhanced mode</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Enhanced Features Active</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              All modules have been upgraded to enhanced versions with advanced features and improved functionality. 
              Standard versions have been retired to provide a better user experience.
            </p>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="grid gap-6 lg:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <div
              key={module.id}
              className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-6 shadow-sm"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{module.name}</h3>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">Enhanced</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {module.description}
                  </p>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Enhanced Features:
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {module.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-1 h-1 bg-primary-600 rounded-full flex-shrink-0"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnhancedVersionSettings;