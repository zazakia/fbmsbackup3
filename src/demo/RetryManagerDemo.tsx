import React, { useState, useEffect } from 'react';
import { retryManager } from '../services/RetryManager';
import { ModuleId, ModuleLoadingErrorType } from '../types/moduleLoading';

/**
 * Demo component to showcase RetryManager functionality
 * This is for development/testing purposes only
 */
export const RetryManagerDemo: React.FC = () => {
  const [retryStats, setRetryStats] = useState(retryManager.getRetryStatistics());
  const [modulesInRetry, setModulesInRetry] = useState<ModuleId[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRetryStats(retryManager.getRetryStatistics());
      setModulesInRetry(retryManager.getModulesInRetry());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const simulateNetworkError = () => {
    const error = {
      type: ModuleLoadingErrorType.NETWORK_ERROR,
      moduleId: 'dashboard' as ModuleId,
      message: 'Simulated network error',
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
      recoverable: true
    };

    if (retryManager.shouldRetry('dashboard', error)) {
      retryManager.scheduleRetry('dashboard', error);
      console.log('Scheduled retry for dashboard module');
    } else {
      console.log('Cannot retry dashboard module (exhausted or in cooldown)');
    }
  };

  const simulateTimeoutError = () => {
    const error = {
      type: ModuleLoadingErrorType.TIMEOUT_ERROR,
      moduleId: 'pos' as ModuleId,
      message: 'Simulated timeout error',
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
      recoverable: true
    };

    if (retryManager.shouldRetry('pos', error)) {
      retryManager.scheduleRetry('pos', error);
      console.log('Scheduled retry for POS module');
    } else {
      console.log('Cannot retry POS module (exhausted or in cooldown)');
    }
  };

  const simulateSuccess = (moduleId: ModuleId) => {
    retryManager.markRetrySuccess(moduleId);
    console.log(`Marked ${moduleId} as successfully loaded`);
  };

  const resetRetryState = (moduleId: ModuleId) => {
    retryManager.resetRetryState(moduleId);
    console.log(`Reset retry state for ${moduleId}`);
  };

  const getRetryHistory = (moduleId: ModuleId) => {
    const history = retryManager.getRetryHistory(moduleId);
    console.log(`Retry history for ${moduleId}:`, history);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        RetryManager Demo
      </h2>
      
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {retryStats.totalModulesWithRetries}
          </div>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            Modules with Retries
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {retryStats.modulesInCooldown}
          </div>
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            In Cooldown
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {retryStats.modulesExhausted}
          </div>
          <div className="text-sm text-red-800 dark:text-red-300">
            Exhausted
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {retryStats.averageRetriesPerModule}
          </div>
          <div className="text-sm text-green-800 dark:text-green-300">
            Avg Retries/Module
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={simulateNetworkError}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Simulate Network Error (Dashboard)
        </button>
        
        <button
          onClick={simulateTimeoutError}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
        >
          Simulate Timeout Error (POS)
        </button>
        
        <button
          onClick={() => simulateSuccess('dashboard')}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Mark Dashboard Success
        </button>
        
        <button
          onClick={() => simulateSuccess('pos')}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          Mark POS Success
        </button>
      </div>

      {/* Modules in Retry */}
      {modulesInRetry.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Modules Currently in Retry
          </h3>
          <div className="space-y-2">
            {modulesInRetry.map((moduleId) => {
              const state = retryManager.getRetryState(moduleId);
              const successRate = retryManager.getRetrySuccessRate(moduleId);
              return (
                <div
                  key={moduleId}
                  className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {moduleId}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Attempts: {state?.attempts.length || 0} | 
                      Success Rate: {successRate}% |
                      {state?.exhausted && ' Exhausted |'}
                      {state?.inCooldown && ' In Cooldown'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => getRetryHistory(moduleId)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
                    >
                      History
                    </button>
                    <button
                      onClick={() => resetRetryState(moduleId)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Most Retried Modules */}
      {retryStats.mostRetriedModules.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Most Retried Modules
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            {retryStats.mostRetriedModules.map((module, index) => (
              <div key={module.moduleId} className="flex justify-between py-1">
                <span className="text-gray-900 dark:text-white">
                  {index + 1}. {module.moduleId}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {module.attempts} attempts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        <p>Check the browser console for detailed retry events and logs.</p>
        <p>This demo shows the RetryManager in action with exponential backoff and intelligent retry logic.</p>
      </div>
    </div>
  );
};