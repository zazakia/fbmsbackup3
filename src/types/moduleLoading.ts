// Module Loading System Type Definitions
// Comprehensive type definitions for the enhanced module loading system

import { ComponentType } from 'react';

// ============================================================================
// Core Module Loading Types
// ============================================================================

export type ModuleId = 
  | 'dashboard'
  | 'pos'
  | 'inventory' 
  | 'accounting'
  | 'expenses'
  | 'purchases'
  | 'payroll'
  | 'bir-forms'
  | 'sales'
  | 'customers'
  | 'manager-operations'
  | 'marketing'
  | 'loyalty'
  | 'gcash'
  | 'paymaya'
  | 'cloud-backup'
  | 'electronic-receipts'
  | 'product-history'
  | 'branches'
  | 'settings'
  | 'help'
  | 'reports';

export type LoadingState = 
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'retrying'
  | 'timeout'
  | 'cached';

export type ModuleLoadingPhase = 
  | 'initializing'
  | 'importing'
  | 'resolving'
  | 'hydrating'
  | 'complete';

// ============================================================================
// Error Classification System
// ============================================================================

export enum ModuleLoadingErrorType {
  // Network-related errors
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  OFFLINE_ERROR = 'offline_error',
  
  // Permission-related errors
  PERMISSION_DENIED = 'permission_denied',
  ROLE_INSUFFICIENT = 'role_insufficient',
  
  // Resource-related errors
  MODULE_NOT_FOUND = 'module_not_found',
  CHUNK_LOAD_ERROR = 'chunk_load_error',
  SCRIPT_ERROR = 'script_error',
  
  // Runtime errors
  COMPONENT_ERROR = 'component_error',
  INITIALIZATION_ERROR = 'initialization_error',
  DEPENDENCY_ERROR = 'dependency_error',
  
  // System errors
  MEMORY_ERROR = 'memory_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface ModuleLoadingError {
  type: ModuleLoadingErrorType;
  moduleId: ModuleId;
  message: string;
  originalError?: Error;
  timestamp: Date;
  userId?: string;
  userRole?: string;
  networkStatus?: NetworkStatus;
  retryCount: number;
  maxRetries: number;
  recoverable: boolean;
  fallbackSuggestions?: ModuleId[];
  context?: Record<string, any>;
}

// ============================================================================
// Performance Metrics and Monitoring
// ============================================================================

export interface ModuleLoadingMetrics {
  moduleId: ModuleId;
  startTime: number;
  endTime?: number;
  duration?: number;
  loadingPhases: {
    [key in ModuleLoadingPhase]: {
      startTime: number;
      endTime?: number;
      duration?: number;
    };
  };
  retryCount: number;
  cacheHit: boolean;
  networkCondition: NetworkCondition;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
  bundleSize?: number;
  userId?: string;
  userRole?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  success: boolean;
  error?: ModuleLoadingError;
}

export interface PerformanceThresholds {
  fast: number;        // < 500ms
  acceptable: number;  // < 2000ms
  slow: number;        // < 5000ms
  timeout: number;     // 10000ms
}

// ============================================================================
// Network and System Status
// ============================================================================

export type NetworkCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface NetworkStatus {
  condition: NetworkCondition;
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface SystemStatus {
  modulesAvailable: ModuleId[];
  modulesFailedToLoad: ModuleId[];
  systemHealth: 'healthy' | 'degraded' | 'critical';
  lastHealthCheck: Date;
  activeUsers: number;
  memoryUsage: number;
  networkStatus: NetworkStatus;
}

// ============================================================================
// Module Configuration
// ============================================================================

export interface ModuleConfig {
  id: ModuleId;
  displayName: string;
  description: string;
  icon: string;
  route: string;
  component: ComponentType<any>;
  lazy: boolean;
  preloadPriority: 'high' | 'medium' | 'low';
  requiredPermissions: string[];
  requiredRoles: string[];
  fallbackModules: ModuleId[];
  maxRetries: number;
  timeoutMs: number;
  cacheEnabled: boolean;
  preloadOnLogin: boolean;
  category: 'core' | 'business' | 'advanced' | 'integration' | 'admin';
  dependencies?: ModuleId[];
  estimatedBundleSize?: number;
  supportsMobile: boolean;
}

export interface ModuleRegistry {
  [key: ModuleId]: ModuleConfig;
}

// ============================================================================
// Retry Logic Configuration
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: ModuleLoadingErrorType[];
  cooldownPeriodMs: number;
}

export interface RetryAttempt {
  attemptNumber: number;
  timestamp: Date;
  delayMs: number;
  error?: ModuleLoadingError;
  success: boolean;
  networkCondition: NetworkCondition;
}

export interface RetryState {
  moduleId: ModuleId;
  attempts: RetryAttempt[];
  nextRetryAt?: Date;
  inCooldown: boolean;
  exhausted: boolean;
}

// ============================================================================
// Caching System
// ============================================================================

export interface CacheEntry {
  moduleId: ModuleId;
  component: ComponentType<any>;
  timestamp: Date;
  expiresAt: Date;
  version: string;
  size: number;
  metadata: {
    loadTime: number;
    networkCondition: NetworkCondition;
    userId: string;
    successful: boolean;
  };
}

export interface CacheConfig {
  maxSize: number;
  ttlMs: number;
  maxAge: number;
  enableCompression: boolean;
  enableCaching: boolean;
}

// ============================================================================
// Loading State Management
// ============================================================================

export interface LoadingStateInfo {
  moduleId: ModuleId;
  state: LoadingState;
  phase: ModuleLoadingPhase;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
  startTime: Date;
  lastUpdate: Date;
  error?: ModuleLoadingError;
  retryState?: RetryState;
  canCancel: boolean;
  canRetry: boolean;
  fallbacksAvailable: boolean;
}

export interface UserLoadingPreferences {
  showDetailedProgress: boolean;
  enablePreloading: boolean;
  preferredFallbacks: Record<ModuleId, ModuleId>;
  maxConcurrentLoads: number;
  timeoutPreference: 'fast' | 'standard' | 'patient';
  enableOfflineMode: boolean;
}

// ============================================================================
// Diagnostic and Monitoring
// ============================================================================

export interface ModuleHealthCheck {
  moduleId: ModuleId;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastCheck: Date;
  lastSuccess: Date;
  lastFailure?: Date;
  successRate: number;
  averageLoadTime: number;
  errorCounts: Record<ModuleLoadingErrorType, number>;
  recommendations: string[];
}

export interface LoadingPatternAnalysis {
  userId: string;
  mostUsedModules: ModuleId[];
  loadingSequences: ModuleId[][];
  timeOfDayPatterns: Record<string, ModuleId[]>;
  failurePatterns: {
    moduleId: ModuleId;
    commonErrors: ModuleLoadingErrorType[];
    timeToFailure: number[];
  }[];
  preloadingRecommendations: {
    moduleId: ModuleId;
    priority: number;
    reason: string;
  }[];
}

export interface DiagnosticData {
  timestamp: Date;
  userId: string;
  userRole: string;
  sessionId: string;
  moduleHealthChecks: ModuleHealthCheck[];
  systemStatus: SystemStatus;
  recentErrors: ModuleLoadingError[];
  performanceMetrics: ModuleLoadingMetrics[];
  networkHistory: NetworkStatus[];
  cacheStatistics: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    totalSize: number;
  };
}

// ============================================================================
// Event System
// ============================================================================

export type ModuleLoadingEventType = 
  | 'loading_started'
  | 'loading_progress'
  | 'loading_completed'
  | 'loading_failed'
  | 'retry_started'
  | 'retry_completed'
  | 'cache_hit'
  | 'cache_miss'
  | 'fallback_triggered'
  | 'timeout_reached'
  | 'permission_denied'
  | 'network_changed'
  | 'module_preloaded';

export interface ModuleLoadingEvent {
  type: ModuleLoadingEventType;
  moduleId: ModuleId;
  timestamp: Date;
  data: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

// ============================================================================
// Manager Interfaces
// ============================================================================

export interface IModuleLoadingManager {
  loadModule(moduleId: ModuleId, options?: LoadingOptions): Promise<ComponentType<any>>;
  preloadModule(moduleId: ModuleId): Promise<void>;
  isModuleLoaded(moduleId: ModuleId): boolean;
  getLoadingState(moduleId: ModuleId): LoadingStateInfo | null;
  clearCache(): void;
  getMetrics(): ModuleLoadingMetrics[];
  getSystemStatus(): SystemStatus;
  subscribeToEvents(callback: (event: ModuleLoadingEvent) => void): () => void;
}

export interface IRetryManager {
  shouldRetry(moduleId: ModuleId, error: ModuleLoadingError): boolean;
  scheduleRetry(moduleId: ModuleId, error: ModuleLoadingError): void;
  getRetryState(moduleId: ModuleId): RetryState | null;
  resetRetryState(moduleId: ModuleId): void;
  isInCooldown(moduleId: ModuleId): boolean;
}

export interface ILoadingStateManager {
  updateLoadingState(moduleId: ModuleId, update: Partial<LoadingStateInfo>): void;
  getLoadingState(moduleId: ModuleId): LoadingStateInfo | null;
  getAllLoadingStates(): LoadingStateInfo[];
  clearLoadingState(moduleId: ModuleId): void;
  subscribeToStateChanges(callback: (state: LoadingStateInfo) => void): () => void;
}

// ============================================================================
// Component Props and Options
// ============================================================================

export interface LoadingOptions {
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
  useCache?: boolean;
  bypassPermissions?: boolean;
  fallbackEnabled?: boolean;
  retryEnabled?: boolean;
  progressCallback?: (progress: number) => void;
}

export interface ModuleErrorBoundaryProps {
  moduleId: ModuleId;
  fallbackComponent?: ComponentType<any>;
  onError?: (error: ModuleLoadingError) => void;
  showRetryButton?: boolean;
  showFallbackOptions?: boolean;
  children: React.ReactNode;
}

export interface LoadingIndicatorProps {
  moduleId: ModuleId;
  state: LoadingStateInfo;
  showProgress?: boolean;
  showEstimatedTime?: boolean;
  showCancelButton?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
}

// ============================================================================
// Store State Interfaces
// ============================================================================

export interface ModuleLoadingStoreState {
  loadingStates: Record<ModuleId, LoadingStateInfo>;
  cache: Record<ModuleId, CacheEntry>;
  retryStates: Record<ModuleId, RetryState>;
  metrics: ModuleLoadingMetrics[];
  systemStatus: SystemStatus;
  config: {
    retryConfig: RetryConfig;
    cacheConfig: CacheConfig;
    performanceThresholds: PerformanceThresholds;
  };
  userPreferences: UserLoadingPreferences;
  diagnostics: DiagnosticData[];
}