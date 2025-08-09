import {
  ModuleId,
  ModuleLoadingMetrics,
  NetworkCondition,
  PerformanceThresholds,
  ModuleLoadingPhase,
  ModuleLoadingEvent,
  ModuleLoadingEventType
} from '../types/moduleLoading';

interface PerformanceAlert {
  id: string;
  type: 'threshold_exceeded' | 'degradation_detected' | 'failure_spike' | 'memory_warning';
  severity: 'info' | 'warning' | 'critical';
  moduleId?: ModuleId;
  message: string;
  timestamp: Date;
  value: number;
  threshold: number;
  context: Record<string, any>;
  acknowledged: boolean;
}

interface PerformanceSnapshot {
  timestamp: Date;
  moduleMetrics: Record<ModuleId, {
    avgLoadTime: number;
    successRate: number;
    errorRate: number;
    cacheHitRate: number;
    recentLoads: number;
  }>;
  systemMetrics: {
    totalMemoryUsage: number;
    activeConnections: number;
    networkCondition: NetworkCondition;
    systemHealth: 'healthy' | 'degraded' | 'critical';
  };
  userMetrics: {
    activeUsers: number;
    concurrentLoads: number;
    avgSessionDuration: number;
  };
}

interface PerformanceConfig {
  snapshotInterval: number;
  alertThresholds: {
    loadTimeWarning: number;
    loadTimeCritical: number;
    errorRateWarning: number;
    errorRateCritical: number;
    memoryUsageWarning: number;
    memoryUsageCritical: number;
  };
  retentionDays: number;
  enableRealTimeMonitoring: boolean;
  enableAlerts: boolean;
  enableTrending: boolean;
}

class PerformanceMonitoringService {
  private config: PerformanceConfig;
  private metrics: ModuleLoadingMetrics[] = [];
  private snapshots: PerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private eventListeners: ((event: ModuleLoadingEvent) => void)[] = [];
  private performanceObserver?: PerformanceObserver;
  private monitoringTimer?: NodeJS.Timeout;
  private alertProcessingTimer?: NodeJS.Timeout;
  
  // Real-time tracking
  private activeLoads: Map<string, {
    moduleId: ModuleId;
    startTime: number;
    phase: ModuleLoadingPhase;
    networkCondition: NetworkCondition;
    userId: string;
  }> = new Map();

  private phaseTimings: Map<string, Record<ModuleLoadingPhase, number>> = new Map();
  
  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      snapshotInterval: 30 * 1000, // 30 seconds
      alertThresholds: {
        loadTimeWarning: 3000, // 3 seconds
        loadTimeCritical: 8000, // 8 seconds
        errorRateWarning: 10, // 10%
        errorRateCritical: 25, // 25%
        memoryUsageWarning: 100 * 1024 * 1024, // 100MB
        memoryUsageCritical: 200 * 1024 * 1024, // 200MB
      },
      retentionDays: 7,
      enableRealTimeMonitoring: true,
      enableAlerts: true,
      enableTrending: true,
      ...config
    };

    this.initializePerformanceObserver();
    this.startRealTimeMonitoring();
    this.startAlertProcessing();
    this.loadHistoricalData();
  }

  /**
   * Start tracking a module loading operation
   */
  startTracking(
    loadId: string,
    moduleId: ModuleId,
    userId: string,
    networkCondition: NetworkCondition
  ): void {
    if (!this.config.enableRealTimeMonitoring) return;

    this.activeLoads.set(loadId, {
      moduleId,
      startTime: performance.now(),
      phase: 'initializing',
      networkCondition,
      userId
    });

    this.phaseTimings.set(loadId, {} as Record<ModuleLoadingPhase, number>);
    this.phaseTimings.get(loadId)!['initializing'] = performance.now();

    this.emitEvent('loading_started', moduleId, {
      loadId,
      userId,
      networkCondition,
      startTime: Date.now()
    });
  }

  /**
   * Update the phase of a loading operation
   */
  updatePhase(
    loadId: string,
    phase: ModuleLoadingPhase,
    progress?: number
  ): void {
    const tracking = this.activeLoads.get(loadId);
    if (!tracking) return;

    const now = performance.now();
    const timings = this.phaseTimings.get(loadId)!;
    
    // Record timing for previous phase
    if (tracking.phase && timings[tracking.phase]) {
      const phaseStart = timings[tracking.phase];
      const phaseDuration = now - phaseStart;
      
      // Store phase duration for analysis
      this.recordPhaseTiming(tracking.moduleId, tracking.phase, phaseDuration);
    }

    // Start timing new phase
    tracking.phase = phase;
    timings[phase] = now;

    this.emitEvent('loading_progress', tracking.moduleId, {
      loadId,
      phase,
      progress: progress || 0,
      elapsedTime: now - tracking.startTime
    });
  }

  /**
   * Complete tracking and record final metrics
   */
  completeTracking(
    loadId: string,
    success: boolean,
    error?: Error,
    bundleSize?: number
  ): void {
    const tracking = this.activeLoads.get(loadId);
    if (!tracking) return;

    const endTime = performance.now();
    const duration = endTime - tracking.startTime;
    const timings = this.phaseTimings.get(loadId) || {};

    // Create comprehensive metrics
    const metrics: ModuleLoadingMetrics = {
      moduleId: tracking.moduleId,
      startTime: tracking.startTime,
      endTime,
      duration,
      loadingPhases: this.buildPhaseMetrics(timings, tracking.startTime, endTime),
      retryCount: 0, // Would be passed in for retries
      cacheHit: false, // Would be determined elsewhere
      networkCondition: tracking.networkCondition,
      memoryUsage: this.getMemoryUsage(),
      bundleSize,
      userId: tracking.userId,
      userRole: 'admin', // Would come from auth store
      deviceType: this.getDeviceType(),
      success,
      error: error ? {
        type: 'unknown_error' as any,
        moduleId: tracking.moduleId,
        message: error.message,
        originalError: error,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        recoverable: true,
        fallbackSuggestions: []
      } : undefined
    };

    this.recordMetrics(metrics);
    
    // Check for performance issues
    this.checkPerformanceThresholds(metrics);
    
    // Cleanup
    this.activeLoads.delete(loadId);
    this.phaseTimings.delete(loadId);

    this.emitEvent(success ? 'loading_completed' : 'loading_failed', tracking.moduleId, {
      loadId,
      duration,
      success,
      networkCondition: tracking.networkCondition,
      error: error?.message
    });
  }

  /**
   * Record module loading metrics
   */
  recordMetrics(metrics: ModuleLoadingMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics based on retention policy
    const cutoffDate = new Date(Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000));
    this.metrics = this.metrics.filter(m => new Date(m.startTime) >= cutoffDate);

    // Store to localStorage for persistence
    this.saveMetrics();
  }

  /**
   * Get real-time performance metrics
   */
  getRealTimeMetrics(): {
    activeLoads: number;
    avgLoadTime: number;
    successRate: number;
    errorRate: number;
    networkCondition: NetworkCondition;
    memoryUsage: number;
    topSlowModules: Array<{ moduleId: ModuleId; avgLoadTime: number }>;
    recentAlerts: number;
  } {
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
    const total = recentMetrics.length;
    const successful = recentMetrics.filter(m => m.success).length;

    const avgLoadTime = total > 0 
      ? recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / total
      : 0;

    const topSlowModules = this.getTopSlowModules(recentMetrics, 5);

    return {
      activeLoads: this.activeLoads.size,
      avgLoadTime,
      successRate: total > 0 ? (successful / total) * 100 : 100,
      errorRate: total > 0 ? ((total - successful) / total) * 100 : 0,
      networkCondition: this.getCurrentNetworkCondition(),
      memoryUsage: this.getMemoryUsage().after || 0,
      topSlowModules,
      recentAlerts: this.getRecentAlerts(5 * 60 * 1000).length
    };
  }

  /**
   * Get detailed timing metrics for all phases
   */
  getDetailedTimingMetrics(moduleId?: ModuleId): {
    averagePhaseTimings: Record<ModuleLoadingPhase, number>;
    phaseDistribution: Record<ModuleLoadingPhase, { min: number; max: number; avg: number }>;
    slowestOperations: Array<{
      moduleId: ModuleId;
      phase: ModuleLoadingPhase;
      duration: number;
      timestamp: Date;
    }>;
  } {
    const relevantMetrics = moduleId 
      ? this.metrics.filter(m => m.moduleId === moduleId)
      : this.metrics;

    const phaseAverages = this.calculatePhaseAverages(relevantMetrics);
    const phaseDistribution = this.calculatePhaseDistribution(relevantMetrics);
    const slowestOperations = this.findSlowestOperations(relevantMetrics, 10);

    return {
      averagePhaseTimings: phaseAverages,
      phaseDistribution,
      slowestOperations
    };
  }

  /**
   * Network condition correlation analysis
   */
  getNetworkPerformanceCorrelation(): {
    conditionMetrics: Record<NetworkCondition, {
      avgLoadTime: number;
      successRate: number;
      sampleSize: number;
    }>;
    optimalConditions: NetworkCondition[];
    degradedConditions: NetworkCondition[];
    recommendations: string[];
  } {
    const conditionMetrics: Record<NetworkCondition, {
      avgLoadTime: number;
      successRate: number;
      sampleSize: number;
    }> = {} as any;

    // Group metrics by network condition
    const conditions: NetworkCondition[] = ['excellent', 'good', 'fair', 'poor', 'offline'];
    
    conditions.forEach(condition => {
      const conditionData = this.metrics.filter(m => m.networkCondition === condition);
      
      if (conditionData.length > 0) {
        const avgLoadTime = conditionData.reduce((sum, m) => sum + (m.duration || 0), 0) / conditionData.length;
        const successful = conditionData.filter(m => m.success).length;
        const successRate = (successful / conditionData.length) * 100;

        conditionMetrics[condition] = {
          avgLoadTime,
          successRate,
          sampleSize: conditionData.length
        };
      }
    });

    // Analyze conditions
    const optimalConditions = conditions.filter(condition => {
      const data = conditionMetrics[condition];
      return data && data.avgLoadTime < 2000 && data.successRate > 95;
    });

    const degradedConditions = conditions.filter(condition => {
      const data = conditionMetrics[condition];
      return data && (data.avgLoadTime > 5000 || data.successRate < 80);
    });

    const recommendations = this.generateNetworkRecommendations(conditionMetrics);

    return {
      conditionMetrics,
      optimalConditions,
      degradedConditions,
      recommendations
    };
  }

  /**
   * Get current active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Create performance snapshot
   */
  createSnapshot(): PerformanceSnapshot {
    const now = new Date();
    const recentMetrics = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
    
    // Module-specific metrics
    const moduleMetrics: Record<ModuleId, any> = {};
    const moduleIds = [...new Set(recentMetrics.map(m => m.moduleId))];
    
    moduleIds.forEach(moduleId => {
      const moduleData = recentMetrics.filter(m => m.moduleId === moduleId);
      const successful = moduleData.filter(m => m.success);
      const cached = moduleData.filter(m => m.cacheHit);
      
      moduleMetrics[moduleId] = {
        avgLoadTime: moduleData.length > 0 
          ? moduleData.reduce((sum, m) => sum + (m.duration || 0), 0) / moduleData.length
          : 0,
        successRate: moduleData.length > 0 
          ? (successful.length / moduleData.length) * 100
          : 100,
        errorRate: moduleData.length > 0 
          ? ((moduleData.length - successful.length) / moduleData.length) * 100
          : 0,
        cacheHitRate: moduleData.length > 0 
          ? (cached.length / moduleData.length) * 100
          : 0,
        recentLoads: moduleData.length
      };
    });

    // System metrics
    const systemMetrics = {
      totalMemoryUsage: this.getMemoryUsage().after || 0,
      activeConnections: this.activeLoads.size,
      networkCondition: this.getCurrentNetworkCondition(),
      systemHealth: this.calculateSystemHealth(recentMetrics)
    };

    // User metrics (simplified)
    const userMetrics = {
      activeUsers: new Set(recentMetrics.map(m => m.userId)).size,
      concurrentLoads: this.activeLoads.size,
      avgSessionDuration: 0 // Would need session tracking
    };

    const snapshot: PerformanceSnapshot = {
      timestamp: now,
      moduleMetrics,
      systemMetrics,
      userMetrics
    };

    this.snapshots.push(snapshot);
    
    // Keep only recent snapshots
    const maxSnapshots = (24 * 60 * 60 * 1000) / this.config.snapshotInterval; // 1 day
    if (this.snapshots.length > maxSnapshots) {
      this.snapshots = this.snapshots.slice(-maxSnapshots);
    }

    return snapshot;
  }

  /**
   * Export all performance data for analysis
   */
  exportPerformanceData(): {
    metrics: ModuleLoadingMetrics[];
    snapshots: PerformanceSnapshot[];
    alerts: PerformanceAlert[];
    realTimeMetrics: ReturnType<typeof this.getRealTimeMetrics>;
    timingAnalysis: ReturnType<typeof this.getDetailedTimingMetrics>;
    networkAnalysis: ReturnType<typeof this.getNetworkPerformanceCorrelation>;
  } {
    return {
      metrics: [...this.metrics],
      snapshots: [...this.snapshots],
      alerts: [...this.alerts],
      realTimeMetrics: this.getRealTimeMetrics(),
      timingAnalysis: this.getDetailedTimingMetrics(),
      networkAnalysis: this.getNetworkPerformanceCorrelation()
    };
  }

  // Private helper methods
  private buildPhaseMetrics(
    timings: Record<ModuleLoadingPhase, number>,
    startTime: number,
    endTime: number
  ): ModuleLoadingMetrics['loadingPhases'] {
    const phases: ModuleLoadingPhase[] = ['initializing', 'importing', 'resolving', 'hydrating', 'complete'];
    const result = {} as ModuleLoadingMetrics['loadingPhases'];

    phases.forEach((phase, index) => {
      const phaseStart = timings[phase] || startTime;
      const nextPhase = phases[index + 1];
      const phaseEnd = nextPhase ? timings[nextPhase] : endTime;
      
      result[phase] = {
        startTime: phaseStart,
        endTime: phaseEnd,
        duration: phaseEnd - phaseStart
      };
    });

    return result;
  }

  private recordPhaseTiming(moduleId: ModuleId, phase: ModuleLoadingPhase, duration: number): void {
    // This could be used for phase-specific analysis
    console.debug(`Phase ${phase} for ${moduleId} took ${duration.toFixed(2)}ms`);
  }

  private checkPerformanceThresholds(metrics: ModuleLoadingMetrics): void {
    if (!this.config.enableAlerts) return;

    const { loadTimeWarning, loadTimeCritical, memoryUsageWarning, memoryUsageCritical } = this.config.alertThresholds;
    
    // Check load time thresholds
    if (metrics.duration) {
      if (metrics.duration > loadTimeCritical) {
        this.createAlert(
          'threshold_exceeded',
          'critical',
          metrics.moduleId,
          `Module load time exceeded critical threshold`,
          metrics.duration,
          loadTimeCritical,
          { phase: 'complete', networkCondition: metrics.networkCondition }
        );
      } else if (metrics.duration > loadTimeWarning) {
        this.createAlert(
          'threshold_exceeded',
          'warning',
          metrics.moduleId,
          `Module load time exceeded warning threshold`,
          metrics.duration,
          loadTimeWarning,
          { phase: 'complete', networkCondition: metrics.networkCondition }
        );
      }
    }

    // Check memory usage
    const memoryUsage = metrics.memoryUsage?.after || 0;
    if (memoryUsage > memoryUsageCritical) {
      this.createAlert(
        'memory_warning',
        'critical',
        metrics.moduleId,
        `Memory usage is critically high`,
        memoryUsage,
        memoryUsageCritical,
        { memoryBefore: metrics.memoryUsage?.before }
      );
    } else if (memoryUsage > memoryUsageWarning) {
      this.createAlert(
        'memory_warning',
        'warning',
        metrics.moduleId,
        `Memory usage is elevated`,
        memoryUsage,
        memoryUsageWarning,
        { memoryBefore: metrics.memoryUsage?.before }
      );
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    moduleId: ModuleId | undefined,
    message: string,
    value: number,
    threshold: number,
    context: Record<string, any>
  ): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      moduleId,
      message,
      timestamp: new Date(),
      value,
      threshold,
      context,
      acknowledged: false
    };

    this.alerts.push(alert);
    
    // Keep only recent alerts
    const maxAlerts = 100;
    if (this.alerts.length > maxAlerts) {
      this.alerts = this.alerts.slice(-maxAlerts);
    }

    this.emitEvent('loading_failed', moduleId || 'dashboard', {
      alert: {
        id: alert.id,
        type,
        severity,
        message
      }
    });

    console.warn(`Performance Alert [${severity.toUpperCase()}]: ${message}`, {
      value,
      threshold,
      context
    });
  }

  private getRecentMetrics(windowMs: number): ModuleLoadingMetrics[] {
    const cutoff = Date.now() - windowMs;
    return this.metrics.filter(m => m.startTime >= cutoff);
  }

  private getRecentAlerts(windowMs: number): PerformanceAlert[] {
    const cutoff = new Date(Date.now() - windowMs);
    return this.alerts.filter(a => a.timestamp >= cutoff);
  }

  private getTopSlowModules(metrics: ModuleLoadingMetrics[], limit: number): Array<{ moduleId: ModuleId; avgLoadTime: number }> {
    const moduleGroups: Record<ModuleId, number[]> = {} as any;
    
    metrics.forEach(m => {
      if (m.duration) {
        if (!moduleGroups[m.moduleId]) {
          moduleGroups[m.moduleId] = [];
        }
        moduleGroups[m.moduleId].push(m.duration);
      }
    });

    return Object.entries(moduleGroups)
      .map(([moduleId, durations]) => ({
        moduleId: moduleId as ModuleId,
        avgLoadTime: durations.reduce((sum, d) => sum + d, 0) / durations.length
      }))
      .sort((a, b) => b.avgLoadTime - a.avgLoadTime)
      .slice(0, limit);
  }

  private calculatePhaseAverages(metrics: ModuleLoadingMetrics[]): Record<ModuleLoadingPhase, number> {
    const phases: ModuleLoadingPhase[] = ['initializing', 'importing', 'resolving', 'hydrating', 'complete'];
    const result = {} as Record<ModuleLoadingPhase, number>;

    phases.forEach(phase => {
      const phaseDurations = metrics
        .map(m => m.loadingPhases[phase]?.duration)
        .filter(d => d !== undefined) as number[];

      result[phase] = phaseDurations.length > 0
        ? phaseDurations.reduce((sum, d) => sum + d, 0) / phaseDurations.length
        : 0;
    });

    return result;
  }

  private calculatePhaseDistribution(metrics: ModuleLoadingMetrics[]) {
    const phases: ModuleLoadingPhase[] = ['initializing', 'importing', 'resolving', 'hydrating', 'complete'];
    const result = {} as Record<ModuleLoadingPhase, { min: number; max: number; avg: number }>;

    phases.forEach(phase => {
      const phaseDurations = metrics
        .map(m => m.loadingPhases[phase]?.duration)
        .filter(d => d !== undefined) as number[];

      if (phaseDurations.length > 0) {
        result[phase] = {
          min: Math.min(...phaseDurations),
          max: Math.max(...phaseDurations),
          avg: phaseDurations.reduce((sum, d) => sum + d, 0) / phaseDurations.length
        };
      } else {
        result[phase] = { min: 0, max: 0, avg: 0 };
      }
    });

    return result;
  }

  private findSlowestOperations(metrics: ModuleLoadingMetrics[], limit: number) {
    const operations: Array<{
      moduleId: ModuleId;
      phase: ModuleLoadingPhase;
      duration: number;
      timestamp: Date;
    }> = [];

    metrics.forEach(m => {
      Object.entries(m.loadingPhases).forEach(([phase, timing]) => {
        if (timing.duration) {
          operations.push({
            moduleId: m.moduleId,
            phase: phase as ModuleLoadingPhase,
            duration: timing.duration,
            timestamp: new Date(m.startTime)
          });
        }
      });
    });

    return operations
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  private generateNetworkRecommendations(conditionMetrics: Record<NetworkCondition, any>): string[] {
    const recommendations: string[] = [];

    Object.entries(conditionMetrics).forEach(([condition, data]) => {
      if (data.avgLoadTime > 5000) {
        recommendations.push(`Consider implementing aggressive caching for ${condition} network conditions`);
      }
      if (data.successRate < 80) {
        recommendations.push(`Improve retry logic for ${condition} network conditions`);
      }
      if (data.sampleSize < 10) {
        recommendations.push(`Need more data samples for ${condition} network analysis`);
      }
    });

    return recommendations;
  }

  private calculateSystemHealth(metrics: ModuleLoadingMetrics[]): 'healthy' | 'degraded' | 'critical' {
    if (metrics.length === 0) return 'healthy';

    const successRate = metrics.filter(m => m.success).length / metrics.length;
    const avgLoadTime = metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length;

    if (successRate < 0.7 || avgLoadTime > 8000) return 'critical';
    if (successRate < 0.9 || avgLoadTime > 3000) return 'degraded';
    return 'healthy';
  }

  private getMemoryUsage(): { before?: number; after: number; delta?: number } {
    try {
      const memory = (performance as any).memory;
      return {
        after: memory?.usedJSHeapSize || 0
      };
    } catch {
      return { after: 0 };
    }
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|android/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private getCurrentNetworkCondition(): NetworkCondition {
    const connection = (navigator as any).connection;
    
    if (!navigator.onLine) return 'offline';
    if (!connection) return 'good';
    
    const { effectiveType, downlink } = connection;
    if (effectiveType === '4g' && downlink > 2) return 'excellent';
    if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 1)) return 'good';
    if (effectiveType === '3g') return 'fair';
    return 'poor';
  }

  private initializePerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
            // Could correlate with module loading performance
            console.debug('Performance entry:', entry);
          }
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'resource', 'measure'] 
      });
    } catch (error) {
      console.warn('Failed to initialize PerformanceObserver:', error);
    }
  }

  private startRealTimeMonitoring(): void {
    if (!this.config.enableRealTimeMonitoring) return;

    this.monitoringTimer = setInterval(() => {
      this.createSnapshot();
      this.detectPerformanceDegradation();
    }, this.config.snapshotInterval);
  }

  private startAlertProcessing(): void {
    if (!this.config.enableAlerts) return;

    this.alertProcessingTimer = setInterval(() => {
      this.processAlerts();
    }, 10 * 1000); // Process alerts every 10 seconds
  }

  private detectPerformanceDegradation(): void {
    const recent = this.getRecentMetrics(5 * 60 * 1000); // Last 5 minutes
    const baseline = this.getRecentMetrics(30 * 60 * 1000); // Last 30 minutes
    
    if (recent.length < 5 || baseline.length < 10) return;

    const recentAvg = recent.reduce((sum, m) => sum + (m.duration || 0), 0) / recent.length;
    const baselineAvg = baseline.reduce((sum, m) => sum + (m.duration || 0), 0) / baseline.length;
    
    const degradationThreshold = 1.5; // 50% slower than baseline
    
    if (recentAvg > baselineAvg * degradationThreshold) {
      this.createAlert(
        'degradation_detected',
        'warning',
        undefined,
        'System performance degradation detected',
        recentAvg,
        baselineAvg * degradationThreshold,
        { recentAvg, baselineAvg, sampleSizes: { recent: recent.length, baseline: baseline.length } }
      );
    }
  }

  private processAlerts(): void {
    // Could implement alert aggregation, notification sending, etc.
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    
    if (criticalAlerts.length > 0) {
      console.warn(`${criticalAlerts.length} critical performance alerts active`);
    }
  }

  private loadHistoricalData(): void {
    try {
      const stored = localStorage.getItem('performanceMetrics');
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = data.metrics || [];
        this.snapshots = data.snapshots || [];
        // Clean old data
        this.cleanOldData();
      }
    } catch (error) {
      console.warn('Failed to load historical performance data:', error);
    }
  }

  private saveMetrics(): void {
    try {
      const data = {
        metrics: this.metrics.slice(-500), // Keep last 500 metrics
        snapshots: this.snapshots.slice(-100), // Keep last 100 snapshots
        timestamp: Date.now()
      };
      localStorage.setItem('performanceMetrics', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save performance metrics:', error);
    }
  }

  private cleanOldData(): void {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    
    this.metrics = this.metrics.filter(m => m.startTime >= cutoff);
    this.snapshots = this.snapshots.filter(s => s.timestamp.getTime() >= cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() >= cutoff);
  }

  private emitEvent(type: ModuleLoadingEventType, moduleId: ModuleId, data: Record<string, any>): void {
    const event: ModuleLoadingEvent = {
      type,
      moduleId,
      timestamp: new Date(),
      data,
      userId: 'current-user',
      sessionId: 'current-session'
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in performance monitoring event listener:', error);
      }
    });
  }

  /**
   * Subscribe to performance events
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

  /**
   * Cleanup and stop monitoring
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    if (this.alertProcessingTimer) {
      clearInterval(this.alertProcessingTimer);
    }
    
    // Save final state
    this.saveMetrics();
    
    this.eventListeners.length = 0;
  }
}

// Create and export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();
export default PerformanceMonitoringService;