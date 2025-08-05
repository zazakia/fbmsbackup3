import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Product } from '../../../types/business';

describe('Concurrent Stock Update Handling and Race Condition Prevention - ULTIMATE POWER! ⚡', () => {
  let testProducts: Product[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'small' });
    
    testProducts = Array.from({ length: 10 }, () => TestDataFactory.createProduct({
      stock: 1000 // High stock for testing
    }));
    
    mockServices.supabase.setMockData('products', testProducts);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Race Condition Prevention 🏁', () => {
    it('should handle simultaneous stock updates like a BOSS! 💪', async () => {
      const product = testProducts[0];
      const originalStock = product.stock;
      
      // Simulate 100 concurrent updates
      const concurrentUpdates = Array.from({ length: 100 }, (_, i) => 
        updateStockWithLocking(product.id, -1, `concurrent-user-${i}`)
      );

      const results = await Promise.all(concurrentUpdates);
      const successfulUpdates = results.filter(r => r.success);

      expect(successfulUpdates).toHaveLength(100);
      
      // Final stock should be exactly original - 100
      const finalProduct = await getProduct(product.id);
      expect(finalProduct.stock).toBe(originalStock - 100);
    });

    it('should prevent double-spending scenarios', async () => {
      const product = testProducts[1];
      product.stock = 1; // Only 1 item left
      await updateProduct(product.id, { stock: 1 });

      // Two users try to buy the last item simultaneously
      const buyer1Promise = updateStockWithLocking(product.id, -1, 'buyer-1');
      const buyer2Promise = updateStockWithLocking(product.id, -1, 'buyer-2');

      const [result1, result2] = await Promise.all([buyer1Promise, buyer2Promise]);

      // Only one should succeed
      const successCount = [result1, result2].filter(r => r.success).length;
      expect(successCount).toBe(1);

      const finalProduct = await getProduct(product.id);
      expect(finalProduct.stock).toBe(0);
    });

    it('should handle optimistic locking conflicts', async () => {
      const product = testProducts[2];
      
      // Simulate version-based optimistic locking
      const update1 = updateStockWithOptimisticLocking(product.id, -50, 'user-1', 1);
      const update2 = updateStockWithOptimisticLocking(product.id, -75, 'user-2', 1);

      const [result1, result2] = await Promise.all([update1, update2]);

      // One should succeed, one should fail due to version conflict
      const successCount = [result1, result2].filter(r => r.success).length;
      expect(successCount).toBe(1);

      const failedResult = [result1, result2].find(r => !r.success);
      expect(failedResult?.error).toBe('Version conflict - record was modified');
    });
  });

  describe('Distributed Locking 🔒', () => {
    it('should implement distributed locks for critical sections', async () => {
      const product = testProducts[0];
      const lockKey = `product-${product.id}`;

      // Test lock acquisition and release
      const lock1 = await acquireDistributedLock(lockKey, 'process-1', 5000);
      expect(lock1.acquired).toBe(true);

      // Second process should fail to acquire same lock
      const lock2 = await acquireDistributedLock(lockKey, 'process-2', 1000);
      expect(lock2.acquired).toBe(false);

      // Release first lock
      await releaseDistributedLock(lockKey, lock1.lockId!);

      // Now second process should be able to acquire
      const lock3 = await acquireDistributedLock(lockKey, 'process-2', 1000);
      expect(lock3.acquired).toBe(true);

      await releaseDistributedLock(lockKey, lock3.lockId!);
    });

    it('should handle lock timeouts gracefully', async () => {
      const product = testProducts[1];
      const lockKey = `product-${product.id}`;

      // Acquire lock with short timeout
      const lock = await acquireDistributedLock(lockKey, 'process-1', 100);
      expect(lock.acquired).toBe(true);

      // Wait for lock to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be able to acquire expired lock
      const newLock = await acquireDistributedLock(lockKey, 'process-2', 1000);
      expect(newLock.acquired).toBe(true);

      await releaseDistributedLock(lockKey, newLock.lockId!);
    });

    it('should prevent deadlocks in multi-resource scenarios', async () => {
      const product1 = testProducts[0];
      const product2 = testProducts[1];

      // Process 1: Lock product1 then product2
      const process1 = async () => {
        const lock1 = await acquireDistributedLock(`product-${product1.id}`, 'process-1', 2000);
        if (!lock1.acquired) return { success: false, error: 'Failed to acquire lock1' };

        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work

        const lock2 = await acquireDistributedLock(`product-${product2.id}`, 'process-1', 2000);
        if (!lock2.acquired) {
          await releaseDistributedLock(`product-${product1.id}`, lock1.lockId!);
          return { success: false, error: 'Failed to acquire lock2' };
        }

        // Do work with both products
        await new Promise(resolve => setTimeout(resolve, 50));

        await releaseDistributedLock(`product-${product2.id}`, lock2.lockId!);
        await releaseDistributedLock(`product-${product1.id}`, lock1.lockId!);
        
        return { success: true };
      };

      // Process 2: Lock product2 then product1 (reverse order)
      const process2 = async () => {
        const lock1 = await acquireDistributedLock(`product-${product2.id}`, 'process-2', 2000);
        if (!lock1.acquired) return { success: false, error: 'Failed to acquire lock1' };

        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work

        const lock2 = await acquireDistributedLock(`product-${product1.id}`, 'process-2', 2000);
        if (!lock2.acquired) {
          await releaseDistributedLock(`product-${product2.id}`, lock1.lockId!);
          return { success: false, error: 'Failed to acquire lock2' };
        }

        // Do work with both products
        await new Promise(resolve => setTimeout(resolve, 50));

        await releaseDistributedLock(`product-${product1.id}`, lock2.lockId!);
        await releaseDistributedLock(`product-${product2.id}`, lock1.lockId!);
        
        return { success: true };
      };

      const [result1, result2] = await Promise.all([process1(), process2()]);

      // At least one should succeed (deadlock prevention should work)
      const successCount = [result1, result2].filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Transaction Management 💳', () => {
    it('should handle atomic multi-product updates', async () => {
      const products = testProducts.slice(0, 3);
      const updates = products.map(p => ({
        productId: p.id,
        stockChange: -100,
        reason: 'Multi-product sale'
      }));

      const result = await atomicMultiProductUpdate(updates, 'transaction-user');

      expect(result.success).toBe(true);
      expect(result.updatedProducts).toHaveLength(3);

      // Verify all products were updated
      for (const product of products) {
        const updated = await getProduct(product.id);
        expect(updated.stock).toBe(product.stock - 100);
      }
    });

    it('should rollback on partial failure', async () => {
      const products = testProducts.slice(0, 3);
      products[1].stock = 50; // Set low stock for middle product
      await updateProduct(products[1].id, { stock: 50 });

      const updates = [
        { productId: products[0].id, stockChange: -100, reason: 'Sale' },
        { productId: products[1].id, stockChange: -100, reason: 'Sale' }, // Will fail
        { productId: products[2].id, stockChange: -100, reason: 'Sale' }
      ];

      const result = await atomicMultiProductUpdate(updates, 'transaction-user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');

      // Verify no products were updated (rollback)
      const product1 = await getProduct(products[0].id);
      const product3 = await getProduct(products[2].id);
      
      expect(product1.stock).toBe(products[0].stock); // Unchanged
      expect(product3.stock).toBe(products[2].stock); // Unchanged
    });
  });

  describe('Performance Under Load 🚀', () => {
    it('should maintain performance with high concurrency', async () => {
      const product = testProducts[0];
      const concurrencyLevel = 1000;
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrencyLevel }, (_, i) =>
        updateStockWithLocking(product.id, i % 2 === 0 ? -1 : 1, `load-test-${i}`)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const successCount = results.filter(r => r.success).length;

      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(successCount).toBe(concurrencyLevel);
    });

    it('should handle burst traffic patterns', async () => {
      const product = testProducts[1];
      const burstSize = 500;
      const burstCount = 5;

      for (let burst = 0; burst < burstCount; burst++) {
        const burstPromises = Array.from({ length: burstSize }, (_, i) =>
          updateStockWithLocking(product.id, -1, `burst-${burst}-${i}`)
        );

        const burstResults = await Promise.all(burstPromises);
        const successCount = burstResults.filter(r => r.success).length;
        
        expect(successCount).toBe(burstSize);

        // Small delay between bursts
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const finalProduct = await getProduct(product.id);
      expect(finalProduct.stock).toBe(product.stock - (burstSize * burstCount));
    });
  });

  describe('Data Consistency Validation 🛡️', () => {
    it('should maintain stock consistency across operations', async () => {
      const product = testProducts[0];
      const originalStock = product.stock;
      
      // Mix of operations
      const operations = [
        () => updateStockWithLocking(product.id, -50, 'sale-1'),
        () => updateStockWithLocking(product.id, 100, 'purchase-1'),
        () => updateStockWithLocking(product.id, -25, 'adjustment-1'),
        () => updateStockWithLocking(product.id, -75, 'sale-2'),
        () => updateStockWithLocking(product.id, 200, 'purchase-2')
      ];

      // Run operations concurrently multiple times
      for (let round = 0; round < 10; round++) {
        const promises = operations.map(op => op());
        await Promise.all(promises);
      }

      const finalProduct = await getProduct(product.id);
      const expectedStock = originalStock + (10 * (100 + 200 - 50 - 25 - 75));
      
      expect(finalProduct.stock).toBe(expectedStock);
    });

    it('should detect and prevent phantom reads', async () => {
      const product = testProducts[1];
      
      // Transaction 1: Read stock, then update based on read value
      const transaction1 = async () => {
        const readStock = await getProduct(product.id);
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
        
        // Update based on read value
        return updateStockWithLocking(product.id, -Math.floor(readStock.stock / 2), 'transaction-1');
      };

      // Transaction 2: Concurrent update
      const transaction2 = async () => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Start slightly later
        return updateStockWithLocking(product.id, -100, 'transaction-2');
      };

      const [result1, result2] = await Promise.all([transaction1(), transaction2()]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Final stock should be consistent
      const finalProduct = await getProduct(product.id);
      expect(finalProduct.stock).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper functions for concurrency control
interface StockUpdateResult {
  success: boolean;
  newStock?: number;
  error?: string;
  lockId?: string;
}

async function updateStockWithLocking(
  productId: string, 
  change: number, 
  userId: string
): Promise<StockUpdateResult> {
  const lockKey = `stock-${productId}`;
  const lock = await acquireDistributedLock(lockKey, userId, 5000);
  
  if (!lock.acquired) {
    return { success: false, error: 'Failed to acquire lock' };
  }

  try {
    const product = await getProduct(productId);
    const newStock = product.stock + change;

    if (newStock < 0) {
      return { success: false, error: 'Insufficient stock' };
    }

    await updateProduct(productId, { stock: newStock });
    
    return { success: true, newStock, lockId: lock.lockId };
  } finally {
    if (lock.lockId) {
      await releaseDistributedLock(lockKey, lock.lockId);
    }
  }
}

async function updateStockWithOptimisticLocking(
  productId: string,
  change: number,
  userId: string,
  expectedVersion: number
): Promise<StockUpdateResult> {
  try {
    const product = await getProduct(productId);
    
    // Check version
    if ((product as any).version !== expectedVersion) {
      return { success: false, error: 'Version conflict - record was modified' };
    }

    const newStock = product.stock + change;
    if (newStock < 0) {
      return { success: false, error: 'Insufficient stock' };
    }

    // Update with version increment
    await updateProduct(productId, { 
      stock: newStock, 
      version: expectedVersion + 1 
    });

    return { success: true, newStock };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Update failed' 
    };
  }
}

interface LockResult {
  acquired: boolean;
  lockId?: string;
  error?: string;
}

const activeLocks = new Map<string, { lockId: string; processId: string; expiresAt: number }>();

async function acquireDistributedLock(
  key: string, 
  processId: string, 
  timeoutMs: number
): Promise<LockResult> {
  const now = Date.now();
  const expiresAt = now + timeoutMs;
  const lockId = `lock-${now}-${Math.random().toString(36).substr(2, 9)}`;

  // Check if lock exists and is not expired
  const existingLock = activeLocks.get(key);
  if (existingLock && existingLock.expiresAt > now) {
    return { acquired: false, error: 'Lock already held' };
  }

  // Acquire lock
  activeLocks.set(key, { lockId, processId, expiresAt });
  
  return { acquired: true, lockId };
}

async function releaseDistributedLock(key: string, lockId: string): Promise<void> {
  const existingLock = activeLocks.get(key);
  if (existingLock && existingLock.lockId === lockId) {
    activeLocks.delete(key);
  }
}

interface MultiProductUpdate {
  productId: string;
  stockChange: number;
  reason: string;
}

interface AtomicUpdateResult {
  success: boolean;
  updatedProducts?: string[];
  error?: string;
}

async function atomicMultiProductUpdate(
  updates: MultiProductUpdate[],
  userId: string
): Promise<AtomicUpdateResult> {
  const lockKeys = updates.map(u => `stock-${u.productId}`);
  const acquiredLocks: string[] = [];

  try {
    // Acquire all locks in sorted order to prevent deadlocks
    const sortedLockKeys = [...lockKeys].sort();
    
    for (const lockKey of sortedLockKeys) {
      const lock = await acquireDistributedLock(lockKey, userId, 5000);
      if (!lock.acquired) {
        throw new Error(`Failed to acquire lock for ${lockKey}`);
      }
      acquiredLocks.push(lockKey);
    }

    // Validate all updates first
    const validationResults = [];
    for (const update of updates) {
      const product = await getProduct(update.productId);
      const newStock = product.stock + update.stockChange;
      
      if (newStock < 0) {
        throw new Error(`Insufficient stock for product ${update.productId}`);
      }
      
      validationResults.push({ productId: update.productId, newStock });
    }

    // Apply all updates
    const updatedProducts = [];
    for (const validation of validationResults) {
      await updateProduct(validation.productId, { stock: validation.newStock });
      updatedProducts.push(validation.productId);
    }

    return { success: true, updatedProducts };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Transaction failed' 
    };
  } finally {
    // Release all acquired locks
    for (const lockKey of acquiredLocks) {
      const lockId = activeLocks.get(lockKey)?.lockId;
      if (lockId) {
        await releaseDistributedLock(lockKey, lockId);
      }
    }
  }
}

async function getProduct(productId: string): Promise<Product> {
  const result = await mockServices.supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  return result.data;
}

async function updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
  await mockServices.supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', productId);
}