/**
 * Performance optimization utilities for the FBMS application
 */

// Virtual scrolling for large lists
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export class VirtualScroller {
  private itemHeight: number;
  private containerHeight: number;
  private overscan: number;

  constructor(options: VirtualScrollOptions) {
    this.itemHeight = options.itemHeight;
    this.containerHeight = options.containerHeight;
    this.overscan = options.overscan || 5;
  }

  getVisibleRange(scrollTop: number, totalItems: number) {
    const visibleStart = Math.floor(scrollTop / this.itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(this.containerHeight / this.itemHeight),
      totalItems - 1
    );

    return {
      start: Math.max(0, visibleStart - this.overscan),
      end: Math.min(totalItems - 1, visibleEnd + this.overscan),
      offsetY: visibleStart * this.itemHeight,
      totalHeight: totalItems * this.itemHeight
    };
  }
}

// Debounce utility for search and input
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// Throttle utility for scroll and resize events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memoization for expensive calculations
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

// Image lazy loading with intersection observer
export class ImageLazyLoader {
  private observer: IntersectionObserver;
  private loadedImages = new Set<string>();

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          
          if (src && !this.loadedImages.has(src)) {
            img.src = src;
            img.classList.remove('lazy');
            this.loadedImages.add(src);
            this.observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
  }

  observe(element: HTMLImageElement): void {
    this.observer.observe(element);
  }

  unobserve(element: HTMLImageElement): void {
    this.observer.unobserve(element);
  }

  disconnect(): void {
    this.observer.disconnect();
    this.loadedImages.clear();
  }
}

// Bundle size analysis
export class BundleAnalyzer {
  private loadTimes = new Map<string, number>();
  private componentSizes = new Map<string, number>();

  recordLoadTime(componentName: string, startTime: number): void {
    const loadTime = performance.now() - startTime;
    this.loadTimes.set(componentName, loadTime);
  }

  recordComponentSize(componentName: string, size: number): void {
    this.componentSizes.set(componentName, size);
  }

  getLoadTimeReport(): Record<string, number> {
    return Object.fromEntries(this.loadTimes);
  }

  getSizeReport(): Record<string, number> {
    return Object.fromEntries(this.componentSizes);
  }

  getSlowComponents(threshold = 1000): string[] {
    return Array.from(this.loadTimes.entries())
      .filter(([, time]) => time > threshold)
      .map(([name]) => name);
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  private measurements: Array<{ timestamp: number; memory: number }> = [];
  private intervalId: number | null = null;

  startMonitoring(interval = 5000): void {
    this.intervalId = window.setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.measurements.push({
          timestamp: Date.now(),
          memory: memory.usedJSHeapSize
        });

        // Keep only last 100 measurements
        if (this.measurements.length > 100) {
          this.measurements.shift();
        }
      }
    }, interval);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getMemoryTrend(): Array<{ timestamp: number; memory: number }> {
    return [...this.measurements];
  }

  getCurrentMemoryUsage(): number | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return null;
  }

  hasMemoryLeak(threshold = 50 * 1024 * 1024): boolean {
    if (this.measurements.length < 10) return false;

    const recent = this.measurements.slice(-10);
    const trend = recent[recent.length - 1].memory - recent[0].memory;
    
    return trend > threshold;
  }
}

// Performance metrics collection
export class PerformanceCollector {
  private metrics: Record<string, number[]> = {};

  recordMetric(name: string, value: number): void {
    if (!this.metrics[name]) {
      this.metrics[name] = [];
    }
    
    this.metrics[name].push(value);
    
    // Keep only last 50 measurements per metric
    if (this.metrics[name].length > 50) {
      this.metrics[name].shift();
    }
  }

  getAverage(name: string): number {
    const values = this.metrics[name] || [];
    if (values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getP95(name: string): number {
    const values = this.metrics[name] || [];
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    
    return sorted[index] || 0;
  }

  getAllMetrics(): Record<string, { average: number; p95: number; count: number }> {
    const result: Record<string, { average: number; p95: number; count: number }> = {};
    
    for (const [name, values] of Object.entries(this.metrics)) {
      result[name] = {
        average: this.getAverage(name),
        p95: this.getP95(name),
        count: values.length
      };
    }
    
    return result;
  }

  clearMetrics(): void {
    this.metrics = {};
  }
}

// Global instances
export const virtualScroller = new VirtualScroller({
  itemHeight: 60,
  containerHeight: 400,
  overscan: 5
});

export const imageLazyLoader = new ImageLazyLoader();
export const bundleAnalyzer = new BundleAnalyzer();
export const memoryMonitor = new MemoryMonitor();
export const performanceCollector = new PerformanceCollector();

// React performance utilities
export function measureComponentRender<T extends React.ComponentType<any>>(
  Component: T,
  componentName: string
): T {
  return React.memo(React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const startTime = performance.now();
    
    React.useEffect(() => {
      const renderTime = performance.now() - startTime;
      performanceCollector.recordMetric(`render_${componentName}`, renderTime);
    });
    
    return React.createElement(Component, { ...props, ref });
  })) as T;
}

// Web Vitals measurement
export function measureWebVitals(): void {
  if (typeof window !== 'undefined') {
    // Measure FCP, LCP, FID, CLS
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              performanceCollector.recordMetric('FCP', entry.startTime);
            }
            break;
          case 'largest-contentful-paint':
            performanceCollector.recordMetric('LCP', entry.startTime);
            break;
          case 'first-input':
            performanceCollector.recordMetric('FID', (entry as any).processingStart - entry.startTime);
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              performanceCollector.recordMetric('CLS', (entry as any).value);
            }
            break;
        }
      });
    });
    
    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
  }
}