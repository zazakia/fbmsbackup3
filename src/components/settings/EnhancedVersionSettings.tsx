import React from 'react';
import { 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  RotateCcw, 
  CheckCircle,
  Info,
  Zap,
  Star,
  ShoppingCart,
  Package,
  Calculator,
  Receipt,
  BarChart3
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';

const EnhancedVersionSettings: React.FC = () => {
  const { enhancedVersions, setEnhancedVersion, resetToDefaults, toggleAllEnhanced } = useSettingsStore();
  const { addToast } = useToastStore();

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

  const handleToggle = (moduleId: string, isEnhanced: boolean) => {
    setEnhancedVersion(moduleId, isEnhanced);
    addToast({
      type: 'success',
      title: 'Settings Updated',
      message: `${modules.find(m => m.id === moduleId)?.name} ${isEnhanced ? 'enhanced' : 'standard'} version enabled`
    });
  };

  const handleResetToDefaults = () => {
    resetToDefaults();
    addToast({
      type: 'info',
      title: 'Settings Reset',
      message: 'All modules reset to enhanced versions (default)'
    });
  };

  const handleToggleAll = (enabled: boolean) => {
    toggleAllEnhanced(enabled);
    addToast({
      type: 'success',
      title: 'Bulk Update',
      message: `All modules set to ${enabled ? 'enhanced' : 'standard'} versions`
    });
  };

  const enhancedCount = Object.values(enhancedVersions).filter(Boolean).length;
  const totalModules = modules.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Enhanced Version Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Toggle between standard and enhanced versions of modules
            </p>
          </div>
        </div>

        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Enhanced modules: </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {enhancedCount} of {totalModules}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(enhancedCount / totalModules) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round((enhancedCount / totalModules) * 100)}%
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleToggleAll(true)}
              className="flex items-center px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Zap className="h-4 w-4 mr-1" />
              All Enhanced
            </button>
            <button
              onClick={() => handleToggleAll(false)}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Standard
            </button>
            <button
              onClick={handleResetToDefaults}
              className="flex items-center px-3 py-1.5 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-800 dark:text-amber-200 font-medium mb-1">
              About Enhanced Versions
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              Enhanced versions include advanced features, better UI/UX, and additional functionality. 
              Standard versions provide basic functionality with a simpler interface. Changes take effect immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Module Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          const isEnhanced = enhancedVersions[module.id as keyof typeof enhancedVersions];

          return (
            <div
              key={module.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              {/* Module Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isEnhanced 
                      ? 'bg-blue-100 dark:bg-blue-900/30' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      isEnhanced 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {module.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isEnhanced
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {isEnhanced ? 'Enhanced' : 'Standard'}
                      </span>
                      {isEnhanced && (
                        <Star className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(module.id, !isEnhanced)}
                  className={`p-1 rounded-full transition-colors ${
                    isEnhanced
                      ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {isEnhanced ? (
                    <ToggleRight className="h-8 w-8" />
                  ) : (
                    <ToggleLeft className="h-8 w-8" />
                  )}
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {module.description}
              </p>

              {/* Features */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Enhanced Features
                </h4>
                <div className="space-y-1">
                  {module.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className={`h-3 w-3 ${
                        isEnhanced 
                          ? 'text-green-500' 
                          : 'text-gray-300 dark:text-gray-600'
                      }`} />
                      <span className={`text-xs ${
                        isEnhanced 
                          ? 'text-gray-700 dark:text-gray-300' 
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4 border-t border-gray-200 dark:border-gray-700">
        <p>
          Enhanced versions are enabled by default for the best experience. 
          You can switch to standard versions if you prefer simpler interfaces.
        </p>
      </div>
    </div>
  );
};

export default EnhancedVersionSettings;