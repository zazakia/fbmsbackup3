/**
 * Performance Testing Suite
 * Comprehensive performance monitoring and testing utilities
 */

import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  type: 'render' | 'api' | 'computation' | 'navigation' | 'memory';
  details?: Record<string, unknown>;
}

export interface PerformanceReport {
  metrics: PerformanceMetrics[];
  summary: {
    totalTests: number;
    averageDuration: number;
    slowestTest: PerformanceMetrics | null;
    fastestTest: PerformanceMetrics | null;
    memoryUsage?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  recommendations: string[];
}

class PerformanceTester {
  private metrics: PerformanceMetrics[] = [];
  private readonly SLOW_THRESHOLD = 1000; // 1 second
  private readonly WARNING_THRESHOLD = 500; // 0.5 seconds

  // Time a function execution
  public async timeFunction<T>(
    name: string,
    fn: () => Promise<T> | T,
    type: PerformanceMetrics['type'] = 'computation'
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = await fn();
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();

      const metrics: PerformanceMetrics = {
        name,
        duration: endTime - startTime,
        timestamp: Date.now(),
        type,
        details: {
          memoryDelta: endMemory.used - startMemory.used,
          startMemory: startMemory.used,
          endMemory: endMemory.used
        }
      };

      this.metrics.push(metrics);
      this.logMetrics(metrics);

      return { result, metrics };
    } catch (error) {
      const endTime = performance.now();
      const metrics: PerformanceMetrics = {
        name: `${name} (FAILED)`,
        duration: endTime - startTime,
        timestamp: Date.now(),
        type,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };

      this.metrics.push(metrics);
      throw error;
    }
  }

  // Time React component rendering
  public timeRender(componentName: string): {
    start: () => void;
    end: () => PerformanceMetrics;
  } {
    let startTime: number;
    let startMemory: { used: number; total: number };

    return {
      start: () => {
        startTime = performance.now();
        startMemory = this.getMemoryUsage();
      },
      end: () => {
        const endTime = performance.now();
        const endMemory = this.getMemoryUsage();

        const metrics: PerformanceMetrics = {
          name: `Render: ${componentName}`,
          duration: endTime - startTime,
          timestamp: Date.now(),
          type: 'render',
          details: {
            memoryDelta: endMemory.used - startMemory.used,
            startMemory: startMemory.used,
            endMemory: endMemory.used
          }
        };

        this.metrics.push(metrics);
        this.logMetrics(metrics);
        return metrics;
      }
    };
  }

  // Time API calls
  public async timeAPI<T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    return this.timeFunction(name, apiCall, 'api');
  }

  // Time navigation
  public timeNavigation(routeName: string): {
    start: () => void;
    end: () => PerformanceMetrics;
  } {
    let startTime: number;

    return {
      start: () => {
        startTime = performance.now();
      },
      end: () => {
        const endTime = performance.now();
        const metrics: PerformanceMetrics = {
          name: `Navigation: ${routeName}`,
          duration: endTime - startTime,
          timestamp: Date.now(),
          type: 'navigation'
        };

        this.metrics.push(metrics);
        this.logMetrics(metrics);
        return metrics;
      }
    };
  }

  // Memory profiling
  public profileMemory(testName: string): {
    used: number;
    total: number;
    percentage: number;
    metrics: PerformanceMetrics;
  } {
    const memory = this.getMemoryUsage();
    const metrics: PerformanceMetrics = {
      name: `Memory: ${testName}`,
      duration: 0,
      timestamp: Date.now(),
      type: 'memory',
      details: {
        memoryUsed: memory.used,
        memoryTotal: memory.total,
        memoryPercentage: memory.percentage
      }
    };

    this.metrics.push(metrics);
    return { ...memory, metrics };
  }

  // Bundle size analysis
  public async analyzeBundleSize(): Promise<{
    totalSize: number;
    gzippedSize: number;
    chunks: Array<{ name: string; size: number }>;
  }> {
    // Simulate bundle analysis (in real app, would use webpack-bundle-analyzer data)
    const chunks = [
      { name: 'vendor', size: 314160 },
      { name: 'main', size: 626820 },
      { name: 'charts', size: 364950 },
      { name: 'bir-forms', size: 611660 }
    ];

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const gzippedSize = Math.round(totalSize * 0.3); // Rough gzip estimate

    return {
      totalSize,
      gzippedSize,
      chunks
    };
  }

  // Performance monitoring for React hooks
  public monitorHook(hookName: string, dependencies: unknown[]): void {
    const dependencyString = JSON.stringify(dependencies);
    const metrics: PerformanceMetrics = {
      name: `Hook: ${hookName}`,
      duration: 0,
      timestamp: Date.now(),
      type: 'render',
      details: {
        dependencies: dependencyString,
        dependencyCount: dependencies.length
      }
    };

    this.metrics.push(metrics);
  }

  // Database query performance
  public async timeQuery<T>(
    queryName: string,
    query: () => Promise<T>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    return this.timeFunction(`Query: ${queryName}`, query, 'api');
  }

  // Generate comprehensive performance report
  public generateReport(): PerformanceReport {
    const totalTests = this.metrics.length;
    const averageDuration = totalTests > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalTests 
      : 0;

    const sortedByDuration = [...this.metrics].sort((a, b) => b.duration - a.duration);
    const slowestTest = sortedByDuration[0] || null;
    const fastestTest = sortedByDuration[sortedByDuration.length - 1] || null;

    const memoryMetrics = this.metrics.filter(m => m.type === 'memory');
    const latestMemory = memoryMetrics[memoryMetrics.length - 1];
    const memoryUsage = latestMemory?.details ? {
      used: latestMemory.details.memoryUsed as number,
      total: latestMemory.details.memoryTotal as number,
      percentage: latestMemory.details.memoryPercentage as number
    } : undefined;

    const recommendations = this.generateRecommendations();

    return {
      metrics: this.metrics,
      summary: {
        totalTests,
        averageDuration,
        slowestTest,
        fastestTest,
        memoryUsage
      },
      recommendations
    };
  }

  // Clear metrics
  public clearMetrics(): void {
    this.metrics = [];
  }

  // Export metrics to JSON
  public exportMetrics(): string {
    return JSON.stringify(this.generateReport(), null, 2);
  }

  // Import metrics from JSON
  public importMetrics(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      this.metrics = data.metrics || [];
    } catch (error) {
      console.error('Failed to import metrics:', error);
    }
  }

  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as PerformanceNavigationTiming & { memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      }}).memory;
      
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
        };
      }
    }
    
    return { used: 0, total: 0, percentage: 0 };
  }

  private logMetrics(metrics: PerformanceMetrics): void {
    if (import.meta.env.DEV) {
      const emoji = this.getPerformanceEmoji(metrics.duration);
      const color = this.getPerformanceColor(metrics.duration);
      
      console.log(
        `%c${emoji} ${metrics.name}: ${metrics.duration.toFixed(2)}ms`,
        `color: ${color}; font-weight: bold`
      );

      if (metrics.duration > this.SLOW_THRESHOLD) {
        console.warn(`⚠️ Slow performance detected: ${metrics.name} took ${metrics.duration.toFixed(2)}ms`);
      }
    }
  }

  private getPerformanceEmoji(duration: number): string {
    if (duration < 100) return '🚀';
    if (duration < 300) return '✅';
    if (duration < 500) return '⚡';
    if (duration < 1000) return '⚠️';
    return '🐌';
  }

  private getPerformanceColor(duration: number): string {
    if (duration < 100) return 'green';
    if (duration < 300) return 'blue';
    if (duration < 500) return 'orange';
    return 'red';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const slowMetrics = this.metrics.filter(m => m.duration > this.SLOW_THRESHOLD);
    const renderMetrics = this.metrics.filter(m => m.type === 'render');
    const apiMetrics = this.metrics.filter(m => m.type === 'api');

    if (slowMetrics.length > 0) {
      recommendations.push(`${slowMetrics.length} operations are taking longer than ${this.SLOW_THRESHOLD}ms. Consider optimization.`);
    }

    if (renderMetrics.some(m => m.duration > this.WARNING_THRESHOLD)) {
      recommendations.push('Some components are rendering slowly. Consider using React.memo() or useMemo().');
    }

    if (apiMetrics.some(m => m.duration > 2000)) {
      recommendations.push('Some API calls are taking longer than 2 seconds. Consider caching or optimization.');
    }

    const memoryMetrics = this.metrics.filter(m => m.type === 'memory');
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1];
      const memoryPercentage = latestMemory.details?.memoryPercentage as number;
      if (memoryPercentage > 80) {
        recommendations.push('High memory usage detected. Consider implementing component cleanup.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! All metrics are within acceptable ranges.');
    }

    return recommendations;
  }
}

// Global instance
export const performanceTester = new PerformanceTester();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const timeRender = (componentName: string) => performanceTester.timeRender(componentName);
  const timeFunction = (name: string, fn: () => Promise<unknown> | unknown) => 
    performanceTester.timeFunction(name, fn);
  const profileMemory = (testName: string) => performanceTester.profileMemory(testName);
  const generateReport = () => performanceTester.generateReport();

  return {
    timeRender,
    timeFunction,
    profileMemory,
    generateReport,
    clearMetrics: () => performanceTester.clearMetrics(),
    exportMetrics: () => performanceTester.exportMetrics()
  };
};

// Performance testing utilities for development
if (typeof window !== 'undefined') {
  (window as unknown as { performanceTester: PerformanceTester }).performanceTester = performanceTester;
}