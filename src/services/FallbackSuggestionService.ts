import {
  ModuleId,
  ModuleConfig,
  ModuleLoadingError,
  ModuleLoadingErrorType,
  SystemStatus,
  NetworkCondition
} from '../types/moduleLoading';
import { UserRole } from '../types/auth';
import { canAccessModule } from '../utils/permissions';
import { moduleLoadingManager } from './ModuleLoadingManager';

/**
 * Fallback Suggestion Service
 * 
 * Provides intelligent fallback recommendations for failed modules.
 * Features:
 * - Create intelligent fallback recommendations for failed modules
 * - Map related modules (e.g., ExpenseTracking → Accounting)
 * - Implement system status indicator showing available modules
 * - Create graceful degradation to Dashboard when multiple failures occur
 * - Smart routing based on user permissions and module relationships
 */
export class FallbackSuggestionService {
  private moduleRelationshipMap: Record<ModuleId, Array<{
    moduleId: ModuleId;
    relationship: 'parent' | 'child' | 'sibling' | 'alternative' | 'workflow';
    priority: number;
    reason: string;
  }>> = {};

  private systemStatusCache: SystemStatus | null = null;
  private statusCacheExpiry: Date | null = null;
  private readonly statusCacheTTL = 30000; // 30 seconds

  constructor() {
    this.initializeModuleRelationships();
  }

  /**
   * Gets intelligent fallback recommendations for a failed module
   */
  getFallbackSuggestions(
    moduleId: ModuleId, 
    userRole: UserRole, 
    error: ModuleLoadingError,
    maxSuggestions: number = 3
  ): Array<{
    moduleId: ModuleId;
    displayName: string;
    reason: string;
    priority: number;
    available: boolean;
    route: string;
    relationship: string;
  }> {
    const relationships = this.moduleRelationshipMap[moduleId] || [];
    const suggestions: Array<{
      moduleId: ModuleId;
      displayName: string;
      reason: string;
      priority: number;
      available: boolean;
      route: string;
      relationship: string;
    }> = [];

    // Get system status to check module availability
    const systemStatus = this.getSystemStatus();
    
    // Process each related module
    for (const relation of relationships) {
      // Check if user can access this module
      const canAccess = canAccessModule(userRole, relation.moduleId);
      if (!canAccess) continue;

      // Check if module is currently available
      const isAvailable = this.isModuleAvailable(relation.moduleId, systemStatus);
      
      suggestions.push({
        moduleId: relation.moduleId,
        displayName: this.getModuleDisplayName(relation.moduleId),
        reason: this.getContextualReason(relation, error),
        priority: this.calculatePriority(relation, error, isAvailable),
        available: isAvailable,
        route: this.getModuleRoute(relation.moduleId),
        relationship: relation.relationship
      });
    }

    // Sort by priority and availability, filter by max suggestions
    return suggestions
      .sort((a, b) => {
        // Available modules get priority
        if (a.available !== b.available) {
          return b.available ? 1 : -1;
        }
        // Then sort by priority
        return b.priority - a.priority;
      })
      .slice(0, maxSuggestions);
  }

  /**
   * Maps related modules with intelligent relationship detection
   */
  private initializeModuleRelationships(): void {
    this.moduleRelationshipMap = {
      'expenses': [
        { moduleId: 'accounting', relationship: 'parent', priority: 9, reason: 'Expenses are part of accounting records' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 5, reason: 'View expense summaries in dashboard' },
        { moduleId: 'reports', relationship: 'sibling', priority: 7, reason: 'Generate expense reports' }
      ],
      'manager-operations': [
        { moduleId: 'dashboard', relationship: 'alternative', priority: 8, reason: 'Access management overview' },
        { moduleId: 'settings', relationship: 'sibling', priority: 6, reason: 'Configure system settings' },
        { moduleId: 'reports', relationship: 'child', priority: 7, reason: 'View management reports' }
      ],
      'bir-forms': [
        { moduleId: 'accounting', relationship: 'parent', priority: 9, reason: 'BIR forms are based on accounting data' },
        { moduleId: 'reports', relationship: 'sibling', priority: 8, reason: 'Generate tax reports' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 5, reason: 'View tax summaries' }
      ],
      'payroll': [
        { moduleId: 'accounting', relationship: 'parent', priority: 8, reason: 'Payroll affects accounting records' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 6, reason: 'View payroll summaries' },
        { moduleId: 'reports', relationship: 'sibling', priority: 7, reason: 'Generate payroll reports' }
      ],
      'cloud-backup': [
        { moduleId: 'settings', relationship: 'parent', priority: 9, reason: 'Backup settings and configuration' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 4, reason: 'Check system status' }
      ],
      'inventory': [
        { moduleId: 'dashboard', relationship: 'alternative', priority: 8, reason: 'View inventory summaries' },
        { moduleId: 'pos', relationship: 'sibling', priority: 7, reason: 'Check stock while making sales' },
        { moduleId: 'purchases', relationship: 'sibling', priority: 6, reason: 'Manage inventory through purchases' }
      ],
      'purchases': [
        { moduleId: 'inventory', relationship: 'sibling', priority: 9, reason: 'Purchases affect inventory levels' },
        { moduleId: 'accounting', relationship: 'parent', priority: 8, reason: 'Track purchase expenses' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 6, reason: 'View purchase summaries' }
      ],
      'pos': [
        { moduleId: 'sales', relationship: 'child', priority: 9, reason: 'View completed sales transactions' },
        { moduleId: 'inventory', relationship: 'sibling', priority: 8, reason: 'Check product availability' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 7, reason: 'View sales overview' }
      ],
      'accounting': [
        { moduleId: 'reports', relationship: 'child', priority: 9, reason: 'Generate financial reports' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 7, reason: 'View financial summaries' },
        { moduleId: 'expenses', relationship: 'child', priority: 6, reason: 'Track business expenses' }
      ],
      'reports': [
        { moduleId: 'dashboard', relationship: 'alternative', priority: 8, reason: 'View report summaries' },
        { moduleId: 'accounting', relationship: 'parent', priority: 7, reason: 'Access underlying financial data' }
      ],
      'sales': [
        { moduleId: 'pos', relationship: 'parent', priority: 9, reason: 'Create new sales transactions' },
        { moduleId: 'reports', relationship: 'sibling', priority: 8, reason: 'Generate sales reports' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 7, reason: 'View sales overview' }
      ],
      'customers': [
        { moduleId: 'pos', relationship: 'workflow', priority: 8, reason: 'Process customer transactions' },
        { moduleId: 'sales', relationship: 'sibling', priority: 7, reason: 'View customer purchase history' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 6, reason: 'View customer summaries' }
      ],
      'marketing': [
        { moduleId: 'customers', relationship: 'parent', priority: 9, reason: 'Marketing targets customer base' },
        { moduleId: 'loyalty', relationship: 'sibling', priority: 8, reason: 'Related customer engagement tools' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 5, reason: 'View marketing metrics' }
      ],
      'loyalty': [
        { moduleId: 'customers', relationship: 'parent', priority: 9, reason: 'Loyalty programs target customers' },
        { moduleId: 'marketing', relationship: 'sibling', priority: 8, reason: 'Coordinate with marketing campaigns' },
        { moduleId: 'pos', relationship: 'workflow', priority: 7, reason: 'Apply loyalty rewards at checkout' }
      ],
      'gcash': [
        { moduleId: 'pos', relationship: 'parent', priority: 9, reason: 'Use alternative payment methods' },
        { moduleId: 'paymaya', relationship: 'alternative', priority: 8, reason: 'Try alternative digital payment' },
        { moduleId: 'settings', relationship: 'sibling', priority: 6, reason: 'Configure payment settings' }
      ],
      'paymaya': [
        { moduleId: 'pos', relationship: 'parent', priority: 9, reason: 'Use alternative payment methods' },
        { moduleId: 'gcash', relationship: 'alternative', priority: 8, reason: 'Try alternative digital payment' },
        { moduleId: 'settings', relationship: 'sibling', priority: 6, reason: 'Configure payment settings' }
      ],
      'electronic-receipts': [
        { moduleId: 'pos', relationship: 'parent', priority: 9, reason: 'Generate receipts from sales' },
        { moduleId: 'sales', relationship: 'sibling', priority: 8, reason: 'View sales transaction history' },
        { moduleId: 'settings', relationship: 'sibling', priority: 6, reason: 'Configure receipt settings' }
      ],
      'product-history': [
        { moduleId: 'inventory', relationship: 'parent', priority: 9, reason: 'View current inventory status' },
        { moduleId: 'reports', relationship: 'sibling', priority: 8, reason: 'Generate inventory reports' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 6, reason: 'View inventory summaries' }
      ],
      'branches': [
        { moduleId: 'settings', relationship: 'parent', priority: 9, reason: 'Configure branch settings' },
        { moduleId: 'dashboard', relationship: 'alternative', priority: 7, reason: 'View multi-branch overview' },
        { moduleId: 'reports', relationship: 'sibling', priority: 6, reason: 'Generate branch reports' }
      ],
      'settings': [
        { moduleId: 'dashboard', relationship: 'alternative', priority: 8, reason: 'Return to main dashboard' },
        { moduleId: 'help', relationship: 'sibling', priority: 6, reason: 'Get help with configuration' }
      ],
      'help': [
        { moduleId: 'dashboard', relationship: 'alternative', priority: 8, reason: 'Return to main dashboard' },
        { moduleId: 'settings', relationship: 'sibling', priority: 6, reason: 'Access system settings' }
      ],
      'dashboard': [] // Dashboard is the final fallback, no further fallbacks needed
    };
  }

  /**
   * Gets system status with intelligent caching
   */
  getSystemStatus(): SystemStatus {
    // Check cache validity
    if (this.systemStatusCache && this.statusCacheExpiry && new Date() < this.statusCacheExpiry) {
      return this.systemStatusCache;
    }

    // Get fresh system status
    this.systemStatusCache = moduleLoadingManager.getSystemStatus();
    this.statusCacheExpiry = new Date(Date.now() + this.statusCacheTTL);

    return this.systemStatusCache;
  }

  /**
   * Creates system status indicator with module availability
   */
  getSystemStatusIndicator(): {
    overall: 'healthy' | 'degraded' | 'critical';
    moduleCount: {
      total: number;
      available: number;
      failed: number;
      loading: number;
    };
    networkStatus: {
      online: boolean;
      condition: NetworkCondition;
      message: string;
    };
    recommendations: string[];
  } {
    const systemStatus = this.getSystemStatus();
    const loadingStates = moduleLoadingManager.getAllLoadingStates?.() || [];
    
    const moduleCount = {
      total: systemStatus.modulesAvailable.length,
      available: systemStatus.modulesAvailable.length - systemStatus.modulesFailedToLoad.length,
      failed: systemStatus.modulesFailedToLoad.length,
      loading: loadingStates.filter(state => state.state === 'loading' || state.state === 'retrying').length
    };

    const networkStatus = {
      online: systemStatus.networkStatus.online,
      condition: systemStatus.networkStatus.condition,
      message: this.getNetworkStatusMessage(systemStatus.networkStatus)
    };

    const recommendations = this.getSystemRecommendations(systemStatus, networkStatus.condition);

    return {
      overall: systemStatus.systemHealth,
      moduleCount,
      networkStatus,
      recommendations
    };
  }

  /**
   * Handles graceful degradation to Dashboard when multiple failures occur
   */
  handleMultipleFailures(
    failedModules: ModuleId[], 
    userRole: UserRole,
    consecutiveFailures: number
  ): {
    shouldDegradeToDashboard: boolean;
    fallbackRoute: string;
    message: string;
    availableModules: ModuleId[];
  } {
    const criticalFailureThreshold = 3;
    const shouldDegrade = consecutiveFailures >= criticalFailureThreshold;

    if (shouldDegrade) {
      // Get modules that are still available
      const systemStatus = this.getSystemStatus();
      const availableModules = systemStatus.modulesAvailable.filter(
        moduleId => !systemStatus.modulesFailedToLoad.includes(moduleId) &&
        canAccessModule(userRole, moduleId)
      );

      return {
        shouldDegradeToDashboard: true,
        fallbackRoute: '/',
        message: `Multiple modules are currently unavailable. You've been redirected to the Dashboard where you can access ${availableModules.length} available modules.`,
        availableModules
      };
    }

    // Try to find working alternative for the most recent failure
    const lastFailedModule = failedModules[failedModules.length - 1];
    const suggestions = this.getFallbackSuggestions(
      lastFailedModule, 
      userRole, 
      this.createDummyError(lastFailedModule), 
      1
    );

    const bestSuggestion = suggestions.find(s => s.available);

    return {
      shouldDegradeToDashboard: false,
      fallbackRoute: bestSuggestion?.route || '/',
      message: bestSuggestion 
        ? `${this.getModuleDisplayName(lastFailedModule)} is unavailable. Try ${bestSuggestion.displayName} instead.`
        : `${this.getModuleDisplayName(lastFailedModule)} is unavailable. Returning to Dashboard.`,
      availableModules: suggestions.filter(s => s.available).map(s => s.moduleId)
    };
  }

  /**
   * Gets contextual reason for fallback suggestion
   */
  private getContextualReason(
    relation: { relationship: string; reason: string }, 
    error: ModuleLoadingError
  ): string {
    const baseReason = relation.reason;
    
    // Customize reason based on error type
    switch (error.type) {
      case ModuleLoadingErrorType.PERMISSION_DENIED:
        return `${baseReason} (accessible with your current permissions)`;
      case ModuleLoadingErrorType.NETWORK_ERROR:
        return `${baseReason} (may work better with current connection)`;
      case ModuleLoadingErrorType.TIMEOUT_ERROR:
        return `${baseReason} (typically loads faster)`;
      default:
        return baseReason;
    }
  }

  /**
   * Calculates priority based on relationship, error type, and availability
   */
  private calculatePriority(
    relation: { priority: number; relationship: string }, 
    error: ModuleLoadingError, 
    isAvailable: boolean
  ): number {
    let priority = relation.priority;
    
    // Boost priority for available modules
    if (isAvailable) priority += 2;
    
    // Adjust based on error type
    switch (error.type) {
      case ModuleLoadingErrorType.PERMISSION_DENIED:
        // Prefer alternatives over parents when permissions are the issue
        if (relation.relationship === 'alternative') priority += 3;
        break;
      case ModuleLoadingErrorType.NETWORK_ERROR:
      case ModuleLoadingErrorType.TIMEOUT_ERROR:
        // Prefer simpler modules during network issues
        if (relation.relationship === 'alternative') priority += 2;
        break;
      default:
        // Default preference for workflow-related modules
        if (relation.relationship === 'workflow') priority += 1;
    }
    
    return priority;
  }

  /**
   * Checks if a module is currently available
   */
  private isModuleAvailable(moduleId: ModuleId, systemStatus: SystemStatus): boolean {
    return systemStatus.modulesAvailable.includes(moduleId) && 
           !systemStatus.modulesFailedToLoad.includes(moduleId);
  }

  /**
   * Gets network status message for user display
   */
  private getNetworkStatusMessage(networkStatus: { online: boolean; condition: NetworkCondition }): string {
    if (!networkStatus.online) {
      return 'You are offline. Some features may not be available.';
    }

    switch (networkStatus.condition) {
      case 'excellent':
        return 'Excellent connection - all features available';
      case 'good':
        return 'Good connection - all features available';
      case 'fair':
        return 'Fair connection - some features may load slowly';
      case 'poor':
        return 'Poor connection - limited features available';
      default:
        return 'Connection status unknown';
    }
  }

  /**
   * Gets system recommendations based on status
   */
  private getSystemRecommendations(systemStatus: SystemStatus, networkCondition: NetworkCondition): string[] {
    const recommendations: string[] = [];

    if (systemStatus.systemHealth === 'critical') {
      recommendations.push('Contact system administrator - multiple modules are failing');
    }

    if (systemStatus.systemHealth === 'degraded') {
      recommendations.push('Some modules may be temporarily unavailable');
    }

    if (!systemStatus.networkStatus.online) {
      recommendations.push('Check internet connection to access all features');
    } else if (networkCondition === 'poor') {
      recommendations.push('Consider using basic features until connection improves');
    }

    if (systemStatus.modulesFailedToLoad.length > 0) {
      recommendations.push('Try refreshing the page if modules fail to load');
    }

    return recommendations;
  }

  // Helper methods

  private createDummyError(moduleId: ModuleId): ModuleLoadingError {
    return {
      type: ModuleLoadingErrorType.UNKNOWN_ERROR,
      moduleId,
      message: 'Module failed to load',
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 0,
      recoverable: false
    };
  }

  private getModuleDisplayName(moduleId: ModuleId): string {
    const displayNames: Record<ModuleId, string> = {
      dashboard: 'Dashboard',
      pos: 'Point of Sale',
      inventory: 'Inventory Management',
      accounting: 'Accounting',
      expenses: 'Expense Tracking',
      purchases: 'Purchase Management',
      payroll: 'Payroll Management',
      'bir-forms': 'BIR Forms',
      sales: 'Sales History',
      customers: 'Customer Management',
      'manager-operations': 'Manager Operations',
      marketing: 'Marketing Campaigns',
      loyalty: 'Loyalty Programs',
      gcash: 'GCash Integration',
      paymaya: 'PayMaya Integration',
      'cloud-backup': 'Cloud Backup',
      'electronic-receipts': 'Electronic Receipts',
      'product-history': 'Product History',
      branches: 'Branch Management',
      settings: 'Settings',
      help: 'Help & Support',
      reports: 'Reports & Analytics'
    };

    return displayNames[moduleId] || moduleId;
  }

  private getModuleRoute(moduleId: ModuleId): string {
    const routes: Record<ModuleId, string> = {
      dashboard: '/',
      pos: '/pos',
      inventory: '/inventory',
      accounting: '/accounting',
      expenses: '/expenses',
      purchases: '/purchases',
      payroll: '/payroll',
      'bir-forms': '/bir',
      sales: '/sales',
      customers: '/customers',
      'manager-operations': '/manager',
      marketing: '/marketing',
      loyalty: '/loyalty',
      gcash: '/payments/gcash',
      paymaya: '/payments/paymaya',
      'cloud-backup': '/settings?tab=backup',
      'electronic-receipts': '/receipts',
      'product-history': '/inventory/history',
      branches: '/branches',
      settings: '/settings',
      help: '/help',
      reports: '/reports'
    };

    return routes[moduleId] || '/';
  }
}

// Create and export singleton instance
export const fallbackSuggestionService = new FallbackSuggestionService();
export default FallbackSuggestionService;