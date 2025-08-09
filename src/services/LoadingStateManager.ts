import {
  ModuleId,
  LoadingStateInfo,
  ILoadingStateManager,
  ModuleLoadingEvent,
  ModuleLoadingEventType,
  LoadingState,
  ModuleLoadingPhase,
  NetworkCondition
} from '../types/moduleLoading';

/**
 * LoadingStateManager Service
 * 
 * Provides enhanced user feedback during module loading operations.
 * Features:
 * - Immediate loading indicators (within 100ms response)
 * - Progress indication with estimated loading times
 * - Slow connection detection and user notification system
 * - Loading timeout warnings and alternative options
 * - State persistence for cross-component synchronization
 * - Event-driven updates for React component integration
 */
class LoadingStateManager implements ILoadingStateManager {
  private loadingStates: Map<ModuleId, LoadingStateInfo> = new Map();
  private eventListeners: ((state: LoadingStateInfo) => void)[] = [];
  private timeoutWarningListeners: ((moduleId: ModuleId, timeElapsed: number) => void)[] = [];
  private slowConnectionListeners: ((moduleId: ModuleId, condition: NetworkCondition) => void)[] = [];
  
  // Performance thresholds for loading feedback
  private readonly loadingThresholds = {
    immediate: 100,        // Show loading indicator within 100ms
    slowWarning: 3000,     // Warn about slow loading after 3s
    timeoutWarning: 8000,  // Show timeout warning after 8s
    criticalTimeout: 15000 // Critical timeout threshold
  };

  // Progress estimation based on network conditions
  private readonly progressEstimates = {
    excellent: { fast: 500, normal: 1500, slow: 3000 },
    good: { fast: 800, normal: 2500, slow: 5000 },
    fair: { fast: 1500, normal: 4000, slow: 8000 },
    poor: { fast: 3000, normal: 8000, slow: 15000 },
    offline: { fast: 0, normal: 0, slow: 0 }
  };

  constructor() {
    this.startPerformanceMonitoring();
    this.setupNetworkMonitoring();
  }

  /**
   * Updates loading state with immediate feedback (< 100ms)
   */
  updateLoadingState(moduleId: ModuleId, update: Partial<LoadingStateInfo>): void {
    // Ensure immediate response time
    const updateStart = performance.now();
    
    let currentState = this.loadingStates.get(moduleId);
    
    // Create new state if it doesn't exist
    if (!currentState) {
      currentState = this.createInitialLoadingState(moduleId);
      this.loadingStates.set(moduleId, currentState);
    }

    // Apply updates with automatic progress calculation
    const updatedState: LoadingStateInfo = {
      ...currentState,
      ...update,
      lastUpdate: new Date(),
      progress: update.progress !== undefined ? update.progress : this.calculateProgress(currentState, update),
      estimatedTimeRemaining: this.calculateEstimatedTime(moduleId, currentState, update)
    };

    // Update stored state
    this.loadingStates.set(moduleId, updatedState);

    // Emit state change event with immediate response guarantee
    this.emitStateChange(updatedState);

    // Check for performance warnings
    this.checkPerformanceWarnings(updatedState);

    // Ensure we meet the 100ms response requirement
    const updateDuration = performance.now() - updateStart;
    if (updateDuration > this.loadingThresholds.immediate) {
      console.warn(`LoadingStateManager update took ${updateDuration.toFixed(2)}ms - exceeds 100ms threshold`);
    }
  }

  /**
   * Gets current loading state for a module
   */
  getLoadingState(moduleId: ModuleId): LoadingStateInfo | null {
    return this.loadingStates.get(moduleId) || null;
  }

  /**
   * Gets all current loading states
   */
  getAllLoadingStates(): LoadingStateInfo[] {
    return Array.from(this.loadingStates.values());
  }

  /**
   * Clears loading state for a module
   */
  clearLoadingState(moduleId: ModuleId): void {
    const state = this.loadingStates.get(moduleId);
    if (state) {
      this.loadingStates.delete(moduleId);
      
      // Emit final state change
      const finalState: LoadingStateInfo = {
        ...state,
        state: 'success',
        phase: 'complete',
        progress: 100,
        message: 'Loading completed',
        lastUpdate: new Date(),
        estimatedTimeRemaining: 0
      };
      
      this.emitStateChange(finalState);
    }
  }

  /**
   * Subscribes to loading state changes
   */
  subscribeToStateChanges(callback: (state: LoadingStateInfo) => void): () => void {
    this.eventListeners.push(callback);
    
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribes to timeout warnings
   */
  subscribeToTimeoutWarnings(callback: (moduleId: ModuleId, timeElapsed: number) => void): () => void {
    this.timeoutWarningListeners.push(callback);
    
    return () => {
      const index = this.timeoutWarningListeners.indexOf(callback);
      if (index > -1) {
        this.timeoutWarningListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribes to slow connection notifications
   */
  subscribeToSlowConnectionWarnings(callback: (moduleId: ModuleId, condition: NetworkCondition) => void): () => void {
    this.slowConnectionListeners.push(callback);
    
    return () => {
      const index = this.slowConnectionListeners.indexOf(callback);
      if (index > -1) {
        this.slowConnectionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Gets loading statistics and performance metrics
   */
  getLoadingStatistics(): {
    activeLoadingCount: number;
    averageLoadingTime: number;
    slowLoadingCount: number;
    timeoutWarningsCount: number;
    networkConditionDistribution: Record<NetworkCondition, number>;
  } {
    const activeStates = Array.from(this.loadingStates.values());
    const now = Date.now();
    
    const stats = {
      activeLoadingCount: activeStates.filter(s => s.state === 'loading' || s.state === 'retrying').length,
      averageLoadingTime: 0,
      slowLoadingCount: 0,
      timeoutWarningsCount: 0,
      networkConditionDistribution: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        offline: 0
      } as Record<NetworkCondition, number>
    };

    // Calculate statistics from active states
    let totalLoadingTime = 0;
    let completedLoads = 0;
    
    activeStates.forEach(state => {
      const elapsed = now - state.startTime.getTime();
      
      // Count slow loading states
      if (elapsed > this.loadingThresholds.slowWarning) {
        stats.slowLoadingCount++;
      }
      
      // Count timeout warnings
      if (elapsed > this.loadingThresholds.timeoutWarning) {
        stats.timeoutWarningsCount++;
      }
      
      // Calculate average loading time for completed states
      if (state.state === 'success' || state.state === 'error') {
        totalLoadingTime += elapsed;
        completedLoads++;
      }
    });

    stats.averageLoadingTime = completedLoads > 0 ? totalLoadingTime / completedLoads : 0;

    return stats;
  }

  // Private methods

  private createInitialLoadingState(moduleId: ModuleId): LoadingStateInfo {
    const now = new Date();
    return {
      moduleId,
      state: 'loading',
      phase: 'initializing',
      progress: 0,
      message: 'Initializing...',
      startTime: now,
      lastUpdate: now,
      canCancel: false,
      canRetry: true,
      fallbacksAvailable: false,
      estimatedTimeRemaining: this.getInitialTimeEstimate()
    };
  }

  private calculateProgress(currentState: LoadingStateInfo, update: Partial<LoadingStateInfo>): number {
    // If progress is explicitly provided, use it
    if (update.progress !== undefined) {
      return Math.max(0, Math.min(100, update.progress));
    }

    // Calculate progress based on phase and elapsed time
    const baseProgress = this.getPhaseBaseProgress(update.phase || currentState.phase);
    const elapsed = Date.now() - currentState.startTime.getTime();
    const networkCondition = this.getCurrentNetworkCondition();
    const expectedDuration = this.progressEstimates[networkCondition].normal;

    // Add time-based progress within the phase
    const timeProgress = Math.min(25, (elapsed / expectedDuration) * 100);
    
    return Math.max(currentState.progress, Math.min(100, baseProgress + timeProgress));
  }

  private getPhaseBaseProgress(phase: ModuleLoadingPhase): number {
    switch (phase) {
      case 'initializing': return 0;
      case 'importing': return 25;
      case 'resolving': return 50;
      case 'hydrating': return 75;
      case 'complete': return 100;
      default: return 0;
    }
  }

  private calculateEstimatedTime(
    moduleId: ModuleId, 
    currentState: LoadingStateInfo, 
    update: Partial<LoadingStateInfo>
  ): number | undefined {
    const elapsed = Date.now() - currentState.startTime.getTime();
    const progress = this.calculateProgress(currentState, update);
    
    if (progress === 0) {
      return this.getInitialTimeEstimate();
    }

    if (progress >= 100) {
      return 0;
    }

    // Estimate remaining time based on current progress and elapsed time
    const estimatedTotal = (elapsed / progress) * 100;
    const remaining = estimatedTotal - elapsed;
    
    // Apply network condition adjustments
    const networkCondition = this.getCurrentNetworkCondition();
    const conditionMultiplier = this.getNetworkMultiplier(networkCondition);
    
    return Math.max(0, Math.round(remaining * conditionMultiplier));
  }

  private getInitialTimeEstimate(): number {
    const networkCondition = this.getCurrentNetworkCondition();
    return this.progressEstimates[networkCondition].normal;
  }

  private getNetworkMultiplier(condition: NetworkCondition): number {
    switch (condition) {
      case 'excellent': return 0.8;
      case 'good': return 1.0;
      case 'fair': return 1.5;
      case 'poor': return 2.5;
      case 'offline': return Infinity;
    }
  }

  private getCurrentNetworkCondition(): NetworkCondition {
    if (!navigator.onLine) {
      return 'offline';
    }

    // Try to get network information from connection API
    const connection = (navigator as any).connection;
    if (connection) {
      const { effectiveType, downlink, rtt } = connection;
      
      if (effectiveType === '4g' && downlink > 2) {
        return 'excellent';
      } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 1)) {
        return 'good';
      } else if (effectiveType === '3g' || rtt < 200) {
        return 'fair';
      } else {
        return 'poor';
      }
    }

    return 'good'; // Default assumption
  }

  private emitStateChange(state: LoadingStateInfo): void {
    // Use requestAnimationFrame to ensure smooth UI updates
    requestAnimationFrame(() => {
      this.eventListeners.forEach(listener => {
        try {
          listener(state);
        } catch (error) {
          console.error('Error in loading state listener:', error);
        }
      });
    });
  }

  private checkPerformanceWarnings(state: LoadingStateInfo): void {
    const elapsed = Date.now() - state.startTime.getTime();
    const networkCondition = this.getCurrentNetworkCondition();

    // Check for slow connection warning
    if (elapsed > this.loadingThresholds.slowWarning && networkCondition === 'poor') {
      this.emitSlowConnectionWarning(state.moduleId, networkCondition);
    }

    // Check for timeout warning
    if (elapsed > this.loadingThresholds.timeoutWarning) {
      this.emitTimeoutWarning(state.moduleId, elapsed);
    }
  }

  private emitTimeoutWarning(moduleId: ModuleId, timeElapsed: number): void {
    this.timeoutWarningListeners.forEach(listener => {
      try {
        listener(moduleId, timeElapsed);
      } catch (error) {
        console.error('Error in timeout warning listener:', error);
      }
    });
  }

  private emitSlowConnectionWarning(moduleId: ModuleId, condition: NetworkCondition): void {
    this.slowConnectionListeners.forEach(listener => {
      try {
        listener(moduleId, condition);
      } catch (error) {
        console.error('Error in slow connection warning listener:', error);
      }
    });
  }

  private startPerformanceMonitoring(): void {
    // Monitor loading states for performance issues every second
    setInterval(() => {
      const now = Date.now();
      
      this.loadingStates.forEach((state, moduleId) => {
        const elapsed = now - state.startTime.getTime();
        
        // Auto-update progress for long-running loads
        if (state.state === 'loading' && elapsed > 1000) {
          this.updateLoadingState(moduleId, {
            progress: Math.min(state.progress + 1, 95), // Never quite reach 100% automatically
            message: this.getProgressMessage(state.phase, elapsed)
          });
        }
        
        // Clean up very old loading states (> 30 seconds)
        if (elapsed > 30000 && (state.state === 'loading' || state.state === 'retrying')) {
          console.warn(`Cleaning up stale loading state for ${moduleId} after ${elapsed}ms`);
          this.clearLoadingState(moduleId);
        }
      });
    }, 1000);
  }

  private getProgressMessage(phase: ModuleLoadingPhase, elapsed: number): string {
    const seconds = Math.floor(elapsed / 1000);
    
    switch (phase) {
      case 'initializing':
        return `Initializing module... (${seconds}s)`;
      case 'importing':
        return `Downloading components... (${seconds}s)`;
      case 'resolving':
        return `Resolving dependencies... (${seconds}s)`;
      case 'hydrating':
        return `Setting up interface... (${seconds}s)`;
      case 'complete':
        return 'Module loaded successfully';
      default:
        return `Loading... (${seconds}s)`;
    }
  }

  private setupNetworkMonitoring(): void {
    // Monitor network condition changes
    window.addEventListener('online', () => {
      this.handleNetworkChange('online');
    });

    window.addEventListener('offline', () => {
      this.handleNetworkChange('offline');
    });

    // Monitor connection API if available
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        this.handleNetworkChange('change');
      });
    }
  }

  private handleNetworkChange(eventType: string): void {
    const newCondition = this.getCurrentNetworkCondition();
    
    // Update all active loading states with new network condition
    this.loadingStates.forEach((state, moduleId) => {
      if (state.state === 'loading' || state.state === 'retrying') {
        const newEstimatedTime = this.calculateEstimatedTime(moduleId, state, {});
        
        this.updateLoadingState(moduleId, {
          estimatedTimeRemaining: newEstimatedTime,
          message: eventType === 'offline' 
            ? 'Connection lost - loading paused' 
            : eventType === 'online'
            ? 'Connection restored - resuming loading'
            : this.getProgressMessage(state.phase, Date.now() - state.startTime.getTime())
        });
      }
    });

    console.log(`Network condition changed: ${eventType}, new condition: ${newCondition}`);
  }

  /**
   * Gets suggestions for alternative actions when loading is slow
   */
  getAlternativeSuggestions(moduleId: ModuleId): string[] {
    const state = this.getLoadingState(moduleId);
    if (!state) return [];

    const elapsed = Date.now() - state.startTime.getTime();
    const networkCondition = this.getCurrentNetworkCondition();
    
    const suggestions: string[] = [];

    if (networkCondition === 'poor' || networkCondition === 'offline') {
      suggestions.push('Check your internet connection');
      suggestions.push('Try switching to a better network');
    }

    if (elapsed > this.loadingThresholds.slowWarning) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear browser cache and try again');
    }

    if (elapsed > this.loadingThresholds.timeoutWarning) {
      suggestions.push('Contact support if this issue persists');
      suggestions.push('Try accessing the module later');
    }

    if (state.fallbacksAvailable) {
      suggestions.push('Use alternative module features');
    }

    return suggestions;
  }

  /**
   * Forces a loading state update (for testing/debugging)
   */
  forceUpdateLoadingState(moduleId: ModuleId, state: Partial<LoadingStateInfo>): void {
    console.warn(`Force updating loading state for ${moduleId}`);
    this.updateLoadingState(moduleId, state);
  }

  /**
   * Cleanup method to be called when service is destroyed
   */
  destroy(): void {
    this.loadingStates.clear();
    this.eventListeners.length = 0;
    this.timeoutWarningListeners.length = 0;
    this.slowConnectionListeners.length = 0;
    
    console.log('LoadingStateManager destroyed and cleaned up');
  }
}

// Create and export singleton instance
export const loadingStateManager = new LoadingStateManager();
export default LoadingStateManager;