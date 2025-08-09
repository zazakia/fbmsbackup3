import { ComponentType } from 'react';
import {
  ModuleId,
  CacheEntry,
  CacheConfig,
  NetworkCondition,
  ModuleConfig,
  ModuleLoadingEvent,
  ModuleLoadingEventType
} from '../types/moduleLoading';

interface CacheStatistics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  totalSize: number;
  memoryUsage: number;
  entriesCount: number;
}

interface CacheInvalidationRule {
  moduleId: ModuleId;
  reason: string;
  timestamp: Date;
  affectedModules: ModuleId[];
}

interface CacheWarmupTask {
  moduleId: ModuleId;
  priority: number;
  userId: string;
  userRole: string;
  estimatedLoadTime: number;
  networkCondition: NetworkCondition;
}

class ModuleCacheService {
  private cache: Map<ModuleId, CacheEntry> = new Map();
  private cacheStatistics: Map<string, number> = new Map();
  private config: CacheConfig;
  private memoryUsageThreshold = 50 * 1024 * 1024; // 50MB in bytes
  private sessionStartTime = Date.now();
  private eventListeners: ((event: ModuleLoadingEvent) => void)[] = [];
  
  // Performance tracking
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private warmupTasks: Map<string, CacheWarmupTask> = new Map();
  private invalidationHistory: CacheInvalidationRule[] = [];

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 25, // Max number of cached modules
      ttlMs: 30 * 60 * 1000, // 30 minutes TTL
      maxAge: 2 * 60 * 60 * 1000, // 2 hours absolute max age
      enableCompression: false, // Can be enabled in the future
      enableCaching: true,
      ...config
    };

    this.initializeMemoryMonitoring();
    this.startCacheCleanup();
    this.initializeSessionStorage();
  }

  /**
   * Store a module in the cache with intelligent metadata
   */
  set(
    moduleId: ModuleId,
    component: ComponentType<any>,
    metadata: {
      loadTime: number;
      networkCondition: NetworkCondition;
      userId: string;
      successful: boolean;
      bundleSize?: number;
    }
  ): void {
    if (!this.config.enableCaching) {
      return;
    }

    // Check if we need to evict entries first
    this.enforceMemoryLimits();

    const now = new Date();
    const cacheEntry: CacheEntry = {
      moduleId,
      component,
      timestamp: now,
      expiresAt: new Date(now.getTime() + this.config.ttlMs),
      version: this.generateVersionHash(),
      size: metadata.bundleSize || this.estimateComponentSize(component),
      metadata: {
        ...metadata,
        loadTime: metadata.loadTime,
        networkCondition: metadata.networkCondition,
        userId: metadata.userId,
        successful: metadata.successful
      }
    };

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(moduleId, cacheEntry);
    this.updateSessionStorage();
    
    this.emitEvent('cache_hit', moduleId, {
      action: 'cached',
      size: cacheEntry.size,
      ttl: this.config.ttlMs
    });
  }

  /**
   * Retrieve a module from the cache
   */
  get(moduleId: ModuleId): CacheEntry | null {
    if (!this.config.enableCaching) {
      this.misses++;
      return null;
    }

    const entry = this.cache.get(moduleId);
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check expiration
    const now = new Date();
    if (entry.expiresAt < now || this.isEntryStale(entry)) {
      this.cache.delete(moduleId);
      this.misses++;
      this.evictions++;
      
      this.emitEvent('cache_miss', moduleId, {
        reason: 'expired',
        expiredAt: entry.expiresAt,
        age: now.getTime() - entry.timestamp.getTime()
      });
      
      return null;
    }

    // Update access time for LRU
    entry.timestamp = now;
    this.hits++;
    
    this.emitEvent('cache_hit', moduleId, {
      loadTime: entry.metadata.loadTime,
      age: now.getTime() - entry.timestamp.getTime(),
      networkCondition: entry.metadata.networkCondition
    });

    return entry;
  }

  /**
   * Intelligent cache invalidation based on various conditions
   */
  invalidate(moduleId: ModuleId, reason: string = 'manual'): boolean {
    const entry = this.cache.get(moduleId);
    if (!entry) {
      return false;
    }

    const affectedModules = this.findDependentModules(moduleId);
    
    // Remove the module and its dependents
    this.cache.delete(moduleId);
    affectedModules.forEach(id => this.cache.delete(id));

    // Record invalidation for analytics
    this.invalidationHistory.push({
      moduleId,
      reason,
      timestamp: new Date(),
      affectedModules
    });

    // Keep only recent history (last 50 invalidations)
    if (this.invalidationHistory.length > 50) {
      this.invalidationHistory = this.invalidationHistory.slice(-50);
    }

    this.updateSessionStorage();
    
    this.emitEvent('cache_miss', moduleId, {
      action: 'invalidated',
      reason,
      affectedModules: affectedModules.length
    });

    return true;
  }

  /**
   * Cache warming based on user roles and usage patterns
   */
  async warmupForUser(
    userId: string,
    userRole: string,
    highPriorityModules: ModuleId[],
    networkCondition: NetworkCondition
  ): Promise<void> {
    const rolePriorityMap = this.getRolePriorityModules(userRole);
    const combinedModules = [...new Set([...highPriorityModules, ...rolePriorityMap])];

    for (const moduleId of combinedModules) {
      const taskId = `${userId}-${moduleId}`;
      const estimatedLoadTime = this.estimateLoadTime(moduleId, networkCondition);
      
      const warmupTask: CacheWarmupTask = {
        moduleId,
        priority: this.getModulePriority(moduleId, userRole),
        userId,
        userRole,
        estimatedLoadTime,
        networkCondition
      };

      this.warmupTasks.set(taskId, warmupTask);
    }

    // Execute warmup tasks in priority order
    await this.executeWarmupTasks();
  }

  /**
   * Smart cache invalidation for corrupted or failed modules
   */
  invalidateCorrupted(): void {
    const corruptedEntries: ModuleId[] = [];

    for (const [moduleId, entry] of this.cache.entries()) {
      if (this.isEntryCorrupted(entry)) {
        corruptedEntries.push(moduleId);
      }
    }

    corruptedEntries.forEach(moduleId => {
      this.invalidate(moduleId, 'corrupted');
    });

    if (corruptedEntries.length > 0) {
      console.warn(`Invalidated ${corruptedEntries.length} corrupted cache entries:`, corruptedEntries);
    }
  }

  /**
   * Memory management and cleanup
   */
  private enforceMemoryLimits(): void {
    const memoryUsage = this.getMemoryUsage();
    
    if (memoryUsage > this.memoryUsageThreshold) {
      // Aggressive cleanup - remove oldest entries
      const entriesToRemove = Math.ceil(this.cache.size * 0.3); // Remove 30%
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp.getTime() - b.timestamp.getTime());

      for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
        const [moduleId] = sortedEntries[i];
        this.cache.delete(moduleId);
        this.evictions++;
      }

      console.warn(`Memory cleanup: removed ${entriesToRemove} cache entries. Memory usage: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStatistics(): CacheStatistics {
    const total = this.hits + this.misses;
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    return {
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      missRate: total > 0 ? (this.misses / total) * 100 : 0,
      evictionRate: this.evictions > 0 ? (this.evictions / (this.hits + this.misses + this.evictions)) * 100 : 0,
      totalSize,
      memoryUsage: this.getMemoryUsage(),
      entriesCount: this.cache.size
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const entriesCount = this.cache.size;
    this.cache.clear();
    this.clearSessionStorage();
    
    this.emitEvent('cache_miss', 'dashboard', {
      action: 'cache_cleared',
      entriesCleared: entriesCount
    });
  }

  /**
   * Get cache health information
   */
  getHealthInfo(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getStatistics();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check hit rate
    if (stats.hitRate < 30) {
      status = 'warning';
      issues.push('Low cache hit rate');
      recommendations.push('Consider increasing TTL or reviewing cache warming strategy');
    }

    // Check memory usage
    if (stats.memoryUsage > this.memoryUsageThreshold * 0.8) {
      status = 'warning';
      issues.push('High memory usage');
      recommendations.push('Consider reducing cache size or implementing compression');
    }

    // Check eviction rate
    if (stats.evictionRate > 20) {
      status = 'critical';
      issues.push('High cache eviction rate');
      recommendations.push('Increase cache size or reduce TTL');
    }

    return {
      status,
      issues,
      recommendations
    };
  }

  /**
   * Export cache data for diagnostics
   */
  exportDiagnosticData(): {
    statistics: CacheStatistics;
    healthInfo: ReturnType<typeof this.getHealthInfo>;
    invalidationHistory: CacheInvalidationRule[];
    activeEntries: Array<{
      moduleId: ModuleId;
      size: number;
      age: number;
      networkCondition: NetworkCondition;
      successful: boolean;
    }>;
  } {
    const now = Date.now();
    const activeEntries = Array.from(this.cache.entries()).map(([moduleId, entry]) => ({
      moduleId,
      size: entry.size,
      age: now - entry.timestamp.getTime(),
      networkCondition: entry.metadata.networkCondition,
      successful: entry.metadata.successful
    }));

    return {
      statistics: this.getStatistics(),
      healthInfo: this.getHealthInfo(),
      invalidationHistory: [...this.invalidationHistory],
      activeEntries
    };
  }

  // Private helper methods
  private evictLeastRecentlyUsed(): void {
    const oldestEntry = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.timestamp.getTime() - b.timestamp.getTime())[0];
    
    if (oldestEntry) {
      this.cache.delete(oldestEntry[0]);
      this.evictions++;
    }
  }

  private isEntryStale(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp.getTime();
    return age > this.config.maxAge || !entry.metadata.successful;
  }

  private isEntryCorrupted(entry: CacheEntry): boolean {
    try {
      // Basic validation
      return !entry.component || 
             !entry.moduleId || 
             !entry.timestamp ||
             entry.size < 0 ||
             !entry.metadata;
    } catch {
      return true;
    }
  }

  private findDependentModules(moduleId: ModuleId): ModuleId[] {
    // This would analyze module dependencies
    // For now, return empty array - could be enhanced with dependency graph
    return [];
  }

  private getRolePriorityModules(userRole: string): ModuleId[] {
    const roleMappings: Record<string, ModuleId[]> = {
      admin: ['dashboard', 'settings', 'reports', 'branches', 'cloud-backup'],
      manager: ['dashboard', 'reports', 'pos', 'inventory', 'manager-operations'],
      employee: ['dashboard', 'pos', 'inventory', 'sales'],
      accountant: ['dashboard', 'accounting', 'bir-forms', 'expenses', 'payroll']
    };

    return roleMappings[userRole] || ['dashboard'];
  }

  private getModulePriority(moduleId: ModuleId, userRole: string): number {
    const priorityMap: Record<ModuleId, number> = {
      dashboard: 100,
      pos: 90,
      inventory: 80,
      accounting: 70,
      reports: 60,
      settings: 50,
      // ... other modules
    } as any;

    return priorityMap[moduleId] || 30;
  }

  private estimateLoadTime(moduleId: ModuleId, networkCondition: NetworkCondition): number {
    const baseTime = 1000; // 1 second base
    const multipliers: Record<NetworkCondition, number> = {
      excellent: 0.5,
      good: 1,
      fair: 2,
      poor: 4,
      offline: 10
    };

    return baseTime * (multipliers[networkCondition] || 1);
  }

  private async executeWarmupTasks(): Promise<void> {
    const tasks = Array.from(this.warmupTasks.values())
      .sort((a, b) => b.priority - a.priority);

    // Execute up to 3 warmup tasks concurrently
    const concurrencyLimit = 3;
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
      }

      const taskPromise = this.executeWarmupTask(task);
      executing.push(taskPromise);
    }

    await Promise.all(executing);
  }

  private async executeWarmupTask(task: CacheWarmupTask): Promise<void> {
    try {
      // This would integrate with ModuleLoadingManager
      // For now, simulate the warmup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.debug(`Cache warmup completed for ${task.moduleId} (user: ${task.userId})`);
      
      this.emitEvent('module_preloaded', task.moduleId, {
        success: true,
        warmup: true,
        priority: task.priority
      });
    } catch (error) {
      console.warn(`Cache warmup failed for ${task.moduleId}:`, error);
      
      this.emitEvent('module_preloaded', task.moduleId, {
        success: false,
        warmup: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private generateVersionHash(): string {
    // Simple version based on session and timestamp
    return `v${this.sessionStartTime}-${Date.now().toString(36)}`;
  }

  private estimateComponentSize(component: ComponentType<any>): number {
    try {
      // Rough estimation based on component string length
      const componentStr = component.toString();
      return componentStr.length * 2; // Rough bytes estimation
    } catch {
      return 1024; // Default 1KB
    }
  }

  private getMemoryUsage(): number {
    try {
      return (performance as any).memory?.usedJSHeapSize || 0;
    } catch {
      // Fallback estimation based on cache size
      return this.cache.size * 1024 * 50; // Estimate 50KB per module
    }
  }

  private initializeMemoryMonitoring(): void {
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      this.enforceMemoryLimits();
    }, 30 * 1000);
  }

  private startCacheCleanup(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = new Date();
      let cleanedCount = 0;

      for (const [moduleId, entry] of this.cache.entries()) {
        if (entry.expiresAt < now || this.isEntryStale(entry)) {
          this.cache.delete(moduleId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.debug(`Cache cleanup: removed ${cleanedCount} expired entries`);
        this.updateSessionStorage();
      }
    }, 5 * 60 * 1000);
  }

  private initializeSessionStorage(): void {
    // Initialize from session storage if available
    try {
      const stored = sessionStorage.getItem('moduleCache');
      if (stored) {
        const data = JSON.parse(stored);
        // Only restore if from same session
        if (data.sessionId === this.sessionStartTime) {
          // Restore cache entries (simplified)
          console.debug('Cache restored from session storage');
        }
      }
    } catch (error) {
      console.warn('Failed to restore cache from session storage:', error);
    }
  }

  private updateSessionStorage(): void {
    try {
      const cacheData = {
        sessionId: this.sessionStartTime,
        timestamp: Date.now(),
        size: this.cache.size,
        statistics: this.getStatistics()
      };
      sessionStorage.setItem('moduleCache', JSON.stringify(cacheData));
    } catch (error) {
      // Session storage might be full or unavailable
      console.warn('Failed to update session storage:', error);
    }
  }

  private clearSessionStorage(): void {
    try {
      sessionStorage.removeItem('moduleCache');
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
  }

  private emitEvent(type: ModuleLoadingEventType, moduleId: ModuleId, data: Record<string, any>): void {
    const event: ModuleLoadingEvent = {
      type,
      moduleId,
      timestamp: new Date(),
      data,
      userId: 'current-user', // This would come from auth store
      sessionId: 'current-session'
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cache event listener:', error);
      }
    });
  }

  /**
   * Subscribe to cache events
   */
  subscribeToEvents(callback: (event: ModuleLoadingEvent) => void): () => void {
    this.eventListeners.push(callback);
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }
}

// Create and export singleton instance
export const moduleCacheService = new ModuleCacheService();
export default ModuleCacheService;