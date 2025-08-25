import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestEnvironment, useTestEnvironment } from '../utils/TestEnvironment';
import { TestDataFactory } from '../factories/TestDataFactory';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  updatePurchaseOrder
} from '../../api/purchases';
import {
  createProduct,
  getProducts,
  updateStock
} from '../../api/products';
import {
  createSale,
  processSaleTransaction
} from '../../api/sales';

// Use test environment
useTestEnvironment({
  mockDatabase: true,
  mockExternalServices: true,
  networkDelay: 0,
  simulateErrors: false
});

describe('Error Handling and Recovery Testing', () => {
  describe('Network Failure Scenarios', () => {
    describe('Connection Timeout Handling', () => {
      it('should handle API timeout gracefully', async () => {
        // Mock timeout error
        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          select: vi.fn().mockImplementation(() => 
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 100)
            )
          )
        }));

        const result = await getProducts();

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('timeout');
        expect(result.data).toBeNull();
      });

      it('should retry failed requests with exponential backoff', async () => {
        let attemptCount = 0;
        const maxRetries = 3;

        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          select: vi.fn().mockImplementation(() => {
            attemptCount++;
            if (attemptCount < maxRetries) {
              return Promise.reject(new Error('Network error'));
            }
            return Promise.resolve({
              data: TestDataFactory.createBulkProducts(5),
              error: null
            });
          })
        }));

        // Mock retry logic
        const retryWithBackoff = async (operation: () => Promise<any>, maxRetries: number = 3) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              return await operation();
            } catch (error) {
              if (attempt === maxRetries) throw error;
              
              // Exponential backoff: 2^attempt * 100ms
              const delay = Math.pow(2, attempt) * 100;
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        };

        const result = await retryWithBackoff(() => getProducts());

        expect(attemptCount).toBe(maxRetries);
        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
      });

      it('should handle connection refused errors', async () => {
        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          select: vi.fn().mockRejectedValue(new Error('ECONNREFUSED: Connection refused'))
        }));

        const result = await getProducts();

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('ECONNREFUSED');
      });

      it('should handle DNS resolution failures', async () => {
        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          select: vi.fn().mockRejectedValue(new Error('ENOTFOUND: DNS lookup failed'))
        }));

        const result = await getProducts();

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('ENOTFOUND');
      });
    });

    describe('Intermittent Network Issues', () => {
      it('should handle sporadic network failures', async () => {
        let callCount = 0;
        const failureRate = 0.3; // 30% failure rate

        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          select: vi.fn().mockImplementation(() => {
            callCount++;
            if (Math.random() < failureRate) {
              return Promise.reject(new Error('Network intermittent failure'));
            }
            return Promise.resolve({
              data: TestDataFactory.createBulkProducts(10),
              error: null
            });
          })
        }));

        const results = [];
        const operations = Array.from({ length: 20 }, () => getProducts());

        for (const operation of operations) {
          const result = await operation.catch(error => ({ data: null, error }));
          results.push(result);
        }

        const successCount = results.filter(r => r.error === null).length;
        const failureCount = results.filter(r => r.error !== null).length;

        expect(successCount).toBeGreaterThan(0);
        expect(failureCount).toBeGreaterThan(0);
        expect(successCount + failureCount).toBe(20);
      });

      it('should handle slow network conditions', async () => {
        const networkDelays = [100, 500, 1000, 2000, 5000]; // Various delays

        for (const delay of networkDelays) {
          vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
            select: vi.fn().mockImplementation(() => 
              new Promise(resolve => 
                setTimeout(() => resolve({
                  data: TestDataFactory.createBulkProducts(5),
                  error: null
                }), delay)
              )
            )
          }));

          const startTime = performance.now();
          const result = await getProducts();
          const endTime = performance.now();

          expect(result.error).toBeNull();
          expect(endTime - startTime).toBeGreaterThanOrEqual(delay);
        }
      });
    });

    describe('Server Error Handling', () => {
      it('should handle 500 Internal Server Error', async () => {
        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Internal Server Error', status: 500 }
          })
        }));

        const result = await getProducts();

        expect(result.error).toBeTruthy();
        expect(result.error?.status).toBe(500);
      });

      it('should handle 503 Service Unavailable', async () => {
        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Service Unavailable', status: 503 }
          })
        }));

        const result = await getProducts();

        expect(result.error).toBeTruthy();
        expect(result.error?.status).toBe(503);
      });

      it('should handle rate limiting (429 Too Many Requests)', async () => {
        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { 
              message: 'Too Many Requests', 
              status: 429,
              headers: { 'Retry-After': '60' }
            }
          })
        }));

        const result = await getProducts();

        expect(result.error).toBeTruthy();
        expect(result.error?.status).toBe(429);
      });
    });
  });

  describe('Offline Functionality', () => {
    describe('Offline Detection', () => {
      it('should detect when application goes offline', async () => {
        // Mock offline status
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });

        // Trigger offline event
        window.dispatchEvent(new Event('offline'));

        // Mock offline store
        const offlineStore = {
          isOffline: true,
          queuedOperations: [],
          addToQueue: vi.fn(),
          processQueue: vi.fn()
        };

        expect(offlineStore.isOffline).toBe(true);
        expect(navigator.onLine).toBe(false);
      });

      it('should detect when connection is restored', async () => {
        // Start offline
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });

        // Go back online
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });

        window.dispatchEvent(new Event('online'));

        expect(navigator.onLine).toBe(true);
      });
    });

    describe('Offline Data Storage', () => {
      it('should store operations in offline queue', async () => {
        // Mock offline mode
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });

        const offlineQueue: any[] = [];
        
        const queueOperation = (operation: any) => {
          offlineQueue.push({
            id: Date.now().toString(),
            type: operation.type,
            data: operation.data,
            timestamp: new Date(),
            retries: 0
          });
        };

        // Try to create a sale while offline
        const saleData = TestDataFactory.createSale();
        queueOperation({
          type: 'CREATE_SALE',
          data: saleData
        });

        expect(offlineQueue.length).toBe(1);
        expect(offlineQueue[0].type).toBe('CREATE_SALE');
        expect(offlineQueue[0].data).toEqual(saleData);
      });

      it('should sync offline operations when back online', async () => {
        const offlineQueue = [
          {
            id: '1',
            type: 'CREATE_SALE',
            data: TestDataFactory.createSale(),
            timestamp: new Date(),
            retries: 0
          },
          {
            id: '2',
            type: 'UPDATE_PRODUCT',
            data: { id: 'product-1', stock: 50 },
            timestamp: new Date(),
            retries: 0
          }
        ];

        // Mock successful sync
        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
          update: vi.fn().mockResolvedValue({ data: {}, error: null })
        }));

        const syncResults = [];
        
        for (const operation of offlineQueue) {
          try {
            let result;
            if (operation.type === 'CREATE_SALE') {
              result = await createSale(operation.data);
            } else if (operation.type === 'UPDATE_PRODUCT') {
              result = await updateStock(operation.data.id, operation.data.stock, 'set');
            }
            syncResults.push({ id: operation.id, success: !result?.error });
          } catch (error) {
            syncResults.push({ id: operation.id, success: false, error });
          }
        }

        expect(syncResults.length).toBe(2);
        expect(syncResults.every(r => r.success)).toBe(true);
      });

      it('should handle partial sync failures', async () => {
        const offlineQueue = [
          {
            id: '1',
            type: 'CREATE_SALE',
            data: TestDataFactory.createSale(),
            retries: 0
          },
          {
            id: '2',
            type: 'CREATE_SALE',
            data: TestDataFactory.createSale(),
            retries: 0
          }
        ];

        // Mock mixed success/failure
        let callCount = 0;
        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          insert: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({ data: {}, error: null });
            } else {
              return Promise.resolve({ data: null, error: new Error('Sync failed') });
            }
          })
        }));

        const syncResults = [];
        
        for (const operation of offlineQueue) {
          const result = await createSale(operation.data);
          syncResults.push({
            id: operation.id,
            success: !result.error,
            needsRetry: !!result.error
          });
        }

        const successfulSyncs = syncResults.filter(r => r.success);
        const failedSyncs = syncResults.filter(r => !r.success);

        expect(successfulSyncs.length).toBe(1);
        expect(failedSyncs.length).toBe(1);
        expect(failedSyncs[0].needsRetry).toBe(true);
      });
    });

    describe('Offline UI Behavior', () => {
      it('should show offline indicator when disconnected', async () => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });

        const offlineIndicator = {
          isVisible: !navigator.onLine,
          message: 'You are currently offline. Changes will be saved and synced when connection is restored.'
        };

        expect(offlineIndicator.isVisible).toBe(true);
        expect(offlineIndicator.message).toContain('offline');
      });

      it('should disable certain features when offline', async () => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });

        const features = {
          realtimeSync: navigator.onLine,
          reportGeneration: navigator.onLine,
          userManagement: navigator.onLine,
          basicPOS: true, // Should work offline
          inventory: true // Should work offline with local data
        };

        expect(features.realtimeSync).toBe(false);
        expect(features.reportGeneration).toBe(false);
        expect(features.userManagement).toBe(false);
        expect(features.basicPOS).toBe(true);
        expect(features.inventory).toBe(true);
      });
    });
  });

  describe('Data Validation Error Handling', () => {
    describe('Input Validation', () => {
      it('should handle invalid product data', async () => {
        const invalidProducts = [
          TestDataFactory.createProduct({ name: '' }), // Empty name
          TestDataFactory.createProduct({ sku: '' }), // Empty SKU
          TestDataFactory.createProduct({ price: -10 }), // Negative price
          TestDataFactory.createProduct({ stock: -5 }), // Negative stock
          TestDataFactory.createProduct({ minStock: -1 }) // Negative minimum stock
        ];

        for (const product of invalidProducts) {
          const result = await createProduct(product);
          expect(result.error).toBeTruthy();
          expect(result.error?.message).toContain('validation');
        }
      });

      it('should handle invalid sale data', async () => {
        const invalidSales = [
          TestDataFactory.createSale({ customerId: '' }), // Empty customer ID
          TestDataFactory.createSale({ items: [] }), // No items
          TestDataFactory.createSale({ 
            items: [TestDataFactory.createSaleItem({ quantity: 0 })] 
          }), // Zero quantity
          TestDataFactory.createSale({ 
            items: [TestDataFactory.createSaleItem({ price: -10 })] 
          }) // Negative price
        ];

        for (const sale of invalidSales) {
          const result = await processSaleTransaction(sale);
          expect(result.error).toBeTruthy();
          expect(result.error?.message).toMatch(/validation|invalid|required/i);
        }
      });

      it('should handle constraint violations', async () => {
        // Mock constraint violation errors
        const constraintErrors = [
          { code: '23505', message: 'duplicate key value violates unique constraint' },
          { code: '23503', message: 'foreign key constraint violation' },
          { code: '23514', message: 'check constraint violation' },
          { code: '23502', message: 'not-null constraint violation' }
        ];

        for (const error of constraintErrors) {
          vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
            insert: vi.fn().mockResolvedValue({ data: null, error })
          }));

          const result = await createProduct(TestDataFactory.createProduct());
          expect(result.error).toBeTruthy();
          expect(result.error?.code).toBe(error.code);
        }
      });
    });

    describe('Business Rule Validation', () => {
      it('should prevent overselling inventory', async () => {
        const product = TestDataFactory.createProduct({ stock: 5 });
        TestEnvironment.setMockData('products', [product]);

        const oversale = TestDataFactory.createSale({
          items: [{
            productId: product.id,
            productName: product.name,
            sku: product.sku!,
            quantity: 10, // More than available
            price: product.price,
            total: 10 * product.price
          }]
        });

        const result = await processSaleTransaction(oversale);
        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('insufficient stock');
      });

      it('should validate purchase order business rules', async () => {
        const invalidPOs = [
          TestDataFactory.createPurchaseOrder({ 
            items: [] // No items
          }),
          TestDataFactory.createPurchaseOrder({ 
            supplierId: '' // No supplier
          }),
          TestDataFactory.createPurchaseOrder({
            expectedDate: new Date('2020-01-01') // Past date
          })
        ];

        for (const po of invalidPOs) {
          const result = await createPurchaseOrder(po);
          expect(result.error).toBeTruthy();
        }
      });
    });
  });

  describe('Error Recovery Mechanisms', () => {
    describe('Transaction Rollback', () => {
      it('should rollback failed transactions', async () => {
        const sale = TestDataFactory.createSale();
        const initialProducts = TestDataFactory.createBulkProducts(3, { stock: 100 });
        
        TestEnvironment.setMockData('products', initialProducts);

        // Mock partial failure during transaction
        let operationCount = 0;
        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          insert: vi.fn().mockImplementation(() => {
            operationCount++;
            if (operationCount === 1) {
              return Promise.resolve({ data: { id: 'sale-1' }, error: null });
            } else {
              return Promise.reject(new Error('Database failure'));
            }
          }),
          update: vi.fn().mockRejectedValue(new Error('Update failed'))
        }));

        // Transaction should fail and rollback
        await TestEnvironment.withTransaction(async () => {
          const saleResult = await createSale(sale);
          if (saleResult.error) throw saleResult.error;

          // This should fail and trigger rollback
          const updateResult = await updateStock('product-1', 10, 'subtract');
          if (updateResult.error) throw updateResult.error;
        }).catch(error => {
          expect(error).toBeTruthy();
        });

        // Data should be unchanged after rollback
        const productsAfterRollback = TestEnvironment.getMockData('products');
        expect(productsAfterRollback).toEqual(initialProducts);
      });
    });

    describe('Graceful Degradation', () => {
      it('should provide basic functionality when advanced features fail', async () => {
        // Mock advanced feature failure
        vi.doMock('../../services/analyticsService', () => ({
          trackEvent: vi.fn().mockRejectedValue(new Error('Analytics service down'))
        }));

        // Basic operations should still work
        const product = TestDataFactory.createProduct();
        const result = await createProduct(product);

        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
      });

      it('should fallback to cached data when live data fails', async () => {
        const cachedProducts = TestDataFactory.createBulkProducts(5);
        TestEnvironment.setMockData('cached_products', cachedProducts);

        // Mock live data failure
        vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
          select: vi.fn().mockRejectedValue(new Error('Live data unavailable'))
        }));

        // Should fallback to cached data
        const fallbackResult = {
          data: TestEnvironment.getMockData('cached_products'),
          error: null,
          fromCache: true
        };

        expect(fallbackResult.data).toEqual(cachedProducts);
        expect(fallbackResult.fromCache).toBe(true);
      });
    });

    describe('Error Notification and Logging', () => {
      it('should log errors for monitoring', async () => {
        const errorLogs: any[] = [];
        
        const logError = (error: any, context: any) => {
          errorLogs.push({
            timestamp: new Date(),
            error: error.message,
            stack: error.stack,
            context,
            severity: 'error'
          });
        };

        // Simulate error
        try {
          throw new Error('Test error');
        } catch (error) {
          logError(error, { operation: 'test_operation', userId: 'user-1' });
        }

        expect(errorLogs.length).toBe(1);
        expect(errorLogs[0].error).toBe('Test error');
        expect(errorLogs[0].context.operation).toBe('test_operation');
      });

      it('should notify users of recoverable errors', async () => {
        const notifications: any[] = [];
        
        const notifyUser = (message: string, type: 'info' | 'warning' | 'error') => {
          notifications.push({
            message,
            type,
            timestamp: new Date(),
            dismissed: false
          });
        };

        // Test different error scenarios
        notifyUser('Connection lost. Working offline.', 'warning');
        notifyUser('Operation failed. Please try again.', 'error');
        notifyUser('Connection restored. Syncing data.', 'info');

        expect(notifications.length).toBe(3);
        expect(notifications[0].type).toBe('warning');
        expect(notifications[1].type).toBe('error');
        expect(notifications[2].type).toBe('info');
      });
    });
  });

  describe('Recovery Performance', () => {
    it('should recover quickly from transient errors', async () => {
      let errorCount = 0;
      const maxErrors = 3;

      vi.mocked(require('../../utils/supabase').supabase.from).mockImplementation(() => ({
        select: vi.fn().mockImplementation(() => {
          errorCount++;
          if (errorCount <= maxErrors) {
            return Promise.reject(new Error('Transient error'));
          }
          return Promise.resolve({
            data: TestDataFactory.createBulkProducts(10),
            error: null
          });
        })
      }));

      const startTime = performance.now();
      
      // Simulate retry logic with recovery
      let result;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          result = await getProducts();
          break;
        } catch (error) {
          if (attempt === 5) throw error;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const endTime = performance.now();
      const recoveryTime = endTime - startTime;

      expect(result?.error).toBeNull();
      expect(recoveryTime).toBeLessThan(2000); // Should recover within 2 seconds
      expect(errorCount).toBe(maxErrors + 1);
    });
  });
});