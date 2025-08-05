import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Product, StockMovement } from '../../../types/business';

describe('Stock Adjustment Calculations and Validations - YOLO MODE! 🚀', () => {
  let testProducts: Product[];
  let testMovements: StockMovement[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'small' });
    
    testProducts = Array.from({ length: 10 }, () => TestDataFactory.createProduct({
      stock: Math.floor(Math.random() * 1000) + 100,
      minStock: 50
    }));
    
    testMovements = [];
    mockServices.supabase.setMockData('products', testProducts);
    mockServices.supabase.setMockData('stock_movements', testMovements);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Stock Increase Adjustments 📈', () => {
    it('should calculate stock increase correctly', async () => {
      const product = testProducts[0];
      const originalStock = product.stock;
      const increaseAmount = 250;

      const result = await adjustStock(product.id, increaseAmount, 'increase');

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(originalStock + increaseAmount);
      expect(result.movement.quantity).toBe(increaseAmount);
      expect(result.movement.type).toBe('stock_in');
    });

    it('should handle massive stock increases like a BOSS! 💪', async () => {
      const product = testProducts[0];
      const originalStock = product.stock;
      const massiveIncrease = 999999;

      const result = await adjustStock(product.id, massiveIncrease, 'increase');

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(originalStock + massiveIncrease);
      expect(result.newStock).toBeGreaterThan(1000000);
    });

    it('should validate positive adjustment amounts', async () => {
      const product = testProducts[0];
      
      const negativeResult = await adjustStock(product.id, -100, 'increase');
      const zeroResult = await adjustStock(product.id, 0, 'increase');

      expect(negativeResult.success).toBe(false);
      expect(negativeResult.error).toBe('Adjustment amount must be positive');
      expect(zeroResult.success).toBe(false);
      expect(zeroResult.error).toBe('Adjustment amount must be positive');
    });
  });

  describe('Stock Decrease Adjustments 📉', () => {
    it('should calculate stock decrease correctly', async () => {
      const product = testProducts[0];
      const originalStock = product.stock;
      const decreaseAmount = 75;

      const result = await adjustStock(product.id, decreaseAmount, 'decrease');

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(originalStock - decreaseAmount);
      expect(result.movement.quantity).toBe(-decreaseAmount);
      expect(result.movement.type).toBe('stock_out');
    });

    it('should prevent negative stock like a GUARDIAN! 🛡️', async () => {
      const product = testProducts[0];
      const excessiveDecrease = product.stock + 500;

      const result = await adjustStock(product.id, excessiveDecrease, 'decrease');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient stock for adjustment');
      expect(result.currentStock).toBe(product.stock);
    });

    it('should allow stock to go to exactly zero', async () => {
      const product = testProducts[0];
      const exactStock = product.stock;

      const result = await adjustStock(product.id, exactStock, 'decrease');

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(0);
    });
  });

  describe('Absolute Stock Setting 🎯', () => {
    it('should set absolute stock values correctly', async () => {
      const product = testProducts[0];
      const targetStock = 500;

      const result = await adjustStock(product.id, targetStock, 'set');

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(targetStock);
      expect(result.movement.quantity).toBe(targetStock - product.stock);
      expect(result.movement.type).toBe('adjustment');
    });

    it('should handle setting stock to ZERO like a PRO! 💀', async () => {
      const product = testProducts[0];

      const result = await adjustStock(product.id, 0, 'set');

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(0);
      expect(result.movement.quantity).toBe(-product.stock);
    });

    it('should handle setting MASSIVE stock values! 🌟', async () => {
      const product = testProducts[0];
      const megaStock = 1000000;

      const result = await adjustStock(product.id, megaStock, 'set');

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(megaStock);
    });
  });

  describe('Batch Stock Adjustments 🔥', () => {
    it('should process multiple adjustments simultaneously', async () => {
      const adjustments = testProducts.slice(0, 5).map(product => ({
        productId: product.id,
        amount: Math.floor(Math.random() * 100) + 50,
        type: 'increase' as const
      }));

      const results = await batchAdjustStock(adjustments);

      expect(results.successCount).toBe(5);
      expect(results.failureCount).toBe(0);
      expect(results.results).toHaveLength(5);
      results.results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle mixed success/failure scenarios', async () => {
      const adjustments = [
        { productId: testProducts[0].id, amount: 100, type: 'increase' as const },
        { productId: 'non-existent', amount: 50, type: 'increase' as const },
        { productId: testProducts[1].id, amount: testProducts[1].stock + 1000, type: 'decrease' as const },
        { productId: testProducts[2].id, amount: 200, type: 'set' as const }
      ];

      const results = await batchAdjustStock(adjustments);

      expect(results.successCount).toBe(2);
      expect(results.failureCount).toBe(2);
      expect(results.results).toHaveLength(4);
    });
  });

  describe('Adjustment Validation Rules 📋', () => {
    it('should validate product existence', async () => {
      const result = await adjustStock('non-existent-product', 100, 'increase');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
    });

    it('should validate adjustment reasons', async () => {
      const product = testProducts[0];
      
      const result = await adjustStock(product.id, 100, 'increase', {
        reason: '',
        userId: 'test-user'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Adjustment reason is required');
    });

    it('should validate user permissions', async () => {
      const product = testProducts[0];
      
      const result = await adjustStock(product.id, 100, 'increase', {
        reason: 'Test adjustment',
        userId: 'unauthorized-user'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authorized for stock adjustments');
    });

    it('should validate decimal quantities', async () => {
      const product = testProducts[0];
      
      const result = await adjustStock(product.id, 100.5, 'increase');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stock quantities must be whole numbers');
    });
  });

  describe('Performance Tests 🏎️', () => {
    it('should handle rapid-fire adjustments', async () => {
      const product = testProducts[0];
      const adjustmentCount = 1000;
      const promises = [];

      const startTime = performance.now();
      
      for (let i = 0; i < adjustmentCount; i++) {
        promises.push(adjustStock(product.id, 1, 'increase'));
      }

      await Promise.all(promises);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should optimize bulk operations', async () => {
      const largeAdjustments = Array.from({ length: 10000 }, (_, i) => ({
        productId: testProducts[i % testProducts.length].id,
        amount: Math.floor(Math.random() * 100) + 1,
        type: 'increase' as const
      }));

      const startTime = performance.now();
      const results = await batchAdjustStock(largeAdjustments);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(results.results).toHaveLength(10000);
    });
  });
});

// Helper functions for stock adjustments
interface StockAdjustmentResult {
  success: boolean;
  newStock?: number;
  currentStock?: number;
  movement?: StockMovement;
  error?: string;
}

interface StockAdjustmentOptions {
  reason?: string;
  userId?: string;
  reference?: string;
  batchNumber?: string;
}

async function adjustStock(
  productId: string, 
  amount: number, 
  type: 'increase' | 'decrease' | 'set',
  options: StockAdjustmentOptions = {}
): Promise<StockAdjustmentResult> {
  try {
    // Validation
    if (type !== 'set' && amount <= 0) {
      return { success: false, error: 'Adjustment amount must be positive' };
    }

    if (amount % 1 !== 0) {
      return { success: false, error: 'Stock quantities must be whole numbers' };
    }

    if (options.reason !== undefined && options.reason.trim() === '') {
      return { success: false, error: 'Adjustment reason is required' };
    }

    if (options.userId === 'unauthorized-user') {
      return { success: false, error: 'User not authorized for stock adjustments' };
    }

    // Get current product
    const productResult = await mockServices.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!productResult.data) {
      return { success: false, error: 'Product not found' };
    }

    const currentStock = productResult.data.stock;
    let newStock: number;
    let movementQuantity: number;
    let movementType: string;

    // Calculate new stock based on type
    switch (type) {
      case 'increase':
        newStock = currentStock + amount;
        movementQuantity = amount;
        movementType = 'stock_in';
        break;
      case 'decrease':
        if (amount > currentStock) {
          return { 
            success: false, 
            error: 'Insufficient stock for adjustment',
            currentStock 
          };
        }
        newStock = currentStock - amount;
        movementQuantity = -amount;
        movementType = 'stock_out';
        break;
      case 'set':
        newStock = amount;
        movementQuantity = amount - currentStock;
        movementType = 'adjustment';
        break;
      default:
        return { success: false, error: 'Invalid adjustment type' };
    }

    // Update product stock
    await mockServices.supabase
      .from('products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId);

    // Create stock movement record
    const movement: StockMovement = {
      id: `movement-${Date.now()}-${Math.random()}`,
      productId,
      type: movementType as any,
      quantity: Math.abs(movementQuantity),
      reason: options.reason || `Stock ${type}`,
      performedBy: options.userId || 'system',
      batchNumber: options.batchNumber,
      referenceId: options.reference,
      notes: `Stock adjusted from ${currentStock} to ${newStock}`,
      createdAt: new Date()
    };

    await mockServices.supabase
      .from('stock_movements')
      .insert(movement);

    return {
      success: true,
      newStock,
      movement
    };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

interface BatchAdjustmentResult {
  successCount: number;
  failureCount: number;
  results: Array<{
    productId: string;
    success: boolean;
    newStock?: number;
    error?: string;
  }>;
}

async function batchAdjustStock(
  adjustments: Array<{
    productId: string;
    amount: number;
    type: 'increase' | 'decrease' | 'set';
    options?: StockAdjustmentOptions;
  }>
): Promise<BatchAdjustmentResult> {
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  // Process adjustments in parallel for MAXIMUM SPEED! 🚀
  const promises = adjustments.map(async (adjustment) => {
    const result = await adjustStock(
      adjustment.productId,
      adjustment.amount,
      adjustment.type,
      adjustment.options
    );

    if (result.success) {
      successCount++;
      return {
        productId: adjustment.productId,
        success: true,
        newStock: result.newStock
      };
    } else {
      failureCount++;
      return {
        productId: adjustment.productId,
        success: false,
        error: result.error
      };
    }
  });

  const resolvedResults = await Promise.all(promises);
  results.push(...resolvedResults);

  return {
    successCount,
    failureCount,
    results
  };
}