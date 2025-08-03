import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  Sync, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useOfflineStore } from '../store/offlineStore';
import { useToastStore } from '../store/toastStore';
import { formatDistanceToNow } from 'date-fns';

const OfflineIndicator: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  const { addToast } = useToastStore();
  
  const {
    isOnline,
    isOfflineMode,
    pendingTransactions,
    syncStatus,
    lastSyncError,
    offlineData,
    toggleOfflineMode,
    retryFailedTransactions,
    clearPendingTransactions,
    getFailedTransactions
  } = useOfflineStore();

  const failedTransactions = getFailedTransactions();
  const pendingCount = pendingTransactions.filter(t => t.status === 'pending').length;
  const syncingCount = pendingTransactions.filter(t => t.status === 'syncing').length;

  const handleSyncNow = async () => {
    if (!isOnline) {
      addToast({
        type: 'error',
        title: 'No Connection',
        message: 'Cannot sync while offline'
      });
      return;
    }

    if (pendingTransactions.length === 0) {
      addToast({
        type: 'info',
        title: 'Nothing to Sync',
        message: 'No pending transactions to sync'
      });
      return;
    }

    try {
      await retryFailedTransactions();
      addToast({
        type: 'success',
        title: 'Sync Complete',
        message: 'All pending transactions have been synced'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to sync some transactions'
      });
    }
  };

  const handleClearPending = () => {
    if (window.confirm('Are you sure you want to clear all pending transactions? This action cannot be undone.')) {
      clearPendingTransactions();
      addToast({
        type: 'info',
        title: 'Transactions Cleared',
        message: 'All pending transactions have been cleared'
      });
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg overflow-hidden">
        {/* Main Status Bar */}
        <div className="flex items-center p-3 space-x-3">
          {/* Connection Status */}
          <div className={`flex items-center px-2 py-1 rounded text-xs font-medium ${
            isOnline 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </>
            )}
          </div>

          {/* Offline Mode Toggle */}
          <button
            onClick={toggleOfflineMode}
            className={`flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
              isOfflineMode
                ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title={isOfflineMode ? 'Disable offline mode' : 'Enable offline mode'}
          >
            {isOfflineMode ? (
              <>
                <CloudOff className="h-3 w-3 mr-1" />
                Offline Mode
              </>
            ) : (
              <>
                <Cloud className="h-3 w-3 mr-1" />
                Online Mode
              </>
            )}
          </button>

          {/* Pending Transactions */}
          {pendingTransactions.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs font-medium">
                <Clock className="h-3 w-3 mr-1 inline" />
                {pendingTransactions.length} pending
              </div>
              
              {isOnline && (
                <button
                  onClick={handleSyncNow}
                  disabled={syncStatus === 'syncing'}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center"
                >
                  <Sync className={`h-3 w-3 mr-1 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  {syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}
                </button>
              )}
            </div>
          )}

          {/* Details Toggle */}
          {(pendingTransactions.length > 0 || failedTransactions.length > 0 || lastSyncError) && (
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
              {/* Sync Status */}
              {syncStatus !== 'idle' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sync Status:</span>
                  <div className={`flex items-center text-xs font-medium ${
                    syncStatus === 'syncing' 
                      ? 'text-blue-600 dark:text-blue-400'
                      : syncStatus === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {syncStatus === 'syncing' && <Sync className="h-3 w-3 mr-1 animate-spin" />}
                    {syncStatus === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {syncStatus === 'idle' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
                  </div>
                </div>
              )}

              {/* Last Sync Error */}
              {lastSyncError && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                  <div className="flex items-center text-red-800 dark:text-red-200 font-medium mb-1">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Sync Error
                  </div>
                  <div className="text-red-700 dark:text-red-300">{lastSyncError}</div>
                </div>
              )}

              {/* Transaction Breakdown */}
              {pendingTransactions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pending Transactions ({pendingTransactions.length})
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-2 rounded text-center">
                      <div className="font-medium">{pendingCount}</div>
                      <div>Pending</div>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-2 rounded text-center">
                      <div className="font-medium">{syncingCount}</div>
                      <div>Syncing</div>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-2 rounded text-center">
                      <div className="font-medium">{failedTransactions.length}</div>
                      <div>Failed</div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {pendingTransactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            transaction.status === 'pending' 
                              ? 'bg-yellow-400'
                              : transaction.status === 'syncing'
                              ? 'bg-blue-400'
                              : transaction.status === 'failed'
                              ? 'bg-red-400'
                              : 'bg-green-400'
                          }`} />
                          <span className="font-medium capitalize">{transaction.type.replace('_', ' ')}</span>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(transaction.timestamp, { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Sync Time */}
              {offlineData.lastSync && (
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Last sync:</span>
                  <span>{formatDistanceToNow(offlineData.lastSync, { addSuffix: true })}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-dark-700">
                {isOnline && pendingTransactions.length > 0 && (
                  <button
                    onClick={handleSyncNow}
                    disabled={syncStatus === 'syncing'}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded text-xs font-medium transition-colors"
                  >
                    {syncStatus === 'syncing' ? 'Syncing...' : 'Sync All'}
                  </button>
                )}
                
                {pendingTransactions.length > 0 && (
                  <button
                    onClick={handleClearPending}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-medium transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;