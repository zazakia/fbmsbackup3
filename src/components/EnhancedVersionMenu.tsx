import React, { useState } from 'react';
import {
  Zap,
  Star,
  ChevronDown,
  ChevronRight,
  Package,
  ShoppingCart,
  Calculator,
  Receipt,
  BarChart3,
  Sparkles
} from 'lucide-react';

interface EnhancedVersionMenuProps {
  enhancedVersions: Record<string, boolean>;
  onVersionChange: (module: string, isEnhanced: boolean) => void;
  activeModule: string;
}

const EnhancedVersionMenu: React.FC<EnhancedVersionMenuProps> = ({
  enhancedVersions,
  onVersionChange,
  activeModule
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  const enhancedModules = [
    {
      id: 'sales',
      name: 'Sales & POS',
      icon: ShoppingCart,
      description: 'Advanced POS with barcode scanning, promotions, and enhanced payments',
      features: [
        'Barcode scanning support',
        'Advanced discounts & promotions',
        'Split payment methods',
        'Customer price tiers',
        'Quick sale shortcuts',
        'Enhanced payment modal'
      ]
    },
    {
      id: 'inventory',
      name: 'Inventory Management',
      icon: Package,
      description: 'Advanced inventory with multi-location, tracking, and analytics',
      features: [
        'Multi-location inventory',
        'Automated reorder points',
        'Batch/lot tracking',
        'Stock transfer workflows',
        'Advanced analytics',
        'Inventory valuation methods'
      ]
    },
    {
      id: 'accounting',
      name: 'Accounting',
      icon: Calculator,
      description: 'Advanced financial management with real-time analytics',
      features: [
        'Advanced financial metrics',
        'Real-time cash flow analysis',
        'Automated reconciliation',
        'Multi-currency support',
        'Financial ratio analysis',
        'Advanced reporting dashboard'
      ]
    },
    {
      id: 'purchases',
      name: 'Purchases',
      icon: Receipt,
      description: 'Advanced procurement with supplier analytics and workflows',
      features: [
        'Supplier performance analytics',
        'Advanced purchase workflows',
        'Automated vendor comparisons',
        'Purchase trend analysis',
        'Contract management',
        'Supplier scorecards'
      ]
    },
    {
      id: 'reports',
      name: 'Reports & Analytics',
      icon: BarChart3,
      description: 'Interactive dashboards with real-time visualization',
      features: [
        'Interactive dashboards',
        'Real-time data visualization',
        'Advanced filtering options',
        'Custom report builder',
        'Multiple export formats',
        'Scheduled report delivery'
      ]
    }
  ];

  const toggleDetails = (moduleId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const enhancedCount = Object.values(enhancedVersions).filter(Boolean).length;

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        >
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span className="hidden md:inline text-sm font-medium">
              Enhanced ({enhancedCount})
            </span>
          </div>
        </button>
      </div>

      {/* Enhanced Versions Panel */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Enhanced Features</h2>
                    <p className="text-sm text-gray-600">Toggle between standard and enhanced versions</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid gap-6">
                {enhancedModules.map((module) => {
                  const Icon = module.icon;
                  const isEnhanced = enhancedVersions[module.id];
                  const isActive = activeModule === module.id;

                  return (
                    <div
                      key={module.id}
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        isActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            isEnhanced ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <Icon className={`h-6 w-6 ${isEnhanced ? 'text-blue-600' : 'text-gray-600'}`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-gray-900">{module.name}</h3>
                              {isActive && (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  Active
                                </span>
                              )}
                              {isEnhanced && (
                                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full flex items-center space-x-1">
                                  <Zap className="h-3 w-3" />
                                  <span>Enhanced</span>
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleDetails(module.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                          >
                            {showDetails[module.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            onClick={() => onVersionChange(module.id, !isEnhanced)}
                            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            style={{
                              backgroundColor: isEnhanced ? '#3B82F6' : '#D1D5DB'
                            }}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isEnhanced ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Enhanced Features Details */}
                      {showDetails[module.id] && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                            <Star className="h-4 w-4 text-orange-500" />
                            <span>Enhanced Features</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {module.features.map((feature, index) => (
                              <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {enhancedCount} of {enhancedModules.length} modules enhanced
                    </p>
                    <p className="text-sm text-blue-700">
                      Enhanced versions include advanced features, better UI, and improved functionality
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EnhancedVersionMenu;