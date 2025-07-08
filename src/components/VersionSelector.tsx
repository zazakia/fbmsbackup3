import React, { useState } from 'react';
import { 
  Zap, 
  Star, 
  Settings, 
  Eye,
  ChevronDown,
  ChevronUp,
  Package,
  ShoppingCart,
  Calculator,
  Receipt,
  BarChart3
} from 'lucide-react';

interface VersionSelectorProps {
  currentModule: string;
  onVersionChange: (isEnhanced: boolean) => void;
  isEnhanced: boolean;
}

const VersionSelector: React.FC<VersionSelectorProps> = ({
  currentModule,
  onVersionChange,
  isEnhanced
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Map modules to their enhanced availability
  const enhancedModules = {
    'sales': {
      name: 'Sales & POS',
      icon: ShoppingCart,
      hasEnhanced: true,
      enhancements: [
        'Barcode scanning support',
        'Advanced discounts & promotions',
        'Split payment methods',
        'Enhanced payment modal',
        'Customer price tiers',
        'Quick sale shortcuts'
      ]
    },
    'inventory': {
      name: 'Inventory Management',
      icon: Package,
      hasEnhanced: true,
      enhancements: [
        'Advanced stock movement tracking',
        'Multi-location inventory',
        'Automated reorder points',
        'Inventory valuation methods',
        'Batch/lot tracking',
        'Stock transfer workflows'
      ]
    },
    'accounting': {
      name: 'Accounting',
      icon: Calculator,
      hasEnhanced: true,
      enhancements: [
        'Advanced financial metrics',
        'Real-time cash flow analysis',
        'Automated account reconciliation',
        'Multi-currency support',
        'Advanced reporting dashboard',
        'Financial ratio analysis'
      ]
    },
    'purchases': {
      name: 'Purchases',
      icon: Receipt,
      hasEnhanced: true,
      enhancements: [
        'Supplier performance analytics',
        'Advanced purchase workflows',
        'Automated vendor comparisons',
        'Purchase trend analysis',
        'Contract management',
        'Supplier scorecards'
      ]
    },
    'reports': {
      name: 'Reports & Analytics',
      icon: BarChart3,
      hasEnhanced: true,
      enhancements: [
        'Interactive dashboards',
        'Real-time data visualization',
        'Advanced filtering options',
        'Custom report builder',
        'Export to multiple formats',
        'Scheduled report delivery'
      ]
    }
  };

  const currentModuleInfo = enhancedModules[currentModule as keyof typeof enhancedModules];

  // Don't show for modules without enhanced versions
  if (!currentModuleInfo?.hasEnhanced) {
    return null;
  }

  const Icon = currentModuleInfo.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentModuleInfo.name}</h3>
              <p className="text-sm text-gray-600">
                {isEnhanced ? 'Enhanced Version' : 'Standard Version'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Eye className="h-4 w-4" />
              <span>Features</span>
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">Standard</span>
              <button
                onClick={() => onVersionChange(!isEnhanced)}
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
              <span className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                <Zap className="h-3 w-3 text-orange-500" />
                <span>Enhanced</span>
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Features Details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-gray-600" />
                  <span>Standard Features</span>
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Core functionality</li>
                  <li>• Basic operations</li>
                  <li>• Essential reporting</li>
                  <li>• Standard UI</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <Star className="h-4 w-4 text-orange-500" />
                  <span>Enhanced Features</span>
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {currentModuleInfo.enhancements.slice(0, 4).map((enhancement, index) => (
                    <li key={index}>• {enhancement}</li>
                  ))}
                  {currentModuleInfo.enhancements.length > 4 && (
                    <li className="text-blue-600">• +{currentModuleInfo.enhancements.length - 4} more features</li>
                  )}
                </ul>
              </div>
            </div>
            
            {isEnhanced && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Enhanced version active with advanced features and improved UI
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionSelector;