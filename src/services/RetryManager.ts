import {
  ModuleId,
  ModuleLoadingError,
  ModuleLoadingErrorType,
  RetryConfig,
  RetryAttempt,
  RetryState,
  NetworkCondition,
  IRetryManager
} from '../types/moduleLoading';

/**
 * RetryManager Service
 * 
 * Provides intelligent retry logic with exponential backoff for module loading failures.
 * Features:
 * - Exponential backoff with jitter to prevent thundering herd
 * - Retry attempt tracking and success rate monitoring
 * - Retry cooldown periods to prevent retry storms
 * - Retry eligibility validation based on error types
 * - Thread-safe retry state management
 */
class RetryManager implements IRetryManager {
  private retryStates: Map<ModuleId, RetryState> = new Map();
  private retryTimers: Map<ModuleId, NodeJS.Timeout> = new Map();
  private readonly defaultRetryConfig: RetryConfig;

  constructor(customConfig?: Partial<RetryConfig>) {
    this.defaultRetryConfig = {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: [
        ModuleLoadingErrorType.NETWORK_ERROR,
        ModuleLoadingErrorType.TIMEOUT_ERROR,
        ModuleLoadingErrorType.CHUNK_LOAD_ERROR,
        ModuleLoadingErrorType.SCRIPT_ERROR,
        ModuleLoadingErrorType.COMPONENT_ERROR
      ],
      cooldownPeriodMs: 60000, // 1 minute cooldown after exhaustion
      ...customConfig
    };

    // Cleanup expired retry states periodically
    this.startPeriodicCleanup();
  }

  /**
   * Determines whether a module should be retried based on error type and current state
   */
  shouldRetry(moduleId: ModuleId, error: ModuleLoadingError): boolean {
    // Check if error type is retryable
    if (!this.isRetryableError(error.type)) {
      return false;
    }

    // Check network conditions for network-related errors
    if (this.isNetworkError(error.type) && !this.isNetworkAvailable()) {
      return false;
    }

    const retryState = this.getRetryState(moduleId);
    
    // Check if module is in cooldown
    if (retryState && this.isInCooldown(moduleId)) {
      return false;
    }

    // Check if retry attempts are exhausted
    if (retryState && retryState.exhausted) {
      return false;
    }

    // Check if max attempts reached
    const currentAttempts = retryState?.attempts.length || 0;
    const maxAttempts = error.maxRetries || this.defaultRetryConfig.maxAttempts;
    
    return currentAttempts < maxAttempts;
  }

  /**
   * Schedules a retry attempt for a failed module
   */
  scheduleRetry(moduleId: ModuleId, error: ModuleLoadingError): void {
    if (!this.shouldRetry(moduleId, error)) {
      this.markRetryExhausted(moduleId);
      return;
    }

    const retryState = this.getOrCreateRetryState(moduleId);
    const attemptNumber = retryState.attempts.length + 1;
    const delay = this.calculateRetryDelay(attemptNumber);
    const nextRetryAt = new Date(Date.now() + delay);

    // Create retry attempt record
    const attempt: RetryAttempt = {
      attemptNumber,
      timestamp: new Date(),
      delayMs: delay,
      error,
      success: false,
      networkCondition: this.getCurrentNetworkCondition()
    };

    // Update retry state
    retryState.attempts.push(attempt);
    retryState.nextRetryAt = nextRetryAt;
    retryState.inCooldown = false;
    retryState.exhausted = false;

    this.retryStates.set(moduleId, retryState);

    // Clear any existing timer
    this.clearRetryTimer(moduleId);

    // Schedule the retry
    const timer = setTimeout(() => {
      this.executeRetry(moduleId);
    }, delay);

    this.retryTimers.set(moduleId, timer);

    console.log(`Retry scheduled for ${moduleId} in ${delay}ms (attempt ${attemptNumber})`);
  }

  /**
   * Gets the current retry state for a module
   */
  getRetryState(moduleId: ModuleId): RetryState | null {
    return this.retryStates.get(moduleId) || null;
  }

  /**
   * Resets the retry state for a module (called after successful load)
   */
  resetRetryState(moduleId: ModuleId): void {
    this.clearRetryTimer(moduleId);
    this.retryStates.delete(moduleId);
    console.log(`Retry state reset for ${moduleId}`);
  }

  /**
   * Checks if a module is currently in cooldown period
   */
  isInCooldown(moduleId: ModuleId): boolean {
    const retryState = this.retryStates.get(moduleId);
    if (!retryState || !retryState.inCooldown) {
      return false;
    }

    const now = new Date();
    if (retryState.nextRetryAt && now < retryState.nextRetryAt) {
      return true;
    }

    // Cooldown period has expired
    retryState.inCooldown = false;
    this.retryStates.set(moduleId, retryState);
    return false;
  }

  /**
   * Marks a successful retry attempt
   */
  markRetrySuccess(moduleId: ModuleId): void {
    const retryState = this.retryStates.get(moduleId);
    if (!retryState || retryState.attempts.length === 0) {
      return;
    }

    // Mark the last attempt as successful
    const lastAttempt = retryState.attempts[retryState.attempts.length - 1];
    lastAttempt.success = true;

    // Reset retry state after successful retry
    this.resetRetryState(moduleId);

    console.log(`Retry successful for ${moduleId} after ${retryState.attempts.length} attempts`);
  }

  /**
   * Gets retry statistics for monitoring and analytics
   */
  getRetryStatistics(): {
    totalModulesWithRetries: number;
    modulesInCooldown: number;
    modulesExhausted: number;
    averageRetriesPerModule: number;
    mostRetriedModules: Array<{ moduleId: ModuleId; attempts: number }>;
  } {
    const states = Array.from(this.retryStates.values());
    const totalModules = states.length;
    const modulesInCooldown = states.filter(s => s.inCooldown).length;
    const modulesExhausted = states.filter(s => s.exhausted).length;
    const totalAttempts = states.reduce((sum, s) => sum + s.attempts.length, 0);
    const averageRetries = totalModules > 0 ? totalAttempts / totalModules : 0;

    const mostRetried: Array<{ moduleId: ModuleId; attempts: number }> = [];
    this.retryStates.forEach((state, moduleId) => {
      mostRetried.push({ moduleId, attempts: state.attempts.length });
    });
    mostRetried.sort((a, b) => b.attempts - a.attempts).slice(0, 10);

    return {
      totalModulesWithRetries: totalModules,
      modulesInCooldown,
      modulesExhausted,
      averageRetriesPerModule: Math.round(averageRetries * 100) / 100,
      mostRetriedModules: mostRetried
    };
  }

  /**
   * Updates retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    Object.assign(this.defaultRetryConfig, config);
    console.log('Retry configuration updated:', config);
  }

  // Private methods

  private getOrCreateRetryState(moduleId: ModuleId): RetryState {
    let retryState = this.retryStates.get(moduleId);
    
    if (!retryState) {
      retryState = {
        moduleId,
        attempts: [],
        inCooldown: false,
        exhausted: false
      };
      this.retryStates.set(moduleId, retryState);
    }

    return retryState;
  }

  private calculateRetryDelay(attemptNumber: number): number {
    const baseDelay = this.defaultRetryConfig.initialDelayMs;
    const multiplier = this.defaultRetryConfig.backoffMultiplier;
    const maxDelay = this.defaultRetryConfig.maxDelayMs;

    // Calculate exponential backoff
    let delay = baseDelay * Math.pow(multiplier, attemptNumber - 1);
    
    // Cap at maximum delay
    delay = Math.min(delay, maxDelay);

    // Add jitter to prevent thundering herd
    if (this.defaultRetryConfig.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      delay = Math.max(0, delay + jitter);
    }

    return Math.round(delay);
  }

  private isRetryableError(errorType: ModuleLoadingErrorType): boolean {
    return this.defaultRetryConfig.retryableErrors.includes(errorType);
  }

  private isNetworkError(errorType: ModuleLoadingErrorType): boolean {
    return [
      ModuleLoadingErrorType.NETWORK_ERROR,
      ModuleLoadingErrorType.TIMEOUT_ERROR,
      ModuleLoadingErrorType.OFFLINE_ERROR
    ].includes(errorType);
  }

  private isNetworkAvailable(): boolean {
    return navigator.onLine;
  }

  private getCurrentNetworkCondition(): NetworkCondition {
    if (!navigator.onLine) {
      return 'offline';
    }

    // Try to determine network condition from connection API
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

  private markRetryExhausted(moduleId: ModuleId): void {
    const retryState = this.getOrCreateRetryState(moduleId);
    retryState.exhausted = true;
    retryState.inCooldown = true;
    retryState.nextRetryAt = new Date(Date.now() + this.defaultRetryConfig.cooldownPeriodMs);
    
    this.retryStates.set(moduleId, retryState);
    console.warn(`Retry attempts exhausted for ${moduleId}. Entering cooldown period.`);
  }

  private executeRetry(moduleId: ModuleId): void {
    // This method would typically trigger a retry through the ModuleLoadingManager
    // For now, we'll just log and clear the timer
    console.log(`Executing retry for ${moduleId}`);
    this.clearRetryTimer(moduleId);

    // In integration with ModuleLoadingManager, this would call:
    // this.moduleLoadingManager.retryModule(moduleId)
    
    // For now, we'll emit a custom event that the ModuleLoadingManager can listen to
    this.emitRetryEvent(moduleId);
  }

  private emitRetryEvent(moduleId: ModuleId): void {
    // Create a custom event for retry execution
    const retryEvent = new CustomEvent('module-retry', {
      detail: { moduleId }
    });
    window.dispatchEvent(retryEvent);
  }

  private clearRetryTimer(moduleId: ModuleId): void {
    const timer = this.retryTimers.get(moduleId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(moduleId);
    }
  }

  private startPeriodicCleanup(): void {
    // Clean up old retry states every 10 minutes
    setInterval(() => {
      this.cleanupExpiredStates();
    }, 10 * 60 * 1000);
  }

  private cleanupExpiredStates(): void {
    const now = new Date();
    const expiredModules: ModuleId[] = [];

    this.retryStates.forEach((retryState, moduleId) => {
      // Clean up states that have been inactive for more than 1 hour
      const lastAttempt = retryState.attempts[retryState.attempts.length - 1];
      const lastActivity = lastAttempt?.timestamp || new Date(0);
      const inactiveTime = now.getTime() - lastActivity.getTime();

      if (inactiveTime > 60 * 60 * 1000) { // 1 hour
        expiredModules.push(moduleId);
      }
    });

    // Remove expired states
    for (const moduleId of expiredModules) {
      this.clearRetryTimer(moduleId);
      this.retryStates.delete(moduleId);
    }

    if (expiredModules.length > 0) {
      console.log(`Cleaned up ${expiredModules.length} expired retry states`);
    }
  }

  /**
   * Gets all modules currently in retry state (for debugging/monitoring)
   */
  getModulesInRetry(): ModuleId[] {
    const modules: ModuleId[] = [];
    this.retryStates.forEach((_state, moduleId) => {
      modules.push(moduleId);
    });
    return modules;
  }

  /**
   * Forces a retry state reset (for testing/debugging)
   */
  forceResetRetryState(moduleId: ModuleId): void {
    console.warn(`Force resetting retry state for ${moduleId}`);
    this.resetRetryState(moduleId);
  }

  /**
   * Gets detailed retry history for a module
   */
  getRetryHistory(moduleId: ModuleId): RetryAttempt[] {
    const retryState = this.retryStates.get(moduleId);
    return retryState?.attempts || [];
  }

  /**
   * Calculates success rate for a module's retry attempts
   */
  getRetrySuccessRate(moduleId: ModuleId): number {
    const attempts = this.getRetryHistory(moduleId);
    if (attempts.length === 0) return 0;

    const successfulAttempts = attempts.filter(a => a.success).length;
    return Math.round((successfulAttempts / attempts.length) * 100);
  }

  /**
   * Cleanup method to be called when service is destroyed
   */
  destroy(): void {
    // Clear all timers
    this.retryTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    
    this.retryTimers.clear();
    this.retryStates.clear();
    
    console.log('RetryManager destroyed and cleaned up');
  }
}

// Create and export singleton instance
export const retryManager = new RetryManager();
export default RetryManager;