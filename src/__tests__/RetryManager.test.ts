import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RetryManager from '../services/RetryManager';
import { ModuleId, ModuleLoadingErrorType } from '../types/moduleLoading';

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    vi.useFakeTimers();
    retryManager = new RetryManager();
  });

  afterEach(() => {
    retryManager.destroy();
    vi.useRealTimers();
  });

  describe('shouldRetry', () => {
    it('should return true for retryable errors', () => {
      const error = {
        type: ModuleLoadingErrorType.NETWORK_ERROR,
        moduleId: 'dashboard' as ModuleId,
        message: 'Network error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        recoverable: true
      };

      expect(retryManager.shouldRetry('dashboard', error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = {
        type: ModuleLoadingErrorType.PERMISSION_DENIED,
        moduleId: 'dashboard' as ModuleId,
        message: 'Permission denied',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        recoverable: false
      };

      expect(retryManager.shouldRetry('dashboard', error)).toBe(false);
    });

    it('should return false when max retries exceeded', () => {
      const error = {
        type: ModuleLoadingErrorType.NETWORK_ERROR,
        moduleId: 'dashboard' as ModuleId,
        message: 'Network error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 2,
        recoverable: true
      };

      // First retry should be allowed
      expect(retryManager.shouldRetry('dashboard', error)).toBe(true);
      retryManager.scheduleRetry('dashboard', error);

      // Second retry should be allowed
      expect(retryManager.shouldRetry('dashboard', error)).toBe(true);
      retryManager.scheduleRetry('dashboard', error);

      // Third retry should not be allowed (exceeded maxRetries of 2)
      expect(retryManager.shouldRetry('dashboard', error)).toBe(false);
    });

    it('should return false when module is in cooldown', () => {
      const error = {
        type: ModuleLoadingErrorType.NETWORK_ERROR,
        moduleId: 'dashboard' as ModuleId,
        message: 'Network error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 2, // Limit to 2 retries to trigger exhaustion faster
        recoverable: true
      };

      // First retry should work
      expect(retryManager.shouldRetry('dashboard', error)).toBe(true);
      retryManager.scheduleRetry('dashboard', error);
      
      // Second retry should work
      expect(retryManager.shouldRetry('dashboard', error)).toBe(true);
      retryManager.scheduleRetry('dashboard', error);
      
      // Third retry should be rejected - this call to scheduleRetry should trigger exhaustion
      expect(retryManager.shouldRetry('dashboard', error)).toBe(false);
      retryManager.scheduleRetry('dashboard', error); // This will call markRetryExhausted internally
      
      // Module should now be exhausted and in cooldown
      const retryState = retryManager.getRetryState('dashboard');
      expect(retryState?.exhausted).toBe(true);
      expect(retryState?.inCooldown).toBe(true);
      expect(retryManager.isInCooldown('dashboard')).toBe(true);
    });
  });

  describe('scheduleRetry', () => {
    it('should schedule a retry with exponential backoff', () => {
      const error = {
        type: ModuleLoadingErrorType.NETWORK_ERROR,
        moduleId: 'dashboard' as ModuleId,
        message: 'Network error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        recoverable: true
      };

      retryManager.scheduleRetry('dashboard', error);

      const retryState = retryManager.getRetryState('dashboard');
      expect(retryState).toBeTruthy();
      expect(retryState?.attempts.length).toBe(1);
      expect(retryState?.nextRetryAt).toBeTruthy();
      expect(retryState?.exhausted).toBe(false);
    });

    it('should emit retry event after delay', () => {
      const error = {
        type: ModuleLoadingErrorType.NETWORK_ERROR,
        moduleId: 'dashboard' as ModuleId,
        message: 'Network error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        recoverable: true
      };

      const eventSpy = vi.fn();
      window.addEventListener('module-retry', eventSpy);

      retryManager.scheduleRetry('dashboard', error);

      // Fast forward time to trigger the retry
      vi.advanceTimersByTime(2000);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'module-retry',
          detail: { moduleId: 'dashboard' }
        })
      );

      window.removeEventListener('module-retry', eventSpy);
    });
  });

  describe('resetRetryState', () => {
    it('should clear retry state for a module', () => {
      const error = {
        type: ModuleLoadingErrorType.NETWORK_ERROR,
        moduleId: 'dashboard' as ModuleId,
        message: 'Network error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        recoverable: true
      };

      retryManager.scheduleRetry('dashboard', error);
      expect(retryManager.getRetryState('dashboard')).toBeTruthy();

      retryManager.resetRetryState('dashboard');
      expect(retryManager.getRetryState('dashboard')).toBe(null);
    });
  });

  describe('markRetrySuccess', () => {
    it('should mark the last retry attempt as successful', () => {
      const error = {
        type: ModuleLoadingErrorType.NETWORK_ERROR,
        moduleId: 'dashboard' as ModuleId,
        message: 'Network error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        recoverable: true
      };

      retryManager.scheduleRetry('dashboard', error);
      
      const retryStateBefore = retryManager.getRetryState('dashboard');
      expect(retryStateBefore?.attempts[0].success).toBe(false);

      retryManager.markRetrySuccess('dashboard');

      // State should be reset after successful retry
      expect(retryManager.getRetryState('dashboard')).toBe(null);
    });
  });

  describe('getRetryStatistics', () => {
    it('should return correct statistics', () => {
      const error1 = {
        type: ModuleLoadingErrorType.NETWORK_ERROR,
        moduleId: 'dashboard' as ModuleId,
        message: 'Network error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        recoverable: true
      };

      const error2 = {
        type: ModuleLoadingErrorType.TIMEOUT_ERROR,
        moduleId: 'pos' as ModuleId,
        message: 'Timeout error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        recoverable: true
      };

      retryManager.scheduleRetry('dashboard', error1);
      retryManager.scheduleRetry('pos', error2);

      const stats = retryManager.getRetryStatistics();

      expect(stats.totalModulesWithRetries).toBe(2);
      expect(stats.averageRetriesPerModule).toBe(1);
      expect(stats.mostRetriedModules).toHaveLength(2);
    });
  });

  describe('isInCooldown', () => {
    it('should return false for modules not in cooldown', () => {
      expect(retryManager.isInCooldown('dashboard')).toBe(false);
    });

    it('should return true for modules in cooldown', () => {
      const error = {
        type: ModuleLoadingErrorType.NETWORK_ERROR,
        moduleId: 'dashboard' as ModuleId,
        message: 'Network error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 1,
        recoverable: true
      };

      // Exhaust retries to trigger cooldown
      retryManager.scheduleRetry('dashboard', error);
      retryManager.scheduleRetry('dashboard', error); // This should trigger exhaustion

      expect(retryManager.isInCooldown('dashboard')).toBe(true);
    });
  });

  describe('exponential backoff', () => {
    it('should increase delay with each retry attempt', () => {
      const error = {
        type: ModuleLoadingErrorType.NETWORK_ERROR,
        moduleId: 'dashboard' as ModuleId,
        message: 'Network error',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 5,
        recoverable: true
      };

      // First retry
      retryManager.scheduleRetry('dashboard', error);
      const state1 = retryManager.getRetryState('dashboard');
      const delay1 = state1?.attempts[0].delayMs || 0;

      // Second retry
      retryManager.scheduleRetry('dashboard', error);
      const state2 = retryManager.getRetryState('dashboard');
      const delay2 = state2?.attempts[1].delayMs || 0;

      // Third retry
      retryManager.scheduleRetry('dashboard', error);
      const state3 = retryManager.getRetryState('dashboard');
      const delay3 = state3?.attempts[2].delayMs || 0;

      // Each delay should be larger than the previous (with some tolerance for jitter)
      expect(delay2).toBeGreaterThan(delay1 * 0.8); // Allow 20% jitter tolerance
      expect(delay3).toBeGreaterThan(delay2 * 0.8);
    });
  });
});