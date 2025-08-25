import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestEnvironment, usePerformanceTests } from '../utils/TestEnvironment';
import { TestDataFactory } from '../factories/TestDataFactory';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  receivePurchaseOrder
} from '../../api/purchases';
import {
  createProduct,
  getProducts,
  updateStock,
  searchProducts
} from '../../api/products';
import {
  createSale,
  processSaleTransaction
} from '../../api/sales';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  api_create: 1000,      // 1 second for create operations
  api_read: 500,         // 0.5 seconds for read operations
  api_update: 800,       // 0.8 seconds for update operations
  bulk_operation: 5000,  // 5 seconds for bulk operations
  search_operation: 300, // 0.3 seconds for search operations
  concurrent_load: 10000 // 10 seconds for concurrent operations
};

const performanceTests = usePerformanceTests(PERFORMANCE_THRESHOLDS);

describe('Performance Testing Framework', () => {
  beforeEach(async () => {
    await TestEnvironment.setup({
      mockDatabase: true,
      loadTestData: true,
      testDataScale: 'large'
    });
  });

  afterEach(async () => {
    await TestEnvironment.cleanup();
  });

  describe('API Performance Tests', () => {
    it('should handle high-volume product operations efficiently', async () => {
      const products = TestDataFactory.createBulkProducts(1000);
      
      // Test bulk product creation
      const createResults = await performanceTests.measureApiCall(async () => {
        const promises = products.map(product => createProduct(product));
        return Promise.all(promises);
      });

      expect(createResults.__duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulk_operation);
      expect(createResults.length).toBe(1000);

      // Test product retrieval performance
      const retrieveResults = await performanceTests.measureApiCall(async () => {
        return getProducts(1000, 0);
      });

      expect(retrieveResults.__duration).toBeLessThan(PERFORMANCE_THRESHOLDS.api_read);
      expect(retrieveResults.data?.length).toBe(1000);

      console.log(`Bulk product operations: Create ${createResults.__duration}ms, Retrieve ${retrieveResults.__duration}ms`);
    });

    it('should maintain performance under concurrent sale transactions', async () => {
      const products = TestDataFactory.createBulkProducts(50, { stock: 1000 });
      const customers = TestDataFactory.createBulkCustomers(20);
      
      TestEnvironment.setMockData('products', products);
      TestEnvironment.setMockData('customers', customers);

      // Create 100 concurrent sales
      const concurrentSales = Array.from({ length: 100 }, () => {
        const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
        const randomProducts = products.slice(0, Math.floor(Math.random() * 5) + 1);
        
        return TestDataFactory.createSale({
          customerId: randomCustomer.id,
          items: randomProducts.map(product => ({
            productId: product.id,
            productName: product.name,
            sku: product.sku!,
            quantity: Math.floor(Math.random() * 5) + 1,
            price: product.price,
            total: product.price * (Math.floor(Math.random() * 5) + 1)
          }))
        });
      });

      const concurrentResults = await performanceTests.measureApiCall(async () => {
        const promises = concurrentSales.map(sale => processSaleTransaction(sale));
        return Promise.allSettled(promises);
      });

      const successfulSales = concurrentResults.filter(r => r.status === 'fulfilled').length;
      
      expect(concurrentResults.__duration).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrent_load);
      expect(successfulSales).toBeGreaterThan(90); // At least 90% success rate

      console.log(`Concurrent sales: ${successfulSales}/100 successful in ${concurrentResults.__duration}ms`);
    });

    it('should handle large purchase order processing efficiently', async () => {
      const suppliers = TestDataFactory.createBulkSuppliers(10);
      const products = TestDataFactory.createBulkProducts(500);
      
      TestEnvironment.setMockData('suppliers', suppliers);
      TestEnvironment.setMockData('products', products);

      // Create large purchase orders
      const largePOs = suppliers.map(supplier => 
        TestDataFactory.createPurchaseOrder({
          supplierId: supplier.id,
          supplierName: supplier.name,
          items: products.slice(0, 50).map(product => 
            TestDataFactory.createPurchaseOrderItem({
              productId: product.id,
              productName: product.name,
              sku: product.sku!,
              quantity: Math.floor(Math.random() * 100) + 10,
              cost: product.cost
            })
          )
        })
      );

      const createResults = await performanceTests.measureApiCall(async () => {
        const promises = largePOs.map(po => createPurchaseOrder(po));
        return Promise.all(promises);
      });

      expect(createResults.__duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulk_operation);
      expect(createResults.length).toBe(10);

      // Test receiving performance
      const receiveResults = await performanceTests.measureApiCall(async () => {
        const receivePromises = createResults.map(result => {
          if (result.data) {
            const receivedItems = result.data.items.map(item => ({
              productId: item.productId,
              receivedQuantity: item.quantity
            }));
            return receivePurchaseOrder(result.data.id, receivedItems);
          }
          return Promise.resolve({ data: null, error: null });
        });
        return Promise.all(receivePromises);
      });

      expect(receiveResults.__duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulk_operation);

      console.log(`Large PO processing: Create ${createResults.__duration}ms, Receive ${receiveResults.__duration}ms`);
    });
  });

  describe('Search Performance Tests', () => {
    it('should maintain fast search performance with large datasets', async () => {
      const products = TestDataFactory.createBulkProducts(5000);
      TestEnvironment.setMockData('products', products);

      const searchTerms = ['laptop', 'phone', 'tablet', 'mouse', 'keyboard'];
      
      const searchResults = await performanceTests.measureApiCall(async () => {
        const promises = searchTerms.map(term => searchProducts(term));
        return Promise.all(promises);
      });

      expect(searchResults.__duration).toBeLessThan(PERFORMANCE_THRESHOLDS.search_operation);
      expect(searchResults.length).toBe(searchTerms.length);

      // Test pagination performance
      const paginationResults = await performanceTests.measureApiCall(async () => {
        const pages = Array.from({ length: 10 }, (_, i) => 
          getProducts(100, i * 100)
        );
        return Promise.all(pages);
      });

      expect(paginationResults.__duration).toBeLessThan(PERFORMANCE_THRESHOLDS.api_read);

      console.log(`Search performance: ${searchResults.__duration}ms, Pagination: ${paginationResults.__duration}ms`);
    });

    it('should handle complex filtering operations efficiently', async () => {
      const products = TestDataFactory.createBulkProducts(2000, {
        category: 'Electronics'
      });
      
      // Add products with different categories
      const mixedProducts = [
        ...products,
        ...TestDataFactory.createBulkProducts(500, { category: 'Clothing' }),
        ...TestDataFactory.createBulkProducts(500, { category: 'Books' })
      ];

      TestEnvironment.setMockData('products', mixedProducts);

      const filterResults = await performanceTests.measureApiCall(async () => {
        // Simulate complex filtering
        const filters = [
          { category: 'Electronics', priceRange: [100, 500] },
          { category: 'Clothing', stockRange: [10, 100] },
          { category: 'Books', search: 'programming' }
        ];

        const promises = filters.map(filter => 
          // Mock filtered search
          getProducts(1000, 0)
        );

        return Promise.all(promises);
      });

      expect(filterResults.__duration).toBeLessThan(PERFORMANCE_THRESHOLDS.search_operation);

      console.log(`Complex filtering: ${filterResults.__duration}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not exceed memory limits during large operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process large dataset
      const largeDataset = TestDataFactory.createLargeDataset('xlarge');
      
      TestEnvironment.setMockData('products', largeDataset.products);
      TestEnvironment.setMockData('sales', largeDataset.sales);

      // Perform memory-intensive operations
      const memoryResults = await performanceTests.measureApiCall(async () => {
        const operations = [
          getProducts(10000, 0),
          searchProducts('test'),
          ...Array.from({ length: 100 }, () => 
            createSale(TestDataFactory.createSale())
          )
        ];

        return Promise.all(operations);
      });

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      expect(memoryIncreaseMB).toBeLessThan(512); // Should not exceed 512MB increase
      
      console.log(`Memory usage increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    });

    it('should properly clean up resources after operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create and process temporary data
      for (let i = 0; i < 10; i++) {
        const tempProducts = TestDataFactory.createBulkProducts(1000);
        TestEnvironment.setMockData('products', tempProducts);
        
        await getProducts(1000, 0);
        
        // Clear data to simulate cleanup
        TestEnvironment.clearMockData();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      expect(memoryIncreaseMB).toBeLessThan(100); // Should not have significant memory leak

      console.log(`Memory after cleanup: ${memoryIncreaseMB.toFixed(2)}MB increase`);
    });
  });

  describe('Stress Testing', () => {
    it('should handle extreme load conditions', async () => {
      const extremeLoad = {
        products: 10000,
        customers: 1000,
        sales: 5000,
        purchaseOrders: 500
      };

      // Create extreme dataset
      const products = TestDataFactory.createBulkProducts(extremeLoad.products);
      const customers = TestDataFactory.createBulkCustomers(extremeLoad.customers);
      
      TestEnvironment.setMockData('products', products);
      TestEnvironment.setMockData('customers', customers);

      const stressResults = await performanceTests.measureApiCall(async () => {
        // Create concurrent operations at extreme scale
        const operations = [
          // Bulk reads
          ...Array.from({ length: 50 }, () => getProducts(200, Math.floor(Math.random() * 9800))),
          
          // Bulk searches  
          ...Array.from({ length: 20 }, () => searchProducts('stress')),
          
          // Bulk sales
          ...Array.from({ length: 100 }, () => {
            const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
            const randomProducts = products.slice(0, 5);
            
            return processSaleTransaction(TestDataFactory.createSale({
              customerId: randomCustomer.id,
              items: randomProducts.map(product => ({
                productId: product.id,
                productName: product.name,  
                sku: product.sku!,
                quantity: 1,
                price: product.price,
                total: product.price
              }))
            }));
          })
        ];

        return Promise.allSettled(operations);
      });

      const successRate = stressResults.filter(r => r.status === 'fulfilled').length / stressResults.length;
      
      expect(stressResults.__duration).toBeLessThan(30000); // 30 seconds max
      expect(successRate).toBeGreaterThan(0.85); // At least 85% success rate under stress

      console.log(`Stress test: ${(successRate * 100).toFixed(1)}% success rate in ${stressResults.__duration}ms`);
    });

    it('should recover gracefully from high error rates', async () => {
      // Simulate high error conditions
      let errorRate = 0.5; // 50% error rate initially
      
      vi.doMock('../../utils/supabase', () => ({
        supabase: {
          from: vi.fn(() => ({
            select: vi.fn().mockImplementation(() => {
              if (Math.random() < errorRate) {
                return Promise.resolve({ data: null, error: new Error('Simulated database error') });
              }
              return Promise.resolve({ data: TestDataFactory.createBulkProducts(10), error: null });
            })
          }))
        }
      }));

      const recoveryResults = await performanceTests.measureApiCall(async () => {
        const results = [];
        
        // Gradually reduce error rate to simulate recovery
        for (let i = 0; i < 10; i++) {
          errorRate = Math.max(0, errorRate - 0.05); // Reduce error rate by 5% each iteration
          
          const batchResults = await Promise.allSettled(
            Array.from({ length: 20 }, () => getProducts(10, 0))
          );
          
          results.push({
            iteration: i,
            successRate: batchResults.filter(r => r.status === 'fulfilled').length / batchResults.length,
            errorRate
          });
        }
        
        return results;
      });

      const finalSuccessRate = recoveryResults[recoveryResults.length - 1].successRate;
      expect(finalSuccessRate).toBeGreaterThan(0.9); // Should recover to >90% success

      console.log(`Error recovery: Final success rate ${(finalSuccessRate * 100).toFixed(1)}%`);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain baseline performance benchmarks', async () => {
      const benchmarks = {
        productCreate: { baseline: 100, threshold: 150 },
        productRead: { baseline: 50, threshold: 100 },
        saleProcess: { baseline: 200, threshold: 300 },
        searchOperation: { baseline: 80, threshold: 150 }
      };

      const results: Record<string, number> = {};

      // Test product creation
      const productResult = await performanceTests.measureApiCall(async () => {
        return createProduct(TestDataFactory.createProduct());
      });
      results.productCreate = productResult.__duration;

      // Test product reading
      const readResult = await performanceTests.measureApiCall(async () => {
        return getProducts(100, 0);
      });
      results.productRead = readResult.__duration;

      // Test sale processing
      const saleResult = await performanceTests.measureApiCall(async () => {
        return processSaleTransaction(TestDataFactory.createSale());
      });
      results.saleProcess = saleResult.__duration;

      // Test search operation
      const searchResult = await performanceTests.measureApiCall(async () => {
        return searchProducts('test');
      });
      results.searchOperation = searchResult.__duration;

      // Verify no performance regression
      Object.entries(benchmarks).forEach(([operation, benchmark]) => {
        expect(results[operation]).toBeLessThan(benchmark.threshold);
        
        if (results[operation] > benchmark.baseline * 1.2) {
          console.warn(`Performance degradation detected in ${operation}: ${results[operation]}ms > ${benchmark.baseline * 1.2}ms`);
        }
      });

      console.log('Performance benchmarks:', results);
    });
  });
});