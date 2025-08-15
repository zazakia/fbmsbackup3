import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';
import { 
  Customer, 
  Product, 
  Sale, 
  User, 
  PurchaseOrder, 
  Supplier,
  Employee,
  Expense
} from '../../types/business';

// Environment configuration for testing
const TEST_CONFIG = {
  DEFAULT_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 100,
  TEST_USER_PREFIX: 'test_user_',
  CLEANUP_ON_ERROR: true,
} as const;

// Custom error types for better error handling
export class SupabaseTestError extends Error {
  constructor(message: string, public code?: string, public cause?: Error) {
    super(message);
    this.name = 'SupabaseTestError';
  }
}

export class RetryableError extends SupabaseTestError {
  constructor(message: string, code?: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'RetryableError';
  }
}

// Types for test configuration
export interface TestClientOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  autoCleanup?: boolean;
  sessionPersistence?: boolean;
  debugMode?: boolean;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

export interface TestUserData {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  token?: string;
  createdAt: Date;
}

export interface LatencyMeasurement {
  duration: number;
  success: boolean;
  error?: Error;
  metadata?: Record<string, unknown>;
}

// Disposable Supabase client with enhanced features
export class DisposableSupabaseClient {
  private client: SupabaseClient<Database>;
  private options: TestClientOptions;
  private createdResources: Array<{ table: string; id: string }> = [];
  private isDisposed = false;

  constructor(options: TestClientOptions = {}) {
    this.options = {
      timeout: TEST_CONFIG.DEFAULT_TIMEOUT,
      maxRetries: TEST_CONFIG.RETRY_ATTEMPTS,
      retryDelay: TEST_CONFIG.RETRY_DELAY_BASE,
      autoCleanup: true,
      sessionPersistence: false,
      debugMode: false,
      ...options,
    };

    // Get environment variables
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || 
                       process.env.VITE_SUPABASE_URL ||
                       import.meta.env?.VITE_PUBLIC_SUPABASE_URL ||
                       import.meta.env?.VITE_SUPABASE_URL;

    const supabaseKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || 
                       process.env.VITE_SUPABASE_ANON_KEY ||
                       import.meta.env?.VITE_PUBLIC_SUPABASE_ANON_KEY ||
                       import.meta.env?.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new SupabaseTestError(
        'Missing Supabase configuration. Please set VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY environment variables.'
      );
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: this.options.sessionPersistence,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        fetch: this.createFetchWithTimeout(),
      },
    });

    if (this.options.debugMode) {
      console.log('🔧 DisposableSupabaseClient created with options:', this.options);
    }
  }

  private createFetchWithTimeout() {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
      
      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new RetryableError(`Request timeout after ${this.options.timeout}ms`, 'TIMEOUT');
        }
        throw error;
      }
    };
  }

  // Get the underlying Supabase client
  getClient(): SupabaseClient<Database> {
    if (this.isDisposed) {
      throw new SupabaseTestError('Client has been disposed');
    }
    return this.client;
  }

  // Track created resources for cleanup
  trackResource(table: string, id: string) {
    this.createdResources.push({ table, id });
  }

  // Clean up all created resources
  async cleanup(): Promise<void> {
    if (this.options.debugMode) {
      console.log('🧹 Cleaning up resources:', this.createdResources);
    }

    for (const resource of this.createdResources.reverse()) {
      try {
        await this.client.from(resource.table).delete().eq('id', resource.id);
      } catch (error) {
        if (this.options.debugMode) {
          console.warn(`Failed to clean up ${resource.table}:${resource.id}:`, error);
        }
      }
    }
    
    this.createdResources = [];
  }

  // Dispose of the client and clean up
  async dispose(): Promise<void> {
    if (this.isDisposed) return;

    if (this.options.autoCleanup) {
      await this.cleanup();
    }

    // Sign out if there's an active session
    try {
      await this.client.auth.signOut();
    } catch (error) {
      if (this.options.debugMode) {
        console.warn('Failed to sign out during disposal:', error);
      }
    }

    this.isDisposed = true;
  }
}

// Factory function for creating disposable clients
export function createTestClient(options: TestClientOptions = {}): DisposableSupabaseClient {
  return new DisposableSupabaseClient(options);
}

// Retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = TEST_CONFIG.RETRY_ATTEMPTS,
    baseDelay = TEST_CONFIG.RETRY_DELAY_BASE,
    maxDelay = 5000,
    backoffMultiplier = 2,
    retryableErrors = ['TIMEOUT', 'NETWORK_ERROR', 'RATE_LIMIT', 'TEMPORARY_ERROR'],
    onRetry,
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const isRetryable = error instanceof RetryableError || 
                         retryableErrors.some(code => 
                           lastError.message.includes(code) ||
                           (error as any).code === code
                         );

      if (!isRetryable || attempt === maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
      
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Latency measurement utility
export async function timeIt<T>(
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<{ result: T; measurement: LatencyMeasurement }> {
  const startTime = performance.now();
  let success = false;
  let error: Error | undefined;
  let result: T;

  try {
    result = await operation();
    success = true;
    return {
      result,
      measurement: {
        duration: performance.now() - startTime,
        success,
        metadata,
      },
    };
  } catch (err) {
    error = err as Error;
    throw {
      error,
      measurement: {
        duration: performance.now() - startTime,
        success,
        error,
        metadata,
      },
    };
  }
}

// Test user generator
export class TestUserGenerator {
  private userCount = 0;

  async createTestUser(client: SupabaseClient, overrides: Partial<TestUserData> = {}): Promise<TestUserData> {
    this.userCount++;
    const timestamp = Date.now();
    
    const userData: TestUserData = {
      id: crypto.randomUUID(),
      email: `${TEST_CONFIG.TEST_USER_PREFIX}${timestamp}_${this.userCount}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: `User${this.userCount}`,
      role: 'employee',
      createdAt: new Date(),
      ...overrides,
    };

    try {
      // Create auth user
      const { data: authData, error: authError } = await client.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) {
        throw new SupabaseTestError(`Failed to create auth user: ${authError.message}`, authError.code);
      }

      if (authData.user) {
        userData.id = authData.user.id;
      }

      // Create user profile if users table exists
      try {
        const { error: profileError } = await client.from('users').insert({
          id: userData.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: userData.role,
          is_active: true,
        });

        if (profileError && profileError.code !== '42P01') { // Ignore table not found
          console.warn('Failed to create user profile:', profileError);
        }
      } catch (error) {
        // Ignore profile creation errors as table might not exist
      }

      return userData;
    } catch (error) {
      throw new SupabaseTestError(`Failed to create test user: ${(error as Error).message}`);
    }
  }

  async generateTestToken(client: SupabaseClient, user: TestUserData): Promise<string> {
    const { data, error } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (error) {
      throw new SupabaseTestError(`Failed to generate token: ${error.message}`, error.code);
    }

    return data.session?.access_token || '';
  }
}

// Factory functions for test data
export class TestDataFactory {
  private static counter = 0;

  private static getNextId(): number {
    return ++TestDataFactory.counter;
  }

  static productsFactory(overrides: Partial<Product> = {}): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> {
    const id = TestDataFactory.getNextId();
    return {
      name: `Test Product ${id}`,
      description: `Test product description ${id}`,
      sku: `TEST-SKU-${id}`,
      barcode: `12345670${id}`,
      category: 'Test Category',
      categoryId: crypto.randomUUID(),
      price: 99.99 + id,
      cost: 49.99 + id,
      stock: 100 + id,
      minStock: 10 + id,
      reorderQuantity: 50,
      unit: 'pcs',
      isActive: true,
      soldQuantity: 0,
      weight: 1.5,
      dimensions: {
        length: 10,
        width: 8,
        height: 5,
      },
      supplier: 'Test Supplier',
      location: 'A1-B2',
      tags: ['test', 'product'],
      images: [],
      ...overrides,
    };
  }

  static customersFactory(overrides: Partial<Customer> = {}): Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> {
    const id = TestDataFactory.getNextId();
    return {
      firstName: `TestFirstName${id}`,
      lastName: `TestLastName${id}`,
      email: `testcustomer${id}@example.com`,
      phone: `+1234567${String(id).padStart(4, '0')}`,
      address: `${id} Test Street`,
      city: 'Test City',
      province: 'Test Province',
      zipCode: `1000${id}`,
      creditLimit: 5000,
      currentBalance: 0,
      totalPurchases: 0,
      isActive: true,
      customerType: 'individual',
      discountPercentage: 0,
      loyaltyPoints: 0,
      preferredPaymentMethod: 'cash',
      notes: `Test customer ${id} notes`,
      tags: ['test'],
      ...overrides,
    };
  }

  static salesFactory(overrides: Partial<Sale> = {}): Omit<Sale, 'id' | 'createdAt'> {
    const id = TestDataFactory.getNextId();
    return {
      invoiceNumber: `INV-${Date.now()}-${id}`,
      customerId: crypto.randomUUID(),
      customerName: `Test Customer ${id}`,
      items: [
        {
          id: crypto.randomUUID(),
          productId: crypto.randomUUID(),
          productName: `Test Product ${id}`,
          sku: `TEST-${id}`,
          quantity: 2,
          price: 50.00,
          total: 100.00,
        },
      ],
      subtotal: 100.00,
      tax: 12.00,
      discount: 0,
      total: 112.00,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      status: 'completed',
      cashierId: crypto.randomUUID(),
      notes: `Test sale ${id}`,
      ...overrides,
    };
  }

  static suppliersFactory(overrides: Partial<Supplier> = {}): Omit<Supplier, 'id' | 'createdAt'> {
    const id = TestDataFactory.getNextId();
    return {
      name: `Test Supplier ${id}`,
      contactPerson: `Contact Person ${id}`,
      email: `supplier${id}@example.com`,
      phone: `+1234567${String(id).padStart(4, '0')}`,
      address: `${id} Supplier Street`,
      city: 'Supplier City',
      province: 'Supplier Province',
      zipCode: `2000${id}`,
      isActive: true,
      ...overrides,
    };
  }

  static purchaseOrdersFactory(overrides: Partial<PurchaseOrder> = {}): Omit<PurchaseOrder, 'id' | 'createdAt'> {
    const id = TestDataFactory.getNextId();
    return {
      poNumber: `PO-${Date.now()}-${id}`,
      supplierId: crypto.randomUUID(),
      supplierName: `Test Supplier ${id}`,
      items: [
        {
          id: crypto.randomUUID(),
          productId: crypto.randomUUID(),
          productName: `Test Product ${id}`,
          sku: `TEST-${id}`,
          quantity: 10,
          cost: 25.00,
          total: 250.00,
        },
      ],
      subtotal: 250.00,
      tax: 30.00,
      total: 280.00,
      status: 'draft',
      enhancedStatus: 'draft',
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdBy: crypto.randomUUID(),
      ...overrides,
    };
  }

  static employeesFactory(overrides: Partial<Employee> = {}): Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> {
    const id = TestDataFactory.getNextId();
    return {
      employeeId: `EMP-${String(id).padStart(4, '0')}`,
      firstName: `TestEmployee${id}`,
      lastName: `LastName${id}`,
      middleName: `Middle${id}`,
      email: `employee${id}@company.com`,
      phone: `+1234567${String(id).padStart(4, '0')}`,
      address: `${id} Employee Street`,
      city: 'Employee City',
      province: 'Employee Province',
      zipCode: `3000${id}`,
      birthDate: new Date(1990, 0, id),
      hireDate: new Date(),
      position: 'Test Position',
      department: 'Test Department',
      employmentType: 'Regular',
      status: 'Active',
      basicSalary: 25000 + id * 1000,
      allowances: [],
      emergencyContact: {
        name: `Emergency Contact ${id}`,
        relationship: 'Spouse',
        phone: `+1234567${String(id + 1000).padStart(4, '0')}`,
      },
      ...overrides,
    };
  }

  static expensesFactory(overrides: Partial<Expense> = {}): Omit<Expense, 'id' | 'createdAt'> {
    const id = TestDataFactory.getNextId();
    return {
      description: `Test Expense ${id}`,
      category: 'Office Supplies',
      amount: 500 + id * 10,
      taxAmount: 60 + id,
      totalAmount: 560 + id * 11,
      date: new Date(),
      vendor: `Test Vendor ${id}`,
      paymentMethod: 'cash',
      status: 'pending',
      notes: `Test expense notes ${id}`,
      isRecurring: false,
      createdBy: crypto.randomUUID(),
      ...overrides,
    };
  }

  static usersFactory(overrides: Partial<User> = {}): Omit<User, 'id' | 'createdAt'> {
    const id = TestDataFactory.getNextId();
    return {
      email: `testuser${id}@example.com`,
      firstName: `TestUser${id}`,
      lastName: `LastName${id}`,
      role: 'employee',
      department: 'Test Department',
      isActive: true,
      ...overrides,
    };
  }
}

// Test suite helper
export class TestSuiteHelper {
  private clients: DisposableSupabaseClient[] = [];
  private userGenerator = new TestUserGenerator();

  async createClient(options?: TestClientOptions): Promise<DisposableSupabaseClient> {
    const client = createTestClient(options);
    this.clients.push(client);
    return client;
  }

  async createTestUser(client?: SupabaseClient, overrides?: Partial<TestUserData>): Promise<TestUserData> {
    const activeClient = client || (this.clients[0]?.getClient());
    if (!activeClient) {
      throw new SupabaseTestError('No active client available for user creation');
    }
    return this.userGenerator.createTestUser(activeClient, overrides);
  }

  async cleanupAll(): Promise<void> {
    await Promise.allSettled(
      this.clients.map(client => client.dispose())
    );
    this.clients = [];
  }
}

// Export commonly used utilities
export const testUtils = {
  createClient: createTestClient,
  withRetry,
  timeIt,
  TestDataFactory,
  TestSuiteHelper,
};

// Default export with all utilities
export default {
  DisposableSupabaseClient,
  createTestClient,
  withRetry,
  timeIt,
  TestUserGenerator,
  TestDataFactory,
  TestSuiteHelper,
  testUtils,
  SupabaseTestError,
  RetryableError,
};
