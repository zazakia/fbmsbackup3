import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  ArrowLeft,
  Signal,
  AlertTriangle,
  Clock,
  Zap,
  Settings,
  HelpCircle,
  CheckCircle
} from 'lucide-react';
import {
  ModuleId,
  ModuleLoadingError,
  NetworkCondition
} from '../../types/moduleLoading';
import { networkRecoveryService } from '../../services/NetworkRecoveryService';

interface NetworkErrorUIProps {
  error: ModuleLoadingError;
  onRetry?: () => void;
  onOfflineRetry?: () => void;
  onDashboardNavigate?: () => void;
  onNetworkSettings?: () => void;
  showNetworkDiagnostics?: boolean;
  showRecoveryTips?: boolean;
}

/**
 * NetworkErrorUI Component
 * 
 * Specialized error UI for offline/slow connection scenarios.
 * Features:
 * - Real-time network status monitoring
 * - Connection quality indicators and recommendations
 * - Offline mode handling with queued retry
 * - Network diagnostics and troubleshooting tips
 * - Adaptive retry strategies based on connection quality
 * - Recovery time estimation and progress tracking
 */
const NetworkErrorUI: React.FC<NetworkErrorUIProps> = ({
  error,
  onRetry,
  onOfflineRetry,
  onDashboardNavigate,
  onNetworkSettings,
  showNetworkDiagnostics = true,
  showRecoveryTips = true
}) => {
  const [networkStatus, setNetworkStatus] = useState(networkRecoveryService.getNetworkStatus());
  const [offlineStatus, setOfflineStatus] = useState(networkRecoveryService.getOfflineStatus());
  const [slowConnectionHelp, setSlowConnectionHelp] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState<NetworkCondition[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [estimatedRecoveryTime, setEstimatedRecoveryTime] = useState<number>(0);

  // Monitor network status changes
  useEffect(() => {
    const networkUnsubscribe = networkRecoveryService.subscribeToNetworkChanges((status) => {
      setNetworkStatus(status);
      setConnectionHistory(prev => [...prev.slice(-9), status.condition]);
      
      // Update offline status
      setOfflineStatus(networkRecoveryService.getOfflineStatus());
    });

    const offlineUnsubscribe = networkRecoveryService.subscribeToOfflineChanges((isOffline) => {
      setOfflineStatus(networkRecoveryService.getOfflineStatus());
    });

    // Get slow connection handling info
    if (networkStatus.condition === 'poor' || networkStatus.condition === 'fair') {
      const slowHelp = networkRecoveryService.handleSlowConnection(error.moduleId);
      setSlowConnectionHelp(slowHelp);
    }

    return () => {
      networkUnsubscribe();
      offlineUnsubscribe();
    };
  }, [error.moduleId]);

  // Update recovery time estimation
  useEffect(() => {
    if (offlineStatus.estimatedRecoveryTime) {
      setEstimatedRecoveryTime(offlineStatus.estimatedRecoveryTime);
      
      const timer = setInterval(() => {
        setEstimatedRecoveryTime(prev => Math.max(0, prev - 1000));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [offlineStatus.estimatedRecoveryTime]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (networkStatus.online && onRetry) {
        await onRetry();
      } else if (!networkStatus.online && onOfflineRetry) {
        onOfflineRetry();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const getNetworkIcon = () => {
    if (!networkStatus.online) {
      return <WifiOff className="h-16 w-16 text-red-500" />;
    }
    
    switch (networkStatus.condition) {
      case 'excellent':
        return <Wifi className="h-16 w-16 text-green-500" />;
      case 'good':
        return <Signal className="h-16 w-16 text-blue-500" />;
      case 'fair':
        return <Signal className="h-16 w-16 text-yellow-500" />;
      case 'poor':
        return <Signal className="h-16 w-16 text-orange-500" />;
      default:
        return <AlertTriangle className="h-16 w-16 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    if (!networkStatus.online) return 'red';
    
    switch (networkStatus.condition) {
      case 'excellent': return 'green';
      case 'good': return 'blue';
      case 'fair': return 'yellow';
      case 'poor': return 'orange';
      default: return 'gray';
    }
  };

  const getStatusMessage = () => {
    if (offlineStatus.isOffline) {
      return offlineStatus.message;
    }
    
    switch (networkStatus.condition) {
      case 'excellent':
        return 'Excellent connection detected. The module should load quickly.';
      case 'good':
        return 'Good connection detected. The module should load normally.';
      case 'fair':
        return 'Fair connection detected. Loading may be slower than usual.';
      case 'poor':
        return 'Poor connection detected. Using optimized loading strategy.';
      default:
        return 'Connection quality unknown. Using conservative loading approach.';
    }
  };

  const moduleDisplayName = getModuleDisplayName(error.moduleId);
  const statusColor = getStatusColor();
  const canRetry = networkStatus.online || onOfflineRetry;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        {/* Network Status Header */}
        <div className="text-center mb-6">
          {getNetworkIcon()}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 mt-4">
            Network Connection Issue
          </h1>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {moduleDisplayName} Failed to Load
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {error.message}
          </p>
        </div>

        {/* Connection Status */}
        <div className={`mb-6 p-4 bg-${statusColor}-100 dark:bg-${statusColor}-900/20 rounded-lg border-l-4 border-${statusColor}-500`}>
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3 mt-0.5">
              {networkStatus.online ? (
                <CheckCircle className={`h-5 w-5 text-${statusColor}-600`} />
              ) : (
                <WifiOff className={`h-5 w-5 text-${statusColor}-600`} />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-semibold text-${statusColor}-800 dark:text-${statusColor}-200 mb-1`}>
                Connection Status: {networkStatus.online ? 'Online' : 'Offline'}
              </h3>
              <p className={`text-sm text-${statusColor}-700 dark:text-${statusColor}-300 mb-2`}>
                {getStatusMessage()}
              </p>
              
              {/* Network Details */}
              {networkStatus.online && (
                <div className="grid grid-cols-2 gap-4 text-xs mt-3">
                  <div>
                    <span className={`font-medium text-${statusColor}-800 dark:text-${statusColor}-200`}>
                      Quality: 
                    </span>
                    <span className={`ml-1 text-${statusColor}-700 dark:text-${statusColor}-300 capitalize`}>
                      {networkStatus.condition}
                    </span>
                  </div>
                  {networkStatus.effectiveType && (
                    <div>
                      <span className={`font-medium text-${statusColor}-800 dark:text-${statusColor}-200`}>
                        Type: 
                      </span>
                      <span className={`ml-1 text-${statusColor}-700 dark:text-${statusColor}-300`}>
                        {networkStatus.effectiveType.toUpperCase()}
                      </span>
                    </div>
                  )}
                  {networkStatus.downlink && (
                    <div>
                      <span className={`font-medium text-${statusColor}-800 dark:text-${statusColor}-200`}>
                        Speed: 
                      </span>
                      <span className={`ml-1 text-${statusColor}-700 dark:text-${statusColor}-300`}>
                        {networkStatus.downlink.toFixed(1)} Mbps
                      </span>
                    </div>
                  )}
                  {networkStatus.rtt && (
                    <div>
                      <span className={`font-medium text-${statusColor}-800 dark:text-${statusColor}-200`}>
                        Latency: 
                      </span>
                      <span className={`ml-1 text-${statusColor}-700 dark:text-${statusColor}-300`}>
                        {networkStatus.rtt}ms
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Offline Recovery Time */}
        {offlineStatus.isOffline && estimatedRecoveryTime > 0 && (
          <div className="mb-6 p-4 bg-orange-100 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                  Estimated Recovery Time
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Connection may be restored in approximately {Math.ceil(estimatedRecoveryTime / 1000)} seconds
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Slow Connection Help */}
        {slowConnectionHelp && (
          <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              <Zap className="h-4 w-4 inline mr-1" />
              Slow Connection Optimization
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
              {slowConnectionHelp.message}
            </p>
            <div className="grid gap-2">
              {slowConnectionHelp.alternativeActions.map((action: any, index: number) => (
                <div key={index} className="flex items-center text-xs">
                  <CheckCircle className="h-3 w-3 text-yellow-600 mr-2 flex-shrink-0" />
                  <span className="text-yellow-800 dark:text-yellow-200">
                    <span className="font-medium">{action.label}:</span> {action.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recovery Recommendations */}
        {showRecoveryTips && (offlineStatus.recommendations.length > 0 || slowConnectionHelp?.alternativeActions) && (
          <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">
              <HelpCircle className="h-4 w-4 inline mr-1" />
              Recovery Recommendations
            </h3>
            <ul className="space-y-2">
              {offlineStatus.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start text-sm">
                  <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-700 dark:text-blue-300">{recommendation}</span>
                </li>
              ))}
              {!networkStatus.online && (
                <>
                  <li className="flex items-start text-sm">
                    <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-700 dark:text-blue-300">
                      Your request will be queued and retried when connection is restored
                    </span>
                  </li>
                  <li className="flex items-start text-sm">
                    <CheckCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-700 dark:text-blue-300">
                      Try accessing cached or offline-capable modules
                    </span>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}

        {/* Connection History (Diagnostics) */}
        {showNetworkDiagnostics && connectionHistory.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded"
            >
              <Settings className="h-4 w-4" />
              <span>{showDiagnostics ? 'Hide' : 'Show'} Network Diagnostics</span>
            </button>

            {showDiagnostics && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Recent Connection History
                </h4>
                <div className="flex items-center space-x-2 mb-3">
                  {connectionHistory.slice(-10).map((condition, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full ${
                        condition === 'excellent' ? 'bg-green-500' :
                        condition === 'good' ? 'bg-blue-500' :
                        condition === 'fair' ? 'bg-yellow-500' :
                        condition === 'poor' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      title={`Connection: ${condition}`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">Current Condition:</span> {networkStatus.condition}
                  </div>
                  <div>
                    <span className="font-medium">Online:</span> {networkStatus.online ? 'Yes' : 'No'}
                  </div>
                  {networkStatus.saveData && (
                    <div className="col-span-2">
                      <span className="font-medium text-orange-600">Data Saver Mode:</span> Active
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          {/* Retry Button */}
          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>
                {isRetrying 
                  ? 'Retrying...' 
                  : networkStatus.online 
                  ? 'Retry Now' 
                  : 'Queue for Retry'
                }
              </span>
            </button>
          )}

          {/* Network Settings */}
          {onNetworkSettings && (
            <button
              onClick={onNetworkSettings}
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              <Settings className="h-4 w-4" />
              <span>Network Settings</span>
            </button>
          )}

          {/* Dashboard Button */}
          <button
            onClick={onDashboardNavigate}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>

        {/* Auto-retry notification */}
        {!networkStatus.online && (
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <Clock className="h-4 w-4 inline mr-1" />
              This module will automatically retry when your connection is restored
            </p>
          </div>
        )}

        {/* Error Reference */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Network Error ID: {error.timestamp.getTime().toString(36)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper function
function getModuleDisplayName(moduleId: ModuleId): string {
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
}

export default NetworkErrorUI;