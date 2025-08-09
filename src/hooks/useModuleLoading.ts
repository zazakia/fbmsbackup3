import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ModuleId,
  LoadingStateInfo,
  NetworkCondition,
  LoadingOptions
} from '../types/moduleLoading';
import { loadingStateManager } from '../services/LoadingStateManager';
import { moduleLoadingManager } from '../services/ModuleLoadingManager';

/**
 * React Hook for Module Loading with Enhanced User Feedback
 * 
 * Provides comprehensive loading state management for React components with:
 * - Real-time loading state updates
 * - Progress tracking and time estimates
 * - Slow connection detection and warnings
 * - Timeout notifications and alternative suggestions
 * - Automatic cleanup and error handling
 */
export interface UseModuleLoadingReturn {
  // Loading state information
  loadingState: LoadingStateInfo | null;
  isLoading: boolean;
  progress: number;
  estimatedTimeRemaining?: number;
  message: string;
  
  // Error and retry handling
  error: Error | null;
  canRetry: boolean;
  canCancel: boolean;
  
  // Actions
  loadModule: (options?: LoadingOptions) => Promise<void>;
  retryLoad: () => Promise<void>;
  cancelLoad: () => void;
  
  // User feedback
  isSlowConnection: boolean;
  showTimeoutWarning: boolean;
  alternativeSuggestions: string[];
  
  // Network information
  networkCondition: NetworkCondition;
  isOffline: boolean;
}

export interface UseModuleLoadingOptions {
  // Auto-loading options
  autoLoad?: boolean;
  loadingOptions?: LoadingOptions;
  
  // Feedback thresholds (ms)
  slowConnectionThreshold?: number;
  timeoutWarningThreshold?: number;
  
  // Callback functions
  onLoadingStart?: (moduleId: ModuleId) => void;
  onLoadingComplete?: (moduleId: ModuleId) => void;
  onLoadingError?: (moduleId: ModuleId, error: Error) => void;
  onSlowConnection?: (moduleId: ModuleId) => void;
  onTimeoutWarning?: (moduleId: ModuleId, elapsed: number) => void;
}

/**
 * Hook for managing module loading with enhanced user feedback
 */
export const useModuleLoading = (
  moduleId: ModuleId,
  options: UseModuleLoadingOptions = {}
): UseModuleLoadingReturn => {
  // State management
  const [loadingState, setLoadingState] = useState<LoadingStateInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [networkCondition, setNetworkCondition] = useState<NetworkCondition>('good');
  const [alternativeSuggestions, setAlternativeSuggestions] = useState<string[]>([]);
  
  // Refs for cleanup and preventing stale closures
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const timeoutWarningUnsubscribeRef = useRef<(() => void) | null>(null);
  const slowConnectionUnsubscribeRef = useRef<(() => void) | null>(null);
  const isComponentMountedRef = useRef(true);

  // Thresholds with defaults
  const slowConnectionThreshold = options.slowConnectionThreshold || 3000;
  const timeoutWarningThreshold = options.timeoutWarningThreshold || 8000;

  // Network condition monitoring
  useEffect(() => {
    const updateNetworkCondition = () => {
      if (!isComponentMountedRef.current) return;
      
      let condition: NetworkCondition = 'good';
      
      if (!navigator.onLine) {
        condition = 'offline';
      } else {
        const connection = (navigator as any).connection;
        if (connection) {
          const { effectiveType, downlink, rtt } = connection;
          
          if (effectiveType === '4g' && downlink > 2) {
            condition = 'excellent';
          } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 1)) {
            condition = 'good';
          } else if (effectiveType === '3g' || rtt < 200) {
            condition = 'fair';
          } else {
            condition = 'poor';
          }
        }
      }
      
      setNetworkCondition(condition);
    };

    updateNetworkCondition();

    // Listen for network changes
    window.addEventListener('online', updateNetworkCondition);
    window.addEventListener('offline', updateNetworkCondition);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkCondition);
    }

    return () => {
      window.removeEventListener('online', updateNetworkCondition);
      window.removeEventListener('offline', updateNetworkCondition);
      if (connection) {
        connection.removeEventListener('change', updateNetworkCondition);
      }
    };
  }, []);

  // Subscribe to loading state changes
  useEffect(() => {
    if (!isComponentMountedRef.current) return;

    // Subscribe to state changes
    unsubscribeRef.current = loadingStateManager.subscribeToStateChanges((state) => {
      if (!isComponentMountedRef.current || state.moduleId !== moduleId) return;
      
      setLoadingState(state);
      setError(state.error ? new Error(state.error.message) : null);
      
      // Update alternative suggestions
      const suggestions = loadingStateManager.getAlternativeSuggestions(moduleId);
      setAlternativeSuggestions(suggestions);
      
      // Call callbacks
      if (state.state === 'loading' && !loadingState) {
        options.onLoadingStart?.(moduleId);
      } else if (state.state === 'success') {
        options.onLoadingComplete?.(moduleId);
      } else if (state.state === 'error' && state.error) {
        options.onLoadingError?.(moduleId, new Error(state.error.message));
      }
    });

    // Subscribe to timeout warnings
    timeoutWarningUnsubscribeRef.current = loadingStateManager.subscribeToTimeoutWarnings((warnModuleId, elapsed) => {
      if (!isComponentMountedRef.current || warnModuleId !== moduleId) return;
      
      if (elapsed >= timeoutWarningThreshold) {
        setShowTimeoutWarning(true);
        options.onTimeoutWarning?.(moduleId, elapsed);
      }
    });

    // Subscribe to slow connection warnings
    slowConnectionUnsubscribeRef.current = loadingStateManager.subscribeToSlowConnectionWarnings((warnModuleId, condition) => {
      if (!isComponentMountedRef.current || warnModuleId !== moduleId) return;
      
      setIsSlowConnection(condition === 'poor' || condition === 'offline');
      if (condition === 'poor' || condition === 'offline') {
        options.onSlowConnection?.(moduleId);
      }
    });

    // Get initial state if it exists
    const currentState = loadingStateManager.getLoadingState(moduleId);
    if (currentState) {
      setLoadingState(currentState);
      setError(currentState.error ? new Error(currentState.error.message) : null);
    }

    return () => {
      unsubscribeRef.current?.();
      timeoutWarningUnsubscribeRef.current?.();
      slowConnectionUnsubscribeRef.current?.();
      unsubscribeRef.current = null;
      timeoutWarningUnsubscribeRef.current = null;
      slowConnectionUnsubscribeRef.current = null;
    };
  }, [moduleId, timeoutWarningThreshold, options]);

  // Auto-load if specified
  useEffect(() => {
    if (options.autoLoad && isComponentMountedRef.current && !loadingState) {
      loadModule(options.loadingOptions);
    }
  }, [moduleId, options.autoLoad]);

  // Load module function
  const loadModule = useCallback(async (loadingOptions?: LoadingOptions) => {
    if (!isComponentMountedRef.current) return;
    
    try {
      setError(null);
      setIsSlowConnection(false);
      setShowTimeoutWarning(false);
      setAlternativeSuggestions([]);
      
      // Initialize loading state immediately
      loadingStateManager.updateLoadingState(moduleId, {
        state: 'loading',
        phase: 'initializing',
        progress: 0,
        message: 'Starting to load module...'
      });
      
      // Load the module using the ModuleLoadingManager
      await moduleLoadingManager.loadModule(moduleId, loadingOptions);
      
      // Loading completed successfully - state will be updated via subscription
      
    } catch (err) {
      if (!isComponentMountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('Unknown loading error');
      setError(error);
      
      // Update loading state to error
      loadingStateManager.updateLoadingState(moduleId, {
        state: 'error',
        message: error.message,
        error: {
          type: 'unknown_error' as any,
          moduleId,
          message: error.message,
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3,
          recoverable: true
        }
      });
    }
  }, [moduleId]);

  // Retry load function
  const retryLoad = useCallback(async () => {
    if (!isComponentMountedRef.current) return;
    
    setShowTimeoutWarning(false);
    setIsSlowConnection(false);
    await loadModule();
  }, [loadModule]);

  // Cancel load function
  const cancelLoad = useCallback(() => {
    if (!isComponentMountedRef.current) return;
    
    loadingStateManager.clearLoadingState(moduleId);
    setError(null);
    setIsSlowConnection(false);
    setShowTimeoutWarning(false);
    setAlternativeSuggestions([]);
  }, [moduleId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMountedRef.current = false;
    };
  }, []);

  // Derived state
  const isLoading = loadingState?.state === 'loading' || loadingState?.state === 'retrying';
  const progress = loadingState?.progress || 0;
  const estimatedTimeRemaining = loadingState?.estimatedTimeRemaining;
  const message = loadingState?.message || '';
  const canRetry = loadingState?.canRetry ?? false;
  const canCancel = loadingState?.canCancel ?? false;
  const isOffline = networkCondition === 'offline';

  return {
    // Loading state information
    loadingState,
    isLoading,
    progress,
    estimatedTimeRemaining,
    message,
    
    // Error and retry handling
    error,
    canRetry,
    canCancel,
    
    // Actions
    loadModule,
    retryLoad,
    cancelLoad,
    
    // User feedback
    isSlowConnection,
    showTimeoutWarning,
    alternativeSuggestions,
    
    // Network information
    networkCondition,
    isOffline
  };
};

/**
 * Hook for monitoring all loading states (useful for global loading indicators)
 */
export const useGlobalModuleLoading = (): {
  loadingStates: LoadingStateInfo[];
  activeLoadingCount: number;
  hasSlowLoading: boolean;
  hasTimeoutWarnings: boolean;
  overallProgress: number;
} => {
  const [loadingStates, setLoadingStates] = useState<LoadingStateInfo[]>([]);
  const isComponentMountedRef = useRef(true);

  useEffect(() => {
    const updateGlobalState = () => {
      if (!isComponentMountedRef.current) return;
      
      const allStates = loadingStateManager.getAllLoadingStates();
      setLoadingStates(allStates);
    };

    // Subscribe to state changes
    const unsubscribe = loadingStateManager.subscribeToStateChanges(() => {
      updateGlobalState();
    });

    // Get initial state
    updateGlobalState();

    // Update every second for real-time monitoring
    const interval = setInterval(updateGlobalState, 1000);

    return () => {
      isComponentMountedRef.current = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Calculate derived state
  const activeLoadingStates = loadingStates.filter(
    state => state.state === 'loading' || state.state === 'retrying'
  );
  
  const activeLoadingCount = activeLoadingStates.length;
  const hasSlowLoading = activeLoadingStates.some(
    state => Date.now() - state.startTime.getTime() > 3000
  );
  const hasTimeoutWarnings = activeLoadingStates.some(
    state => Date.now() - state.startTime.getTime() > 8000
  );
  
  const overallProgress = activeLoadingStates.length > 0
    ? activeLoadingStates.reduce((sum, state) => sum + state.progress, 0) / activeLoadingStates.length
    : 0;

  return {
    loadingStates,
    activeLoadingCount,
    hasSlowLoading,
    hasTimeoutWarnings,
    overallProgress
  };
};

export default useModuleLoading;