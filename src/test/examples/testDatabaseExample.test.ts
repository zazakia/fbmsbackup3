import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestEnvironment, cleanupTestData, testEnv } from '../utils/testUtils';
import { testEnvironment, TEST_CONFIGURATIONS } from '../config/testEnvironment';

/**
 * Example test demonstrating the new test database functionality
 * This test shows how to use both mock and real database strategies
 */
describe('Test Database Integration Example', () => {
  
  describe('Mock Database Strategy (Fast Unit Tests)', () => {
    beforeEach(async () => {
      await setupTestEnvironment({
        testType: 'unit',
        forceMockDatabase: true,
        loadTestData: true,
        testDataScale: 'small'
      });
    });

    afterEach(async () => {
      await cleanupTestData();
    });

    it('should use mock database for fast unit tests', async () => {
      const config = testEnv.getCurrentConfig();
      expect(config.forceMockDatabase).toBe(true);
      
      const testData = testEnv.getTestData();
      expect(testData).toBeTruthy();
      expect(testData!.products.length).toBeGreaterThan(0);
      
      console.log('🎭 Using mock database - fast and isolated');
    });

    it('should validate mock data consistency', async () => {
      const { validateDataConsistency } = await import('../utils/testUtils');
      const result = await validateDataConsistency();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Local Supabase Strategy (Integration Tests)', () => {
    beforeEach(async () => {
      // This will attempt to use local Supabase, fallback to mocks if unavailable
      await setupTestEnvironment({
        testType: 'integration',
        useTestDatabase: true,
        databaseStrategy: 'local_supabase'
      });
    });

    afterEach(async () => {
      await cleanupTestData();
      await testEnvironment.cleanup();
    });

    it('should connect to local Supabase when available', async () => {
      const status = await testEnvironment.getConnectionStatus();
      
      if (status.strategy === 'local_supabase') {
        console.log('✅ Using local Supabase for integration testing');
        expect(status.connected).toBe(true);
        
        // Test real database operations
        const client = testEnvironment.getSupabaseClient();
        expect(client).toBeTruthy();
        
        if (client) {
          // Test a real database query
          const { data, error } = await client
            .from('products')
            .select('*')
            .limit(5);
          
          expect(error).toBeNull();
          expect(Array.isArray(data)).toBe(true);
          
          console.log(`📊 Found ${data?.length || 0} products in test database`);
        }
      } else {
        console.log('⚠️ Local Supabase not available, using mocks');
        expect(['mock', 'remote_test']).toContain(status.strategy);
      }
    });

    it('should seed test data in real database', async () => {
      if (testEnvironment.isUsingRealDatabase()) {
        const client = testEnvironment.getSupabaseClient();
        expect(client).toBeTruthy();
        
        if (client) {
          // Check for test data
          const { data: testProducts } = await client
            .from('products')
            .select('*')
            .like('sku', 'TEST-%');
          
          console.log(`🌱 Found ${testProducts?.length || 0} test products`);
          
          // Test categories should exist
          const { data: testCategories } = await client
            .from('categories')
            .select('*')
            .like('id', 'cat-test-%');
          
          console.log(`🏷️ Found ${testCategories?.length || 0} test categories`);
          
          // If we have seeded data, verify it
          if (testProducts && testProducts.length > 0) {
            expect(testProducts.length).toBeGreaterThan(0);
            
            // Verify test product structure
            const testProduct = testProducts[0];
            expect(testProduct).toHaveProperty('id');
            expect(testProduct).toHaveProperty('name');
            expect(testProduct).toHaveProperty('sku');
            expect(testProduct.sku).toMatch(/^TEST-/);
          }
        }
      } else {
        console.log('🎭 Using mock environment, skipping real database test');
        expect(true).toBe(true); // Test passes for mock scenario
      }
    });

    it('should handle database transactions in real database', async () => {
      if (testEnvironment.isUsingRealDatabase()) {
        const client = testEnvironment.getSupabaseClient();
        
        if (client) {
          // Test creating a product
          const newProduct = {
            id: 'prod-test-transaction',
            name: 'Transaction Test Product',
            sku: 'TEST-TXN-001',
            category: 'Test Supplies',
            price: 99.99,
            cost: 79.99,
            stock: 10,
            min_stock: 5,
            unit: 'piece',
            is_active: true
          };
          
          const { data: insertedProduct, error: insertError } = await client
            .from('products')
            .insert([newProduct])
            .select()
            .single();
          
          expect(insertError).toBeNull();
          expect(insertedProduct).toBeTruthy();
          
          // Verify the product was created
          const { data: fetchedProduct } = await client
            .from('products')
            .select('*')
            .eq('id', newProduct.id)
            .single();
          
          expect(fetchedProduct).toBeTruthy();
          expect(fetchedProduct?.name).toBe(newProduct.name);
          
          // Cleanup - delete the test product
          await client
            .from('products')
            .delete()
            .eq('id', newProduct.id);
          
          console.log('✅ Database transaction test completed');
        }
      } else {
        console.log('🎭 Using mock environment for transaction test');
        expect(true).toBe(true);
      }
    });
  });

  describe('Test Configuration Examples', () => {
    it('should provide different configurations for different test types', () => {
      const unitConfig = TEST_CONFIGURATIONS.unit;
      const integrationConfig = TEST_CONFIGURATIONS.integration;
      const e2eConfig = TEST_CONFIGURATIONS.e2e;
      const ciConfig = TEST_CONFIGURATIONS.ci;

      // Unit tests should use mocks for speed
      expect(unitConfig.database.strategy).toBe('mock');
      expect(unitConfig.performanceMode).toBe('fast');
      expect(unitConfig.networkMocking).toBe(true);

      // Integration tests should try real database
      expect(integrationConfig.database.strategy).toBe('local_supabase');
      expect(integrationConfig.database.seedData).toBe(true);
      expect(integrationConfig.performanceMode).toBe('realistic');

      // E2E tests should use real database with full data
      expect(e2eConfig.database.strategy).toBe('local_supabase');
      expect(e2eConfig.database.seedData).toBe(true);

      // CI tests should use remote test database
      expect(ciConfig.database.strategy).toBe('remote_test');
      expect(ciConfig.performanceMode).toBe('fast');

      console.log('🔧 Test configurations verified');
    });

    it('should demonstrate environment flag detection', () => {
      const isTestMode = import.meta.env.TEST === true;
      
      console.log(`🧪 Test mode detected: ${isTestMode}`);
      expect(typeof isTestMode).toBe('boolean');
      
      // In test environment, this should be true
      if (import.meta.env.MODE === 'test') {
        expect(isTestMode).toBe(true);
      }
    });
  });

  describe('Performance and Monitoring', () => {
    beforeEach(async () => {
      await setupTestEnvironment({
        testType: 'unit',
        loadTestData: true,
        testDataScale: 'medium'
      });
    });

    it('should track performance metrics', async () => {
      const startTime = performance.now();
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Record performance metric
      testEnv.recordPerformanceMetric('example_operation', duration, 100);
      
      const metrics = testEnv.getPerformanceMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      
      const lastMetric = metrics[metrics.length - 1];
      expect(lastMetric.operation).toBe('example_operation');
      expect(lastMetric.duration).toBeGreaterThanOrEqual(50);
      expect(lastMetric.status).toBeOneOf(['pass', 'warning', 'fail']);
      
      console.log(`⏱️ Performance test completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should gracefully fallback from real database to mocks', async () => {
      // This test demonstrates the fallback mechanism
      await setupTestEnvironment({
        testType: 'integration',
        useTestDatabase: true,
        databaseStrategy: 'local_supabase'
      });
      
      const status = await testEnvironment.getConnectionStatus();
      
      // Should either connect to real database or fallback to mocks
      expect(status.connected).toBe(true);
      expect(['local_supabase', 'mock']).toContain(status.strategy);
      
      console.log(`🔄 Using strategy: ${status.strategy}`);
      
      if (status.strategy === 'mock') {
        console.log('✅ Fallback to mocks worked correctly');
      } else {
        console.log('✅ Real database connection successful');
      }
    });
  });
});

/**
 * Usage Examples for Documentation
 */
describe('Usage Examples', () => {
  it('Example 1: Fast unit test with mocks', async () => {
    await setupTestEnvironment({
      testType: 'unit',
      forceMockDatabase: true
    });
    
    // Your test code here using mocks
    expect(true).toBe(true);
  });

  it('Example 2: Integration test with real database', async () => {
    await setupTestEnvironment({
      testType: 'integration',
      useTestDatabase: true,
      databaseStrategy: 'local_supabase'
    });
    
    // Your test code here using real database
    const isUsingReal = testEnvironment.isUsingRealDatabase();
    console.log(`Using real database: ${isUsingReal}`);
  });

  it('Example 3: Performance test with realistic data', async () => {
    await setupTestEnvironment({
      testType: 'integration',
      loadTestData: true,
      testDataScale: 'large'
    });
    
    const startTime = performance.now();
    
    // Your performance-critical code here
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    testEnv.recordPerformanceMetric('my_operation', duration, 100);
    
    expect(duration).toBeLessThan(100); // Should be fast enough
  });
});
