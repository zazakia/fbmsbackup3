/**
 * Performance optimization service that provides:
 * 1. Batch processing for stock updates
 * 2. Caching for frequently accessed data
 * 3. Performance monitoring and metrics
 */

import { Product, StockMovementHistory } from '../types/business';
import { ErrorHandlingService } from './errorHandlingService';

// Cache configuration
const CACHE_SIZE = 500; // Reduced for testing
const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutes

// Performance thresholds
const SLOW_OPERATION_THRESHOLD = 2000; // 2 seconds
const BATCH_SIZE = 100;

// Cache implementation with LRU eviction
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check expiration
    if (Date.now() - entry.timestamp > CACHE_EXPIRATION) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Metrics collector
class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();

  recordDuration(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);

    // Alert on slow operations
    if (duration > SLOW_OPERATION_THRESHOLD) {
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }
  }

  getMetrics(operation: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } {
    const durations = this.metrics.get(operation) || [];
    if (durations.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0 };
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      count: durations.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index]
    };
  }

  clear(): void {
    this.metrics.clear();
  }
}

export class PerformanceService {
  private static productCache = new LRUCache<string, Product>(CACHE_SIZE);
  private static movementCache = new LRUCache<string, StockMovementHistory>(CACHE_SIZE);
  private static metrics = new MetricsCollector();
  private static simulateFailure = false; // For testing

  // For testing only
  static setSimulateFailure(simulate: boolean): void {
    this.simulateFailure = simulate;
  }

  // Batch process stock updates
  static async batchProcessStockUpdates(
    updates: Array<{
      productId: string;
      quantity: number;
      type: string;
      metadata?: any;
    }>
  ): Promise<{
    success: boolean;
    processed: number;
    failed: Array<{ index: number; error: string }>;
  }> {
    const startTime = Date.now();
    const failed: Array<{ index: number; error: string }> = [];
    let processed = 0;

    try {
      // Process in batches
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (update, batchIndex) => {
            try {
              // Simulate processing delay
              await new Promise(resolve => setTimeout(resolve, 100));

              // Simulate failures in test mode
              if (this.simulateFailure && update.quantity < 0) {
                throw new Error('Invalid quantity');
              }

              // TODO: Implement actual update logic
              processed++;
            } catch (error) {
              failed.push({
                index: i + batchIndex,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          })
        );
      }

      // Record metrics
      const duration = Date.now() - startTime;
      this.metrics.recordDuration('batchProcessStockUpdates', duration);

      return {
        success: failed.length === 0,
        processed,
        failed
      };
    } catch (error) {
      ErrorHandlingService.logError(
        ErrorHandlingService.formatBusinessError(
          'Batch processing failed',
          'performance'
        ),
        'high'
      );
      throw error;
    }
  }

  // Cache management
  static cacheProduct(product: Product): void {
    this.productCache.set(product.id, product);
  }

  static getCachedProduct(productId: string): Product | undefined {
    return this.productCache.get(productId);
  }

  static cacheMovement(movement: StockMovementHistory): void {
    this.movementCache.set(movement.id, movement);
  }

  static getCachedMovement(movementId: string): StockMovementHistory | undefined {
    return this.movementCache.get(movementId);
  }

  static clearCache(): void {
    this.productCache.clear();
    this.movementCache.clear();
  }

  // Performance monitoring
  static recordOperationDuration(operation: string, duration: number): void {
    this.metrics.recordDuration(operation, duration);
  }

  static getOperationMetrics(operation: string) {
    return this.metrics.getMetrics(operation);
  }

  static clearMetrics(): void {
    this.metrics.clear();
  }

  // Performance analysis
  static analyzePerformance(operation: string): {
    status: 'good' | 'warning' | 'critical';
    metrics: any;
    recommendations: string[];
  } {
    const metrics = this.getOperationMetrics(operation);
    const recommendations: string[] = [];

    // Analyze average duration
    let status: 'good' | 'warning' | 'critical' = 'good';
    if (metrics.average > SLOW_OPERATION_THRESHOLD) {
      status = 'critical';
      recommendations.push('Consider optimizing the operation for better performance');
    } else if (metrics.p95 > SLOW_OPERATION_THRESHOLD) {
      status = 'warning';
      recommendations.push('Some operations are running slowly, monitor for degradation');
    }

    // Analyze cache effectiveness
    const cacheSize = this.productCache.size() + this.movementCache.size();
    if (cacheSize > CACHE_SIZE * 0.9) {
      status = status === 'critical' ? 'critical' : 'warning';
      recommendations.push('Cache is nearly full, consider adjusting cache size');
    }

    return {
      status,
      metrics,
      recommendations
    };
  }
}