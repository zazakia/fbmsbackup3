// Test configuration for different environments and scenarios

export interface TestConfig {
  environment: TestEnvironment;
  database: DatabaseConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  integration: IntegrationConfig;
  reporting: ReportingConfig;
}

export type TestEnvironment = 'unit' | 'integration' | 'e2e' | 'performance' | 'security';

export interface DatabaseConfig {
  mockDatabase: boolean;
  useInMemoryDb: boolean;
  seedData: boolean;
  dataScale: 'small' | 'medium' | 'large';
  enableTransactions: boolean;
  enableRLS: boolean;
  connectionTimeout: number;
  queryTimeout: number;
}

export interface PerformanceConfig {
  enableMetrics: boolean;
  thresholds: {
    componentRender: number;
    apiResponse: number;
    databaseQuery: number;
    reportGeneration: number;
    bulkOperation: number;
  };
  loadTesting: {
    maxConcurrentUsers: number;
    testDuration: number;
    rampUpTime: number;
  };
  memoryLimits: {
    maxHeapSize: number;
    maxComponentInstances: number;
  };
}

export interface SecurityConfig {
  enableAuthTests: boolean;
  enableRoleTests: boolean;
  enableInputValidation: boolean;
  enableSqlInjectionTests: boolean;
  enableXssTests: boolean;
  enableCsrfTests: boolean;
  testUsers: TestUser[];
}

export interface TestUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | 'accountant';
  permissions: string[];
  isActive: boolean;
}

export interface IntegrationConfig {
  enablePosIntegration: boolean;
  enableAccountingIntegration: boolean;
  enablePaymentIntegration: boolean;
  enableNotificationIntegration: boolean;
  enableReportingIntegration: boolean;
  mockExternalServices: boolean;
  networkSimulation: {
    enableLatency: boolean;
    latencyRange: [number, number];
    enableFailures: boolean;
    failureRate: number;
  };
}

export interface ReportingConfig {
  enableReportTests: boolean;
  reportFormats: string[];
  maxReportSize: number;
  reportTimeout: number;
  enableScheduledReports: boolean;
}

// Predefined test configurations
export const TEST_CONFIGS: Record<TestEnvironment, TestConfig> = {
  unit: {
    environment: 'unit',
    database: {
      mockDatabase: true,
      useInMemoryDb: false,
      seedData: true,
      dataScale: 'small',
      enableTransactions: false,
      enableRLS: false,
      connectionTimeout: 1000,
      queryTimeout: 500
    },
    performance: {
      enableMetrics: true,
      thresholds: {
        componentRender: 100,
        apiResponse: 200,
        databaseQuery: 100,
        reportGeneration: 1000,
        bulkOperation: 2000
      },
      loadTesting: {
        maxConcurrentUsers: 1,
        testDuration: 1000,
        rampUpTime: 0
      },
      memoryLimits: {
        maxHeapSize: 100 * 1024 * 1024, // 100MB
        maxComponentInstances: 10
      }
    },
    security: {
      enableAuthTests: false,
      enableRoleTests: false,
      enableInputValidation: true,
      enableSqlInjectionTests: false,
      enableXssTests: false,
      enableCsrfTests: false,
      testUsers: []
    },
    integration: {
      enablePosIntegration: false,
      enableAccountingIntegration: false,
      enablePaymentIntegration: false,
      enableNotificationIntegration: false,
      enableReportingIntegration: false,
      mockExternalServices: true,
      networkSimulation: {
        enableLatency: false,
        latencyRange: [0, 0],
        enableFailures: false,
        failureRate: 0
      }
    },
    reporting: {
      enableReportTests: false,
      reportFormats: [],
      maxReportSize: 1024 * 1024, // 1MB
      reportTimeout: 5000,
      enableScheduledReports: false
    }
  },

  integration: {
    environment: 'integration',
    database: {
      mockDatabase: true,
      useInMemoryDb: true,
      seedData: true,
      dataScale: 'medium',
      enableTransactions: true,
      enableRLS: true,
      connectionTimeout: 5000,
      queryTimeout: 2000
    },
    performance: {
      enableMetrics: true,
      thresholds: {
        componentRender: 200,
        apiResponse: 500,
        databaseQuery: 300,
        reportGeneration: 3000,
        bulkOperation: 5000
      },
      loadTesting: {
        maxConcurrentUsers: 5,
        testDuration: 10000,
        rampUpTime: 2000
      },
      memoryLimits: {
        maxHeapSize: 500 * 1024 * 1024, // 500MB
        maxComponentInstances: 50
      }
    },
    security: {
      enableAuthTests: true,
      enableRoleTests: true,
      enableInputValidation: true,
      enableSqlInjectionTests: true,
      enableXssTests: true,
      enableCsrfTests: false,
      testUsers: [
        {
          id: 'test-admin',
          email: 'admin@test.com',
          role: 'admin',
          permissions: ['*'],
          isActive: true
        },
        {
          id: 'test-manager',
          email: 'manager@test.com',
          role: 'manager',
          permissions: ['inventory:read', 'inventory:write', 'reports:read'],
          isActive: true
        },
        {
          id: 'test-cashier',
          email: 'cashier@test.com',
          role: 'cashier',
          permissions: ['pos:read', 'pos:write', 'inventory:read'],
          isActive: true
        }
      ]
    },
    integration: {
      enablePosIntegration: true,
      enableAccountingIntegration: true,
      enablePaymentIntegration: true,
      enableNotificationIntegration: true,
      enableReportingIntegration: true,
      mockExternalServices: true,
      networkSimulation: {
        enableLatency: true,
        latencyRange: [50, 200],
        enableFailures: true,
        failureRate: 0.05
      }
    },
    reporting: {
      enableReportTests: true,
      reportFormats: ['pdf', 'excel', 'csv'],
      maxReportSize: 10 * 1024 * 1024, // 10MB
      reportTimeout: 15000,
      enableScheduledReports: true
    }
  },

  e2e: {
    environment: 'e2e',
    database: {
      mockDatabase: false,
      useInMemoryDb: true,
      seedData: true,
      dataScale: 'large',
      enableTransactions: true,
      enableRLS: true,
      connectionTimeout: 10000,
      queryTimeout: 5000
    },
    performance: {
      enableMetrics: true,
      thresholds: {
        componentRender: 500,
        apiResponse: 1000,
        databaseQuery: 500,
        reportGeneration: 10000,
        bulkOperation: 15000
      },
      loadTesting: {
        maxConcurrentUsers: 10,
        testDuration: 30000,
        rampUpTime: 5000
      },
      memoryLimits: {
        maxHeapSize: 1024 * 1024 * 1024, // 1GB
        maxComponentInstances: 100
      }
    },
    security: {
      enableAuthTests: true,
      enableRoleTests: true,
      enableInputValidation: true,
      enableSqlInjectionTests: true,
      enableXssTests: true,
      enableCsrfTests: true,
      testUsers: [
        {
          id: 'e2e-admin',
          email: 'admin@e2e.com',
          role: 'admin',
          permissions: ['*'],
          isActive: true
        },
        {
          id: 'e2e-manager',
          email: 'manager@e2e.com',
          role: 'manager',
          permissions: ['inventory:*', 'reports:*', 'customers:*'],
          isActive: true
        },
        {
          id: 'e2e-cashier',
          email: 'cashier@e2e.com',
          role: 'cashier',
          permissions: ['pos:*', 'inventory:read'],
          isActive: true
        },
        {
          id: 'e2e-accountant',
          email: 'accountant@e2e.com',
          role: 'accountant',
          permissions: ['accounting:*', 'reports:read'],
          isActive: true
        }
      ]
    },
    integration: {
      enablePosIntegration: true,
      enableAccountingIntegration: true,
      enablePaymentIntegration: true,
      enableNotificationIntegration: true,
      enableReportingIntegration: true,
      mockExternalServices: false,
      networkSimulation: {
        enableLatency: true,
        latencyRange: [100, 500],
        enableFailures: true,
        failureRate: 0.02
      }
    },
    reporting: {
      enableReportTests: true,
      reportFormats: ['pdf', 'excel', 'csv', 'json'],
      maxReportSize: 50 * 1024 * 1024, // 50MB
      reportTimeout: 30000,
      enableScheduledReports: true
    }
  },

  performance: {
    environment: 'performance',
    database: {
      mockDatabase: false,
      useInMemoryDb: false,
      seedData: true,
      dataScale: 'large',
      enableTransactions: true,
      enableRLS: true,
      connectionTimeout: 30000,
      queryTimeout: 10000
    },
    performance: {
      enableMetrics: true,
      thresholds: {
        componentRender: 100,
        apiResponse: 300,
        databaseQuery: 200,
        reportGeneration: 5000,
        bulkOperation: 10000
      },
      loadTesting: {
        maxConcurrentUsers: 100,
        testDuration: 300000, // 5 minutes
        rampUpTime: 30000
      },
      memoryLimits: {
        maxHeapSize: 2 * 1024 * 1024 * 1024, // 2GB
        maxComponentInstances: 1000
      }
    },
    security: {
      enableAuthTests: false,
      enableRoleTests: false,
      enableInputValidation: false,
      enableSqlInjectionTests: false,
      enableXssTests: false,
      enableCsrfTests: false,
      testUsers: []
    },
    integration: {
      enablePosIntegration: true,
      enableAccountingIntegration: true,
      enablePaymentIntegration: true,
      enableNotificationIntegration: true,
      enableReportingIntegration: true,
      mockExternalServices: true,
      networkSimulation: {
        enableLatency: true,
        latencyRange: [50, 300],
        enableFailures: true,
        failureRate: 0.01
      }
    },
    reporting: {
      enableReportTests: true,
      reportFormats: ['pdf', 'excel', 'csv'],
      maxReportSize: 100 * 1024 * 1024, // 100MB
      reportTimeout: 60000,
      enableScheduledReports: true
    }
  },

  security: {
    environment: 'security',
    database: {
      mockDatabase: true,
      useInMemoryDb: true,
      seedData: true,
      dataScale: 'medium',
      enableTransactions: true,
      enableRLS: true,
      connectionTimeout: 5000,
      queryTimeout: 2000
    },
    performance: {
      enableMetrics: false,
      thresholds: {
        componentRender: 1000,
        apiResponse: 2000,
        databaseQuery: 1000,
        reportGeneration: 10000,
        bulkOperation: 20000
      },
      loadTesting: {
        maxConcurrentUsers: 1,
        testDuration: 5000,
        rampUpTime: 0
      },
      memoryLimits: {
        maxHeapSize: 500 * 1024 * 1024, // 500MB
        maxComponentInstances: 50
      }
    },
    security: {
      enableAuthTests: true,
      enableRoleTests: true,
      enableInputValidation: true,
      enableSqlInjectionTests: true,
      enableXssTests: true,
      enableCsrfTests: true,
      testUsers: [
        {
          id: 'security-admin',
          email: 'admin@security.com',
          role: 'admin',
          permissions: ['*'],
          isActive: true
        },
        {
          id: 'security-user',
          email: 'user@security.com',
          role: 'cashier',
          permissions: ['pos:read'],
          isActive: true
        },
        {
          id: 'security-inactive',
          email: 'inactive@security.com',
          role: 'cashier',
          permissions: [],
          isActive: false
        }
      ]
    },
    integration: {
      enablePosIntegration: false,
      enableAccountingIntegration: false,
      enablePaymentIntegration: false,
      enableNotificationIntegration: false,
      enableReportingIntegration: false,
      mockExternalServices: true,
      networkSimulation: {
        enableLatency: false,
        latencyRange: [0, 0],
        enableFailures: false,
        failureRate: 0
      }
    },
    reporting: {
      enableReportTests: false,
      reportFormats: [],
      maxReportSize: 1024 * 1024, // 1MB
      reportTimeout: 5000,
      enableScheduledReports: false
    }
  }
};

// Test data configurations
export const TEST_DATA_CONFIGS = {
  small: {
    products: 50,
    categories: 5,
    customers: 20,
    sales: 30,
    purchaseOrders: 10,
    stockMovements: 100,
    locations: 2,
    transfers: 5,
    alerts: 10
  },
  medium: {
    products: 500,
    categories: 15,
    customers: 100,
    sales: 200,
    purchaseOrders: 50,
    stockMovements: 1000,
    locations: 5,
    transfers: 25,
    alerts: 50
  },
  large: {
    products: 5000,
    categories: 50,
    customers: 1000,
    sales: 2000,
    purchaseOrders: 500,
    stockMovements: 10000,
    locations: 20,
    transfers: 100,
    alerts: 200
  }
};

// Helper functions
export function getTestConfig(environment: TestEnvironment): TestConfig {
  return TEST_CONFIGS[environment];
}

export function createCustomConfig(base: TestEnvironment, overrides: Partial<TestConfig>): TestConfig {
  const baseConfig = getTestConfig(base);
  return {
    ...baseConfig,
    ...overrides,
    database: { ...baseConfig.database, ...overrides.database },
    performance: { ...baseConfig.performance, ...overrides.performance },
    security: { ...baseConfig.security, ...overrides.security },
    integration: { ...baseConfig.integration, ...overrides.integration },
    reporting: { ...baseConfig.reporting, ...overrides.reporting }
  };
}

export function isFeatureEnabled(config: TestConfig, feature: string): boolean {
  switch (feature) {
    case 'auth':
      return config.security.enableAuthTests;
    case 'roles':
      return config.security.enableRoleTests;
    case 'performance':
      return config.performance.enableMetrics;
    case 'integration':
      return config.integration.enablePosIntegration || 
             config.integration.enableAccountingIntegration ||
             config.integration.enablePaymentIntegration;
    case 'reporting':
      return config.reporting.enableReportTests;
    default:
      return false;
  }
}

export function getPerformanceThreshold(config: TestConfig, operation: string): number {
  const thresholds = config.performance.thresholds;
  switch (operation) {
    case 'render':
      return thresholds.componentRender;
    case 'api':
      return thresholds.apiResponse;
    case 'query':
      return thresholds.databaseQuery;
    case 'report':
      return thresholds.reportGeneration;
    case 'bulk':
      return thresholds.bulkOperation;
    default:
      return 1000; // Default threshold
  }
}

export function getTestUsers(config: TestConfig, role?: string): TestUser[] {
  if (!role) {
    return config.security.testUsers;
  }
  return config.security.testUsers.filter(user => user.role === role);
}