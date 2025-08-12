import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh
} from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { networkRecoveryService } from '../services/NetworkRecoveryService';
import { resourceRetryService } from '../services/ResourceRetryService';

/**
 * NetworkStatusIndicator - Online-only network status component
 * Displays connection status and handles resource retry without offline functionality
 */
const NetworkStatusIndicator: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(networkRecoveryService.getNetworkStatus());
  const [failedResources, setFailedResources] = useState(resourceRetryService.getFailedResources());
  const { addToast } = useToastStore();

  // Network and resource monitoring
  useEffect(() => {
    const networkUnsubscribe = networkRecoveryService.subscribeToNetworkChanges((status) => {
      setNetworkStatus(status);
      if (!status.online) {
        addToast({
          type: 'warning',
          title: 'Network Disconnected',
          message: 'Please check your internet connection. The app requires an internet connection to work.',
          duration: 5000
        });
      } else {
        addToast({
          type: 'success',
          title: 'Network Reconnected',
          message: 'Connection restored. Retrying failed resources...',
          duration: 3000
        });
      }
    });

    const handleResourceRetrySuccess = (event: any) => {
      const { url, retryCount } = event.detail;
      addToast({
        type: 'success',
        title: 'Resource Recovered',
        message: `Successfully reloaded resource after ${retryCount + 1} attempts`,
        duration: 3000
      });
      setFailedResources(resourceRetryService.getFailedResources());
    };

    const handleResourceRetryFailed = (event: any) => {
      const { url, suggestion } = event.detail;
      addToast({
        type: 'error',
        title: 'Resource Load Failed',
        message: suggestion || 'Unable to load required resources. Please refresh the page.',
        duration: 8000
      });
      setFailedResources(resourceRetryService.getFailedResources());
    };

    // Update failed resources periodically
    const resourceUpdateInterval = setInterval(() => {
      setFailedResources(resourceRetryService.getFailedResources());
    }, 2000);

    window.addEventListener('resource-retry-success', handleResourceRetrySuccess);
    window.addEventListener('resource-retry-failed', handleResourceRetryFailed);

    return () => {
      networkUnsubscribe();
      clearInterval(resourceUpdateInterval);
      window.removeEventListener('resource-retry-success', handleResourceRetrySuccess);
      window.removeEventListener('resource-retry-failed', handleResourceRetryFailed);
    };
  }, [addToast]);

  const getConnectionIcon = () => {
    if (!networkStatus.online) return <WifiOff className="h-3 w-3 mr-1" />;
    
    switch (networkStatus.condition) {
      case 'excellent': return <SignalHigh className="h-3 w-3 mr-1" />;
      case 'good': return <Signal className="h-3 w-3 mr-1" />;
      case 'fair': return <SignalMedium className="h-3 w-3 mr-1" />;
      case 'poor': return <SignalLow className="h-3 w-3 mr-1" />;
      default: return <Wifi className="h-3 w-3 mr-1" />;
    }
  };

  const getConnectionColor = () => {
    if (!networkStatus.online) return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200';
    
    switch (networkStatus.condition) {
      case 'excellent': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
      case 'good': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
      case 'fair': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
      case 'poor': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200';
      default: return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200';
    }
  };

  const handleRetryResources = async () => {
    if (failedResources.length === 0) return;
    
    addToast({
      type: 'info',
      title: 'Retrying Resources',
      message: `Attempting to reload ${failedResources.length} failed resource(s)...`,
      duration: 3000
    });

    // Trigger page reload to retry all resources
    window.location.reload();
  };

  // Don't show indicator if everything is working fine
  if (networkStatus.online && failedResources.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg overflow-hidden">
        {/* Main Status Bar */}
        <div className="flex items-center p-3 space-x-3">
          {/* Connection Status */}
          <div className={`flex items-center px-2 py-1 rounded text-xs font-medium ${getConnectionColor()}`}>
            {getConnectionIcon()}
            {networkStatus.online ? (
              <span className="capitalize">{networkStatus.condition}</span>
            ) : (
              'Offline'
            )}
          </div>

          {/* Resource Issues Alert */}
          {failedResources.length > 0 && (
            <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs font-medium">
              <AlertTriangle className="h-3 w-3 mr-1 inline" />
              {failedResources.length} resource error{failedResources.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Resource Retry Button */}
          {failedResources.length > 0 && (
            <button
              onClick={handleRetryResources}
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center"
              title="Refresh page to retry failed resources"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </button>
          )}

          {/* Details Toggle */}
          {(failedResources.length > 0 || !networkStatus.online) && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* Details Panel */}
        {showDetails && (
          <div className="border-t border-gray-200 dark:border-dark-700 p-3 bg-gray-50 dark:bg-dark-900">
            <div className="space-y-3">
              {/* Failed Resources */}
              {failedResources.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Failed Resources ({failedResources.length})
                  </div>
                  
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {failedResources.map((resource) => (
                      <div
                        key={resource.url}
                        className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span className="font-medium capitalize">{resource.type}</span>
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-32">
                            {resource.url.split('/').pop()}
                          </span>
                        </div>
                        <div className="text-red-600 dark:text-red-400 font-medium">
                          {resource.retryCount}/{resourceRetryService.getConfig().maxRetries}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Network error detected. Resources will retry automatically when connection improves.
                  </div>
                </div>
              )}

              {/* Network Details */}
              {networkStatus.rtt !== undefined && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Network Details</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {networkStatus.rtt && (
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        <div className="font-medium">Latency</div>
                        <div>{networkStatus.rtt}ms</div>
                      </div>
                    )}
                    {networkStatus.downlink && (
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        <div className="font-medium">Speed</div>
                        <div>{networkStatus.downlink.toFixed(1)} Mbps</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkStatusIndicator;
