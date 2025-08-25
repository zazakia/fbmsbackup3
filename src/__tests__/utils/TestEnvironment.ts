import { beforeEach, afterEach, vi } from 'vitest';
import { TestDataFactory } from './TestDataFactory';

// Database isolation and cleanup utilities
export class TestEnvironment {
  private static mockData: Map<string, any[]> = new Map();
  private static originalConsole = { ...console };

  // Setup test environment
  static async setup(options: TestEnvironmentOptions = {}) {
    const {
      mockDatabase = true,
      mockExternalServices = true,
      loadTestData = false,
      testDataScale = 'small',
      silenceConsole = false,
      networkDelay = 0,
      simulateErrors = false
    } = options;

    if (silenceConsole) {
      this.silenceConsole();
    }

    if (mockDatabase) {
      this.setupDatabaseMocks();
    }

    if (mockExternalServices) {
      this.setupExternalServiceMocks(networkDelay, simulateErrors);
    }

    if (loadTestData) {
      await this.loadTestData(testDataScale);
    }

    return this;
  }

  // Cleanup test environment
  static async cleanup() {
    this.restoreConsole();
    this.clearMockData();
    vi.restoreAllMocks();
    TestDataFactory.resetAllSequences();
  }

  // Database Mock Setup
  private static setupDatabaseMocks() {
    const mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          const data = this.mockData.get(table) || [];
          return Promise.resolve({ 
            data: data.length > 0 ? data[0] : null, 
            error: null 
          });
        }),
        // Add more sophisticated mock behavior
        mockResolvedValue: (value: any) => {
          return Promise.resolve(value);
        }
      })),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user', email: 'test@example.com' } },
          error: null
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user' }, session: { access_token: 'mock-token' } },
          error: null
        }),
        signOut: vi.fn().mockResolvedValue({ error: null })
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
          download: vi.fn().mockResolvedValue({ data: new Blob(), error: null })
        }))
      }
    };

    vi.mock('@supabase/supabase-js', () => ({
      createClient: () => mockSupabase
    }));

    vi.mock('../../utils/supabase', () => ({
      supabase: mockSupabase
    }));
  }

  // External Services Mock Setup
  private static setupExternalServiceMocks(networkDelay: number, simulateErrors: boolean) {
    // Payment service mocks
    const mockPaymentService = {
      processPayment: vi.fn().mockImplementation(async (amount: number, method: string) => {
        if (networkDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, networkDelay));
        }
        
        if (simulateErrors && Math.random() < 0.1) {
          throw new Error('Payment processing failed');
        }

        return {
          success: true,
          transactionId: `txn-${Date.now()}`,
          amount,
          method
        };
      }),
      refundPayment: vi.fn().mockResolvedValue({ success: true })
    };

    // Notification service mocks
    const mockNotificationService = {
      sendEmail: vi.fn().mockResolvedValue({ success: true }),
      sendSMS: vi.fn().mockResolvedValue({ success: true }),
      sendPushNotification: vi.fn().mockResolvedValue({ success: true })
    };

    // Audit service mocks
    const mockAuditService = {
      logActivity: vi.fn().mockResolvedValue({ success: true }),
      logError: vi.fn().mockResolvedValue({ success: true })
    };

    vi.mock('../../services/paymentService', () => mockPaymentService);
    vi.mock('../../services/notificationService', () => mockNotificationService);
    vi.mock('../../services/auditService', () => ({
      auditService: mockAuditService
    }));
  }

  // Load test data
  private static async loadTestData(scale: 'small' | 'medium' | 'large') {
    const testData = TestDataFactory.createRealisticInventoryData(scale);
    
    this.mockData.set('products', testData.products);
    this.mockData.set('customers', testData.customers);
    this.mockData.set('sales', testData.sales);
    this.mockData.set('purchase_orders', testData.purchaseOrders);
    this.mockData.set('suppliers', testData.suppliers);
    this.mockData.set('users', testData.users);
    this.mockData.set('accounts', testData.accounts);
    this.mockData.set('employees', testData.employees);
  }

  // Console management
  private static silenceConsole() {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.info = vi.fn();
  }

  private static restoreConsole() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
  }

  // Mock data management
  static setMockData(table: string, data: any[]) {
    this.mockData.set(table, data);
  }

  static getMockData(table: string): any[] {
    return this.mockData.get(table) || [];
  }

  static clearMockData() {
    this.mockData.clear();
  }

  static addMockRecord(table: string, record: any) {
    const existing = this.getMockData(table);
    existing.push(record);
    this.setMockData(table, existing);
  }

  static updateMockRecord(table: string, id: string, updates: any) {
    const existing = this.getMockData(table);
    const index = existing.findIndex(item => item.id === id);
    if (index !== -1) {
      existing[index] = { ...existing[index], ...updates };
      this.setMockData(table, existing);
    }
  }

  static deleteMockRecord(table: string, id: string) {
    const existing = this.getMockData(table);
    const filtered = existing.filter(item => item.id !== id);
    this.setMockData(table, filtered);
  }

  // Database transaction simulation
  static async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    const snapshot = new Map(this.mockData);
    
    try {
      const result = await callback();
      return result;
    } catch (error) {
      // Rollback on error
      this.mockData = snapshot;
      throw error;
    }
  }

  // Performance monitoring
  static measurePerformance<T>(operation: () => Promise<T>, name: string): Promise<T & { __performanceMetrics: { duration: number; name: string } }> {
    return new Promise(async (resolve, reject) => {
      const startTime = performance.now();
      
      try {
        const result = await operation();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log performance if it exceeds threshold
        if (duration > 1000) {
          console.warn(`Performance warning: ${name} took ${duration}ms`);
        }

        resolve({
          ...result,
          __performanceMetrics: { duration, name }
        } as T & { __performanceMetrics: { duration: number; name: string } });
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.error(`Performance error in ${name} after ${duration}ms:`, error);
        reject(error);
      }
    });
  }

  // Data validation utilities
  static validateDataConsistency(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check referential integrity
    const products = this.getMockData('products');
    const sales = this.getMockData('sales');
    const purchaseOrders = this.getMockData('purchase_orders');

    // Validate sale items reference existing products
    sales.forEach(sale => {
      sale.items?.forEach((item: any) => {
        if (!products.find(p => p.id === item.productId)) {
          errors.push(`Sale ${sale.id} references non-existent product ${item.productId}`);
        }
      });
    });

    // Validate purchase order items reference existing products
    purchaseOrders.forEach(po => {
      po.items?.forEach((item: any) => {
        if (!products.find(p => p.id === item.productId)) {
          errors.push(`Purchase Order ${po.id} references non-existent product ${item.productId}`);
        }
      });
    });

    // Check for negative stock
    products.forEach(product => {
      if (product.stock < 0) {
        warnings.push(`Product ${product.id} has negative stock: ${product.stock}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      dataConsistency: {
        totalProducts: products.length,
        totalSales: sales.length,
        totalPurchaseOrders: purchaseOrders.length,
        referencialIntegrityViolations: errors.length
      }
    };
  }
}

// Test environment configuration
export interface TestEnvironmentOptions {
  mockDatabase?: boolean;
  mockExternalServices?: boolean;
  loadTestData?: boolean;
  testDataScale?: 'small' | 'medium' | 'large';
  silenceConsole?: boolean;
  networkDelay?: number;
  simulateErrors?: boolean;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dataConsistency: {
    totalProducts: number;
    totalSales: number;
    totalPurchaseOrders: number;
    referencialIntegrityViolations: number;
  };
}

// Convenient test utilities
export const setupTestEnvironment = (options?: TestEnvironmentOptions) => {
  return TestEnvironment.setup(options);
};

export const cleanupTestEnvironment = () => {
  return TestEnvironment.cleanup();
};

export const expectValidationResult = (result: ValidationResult, maxErrors: number = 0) => {
  if (result.errors.length > maxErrors) {
    throw new Error(`Validation failed with ${result.errors.length} errors: ${result.errors.join(', ')}`);
  }
};

export const expectPerformanceThreshold = (operation: string, duration: number, threshold: number) => {
  if (duration > threshold) {
    throw new Error(`Performance threshold exceeded for ${operation}: ${duration}ms > ${threshold}ms`);
  }
};

// Test hooks for common scenarios
export const useTestEnvironment = (options?: TestEnvironmentOptions) => {
  beforeEach(async () => {
    await setupTestEnvironment(options);
  });

  afterEach(async () => {
    await cleanupTestEnvironment();
  });
};

export const useTransactionalTests = () => {
  let snapshot: Map<string, any[]>;

  beforeEach(() => {
    snapshot = new Map(TestEnvironment['mockData']);
  });

  afterEach(() => {
    TestEnvironment['mockData'] = snapshot;
  });
};

export const usePerformanceTests = (thresholds: Record<string, number> = {}) => {
  const defaultThresholds = {
    api_call: 1000,
    database_query: 500,
    component_render: 200,
    ...thresholds
  };

  return {
    measureApiCall: <T>(operation: () => Promise<T>) => 
      TestEnvironment.measurePerformance(operation, 'api_call'),
    
    measureDatabaseQuery: <T>(operation: () => Promise<T>) => 
      TestEnvironment.measurePerformance(operation, 'database_query'),
    
    measureComponentRender: <T>(operation: () => Promise<T>) => 
      TestEnvironment.measurePerformance(operation, 'component_render'),
    
    expectWithinThreshold: (operation: string, duration: number) => {
      const threshold = defaultThresholds[operation] || 1000;
      expectPerformanceThreshold(operation, duration, threshold);
    }
  };
};