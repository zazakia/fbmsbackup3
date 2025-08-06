import React from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { StockValidationError } from '../../utils/stockValidation';

interface StockValidationAlertProps {
  errors: StockValidationError[];
  warnings?: StockValidationError[];
  onClose?: () => void;
  className?: string;
}

const StockValidationAlert: React.FC<StockValidationAlertProps> = ({
  errors,
  warnings = [],
  onClose,
  className = ''
}) => {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  const getIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getErrorTypeColor = (code: StockValidationError['code']) => {
    switch (code) {
      case 'INSUFFICIENT_STOCK':
        return 'border-yellow-200 bg-yellow-50';
      case 'NEGATIVE_STOCK':
        return 'border-red-200 bg-red-50';
      case 'PRODUCT_NOT_FOUND':
        return 'border-red-200 bg-red-50';
      case 'INVALID_QUANTITY':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatErrorMessage = (error: StockValidationError) => {
    switch (error.code) {
      case 'INSUFFICIENT_STOCK':
        return `${error.productName}: Not enough stock available (${error.availableStock} available, ${error.requestedQuantity} requested)`;
      case 'NEGATIVE_STOCK':
        return `${error.productName}: This operation would result in negative stock`;
      case 'PRODUCT_NOT_FOUND':
        return `Product not found or has been removed from inventory`;
      case 'INVALID_QUANTITY':
        return `${error.productName}: Invalid quantity specified (${error.requestedQuantity})`;
      default:
        return error.message;
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {getIcon('error')}
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 mb-2">
                  Cannot Complete Transaction
                </h4>
                <div className="space-y-2">
                  {errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700">
                      <div className="font-medium">
                        {formatErrorMessage(error)}
                      </div>
                      {error.suggestions && error.suggestions.length > 0 && (
                        <div className="mt-1 ml-4">
                          <div className="text-xs text-red-600 font-medium mb-1">Suggestions:</div>
                          <ul className="text-xs text-red-600 space-y-1">
                            {error.suggestions.map((suggestion, suggestionIndex) => (
                              <li key={suggestionIndex} className="flex items-start">
                                <span className="mr-1">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {warnings.length > 0 && (
        <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {getIcon('warning')}
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  Stock Warnings
                </h4>
                <div className="space-y-2">
                  {warnings.map((warning, index) => (
                    <div key={index} className="text-sm text-yellow-700">
                      <div className="font-medium">
                        {formatErrorMessage(warning)}
                      </div>
                      {warning.suggestions && warning.suggestions.length > 0 && (
                        <div className="mt-1 ml-4">
                          <div className="text-xs text-yellow-600 font-medium mb-1">Recommendations:</div>
                          <ul className="text-xs text-yellow-600 space-y-1">
                            {warning.suggestions.map((suggestion, suggestionIndex) => (
                              <li key={suggestionIndex} className="flex items-start">
                                <span className="mr-1">•</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-yellow-400 hover:text-yellow-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StockValidationAlert;