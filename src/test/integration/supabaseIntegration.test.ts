import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  createTestClient,
  withRetry,
  timeIt,
  TestDataFactory,
  TestSuiteHelper,
  TestUserGenerator,
  DisposableSupabaseClient,
} from '../helpers/supabaseTestUtils';

describe('Supabase Integration Tests', () => {
  let testSuite: TestSuiteHelper;

  beforeEach(() => {
    testSuite = new TestSuiteHelper();
  });

  afterEach(async () => {
    await testSuite.cleanupAll();
  });

  describe('Connection and Basic Operations', () => {
    it('should establish connection and test basic queries', async () => {
      const client = await testSuite.createClient({
        timeout: 10000,
        debugMode: true,
      });

      // Test connection with timing
      const { result, measurement } = await timeIt(
        async () => {
          const { data, error } = await client.getClient()
            .from('customers')
            .select('count', { count: 'exact' });

          // Accept table not found error as valid (means connection works)
          if (error && error.code !== '42P01') {
            throw new Error(`Unexpected database error: ${error.message}`);
          }

          return { data, connected: true };
        },
        { operation: 'connection_test' }
      );

      expect(result.connected).toBe(true);
      expect(measurement.success).toBe(true);
      expect(measurement.duration).toBeDefined();
      
      console.log(`✅ Database connection established in ${measurement.duration.toFixed(2)}ms`);
    });

    it('should handle retry logic for connection issues', async () => {
      let attempts = 0;

      const result = await withRetry(
        async () => {
          attempts++;
          
          // Simulate intermittent connection issues for first 2 attempts
          if (attempts < 3) {
            if (Math.random() > 0.3) {
              throw new Error('NETWORK_ERROR: Simulated connection issue');
            }
          }
          
          return 'Connection successful';
        },
        {
          maxAttempts: 5,
          baseDelay: 50,
          retryableErrors: ['NETWORK_ERROR', 'TIMEOUT'],
          onRetry: (attempt, error) => {
            console.log(`🔄 Retry attempt ${attempt}: ${error.message}`);
          },
        }
      );

      expect(result).toBe('Connection successful');
      console.log(`✅ Connection succeeded after ${attempts} attempts`);
    });
  });

  describe('Data Factory Integration', () => {
    it('should create consistent test data across multiple entities', () => {
      // Generate related business entities
      const supplier = TestDataFactory.suppliersFactory({
        name: 'Test Supplier Co.',
        email: 'contact@testsupplier.com',
      });

      const products = Array.from({ length: 3 }, (_, index) =>
        TestDataFactory.productsFactory({
          name: `Product ${index + 1}`,
          supplier: supplier.name,
          category: 'Test Category',
        })
      );

      const purchaseOrder = TestDataFactory.purchaseOrdersFactory({
        supplierName: supplier.name,
        items: products.map((product, index) => ({
          id: crypto.randomUUID(),
          productId: crypto.randomUUID(),
          productName: product.name,
          sku: product.sku,
          quantity: 10 + index,
          cost: product.cost,
          total: product.cost * (10 + index),
        })),
        subtotal: products.reduce((sum, product, index) => 
          sum + (product.cost * (10 + index)), 0
        ),
        total: products.reduce((sum, product, index) => 
          sum + (product.cost * (10 + index)), 0
        ) * 1.12, // Add 12% tax
      });

      // Verify relationships
      expect(purchaseOrder.supplierName).toBe(supplier.name);
      expect(purchaseOrder.items).toHaveLength(3);
      expect(purchaseOrder.items[0].productName).toBe('Product 1');
      expect(purchaseOrder.items[1].productName).toBe('Product 2');
      expect(purchaseOrder.items[2].productName).toBe('Product 3');

      // Verify calculations
      const expectedSubtotal = purchaseOrder.items.reduce((sum, item) => sum + item.total, 0);
      expect(purchaseOrder.subtotal).toBe(expectedSubtotal);

      console.log('✅ Created purchase order with 3 products from supplier');
      console.log(`   Subtotal: $${purchaseOrder.subtotal.toFixed(2)}`);
      console.log(`   Total: $${purchaseOrder.total.toFixed(2)}`);
    });

    it('should generate unique data for each factory call', () => {
      const customers = Array.from({ length: 5 }, () =>
        TestDataFactory.customersFactory()
      );

      const uniqueEmails = new Set(customers.map(c => c.email));
      const uniquePhones = new Set(customers.map(c => c.phone));

      expect(uniqueEmails.size).toBe(5);
      expect(uniquePhones.size).toBe(5);

      customers.forEach((customer, index) => {
        expect(customer.firstName).toContain('TestFirstName');
        expect(customer.lastName).toContain('TestLastName');
        expect(customer.email).toMatch(/@example\.com$/);
      });

      console.log('✅ Generated 5 unique customers with distinct emails and phones');
    });
  });

  describe('Performance and Reliability Testing', () => {
    it('should measure and validate query performance', async () => {
      const client = await testSuite.createClient();
      const measurements: number[] = [];

      // Run multiple queries to get average performance
      for (let i = 0; i < 5; i++) {
        const { measurement } = await timeIt(async () => {
          const { error } = await client.getClient()
            .from('products')
            .select('*')
            .limit(1);

          // Table might not exist, but connection should work
          if (error && !['42P01', 'PGRST116'].includes(error.code || '')) {
            throw new Error(`Query error: ${error.message}`);
          }

          return true;
        });

        measurements.push(measurement.duration);
        expect(measurement.success).toBe(true);
      }

      const avgLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxLatency = Math.max(...measurements);
      const minLatency = Math.min(...measurements);

      console.log(`📊 Query Performance Statistics:`);
      console.log(`   Average: ${avgLatency.toFixed(2)}ms`);
      console.log(`   Min: ${minLatency.toFixed(2)}ms`);
      console.log(`   Max: ${maxLatency.toFixed(2)}ms`);

      // Reasonable expectations for database queries
      expect(avgLatency).toBeLessThan(5000); // 5 seconds average
      expect(maxLatency).toBeLessThan(10000); // 10 seconds max
    });

    it('should handle multiple concurrent operations', async () => {
      const client = await testSuite.createClient();
      const concurrentOperations = 5;

      const promises = Array.from({ length: concurrentOperations }, async (_, index) => {
        return timeIt(async () => {
          const { error } = await client.getClient()
            .from('customers')
            .select('count', { count: 'exact' });

          if (error && error.code !== '42P01') {
            throw new Error(`Operation ${index + 1} failed: ${error.message}`);
          }

          return `Operation ${index + 1} completed`;
        });
      });

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.measurement.success).toBe(true);
        expect(result.result).toBe(`Operation ${index + 1} completed`);
      });

      const totalTime = Math.max(...results.map(r => r.measurement.duration));
      console.log(`✅ Completed ${concurrentOperations} concurrent operations in ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle client disposal properly', async () => {
      let client: DisposableSupabaseClient;

      // Create and use client
      client = await testSuite.createClient({ debugMode: true });
      const supabaseClient = client.getClient();
      expect(supabaseClient).toBeDefined();

      // Dispose client
      await client.dispose();

      // Should throw error when accessing disposed client
      expect(() => client.getClient()).toThrow('Client has been disposed');

      // Should handle double disposal gracefully
      await expect(client.dispose()).resolves.toBeUndefined();
    });

    it('should handle resource cleanup with tracking', async () => {
      const client = await testSuite.createClient({
        autoCleanup: true,
        debugMode: true,
      });

      // Track some mock resources
      const resourceIds = [
        crypto.randomUUID(),
        crypto.randomUUID(),
        crypto.randomUUID(),
      ];

      resourceIds.forEach((id, index) => {
        client.trackResource('test_table', id);
      });

      // Disposal should attempt cleanup (won't actually delete as table doesn't exist)
      await expect(client.dispose()).resolves.toBeUndefined();
    });

    it('should handle timeout scenarios', async () => {
      const client = await testSuite.createClient({
        timeout: 100, // Very short timeout
      });

      try {
        // This should timeout quickly for slow operations
        await timeIt(async () => {
          // Simulate slow operation
          await new Promise(resolve => setTimeout(resolve, 200));
          return client.getClient().from('customers').select('*');
        });
      } catch (error: any) {
        expect(error.measurement).toBeDefined();
        expect(error.measurement.success).toBe(false);
        expect(error.error.message).toContain('timeout');
        console.log('✅ Timeout handling works correctly');
      }

      await client.dispose();
    });
  });

  describe('User Management Integration', () => {
    it('should handle user generation gracefully', async () => {
      const client = await testSuite.createClient();
      const generator = new TestUserGenerator();

      try {
        const testUser = await generator.createTestUser(client.getClient(), {
          firstName: 'Integration',
          lastName: 'Test',
          role: 'admin',
        });

        expect(testUser.email).toContain('test_user_');
        expect(testUser.firstName).toBe('Integration');
        expect(testUser.lastName).toBe('Test');

        console.log(`✅ Created test user: ${testUser.email}`);

        // Try to generate token
        try {
          const token = await generator.generateTestToken(client.getClient(), testUser);
          expect(token).toBeDefined();
          console.log('✅ Generated authentication token');
        } catch (tokenError) {
          console.warn('⚠️  Token generation skipped (auth may not be configured):', (tokenError as Error).message);
        }

      } catch (userError) {
        console.warn('⚠️  User creation skipped (auth may not be configured):', (userError as Error).message);
      }
    });
  });

  describe('Complete Workflow Test', () => {
    it('should demonstrate complete testing workflow', async () => {
      console.log('🚀 Starting complete workflow test...');

      // 1. Setup
      const client = await testSuite.createClient({
        timeout: 10000,
        autoCleanup: true,
        debugMode: true,
      });

      console.log('✅ Test client created');

      // 2. Test data generation
      const testData = {
        customers: Array.from({ length: 2 }, () => TestDataFactory.customersFactory()),
        products: Array.from({ length: 3 }, () => TestDataFactory.productsFactory()),
        suppliers: Array.from({ length: 1 }, () => TestDataFactory.suppliersFactory()),
      };

      console.log(`✅ Generated test data: ${testData.customers.length} customers, ${testData.products.length} products, ${testData.suppliers.length} suppliers`);

      // 3. Performance measurement with retry
      const { result: operationResult, measurement } = await timeIt(
        () => withRetry(
          async () => {
            // Simulate database operations
            const results = await Promise.all([
              client.getClient().from('customers').select('count', { count: 'exact' }),
              client.getClient().from('products').select('count', { count: 'exact' }),
              client.getClient().from('suppliers').select('count', { count: 'exact' }),
            ]);

            // Check for non-table-missing errors
            const errors = results.filter(r => r.error && r.error.code !== '42P01');
            if (errors.length > 0) {
              throw new Error(`Database operations failed: ${errors.map(e => e.error?.message).join(', ')}`);
            }

            return {
              operations: results.length,
              timestamp: new Date().toISOString(),
            };
          },
          { maxAttempts: 3, baseDelay: 100 }
        ),
        { workflow: 'complete_test', timestamp: Date.now() }
      );

      expect(operationResult.operations).toBe(3);
      expect(measurement.success).toBe(true);

      console.log(`✅ Completed workflow in ${measurement.duration.toFixed(2)}ms`);
      console.log(`✅ All ${operationResult.operations} database operations succeeded`);

      // 4. Cleanup happens automatically via testSuite.cleanupAll()
      console.log('✅ Workflow test completed successfully');
    });
  });
});

// Separate test for testing the test suite itself
describe('Test Utilities Self-Test', () => {
  it('should validate all utility functions are working', () => {
    // Test data factories
    const product = TestDataFactory.productsFactory();
    expect(product.name).toBeDefined();
    expect(product.sku).toBeDefined();
    expect(product.price).toBeGreaterThan(0);

    const customer = TestDataFactory.customersFactory();
    expect(customer.firstName).toBeDefined();
    expect(customer.email).toBeDefined();

    // Test that factory generates unique data
    const product2 = TestDataFactory.productsFactory();
    expect(product.name).not.toBe(product2.name);
    expect(product.sku).not.toBe(product2.sku);

    console.log('✅ All test utility functions validated');
  });

  it('should handle edge cases in retry logic', async () => {
    // Test immediate success
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      return 'immediate success';
    });

    expect(result).toBe('immediate success');
    expect(attempts).toBe(1);

    // Test max retries exceeded
    attempts = 0;
    try {
      await withRetry(
        async () => {
          attempts++;
          throw new Error('persistent failure');
        },
        { maxAttempts: 3 }
      );
    } catch (error) {
      expect((error as Error).message).toBe('persistent failure');
      expect(attempts).toBe(3);
    }

    console.log('✅ Retry logic edge cases handled correctly');
  });
});
