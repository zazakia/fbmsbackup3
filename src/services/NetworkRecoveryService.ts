import {
  ModuleId,
  NetworkStatus,
  NetworkCondition,
  ModuleLoadingError,
  ModuleLoadingErrorType,
  LoadingOptions
} from '../types/moduleLoading';

/**
 * Network Recovery Service
 * 
 * Provides network-aware recovery mechanisms for module loading.
 * Features:
 * - Implement offline detection and appropriate user messaging
 * - Add slow connection handling with alternative loading strategies
 * - Create network condition monitoring and adaptive loading
 * - Implement retry strategies based on network status
 * - Intelligent bandwidth management and connection optimization
 */
export class NetworkRecoveryService {
  private networkStatus: NetworkStatus = {
    condition: 'good',
    online: true
  };
  
  private networkListeners: ((status: NetworkStatus) => void)[] = [];
  private offlineListeners: ((isOffline: boolean) => void)[] = [];
  private connectionQualityListeners: ((quality: NetworkCondition) => void)[] = [];
  
  private connectionHistory: Array<{
    timestamp: Date;
    condition: NetworkCondition;
    online: boolean;
    rtt?: number;
    downlink?: number;
  }> = [];
  
  private adaptiveLoadingStrategies: Record<NetworkCondition, {
    timeout: number;
    chunkSize: 'small' | 'medium' | 'large';
    parallelRequests: number;
    enableCompression: boolean;
    retryDelay: number;
    maxRetries: number;
  }> = {
    excellent: {
      timeout: 5000,
      chunkSize: 'large',
      parallelRequests: 4,
      enableCompression: false,
      retryDelay: 1000,
      maxRetries: 2
    },
    good: {
      timeout: 8000,
      chunkSize: 'medium',
      parallelRequests: 2,
      enableCompression: true,
      retryDelay: 2000,
      maxRetries: 3
    },
    fair: {
      timeout: 12000,
      chunkSize: 'small',
      parallelRequests: 1,
      enableCompression: true,
      retryDelay: 3000,
      maxRetries: 4
    },
    poor: {
      timeout: 20000,
      chunkSize: 'small',
      parallelRequests: 1,
      enableCompression: true,
      retryDelay: 5000,
      maxRetries: 5
    },
    offline: {
      timeout: 0,
      chunkSize: 'small',
      parallelRequests: 0,
      enableCompression: true,
      retryDelay: 10000,
      maxRetries: 0
    }
  };

  private offlineQueue: Array<{
    moduleId: ModuleId;
    options: LoadingOptions;
    timestamp: Date;
    retryCount: number;
  }> = [];

  constructor() {
    this.initializeNetworkMonitoring();
    this.startNetworkAnalysis();
  }

  /**
   * Gets current network status with detailed analysis
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Detects if device is offline and provides appropriate messaging
   */
  getOfflineStatus(): {
    isOffline: boolean;
    message: string;
    recommendations: string[];
    estimatedRecoveryTime?: number;
  } {
    const isOffline = !this.networkStatus.online;
    
    if (!isOffline) {
      return {
        isOffline: false,
        message: 'You are online',
        recommendations: []
      };
    }

    // Analyze offline duration and provide contextual messages
    const offlineDuration = this.getOfflineDuration();
    const recommendations = this.getOfflineRecommendations(offlineDuration);
    
    return {
      isOffline: true,
      message: this.getOfflineMessage(offlineDuration),
      recommendations,
      estimatedRecoveryTime: this.estimateRecoveryTime()
    };
  }

  /**
   * Handles slow connection with alternative loading strategies
   */
  handleSlowConnection(moduleId: ModuleId): {
    strategy: string;
    message: string;
    alternativeActions: Array<{
      action: string;
      label: string;
      description: string;
    }>;
    loadingOptions: LoadingOptions;
  } {
    const condition = this.networkStatus.condition;
    const strategy = this.adaptiveLoadingStrategies[condition];
    
    return {
      strategy: `Optimized for ${condition} connection`,
      message: this.getSlowConnectionMessage(condition),
      alternativeActions: this.getSlowConnectionActions(moduleId, condition),
      loadingOptions: {
        timeout: strategy.timeout,
        priority: 'low',
        useCache: true,
        retryEnabled: true
      }
    };
  }

  /**
   * Monitors network condition with adaptive thresholds
   */
  startNetworkConditionMonitoring(): () => void {
    const monitoringInterval = setInterval(() => {
      this.analyzeNetworkCondition();
    }, 5000); // Check every 5 seconds

    // Also monitor on visibility change (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        this.analyzeNetworkCondition();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(monitoringInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }

  /**
   * Implements retry strategies based on network status
   */
  getNetworkAwareRetryStrategy(moduleId: ModuleId, error: ModuleLoadingError): {
    shouldRetry: boolean;
    delay: number;
    strategy: string;
    maxAttempts: number;
    message: string;
  } {
    const condition = this.networkStatus.condition;
    const strategy = this.adaptiveLoadingStrategies[condition];
    
    // Don't retry if offline
    if (!this.networkStatus.online) {
      return {
        shouldRetry: false,
        delay: 0,
        strategy: 'offline_queue',
        maxAttempts: 0,
        message: 'Module will retry automatically when connection is restored'
      };
    }

    // Network-specific retry logic
    const isNetworkError = [
      ModuleLoadingErrorType.NETWORK_ERROR,
      ModuleLoadingErrorType.TIMEOUT_ERROR,
      ModuleLoadingErrorType.CHUNK_LOAD_ERROR
    ].includes(error.type);

    if (!isNetworkError) {
      return {
        shouldRetry: false,
        delay: 0,
        strategy: 'no_retry',
        maxAttempts: 0,
        message: 'This error is not network-related'
      };
    }

    return {
      shouldRetry: error.retryCount < strategy.maxRetries,
      delay: this.calculateAdaptiveDelay(error.retryCount, condition),
      strategy: `network_aware_${condition}`,
      maxAttempts: strategy.maxRetries,
      message: this.getRetryMessage(condition, error.retryCount, strategy.maxRetries)
    };
  }

  /**
   * Queues module loading requests for when connection is restored
   */
  queueForOfflineRetry(moduleId: ModuleId, options: LoadingOptions): void {
    // Remove any existing entry for this module
    this.offlineQueue = this.offlineQueue.filter(item => item.moduleId !== moduleId);
    
    // Add to queue
    this.offlineQueue.push({
      moduleId,
      options,
      timestamp: new Date(),
      retryCount: 0
    });

    console.log(`Queued ${moduleId} for offline retry. Queue length: ${this.offlineQueue.length}`);
  }

  /**
   * Processes offline queue when connection is restored
   */
  private processOfflineQueue(): void {
    if (!this.networkStatus.online || this.offlineQueue.length === 0) {
      return;
    }

    console.log(`Processing offline queue with ${this.offlineQueue.length} items`);
    
    const queueCopy = [...this.offlineQueue];
    this.offlineQueue = [];

    // Process queue items with staggered delays to prevent overwhelming
    queueCopy.forEach((item, index) => {
      setTimeout(() => {
        this.retryQueuedModule(item);
      }, index * 1000); // 1 second delay between items
    });
  }

  /**
   * Retries a queued module loading attempt
   */
  private retryQueuedModule(queueItem: {
    moduleId: ModuleId;
    options: LoadingOptions;
    timestamp: Date;
    retryCount: number;
  }): void {
    console.log(`Retrying queued module: ${queueItem.moduleId}`);
    
    // Emit custom event for module retry
    const retryEvent = new CustomEvent('offline-module-retry', {
      detail: {
        moduleId: queueItem.moduleId,
        options: queueItem.options,
        queuedAt: queueItem.timestamp,
        retryCount: queueItem.retryCount + 1
      }
    });
    
    window.dispatchEvent(retryEvent);
  }

  /**
   * Gets adaptive loading options based on network condition
   */
  getAdaptiveLoadingOptions(moduleId: ModuleId): LoadingOptions {
    const condition = this.networkStatus.condition;
    const strategy = this.adaptiveLoadingStrategies[condition];
    
    return {
      timeout: strategy.timeout,
      priority: condition === 'poor' ? 'high' : 'medium', // Higher priority for poor connections
      useCache: true,
      retryEnabled: condition !== 'offline',
      fallbackEnabled: true
    };
  }

  /**
   * Subscribe to network status changes
   */
  subscribeToNetworkChanges(callback: (status: NetworkStatus) => void): () => void {
    this.networkListeners.push(callback);
    
    return () => {
      const index = this.networkListeners.indexOf(callback);
      if (index > -1) {
        this.networkListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to offline status changes
   */
  subscribeToOfflineChanges(callback: (isOffline: boolean) => void): () => void {
    this.offlineListeners.push(callback);
    
    return () => {
      const index = this.offlineListeners.indexOf(callback);
      if (index > -1) {
        this.offlineListeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to connection quality changes
   */
  subscribeToConnectionQuality(callback: (quality: NetworkCondition) => void): () => void {
    this.connectionQualityListeners.push(callback);
    
    return () => {
      const index = this.connectionQualityListeners.indexOf(callback);
      if (index > -1) {
        this.connectionQualityListeners.splice(index, 1);
      }
    };
  }

  // Private methods

  /**
   * Initializes network monitoring with multiple detection methods
   */
  private initializeNetworkMonitoring(): void {
    // Basic online/offline detection
    window.addEventListener('online', () => {
      this.handleOnlineStatusChange(true);
    });

    window.addEventListener('offline', () => {
      this.handleOnlineStatusChange(false);
    });

    // Connection API monitoring (if available)
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        this.analyzeNetworkCondition();
      });
    }

    // Initial network status check
    this.analyzeNetworkCondition();
  }

  /**
   * Handles online/offline status changes
   */
  private handleOnlineStatusChange(isOnline: boolean): void {
    const wasOffline = !this.networkStatus.online;
    
    this.networkStatus.online = isOnline;
    
    if (isOnline && wasOffline) {
      console.log('Connection restored - processing offline queue');
      this.processOfflineQueue();
    }

    // Notify listeners
    this.notifyOfflineListeners(!isOnline);
    this.analyzeNetworkCondition();
  }

  /**
   * Analyzes current network condition using multiple metrics
   */
  private analyzeNetworkCondition(): void {
    const connection = (navigator as any).connection;
    const previousCondition = this.networkStatus.condition;
    
    if (!navigator.onLine) {
      this.updateNetworkStatus({
        condition: 'offline',
        online: false
      });
      return;
    }

    let condition: NetworkCondition = 'good';
    
    if (connection) {
      const { effectiveType, downlink, rtt, saveData } = connection;
      
      // Analyze connection quality
      if (effectiveType === '4g' && downlink > 5 && rtt < 100) {
        condition = 'excellent';
      } else if (effectiveType === '4g' && downlink > 2 && rtt < 200) {
        condition = 'good';
      } else if ((effectiveType === '4g' || effectiveType === '3g') && downlink > 0.5 && rtt < 500) {
        condition = 'fair';
      } else {
        condition = 'poor';
      }

      // Consider save data mode
      if (saveData) {
        condition = condition === 'excellent' ? 'good' : 
                    condition === 'good' ? 'fair' : 'poor';
      }

      this.updateNetworkStatus({
        condition,
        online: true,
        effectiveType,
        downlink,
        rtt,
        saveData
      });
    } else {
      // Fallback to basic detection
      this.updateNetworkStatus({
        condition: navigator.onLine ? 'good' : 'offline',
        online: navigator.onLine
      });
    }

    // Notify if condition changed significantly
    if (this.hasSignificantConditionChange(previousCondition, condition)) {
      this.notifyConnectionQualityListeners(condition);
    }
  }

  /**
   * Updates network status and maintains history
   */
  private updateNetworkStatus(status: Partial<NetworkStatus>): void {
    const prevStatus = { ...this.networkStatus };
    this.networkStatus = { ...this.networkStatus, ...status };
    
    // Add to history
    this.connectionHistory.push({
      timestamp: new Date(),
      condition: this.networkStatus.condition,
      online: this.networkStatus.online,
      rtt: this.networkStatus.rtt,
      downlink: this.networkStatus.downlink
    });

    // Keep only last 100 entries
    if (this.connectionHistory.length > 100) {
      this.connectionHistory = this.connectionHistory.slice(-100);
    }

    // Notify listeners if status changed
    if (JSON.stringify(prevStatus) !== JSON.stringify(this.networkStatus)) {
      this.notifyNetworkListeners(this.networkStatus);
    }
  }

  /**
   * Starts periodic network analysis for pattern detection
   */
  private startNetworkAnalysis(): void {
    setInterval(() => {
      this.analyzeConnectionPatterns();
    }, 30000); // Analyze every 30 seconds
  }

  /**
   * Analyzes connection patterns for predictive optimization
   */
  private analyzeConnectionPatterns(): void {
    if (this.connectionHistory.length < 10) return;

    const recentHistory = this.connectionHistory.slice(-10);
    const connectionDrops = recentHistory.filter((entry, index) => 
      index > 0 && !entry.online && recentHistory[index - 1].online
    ).length;

    // If frequent drops, recommend offline-first strategies
    if (connectionDrops > 3) {
      console.log('Frequent connection drops detected - recommending offline-first approach');
      // Could emit an event for UI to show offline-first recommendations
    }
  }

  // Helper methods

  private getOfflineDuration(): number {
    const offlineEntries = this.connectionHistory.filter(entry => !entry.online);
    if (offlineEntries.length === 0) return 0;
    
    const lastOffline = offlineEntries[offlineEntries.length - 1];
    return Date.now() - lastOffline.timestamp.getTime();
  }

  private getOfflineMessage(duration: number): string {
    const minutes = Math.floor(duration / 60000);
    
    if (minutes < 1) {
      return 'You are currently offline. Please check your internet connection.';
    } else if (minutes < 5) {
      return `You've been offline for ${minutes} minute${minutes > 1 ? 's' : ''}. Some features are limited.`;
    } else {
      return `Extended offline period (${minutes} minutes). Consider checking your network settings.`;
    }
  }

  private getOfflineRecommendations(duration: number): string[] {
    const recommendations = [
      'Check your internet connection',
      'Try switching between WiFi and mobile data'
    ];

    if (duration > 300000) { // 5 minutes
      recommendations.push(
        'Restart your router or modem',
        'Contact your internet service provider'
      );
    }

    return recommendations;
  }

  private estimateRecoveryTime(): number {
    // Simple estimation based on historical recovery patterns
    const averageOfflineDuration = this.connectionHistory
      .filter(entry => !entry.online)
      .reduce((sum, _, index, arr) => sum + (index > 0 ? 30000 : 0), 0) / 
      Math.max(1, this.connectionHistory.filter(entry => !entry.online).length);

    return Math.min(averageOfflineDuration * 1.5, 300000); // Cap at 5 minutes
  }

  private getSlowConnectionMessage(condition: NetworkCondition): string {
    switch (condition) {
      case 'poor':
        return 'Very slow connection detected. Loading with optimized settings.';
      case 'fair':
        return 'Slow connection detected. Using lightweight loading strategy.';
      case 'good':
        return 'Connection is stable but not optimal. Loading normally.';
      case 'excellent':
        return 'Excellent connection. All features available.';
      default:
        return 'Connection quality unknown. Using conservative loading strategy.';
    }
  }

  private getSlowConnectionActions(moduleId: ModuleId, condition: NetworkCondition): Array<{
    action: string;
    label: string;
    description: string;
  }> {
    const actions = [
      {
        action: 'retry_with_cache',
        label: 'Use Cached Version',
        description: 'Load the last cached version of this module'
      },
      {
        action: 'switch_to_basic',
        label: 'Basic Mode',
        description: 'Load a simplified version with fewer features'
      }
    ];

    if (condition === 'poor' || condition === 'fair') {
      actions.push({
        action: 'queue_for_later',
        label: 'Load Later',
        description: 'Queue this module to load when connection improves'
      });
    }

    return actions;
  }

  private calculateAdaptiveDelay(retryCount: number, condition: NetworkCondition): number {
    const baseDelay = this.adaptiveLoadingStrategies[condition].retryDelay;
    const exponentialFactor = Math.pow(1.5, retryCount);
    const jitter = (Math.random() - 0.5) * 0.2; // ±10% jitter
    
    return Math.round(baseDelay * exponentialFactor * (1 + jitter));
  }

  private getRetryMessage(condition: NetworkCondition, currentAttempt: number, maxAttempts: number): string {
    return `Retrying with ${condition} connection strategy (attempt ${currentAttempt + 1}/${maxAttempts})`;
  }

  private hasSignificantConditionChange(prev: NetworkCondition, current: NetworkCondition): boolean {
    const conditionLevels = { offline: 0, poor: 1, fair: 2, good: 3, excellent: 4 };
    const prevLevel = conditionLevels[prev];
    const currentLevel = conditionLevels[current];
    
    return Math.abs(prevLevel - currentLevel) >= 2; // Significant if 2+ levels difference
  }

  // Notification methods

  private notifyNetworkListeners(status: NetworkStatus): void {
    this.networkListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  private notifyOfflineListeners(isOffline: boolean): void {
    this.offlineListeners.forEach(listener => {
      try {
        listener(isOffline);
      } catch (error) {
        console.error('Error in offline status listener:', error);
      }
    });
  }

  private notifyConnectionQualityListeners(quality: NetworkCondition): void {
    this.connectionQualityListeners.forEach(listener => {
      try {
        listener(quality);
      } catch (error) {
        console.error('Error in connection quality listener:', error);
      }
    });
  }
}

// Create and export singleton instance
export const networkRecoveryService = new NetworkRecoveryService();
export default NetworkRecoveryService;