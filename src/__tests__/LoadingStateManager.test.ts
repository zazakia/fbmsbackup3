/**
 * Comprehensive Unit Tests for LoadingStateManager
 * Tests timing, state transitions, and all loading scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoadingStateManager } from '../services/LoadingStateManager';
import type { LoadingState, ModuleLoadingError } from '../types/moduleLoading';

// Mock performance.now for consistent timing tests
const mockPerformanceNow = vi.fn();
global.performance = { now: mockPerformanceNow } as any;

// Mock setTimeout and clearTimeout for timing control
const mockSetTimeout = vi.fn();
const mockClearTimeout = vi.fn();
global.setTimeout = mockSetTimeout;
global.clearTimeout = mockClearTimeout;

describe('LoadingStateManager', () => {
  let loadingStateManager: LoadingStateManager;
  let mockStateChangeCallback: ReturnType<typeof vi.fn>;
  let currentTime: number;

  beforeEach(() => {
    vi.clearAllMocks();
    currentTime = 1000000; // Start with a baseline time
    mockPerformanceNow.mockReturnValue(currentTime);

    mockStateChangeCallback = vi.fn();
    loadingStateManager = new LoadingStateManager();
    
    // Subscribe to state changes
    loadingStateManager.subscribe(mockStateChangeCallback);

    // Mock setTimeout implementation that tracks timeouts
    const timeouts = new Map();
    let timeoutId = 1;
    
    mockSetTimeout.mockImplementation((callback, delay) => {
      const id = timeoutId++;
      timeouts.set(id, { callback, delay, created: currentTime });
      return id;
    });

    mockClearTimeout.mockImplementation((id) => {
      timeouts.delete(id);
    });

    // Helper to trigger timeouts manually
    (loadingStateManager as any).triggerTimeout = (delay: number) => {
      currentTime += delay;
      mockPerformanceNow.mockReturnValue(currentTime);
      
      for (const [id, timeout] of timeouts.entries()) {
        if (currentTime - timeout.created >= timeout.delay) {
          timeout.callback();
          timeouts.delete(id);
        }
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    loadingStateManager.cleanup();
  });

  describe('Basic State Management', () => {
    it('should initialize with idle state', () => {
      const state = loadingStateManager.getState('test-module');
      
      expect(state.status).toBe('idle');
      expect(state.startTime).toBeNull();
      expect(state.error).toBeNull();
      expect(state.progress).toBe(0);
    });

    it('should transition to loading state', async () => {
      await loadingStateManager.setLoading('test-module');
      
      const state = loadingStateManager.getState('test-module');
      expect(state.status).toBe('loading');
      expect(state.startTime).toBe(currentTime);
      expect(state.progress).toBe(0);
      
      expect(mockStateChangeCallback).toHaveBeenCalledWith(
        'test-module',
        expect.objectContaining({
          status: 'loading',
          startTime: currentTime
        })
      );
    });

    it('should transition to success state', async () => {
      await loadingStateManager.setLoading('test-module');
      currentTime += 1500; // Simulate 1.5 seconds
      mockPerformanceNow.mockReturnValue(currentTime);
      
      await loadingStateManager.setSuccess('test-module');
      
      const state = loadingStateManager.getState('test-module');
      expect(state.status).toBe('success');
      expect(state.duration).toBe(1500);
      expect(state.progress).toBe(100);
    });

    it('should transition to error state', async () => {
      const error: ModuleLoadingError = {
        type: 'network_error',
        message: 'Failed to load',
        moduleId: 'test-module',
        timestamp: currentTime,
        retryable: true
      };

      await loadingStateManager.setLoading('test-module');
      await loadingStateManager.setError('test-module', error);
      
      const state = loadingStateManager.getState('test-module');
      expect(state.status).toBe('error');
      expect(state.error).toEqual(error);
    });
  });

  describe('Timing Requirements', () => {
    it('should provide immediate loading feedback within 100ms', async () => {
      const startTime = performance.now();
      
      await loadingStateManager.setLoading('test-module');
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThanOrEqual(100);
      expect(mockStateChangeCallback).toHaveBeenCalled();
    });

    it('should show slow loading warning after 2 seconds', async () => {
      await loadingStateManager.setLoading('test-module');
      
      // Advance time by 2 seconds
      (loadingStateManager as any).triggerTimeout(2000);
      
      const state = loadingStateManager.getState('test-module');
      expect(state.slowLoading).toBe(true);
      
      expect(mockStateChangeCallback).toHaveBeenCalledWith(
        'test-module',
        expect.objectContaining({
          slowLoading: true,
          message: expect.stringContaining('slow')
        })
      );
    });

    it('should timeout after configured timeout duration', async () => {
      const timeoutDuration = 5000;
      
      await loadingStateManager.setLoading('test-module', { timeout: timeoutDuration });
      
      // Advance time to just before timeout
      (loadingStateManager as any).triggerTimeout(timeoutDuration - 1);
      let state = loadingStateManager.getState('test-module');
      expect(state.status).toBe('loading');
      
      // Advance time to trigger timeout
      (loadingStateManager as any).triggerTimeout(1);
      state = loadingStateManager.getState('test-module');
      expect(state.status).toBe('error');
      expect(state.error?.type).toBe('timeout');
    });

    it('should show estimated completion time', async () => {
      await loadingStateManager.setLoading('test-module', {
        estimatedDuration: 3000
      });
      
      // Advance time to 50% completion
      (loadingStateManager as any).triggerTimeout(1500);
      
      const state = loadingStateManager.getState('test-module');
      expect(state.estimatedCompletion).toBeDefined();
      expect(state.progress).toBeGreaterThan(0);
    });
  });

  describe('Progress Indication', () => {
    it('should track progress during loading', async () => {
      await loadingStateManager.setLoading('test-module', {
        estimatedDuration: 2000
      });
      
      // Check progress at different intervals
      (loadingStateManager as any).triggerTimeout(500); // 25%
      let state = loadingStateManager.getState('test-module');
      expect(state.progress).toBeCloseTo(25, 1);
      
      (loadingStateManager as any).triggerTimeout(500); // 50%
      state = loadingStateManager.getState('test-module');
      expect(state.progress).toBeCloseTo(50, 1);
      
      (loadingStateManager as any).triggerTimeout(500); // 75%
      state = loadingStateManager.getState('test-module');
      expect(state.progress).toBeCloseTo(75, 1);
    });

    it('should update progress manually when provided', async () => {
      await loadingStateManager.setLoading('test-module');
      
      await loadingStateManager.updateProgress('test-module', 30, 'Loading components...');
      
      const state = loadingStateManager.getState('test-module');
      expect(state.progress).toBe(30);
      expect(state.message).toBe('Loading components...');
    });

    it('should not exceed 100% progress', async () => {
      await loadingStateManager.setLoading('test-module');
      
      await loadingStateManager.updateProgress('test-module', 150);
      
      const state = loadingStateManager.getState('test-module');
      expect(state.progress).toBe(100);
    });
  });

  describe('Multiple Module Management', () => {
    it('should manage multiple modules independently', async () => {
      await loadingStateManager.setLoading('module1');
      await loadingStateManager.setLoading('module2');
      
      // Complete one module
      await loadingStateManager.setSuccess('module1');
      
      const state1 = loadingStateManager.getState('module1');
      const state2 = loadingStateManager.getState('module2');
      
      expect(state1.status).toBe('success');
      expect(state2.status).toBe('loading');
    });

    it('should provide global loading statistics', async () => {
      await loadingStateManager.setLoading('module1');
      await loadingStateManager.setLoading('module2');
      await loadingStateManager.setLoading('module3');
      
      await loadingStateManager.setSuccess('module1');
      
      const globalState = loadingStateManager.getGlobalState();
      
      expect(globalState.totalModules).toBe(3);
      expect(globalState.loadingModules).toBe(2);
      expect(globalState.completedModules).toBe(1);
      expect(globalState.failedModules).toBe(0);
    });

    it('should handle concurrent state changes', async () => {
      const promises = [];
      
      // Start multiple modules simultaneously
      for (let i = 1; i <= 5; i++) {
        promises.push(loadingStateManager.setLoading(`module${i}`));
      }
      
      await Promise.all(promises);
      
      const globalState = loadingStateManager.getGlobalState();
      expect(globalState.loadingModules).toBe(5);
    });
  });

  describe('Network Condition Detection', () => {
    it('should detect slow network conditions', async () => {
      await loadingStateManager.setLoading('test-module');
      
      // Simulate slow loading (over 5 seconds)
      (loadingStateManager as any).triggerTimeout(5000);
      
      const state = loadingStateManager.getState('test-module');
      expect(state.slowNetwork).toBe(true);
      expect(state.message).toMatch(/slow.*connection/i);
    });

    it('should adjust timeout based on network conditions', async () => {
      // First, simulate a slow network detection
      await loadingStateManager.setLoading('slow-module');
      (loadingStateManager as any).triggerTimeout(6000);
      await loadingStateManager.setError('slow-module', {
        type: 'timeout',
        message: 'Timeout',
        moduleId: 'slow-module',
        timestamp: currentTime,
        retryable: true
      });
      
      // Now start a new module - it should have extended timeout
      await loadingStateManager.setLoading('adaptive-module');
      
      const state = loadingStateManager.getState('adaptive-module');
      expect(state.adaptiveTimeout).toBeGreaterThan(5000);
    });

    it('should provide network condition feedback', async () => {
      await loadingStateManager.setLoading('test-module');
      
      // Trigger slow network detection
      (loadingStateManager as any).triggerTimeout(7000);
      
      expect(mockStateChangeCallback).toHaveBeenCalledWith(
        'test-module',
        expect.objectContaining({
          slowNetwork: true,
          message: expect.stringMatching(/slow.*connection/i)
        })
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle various error types', async () => {
      const errors = [
        { type: 'network_error', message: 'Network failed' },
        { type: 'timeout', message: 'Loading timeout' },
        { type: 'chunk_load_error', message: 'Chunk failed' },
        { type: 'permission_denied', message: 'Access denied' },
        { type: 'module_error', message: 'Module error' }
      ] as const;
      
      for (const [index, errorData] of errors.entries()) {
        const moduleId = `module${index}`;
        const error: ModuleLoadingError = {
          ...errorData,
          moduleId,
          timestamp: currentTime,
          retryable: errorData.type !== 'permission_denied' && errorData.type !== 'module_error'
        };
        
        await loadingStateManager.setLoading(moduleId);
        await loadingStateManager.setError(moduleId, error);
        
        const state = loadingStateManager.getState(moduleId);
        expect(state.status).toBe('error');
        expect(state.error).toEqual(error);
      }
    });

    it('should track retry attempts', async () => {
      const error: ModuleLoadingError = {
        type: 'network_error',
        message: 'Network failed',
        moduleId: 'test-module',
        timestamp: currentTime,
        retryable: true
      };
      
      await loadingStateManager.setLoading('test-module');
      await loadingStateManager.setError('test-module', error);
      
      // First retry
      await loadingStateManager.setRetrying('test-module');
      let state = loadingStateManager.getState('test-module');
      expect(state.retryCount).toBe(1);
      expect(state.status).toBe('retrying');
      
      // Second retry
      await loadingStateManager.setError('test-module', error);
      await loadingStateManager.setRetrying('test-module');
      state = loadingStateManager.getState('test-module');
      expect(state.retryCount).toBe(2);
    });

    it('should clear error state on successful retry', async () => {
      const error: ModuleLoadingError = {
        type: 'network_error',
        message: 'Network failed',
        moduleId: 'test-module',
        timestamp: currentTime,
        retryable: true
      };
      
      await loadingStateManager.setLoading('test-module');
      await loadingStateManager.setError('test-module', error);
      await loadingStateManager.setRetrying('test-module');
      await loadingStateManager.setSuccess('test-module');
      
      const state = loadingStateManager.getState('test-module');
      expect(state.status).toBe('success');
      expect(state.error).toBeNull();
      expect(state.retryCount).toBe(1); // Should preserve retry count for metrics
    });
  });

  describe('Performance Metrics', () => {
    it('should track detailed timing metrics', async () => {
      await loadingStateManager.setLoading('test-module');
      
      // Simulate loading phases
      (loadingStateManager as any).triggerTimeout(100);
      await loadingStateManager.updateProgress('test-module', 20, 'Fetching module');
      
      (loadingStateManager as any).triggerTimeout(200);
      await loadingStateManager.updateProgress('test-module', 60, 'Parsing module');
      
      (loadingStateManager as any).triggerTimeout(300);
      await loadingStateManager.setSuccess('test-module');
      
      const state = loadingStateManager.getState('test-module');
      const metrics = state.performanceMetrics;
      
      expect(metrics).toBeDefined();
      expect(metrics?.totalDuration).toBe(600);
      expect(metrics?.phases).toHaveLength(3);
    });

    it('should calculate loading speed', async () => {
      await loadingStateManager.setLoading('fast-module');
      (loadingStateManager as any).triggerTimeout(500);
      await loadingStateManager.setSuccess('fast-module');
      
      await loadingStateManager.setLoading('slow-module');
      (loadingStateManager as any).triggerTimeout(5000);
      await loadingStateManager.setSuccess('slow-module');
      
      const fastState = loadingStateManager.getState('fast-module');
      const slowState = loadingStateManager.getState('slow-module');
      
      expect(fastState.performanceMetrics?.speed).toBe('fast');
      expect(slowState.performanceMetrics?.speed).toBe('slow');
    });

    it('should provide performance statistics', async () => {
      // Load multiple modules with different performance
      const modules = ['module1', 'module2', 'module3'];
      const durations = [500, 2000, 8000];
      
      for (const [index, moduleId] of modules.entries()) {
        await loadingStateManager.setLoading(moduleId);
        (loadingStateManager as any).triggerTimeout(durations[index]);
        await loadingStateManager.setSuccess(moduleId);
      }
      
      const stats = loadingStateManager.getPerformanceStats();
      
      expect(stats.averageLoadTime).toBe((500 + 2000 + 8000) / 3);
      expect(stats.fastLoads).toBe(1);
      expect(stats.slowLoads).toBe(1);
    });
  });

  describe('State Cleanup and Memory Management', () => {
    it('should cleanup completed module states', async () => {
      await loadingStateManager.setLoading('test-module');
      await loadingStateManager.setSuccess('test-module');
      
      // Cleanup should remove completed states after some time
      await loadingStateManager.cleanup('test-module');
      
      const state = loadingStateManager.getState('test-module');
      expect(state.status).toBe('idle');
    });

    it('should cleanup old error states', async () => {
      const error: ModuleLoadingError = {
        type: 'network_error',
        message: 'Network failed',
        moduleId: 'test-module',
        timestamp: currentTime - 300000, // 5 minutes ago
        retryable: true
      };
      
      await loadingStateManager.setLoading('test-module');
      await loadingStateManager.setError('test-module', error);
      
      await loadingStateManager.cleanup();
      
      const state = loadingStateManager.getState('test-module');
      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
    });

    it('should prevent memory leaks from timeouts', async () => {
      await loadingStateManager.setLoading('test-module');
      
      // Cancel loading before timeout
      await loadingStateManager.cleanup('test-module');
      
      expect(mockClearTimeout).toHaveBeenCalled();
    });
  });

  describe('Subscription and Event Management', () => {
    it('should notify subscribers of state changes', async () => {
      await loadingStateManager.setLoading('test-module');
      
      expect(mockStateChangeCallback).toHaveBeenCalledWith(
        'test-module',
        expect.objectContaining({ status: 'loading' })
      );
    });

    it('should handle multiple subscribers', async () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      
      loadingStateManager.subscribe(subscriber1);
      loadingStateManager.subscribe(subscriber2);
      
      await loadingStateManager.setLoading('test-module');
      
      expect(subscriber1).toHaveBeenCalled();
      expect(subscriber2).toHaveBeenCalled();
    });

    it('should allow unsubscribing', async () => {
      const subscriber = vi.fn();
      const unsubscribe = loadingStateManager.subscribe(subscriber);
      
      unsubscribe();
      
      await loadingStateManager.setLoading('test-module');
      
      expect(subscriber).not.toHaveBeenCalled();
    });

    it('should support module-specific subscriptions', async () => {
      const specificSubscriber = vi.fn();
      
      loadingStateManager.subscribe(specificSubscriber, 'specific-module');
      
      await loadingStateManager.setLoading('other-module');
      expect(specificSubscriber).not.toHaveBeenCalled();
      
      await loadingStateManager.setLoading('specific-module');
      expect(specificSubscriber).toHaveBeenCalled();
    });
  });
});