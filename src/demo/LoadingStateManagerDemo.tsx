import React, { useState } from 'react';
import { useModuleLoading, useGlobalModuleLoading } from '../hooks/useModuleLoading';
import { ModuleId } from '../types/moduleLoading';
import { loadingStateManager } from '../services/LoadingStateManager';

/**
 * Demo component showing LoadingStateManager integration with enhanced user feedback
 */
export const LoadingStateManagerDemo: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<ModuleId>('inventory');
  const [showGlobalStats, setShowGlobalStats] = useState(false);

  // Use the loading hook for the selected module
  const {
    loadingState,
    isLoading,
    progress,
    estimatedTimeRemaining,
    message,
    error,
    canRetry,
    canCancel,
    loadModule,
    retryLoad,
    cancelLoad,
    isSlowConnection,
    showTimeoutWarning,
    alternativeSuggestions,
    networkCondition,
    isOffline
  } = useModuleLoading(selectedModule, {
    onLoadingStart: (moduleId) => console.log(`Loading started for ${moduleId}`),
    onLoadingComplete: (moduleId) => console.log(`Loading completed for ${moduleId}`),
    onLoadingError: (moduleId, error) => console.error(`Loading error for ${moduleId}:`, error),
    onSlowConnection: (moduleId) => console.warn(`Slow connection detected for ${moduleId}`),
    onTimeoutWarning: (moduleId, elapsed) => console.warn(`Timeout warning for ${moduleId} after ${elapsed}ms`)
  });

  // Global loading monitoring
  const {
    loadingStates,
    activeLoadingCount,
    hasSlowLoading,
    hasTimeoutWarnings,
    overallProgress
  } = useGlobalModuleLoading();

  const moduleOptions: { value: ModuleId; label: string }[] = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'accounting', label: 'Accounting' },
    { value: 'purchases', label: 'Purchases' },
    { value: 'reports', label: 'Reports' },
    { value: 'pos', label: 'Point of Sale' },
    { value: 'customers', label: 'Customers' },
    { value: 'expenses', label: 'Expenses' }
  ];

  const formatTime = (ms: number | undefined): string => {
    if (ms === undefined) return 'Unknown';
    if (ms === 0) return 'Complete';
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const getNetworkStatusColor = (condition: string): string => {
    switch (condition) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'offline': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressBarColor = (progress: number): string => {
    if (progress < 25) return 'bg-red-500';
    if (progress < 50) return 'bg-orange-500';
    if (progress < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          LoadingStateManager Demo
        </h1>
        
        {/* Module Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Module to Load:
          </label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value as ModuleId)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {moduleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => loadModule()}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Load Module'}
          </button>
          
          {canRetry && (
            <button
              onClick={retryLoad}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              Retry
            </button>
          )}
          
          {canCancel && (
            <button
              onClick={cancelLoad}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={() => setShowGlobalStats(!showGlobalStats)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            {showGlobalStats ? 'Hide' : 'Show'} Global Stats
          </button>
        </div>
      </div>

      {/* Current Loading State */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Current Loading State: {selectedModule}
        </h2>
        
        {loadingState ? (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-300 ${getProgressBarColor(progress)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {loadingState.state} ({loadingState.phase})
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">Progress</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {progress.toFixed(1)}%
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">Time Remaining</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatTime(estimatedTimeRemaining)}
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
              <p className="text-sm text-blue-600 dark:text-blue-400">Message</p>
              <p className="font-medium text-blue-800 dark:text-blue-200">{message}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No active loading state</p>
        )}
      </div>

      {/* Network Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Network Status
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">Connection</p>
            <p className={`font-semibold capitalize ${getNetworkStatusColor(networkCondition)}`}>
              {networkCondition}
              {isOffline && ' (Offline)'}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">Slow Connection</p>
            <p className={`font-semibold ${isSlowConnection ? 'text-orange-600' : 'text-green-600'}`}>
              {isSlowConnection ? 'Yes' : 'No'}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">Timeout Warning</p>
            <p className={`font-semibold ${showTimeoutWarning ? 'text-red-600' : 'text-green-600'}`}>
              {showTimeoutWarning ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Warnings and Suggestions */}
      {(isSlowConnection || showTimeoutWarning || alternativeSuggestions.length > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200 mb-4">
            Warnings & Suggestions
          </h2>
          
          {isSlowConnection && (
            <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-md">
              <p className="text-orange-800 dark:text-orange-200 font-medium">
                🐌 Slow connection detected - loading may take longer than usual
              </p>
            </div>
          )}
          
          {showTimeoutWarning && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-md">
              <p className="text-red-800 dark:text-red-200 font-medium">
                ⏰ Loading is taking longer than expected - consider trying alternative options
              </p>
            </div>
          )}
          
          {alternativeSuggestions.length > 0 && (
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Suggested alternatives:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {alternativeSuggestions.map((suggestion, index) => (
                  <li key={index} className="text-yellow-700 dark:text-yellow-300">
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Loading Error
          </h2>
          <p className="text-red-700 dark:text-red-300">{error.message}</p>
        </div>
      )}

      {/* Global Loading Statistics */}
      {showGlobalStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Global Loading Statistics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
              <p className="text-sm text-blue-600 dark:text-blue-400">Active Loading</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                {activeLoadingCount}
              </p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
              <p className="text-sm text-green-600 dark:text-green-400">Overall Progress</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                {overallProgress.toFixed(1)}%
              </p>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-md">
              <p className="text-sm text-orange-600 dark:text-orange-400">Slow Loading</p>
              <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                {hasSlowLoading ? 'Yes' : 'No'}
              </p>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">Timeout Warnings</p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-200">
                {hasTimeoutWarnings ? 'Yes' : 'No'}
              </p>
            </div>
          </div>

          {/* All Loading States */}
          {loadingStates.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                All Loading States
              </h3>
              <div className="space-y-2">
                {loadingStates.map((state) => (
                  <div key={state.moduleId} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {state.moduleId}
                      </span>
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        ({state.state} - {state.phase})
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {state.progress.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(state.estimatedTimeRemaining)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Service Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Service Statistics
        </h2>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
            {JSON.stringify(loadingStateManager.getLoadingStatistics(), null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default LoadingStateManagerDemo;