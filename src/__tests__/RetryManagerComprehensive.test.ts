/**
 * Comprehensive Unit Tests for RetryManager
 * Tests exponential backoff, retry logic, and all error scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryManager } from '../services/RetryManager';
import type { RetryConfig, RetryAttempt, ModuleLoadingError } from '../types/moduleLoading';

describe('RetryManager', () => {
  let retryManager: RetryManager;
  let mockConsole: {
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 100,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitter: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods
    mockConsole = {
      warn: vi.fn(),
      error: vi.fn()
    };
    global.console.warn = mockConsole.warn;
    global.console.error = mockConsole.error;

    retryManager = new RetryManager(defaultConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Exponential Backoff Logic', () => {
    it('should calculate delay with exponential backoff', () => {
      // Test delay calculation for different attempts
      const delay1 = retryManager['calculateDelay'](1);
      const delay2 = retryManager['calculateDelay'](2);
      const delay3 = retryManager['calculateDelay'](3);

      // Base delay should be multiplied exponentially
      expect(delay1).toBeGreaterThanOrEqual(defaultConfig.baseDelay);
      expect(delay2).toBeGreaterThanOrEqual(defaultConfig.baseDelay * defaultConfig.backoffMultiplier);
      expect(delay3).toBeGreaterThanOrEqual(defaultConfig.baseDelay * Math.pow(defaultConfig.backoffMultiplier, 2));
    });

    it('should respect maximum delay limit', () => {
      // Test with high attempt number
      const delay = retryManager['calculateDelay'](10);
      
      expect(delay).toBeLessThanOrEqual(defaultConfig.maxDelay);
    });

    it('should add jitter when enabled', () => {
      const jitterConfig: RetryConfig = {
        ...defaultConfig,
        jitter: true,
        baseDelay: 1000
      };
      const retryManagerWithJitter = new RetryManager(jitterConfig);

      // Generate multiple delays to check for variance
      const delays = Array.from({ length: 10 }, () => 
        retryManagerWithJitter['calculateDelay'](1)
      );

      // With jitter, delays should vary
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it('should not add jitter when disabled', () => {
      const noJitterConfig: RetryConfig = {
        ...defaultConfig,
        jitter: false,
        baseDelay: 1000
      };
      const retryManagerNoJitter = new RetryManager(noJitterConfig);

      // Generate multiple delays - should be consistent
      const delays = Array.from({ length: 5 }, () => 
        retryManagerNoJitter['calculateDelay'](1)
      );

      // Without jitter, all delays should be the same
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBe(1);
    });
  });

  describe('Retry Eligibility', () => {
    it('should allow retry for network errors', () => {
      const networkError: ModuleLoadingError = {
        type: 'network_error',
        message: 'Failed to fetch',
        moduleId: 'test-module',
        timestamp: Date.now(),
        retryable: true
      };

      const canRetry = retryManager.shouldRetry(networkError, 1);
      expect(canRetry).toBe(true);
    });

    it('should allow retry for timeout errors', () => {
      const timeoutError: ModuleLoadingError = {
        type: 'timeout',
        message: 'Loading timeout',
        moduleId: 'test-module',
        timestamp: Date.now(),
        retryable: true
      };

      const canRetry = retryManager.shouldRetry(timeoutError, 1);
      expect(canRetry).toBe(true);
    });

    it('should allow retry for chunk load errors', () => {
      const chunkError: ModuleLoadingError = {
        type: 'chunk_load_error',
        message: 'Loading chunk failed',
        moduleId: 'test-module',
        timestamp: Date.now(),
        retryable: true
      };

      const canRetry = retryManager.shouldRetry(chunkError, 1);
      expect(canRetry).toBe(true);
    });

    it('should not allow retry for permission errors', () => {
      const permissionError: ModuleLoadingError = {
        type: 'permission_denied',
        message: 'Access denied',
        moduleId: 'test-module',
        timestamp: Date.now(),
        retryable: false,
        userRole: 'employee'
      };

      const canRetry = retryManager.shouldRetry(permissionError, 1);
      expect(canRetry).toBe(false);
    });

    it('should not allow retry for module errors', () => {
      const moduleError: ModuleLoadingError = {
        type: 'module_error',
        message: 'Syntax error',
        moduleId: 'test-module',
        timestamp: Date.now(),
        retryable: false
      };

      const canRetry = retryManager.shouldRetry(moduleError, 1);
      expect(canRetry).toBe(false);
    });

    it('should not retry when max attempts exceeded', () => {
      const networkError: ModuleLoadingError = {
        type: 'network_error',
        message: 'Failed to fetch',
        moduleId: 'test-module',
        timestamp: Date.now(),
        retryable: true
      };

      const canRetry = retryManager.shouldRetry(networkError, defaultConfig.maxAttempts);
      expect(canRetry).toBe(false);
    });
  });

  describe('executeWithRetry - Success Scenarios', () => {
    it('should execute function successfully on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(mockFn, 'test-module');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should succeed after retries', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(mockFn, 'test-module');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('executeWithRetry - Failure Scenarios', () => {
    it('should fail after max retries for retryable errors', async () => {
      const networkError = new Error('Persistent network error');
      networkError.name = 'NetworkError';
      const mockFn = vi.fn().mockRejectedValue(networkError);

      await expect(
        retryManager.executeWithRetry(mockFn, 'test-module')
      ).rejects.toThrow('Persistent network error');

      expect(mockFn).toHaveBeenCalledTimes(defaultConfig.maxAttempts);
    });

    it('should fail immediately for non-retryable errors', async () => {
      const syntaxError = new Error('Syntax error');
      syntaxError.name = 'SyntaxError';
      const mockFn = vi.fn().mockRejectedValue(syntaxError);

      await expect(
        retryManager.executeWithRetry(mockFn, 'test-module')
      ).rejects.toThrow('Syntax error');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle permission errors without retry', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'PermissionError';
      const mockFn = vi.fn().mockRejectedValue(permissionError);

      await expect(
        retryManager.executeWithRetry(mockFn, 'test-module')
      ).rejects.toThrow('Permission denied');

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry Timing and Delays', () => {
    it('should wait between retry attempts', async () => {
      const start = Date.now();
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      await retryManager.executeWithRetry(mockFn, 'test-module');

      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(defaultConfig.baseDelay);
    });

    it('should increase delay between successive retries', async () => {
      const delays: number[] = [];
      const mockFn = vi.fn().mockImplementation(async () => {
        delays.push(Date.now());
        if (delays.length < 3) {
          throw new Error('Network error');
        }
        return 'success';
      });

      await retryManager.executeWithRetry(mockFn, 'test-module');

      expect(delays.length).toBe(3);
      // Check that delays increase (accounting for jitter)
      const gap1 = delays[1] - delays[0];
      const gap2 = delays[2] - delays[1];
      expect(gap2).toBeGreaterThan(gap1 * 0.8); // Allow for jitter variance
    });
  });

  describe('Error Classification', () => {
    it('should correctly classify network errors as retryable', () => {
      const errors = [
        new Error('Failed to fetch'),
        new Error('Network request failed'),
        new Error('ERR_NETWORK'),
        new Error('ERR_INTERNET_DISCONNECTED')
      ];

      errors.forEach(error => {
        error.name = 'TypeError';
        const classification = retryManager['classifyError'](error);
        expect(classification.retryable).toBe(true);
        expect(classification.type).toBe('network_error');
      });
    });

    it('should correctly classify timeout errors as retryable', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      const classification = retryManager['classifyError'](timeoutError);
      expect(classification.retryable).toBe(true);
      expect(classification.type).toBe('timeout');
    });

    it('should correctly classify chunk loading errors as retryable', () => {
      const chunkError = new Error('Loading chunk 0 failed');
      chunkError.name = 'ChunkLoadError';

      const classification = retryManager['classifyError'](chunkError);
      expect(classification.retryable).toBe(true);
      expect(classification.type).toBe('chunk_load_error');
    });

    it('should correctly classify syntax errors as non-retryable', () => {
      const syntaxError = new Error('Unexpected token');
      syntaxError.name = 'SyntaxError';

      const classification = retryManager['classifyError'](syntaxError);
      expect(classification.retryable).toBe(false);
      expect(classification.type).toBe('module_error');
    });
  });

  describe('Retry Statistics and Tracking', () => {
    it('should track retry attempts', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      await retryManager.executeWithRetry(mockFn, 'test-module');

      const stats = retryManager.getRetryStats('test-module');
      expect(stats.totalAttempts).toBe(3);
      expect(stats.successfulRetries).toBe(1);
      expect(stats.failedAttempts).toBe(2);
    });

    it('should track success rate', async () => {
      const mockFn1 = vi.fn().mockResolvedValue('success');
      const mockFn2 = vi.fn().mockRejectedValue(new Error('Fatal error'));
      mockFn2.name = 'SyntaxError';

      // One successful execution
      await retryManager.executeWithRetry(mockFn1, 'module1');

      // One failed execution
      try {
        await retryManager.executeWithRetry(mockFn2, 'module2');
      } catch (e) {
        // Expected to fail
      }

      const globalStats = retryManager.getGlobalStats();
      expect(globalStats.successRate).toBe(0.5);
      expect(globalStats.totalModules).toBe(2);
    });

    it('should reset stats for specific module', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      await retryManager.executeWithRetry(mockFn, 'test-module');

      let stats = retryManager.getRetryStats('test-module');
      expect(stats.totalAttempts).toBe(2);

      retryManager.resetStats('test-module');
      stats = retryManager.getRetryStats('test-module');
      expect(stats.totalAttempts).toBe(0);
    });
  });

  describe('Configuration Options', () => {
    it('should use custom configuration', () => {
      const customConfig: RetryConfig = {
        maxAttempts: 5,
        baseDelay: 200,
        maxDelay: 5000,
        backoffMultiplier: 3,
        jitter: false
      };

      const customRetryManager = new RetryManager(customConfig);
      const delay = customRetryManager['calculateDelay'](1);

      expect(delay).toBe(customConfig.baseDelay);
    });

    it('should update configuration at runtime', () => {
      const newConfig: RetryConfig = {
        maxAttempts: 2,
        baseDelay: 50,
        maxDelay: 1000,
        backoffMultiplier: 1.5,
        jitter: false
      };

      retryManager.updateConfig(newConfig);
      const delay = retryManager['calculateDelay'](1);

      expect(delay).toBe(newConfig.baseDelay);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should trigger circuit breaker after consecutive failures', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Persistent error'));

      // Trigger multiple failures
      for (let i = 0; i < 5; i++) {
        try {
          await retryManager.executeWithRetry(mockFn, 'failing-module');
        } catch (e) {
          // Expected to fail
        }
      }

      const isCircuitOpen = retryManager.isCircuitOpen('failing-module');
      expect(isCircuitOpen).toBe(true);
    });

    it('should prevent execution when circuit is open', async () => {
      // First, trigger circuit breaker
      const mockFn = vi.fn().mockRejectedValue(new Error('Persistent error'));
      
      for (let i = 0; i < 5; i++) {
        try {
          await retryManager.executeWithRetry(mockFn, 'failing-module');
        } catch (e) {
          // Expected to fail
        }
      }

      // Now try to execute - should be blocked by circuit breaker
      const newMockFn = vi.fn().mockResolvedValue('success');
      
      await expect(
        retryManager.executeWithRetry(newMockFn, 'failing-module')
      ).rejects.toThrow(/circuit.*open/i);

      expect(newMockFn).not.toHaveBeenCalled();
    });

    it('should reset circuit breaker after cooldown period', async () => {
      const shortCooldownConfig: RetryConfig = {
        ...defaultConfig,
        circuitBreakerThreshold: 3,
        circuitBreakerCooldown: 100
      };

      const circuitBreakerManager = new RetryManager(shortCooldownConfig);

      // Trigger circuit breaker
      const mockFn = vi.fn().mockRejectedValue(new Error('Error'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreakerManager.executeWithRetry(mockFn, 'test-module');
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreakerManager.isCircuitOpen('test-module')).toBe(true);

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(circuitBreakerManager.isCircuitOpen('test-module')).toBe(false);
    });
  });

  describe('Memory Management', () => {
    it('should cleanup old retry data', () => {
      // Execute some retries
      const modules = ['module1', 'module2', 'module3'];
      modules.forEach(module => {
        try {
          retryManager.executeWithRetry(
            vi.fn().mockRejectedValue(new Error('Test')),
            module
          );
        } catch (e) {
          // Expected
        }
      });

      // Cleanup old data
      retryManager.cleanup();

      modules.forEach(module => {
        const stats = retryManager.getRetryStats(module);
        expect(stats.totalAttempts).toBe(0);
      });
    });
  });
});