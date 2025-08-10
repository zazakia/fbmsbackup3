/**
 * Performance Testing and Optimization for Module Loading System
 * Tests loading benchmarks, network conditions, caching effectiveness, and bundle optimization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModuleLoadingManager } from '../../services/ModuleLoadingManager';
import { ModuleCacheService } from '../../services/ModuleCacheService';
import { PreloadingService } from '../../services/PreloadingService';
import { PerformanceMonitoringService } from '../../services/PerformanceMonitoringService';
import type { ModuleConfig, UserRole } from '../../types/moduleLoading';

// Mock performance APIs
const mockPerformanceNow = vi.fn();
const mockPerformanceMark = vi.fn();
const mockPerformanceMeasure = vi.fn();
const mockPerformanceObserver = vi.fn();

global.performance = {
  now: mockPerformanceNow,
  mark: mockPerformanceMark,
  measure: mockPerformanceMeasure,
  getEntriesByType: vi.fn(),
  getEntriesByName: vi.fn()
} as any;

global.PerformanceObserver = mockPerformanceObserver as any;

// Mock network conditions
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 100,
  saveData: false
};

Object.defineProperty(navigator, 'connection', {
  value: mockConnection,
  writable: true
});

// Mock React.lazy for performance testing
const mockLazyComponents = new Map();
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    lazy: vi.fn((factory) => {
      return vi.fn(() => factory());
    })
  };
});

describe('Module Loading Performance Tests', () => {
  let moduleLoadingManager: ModuleLoadingManager;
  let cacheService: ModuleCacheService;
  let preloadingService: PreloadingService;
  let performanceMonitor: PerformanceMonitoringService;
  
  const mockUser = {
    id: 'user-123',
    role: 'manager' as UserRole,
    permissions: ['dashboard', 'expenses', 'operations', 'accounting']
  };

  const testModules: ModuleConfig[] = [
    {
      id: 'expenses',
      name: 'Expense Tracking',
      component: 'ExpenseTracking',
      path: '/expenses',
      requiredPermissions: ['expenses'],
      requiredRole: 'employee',
      timeout: 3000,
      retryable: true,
      priority: 'high',
      estimatedSize: 150000 // 150KB
    },
    {
      id: 'operations',
      name: 'Manager Operations',
      component: 'ManagerOperations',
      path: '/operations',
      requiredPermissions: ['operations'],
      requiredRole: 'manager',
      timeout: 3000,
      retryable: true,
      priority: 'high',
      estimatedSize: 200000 // 200KB
    },
    {
      id: 'bir-forms',
      name: 'BIR Forms',
      component: 'BIRForms',
      path: '/bir-forms',
      requiredPermissions: ['accounting'],
      requiredRole: 'accountant',
      timeout: 5000,
      retryable: true,
      priority: 'medium',
      estimatedSize: 300000 // 300KB
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup time tracking
    let currentTime = 1000000;
    mockPerformanceNow.mockImplementation(() => currentTime++);
    
    moduleLoadingManager = new ModuleLoadingManager();
    cacheService = new ModuleCacheService();
    preloadingService = new PreloadingService();
    performanceMonitor = new PerformanceMonitoringService();

    // Setup mock components
    testModules.forEach(module => {
      const mockComponent = { default: vi.fn() };
      mockLazyComponents.set(module.id, mockComponent);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading Time Benchmarks', () => {
    it('should meet 100ms visual feedback requirement', async () => {
      const startTime = performance.now();
      
      // Start loading process
      const loadingPromise = moduleLoadingManager.loadModule(testModules[0], mockUser);
      
      // Check that visual feedback is provided immediately
      const feedbackTime = performance.now() - startTime;
      expect(feedbackTime).toBeLessThan(100);
      
      await loadingPromise;
    });

    it('should complete small module loading within 3 seconds', async () => {
      const smallModule = testModules[0]; // 150KB module
      
      const startTime = performance.now();
      await moduleLoadingManager.loadModule(smallModule, mockUser);
      const loadTime = performance.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });

    it('should complete medium module loading within 5 seconds', async () => {
      const mediumModule = testModules[2]; // 300KB module
      
      const startTime = performance.now();
      await moduleLoadingManager.loadModule(mediumModule, mockUser);
      const loadTime = performance.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000);
    });

    it('should load cached modules within 1 second', async () => {
      const module = testModules[0];
      
      // Pre-cache the module
      const mockComponent = mockLazyComponents.get(module.id);
      await cacheService.setCache(module.id, mockComponent, 300000); // 5-minute TTL
      
      const startTime = performance.now();
      await moduleLoadingManager.loadModule(module, mockUser);
      const loadTime = performance.now() - startTime;
      
      expect(loadTime).toBeLessThan(1000);
    });

    it('should maintain performance under concurrent loading', async () => {
      const concurrentLoads = testModules.map(module =>
        moduleLoadingManager.loadModule(module, mockUser)
      );
      
      const startTime = performance.now();
      await Promise.all(concurrentLoads);
      const totalTime = performance.now() - startTime;
      
      // Total time should not exceed 8 seconds for 3 modules
      expect(totalTime).toBeLessThan(8000);
    });
  });

  describe('Network Condition Testing', () => {
    it('should adapt to slow network conditions (3G)', async () => {
      // Simulate 3G connection
      mockConnection.effectiveType = '3g';
      mockConnection.downlink = 1.5;
      mockConnection.rtt = 300;
      
      const module = testModules[1];
      const startTime = performance.now();
      
      // Mock slower loading for 3G
      vi.spyOn(moduleLoadingManager as any, 'loadModuleWithNetworkAdaptation')
        .mockImplementation(async () => {
          // Simulate slower loading
          await new Promise(resolve => setTimeout(resolve, 4000));
          return mockLazyComponents.get(module.id);
        });
      
      await moduleLoadingManager.loadModule(module, mockUser);
      const loadTime = performance.now() - startTime;
      
      // Should still complete within acceptable time for 3G
      expect(loadTime).toBeLessThan(8000);
      
      // Should have triggered slow loading warning
      expect(performanceMonitor.recordSlowLoading).toHaveBeenCalledWith(module.id, loadTime);
    });

    it('should optimize for fast network conditions (4G+)', async () => {
      // Simulate fast connection
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 10;
      mockConnection.rtt = 50;
      
      const modules = testModules.slice(0, 2);
      const startTime = performance.now();
      
      // Should enable parallel loading for fast connections
      const loadingPromises = modules.map(module =>
        moduleLoadingManager.loadModule(module, mockUser)
      );
      
      await Promise.all(loadingPromises);
      const totalTime = performance.now() - startTime;
      
      // Should complete faster than sequential loading
      expect(totalTime).toBeLessThan(4000);
    });

    it('should handle offline conditions gracefully', async () => {
      // Simulate offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      const module = testModules[0];
      
      // Should attempt to load from cache first
      const mockCachedComponent = mockLazyComponents.get(module.id);
      vi.spyOn(cacheService, 'getFromCache').mockResolvedValue(mockCachedComponent);
      
      const result = await moduleLoadingManager.loadModule(module, mockUser);
      
      expect(result).toBe(mockCachedComponent);
      expect(cacheService.getFromCache).toHaveBeenCalledWith(module.id);
    });

    it('should detect and report network performance issues', async () => {
      // Simulate poor network conditions
      mockConnection.effectiveType = '2g';
      mockConnection.downlink = 0.5;
      mockConnection.rtt = 1000;
      
      const module = testModules[2]; // Larger module
      
      vi.spyOn(performanceMonitor, 'analyzeNetworkConditions')
        .mockResolvedValue({
          quality: 'poor',
          recommendedTimeout: 10000,
          shouldPreload: false,
          adaptiveStrategy: 'sequential'
        });
      
      await moduleLoadingManager.loadModule(module, mockUser);
      
      expect(performanceMonitor.analyzeNetworkConditions).toHaveBeenCalled();
      expect(performanceMonitor.recordNetworkConditions).toHaveBeenCalledWith(
        expect.objectContaining({
          effectiveType: '2g',
          quality: 'poor'
        })
      );
    });
  });

  describe('Caching Effectiveness', () => {
    it('should demonstrate significant performance improvement with caching', async () => {
      const module = testModules[0];
      
      // First load (no cache)
      const startTime1 = performance.now();
      await moduleLoadingManager.loadModule(module, mockUser);
      const firstLoadTime = performance.now() - startTime1;
      
      // Second load (with cache)
      const startTime2 = performance.now();
      await moduleLoadingManager.loadModule(module, mockUser);
      const cachedLoadTime = performance.now() - startTime2;
      
      // Cached load should be significantly faster
      expect(cachedLoadTime).toBeLessThan(firstLoadTime * 0.3); // At least 70% faster
      expect(cachedLoadTime).toBeLessThan(500); // Under 500ms
    });

    it('should maintain optimal cache hit ratio', async () => {
      const cacheHitRatios = [];
      
      // Load modules multiple times to build cache statistics
      for (let iteration = 0; iteration < 5; iteration++) {
        for (const module of testModules) {
          await moduleLoadingManager.loadModule(module, mockUser);
        }
        
        const stats = cacheService.getCacheStats();
        const hitRatio = stats.hits / (stats.hits + stats.misses);
        cacheHitRatios.push(hitRatio);
      }
      
      // Cache hit ratio should improve over time
      const finalHitRatio = cacheHitRatios[cacheHitRatios.length - 1];
      expect(finalHitRatio).toBeGreaterThan(0.7); // At least 70% hit ratio
    });

    it('should manage cache memory usage efficiently', async () => {
      const initialMemoryUsage = cacheService.getMemoryUsage();
      
      // Load multiple modules
      await Promise.all(testModules.map(module =>
        moduleLoadingManager.loadModule(module, mockUser)
      ));
      
      const memoryUsage = cacheService.getMemoryUsage();
      
      // Memory usage should be reasonable
      expect(memoryUsage.totalSize).toBeLessThan(10 * 1024 * 1024); // Under 10MB
      expect(memoryUsage.itemCount).toBe(testModules.length);
      
      // Test cache eviction under memory pressure
      cacheService.setMemoryLimit(5 * 1024 * 1024); // 5MB limit
      
      // Load more modules to trigger eviction
      const additionalModules = [...testModules, ...testModules]; // Double the load
      await Promise.all(additionalModules.map(module =>
        moduleLoadingManager.loadModule(module, mockUser)
      ));
      
      const finalMemoryUsage = cacheService.getMemoryUsage();
      expect(finalMemoryUsage.totalSize).toBeLessThanOrEqual(5 * 1024 * 1024);
    });

    it('should invalidate stale cache entries appropriately', async () => {
      const module = testModules[0];
      
      // Cache with short TTL
      const mockComponent = mockLazyComponents.get(module.id);
      await cacheService.setCache(module.id, mockComponent, 100); // 100ms TTL
      
      // Immediate access should hit cache
      const cachedResult = await cacheService.getFromCache(module.id);
      expect(cachedResult).toBe(mockComponent);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Access after TTL should miss cache
      const expiredResult = await cacheService.getFromCache(module.id);
      expect(expiredResult).toBeNull();
    });
  });

  describe('Bundle Size Optimization', () => {
    it('should lazy load modules to minimize initial bundle size', async () => {
      const initialBundleSize = performanceMonitor.getCurrentBundleSize();
      
      // Initial bundle should not include module code
      expect(initialBundleSize.moduleCode).toBe(0);
      expect(initialBundleSize.coreCode).toBeGreaterThan(0);
      
      // Load a module
      await moduleLoadingManager.loadModule(testModules[0], mockUser);
      
      const bundleSizeAfterLoad = performanceMonitor.getCurrentBundleSize();
      
      // Module code should now be loaded
      expect(bundleSizeAfterLoad.moduleCode).toBeGreaterThan(0);
      expect(bundleSizeAfterLoad.totalSize).toBeGreaterThan(initialBundleSize.totalSize);
    });

    it('should optimize bundle splitting for frequently used modules', async () => {
      // Track module usage
      const usageStats = new Map();
      
      // Simulate multiple users accessing different modules
      for (let user = 0; user < 10; user++) {
        for (const module of testModules) {
          await moduleLoadingManager.loadModule(module, mockUser);
          const currentUsage = usageStats.get(module.id) || 0;
          usageStats.set(module.id, currentUsage + 1);
        }
      }
      
      const optimization = performanceMonitor.analyzeBundleOptimization(usageStats);
      
      expect(optimization.recommendedPreloads).toContain('expenses');
      expect(optimization.recommendedPreloads).toContain('operations');
      expect(optimization.codeSpittingStrategy).toBeDefined();
    });

    it('should minimize duplicate code across module bundles', async () => {
      const bundleAnalysis = performanceMonitor.analyzeBundleDuplication();
      
      // Common dependencies should be shared
      expect(bundleAnalysis.sharedDependencies).toContain('react');
      expect(bundleAnalysis.sharedDependencies).toContain('react-router');
      
      // Duplication ratio should be minimal
      expect(bundleAnalysis.duplicationRatio).toBeLessThan(0.1); // Less than 10%
    });

    it('should tree-shake unused code effectively', async () => {
      const treeShakingAnalysis = performanceMonitor.analyzeTreeShaking();
      
      expect(treeShakingAnalysis.unusedExports).toBeLessThan(0.05); // Less than 5% unused
      expect(treeShakingAnalysis.deadCode).toBeLessThan(1024); // Less than 1KB dead code
    });
  });

  describe('Preloading Strategy Optimization', () => {
    it('should preload high-priority modules for manager role', async () => {
      const managerUser = {
        ...mockUser,
        role: 'manager' as UserRole
      };
      
      await preloadingService.preloadForUser(managerUser);
      
      // Should preload manager-specific modules
      const preloadedModules = preloadingService.getPreloadedModules();
      expect(preloadedModules).toContain('operations');
      expect(preloadedModules).toContain('expenses');
    });

    it('should adapt preloading based on network conditions', async () => {
      // Fast connection - aggressive preloading
      mockConnection.effectiveType = '4g';
      await preloadingService.updateNetworkConditions(mockConnection);
      
      const fastNetworkStrategy = preloadingService.getPreloadingStrategy();
      expect(fastNetworkStrategy.maxConcurrentPreloads).toBeGreaterThan(2);
      expect(fastNetworkStrategy.preloadThreshold).toBe('medium');
      
      // Slow connection - conservative preloading
      mockConnection.effectiveType = '3g';
      await preloadingService.updateNetworkConditions(mockConnection);
      
      const slowNetworkStrategy = preloadingService.getPreloadingStrategy();
      expect(slowNetworkStrategy.maxConcurrentPreloads).toBe(1);
      expect(slowNetworkStrategy.preloadThreshold).toBe('high');
    });

    it('should measure preloading effectiveness', async () => {
      // Enable preloading
      await preloadingService.preloadModules(['expenses', 'operations'], mockUser);
      
      // Measure load times with preloading
      const preloadedTimes = [];
      for (const moduleId of ['expenses', 'operations']) {
        const module = testModules.find(m => m.id === moduleId)!;
        const startTime = performance.now();
        await moduleLoadingManager.loadModule(module, mockUser);
        preloadedTimes.push(performance.now() - startTime);
      }
      
      // Compare with non-preloaded load times
      const nonPreloadedModule = testModules.find(m => m.id === 'bir-forms')!;
      const startTime = performance.now();
      await moduleLoadingManager.loadModule(nonPreloadedModule, mockUser);
      const nonPreloadedTime = performance.now() - startTime;
      
      // Preloaded modules should be significantly faster
      const avgPreloadedTime = preloadedTimes.reduce((a, b) => a + b) / preloadedTimes.length;
      expect(avgPreloadedTime).toBeLessThan(nonPreloadedTime * 0.5); // At least 50% faster
    });
  });

  describe('Performance Monitoring and Analytics', () => {
    it('should track comprehensive performance metrics', async () => {
      const module = testModules[0];
      
      await moduleLoadingManager.loadModule(module, mockUser);
      
      const metrics = performanceMonitor.getModuleMetrics(module.id);
      
      expect(metrics).toEqual(expect.objectContaining({
        loadTime: expect.any(Number),
        cacheHit: expect.any(Boolean),
        networkCondition: expect.any(String),
        bundleSize: expect.any(Number),
        errorCount: expect.any(Number),
        retryCount: expect.any(Number)
      }));
    });

    it('should identify performance bottlenecks', async () => {
      // Simulate various performance scenarios
      await Promise.all(testModules.map(module =>
        moduleLoadingManager.loadModule(module, mockUser)
      ));
      
      const bottlenecks = performanceMonitor.identifyBottlenecks();
      
      expect(bottlenecks.slowModules).toBeDefined();
      expect(bottlenecks.networkIssues).toBeDefined();
      expect(bottlenecks.cacheInefficiencies).toBeDefined();
      expect(bottlenecks.recommendations).toBeInstanceOf(Array);
    });

    it('should provide performance optimization recommendations', async () => {
      const performanceData = {
        averageLoadTime: 2500,
        cacheHitRatio: 0.6,
        networkQuality: 'fair',
        bundleEfficiency: 0.8
      };
      
      const recommendations = performanceMonitor.generateRecommendations(performanceData);
      
      expect(recommendations).toContain(
        expect.objectContaining({
          type: 'caching',
          priority: expect.any(String),
          description: expect.any(String)
        })
      );
    });

    it('should track performance trends over time', async () => {
      const trendData = [];
      
      // Simulate usage over multiple days
      for (let day = 0; day < 7; day++) {
        for (const module of testModules) {
          await moduleLoadingManager.loadModule(module, mockUser);
        }
        
        const dailyMetrics = performanceMonitor.getDailyMetrics();
        trendData.push(dailyMetrics);
      }
      
      const trends = performanceMonitor.analyzeTrends(trendData);
      
      expect(trends.loadTimeImprovement).toBeDefined();
      expect(trends.cacheEfficiencyTrend).toBeDefined();
      expect(trends.errorRateTrend).toBeDefined();
    });
  });

  describe('Stress Testing and Load Limits', () => {
    it('should handle high concurrent load without degradation', async () => {
      const concurrentRequests = 50;
      const loadPromises = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        const module = testModules[i % testModules.length];
        loadPromises.push(moduleLoadingManager.loadModule(module, mockUser));
      }
      
      const results = await Promise.all(loadPromises);
      const totalTime = performance.now() - startTime;
      
      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
      
      // Performance should remain reasonable under load
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
    });

    it('should implement backpressure for extreme load conditions', async () => {
      const extremeLoad = 100;
      let rejectedRequests = 0;
      
      const loadPromises = [];
      
      for (let i = 0; i < extremeLoad; i++) {
        const module = testModules[i % testModules.length];
        const promise = moduleLoadingManager.loadModule(module, mockUser)
          .catch(error => {
            if (error.message.includes('load limit exceeded')) {
              rejectedRequests++;
            }
            throw error;
          });
        loadPromises.push(promise);
      }
      
      const results = await Promise.allSettled(loadPromises);
      
      // System should protect itself by rejecting some requests
      expect(rejectedRequests).toBeGreaterThan(0);
      
      // But should still process a reasonable number successfully
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulRequests).toBeGreaterThan(extremeLoad * 0.7); // At least 70% success
    });

    it('should recover gracefully from resource exhaustion', async () => {
      // Simulate memory exhaustion
      vi.spyOn(cacheService, 'setCache').mockRejectedValue(new Error('Out of memory'));
      
      const module = testModules[0];
      
      // Should still load module without caching
      const result = await moduleLoadingManager.loadModule(module, mockUser);
      expect(result).toBeDefined();
      
      // Should log the resource issue
      expect(performanceMonitor.recordResourceExhaustion).toHaveBeenCalledWith('cache', 'Out of memory');
    });
  });
});