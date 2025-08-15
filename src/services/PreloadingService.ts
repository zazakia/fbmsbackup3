import {
  ModuleId,
  NetworkCondition,
  LoadingPatternAnalysis,
  ModuleConfig,
  ModuleLoadingEvent,
  ModuleLoadingEventType
} from '../types/moduleLoading';

interface UserUsagePattern {
  userId: string;
  userRole: string;
  sessionCount: number;
  mostUsedModules: { moduleId: ModuleId; count: number; avgLoadTime: number }[];
  loadingSequences: { sequence: ModuleId[]; frequency: number; lastUsed: Date }[];
  timeOfDayPatterns: { hour: number; modules: ModuleId[]; frequency: number }[];
  devicePreferences: { deviceType: string; preferredModules: ModuleId[] }[];
  lastAnalyzed: Date;
}

interface PreloadingTask {
  id: string;
  moduleId: ModuleId;
  priority: number;
  reason: string;
  userId: string;
  userRole: string;
  estimatedLoadTime: number;
  networkCondition: NetworkCondition;
  scheduledAt: Date;
  executedAt?: Date;
  success?: boolean;
  error?: string;
}

interface PreloadingConfig {
  maxConcurrentPreloads: number;
  minNetworkQuality: NetworkCondition;
  backgroundPreloadDelay: number;
  analysisInterval: number;
  maxPatternAge: number;
  enableNetworkAdaptive: boolean;
  enableUsageAnalytics: boolean;
}

class PreloadingService {
  private config: PreloadingConfig;
  private userPatterns: Map<string, UserUsagePattern> = new Map();
  private preloadingQueue: Map<string, PreloadingTask> = new Map();
  private activePreloads: Set<string> = new Set();
  private eventListeners: ((event: ModuleLoadingEvent) => void)[] = [];
  private analysisTimer?: NodeJS.Timeout;
  private preloadingTimer?: NodeJS.Timeout;
  
  // Analytics
  private moduleLoadHistory: Array<{
    userId: string;
    moduleId: ModuleId;
    timestamp: Date;
    loadTime: number;
    networkCondition: NetworkCondition;
    deviceType: string;
    success: boolean;
  }> = [];

  constructor(config?: Partial<PreloadingConfig>) {
    this.config = {
      maxConcurrentPreloads: 2,
      minNetworkQuality: 'fair',
      backgroundPreloadDelay: 2000, // 2 seconds after app load
      analysisInterval: 5 * 60 * 1000, // 5 minutes
      maxPatternAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableNetworkAdaptive: true,
      enableUsageAnalytics: true,
      ...config
    };

    this.initializeAnalytics();
    this.startPatternAnalysis();
    this.startPreloadingEngine();
  }

  /**
   * Analyze user patterns and create preloading recommendations
   */
  analyzeUserPatterns(userId: string, userRole: string): LoadingPatternAnalysis {
    const pattern = this.userPatterns.get(userId);
    const recentHistory = this.getRecentUserHistory(userId);
    
    if (!pattern || recentHistory.length === 0) {
      // Return role-based defaults for new users
      return this.generateRoleBasedRecommendations(userId, userRole);
    }

    // Analyze most used modules
    const mostUsedModules = this.analyzeMostUsedModules(recentHistory);
    
    // Analyze loading sequences
    const loadingSequences = this.analyzeLoadingSequences(recentHistory);
    
    // Analyze time-of-day patterns
    const timeOfDayPatterns = this.analyzeTimeOfDayPatterns(recentHistory);
    
    // Analyze failure patterns
    const failurePatterns = this.analyzeFailurePatterns(recentHistory);
    
    // Generate preloading recommendations
    const preloadingRecommendations = this.generatePreloadingRecommendations(
      mostUsedModules,
      loadingSequences,
      timeOfDayPatterns,
      userRole
    );

    const analysis: LoadingPatternAnalysis = {
      userId,
      mostUsedModules,
      loadingSequences,
      timeOfDayPatterns: this.groupTimeOfDayPatterns(timeOfDayPatterns),
      failurePatterns,
      preloadingRecommendations
    };

    // Update user pattern
    if (pattern) {
      pattern.lastAnalyzed = new Date();
    }

    return analysis;
  }

  /**
   * Preload modules based on role during application startup
   */
  async preloadForRole(userRole: string, userId: string): Promise<void> {
    const roleModules = this.getRoleBasedModules(userRole);
    const networkCondition = this.getCurrentNetworkCondition();
    
    if (!this.shouldPreload(networkCondition)) {
      console.debug('Preloading skipped due to network conditions:', networkCondition);
      return;
    }

    // Schedule preloading tasks
    for (const moduleId of roleModules) {
      await this.schedulePreload(
        moduleId,
        userId,
        userRole,
        'role-based',
        this.getRolePriority(moduleId, userRole)
      );
    }

    this.emitEvent('module_preloaded', 'dashboard', {
      action: 'role_preload_scheduled',
      userRole,
      modulesCount: roleModules.length
    });
  }

  /**
   * Smart preloading based on user patterns
   */
  async smartPreload(userId: string, userRole: string): Promise<void> {
    const analysis = this.analyzeUserPatterns(userId, userRole);
    const networkCondition = this.getCurrentNetworkCondition();

    if (!this.shouldPreload(networkCondition)) {
      return;
    }

    // Preload high-priority recommendations
    for (const recommendation of analysis.preloadingRecommendations.slice(0, 5)) {
      await this.schedulePreload(
        recommendation.moduleId,
        userId,
        userRole,
        recommendation.reason,
        recommendation.priority
      );
    }

    this.emitEvent('module_preloaded', 'dashboard', {
      action: 'smart_preload_scheduled',
      userId,
      recommendationsCount: analysis.preloadingRecommendations.length
    });
  }

  /**
   * Preload high-priority modules in background
   */
  async preloadHighPriorityModules(
    userId: string,
    userRole: string,
    modules: ModuleId[]
  ): Promise<void> {
    const networkCondition = this.getCurrentNetworkCondition();
    
    for (const moduleId of modules) {
      await this.schedulePreload(
        moduleId,
        userId,
        userRole,
        'high-priority',
        100
      );
    }

    this.emitEvent('module_preloaded', 'dashboard', {
      action: 'high_priority_preload',
      modulesCount: modules.length,
      networkCondition
    });
  }

  /**
   * Network-aware preloading that adapts to connection speed
   */
  async adaptToNetworkConditions(): Promise<void> {
    const networkCondition = this.getCurrentNetworkCondition();
    const activeTasksCount = this.activePreloads.size;

    if (networkCondition === 'offline' || networkCondition === 'poor') {
      // Pause all preloading
      this.pausePreloading();
      return;
    }

    // Adjust concurrency based on network conditions
    let maxConcurrent = this.config.maxConcurrentPreloads;
    if (networkCondition === 'excellent') {
      maxConcurrent = 3;
    } else if (networkCondition === 'good') {
      maxConcurrent = 2;
    } else if (networkCondition === 'fair') {
      maxConcurrent = 1;
    }

    // Update preloading strategy
    if (activeTasksCount > maxConcurrent) {
      this.throttlePreloading(maxConcurrent);
    } else if (activeTasksCount < maxConcurrent && this.preloadingQueue.size > 0) {
      this.resumePreloading();
    }

    this.emitEvent('network_changed', 'dashboard', {
      networkCondition,
      maxConcurrent,
      activePreloads: activeTasksCount,
      queueSize: this.preloadingQueue.size
    });
  }

  /**
   * Record module load for pattern analysis
   */
  recordModuleLoad(
    userId: string,
    moduleId: ModuleId,
    loadTime: number,
    networkCondition: NetworkCondition,
    deviceType: string,
    success: boolean
  ): void {
    if (!this.config.enableUsageAnalytics) {
      return;
    }

    // Add to load history
    this.moduleLoadHistory.push({
      userId,
      moduleId,
      timestamp: new Date(),
      loadTime,
      networkCondition,
      deviceType,
      success
    });

    // Keep only recent history (last 1000 entries)
    if (this.moduleLoadHistory.length > 1000) {
      this.moduleLoadHistory = this.moduleLoadHistory.slice(-1000);
    }

    // Update user patterns
    this.updateUserPattern(userId, moduleId, loadTime, networkCondition, deviceType, success);
  }

  /**
   * Get preloading statistics and performance metrics
   */
  getPreloadingStatistics(): {
    totalPreloads: number;
    successfulPreloads: number;
    failedPreloads: number;
    averagePreloadTime: number;
    networkConditionStats: Record<NetworkCondition, number>;
    queueSize: number;
    activePreloads: number;
  } {
    const completedTasks = Array.from(this.preloadingQueue.values())
      .filter(task => task.executedAt);

    const successful = completedTasks.filter(task => task.success).length;
    const failed = completedTasks.length - successful;

    const averagePreloadTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => sum + task.estimatedLoadTime, 0) / completedTasks.length
      : 0;

    const networkConditionStats: Record<NetworkCondition, number> = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      offline: 0
    };

    completedTasks.forEach(task => {
      networkConditionStats[task.networkCondition]++;
    });

    return {
      totalPreloads: completedTasks.length,
      successfulPreloads: successful,
      failedPreloads: failed,
      averagePreloadTime,
      networkConditionStats,
      queueSize: this.preloadingQueue.size,
      activePreloads: this.activePreloads.size
    };
  }

  /**
   * Export diagnostic data for analysis
   */
  exportDiagnosticData(): {
    statistics: ReturnType<typeof this.getPreloadingStatistics>;
    userPatterns: Array<UserUsagePattern>;
    recentHistory: typeof this.moduleLoadHistory;
    activeQueue: Array<PreloadingTask>;
  } {
    return {
      statistics: this.getPreloadingStatistics(),
      userPatterns: Array.from(this.userPatterns.values()),
      recentHistory: [...this.moduleLoadHistory],
      activeQueue: Array.from(this.preloadingQueue.values())
    };
  }

  // Private helper methods
  private async schedulePreload(
    moduleId: ModuleId,
    userId: string,
    userRole: string,
    reason: string,
    priority: number
  ): Promise<void> {
    const taskId = `${userId}-${moduleId}-${Date.now()}`;
    const networkCondition = this.getCurrentNetworkCondition();

    const task: PreloadingTask = {
      id: taskId,
      moduleId,
      priority,
      reason,
      userId,
      userRole,
      estimatedLoadTime: this.estimateLoadTime(moduleId, networkCondition),
      networkCondition,
      scheduledAt: new Date()
    };

    this.preloadingQueue.set(taskId, task);
  }

  private shouldPreload(networkCondition: NetworkCondition): boolean {
    if (!this.config.enableNetworkAdaptive) {
      return true;
    }

    const qualityOrder: NetworkCondition[] = ['excellent', 'good', 'fair', 'poor', 'offline'];
    const minIndex = qualityOrder.indexOf(this.config.minNetworkQuality);
    const currentIndex = qualityOrder.indexOf(networkCondition);

    return currentIndex <= minIndex;
  }

  private getRoleBasedModules(userRole: string): ModuleId[] {
    const roleModules: Record<string, ModuleId[]> = {
      admin: ['dashboard', 'settings', 'reports', 'branches', 'cloud-backup', 'accounting'],
      manager: ['dashboard', 'reports', 'pos', 'inventory', 'manager-operations', 'accounting'],
      employee: ['dashboard', 'pos', 'inventory', 'sales', 'customers'],
      accountant: ['dashboard', 'accounting', 'bir-forms', 'expenses', 'payroll', 'reports']
    };

    return roleModules[userRole] || ['dashboard'];
  }

  private getRolePriority(moduleId: ModuleId, userRole: string): number {
    const rolePriorityMap: Record<string, Record<ModuleId, number>> = {
      admin: { dashboard: 100, settings: 90, reports: 80 } as any,
      manager: { dashboard: 100, reports: 90, pos: 85 } as any,
      employee: { dashboard: 100, pos: 95, inventory: 80 } as any,
      accountant: { dashboard: 100, accounting: 95, 'bir-forms': 85 } as any
    };

    return rolePriorityMap[userRole]?.[moduleId] || 50;
  }

  private getRecentUserHistory(userId: string) {
    const cutoffDate = new Date(Date.now() - this.config.maxPatternAge);
    return this.moduleLoadHistory.filter(
      entry => entry.userId === userId && entry.timestamp >= cutoffDate
    );
  }

  private analyzeMostUsedModules(history: typeof this.moduleLoadHistory): ModuleId[] {
    const moduleCount: Record<ModuleId, number> = {} as any;
    
    history.forEach(entry => {
      if (entry.success) {
        moduleCount[entry.moduleId] = (moduleCount[entry.moduleId] || 0) + 1;
      }
    });

    return Object.entries(moduleCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([moduleId]) => moduleId as ModuleId);
  }

  private analyzeLoadingSequences(history: typeof this.moduleLoadHistory): ModuleId[][] {
    const sequences: ModuleId[][] = [];
    
    // Group by session (simplified - within 30 minutes)
    const sessions = this.groupBySession(history, 30 * 60 * 1000);
    
    sessions.forEach(session => {
      if (session.length > 1) {
        const sequence = session.map(entry => entry.moduleId);
        sequences.push(sequence);
      }
    });

    return sequences;
  }

  private analyzeTimeOfDayPatterns(history: typeof this.moduleLoadHistory): Record<string, ModuleId[]> {
    const patterns: Record<string, Record<ModuleId, number>> = {};
    
    history.forEach(entry => {
      if (entry.success) {
        const hour = entry.timestamp.getHours();
        const timeSlot = this.getTimeSlot(hour);
        
        if (!patterns[timeSlot]) {
          patterns[timeSlot] = {} as any;
        }
        
        patterns[timeSlot][entry.moduleId] = (patterns[timeSlot][entry.moduleId] || 0) + 1;
      }
    });

    const result: Record<string, ModuleId[]> = {};
    Object.entries(patterns).forEach(([timeSlot, modules]) => {
      result[timeSlot] = Object.entries(modules)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([moduleId]) => moduleId as ModuleId);
    });

    return result;
  }

  private analyzeFailurePatterns(history: typeof this.moduleLoadHistory) {
    return history
      .filter(entry => !entry.success)
      .reduce((acc, entry) => {
        const existing = acc.find(item => item.moduleId === entry.moduleId);
        if (existing) {
          existing.timeToFailure.push(entry.loadTime);
        } else {
          acc.push({
            moduleId: entry.moduleId,
            commonErrors: [], // Would need error types from history
            timeToFailure: [entry.loadTime]
          });
        }
        return acc;
      }, [] as LoadingPatternAnalysis['failurePatterns']);
  }

  private generatePreloadingRecommendations(
    mostUsed: ModuleId[],
    sequences: ModuleId[][],
    timePatterns: Record<string, ModuleId[]>,
    userRole: string
  ) {
    const recommendations: LoadingPatternAnalysis['preloadingRecommendations'] = [];
    
    // High priority for most used modules
    mostUsed.slice(0, 3).forEach((moduleId, index) => {
      recommendations.push({
        moduleId,
        priority: 90 - (index * 10),
        reason: `Frequently used module (rank ${index + 1})`
      });
    });

    // Medium priority for sequence predictions
    sequences.forEach(sequence => {
      if (sequence.length >= 2) {
        const nextModule = sequence[1];
        if (!recommendations.find(r => r.moduleId === nextModule)) {
          recommendations.push({
            moduleId: nextModule,
            priority: 60,
            reason: 'Commonly follows current module in user patterns'
          });
        }
      }
    });

    // Role-based recommendations
    const roleModules = this.getRoleBasedModules(userRole);
    roleModules.forEach(moduleId => {
      if (!recommendations.find(r => r.moduleId === moduleId)) {
        recommendations.push({
          moduleId,
          priority: this.getRolePriority(moduleId, userRole),
          reason: `Role-based recommendation for ${userRole}`
        });
      }
    });

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private generateRoleBasedRecommendations(userId: string, userRole: string): LoadingPatternAnalysis {
    const roleModules = this.getRoleBasedModules(userRole);
    
    return {
      userId,
      mostUsedModules: roleModules,
      loadingSequences: [roleModules.slice(0, 3)],
      timeOfDayPatterns: {
        'morning': roleModules.slice(0, 2),
        'afternoon': roleModules.slice(1, 3),
        'evening': ['dashboard']
      },
      failurePatterns: [],
      preloadingRecommendations: roleModules.map((moduleId, index) => ({
        moduleId,
        priority: 80 - (index * 10),
        reason: `Default for ${userRole} role`
      }))
    };
  }

  private updateUserPattern(
    userId: string,
    moduleId: ModuleId,
    loadTime: number,
    networkCondition: NetworkCondition,
    deviceType: string,
    success: boolean
  ): void {
    let pattern = this.userPatterns.get(userId);
    
    if (!pattern) {
      pattern = {
        userId,
        userRole: 'employee', // Would get from auth store
        sessionCount: 0,
        mostUsedModules: [],
        loadingSequences: [],
        timeOfDayPatterns: [],
        devicePreferences: [],
        lastAnalyzed: new Date()
      };
      this.userPatterns.set(userId, pattern);
    }

    // Update most used modules
    const moduleUsage = pattern.mostUsedModules.find(m => m.moduleId === moduleId);
    if (moduleUsage) {
      moduleUsage.count++;
      moduleUsage.avgLoadTime = (moduleUsage.avgLoadTime + loadTime) / 2;
    } else {
      pattern.mostUsedModules.push({
        moduleId,
        count: 1,
        avgLoadTime: loadTime
      });
    }

    // Sort and keep top 10
    pattern.mostUsedModules.sort((a, b) => b.count - a.count);
    pattern.mostUsedModules = pattern.mostUsedModules.slice(0, 10);
  }

  private groupBySession(history: typeof this.moduleLoadHistory, sessionGapMs: number) {
    const sessions: typeof history[] = [];
    let currentSession: typeof history = [];
    let lastTimestamp = 0;

    history.forEach(entry => {
      const timestamp = entry.timestamp.getTime();
      
      if (timestamp - lastTimestamp > sessionGapMs && currentSession.length > 0) {
        sessions.push([...currentSession]);
        currentSession = [];
      }
      
      currentSession.push(entry);
      lastTimestamp = timestamp;
    });

    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    return sessions;
  }

  private getTimeSlot(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private groupTimeOfDayPatterns(patterns: Record<string, ModuleId[]>): Record<string, ModuleId[]> {
    return patterns;
  }

  private getCurrentNetworkCondition(): NetworkCondition {
    // This would integrate with network monitoring
    const connection = (navigator as any).connection;
    
    if (!navigator.onLine) return 'offline';
    if (!connection) return 'good';
    
    const { effectiveType, downlink } = connection;
    if (effectiveType === '4g' && downlink > 2) return 'excellent';
    if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 1)) return 'good';
    if (effectiveType === '3g') return 'fair';
    return 'poor';
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

  private pausePreloading(): void {
    // Implementation would pause active preloading tasks
    console.debug('Preloading paused due to network conditions');
  }

  private throttlePreloading(maxConcurrent: number): void {
    // Implementation would reduce concurrent preloading tasks
    console.debug(`Preloading throttled to ${maxConcurrent} concurrent tasks`);
  }

  private resumePreloading(): void {
    // Implementation would resume preloading tasks
    console.debug('Preloading resumed');
  }

  private initializeAnalytics(): void {
    // Load analytics data from storage if available
    try {
      const stored = localStorage.getItem('preloadingAnalytics');
      if (stored) {
        const data = JSON.parse(stored);
        this.moduleLoadHistory = data.history || [];
        // Restore user patterns would go here
      }
    } catch (error) {
      console.warn('Failed to load preloading analytics:', error);
    }
  }

  private startPatternAnalysis(): void {
    if (!this.config.enableUsageAnalytics) return;

    this.analysisTimer = setInterval(() => {
      // Analyze patterns for all active users
      this.userPatterns.forEach((pattern, userId) => {
        this.analyzeUserPatterns(userId, pattern.userRole);
      });

      // Save analytics data
      try {
        const data = {
          history: this.moduleLoadHistory.slice(-500), // Keep last 500 entries
          timestamp: Date.now()
        };
        localStorage.setItem('preloadingAnalytics', JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save preloading analytics:', error);
      }
    }, this.config.analysisInterval);
  }

  private startPreloadingEngine(): void {
    this.preloadingTimer = setInterval(() => {
      this.processPreloadingQueue();
    }, 1000); // Process queue every second
  }

  private async processPreloadingQueue(): Promise<void> {
    if (this.activePreloads.size >= this.config.maxConcurrentPreloads) {
      return;
    }

    const networkCondition = this.getCurrentNetworkCondition();
    if (!this.shouldPreload(networkCondition)) {
      return;
    }

    // Get next highest priority task
    const tasks = Array.from(this.preloadingQueue.values())
      .filter(task => !task.executedAt && !this.activePreloads.has(task.id))
      .sort((a, b) => b.priority - a.priority);

    const nextTask = tasks[0];
    if (!nextTask) return;

    // Execute preloading task
    this.activePreloads.add(nextTask.id);
    
    try {
      nextTask.executedAt = new Date();
      // Actual preloading would happen here via ModuleLoadingManager
      await new Promise(resolve => setTimeout(resolve, nextTask.estimatedLoadTime));
      
      nextTask.success = true;
      console.debug(`Preloaded module ${nextTask.moduleId} successfully`);
      
    } catch (error) {
      nextTask.success = false;
      nextTask.error = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Failed to preload module ${nextTask.moduleId}:`, error);
      
    } finally {
      this.activePreloads.delete(nextTask.id);
    }
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
        console.error('Error in preloading event listener:', error);
      }
    });
  }

  /**
   * Subscribe to preloading events
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
   * Cleanup resources
   */
  destroy(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
    if (this.preloadingTimer) {
      clearInterval(this.preloadingTimer);
    }
    this.eventListeners.length = 0;
  }
}

// Create and export singleton instance
export const preloadingService = new PreloadingService();
export default PreloadingService;