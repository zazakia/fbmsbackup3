import { beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/TestEnvironment';

// Global test setup that runs once before all tests
export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  // Set up test environment with comprehensive mocking
  await setupTestEnvironment({
    mockDatabase: true,
    mockExternalServices: true,
    loadTestData: false, // Only load when needed per test
    silenceConsole: process.env.CI === 'true', // Silence in CI
    networkDelay: 0,
    simulateErrors: false
  });

  // Configure global test environment
  global.testConfig = {
    defaultTimeout: 30000,
    retryCount: 2,
    performanceThresholds: {
      api_call: 1000, // 1 second
      database_query: 500, // 0.5 seconds
      component_render: 200, // 0.2 seconds
      integration_test: 5000 // 5 seconds
    }
  };

  // Set up performance monitoring
  if (!global.performance) {
    const { performance } = require('perf_hooks');
    global.performance = performance;
  }

  // Initialize test database if needed
  if (process.env.TEST_DB_URL) {
    console.log('🗄️ Initializing test database...');
    // Add database initialization logic here if needed
  }

  // Set up global error handling
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection in tests:', reason);
    // Don't exit process in tests, just log
  });

  // Global cleanup function
  const cleanup = async () => {
    console.log('🧹 Running global test cleanup...');
    await cleanupTestEnvironment();
  };

  console.log('✅ Global test setup completed');

  return cleanup;
}

// Enhanced matchers for testing
declare global {
  namespace Vi {
    interface AsymmetricMatchersContaining {
      toBeValidProduct(): any;
      toBeValidSale(): any;
      toBeValidPurchaseOrder(): any;
      toHaveValidVATCalculation(): any;
      toBeWithinPerformanceThreshold(threshold: number): any;
    }
  }

  var testConfig: {
    defaultTimeout: number;
    retryCount: number;
    performanceThresholds: Record<string, number>;
  };
}

// Export setup utilities for individual tests
export const testUtils = {
  // Wait for async operations
  waitFor: (condition: () => boolean, timeout = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - start >= timeout) {
          reject(new Error(`Condition not met within ${timeout}ms`));
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  },

  // Measure operation performance
  measurePerformance: async <T>(
    operation: () => Promise<T>, 
    name: string
  ): Promise<T & { __duration: number }> => {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    const duration = end - start;

    return {
      ...result,
      __duration: duration
    } as T & { __duration: number };
  },

  // Generate test IDs
  generateTestId: (prefix = 'test'): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Create mock timer
  createMockTimer: () => {
    let currentTime = 0;
    return {
      now: () => currentTime,
      advance: (ms: number) => { currentTime += ms; },
      reset: () => { currentTime = 0; }
    };
  }
};