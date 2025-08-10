/**
 * Error Simulation Utilities for Testing Module Loading System
 * Provides tools to simulate different error conditions for comprehensive testing
 */

import type { ModuleLoadingError, UserRole } from '../../types/moduleLoading';

export interface ErrorSimulationConfig {
  errorType: 'network' | 'timeout' | 'chunk_load' | 'permission' | 'module' | 'memory' | 'security';
  probability: number; // 0-1, probability of error occurring
  delay?: number; // Optional delay before error
  intermittent?: boolean; // Whether error should occur intermittently
  recoverable?: boolean; // Whether error should be recoverable after retries
  customMessage?: string; // Custom error message
  metadata?: Record<string, any>; // Additional error metadata
}

export interface NetworkSimulationConfig {
  connectionType: 'offline' | '2g' | '3g' | '4g' | 'wifi';
  latency: number; // ms
  bandwidth: number; // Mbps
  packetLoss: number; // 0-1
  unstable?: boolean; // Whether connection should fluctuate
}

export interface UserSimulationConfig {
  role: UserRole;
  permissions: string[];
  sessionDuration?: number; // How long user session should last
  permissionChanges?: Array<{
    at: number; // Time in ms when permissions change
    newPermissions: string[];
  }>;
}

/**
 * Main Error Simulation Service
 */
export class ErrorSimulationService {
  private errorConfigs = new Map<string, ErrorSimulationConfig>();
  private networkConfig: NetworkSimulationConfig | null = null;
  private userConfig: UserSimulationConfig | null = null;
  private simulationStartTime = Date.now();
  private errorHistory: Array<{
    timestamp: number;
    moduleId: string;
    errorType: string;
    recovered: boolean;
  }> = [];

  /**
   * Configure error simulation for a specific module
   */
  configureModuleErrors(moduleId: string, config: ErrorSimulationConfig): void {
    this.errorConfigs.set(moduleId, config);
  }

  /**
   * Configure network simulation conditions
   */
  configureNetwork(config: NetworkSimulationConfig): void {
    this.networkConfig = config;
    this.updateNavigatorConnection(config);
  }

  /**
   * Configure user permission simulation
   */
  configureUser(config: UserSimulationConfig): void {
    this.userConfig = config;
  }

  /**
   * Simulate module loading with configured errors
   */
  async simulateModuleLoad(moduleId: string): Promise<any> {
    const config = this.errorConfigs.get(moduleId);
    
    if (config && this.shouldTriggerError(config)) {
      const error = this.createSimulatedError(moduleId, config);
      this.recordError(moduleId, config.errorType, false);
      
      if (config.delay) {
        await this.delay(config.delay);
      }
      
      throw error;
    }

    // Simulate network conditions
    if (this.networkConfig) {
      await this.simulateNetworkDelay();
    }

    // Return successful mock result
    return { default: () => `Mock component for ${moduleId}` };
  }

  /**
   * Check if current user should have access to module
   */
  checkUserPermissions(moduleId: string, requiredRole?: UserRole, requiredPermissions?: string[]): boolean {
    if (!this.userConfig) return true;

    const currentPermissions = this.getCurrentUserPermissions();
    
    // Check role requirement
    if (requiredRole && !this.hasRequiredRole(this.userConfig.role, requiredRole)) {
      return false;
    }

    // Check permission requirements
    if (requiredPermissions) {
      return requiredPermissions.every(permission => 
        currentPermissions.includes(permission)
      );
    }

    return true;
  }

  /**
   * Simulate network recovery after errors
   */
  async simulateRecovery(moduleId: string, attemptNumber: number): Promise<boolean> {
    const config = this.errorConfigs.get(moduleId);
    
    if (!config || !config.recoverable) {
      return false;
    }

    // Recovery probability increases with attempt number
    const recoveryProbability = Math.min(0.8, attemptNumber * 0.2);
    const shouldRecover = Math.random() < recoveryProbability;

    if (shouldRecover) {
      this.recordError(moduleId, config.errorType, true);
      // Clear intermittent errors after successful recovery
      if (config.intermittent) {
        this.errorConfigs.delete(moduleId);
      }
    }

    return shouldRecover;
  }

  /**
   * Generate stress test scenarios
   */
  generateStressTestScenarios(): Array<{
    name: string;
    description: string;
    setup: () => void;
    expectedBehavior: string;
  }> {
    return [
      {
        name: 'High Error Rate',
        description: 'Simulate 50% module loading failure rate',
        setup: () => {
          ['expenses', 'operations', 'bir-forms'].forEach(moduleId => {
            this.configureModuleErrors(moduleId, {
              errorType: 'network',
              probability: 0.5,
              recoverable: true
            });
          });
        },
        expectedBehavior: 'System should retry failed loads and eventually succeed'
      },
      {
        name: 'Network Instability',
        description: 'Simulate unstable network with frequent disconnections',
        setup: () => {
          this.configureNetwork({
            connectionType: '3g',
            latency: 500,
            bandwidth: 1,
            packetLoss: 0.1,
            unstable: true
          });
        },
        expectedBehavior: 'System should adapt timeout and retry strategies'
      },
      {
        name: 'Permission Chaos',
        description: 'Simulate frequent permission changes during session',
        setup: () => {
          this.configureUser({
            role: 'employee',
            permissions: ['dashboard'],
            permissionChanges: [
              { at: 5000, newPermissions: ['dashboard', 'expenses'] },
              { at: 10000, newPermissions: ['dashboard'] },
              { at: 15000, newPermissions: ['dashboard', 'expenses', 'operations'] }
            ]
          });
        },
        expectedBehavior: 'System should re-validate permissions and update UI accordingly'
      },
      {
        name: 'Memory Pressure',
        description: 'Simulate low memory conditions affecting caching',
        setup: () => {
          ['expenses', 'operations', 'bir-forms'].forEach(moduleId => {
            this.configureModuleErrors(moduleId, {
              errorType: 'memory',
              probability: 0.3,
              recoverable: false
            });
          });
        },
        expectedBehavior: 'System should gracefully degrade caching and continue functioning'
      },
      {
        name: 'Concurrent Load Spike',
        description: 'Simulate sudden spike in concurrent module requests',
        setup: () => {
          // This would be handled by the test runner, not configuration
        },
        expectedBehavior: 'System should implement backpressure and maintain performance'
      }
    ];
  }

  /**
   * Get simulation statistics
   */
  getSimulationStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recoveryRate: number;
    averageRecoveryTime: number;
    moduleReliability: Record<string, number>;
  } {
    const totalErrors = this.errorHistory.length;
    const errorsByType: Record<string, number> = {};
    let recoveredErrors = 0;

    this.errorHistory.forEach(error => {
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
      if (error.recovered) recoveredErrors++;
    });

    const recoveryRate = totalErrors > 0 ? recoveredErrors / totalErrors : 0;

    // Calculate module reliability (success rate)
    const moduleStats = new Map<string, { total: number; successful: number }>();
    this.errorHistory.forEach(error => {
      const stats = moduleStats.get(error.moduleId) || { total: 0, successful: 0 };
      stats.total++;
      if (error.recovered) stats.successful++;
      moduleStats.set(error.moduleId, stats);
    });

    const moduleReliability: Record<string, number> = {};
    moduleStats.forEach((stats, moduleId) => {
      moduleReliability[moduleId] = stats.successful / stats.total;
    });

    return {
      totalErrors,
      errorsByType,
      recoveryRate,
      averageRecoveryTime: this.calculateAverageRecoveryTime(),
      moduleReliability
    };
  }

  /**
   * Reset simulation state
   */
  reset(): void {
    this.errorConfigs.clear();
    this.networkConfig = null;
    this.userConfig = null;
    this.errorHistory = [];
    this.simulationStartTime = Date.now();
  }

  /**
   * Export simulation scenario for reproduction
   */
  exportScenario(): string {
    return JSON.stringify({
      errorConfigs: Object.fromEntries(this.errorConfigs),
      networkConfig: this.networkConfig,
      userConfig: this.userConfig,
      errorHistory: this.errorHistory
    }, null, 2);
  }

  /**
   * Import simulation scenario
   */
  importScenario(scenarioJson: string): void {
    const scenario = JSON.parse(scenarioJson);
    
    this.errorConfigs.clear();
    Object.entries(scenario.errorConfigs).forEach(([moduleId, config]) => {
      this.errorConfigs.set(moduleId, config as ErrorSimulationConfig);
    });
    
    this.networkConfig = scenario.networkConfig;
    this.userConfig = scenario.userConfig;
    this.errorHistory = scenario.errorHistory || [];
  }

  // Private helper methods

  private shouldTriggerError(config: ErrorSimulationConfig): boolean {
    if (config.intermittent) {
      // For intermittent errors, use time-based probability
      const timeFactor = Math.sin(Date.now() / 1000) * 0.5 + 0.5;
      return Math.random() < (config.probability * timeFactor);
    }
    
    return Math.random() < config.probability;
  }

  private createSimulatedError(moduleId: string, config: ErrorSimulationConfig): Error {
    const baseMessage = config.customMessage || this.getDefaultErrorMessage(config.errorType);
    
    const error = new Error(`${baseMessage} (simulated)`);
    
    // Set error properties based on type
    switch (config.errorType) {
      case 'network':
        error.name = 'TypeError';
        break;
      case 'timeout':
        error.name = 'TimeoutError';
        break;
      case 'chunk_load':
        error.name = 'ChunkLoadError';
        break;
      case 'permission':
        error.name = 'PermissionError';
        (error as any).type = 'permission_denied';
        (error as any).userRole = this.userConfig?.role;
        break;
      case 'module':
        error.name = 'SyntaxError';
        break;
      case 'memory':
        error.name = 'RangeError';
        break;
      case 'security':
        error.name = 'SecurityError';
        break;
    }

    // Add metadata
    if (config.metadata) {
      Object.assign(error, config.metadata);
    }

    return error;
  }

  private getDefaultErrorMessage(errorType: string): string {
    const messages = {
      network: 'Failed to fetch',
      timeout: 'Loading timeout',
      chunk_load: 'Loading chunk failed',
      permission: 'Permission denied',
      module: 'Unexpected token',
      memory: 'Out of memory',
      security: 'Security policy violation'
    };
    
    return messages[errorType as keyof typeof messages] || 'Unknown error';
  }

  private async simulateNetworkDelay(): Promise<void> {
    if (!this.networkConfig) return;

    const { latency, packetLoss, unstable } = this.networkConfig;
    
    // Simulate packet loss
    if (Math.random() < packetLoss) {
      throw new Error('Network packet loss (simulated)');
    }

    // Calculate delay based on network conditions
    let delay = latency;
    
    if (unstable) {
      // Add random variance for unstable connections
      delay += Math.random() * latency * 2 - latency;
    }

    await this.delay(Math.max(0, delay));
  }

  private updateNavigatorConnection(config: NetworkSimulationConfig): void {
    const connectionTypes = {
      'offline': { effectiveType: 'offline', downlink: 0, rtt: Infinity },
      '2g': { effectiveType: '2g', downlink: 0.25, rtt: 300 },
      '3g': { effectiveType: '3g', downlink: 1.5, rtt: 150 },
      '4g': { effectiveType: '4g', downlink: 10, rtt: 50 },
      'wifi': { effectiveType: '4g', downlink: 50, rtt: 20 }
    };

    const connectionData = connectionTypes[config.connectionType];
    
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      Object.assign((navigator as any).connection, {
        ...connectionData,
        downlink: config.bandwidth || connectionData.downlink,
        rtt: config.latency || connectionData.rtt
      });
    }
  }

  private getCurrentUserPermissions(): string[] {
    if (!this.userConfig) return [];

    const currentTime = Date.now() - this.simulationStartTime;
    
    // Check for permission changes
    const permissionChanges = this.userConfig.permissionChanges || [];
    const relevantChanges = permissionChanges.filter(change => change.at <= currentTime);
    
    if (relevantChanges.length > 0) {
      // Return the most recent permission set
      const latestChange = relevantChanges[relevantChanges.length - 1];
      return latestChange.newPermissions;
    }

    return this.userConfig.permissions;
  }

  private hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      'employee': 1,
      'accountant': 2,
      'manager': 3,
      'admin': 4
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  private recordError(moduleId: string, errorType: string, recovered: boolean): void {
    this.errorHistory.push({
      timestamp: Date.now(),
      moduleId,
      errorType,
      recovered
    });
  }

  private calculateAverageRecoveryTime(): number {
    const recoveredErrors = this.errorHistory.filter(error => error.recovered);
    
    if (recoveredErrors.length === 0) return 0;

    // This is a simplified calculation - in a real implementation,
    // we'd track the time between error and recovery
    return 2000; // Placeholder: 2 seconds average recovery time
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Utility functions for common testing scenarios
 */
export class ErrorTestingUtils {
  private static instance: ErrorSimulationService;

  static getInstance(): ErrorSimulationService {
    if (!this.instance) {
      this.instance = new ErrorSimulationService();
    }
    return this.instance;
  }

  /**
   * Setup common error scenarios for testing
   */
  static setupCommonScenarios() {
    const simulator = this.getInstance();

    return {
      /**
       * Simulate network instability
       */
      networkInstability: () => {
        simulator.configureNetwork({
          connectionType: '3g',
          latency: 400,
          bandwidth: 1,
          packetLoss: 0.05,
          unstable: true
        });
      },

      /**
       * Simulate permission-restricted user
       */
      restrictedUser: () => {
        simulator.configureUser({
          role: 'employee',
          permissions: ['dashboard', 'pos']
        });
      },

      /**
       * Simulate intermittent module failures
       */
      intermittentFailures: (moduleIds: string[]) => {
        moduleIds.forEach(moduleId => {
          simulator.configureModuleErrors(moduleId, {
            errorType: 'network',
            probability: 0.3,
            intermittent: true,
            recoverable: true
          });
        });
      },

      /**
       * Simulate critical module completely broken
       */
      criticalModuleBroken: (moduleId: string) => {
        simulator.configureModuleErrors(moduleId, {
          errorType: 'module',
          probability: 1.0,
          recoverable: false,
          customMessage: 'Module compilation failed'
        });
      },

      /**
       * Simulate offline mode
       */
      offlineMode: () => {
        simulator.configureNetwork({
          connectionType: 'offline',
          latency: 0,
          bandwidth: 0,
          packetLoss: 1.0
        });
      }
    };
  }

  /**
   * Create a test helper for module loading with error simulation
   */
  static createTestHelper() {
    const simulator = this.getInstance();
    
    return {
      async loadModuleWithSimulation(moduleId: string, options: {
        expectError?: boolean;
        maxRetries?: number;
        timeout?: number;
      } = {}) {
        const maxRetries = options.maxRetries || 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await simulator.simulateModuleLoad(moduleId);
            
            if (options.expectError) {
              throw new Error(`Expected error for ${moduleId} but load succeeded`);
            }
            
            return result;
          } catch (error) {
            lastError = error as Error;
            
            if (!options.expectError) {
              const shouldRetry = await simulator.simulateRecovery(moduleId, attempt);
              if (shouldRetry && attempt < maxRetries) {
                continue; // Retry
              }
            }
            
            break; // Don't retry or max retries reached
          }
        }

        if (options.expectError) {
          return lastError; // Return error as expected result
        }

        throw lastError || new Error(`Failed to load ${moduleId} after ${maxRetries} attempts`);
      },

      getStats: () => simulator.getSimulationStats(),
      reset: () => simulator.reset(),
      exportScenario: () => simulator.exportScenario()
    };
  }
}

export default ErrorSimulationService;