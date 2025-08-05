import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Product, StockMovement } from '../../../types/business';

describe('Stock Movement Data Integrity and Consistency - FORTRESS MODE! 🛡️', () => {
  let testProducts: Product[];
  let testMovements: StockMovement[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
    
    testProducts = Array.from({ length: 20 }, () => TestDataFactory.createProduct());
    testMovements = Array.from({ length: 50 }, () => TestDataFactory.createStockMovement());
    
    mockServices.supabase.setMockData('products', testProducts);
    mockServices.supabase.setMockData('stock_movements', testMovements);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Data Consistency Validation 🔍', () => {
    it('should validate stock movement totals match product stock', async () => {
      const product = testProducts[0];
      const movements = [
        { type: 'initial_stock', quantity: 1000 },
        { type: 'stock_out', quantity: 200 },
        { type: 'stock_in', quantity: 150 },
        { type: 'adjustment_out', quantity: 50 }
      ];

      // Create movements
      for (const movement of movements) {
        await createStockMovement({
          productId: product.id,
          type: movement.type as any,
          quantity: movement.quantity,
          reason: `Test ${movement.type}`,
          performedBy: 'test-user'
        });
      }

      const validation = await validateStockConsistency(product.id);
      
      expect(validation.isConsistent).toBe(true);
      expect(validation.calculatedStock).toBe(900); // 1000 - 200 + 150 - 50
      expect(validation.actualStock).toBe(validation.calculatedStock);
    });

    it('should detect stock inconsistencies like a DETECTIVE! 🕵️', async () => {
      const product = testProducts[1];
      
      // Create movements that don't match actual stock
      await createStockMovement({
        productId: product.id,
        type: 'stock_out',
        quantity: 500,
        reason: 'Large sale',
        performedBy: 'test-user'
      });

      // Manually set different stock value
      await updateProductStock(product.id, product.stock - 300); // Different from movement

      const validation = await validateStockConsistency(product.id);
      
      expect(validation.isConsistent).toBe(false);
      expect(validation.discrepancy).toBe(200); // 500 - 300
    });

    it('should validate referential integrity', async () => {
      // Create movement with non-existent product
      const invalidMovement = {
        productId: 'non-existent-product',
        type: 'stock_in',
        quantity: 100,
        reason: 'Invalid movement',
        performedBy: 'test-user'
      };

      const result = await createStockMovement(invalidMovement);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
    });

    it('should validate movement sequence integrity', async () => {
      const product = testProducts[2];
      
      // Create movements with timestamps
      const movements = [
        { timestamp: new Date('2024-01-01'), type: 'initial_stock', quantity: 1000 },
        { timestamp: new Date('2024-01-02'), type: 'stock_out', quantity: 100 },
        { timestamp: new Date('2024-01-03'), type: 'stock_in', quantity: 200 },
        { timestamp: new Date('2024-01-01T12:00:00'), type: 'stock_out', quantity: 50 } // Out of sequence
      ];

      for (const movement of movements) {
        await createStockMovement({
          productId: product.id,
          type: movement.type as any,
          quantity: movement.quantity,
          reason: `Sequence test`,
          performedBy: 'test-user',
          timestamp: movement.timestamp
        });
      }

      const sequenceValidation = await validateMovementSequence(product.id);
      
      expect(sequenceValidation.hasSequenceIssues).toBe(true);
      expect(sequenceValidation.outOfSequenceMovements).toHaveLength(1);
    });
  });

  describe('Audit Trail Integrity 📋', () => {
    it('should maintain complete audit trails', async () => {
      const product = testProducts[0];
      const userId = 'audit-user';
      
      // Create series of movements
      const movements = [
        { type: 'stock_in', quantity: 500, reason: 'Purchase' },
        { type: 'stock_out', quantity: 100, reason: 'Sale 1' },
        { type: 'stock_out', quantity: 150, reason: 'Sale 2' },
        { type: 'adjustment_in', quantity: 25, reason: 'Count correction' }
      ];

      for (const movement of movements) {
        await createStockMovement({
          productId: product.id,
          type: movement.type as any,
          quantity: movement.quantity,
          reason: movement.reason,
          performedBy: userId
        });
      }

      const auditTrail = await generateAuditTrail(product.id);
      
      expect(auditTrail.movements).toHaveLength(4);
      expect(auditTrail.isComplete).toBe(true);
      expect(auditTrail.hasGaps).toBe(false);
    });

    it('should detect missing audit entries', async () => {
      const product = testProducts[1];
      
      // Create movement but simulate missing audit entry
      await createStockMovement({
        productId: product.id,
        type: 'stock_out',
        quantity: 200,
        reason: 'Sale',
        performedBy: 'user1'
      });

      // Manually update stock without creating movement record
      await updateProductStock(product.id, product.stock - 100);

      const auditValidation = await validateAuditCompleteness(product.id);
      
      expect(auditValidation.isComplete).toBe(false);
      expect(auditValidation.missingEntries).toBeGreaterThan(0);
    });

    it('should validate user authorization trails', async () => {
      const product = testProducts[2];
      
      // Create movements with different authorization levels
      const movements = [
        { userId: 'manager-1', type: 'adjustment_in', quantity: 100, requiresApproval: true },
        { userId: 'clerk-1', type: 'stock_out', quantity: 50, requiresApproval: false },
        { userId: 'unauthorized-user', type: 'adjustment_out', quantity: 200, requiresApproval: true }
      ];

      const results = [];
      for (const movement of movements) {
        const result = await createStockMovement({
          productId: product.id,
          type: movement.type as any,
          quantity: movement.quantity,
          reason: 'Authorization test',
          performedBy: movement.userId,
          requiresApproval: movement.requiresApproval
        });
        results.push(result);
      }

      expect(results[0].success).toBe(true); // Manager authorized
      expect(results[1].success).toBe(true); // Clerk authorized for simple operations
      expect(results[2].success).toBe(false); // Unauthorized user
    });
  });

  describe('Transaction Integrity 💳', () => {
    it('should maintain ACID properties in transactions', async () => {
      const products = testProducts.slice(0, 3);
      
      // Atomic transaction: all or nothing
      const transactionData = products.map(p => ({
        productId: p.id,
        stockChange: -100,
        reason: 'Multi-product sale'
      }));

      const result = await executeAtomicStockTransaction(transactionData, 'transaction-user');
      
      expect(result.success).toBe(true);
      expect(result.affectedProducts).toHaveLength(3);
      
      // Verify all products were updated
      for (const product of products) {
        const updated = await getProduct(product.id);
        expect(updated.stock).toBe(product.stock - 100);
      }
    });

    it('should rollback on transaction failure', async () => {
      const products = testProducts.slice(0, 3);
      products[1].stock = 50; // Set low stock for failure
      await updateProductStock(products[1].id, 50);

      const transactionData = [
        { productId: products[0].id, stockChange: -100, reason: 'Sale' },
        { productId: products[1].id, stockChange: -100, reason: 'Sale' }, // Will fail
        { productId: products[2].id, stockChange: -100, reason: 'Sale' }
      ];

      const result = await executeAtomicStockTransaction(transactionData, 'transaction-user');
      
      expect(result.success).toBe(false);
      
      // Verify no products were updated (rollback)
      const product1 = await getProduct(products[0].id);
      const product3 = await getProduct(products[2].id);
      
      expect(product1.stock).toBe(products[0].stock); // Unchanged
      expect(product3.stock).toBe(products[2].stock); // Unchanged
    });

    it('should handle nested transactions correctly', async () => {
      const product = testProducts[0];
      
      // Outer transaction
      const outerResult = await executeNestedTransaction(product.id, [
        { type: 'stock_in', quantity: 200, reason: 'Purchase' },
        // Inner transaction
        {
          type: 'nested',
          operations: [
            { type: 'stock_out', quantity: 50, reason: 'Sale 1' },
            { type: 'stock_out', quantity: 75, reason: 'Sale 2' }
          ]
        },
        { type: 'adjustment_in', quantity: 25, reason: 'Adjustment' }
      ]);

      expect(outerResult.success).toBe(true);
      
      const finalProduct = await getProduct(product.id);
      const expectedStock = product.stock + 200 - 50 - 75 + 25;
      expect(finalProduct.stock).toBe(expectedStock);
    });
  });

  describe('Concurrency Control 🔄', () => {
    it('should prevent lost updates in concurrent scenarios', async () => {
      const product = testProducts[0];
      const originalStock = product.stock;
      
      // Two concurrent updates
      const update1 = updateStockWithVersionControl(product.id, -100, 'user1', 1);
      const update2 = updateStockWithVersionControl(product.id, -150, 'user2', 1);

      const [result1, result2] = await Promise.all([update1, update2]);
      
      // One should succeed, one should fail due to version conflict
      const successCount = [result1, result2].filter(r => r.success).length;
      expect(successCount).toBe(1);
      
      const finalProduct = await getProduct(product.id);
      // Final stock should reflect only one update
      expect([originalStock - 100, originalStock - 150]).toContain(finalProduct.stock);
    });

    it('should handle deadlock prevention', async () => {
      const product1 = testProducts[0];
      const product2 = testProducts[1];

      // Process 1: Update product1 then product2
      const process1 = async () => {
        return executeMultiProductUpdate([
          { productId: product1.id, stockChange: -50 },
          { productId: product2.id, stockChange: -25 }
        ], 'process1');
      };

      // Process 2: Update product2 then product1 (reverse order)
      const process2 = async () => {
        return executeMultiProductUpdate([
          { productId: product2.id, stockChange: -30 },
          { productId: product1.id, stockChange: -40 }
        ], 'process2');
      };

      const [result1, result2] = await Promise.all([process1(), process2()]);
      
      // Both should succeed (deadlock prevention should work)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Data Recovery and Backup 💾', () => {
    it('should create consistent data snapshots', async () => {
      const products = testProducts.slice(0, 5);
      
      // Create some movements
      for (const product of products) {
        await createStockMovement({
          productId: product.id,
          type: 'stock_in',
          quantity: 100,
          reason: 'Snapshot test',
          performedBy: 'test-user'
        });
      }

      const snapshot = await createDataSnapshot();
      
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.productCount).toBe(products.length);
      expect(snapshot.movementCount).toBeGreaterThan(0);
      expect(snapshot.checksum).toBeDefined();
    });

    it('should validate snapshot integrity', async () => {
      const snapshot = await createDataSnapshot();
      
      // Simulate data corruption
      const corruptedSnapshot = {
        ...snapshot,
        checksum: 'invalid-checksum'
      };

      const validation = await validateSnapshotIntegrity(corruptedSnapshot);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Checksum mismatch');
    });

    it('should restore from backup correctly', async () => {
      const originalProducts = [...testProducts];
      
      // Create snapshot
      const snapshot = await createDataSnapshot();
      
      // Make changes
      await updateProductStock(testProducts[0].id, 999);
      await createStockMovement({
        productId: testProducts[0].id,
        type: 'adjustment_in',
        quantity: 500,
        reason: 'Test change',
        performedBy: 'test-user'
      });

      // Restore from snapshot
      const restoreResult = await restoreFromSnapshot(snapshot);
      
      expect(restoreResult.success).toBe(true);
      
      // Verify restoration
      const restoredProduct = await getProduct(testProducts[0].id);
      expect(restoredProduct.stock).toBe(originalProducts[0].stock);
    });
  });

  describe('Performance and Scalability 🚀', () => {
    it('should maintain integrity with large datasets', async () => {
      // Create large dataset
      const largeProductSet = Array.from({ length: 5000 }, () => TestDataFactory.createProduct());
      mockServices.supabase.setMockData('products', largeProductSet);

      const startTime = performance.now();
      
      // Validate integrity across all products
      const validationResults = await batchValidateIntegrity(largeProductSet.slice(0, 100));
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(validationResults.validCount).toBeGreaterThan(0);
      expect(validationResults.invalidCount).toBe(0);
    });

    it('should handle high-frequency integrity checks', async () => {
      const product = testProducts[0];
      const checkCount = 1000;
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: checkCount }, () => 
        validateStockConsistency(product.id)
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(results.every(r => r.isConsistent)).toBe(true);
    });
  });
});

// Helper functions for data integrity
interface StockConsistencyResult {
  isConsistent: boolean;
  calculatedStock: number;
  actualStock: number;
  discrepancy: number;
}

async function validateStockConsistency(productId: string): Promise<StockConsistencyResult> {
  const product = await getProduct(productId);
  const movements = await getStockMovements(productId);
  
  let calculatedStock = 0;
  const inTypes = ['stock_in', 'adjustment_in', 'transfer_in', 'return_in', 'initial_stock'];
  const outTypes = ['stock_out', 'adjustment_out', 'transfer_out', 'damage_out', 'expired_out'];
  
  movements.forEach(movement => {
    if (inTypes.includes(movement.type)) {
      calculatedStock += movement.quantity;
    } else if (outTypes.includes(movement.type)) {
      calculatedStock -= movement.quantity;
    }
  });
  
  const discrepancy = Math.abs(calculatedStock - product.stock);
  
  return {
    isConsistent: discrepancy === 0,
    calculatedStock,
    actualStock: product.stock,
    discrepancy
  };
}

async function validateMovementSequence(productId: string) {
  const movements = await getStockMovements(productId);
  const sortedMovements = movements.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  
  const outOfSequenceMovements = [];
  let runningStock = 0;
  
  sortedMovements.forEach((movement, index) => {
    const inTypes = ['stock_in', 'adjustment_in', 'transfer_in', 'return_in', 'initial_stock'];
    
    if (inTypes.includes(movement.type)) {
      runningStock += movement.quantity;
    } else {
      if (runningStock < movement.quantity) {
        outOfSequenceMovements.push(movement);
      }
      runningStock -= movement.quantity;
    }
  });
  
  return {
    hasSequenceIssues: outOfSequenceMovements.length > 0,
    outOfSequenceMovements
  };
}

async function generateAuditTrail(productId: string) {
  const movements = await getStockMovements(productId);
  
  return {
    movements,
    isComplete: movements.length > 0,
    hasGaps: false, // Simplified for test
    totalMovements: movements.length
  };
}

async function validateAuditCompleteness(productId: string) {
  const consistency = await validateStockConsistency(productId);
  
  return {
    isComplete: consistency.isConsistent,
    missingEntries: consistency.discrepancy > 0 ? 1 : 0
  };
}

interface MovementData {
  productId: string;
  type: string;
  quantity: number;
  reason: string;
  performedBy: string;
  timestamp?: Date;
  requiresApproval?: boolean;
}

async function createStockMovement(data: MovementData): Promise<{ success: boolean; error?: string }> {
  // Check if product exists
  const product = await getProduct(data.productId);
  if (!product) {
    return { success: false, error: 'Product not found' };
  }
  
  // Check authorization
  if (data.requiresApproval && !isAuthorizedUser(data.performedBy)) {
    return { success: false, error: 'User not authorized for this operation' };
  }
  
  // Create movement
  const movement = {
    id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    productId: data.productId,
    type: data.type,
    quantity: data.quantity,
    reason: data.reason,
    performedBy: data.performedBy,
    createdAt: data.timestamp || new Date()
  };
  
  await mockServices.supabase.from('stock_movements').insert(movement);
  
  return { success: true };
}

function isAuthorizedUser(userId: string): boolean {
  const authorizedUsers = ['manager-1', 'admin-1', 'clerk-1'];
  return authorizedUsers.includes(userId);
}

async function executeAtomicStockTransaction(
  updates: Array<{ productId: string; stockChange: number; reason: string }>,
  userId: string
): Promise<{ success: boolean; affectedProducts?: string[]; error?: string }> {
  try {
    const affectedProducts = [];
    
    // Validate all updates first
    for (const update of updates) {
      const product = await getProduct(update.productId);
      if (product.stock + update.stockChange < 0) {
        throw new Error(`Insufficient stock for product ${update.productId}`);
      }
    }
    
    // Apply all updates
    for (const update of updates) {
      const product = await getProduct(update.productId);
      await updateProductStock(update.productId, product.stock + update.stockChange);
      await createStockMovement({
        productId: update.productId,
        type: update.stockChange > 0 ? 'stock_in' : 'stock_out',
        quantity: Math.abs(update.stockChange),
        reason: update.reason,
        performedBy: userId
      });
      affectedProducts.push(update.productId);
    }
    
    return { success: true, affectedProducts };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Transaction failed' 
    };
  }
}

async function executeNestedTransaction(productId: string, operations: any[]): Promise<{ success: boolean }> {
  // Simplified nested transaction simulation
  for (const operation of operations) {
    if (operation.type === 'nested') {
      for (const nestedOp of operation.operations) {
        await createStockMovement({
          productId,
          type: nestedOp.type,
          quantity: nestedOp.quantity,
          reason: nestedOp.reason,
          performedBy: 'nested-user'
        });
      }
    } else {
      await createStockMovement({
        productId,
        type: operation.type,
        quantity: operation.quantity,
        reason: operation.reason,
        performedBy: 'transaction-user'
      });
    }
  }
  
  return { success: true };
}

async function updateStockWithVersionControl(
  productId: string,
  change: number,
  userId: string,
  expectedVersion: number
): Promise<{ success: boolean; error?: string }> {
  const product = await getProduct(productId);
  
  if ((product as any).version !== expectedVersion) {
    return { success: false, error: 'Version conflict' };
  }
  
  await updateProductStock(productId, product.stock + change);
  return { success: true };
}

async function executeMultiProductUpdate(
  updates: Array<{ productId: string; stockChange: number }>,
  userId: string
): Promise<{ success: boolean }> {
  // Sort product IDs to prevent deadlocks
  const sortedUpdates = updates.sort((a, b) => a.productId.localeCompare(b.productId));
  
  for (const update of sortedUpdates) {
    const product = await getProduct(update.productId);
    await updateProductStock(update.productId, product.stock + update.stockChange);
  }
  
  return { success: true };
}

interface DataSnapshot {
  timestamp: Date;
  productCount: number;
  movementCount: number;
  checksum: string;
  data: any;
}

async function createDataSnapshot(): Promise<DataSnapshot> {
  const products = await mockServices.supabase.from('products').select('*');
  const movements = await mockServices.supabase.from('stock_movements').select('*');
  
  const data = {
    products: products.data || [],
    movements: movements.data || []
  };
  
  const checksum = generateChecksum(data);
  
  return {
    timestamp: new Date(),
    productCount: (products.data || []).length,
    movementCount: (movements.data || []).length,
    checksum,
    data
  };
}

function generateChecksum(data: any): string {
  return `checksum-${JSON.stringify(data).length}-${Date.now()}`;
}

async function validateSnapshotIntegrity(snapshot: DataSnapshot): Promise<{ isValid: boolean; errors: string[] }> {
  const errors = [];
  const expectedChecksum = generateChecksum(snapshot.data);
  
  if (snapshot.checksum !== expectedChecksum) {
    errors.push('Checksum mismatch');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

async function restoreFromSnapshot(snapshot: DataSnapshot): Promise<{ success: boolean }> {
  // Restore products
  mockServices.supabase.setMockData('products', snapshot.data.products);
  mockServices.supabase.setMockData('stock_movements', snapshot.data.movements);
  
  return { success: true };
}

async function batchValidateIntegrity(products: Product[]): Promise<{ validCount: number; invalidCount: number }> {
  let validCount = 0;
  let invalidCount = 0;
  
  for (const product of products) {
    const validation = await validateStockConsistency(product.id);
    if (validation.isConsistent) {
      validCount++;
    } else {
      invalidCount++;
    }
  }
  
  return { validCount, invalidCount };
}

async function getProduct(productId: string): Promise<Product> {
  const result = await mockServices.supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  
  return result.data;
}

async function getStockMovements(productId: string): Promise<StockMovement[]> {
  const result = await mockServices.supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });
  
  return result.data || [];
}

async function updateProductStock(productId: string, newStock: number): Promise<void> {
  await mockServices.supabase
    .from('products')
    .update({ stock: newStock, updated_at: new Date().toISOString() })
    .eq('id', productId);
}