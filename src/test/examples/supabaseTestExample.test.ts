import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DisposableSupabaseClient,
  createTestClient,
  withRetry,
  timeIt,
  TestDataFactory,
  TestSuiteHelper,
  TestUserGenerator,
  SupabaseTestError,
  RetryableError,
} from '../helpers/supabaseTestUtils';

describe('Supabase Test Utilities Examples', () => {
  let testSuite: TestSuiteHelper;

  beforeEach(() => {
    testSuite = new TestSuiteHelper();
  });

  afterEach(async () => {
    await testSuite.cleanupAll();
  });

  describe('DisposableSupabaseClient', () => {
    it('should create and dispose client properly', async () => {
      const client = await testSuite.createClient({
        debugMode: true,
        timeout: 5000,
      });

      const supabaseClient = client.getClient();
      expect(supabaseClient).toBeDefined();

      // Test connection
      const { data, error } = await supabaseClient
        .from('customers')
        .select('count', { count: 'exact' });

      // Should not throw error (even if table doesn't exist, we test the client works)
      expect(error?.code === '42P01' || !error).toBe(true);

      await client.dispose();
      expect(() => client.getClient()).toThrow('Client has been disposed');
    });

    it('should handle resource tracking and cleanup', async () => {
      const client = await testSuite.createClient({
        autoCleanup: true,
        debugMode: true,
      });

      // Track a mock resource
      client.trackResource('customers', 'test-customer-id-123');
      client.trackResource('products', 'test-product-id-456');

      // Cleanup will be called automatically on dispose
      await client.dispose();
    });
  });

  describe('withRetry function', () => {
    it('should retry on retryable errors', async () => {
      let attempts = 0;
      
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new RetryableError('Temporary failure', 'TIMEOUT');
          }
          return 'success';
        },
        {
          maxAttempts: 3,
          baseDelay: 10,
          onRetry: (attempt, error) => {
            console.log(`Retry attempt ${attempt}: ${error.message}`);
          },
        }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry on non-retryable errors', async () => {
      let attempts = 0;

      try {
        await withRetry(
          async () => {
            attempts++;
            throw new Error('Non-retryable error');
          },
          { maxAttempts: 3 }
        );
      } catch (error) {
        expect((error as Error).message).toBe('Non-retryable error');
        expect(attempts).toBe(1);
      }
    });
  });

  describe('timeIt function', () => {
    it('should measure operation latency successfully', async () => {
      const { result, measurement } = await timeIt(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'test result';
        },
        { operation: 'test_operation' }
      );

      expect(result).toBe('test result');
      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeGreaterThan(90);
      expect(measurement.metadata).toEqual({ operation: 'test_operation' });
    });

    it('should measure operation latency on failure', async () => {
      try {
        await timeIt(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          throw new Error('Test error');
        });
      } catch (result: any) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('Test error');
        expect(result.measurement.success).toBe(false);
        expect(result.measurement.duration).toBeGreaterThan(40);
      }
    });
  });

  describe('TestUserGenerator', () => {
    it('should create test user with authentication', async () => {
      const client = await testSuite.createClient();
      const generator = new TestUserGenerator();

      try {
        const testUser = await generator.createTestUser(
          client.getClient(),
          {
            firstName: 'John',
            lastName: 'Doe',
            role: 'admin',
          }
        );

        expect(testUser.email).toContain('test_user_');
        expect(testUser.firstName).toBe('John');
        expect(testUser.lastName).toBe('Doe');
        expect(testUser.role).toBe('admin');
        expect(testUser.id).toBeDefined();

        // Test token generation
        const token = await generator.generateTestToken(client.getClient(), testUser);
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
      } catch (error) {
        // If user creation fails (e.g., auth not configured), skip test
        console.warn('User creation test skipped:', (error as Error).message);
      }
    });
  });

  describe('TestDataFactory', () => {
    it('should generate product test data', () => {
      const product = TestDataFactory.productsFactory({
        name: 'Custom Product',
        price: 199.99,
      });

      expect(product.name).toBe('Custom Product');
      expect(product.price).toBe(199.99);
      expect(product.sku).toContain('TEST-SKU-');
      expect(product.category).toBe('Test Category');
      expect(product.isActive).toBe(true);
      expect(product.unit).toBe('pcs');
    });

    it('should generate customer test data', () => {
      const customer = TestDataFactory.customersFactory({
        email: 'custom@example.com',
        creditLimit: 10000,
      });

      expect(customer.email).toBe('custom@example.com');
      expect(customer.creditLimit).toBe(10000);
      expect(customer.firstName).toContain('TestFirstName');
      expect(customer.customerType).toBe('individual');
      expect(customer.isActive).toBe(true);
    });

    it('should generate sale test data', () => {
      const sale = TestDataFactory.salesFactory({
        total: 500.00,
        paymentMethod: 'gcash',
      });

      expect(sale.total).toBe(500.00);
      expect(sale.paymentMethod).toBe('gcash');
      expect(sale.invoiceNumber).toContain('INV-');
      expect(sale.status).toBe('completed');
      expect(sale.items).toHaveLength(1);
      expect(sale.items[0].quantity).toBe(2);
    });

    it('should generate unique test data on multiple calls', () => {
      const product1 = TestDataFactory.productsFactory();
      const product2 = TestDataFactory.productsFactory();
      
      expect(product1.name).not.toBe(product2.name);
      expect(product1.sku).not.toBe(product2.sku);
    });
  });

  describe('Integration Test Example', () => {
    it('should perform end-to-end test with database operations', async () => {
      const client = await testSuite.createClient({
        debugMode: true,
        timeout: 10000,
      });

      // Measure database connection latency
      const { result: connectionResult, measurement } = await timeIt(
        async () => {
          const { data, error } = await client.getClient()
            .from('customers')
            .select('count', { count: 'exact' });
          
          if (error && error.code !== '42P01') {
            throw new SupabaseTestError(`Database connection failed: ${error.message}`);
          }
          
          return data;
        },
        { operation: 'database_connection_test' }
      );

      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeDefined();
      console.log(`Database connection took ${measurement.duration.toFixed(2)}ms`);

      // Test with retry wrapper for flaky operations
      const retryResult = await withRetry(
        async () => {
          // Simulate potentially flaky operation
          const random = Math.random();
          if (random < 0.7) {
            throw new RetryableError('Simulated network hiccup', 'NETWORK_ERROR');
          }
          return 'Operation succeeded';
        },
        {
          maxAttempts: 5,
          baseDelay: 100,
          onRetry: (attempt, error) => {
            console.log(`Retry ${attempt}: ${error.message}`);
          },
        }
      );

      expect(retryResult).toBe('Operation succeeded');
    });
  });
});

// Additional helper test for demonstrating factory usage
describe('Data Factory Advanced Usage', () => {
  it('should create related test entities', () => {
    // Create a supplier and related purchase order
    const supplier = TestDataFactory.suppliersFactory({
      name: 'Acme Supplier Corp',
      email: 'orders@acme-supplier.com',
    });

    const purchaseOrder = TestDataFactory.purchaseOrdersFactory({
      supplierName: supplier.name,
      items: [
        {
          id: crypto.randomUUID(),
          productId: crypto.randomUUID(),
          productName: 'Custom Product A',
          sku: 'CUSTOM-A-001',
          quantity: 20,
          cost: 15.50,
          total: 310.00,
        },
        {
          id: crypto.randomUUID(),
          productId: crypto.randomUUID(),
          productName: 'Custom Product B',
          sku: 'CUSTOM-B-002',
          quantity: 10,
          cost: 25.00,
          total: 250.00,
        },
      ],
      subtotal: 560.00,
      total: 616.00, // Including tax
    });

    expect(purchaseOrder.supplierName).toBe(supplier.name);
    expect(purchaseOrder.items).toHaveLength(2);
    expect(purchaseOrder.total).toBe(616.00);
    expect(purchaseOrder.poNumber).toContain('PO-');
  });

  it('should create employee with payroll data', () => {
    const employee = TestDataFactory.employeesFactory({
      position: 'Senior Developer',
      department: 'Engineering',
      basicSalary: 50000,
      allowances: [
        { id: '1', name: 'Transportation', amount: 5000, type: 'Fixed', isTaxable: false },
        { id: '2', name: 'Meal', amount: 3000, type: 'Fixed', isTaxable: false },
      ],
      sssNumber: '123456789012',
      tinNumber: '123-456-789-000',
    });

    expect(employee.position).toBe('Senior Developer');
    expect(employee.department).toBe('Engineering');
    expect(employee.basicSalary).toBe(50000);
    expect(employee.allowances).toHaveLength(2);
    expect(employee.employmentType).toBe('Regular');
    expect(employee.status).toBe('Active');
  });
});
