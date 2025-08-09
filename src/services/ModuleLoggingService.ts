import {
  ModuleId,
  ModuleLoadingError,
  ModuleLoadingMetrics,
  NetworkCondition,
  ModuleLoadingEvent,
  ModuleLoadingEventType,
  DiagnosticData
} from '../types/moduleLoading';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'loading' | 'error' | 'performance' | 'cache' | 'network' | 'user' | 'system';
  moduleId?: ModuleId;
  message: string;
  context: {
    userId?: string;
    userRole?: string;
    sessionId?: string;
    deviceType?: string;
    networkCondition?: NetworkCondition;
    moduleConfig?: any;
    error?: Error;
    metrics?: Partial<ModuleLoadingMetrics>;
    [key: string]: any;
  };
}

interface LoggingAttempt {
  moduleId: ModuleId;
  attemptNumber: number;
  timestamp: Date;
  success: boolean;
  duration?: number;
  error?: ModuleLoadingError;
  networkCondition: NetworkCondition;
  cacheHit: boolean;
  retryReason?: string;
  userId: string;
  userAgent: string;
}

interface AggregatedMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageLoadTime: number;
  averageRetryCount: number;
  mostCommonErrors: Array<{ type: string; count: number; percentage: number }>;
  networkPerformance: Record<NetworkCondition, {
    attempts: number;
    successRate: number;
    avgLoadTime: number;
  }>;
  modulePerformance: Record<ModuleId, {
    attempts: number;
    successRate: number;
    avgLoadTime: number;
    cacheHitRate: number;
  }>;
  timeRangeStart: Date;
  timeRangeEnd: Date;
}

interface LoggingConfig {
  enableConsoleOutput: boolean;
  enablePersistence: boolean;
  maxLogEntries: number;
  maxAttemptHistory: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetricsAggregation: boolean;
  aggregationInterval: number;
  enableDevelopmentMode: boolean;
  enableUserContext: boolean;
  enablePerformanceTracking: boolean;
}

class ModuleLoggingService {
  private config: LoggingConfig;
  private logEntries: LogEntry[] = [];
  private loadingAttempts: LoggingAttempt[] = [];
  private aggregatedMetrics: AggregatedMetrics[] = [];
  private eventListeners: ((event: ModuleLoadingEvent) => void)[] = [];
  private aggregationTimer?: NodeJS.Timeout;
  private persistenceTimer?: NodeJS.Timeout;
  
  // Development mode helpers
  private debugGroups: Map<string, LogEntry[]> = new Map();
  private performanceMarkers: Map<string, number> = new Map();

  constructor(config?: Partial<LoggingConfig>) {
    this.config = {
      enableConsoleOutput: true,
      enablePersistence: true,
      maxLogEntries: 1000,
      maxAttemptHistory: 500,
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      enableMetricsAggregation: true,
      aggregationInterval: 5 * 60 * 1000, // 5 minutes
      enableDevelopmentMode: process.env.NODE_ENV === 'development',
      enableUserContext: true,
      enablePerformanceTracking: true,
      ...config
    };

    this.initializeLogging();
    this.startMetricsAggregation();
    this.startPersistence();
    this.loadHistoricalData();

    // Log service initialization
    this.logInfo('system', undefined, 'Module Logging Service initialized', {
      config: this.config,
      environment: process.env.NODE_ENV
    });
  }

  /**
   * Log detailed error with full context
   */
  logError(
    category: LogEntry['category'],
    moduleId: ModuleId | undefined,
    message: string,
    error: Error | ModuleLoadingError,
    additionalContext?: Record<string, any>
  ): void {
    const context: LogEntry['context'] = {
      error,
      ...this.getSystemContext(),
      ...additionalContext
    };

    // Add module-specific context if available
    if (moduleId) {
      context.moduleId = moduleId;
    }

    // Add error-specific context for ModuleLoadingError
    if ('type' in error) {
      const moduleError = error as ModuleLoadingError;
      context.errorType = moduleError.type;
      context.retryCount = moduleError.retryCount;
      context.maxRetries = moduleError.maxRetries;
      context.recoverable = moduleError.recoverable;
      context.fallbackSuggestions = moduleError.fallbackSuggestions;
    }

    this.createLogEntry('error', category, moduleId, message, context);

    // Development mode: Group related errors
    if (this.config.enableDevelopmentMode) {
      const errorGroup = `${category}-${error.name}`;
      if (!this.debugGroups.has(errorGroup)) {
        this.debugGroups.set(errorGroup, []);
      }
      const group = this.debugGroups.get(errorGroup)!;
      group.push(this.logEntries[this.logEntries.length - 1]);
      
      // Log grouped errors when we have multiple instances
      if (group.length === 3) {
        console.group(`🔄 Repeated ${error.name} (${group.length} times)`);
        console.warn(`Multiple ${error.name} errors detected for ${category}`);
        console.table(group.map(entry => ({
          time: entry.timestamp.toLocaleTimeString(),
          module: entry.moduleId,
          message: entry.message.substring(0, 50) + '...'
        })));
        console.groupEnd();
      }
    }
  }

  /**
   * Track loading attempt with comprehensive details
   */
  logLoadingAttempt(
    moduleId: ModuleId,
    success: boolean,
    duration?: number,
    error?: ModuleLoadingError,
    additionalContext?: {
      attemptNumber?: number;
      cacheHit?: boolean;
      retryReason?: string;
      networkCondition?: NetworkCondition;
    }
  ): void {
    const attempt: LoggingAttempt = {
      moduleId,
      attemptNumber: additionalContext?.attemptNumber || 1,
      timestamp: new Date(),
      success,
      duration,
      error,
      networkCondition: additionalContext?.networkCondition || this.getCurrentNetworkCondition(),
      cacheHit: additionalContext?.cacheHit || false,
      retryReason: additionalContext?.retryReason,
      userId: this.getCurrentUserId(),
      userAgent: navigator.userAgent
    };

    this.loadingAttempts.push(attempt);

    // Trim old attempts
    if (this.loadingAttempts.length > this.config.maxAttemptHistory) {
      this.loadingAttempts = this.loadingAttempts.slice(-this.config.maxAttemptHistory);
    }

    // Log the attempt
    const level = success ? 'info' : 'warn';
    const message = success 
      ? `Module ${moduleId} loaded successfully${duration ? ` in ${duration}ms` : ''}`
      : `Module ${moduleId} failed to load${error ? `: ${error.message}` : ''}`;

    this.createLogEntry(level, 'loading', moduleId, message, {
      attempt,
      cacheHit: attempt.cacheHit,
      networkCondition: attempt.networkCondition,
      duration
    });

    // Development mode: Performance tracking
    if (this.config.enableDevelopmentMode && duration) {
      const performanceCategory = this.categorizePerformance(duration);
      if (performanceCategory !== 'fast') {
        console.log(
          `⏱️ ${performanceCategory.toUpperCase()}: ${moduleId} loaded in ${duration}ms`,
          `(Network: ${attempt.networkCondition}, Cache: ${attempt.cacheHit ? 'HIT' : 'MISS'})`
        );
      }
    }
  }

  /**
   * Aggregate performance metrics over time periods
   */
  aggregatePerformanceMetrics(
    timeRangeStart: Date,
    timeRangeEnd: Date,
    moduleId?: ModuleId
  ): AggregatedMetrics {
    const relevantAttempts = this.loadingAttempts.filter(attempt => {
      const inTimeRange = attempt.timestamp >= timeRangeStart && attempt.timestamp <= timeRangeEnd;
      const moduleMatch = !moduleId || attempt.moduleId === moduleId;
      return inTimeRange && moduleMatch;
    });

    const totalAttempts = relevantAttempts.length;
    const successfulAttempts = relevantAttempts.filter(a => a.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;

    // Calculate averages
    const successfulWithDuration = relevantAttempts.filter(a => a.success && a.duration);
    const averageLoadTime = successfulWithDuration.length > 0
      ? successfulWithDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / successfulWithDuration.length
      : 0;

    const averageRetryCount = relevantAttempts.length > 0
      ? relevantAttempts.reduce((sum, a) => sum + a.attemptNumber, 0) / relevantAttempts.length
      : 0;

    // Most common errors
    const errorCounts: Record<string, number> = {};
    relevantAttempts.forEach(attempt => {
      if (attempt.error) {
        const errorType = attempt.error.type;
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
      }
    });

    const mostCommonErrors = Object.entries(errorCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / failedAttempts) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Network performance analysis
    const networkPerformance: AggregatedMetrics['networkPerformance'] = {} as any;
    const networkConditions: NetworkCondition[] = ['excellent', 'good', 'fair', 'poor', 'offline'];
    
    networkConditions.forEach(condition => {
      const conditionAttempts = relevantAttempts.filter(a => a.networkCondition === condition);
      if (conditionAttempts.length > 0) {
        const successful = conditionAttempts.filter(a => a.success);
        const withDuration = conditionAttempts.filter(a => a.duration);
        
        networkPerformance[condition] = {
          attempts: conditionAttempts.length,
          successRate: (successful.length / conditionAttempts.length) * 100,
          avgLoadTime: withDuration.length > 0
            ? withDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / withDuration.length
            : 0
        };
      }
    });

    // Module-specific performance
    const modulePerformance: AggregatedMetrics['modulePerformance'] = {} as any;
    const moduleIds = [...new Set(relevantAttempts.map(a => a.moduleId))];
    
    moduleIds.forEach(mid => {
      const moduleAttempts = relevantAttempts.filter(a => a.moduleId === mid);
      const successful = moduleAttempts.filter(a => a.success);
      const withDuration = moduleAttempts.filter(a => a.duration);
      const cached = moduleAttempts.filter(a => a.cacheHit);
      
      modulePerformance[mid] = {
        attempts: moduleAttempts.length,
        successRate: (successful.length / moduleAttempts.length) * 100,
        avgLoadTime: withDuration.length > 0
          ? withDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / withDuration.length
          : 0,
        cacheHitRate: (cached.length / moduleAttempts.length) * 100
      };
    });

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      averageLoadTime,
      averageRetryCount,
      mostCommonErrors,
      networkPerformance,
      modulePerformance,
      timeRangeStart,
      timeRangeEnd
    };
  }

  /**
   * Development mode detailed console logging
   */
  logDetailed(
    level: LogEntry['level'],
    category: LogEntry['category'],
    moduleId: ModuleId | undefined,
    message: string,
    context?: Record<string, any>
  ): void {
    if (!this.config.enableDevelopmentMode) {
      return this.createLogEntry(level, category, moduleId, message, context);
    }

    // Enhanced console output for development
    const timestamp = new Date().toLocaleTimeString();
    const modulePrefix = moduleId ? `[${moduleId}]` : '[SYSTEM]';
    const categoryPrefix = `[${category.toUpperCase()}]`;
    
    const style = this.getConsoleStyle(level, category);
    
    console.group(`%c${timestamp} ${categoryPrefix} ${modulePrefix}`, style);
    console.log(message);
    
    if (context) {
      // Pretty print context with collapsible sections
      if (context.metrics) {
        console.group('📊 Performance Metrics');
        console.table(context.metrics);
        console.groupEnd();
      }
      
      if (context.error) {
        console.group('❌ Error Details');
        console.error(context.error);
        if (context.errorType) {
          console.log(`Error Type: ${context.errorType}`);
        }
        if (context.retryCount !== undefined) {
          console.log(`Retry Count: ${context.retryCount}/${context.maxRetries}`);
        }
        console.groupEnd();
      }
      
      if (context.networkCondition) {
        console.log(`🌐 Network: ${context.networkCondition}`);
      }
      
      // Show other context data
      const otherContext = { ...context };
      delete otherContext.metrics;
      delete otherContext.error;
      delete otherContext.errorType;
      delete otherContext.retryCount;
      delete otherContext.maxRetries;
      delete otherContext.networkCondition;
      
      if (Object.keys(otherContext).length > 0) {
        console.group('🔍 Additional Context');
        console.log(otherContext);
        console.groupEnd();
      }
    }
    
    console.groupEnd();

    // Also create standard log entry
    this.createLogEntry(level, category, moduleId, message, context);
  }

  /**
   * Get loading success/failure metrics
   */
  getLoadingMetrics(timeRangeMs?: number): {
    summary: {
      totalAttempts: number;
      successRate: number;
      averageLoadTime: number;
      cacheHitRate: number;
    };
    byModule: Record<ModuleId, {
      attempts: number;
      successRate: number;
      avgLoadTime: number;
      lastAttempt: Date;
    }>;
    byNetworkCondition: Record<NetworkCondition, {
      attempts: number;
      successRate: number;
    }>;
    recentErrors: Array<{
      timestamp: Date;
      moduleId: ModuleId;
      error: string;
      retryCount: number;
    }>;
  } {
    const cutoff = timeRangeMs 
      ? new Date(Date.now() - timeRangeMs)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours

    const relevantAttempts = this.loadingAttempts.filter(a => a.timestamp >= cutoff);
    
    // Summary metrics
    const totalAttempts = relevantAttempts.length;
    const successful = relevantAttempts.filter(a => a.success);
    const cached = relevantAttempts.filter(a => a.cacheHit);
    const withDuration = relevantAttempts.filter(a => a.success && a.duration);
    
    const summary = {
      totalAttempts,
      successRate: totalAttempts > 0 ? (successful.length / totalAttempts) * 100 : 0,
      averageLoadTime: withDuration.length > 0
        ? withDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / withDuration.length
        : 0,
      cacheHitRate: totalAttempts > 0 ? (cached.length / totalAttempts) * 100 : 0
    };

    // By module
    const byModule: Record<ModuleId, any> = {} as any;
    const moduleIds = [...new Set(relevantAttempts.map(a => a.moduleId))];
    
    moduleIds.forEach(moduleId => {
      const moduleAttempts = relevantAttempts.filter(a => a.moduleId === moduleId);
      const moduleSuccessful = moduleAttempts.filter(a => a.success);
      const moduleWithDuration = moduleAttempts.filter(a => a.success && a.duration);
      
      byModule[moduleId] = {
        attempts: moduleAttempts.length,
        successRate: (moduleSuccessful.length / moduleAttempts.length) * 100,
        avgLoadTime: moduleWithDuration.length > 0
          ? moduleWithDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / moduleWithDuration.length
          : 0,
        lastAttempt: Math.max(...moduleAttempts.map(a => a.timestamp.getTime()))
      };
    });

    // By network condition
    const byNetworkCondition: Record<NetworkCondition, any> = {} as any;
    const networkConditions: NetworkCondition[] = ['excellent', 'good', 'fair', 'poor', 'offline'];
    
    networkConditions.forEach(condition => {
      const conditionAttempts = relevantAttempts.filter(a => a.networkCondition === condition);
      if (conditionAttempts.length > 0) {
        const conditionSuccessful = conditionAttempts.filter(a => a.success);
        byNetworkCondition[condition] = {
          attempts: conditionAttempts.length,
          successRate: (conditionSuccessful.length / conditionAttempts.length) * 100
        };
      }
    });

    // Recent errors
    const recentErrors = relevantAttempts
      .filter(a => !a.success && a.error)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
      .map(a => ({
        timestamp: a.timestamp,
        moduleId: a.moduleId,
        error: a.error!.message,
        retryCount: a.attemptNumber
      }));

    return {
      summary,
      byModule,
      byNetworkCondition,
      recentErrors
    };
  }

  /**
   * Export comprehensive diagnostic data
   */
  exportDiagnosticData(): DiagnosticData {
    const now = new Date();
    const userId = this.getCurrentUserId();
    const userRole = this.getCurrentUserRole();
    const sessionId = this.getCurrentSessionId();

    return {
      timestamp: now,
      userId,
      userRole,
      sessionId,
      moduleHealthChecks: [], // Would be populated by health monitoring
      systemStatus: {
        modulesAvailable: [] as ModuleId[],
        modulesFailedToLoad: [] as ModuleId[],
        systemHealth: 'healthy',
        lastHealthCheck: now,
        activeUsers: 1,
        memoryUsage: this.getMemoryUsage(),
        networkStatus: {
          condition: this.getCurrentNetworkCondition(),
          online: navigator.onLine,
          effectiveType: (navigator as any).connection?.effectiveType,
          downlink: (navigator as any).connection?.downlink,
          rtt: (navigator as any).connection?.rtt
        }
      },
      recentErrors: this.loadingAttempts
        .filter(a => !a.success && a.error)
        .slice(-20)
        .map(a => a.error!),
      performanceMetrics: [], // Would be populated by performance monitoring
      networkHistory: [],
      cacheStatistics: {
        hitRate: 0,
        missRate: 0,
        evictionRate: 0,
        totalSize: 0
      }
    };
  }

  /**
   * Get recent log entries with filtering
   */
  getRecentLogs(
    limit: number = 100,
    level?: LogEntry['level'],
    category?: LogEntry['category'],
    moduleId?: ModuleId
  ): LogEntry[] {
    let filtered = this.logEntries;

    if (level) {
      const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
      const minPriority = levelPriority[level];
      filtered = filtered.filter(entry => levelPriority[entry.level] >= minPriority);
    }

    if (category) {
      filtered = filtered.filter(entry => entry.category === category);
    }

    if (moduleId) {
      filtered = filtered.filter(entry => entry.moduleId === moduleId);
    }

    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear all logs and reset state
   */
  clearLogs(): void {
    this.logEntries.length = 0;
    this.loadingAttempts.length = 0;
    this.aggregatedMetrics.length = 0;
    this.debugGroups.clear();
    this.performanceMarkers.clear();

    this.clearPersistentStorage();

    this.logInfo('system', undefined, 'All logs cleared', {
      timestamp: new Date(),
      action: 'clear_logs'
    });
  }

  // Convenience methods
  logDebug = (category: LogEntry['category'], moduleId: ModuleId | undefined, message: string, context?: Record<string, any>) => {
    if (this.shouldLog('debug')) {
      this.logDetailed('debug', category, moduleId, message, context);
    }
  };

  logInfo = (category: LogEntry['category'], moduleId: ModuleId | undefined, message: string, context?: Record<string, any>) => {
    if (this.shouldLog('info')) {
      this.createLogEntry('info', category, moduleId, message, context);
    }
  };

  logWarn = (category: LogEntry['category'], moduleId: ModuleId | undefined, message: string, context?: Record<string, any>) => {
    if (this.shouldLog('warn')) {
      this.createLogEntry('warn', category, moduleId, message, context);
    }
  };

  // Private helper methods
  private createLogEntry(
    level: LogEntry['level'],
    category: LogEntry['category'],
    moduleId: ModuleId | undefined,
    message: string,
    context: LogEntry['context'] = {}
  ): void {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      category,
      moduleId,
      message,
      context: {
        ...this.getSystemContext(),
        ...context
      }
    };

    this.logEntries.push(entry);

    // Trim old entries
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
    }

    // Console output if enabled
    if (this.config.enableConsoleOutput && this.shouldLog(level)) {
      this.outputToConsole(entry);
    }

    // Emit event
    this.emitLogEvent(entry);
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const entryLevel = levels[level];
    return entryLevel >= configLevel;
  }

  private outputToConsole(entry: LogEntry): void {
    const { timestamp, level, category, moduleId, message, context } = entry;
    const timeStr = timestamp.toLocaleTimeString();
    const moduleStr = moduleId ? `[${moduleId}]` : '';
    const categoryStr = `[${category.toUpperCase()}]`;
    
    const consoleMessage = `${timeStr} ${categoryStr} ${moduleStr} ${message}`;

    switch (level) {
      case 'debug':
        console.debug(consoleMessage, context);
        break;
      case 'info':
        console.info(consoleMessage, context);
        break;
      case 'warn':
        console.warn(consoleMessage, context);
        break;
      case 'error':
        console.error(consoleMessage, context);
        break;
    }
  }

  private getConsoleStyle(level: LogEntry['level'], category: LogEntry['category']): string {
    const baseStyle = 'font-weight: bold; padding: 2px 4px; border-radius: 3px;';
    
    const levelColors = {
      debug: 'background: #e3f2fd; color: #1976d2;',
      info: 'background: #e8f5e8; color: #2e7d32;',
      warn: 'background: #fff3e0; color: #f57c00;',
      error: 'background: #ffebee; color: #d32f2f;'
    };

    return baseStyle + levelColors[level];
  }

  private categorizePerformance(duration: number): 'fast' | 'acceptable' | 'slow' | 'critical' {
    if (duration < 500) return 'fast';
    if (duration < 2000) return 'acceptable';
    if (duration < 5000) return 'slow';
    return 'critical';
  }

  private getSystemContext(): Record<string, any> {
    const context: Record<string, any> = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    if (this.config.enableUserContext) {
      context.userId = this.getCurrentUserId();
      context.userRole = this.getCurrentUserRole();
      context.sessionId = this.getCurrentSessionId();
      context.deviceType = this.getDeviceType();
    }

    if (this.config.enablePerformanceTracking) {
      context.memoryUsage = this.getMemoryUsage();
      context.networkCondition = this.getCurrentNetworkCondition();
    }

    return context;
  }

  private getCurrentUserId(): string {
    // This would integrate with auth store
    return 'current-user';
  }

  private getCurrentUserRole(): string {
    // This would integrate with auth store
    return 'admin';
  }

  private getCurrentSessionId(): string {
    // This would be generated/tracked
    return 'current-session';
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|android/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private getMemoryUsage(): number {
    try {
      return (performance as any).memory?.usedJSHeapSize || 0;
    } catch {
      return 0;
    }
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

  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeLogging(): void {
    // Set up global error handlers for development
    if (this.config.enableDevelopmentMode) {
      window.addEventListener('error', (event) => {
        this.logError('system', undefined, 'Global error caught', event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.logError('system', undefined, 'Unhandled promise rejection', event.reason, {
          promise: event.promise
        });
      });
    }
  }

  private startMetricsAggregation(): void {
    if (!this.config.enableMetricsAggregation) return;

    this.aggregationTimer = setInterval(() => {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - this.config.aggregationInterval);
      
      const metrics = this.aggregatePerformanceMetrics(startTime, endTime);
      this.aggregatedMetrics.push(metrics);

      // Keep only recent aggregations (last 24 hours)
      const maxAggregations = (24 * 60 * 60 * 1000) / this.config.aggregationInterval;
      if (this.aggregatedMetrics.length > maxAggregations) {
        this.aggregatedMetrics = this.aggregatedMetrics.slice(-maxAggregations);
      }

      this.logDebug('system', undefined, 'Metrics aggregated', {
        timeRange: { startTime, endTime },
        totalAttempts: metrics.totalAttempts,
        successRate: (metrics.successfulAttempts / metrics.totalAttempts) * 100
      });
    }, this.config.aggregationInterval);
  }

  private startPersistence(): void {
    if (!this.config.enablePersistence) return;

    // Save logs every minute
    this.persistenceTimer = setInterval(() => {
      this.saveToPersistentStorage();
    }, 60 * 1000);

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveToPersistentStorage();
    });
  }

  private loadHistoricalData(): void {
    if (!this.config.enablePersistence) return;

    try {
      const stored = localStorage.getItem('moduleLoggingData');
      if (stored) {
        const data = JSON.parse(stored);
        
        // Restore recent logs (last 100)
        if (data.logEntries) {
          this.logEntries = data.logEntries.slice(-100).map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }));
        }

        // Restore recent attempts (last 200)
        if (data.loadingAttempts) {
          this.loadingAttempts = data.loadingAttempts.slice(-200).map((attempt: any) => ({
            ...attempt,
            timestamp: new Date(attempt.timestamp)
          }));
        }

        this.logInfo('system', undefined, 'Historical logging data restored', {
          logEntries: this.logEntries.length,
          loadingAttempts: this.loadingAttempts.length
        });
      }
    } catch (error) {
      console.warn('Failed to load historical logging data:', error);
    }
  }

  private saveToPersistentStorage(): void {
    if (!this.config.enablePersistence) return;

    try {
      const data = {
        logEntries: this.logEntries.slice(-100), // Keep last 100 entries
        loadingAttempts: this.loadingAttempts.slice(-200), // Keep last 200 attempts
        aggregatedMetrics: this.aggregatedMetrics.slice(-50), // Keep last 50 aggregations
        timestamp: Date.now()
      };

      localStorage.setItem('moduleLoggingData', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save logging data to persistent storage:', error);
    }
  }

  private clearPersistentStorage(): void {
    try {
      localStorage.removeItem('moduleLoggingData');
    } catch (error) {
      console.warn('Failed to clear persistent logging storage:', error);
    }
  }

  private emitLogEvent(entry: LogEntry): void {
    const event: ModuleLoadingEvent = {
      type: 'loading_progress', // Generic event type for logs
      moduleId: entry.moduleId || 'dashboard',
      timestamp: entry.timestamp,
      data: {
        logEntry: entry,
        level: entry.level,
        category: entry.category
      },
      userId: entry.context.userId,
      sessionId: entry.context.sessionId
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in logging event listener:', error);
      }
    });
  }

  /**
   * Subscribe to logging events
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
   * Cleanup and stop logging
   */
  destroy(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }

    // Final save
    this.saveToPersistentStorage();

    this.eventListeners.length = 0;
    
    this.logInfo('system', undefined, 'Module Logging Service destroyed');
  }
}

// Create and export singleton instance
export const moduleLoggingService = new ModuleLoggingService();
export default ModuleLoggingService;