import { ComponentType } from 'react';
import {
  ModuleId,
  ModuleConfig,
  ModuleRegistry,
  LoadingState,
  LoadingStateInfo,
  ModuleLoadingError,
  ModuleLoadingErrorType,
  ModuleLoadingMetrics,
  NetworkStatus,
  NetworkCondition,
  SystemStatus,
  ModuleLoadingEvent,
  ModuleLoadingEventType,
  LoadingOptions,
  IModuleLoadingManager,
  ModuleLoadingPhase,
  CacheEntry,
  PerformanceThresholds
} from '../types/moduleLoading';
import { checkUserPermissions } from '../utils/permissions';
import { retryManager } from './RetryManager';
import { loadingStateManager } from './LoadingStateManager';

// Import all lazy components
import * as LazyComponents from '../utils/lazyComponents';

class ModuleLoadingManager implements IModuleLoadingManager {
  private moduleRegistry: ModuleRegistry;
  private loadingStates: Map<ModuleId, LoadingStateInfo> = new Map();
  private cache: Map<ModuleId, CacheEntry> = new Map();
  private metrics: ModuleLoadingMetrics[] = [];
  private eventListeners: ((event: ModuleLoadingEvent) => void)[] = [];
  private performanceThresholds: PerformanceThresholds = {
    fast: 500,
    acceptable: 2000,
    slow: 5000,
    timeout: 10000
  };
  private maxCacheSize = 50;
  private cacheTTL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.moduleRegistry = this.initializeModuleRegistry();
    this.startNetworkMonitoring();
    this.startCacheCleanup();
    this.setupRetryEventHandler();
  }

  private initializeModuleRegistry(): ModuleRegistry {
    return {
      dashboard: {
        id: 'dashboard',
        displayName: 'Dashboard',
        description: 'Main dashboard with business overview',
        icon: 'LayoutDashboard',
        route: '/',
        component: LazyComponents.LazyDashboard,
        lazy: true,
        preloadPriority: 'high',
        requiredPermissions: [],
        requiredRoles: [],
        fallbackModules: [],
        maxRetries: 3,
        timeoutMs: 10000,
        cacheEnabled: true,
        preloadOnLogin: true,
        category: 'core',
        supportsMobile: true
      },
      expenses: {
        id: 'expenses',
        displayName: 'Expense Tracking',
        description: 'Track and manage business expenses',
        icon: 'Receipt',
        route: '/expenses',
        component: LazyComponents.LazyExpenseTracking,
        lazy: true,
        preloadPriority: 'medium',
        requiredPermissions: ['expenses:read'],
        requiredRoles: ['admin', 'manager', 'accountant'],
        fallbackModules: ['accounting', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'business',
        supportsMobile: true
      },
      'manager-operations': {
        id: 'manager-operations',
        displayName: 'Manager Operations',
        description: 'Management tools and operations',
        icon: 'Users',
        route: '/manager',
        component: LazyComponents.LazyManagerOperations,
        lazy: true,
        preloadPriority: 'medium',
        requiredPermissions: ['manager:read'],
        requiredRoles: ['admin', 'manager'],
        fallbackModules: ['dashboard', 'settings'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'business',
        supportsMobile: false
      },
      'bir-forms': {
        id: 'bir-forms',
        displayName: 'BIR Forms',
        description: 'Philippine BIR tax forms and compliance',
        icon: 'FileText',
        route: '/bir',
        component: LazyComponents.LazyBIRForms,
        lazy: true,
        preloadPriority: 'low',
        requiredPermissions: ['bir:read'],
        requiredRoles: ['admin', 'accountant'],
        fallbackModules: ['accounting', 'reports', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'business',
        supportsMobile: false
      },
      payroll: {
        id: 'payroll',
        displayName: 'Payroll Management',
        description: 'Employee payroll and benefits management',
        icon: 'Calculator',
        route: '/payroll',
        component: LazyComponents.LazyPayrollManagement,
        lazy: true,
        preloadPriority: 'medium',
        requiredPermissions: ['payroll:read'],
        requiredRoles: ['admin', 'manager', 'accountant'],
        fallbackModules: ['accounting', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'business',
        supportsMobile: false
      },
      'cloud-backup': {
        id: 'cloud-backup',
        displayName: 'Cloud Backup',
        description: 'Data backup and restore operations',
        icon: 'Cloud',
        route: '/settings?tab=backup',
        component: LazyComponents.LazyCloudBackup,
        lazy: true,
        preloadPriority: 'low',
        requiredPermissions: ['backup:read'],
        requiredRoles: ['admin'],
        fallbackModules: ['settings', 'dashboard'],
        maxRetries: 5,
        timeoutMs: 15000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'admin',
        supportsMobile: false
      },
      pos: {
        id: 'pos',
        displayName: 'Point of Sale',
        description: 'Enhanced POS system with barcode scanning',
        icon: 'ShoppingCart',
        route: '/pos',
        component: LazyComponents.LazyEnhancedPOSSystem,
        lazy: true,
        preloadPriority: 'high',
        requiredPermissions: ['sales:read', 'sales:write'],
        requiredRoles: ['admin', 'manager', 'employee'],
        fallbackModules: ['sales', 'inventory', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: true,
        category: 'core',
        supportsMobile: true
      },
      inventory: {
        id: 'inventory',
        displayName: 'Inventory Management',
        description: 'Enhanced inventory management system',
        icon: 'Package',
        route: '/inventory',
        component: LazyComponents.LazyEnhancedInventoryManagement,
        lazy: true,
        preloadPriority: 'high',
        requiredPermissions: ['inventory:read'],
        requiredRoles: ['admin', 'manager', 'employee'],
        fallbackModules: ['dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: true,
        category: 'core',
        supportsMobile: true
      },
      accounting: {
        id: 'accounting',
        displayName: 'Accounting',
        description: 'Enhanced accounting management system',
        icon: 'Calculator',
        route: '/accounting',
        component: LazyComponents.LazyEnhancedAccountingManagement,
        lazy: true,
        preloadPriority: 'medium',
        requiredPermissions: ['accounting:read'],
        requiredRoles: ['admin', 'manager', 'accountant'],
        fallbackModules: ['reports', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'business',
        supportsMobile: true
      },
      purchases: {
        id: 'purchases',
        displayName: 'Purchase Management',
        description: 'Enhanced purchase management system',
        icon: 'ShoppingBag',
        route: '/purchases',
        component: LazyComponents.LazyEnhancedPurchaseManagement,
        lazy: true,
        preloadPriority: 'medium',
        requiredPermissions: ['purchases:read'],
        requiredRoles: ['admin', 'manager', 'employee'],
        fallbackModules: ['inventory', 'accounting', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'business',
        supportsMobile: true
      },
      reports: {
        id: 'reports',
        displayName: 'Reports & Analytics',
        description: 'Enhanced reports and analytics dashboard',
        icon: 'BarChart',
        route: '/reports',
        component: LazyComponents.LazyEnhancedReportsDashboard,
        lazy: true,
        preloadPriority: 'medium',
        requiredPermissions: ['reports:read'],
        requiredRoles: ['admin', 'manager', 'accountant'],
        fallbackModules: ['dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'business',
        supportsMobile: false
      },
      sales: {
        id: 'sales',
        displayName: 'Sales History',
        description: 'Sales transaction history and analytics',
        icon: 'TrendingUp',
        route: '/sales',
        component: LazyComponents.LazySalesHistory,
        lazy: true,
        preloadPriority: 'medium',
        requiredPermissions: ['sales:read'],
        requiredRoles: ['admin', 'manager', 'employee'],
        fallbackModules: ['reports', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'business',
        supportsMobile: true
      },
      customers: {
        id: 'customers',
        displayName: 'Customer Management',
        description: 'Customer relationship management',
        icon: 'Users',
        route: '/customers',
        component: LazyComponents.LazyCustomerManagement,
        lazy: true,
        preloadPriority: 'medium',
        requiredPermissions: ['customers:read'],
        requiredRoles: ['admin', 'manager', 'employee'],
        fallbackModules: ['dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'business',
        supportsMobile: true
      },
      marketing: {
        id: 'marketing',
        displayName: 'Marketing Campaigns',
        description: 'Marketing campaign management',
        icon: 'Megaphone',
        route: '/marketing',
        component: LazyComponents.LazyMarketingCampaigns,
        lazy: true,
        preloadPriority: 'low',
        requiredPermissions: ['marketing:read'],
        requiredRoles: ['admin', 'manager'],
        fallbackModules: ['customers', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'advanced',
        supportsMobile: false
      },
      loyalty: {
        id: 'loyalty',
        displayName: 'Loyalty Programs',
        description: 'Customer loyalty program management',
        icon: 'Gift',
        route: '/loyalty',
        component: LazyComponents.LazyLoyaltyPrograms,
        lazy: true,
        preloadPriority: 'low',
        requiredPermissions: ['loyalty:read'],
        requiredRoles: ['admin', 'manager'],
        fallbackModules: ['customers', 'marketing', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'advanced',
        supportsMobile: false
      },
      gcash: {
        id: 'gcash',
        displayName: 'GCash Integration',
        description: 'GCash payment integration',
        icon: 'CreditCard',
        route: '/payments/gcash',
        component: LazyComponents.LazyGCashIntegration,
        lazy: true,
        preloadPriority: 'low',
        requiredPermissions: ['payments:read'],
        requiredRoles: ['admin', 'manager'],
        fallbackModules: ['pos', 'settings', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'integration',
        supportsMobile: true
      },
      paymaya: {
        id: 'paymaya',
        displayName: 'PayMaya Integration',
        description: 'PayMaya payment integration',
        icon: 'CreditCard',
        route: '/payments/paymaya',
        component: LazyComponents.LazyPayMayaIntegration,
        lazy: true,
        preloadPriority: 'low',
        requiredPermissions: ['payments:read'],
        requiredRoles: ['admin', 'manager'],
        fallbackModules: ['pos', 'settings', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'integration',
        supportsMobile: true
      },
      'electronic-receipts': {
        id: 'electronic-receipts',
        displayName: 'Electronic Receipts',
        description: 'Digital receipt management',
        icon: 'Receipt',
        route: '/receipts',
        component: LazyComponents.LazyElectronicReceipts,
        lazy: true,
        preloadPriority: 'low',
        requiredPermissions: ['receipts:read'],
        requiredRoles: ['admin', 'manager', 'employee'],
        fallbackModules: ['pos', 'sales', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'advanced',
        supportsMobile: true
      },
      'product-history': {
        id: 'product-history',
        displayName: 'Product History',
        description: 'Product transaction history tracking',
        icon: 'History',
        route: '/inventory/history',
        component: LazyComponents.LazyProductHistory,
        lazy: true,
        preloadPriority: 'low',
        requiredPermissions: ['inventory:read'],
        requiredRoles: ['admin', 'manager'],
        fallbackModules: ['inventory', 'reports', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'advanced',
        supportsMobile: false
      },
      branches: {
        id: 'branches',
        displayName: 'Branch Management',
        description: 'Multi-location branch management',
        icon: 'MapPin',
        route: '/branches',
        component: LazyComponents.LazyBranchManagement,
        lazy: true,
        preloadPriority: 'low',
        requiredPermissions: ['branches:read'],
        requiredRoles: ['admin'],
        fallbackModules: ['settings', 'dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'advanced',
        supportsMobile: false
      },
      settings: {
        id: 'settings',
        displayName: 'Settings',
        description: 'Application settings and configuration',
        icon: 'Settings',
        route: '/settings',
        component: LazyComponents.LazySettingsPage,
        lazy: true,
        preloadPriority: 'medium',
        requiredPermissions: [],
        requiredRoles: [],
        fallbackModules: ['dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'core',
        supportsMobile: true
      },
      help: {
        id: 'help',
        displayName: 'Help & Support',
        description: 'Help documentation and support',
        icon: 'HelpCircle',
        route: '/help',
        component: LazyComponents.LazyHelpModule,
        lazy: true,
        preloadPriority: 'low',
        requiredPermissions: [],
        requiredRoles: [],
        fallbackModules: ['dashboard'],
        maxRetries: 3,
        timeoutMs: 8000,
        cacheEnabled: true,
        preloadOnLogin: false,
        category: 'core',
        supportsMobile: true
      }
    };
  }

  async loadModule(moduleId: ModuleId, options: LoadingOptions = {}): Promise<ComponentType<any>> {
    const moduleConfig = this.moduleRegistry[moduleId];
    if (!moduleConfig) {
      throw this.createModuleError(
        ModuleLoadingErrorType.MODULE_NOT_FOUND,
        moduleId,
        `Module ${moduleId} not found in registry`
      );
    }

    // Check permissions
    if (!options.bypassPermissions && !this.checkPermissions(moduleConfig)) {
      throw this.createModuleError(
        ModuleLoadingErrorType.PERMISSION_DENIED,
        moduleId,
        `Insufficient permissions to access ${moduleConfig.displayName}`
      );
    }

    // Check cache first
    if (options.useCache !== false && moduleConfig.cacheEnabled) {
      const cached = this.getCachedModule(moduleId);
      if (cached) {
        // Reset retry state on successful cache hit
        retryManager.resetRetryState(moduleId);
        this.emitEvent('cache_hit', moduleId, { cached: true });
        return cached.component;
      } else {
        this.emitEvent('cache_miss', moduleId, { cached: false });
      }
    }

    // Start loading process with immediate feedback
    const startTime = Date.now();
    
    // Initialize loading state in LoadingStateManager for immediate feedback
    loadingStateManager.updateLoadingState(moduleId, {
      state: 'loading',
      phase: 'initializing',
      progress: 0,
      message: `Loading ${moduleConfig.displayName}...`,
      startTime: new Date(startTime),
      lastUpdate: new Date(startTime),
      canCancel: false,
      canRetry: true,
      fallbacksAvailable: moduleConfig.fallbackModules.length > 0
    });

    const loadingState = loadingStateManager.getLoadingState(moduleId);
    if (loadingState) {
      this.loadingStates.set(moduleId, loadingState);
    }
    
    this.emitEvent('loading_started', moduleId, { startTime });

    try {
      // Update loading phase to importing with LoadingStateManager
      loadingStateManager.updateLoadingState(moduleId, {
        phase: 'importing',
        progress: 25,
        message: 'Downloading module...'
      });

      // Set timeout
      const timeout = options.timeout || moduleConfig.timeoutMs;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(this.createModuleError(
            ModuleLoadingErrorType.TIMEOUT_ERROR,
            moduleId,
            `Module loading timed out after ${timeout}ms`
          ));
        }, timeout);
      });

      // Load the component with timeout
      const loadPromise = this.performModuleLoad(moduleConfig, options);
      const component = await Promise.race([loadPromise, timeoutPromise]);

      // Update loading phase to complete with LoadingStateManager
      loadingStateManager.updateLoadingState(moduleId, {
        phase: 'complete',
        progress: 100,
        state: 'success',
        message: `${moduleConfig.displayName} loaded successfully`
      });

      // Cache the component
      if (moduleConfig.cacheEnabled) {
        this.cacheModule(moduleId, component, startTime);
      }

      // Record metrics
      this.recordLoadingMetrics(moduleId, startTime, Date.now(), true);

      // Check if this was a retry that succeeded
      const retryState = retryManager.getRetryState(moduleId);
      if (retryState && retryState.attempts.length > 0) {
        retryManager.markRetrySuccess(moduleId);
        this.emitEvent('retry_completed', moduleId, {
          success: true,
          attempts: retryState.attempts.length,
          duration: Date.now() - startTime
        });
      } else {
        this.emitEvent('loading_completed', moduleId, {
          duration: Date.now() - startTime,
          cached: false,
          success: true
        });
      }

      // Clear loading state from both managers
      loadingStateManager.clearLoadingState(moduleId);
      this.loadingStates.delete(moduleId);

      return component;

    } catch (error) {
      const moduleError = error instanceof Error && 'type' in error 
        ? error as ModuleLoadingError
        : this.createModuleError(
            ModuleLoadingErrorType.UNKNOWN_ERROR,
            moduleId,
            error instanceof Error ? error.message : 'Unknown error'
          );

      // Check if retry should be attempted
      if (options.retryEnabled !== false && retryManager.shouldRetry(moduleId, moduleError)) {
        // Update loading state to retrying with LoadingStateManager
        loadingStateManager.updateLoadingState(moduleId, {
          state: 'retrying',
          message: `Retrying ${moduleConfig.displayName}...`,
          error: moduleError,
          retryState: retryManager.getRetryState(moduleId)
        });

        // Schedule retry
        retryManager.scheduleRetry(moduleId, moduleError);
        
        this.emitEvent('retry_started', moduleId, {
          error: moduleError,
          retryAttempt: (retryManager.getRetryState(moduleId)?.attempts.length || 0) + 1,
          duration: Date.now() - startTime
        });

        // Don't throw error immediately - retry will be attempted
        return new Promise<ComponentType<any>>((resolve, reject) => {
          // Set up one-time retry listener
          const retryHandler = (event: CustomEvent) => {
            if (event.detail.moduleId === moduleId) {
              window.removeEventListener('module-retry', retryHandler as EventListener);
              // Retry the module load
              this.loadModule(moduleId, options).then(resolve).catch(reject);
            }
          };
          window.addEventListener('module-retry', retryHandler as EventListener);
        });
      }

      // Update loading state to error (no retry) with LoadingStateManager
      loadingStateManager.updateLoadingState(moduleId, {
        state: 'error',
        message: moduleError.message,
        error: moduleError,
        retryState: retryManager.getRetryState(moduleId)
      });

      // Record failed metrics
      this.recordLoadingMetrics(moduleId, startTime, Date.now(), false, moduleError);

      this.emitEvent('loading_failed', moduleId, {
        error: moduleError,
        duration: Date.now() - startTime,
        retryExhausted: retryManager.getRetryState(moduleId)?.exhausted || false
      });

      throw moduleError;
    }
  }

  private async performModuleLoad(
    moduleConfig: ModuleConfig,
    options: LoadingOptions
  ): Promise<ComponentType<any>> {
    // Simulate network-aware loading
    const networkStatus = this.getNetworkStatus();
    
    if (networkStatus.condition === 'offline') {
      throw this.createModuleError(
        ModuleLoadingErrorType.OFFLINE_ERROR,
        moduleConfig.id,
        'Device is offline'
      );
    }

    // Update progress based on network condition
    if (options.progressCallback) {
      const progressSteps = this.getProgressSteps(networkStatus.condition);
      for (let i = 0; i < progressSteps.length; i++) {
        setTimeout(() => options.progressCallback!(progressSteps[i]), i * 200);
      }
    }

    loadingStateManager.updateLoadingState(moduleConfig.id, {
      phase: 'resolving',
      progress: 50,
      message: 'Resolving dependencies...'
    });

    // Perform the actual dynamic import
    try {
      loadingStateManager.updateLoadingState(moduleConfig.id, {
        phase: 'hydrating',
        progress: 75,
        message: 'Initializing component...'
      });

      // Get the component (it's already lazy-loaded)
      const component = moduleConfig.component;
      
      // Validate the component
      if (!component) {
        throw new Error('Component not found or failed to load');
      }

      return component;
    } catch (error) {
      if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
        throw this.createModuleError(
          ModuleLoadingErrorType.CHUNK_LOAD_ERROR,
          moduleConfig.id,
          'Failed to load module chunk. This usually happens after an app update.'
        );
      }
      
      if (error.message.includes('NetworkError') || !navigator.onLine) {
        throw this.createModuleError(
          ModuleLoadingErrorType.NETWORK_ERROR,
          moduleConfig.id,
          'Network error while loading module'
        );
      }

      throw this.createModuleError(
        ModuleLoadingErrorType.COMPONENT_ERROR,
        moduleConfig.id,
        error.message || 'Component initialization failed'
      );
    }
  }

  private getProgressSteps(networkCondition: NetworkCondition): number[] {
    switch (networkCondition) {
      case 'excellent':
        return [25, 50, 75, 100];
      case 'good':
        return [20, 40, 60, 80, 100];
      case 'fair':
        return [15, 30, 45, 60, 75, 90, 100];
      case 'poor':
        return [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      default:
        return [25, 50, 75, 100];
    }
  }

  private checkPermissions(moduleConfig: ModuleConfig): boolean {
    // This would integrate with your actual auth system
    // For now, we'll return true as a placeholder
    try {
      return checkUserPermissions(moduleConfig.requiredPermissions);
    } catch {
      return false;
    }
  }

  private getCachedModule(moduleId: ModuleId): CacheEntry | null {
    const cached = this.cache.get(moduleId);
    if (!cached) return null;

    // Check if cache entry is still valid
    if (cached.expiresAt < new Date()) {
      this.cache.delete(moduleId);
      return null;
    }

    return cached;
  }

  private cacheModule(moduleId: ModuleId, component: ComponentType<any>, loadTime: number): void {
    // Implement LRU cache eviction if needed
    if (this.cache.size >= this.maxCacheSize) {
      const oldestEntry = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp.getTime() - b.timestamp.getTime())[0];
      if (oldestEntry) {
        this.cache.delete(oldestEntry[0]);
      }
    }

    const now = new Date();
    const cacheEntry: CacheEntry = {
      moduleId,
      component,
      timestamp: now,
      expiresAt: new Date(now.getTime() + this.cacheTTL),
      version: '1.0', // This could be dynamically determined
      size: 0, // This could be calculated if needed
      metadata: {
        loadTime: Date.now() - loadTime,
        networkCondition: this.getNetworkStatus().condition,
        userId: 'current-user', // This would come from auth store
        successful: true
      }
    };

    this.cache.set(moduleId, cacheEntry);
  }

  // Note: updateLoadingState method removed - now using LoadingStateManager directly

  private createModuleError(
    type: ModuleLoadingErrorType,
    moduleId: ModuleId,
    message: string,
    originalError?: Error
  ): ModuleLoadingError {
    const moduleConfig = this.moduleRegistry[moduleId];
    return {
      type,
      moduleId,
      message,
      originalError,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: moduleConfig?.maxRetries || 3,
      recoverable: this.isRecoverable(type),
      fallbackSuggestions: moduleConfig?.fallbackModules || [],
      context: {
        networkStatus: this.getNetworkStatus(),
        moduleConfig
      }
    };
  }

  private isRecoverable(errorType: ModuleLoadingErrorType): boolean {
    const recoverableTypes = [
      ModuleLoadingErrorType.NETWORK_ERROR,
      ModuleLoadingErrorType.TIMEOUT_ERROR,
      ModuleLoadingErrorType.CHUNK_LOAD_ERROR,
      ModuleLoadingErrorType.COMPONENT_ERROR
    ];
    return recoverableTypes.includes(errorType);
  }

  private recordLoadingMetrics(
    moduleId: ModuleId,
    startTime: number,
    endTime: number,
    success: boolean,
    error?: ModuleLoadingError
  ): void {
    const duration = endTime - startTime;
    const networkStatus = this.getNetworkStatus();

    const metrics: ModuleLoadingMetrics = {
      moduleId,
      startTime,
      endTime,
      duration,
      loadingPhases: {
        initializing: { startTime: startTime, endTime: startTime + 100, duration: 100 },
        importing: { startTime: startTime + 100, endTime: startTime + (duration * 0.5), duration: (duration * 0.4) },
        resolving: { startTime: startTime + (duration * 0.5), endTime: startTime + (duration * 0.8), duration: (duration * 0.3) },
        hydrating: { startTime: startTime + (duration * 0.8), endTime, duration: (duration * 0.2) },
        complete: { startTime: endTime, duration: 0 }
      },
      retryCount: error?.retryCount || 0,
      cacheHit: false, // This would be determined in the actual loading
      networkCondition: networkStatus.condition,
      deviceType: this.getDeviceType(),
      success,
      error,
      userId: 'current-user', // This would come from auth store
      userRole: 'admin' // This would come from auth store
    };

    this.metrics.push(metrics);
    
    // Keep only recent metrics (last 100 entries)
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  private getNetworkStatus(): NetworkStatus {
    const connection = (navigator as any).connection;
    let condition: NetworkCondition = 'good';

    if (!navigator.onLine) {
      condition = 'offline';
    } else if (connection) {
      const { effectiveType, downlink, rtt } = connection;
      if (effectiveType === '4g' && downlink > 2) {
        condition = 'excellent';
      } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 1)) {
        condition = 'good';
      } else if (effectiveType === '3g' || rtt < 200) {
        condition = 'fair';
      } else {
        condition = 'poor';
      }
    }

    return {
      condition,
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData
    };
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private startNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.emitEvent('network_changed', 'dashboard', { online: true });
    });

    window.addEventListener('offline', () => {
      this.emitEvent('network_changed', 'dashboard', { online: false });
    });
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      const now = new Date();
      for (const [moduleId, entry] of this.cache.entries()) {
        if (entry.expiresAt < now) {
          this.cache.delete(moduleId);
        }
      }
    }, 5 * 60 * 1000);
  }

  private setupRetryEventHandler(): void {
    // Listen for module retry events from the RetryManager
    window.addEventListener('module-retry', ((event: CustomEvent) => {
      const { moduleId } = event.detail;
      console.log(`Received retry event for module: ${moduleId}`);
    }) as EventListener);
  }

  private emitEvent(type: ModuleLoadingEventType, moduleId: ModuleId, data: Record<string, any>): void {
    const event: ModuleLoadingEvent = {
      type,
      moduleId,
      timestamp: new Date(),
      data,
      userId: 'current-user', // This would come from auth store
      sessionId: 'current-session' // This would be generated/tracked
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in module loading event listener:', error);
      }
    });
  }

  // Public interface methods
  async preloadModule(moduleId: ModuleId): Promise<void> {
    try {
      await this.loadModule(moduleId, { priority: 'low', useCache: true });
      this.emitEvent('module_preloaded', moduleId, { success: true });
    } catch (error) {
      this.emitEvent('module_preloaded', moduleId, { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  isModuleLoaded(moduleId: ModuleId): boolean {
    return this.cache.has(moduleId);
  }

  getLoadingState(moduleId: ModuleId): LoadingStateInfo | null {
    // Get state from LoadingStateManager for most up-to-date information
    return loadingStateManager.getLoadingState(moduleId) || this.loadingStates.get(moduleId) || null;
  }

  clearCache(): void {
    this.cache.clear();
    this.emitEvent('cache_hit', 'dashboard', { action: 'cache_cleared' });
  }

  getMetrics(): ModuleLoadingMetrics[] {
    return [...this.metrics];
  }

  getSystemStatus(): SystemStatus {
    const allModules = Object.keys(this.moduleRegistry) as ModuleId[];
    const loadedModules = Array.from(this.cache.keys());
    const failedModules = this.metrics
      .filter(m => !m.success)
      .map(m => m.moduleId)
      .filter((id, index, arr) => arr.indexOf(id) === index);

    return {
      modulesAvailable: allModules,
      modulesFailedToLoad: failedModules,
      systemHealth: this.calculateSystemHealth(allModules.length, failedModules.length),
      lastHealthCheck: new Date(),
      activeUsers: 1, // This would be tracked by your system
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      networkStatus: this.getNetworkStatus()
    };
  }

  private calculateSystemHealth(total: number, failed: number): 'healthy' | 'degraded' | 'critical' {
    const failureRate = failed / total;
    if (failureRate > 0.3) return 'critical';
    if (failureRate > 0.1) return 'degraded';
    return 'healthy';
  }

  subscribeToEvents(callback: (event: ModuleLoadingEvent) => void): () => void {
    this.eventListeners.push(callback);
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  // Additional utility methods
  getModuleConfig(moduleId: ModuleId): ModuleConfig | undefined {
    return this.moduleRegistry[moduleId];
  }

  getAllModules(): ModuleConfig[] {
    return Object.values(this.moduleRegistry);
  }

  getModulesByCategory(category: ModuleConfig['category']): ModuleConfig[] {
    return Object.values(this.moduleRegistry).filter(config => config.category === category);
  }
}

// Create and export singleton instance
export const moduleLoadingManager = new ModuleLoadingManager();
export default ModuleLoadingManager;