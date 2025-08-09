import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  ArrowLeft, 
  Navigation, 
  Clock,
  Zap,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import {
  ModuleId,
  ModuleLoadingError as ModuleLoadingErrorType,
  ModuleLoadingErrorType as ErrorType,
  LoadingStateInfo
} from '../../types/moduleLoading';
import { UserRole } from '../../types/auth';
import { fallbackSuggestionService } from '../../services/FallbackSuggestionService';
import { networkRecoveryService } from '../../services/NetworkRecoveryService';

interface ModuleLoadingErrorProps {
  error: ModuleLoadingErrorType;
  userRole: UserRole;
  loadingState?: LoadingStateInfo;
  onRetry?: () => void;
  onFallbackNavigate?: (moduleId: ModuleId) => void;
  onDashboardNavigate?: () => void;
  onContactSupport?: () => void;
  showRetryButton?: boolean;
  showFallbackOptions?: boolean;
  showTechnicalDetails?: boolean;
}

/**
 * ModuleLoadingError Component
 * 
 * Comprehensive error UI component with retry and fallback options.
 * Features:
 * - Context-aware error messages based on error type
 * - Retry functionality with loading state feedback
 * - Intelligent fallback suggestions
 * - Network-aware recovery recommendations
 * - Progressive disclosure of technical details
 * - Accessibility-compliant error handling
 */
const ModuleLoadingError: React.FC<ModuleLoadingErrorProps> = ({
  error,
  userRole,
  loadingState,
  onRetry,
  onFallbackNavigate,
  onDashboardNavigate,
  onContactSupport,
  showRetryButton = true,
  showFallbackOptions = true,
  showTechnicalDetails = false
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showFallbacks, setShowFallbacks] = useState(false);
  const [showDetails, setShowDetails] = useState(showTechnicalDetails);
  const [fallbackSuggestions, setFallbackSuggestions] = useState<any[]>([]);
  const [networkRecovery, setNetworkRecovery] = useState<any>(null);

  // Load fallback suggestions
  useEffect(() => {
    const suggestions = fallbackSuggestionService.getFallbackSuggestions(
      error.moduleId,
      userRole,
      error,
      3
    );
    setFallbackSuggestions(suggestions);

    // Get network recovery options if it's a network-related error
    if ([ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR, ErrorType.OFFLINE_ERROR].includes(error.type)) {
      const recovery = networkRecoveryService.getNetworkAwareRetryStrategy(error.moduleId, error);
      setNetworkRecovery(recovery);
    }
  }, [error, userRole]);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleFallbackClick = (moduleId: ModuleId) => {
    if (onFallbackNavigate) {
      onFallbackNavigate(moduleId);
    }
  };

  const canRetry = () => {
    if (networkRecovery) {
      return networkRecovery.shouldRetry;
    }
    return error.recoverable && error.retryCount < error.maxRetries && showRetryButton;
  };

  const getErrorIcon = () => {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
      case ErrorType.OFFLINE_ERROR:
        return <Zap className="h-16 w-16 text-orange-500" />;
      case ErrorType.TIMEOUT_ERROR:
        return <Clock className="h-16 w-16 text-yellow-500" />;
      case ErrorType.PERMISSION_DENIED:
      case ErrorType.ROLE_INSUFFICIENT:
        return <AlertTriangle className="h-16 w-16 text-red-500" />;
      default:
        return <AlertTriangle className="h-16 w-16 text-red-500" />;
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
      case ErrorType.OFFLINE_ERROR:
        return 'orange';
      case ErrorType.TIMEOUT_ERROR:
        return 'yellow';
      case ErrorType.PERMISSION_DENIED:
      case ErrorType.ROLE_INSUFFICIENT:
        return 'red';
      default:
        return 'red';
    }
  };

  const getRetryButtonText = () => {
    if (isRetrying) return 'Retrying...';
    if (networkRecovery?.strategy?.includes('offline')) return 'Retry When Online';
    return `Try Again${error.retryCount > 0 ? ` (${error.retryCount + 1}/${error.maxRetries})` : ''}`;
  };

  const getModuleDisplayName = (moduleId: ModuleId): string => {
    const displayNames: Record<ModuleId, string> = {
      dashboard: 'Dashboard',
      pos: 'Point of Sale',
      inventory: 'Inventory Management',
      accounting: 'Accounting',
      expenses: 'Expense Tracking',
      purchases: 'Purchase Management',
      payroll: 'Payroll Management',
      'bir-forms': 'BIR Forms',
      sales: 'Sales History',
      customers: 'Customer Management',
      'manager-operations': 'Manager Operations',
      marketing: 'Marketing Campaigns',
      loyalty: 'Loyalty Programs',
      gcash: 'GCash Integration',
      paymaya: 'PayMaya Integration',
      'cloud-backup': 'Cloud Backup',
      'electronic-receipts': 'Electronic Receipts',
      'product-history': 'Product History',
      branches: 'Branch Management',
      settings: 'Settings',
      help: 'Help & Support',
      reports: 'Reports & Analytics'
    };

    return displayNames[moduleId] || moduleId;
  };

  const errorColor = getErrorColor();
  const moduleDisplayName = getModuleDisplayName(error.moduleId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* Error Icon and Title */}
        <div className="text-center mb-6">
          {getErrorIcon()}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 mt-4">
            Unable to Load {moduleDisplayName}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            {error.message}
          </p>
        </div>

        {/* Network Status for Network Errors */}
        {(error.type === ErrorType.NETWORK_ERROR || 
          error.type === ErrorType.OFFLINE_ERROR ||
          error.type === ErrorType.TIMEOUT_ERROR) && (
          <div className={`mb-6 p-4 bg-${errorColor}-100 dark:bg-${errorColor}-900/20 rounded-lg border-l-4 border-${errorColor}-500`}>
            <div className="flex items-start">
              <Zap className={`h-5 w-5 text-${errorColor}-600 mt-0.5 mr-3 flex-shrink-0`} />
              <div>
                <h3 className={`text-sm font-semibold text-${errorColor}-800 dark:text-${errorColor}-200 mb-1`}>
                  Connection Issue Detected
                </h3>
                <p className={`text-sm text-${errorColor}-700 dark:text-${errorColor}-300`}>
                  {error.type === ErrorType.OFFLINE_ERROR 
                    ? '🔴 You are currently offline'
                    : error.type === ErrorType.TIMEOUT_ERROR
                    ? '⏱️ The module took too long to load'
                    : '🟡 Network connection issues detected'}
                </p>
                {networkRecovery && (
                  <p className={`text-xs text-${errorColor}-600 dark:text-${errorColor}-400 mt-1`}>
                    {networkRecovery.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State Information */}
        {loadingState && (
          <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Loading Progress
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {loadingState.progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingState.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {loadingState.message}
            </p>
            {loadingState.estimatedTimeRemaining && loadingState.estimatedTimeRemaining > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Estimated time remaining: {Math.ceil(loadingState.estimatedTimeRemaining / 1000)}s
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          {/* Retry Button */}
          {canRetry() && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{getRetryButtonText()}</span>
            </button>
          )}

          {/* Dashboard Button */}
          <button
            onClick={onDashboardNavigate}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go to Dashboard</span>
          </button>

          {/* Show Fallback Options */}
          {showFallbackOptions && fallbackSuggestions.length > 0 && (
            <button
              onClick={() => setShowFallbacks(!showFallbacks)}
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              <Navigation className="h-4 w-4" />
              <span>
                {showFallbacks ? 'Hide Alternative Modules' : 'Show Alternative Modules'}
              </span>
            </button>
          )}
        </div>

        {/* Fallback Module Options */}
        {showFallbacks && fallbackSuggestions.length > 0 && (
          <div className="mb-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Try these alternatives:
            </h3>
            <div className="grid gap-3">
              {fallbackSuggestions.map((suggestion) => (
                <button
                  key={suggestion.moduleId}
                  onClick={() => handleFallbackClick(suggestion.moduleId)}
                  disabled={!suggestion.available}
                  className={`text-left px-4 py-3 rounded-lg transition-colors ${
                    suggestion.available
                      ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800'
                      : 'bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed border border-gray-200 dark:border-gray-600'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`font-medium ${
                        suggestion.available 
                          ? 'text-green-800 dark:text-green-200' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {suggestion.displayName}
                      </span>
                      <p className={`text-xs mt-1 ${
                        suggestion.available 
                          ? 'text-green-600 dark:text-green-300' 
                          : 'text-gray-500 dark:text-gray-500'
                      }`}>
                        {suggestion.reason}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {suggestion.available && (
                        <ExternalLink className="h-3 w-3 text-green-600 dark:text-green-400" />
                      )}
                      {!suggestion.available && (
                        <span className="text-xs text-gray-500 dark:text-gray-500">Unavailable</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Technical Details */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded"
          >
            <HelpCircle className="h-4 w-4" />
            <span>{showDetails ? 'Hide' : 'Show'} Technical Details</span>
          </button>

          {showDetails && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Error Details</p>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Type: {error.type}</p>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Module: {error.moduleId}</p>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Retry Count: {error.retryCount}/{error.maxRetries}</p>
                  <p className="text-gray-600 dark:text-gray-400">Recoverable: {error.recoverable ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Session Info</p>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Timestamp: {error.timestamp.toLocaleString()}</p>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">User Role: {error.userRole}</p>
                  <p className="text-gray-600 dark:text-gray-400">Error ID: {error.timestamp.getTime().toString(36)}</p>
                </div>
              </div>
              
              {error.originalError && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Original Error</p>
                  <p className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all">
                    {error.originalError.message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Support Contact */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            If this problem persists, please contact support.
          </p>
          {onContactSupport && (
            <button
              onClick={onContactSupport}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            >
              Contact Support
            </button>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Error ID: {error.timestamp.getTime().toString(36)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModuleLoadingError;