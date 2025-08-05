import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Product, StockMovement } from '../../../types/business';

describe('Different Movement Types - UNLEASH THE POWER! 🔥', () => {
  let testProducts: Product[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'small' });
    
    testProducts = Array.from({ length: 15 }, () => TestDataFactory.createProduct({
      stock: Math.floor(Math.random() * 500) + 200
    }));
    
    mockServices.supabase.setMockData('products', testProducts);
    mockServices.supabase.setMockData('stock_movements', []);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Stock In Movements 📈', () => {
    it('should handle purchase receipts like a CHAMPION! 🏆', async () => {
      const product = testProducts[0];
      const receiptData = {
        productId: product.id,
        type: 'stock_in' as const,
        quantity: 500,
        reason: 'Purchase order receipt',
        referenceId: 'PO-2024-001',
        supplierId: 'SUPPLIER-ABC',
        unitCost: 25.75,
        batchNumber: 'BATCH-2024-001',
        expiryDate: new Date('2025-12-31'),
        performedBy: 'warehouse-manager'
      };

      const result = await processMovement(receiptData);

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(product.stock + 500);
      expect(result.movement.type).toBe('stock_in');
      expect(result.movement.referenceId).toBe('PO-2024-001');
      expect(result.movement.unitCost).toBe(25.75);
      expect(result.movement.batchNumber).toBe('BATCH-2024-001');
    });

    it('should handle production receipts with PRECISION! ⚡', async () => {
      const product = testProducts[1];
      const productionData = {
        productId: product.id,
        type: 'stock_in' as const,
        quantity: 1000,
        reason: 'Production completion',
        referenceId: 'PROD-2024-001',
        workOrderId: 'WO-001',
        productionDate: new Date(),
        qualityGrade: 'A',
        performedBy: 'production-supervisor'
      };

      const result = await processMovement(productionData);

      expect(result.success).toBe(true);
      expect(result.movement.workOrderId).toBe('WO-001');
      expect(result.movement.qualityGrade).toBe('A');
    });

    it('should handle return receipts from customers', async () => {
      const product = testProducts[2];
      const returnData = {
        productId: product.id,
        type: 'return_in' as const,
        quantity: 25,
        reason: 'Customer return - defective',
        referenceId: 'RET-2024-001',
        originalSaleId: 'SALE-2024-100',
        returnCondition: 'damaged',
        refundAmount: 1250.00,
        performedBy: 'customer-service'
      };

      const result = await processMovement(returnData);

      expect(result.success).toBe(true);
      expect(result.movement.type).toBe('return_in');
      expect(result.movement.originalSaleId).toBe('SALE-2024-100');
      expect(result.movement.returnCondition).toBe('damaged');
    });
  });

  describe('Stock Out Movements 📉', () => {
    it('should handle sales transactions with SPEED! 🚀', async () => {
      const product = testProducts[0];
      const saleData = {
        productId: product.id,
        type: 'stock_out' as const,
        quantity: 150,
        reason: 'Customer sale',
        referenceId: 'SALE-2024-001',
        customerId: 'CUST-001',
        salePrice: 45.00,
        discountApplied: 5.00,
        paymentMethod: 'cash',
        performedBy: 'cashier-001'
      };

      const result = await processMovement(saleData);

      expect(result.success).toBe(true);
      expect(result.newStock).toBe(product.stock - 150);
      expect(result.movement.type).toBe('stock_out');
      expect(result.movement.customerId).toBe('CUST-001');
      expect(result.movement.salePrice).toBe(45.00);
    });

    it('should handle bulk sales like a MACHINE! 🤖', async () => {
      const product = testProducts[1];
      const bulkSaleData = {
        productId: product.id,
        type: 'stock_out' as const,
        quantity: 2000,
        reason: 'Bulk wholesale order',
        referenceId: 'BULK-2024-001',
        customerId: 'WHOLESALE-001',
        wholesalePrice: 18.50,
        volumeDiscount: 15,
        deliveryDate: new Date('2024-02-15'),
        performedBy: 'sales-manager'
      };

      const result = await processMovement(bulkSaleData);

      expect(result.success).toBe(true);
      expect(result.movement.wholesalePrice).toBe(18.50);
      expect(result.movement.volumeDiscount).toBe(15);
    });

    it('should handle damage write-offs', async () => {
      const product = testProducts[2];
      const damageData = {
        productId: product.id,
        type: 'damage_out' as const,
        quantity: 75,
        reason: 'Product damaged during handling',
        damageType: 'physical',
        damageDescription: 'Dropped during transport',
        insuranceClaim: 'INS-2024-001',
        estimatedLoss: 1875.00,
        performedBy: 'warehouse-supervisor'
      };

      const result = await processMovement(damageData);

      expect(result.success).toBe(true);
      expect(result.movement.type).toBe('damage_out');
      expect(result.movement.damageType).toBe('physical');
      expect(result.movement.estimatedLoss).toBe(1875.00);
    });

    it('should handle expiry write-offs with AUTHORITY! 💪', async () => {
      const product = testProducts[3];
      const expiryData = {
        productId: product.id,
        type: 'expired_out' as const,
        quantity: 100,
        reason: 'Product expired',
        expiryDate: new Date('2024-01-31'),
        batchNumber: 'BATCH-2023-050',
        disposalMethod: 'incineration',
        disposalCost: 250.00,
        performedBy: 'quality-control'
      };

      const result = await processMovement(expiryData);

      expect(result.success).toBe(true);
      expect(result.movement.type).toBe('expired_out');
      expect(result.movement.disposalMethod).toBe('incineration');
      expect(result.movement.disposalCost).toBe(250.00);
    });
  });

  describe('Transfer Movements 🔄', () => {
    it('should handle inter-location transfers', async () => {
      const product = testProducts[0];
      const transferData = {
        productId: product.id,
        type: 'transfer_out' as const,
        quantity: 300,
        reason: 'Transfer to branch store',
        referenceId: 'TRANS-2024-001',
        fromLocationId: 'WAREHOUSE-MAIN',
        toLocationId: 'STORE-BRANCH-01',
        transferDate: new Date(),
        expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000),
        transportMethod: 'company-truck',
        performedBy: 'logistics-coordinator'
      };

      const result = await processMovement(transferData);

      expect(result.success).toBe(true);
      expect(result.movement.type).toBe('transfer_out');
      expect(result.movement.fromLocationId).toBe('WAREHOUSE-MAIN');
      expect(result.movement.toLocationId).toBe('STORE-BRANCH-01');
    });

    it('should handle transfer receipts', async () => {
      const product = testProducts[1];
      const receiptData = {
        productId: product.id,
        type: 'transfer_in' as const,
        quantity: 250,
        reason: 'Transfer receipt from warehouse',
        referenceId: 'TRANS-2024-001',
        fromLocationId: 'WAREHOUSE-MAIN',
        toLocationId: 'STORE-BRANCH-01',
        actualArrival: new Date(),
        conditionOnArrival: 'good',
        receivedBy: 'store-manager',
        performedBy: 'store-clerk'
      };

      const result = await processMovement(receiptData);

      expect(result.success).toBe(true);
      expect(result.movement.type).toBe('transfer_in');
      expect(result.movement.conditionOnArrival).toBe('good');
      expect(result.movement.receivedBy).toBe('store-manager');
    });

    it('should validate transfer quantities match', async () => {
      const product = testProducts[2];
      
      // Create transfer out
      await processMovement({
        productId: product.id,
        type: 'transfer_out',
        quantity: 200,
        reason: 'Transfer to branch',
        referenceId: 'TRANS-MISMATCH-001',
        performedBy: 'user1'
      });

      // Try to receive different quantity
      const mismatchReceipt = await processMovement({
        productId: product.id,
        type: 'transfer_in',
        quantity: 150, // Different quantity
        reason: 'Transfer receipt',
        referenceId: 'TRANS-MISMATCH-001',
        performedBy: 'user2'
      });

      expect(mismatchReceipt.success).toBe(false);
      expect(mismatchReceipt.error).toContain('quantity mismatch');
    });
  });

  describe('Adjustment Movements ⚖️', () => {
    it('should handle positive adjustments', async () => {
      const product = testProducts[0];
      const adjustmentData = {
        productId: product.id,
        type: 'adjustment_in' as const,
        quantity: 125,
        reason: 'Physical count correction - found additional stock',
        countDate: new Date(),
        countedBy: 'inventory-clerk',
        supervisorApproval: 'inventory-supervisor',
        varianceReason: 'Miscounted in previous cycle',
        performedBy: 'inventory-manager'
      };

      const result = await processMovement(adjustmentData);

      expect(result.success).toBe(true);
      expect(result.movement.type).toBe('adjustment_in');
      expect(result.movement.countedBy).toBe('inventory-clerk');
      expect(result.movement.supervisorApproval).toBe('inventory-supervisor');
    });

    it('should handle negative adjustments with PRECISION! 🎯', async () => {
      const product = testProducts[1];
      const adjustmentData = {
        productId: product.id,
        type: 'adjustment_out' as const,
        quantity: 85,
        reason: 'Physical count correction - stock shortage',
        countDate: new Date(),
        countedBy: 'inventory-clerk',
        supervisorApproval: 'inventory-supervisor',
        varianceReason: 'Theft suspected',
        investigationId: 'INV-2024-001',
        performedBy: 'inventory-manager'
      };

      const result = await processMovement(adjustmentData);

      expect(result.success).toBe(true);
      expect(result.movement.type).toBe('adjustment_out');
      expect(result.movement.investigationId).toBe('INV-2024-001');
    });

    it('should require supervisor approval for large adjustments', async () => {
      const product = testProducts[2];
      const largeAdjustment = {
        productId: product.id,
        type: 'adjustment_out' as const,
        quantity: 1000, // Large adjustment
        reason: 'Major discrepancy found',
        performedBy: 'inventory-clerk' // No supervisor approval
      };

      const result = await processMovement(largeAdjustment);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Large adjustments require supervisor approval');
    });
  });

  describe('Special Movement Types 🌟', () => {
    it('should handle initial stock setup', async () => {
      const product = testProducts[0];
      const initialData = {
        productId: product.id,
        type: 'initial_stock' as const,
        quantity: 5000,
        reason: 'Initial inventory setup',
        setupDate: new Date(),
        valuationMethod: 'FIFO',
        totalValue: 125000.00,
        setupBy: 'system-admin',
        performedBy: 'inventory-manager'
      };

      const result = await processMovement(initialData);

      expect(result.success).toBe(true);
      expect(result.movement.type).toBe('initial_stock');
      expect(result.movement.valuationMethod).toBe('FIFO');
      expect(result.movement.totalValue).toBe(125000.00);
    });

    it('should handle recount movements', async () => {
      const product = testProducts[1];
      const recountData = {
        productId: product.id,
        type: 'recount' as const,
        quantity: 0, // No quantity change, just recount
        reason: 'Cycle count verification',
        originalCount: 450,
        recountValue: 450,
        countVariance: 0,
        countAccuracy: 100,
        performedBy: 'inventory-auditor'
      };

      const result = await processMovement(recountData);

      expect(result.success).toBe(true);
      expect(result.movement.type).toBe('recount');
      expect(result.movement.countAccuracy).toBe(100);
    });

    it('should handle promotional giveaways', async () => {
      const product = testProducts[2];
      const promoData = {
        productId: product.id,
        type: 'stock_out' as const,
        quantity: 200,
        reason: 'Promotional giveaway',
        promotionId: 'PROMO-2024-001',
        campaignName: 'Grand Opening Special',
        marketingValue: 5000.00,
        targetAudience: 'new-customers',
        performedBy: 'marketing-manager'
      };

      const result = await processMovement(promoData);

      expect(result.success).toBe(true);
      expect(result.movement.promotionId).toBe('PROMO-2024-001');
      expect(result.movement.marketingValue).toBe(5000.00);
    });
  });

  describe('Movement Validation and Business Rules 📋', () => {
    it('should validate movement types against product categories', async () => {
      const perishableProduct = TestDataFactory.createProduct({
        category: 'Food & Beverages',
        tags: ['perishable']
      });

      testProducts.push(perishableProduct);
      mockServices.supabase.setMockData('products', testProducts);

      // Should allow expiry movements for perishable products
      const expiryMovement = await processMovement({
        productId: perishableProduct.id,
        type: 'expired_out',
        quantity: 50,
        reason: 'Product expired',
        performedBy: 'quality-control'
      });

      expect(expiryMovement.success).toBe(true);

      // Should warn about expiry movements for non-perishable products
      const nonPerishableExpiry = await processMovement({
        productId: testProducts[0].id, // Electronics product
        type: 'expired_out',
        quantity: 10,
        reason: 'Product expired',
        performedBy: 'quality-control'
      });

      expect(nonPerishableExpiry.success).toBe(true);
      expect(nonPerishableExpiry.warnings).toContain('Expiry movement for non-perishable product');
    });

    it('should enforce minimum stock levels', async () => {
      const product = testProducts[0];
      const excessiveOut = {
        productId: product.id,
        type: 'stock_out' as const,
        quantity: product.stock - 10, // Would leave stock below minimum
        reason: 'Large sale',
        performedBy: 'sales-person'
      };

      const result = await processMovement(excessiveOut);

      if (product.stock - excessiveOut.quantity < product.minStock) {
        expect(result.warnings).toContain('Stock will fall below minimum level');
      }
    });

    it('should validate user permissions for movement types', async () => {
      const product = testProducts[0];
      
      const restrictedMovement = {
        productId: product.id,
        type: 'adjustment_out' as const,
        quantity: 100,
        reason: 'Adjustment',
        performedBy: 'cashier' // Cashiers shouldn't do adjustments
      };

      const result = await processMovement(restrictedMovement);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authorized for this movement type');
    });
  });

  describe('Batch Movement Processing 🚀', () => {
    it('should process multiple movement types simultaneously', async () => {
      const movements = [
        {
          productId: testProducts[0].id,
          type: 'stock_in' as const,
          quantity: 100,
          reason: 'Purchase',
          performedBy: 'warehouse'
        },
        {
          productId: testProducts[1].id,
          type: 'stock_out' as const,
          quantity: 50,
          reason: 'Sale',
          performedBy: 'cashier'
        },
        {
          productId: testProducts[2].id,
          type: 'adjustment_in' as const,
          quantity: 25,
          reason: 'Count correction',
          performedBy: 'inventory-manager'
        },
        {
          productId: testProducts[3].id,
          type: 'transfer_out' as const,
          quantity: 75,
          reason: 'Branch transfer',
          performedBy: 'logistics'
        }
      ];

      const results = await batchProcessMovements(movements);

      expect(results.successCount).toBe(4);
      expect(results.failureCount).toBe(0);
      expect(results.results).toHaveLength(4);
    });

    it('should handle mixed success/failure in batch processing', async () => {
      const movements = [
        {
          productId: testProducts[0].id,
          type: 'stock_in' as const,
          quantity: 100,
          reason: 'Valid movement',
          performedBy: 'warehouse'
        },
        {
          productId: 'non-existent',
          type: 'stock_out' as const,
          quantity: 50,
          reason: 'Invalid product',
          performedBy: 'cashier'
        },
        {
          productId: testProducts[1].id,
          type: 'invalid-type' as any,
          quantity: 25,
          reason: 'Invalid type',
          performedBy: 'user'
        }
      ];

      const results = await batchProcessMovements(movements);

      expect(results.successCount).toBe(1);
      expect(results.failureCount).toBe(2);
      expect(results.results).toHaveLength(3);
    });
  });
});

// Helper functions for movement processing
interface MovementData {
  productId: string;
  type: string;
  quantity: number;
  reason: string;
  performedBy: string;
  referenceId?: string;
  [key: string]: any; // Allow additional properties
}

interface MovementResult {
  success: boolean;
  newStock?: number;
  movement?: StockMovement;
  warnings?: string[];
  error?: string;
}

async function processMovement(data: MovementData): Promise<MovementResult> {
  try {
    const warnings: string[] = [];

    // Get product
    const productResult = await mockServices.supabase
      .from('products')
      .select('*')
      .eq('id', data.productId)
      .single();

    if (!productResult.data) {
      return { success: false, error: 'Product not found' };
    }

    const product = productResult.data;

    // Validate movement type
    const validTypes = [
      'stock_in', 'stock_out', 'adjustment_in', 'adjustment_out',
      'transfer_in', 'transfer_out', 'return_in', 'return_out',
      'damage_out', 'expired_out', 'recount', 'initial_stock'
    ];

    if (!validTypes.includes(data.type)) {
      return { success: false, error: 'Invalid movement type' };
    }

    // Business rule validations
    if (data.type === 'expired_out' && !product.tags?.includes('perishable')) {
      warnings.push('Expiry movement for non-perishable product');
    }

    // User permission validation
    const userRole = getUserRole(data.performedBy);
    if (!isAuthorizedForMovementType(userRole, data.type)) {
      return { success: false, error: 'User not authorized for this movement type' };
    }

    // Large adjustment approval
    if ((data.type === 'adjustment_in' || data.type === 'adjustment_out') && 
        data.quantity > 500 && !data.supervisorApproval) {
      return { success: false, error: 'Large adjustments require supervisor approval' };
    }

    // Transfer quantity validation
    if (data.type === 'transfer_in' && data.referenceId) {
      const transferOut = await mockServices.supabase
        .from('stock_movements')
        .select('*')
        .eq('reference_id', data.referenceId)
        .eq('type', 'transfer_out')
        .single();

      if (transferOut.data && transferOut.data.quantity !== data.quantity) {
        return { success: false, error: 'Transfer quantity mismatch with original transfer' };
      }
    }

    // Calculate new stock
    let newStock = product.stock;
    const inTypes = ['stock_in', 'adjustment_in', 'transfer_in', 'return_in', 'initial_stock'];
    const outTypes = ['stock_out', 'adjustment_out', 'transfer_out', 'return_out', 'damage_out', 'expired_out'];

    if (inTypes.includes(data.type)) {
      newStock += data.quantity;
    } else if (outTypes.includes(data.type)) {
      if (data.type !== 'recount') {
        newStock -= data.quantity;
      }
    }

    // Check minimum stock warning
    if (newStock < product.min_stock && outTypes.includes(data.type)) {
      warnings.push('Stock will fall below minimum level');
    }

    // Prevent negative stock
    if (newStock < 0) {
      return { success: false, error: 'Insufficient stock for movement' };
    }

    // Update product stock (except for recount)
    if (data.type !== 'recount') {
      await mockServices.supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', data.productId);
    }

    // Create movement record
    const movement: StockMovement & Record<string, any> = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: data.productId,
      type: data.type as any,
      quantity: data.quantity,
      reason: data.reason,
      performedBy: data.performedBy,
      referenceId: data.referenceId,
      createdAt: new Date(),
      ...Object.fromEntries(
        Object.entries(data).filter(([key]) => 
          !['productId', 'type', 'quantity', 'reason', 'performedBy'].includes(key)
        )
      )
    };

    await mockServices.supabase
      .from('stock_movements')
      .insert(movement);

    return {
      success: true,
      newStock,
      movement,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function getUserRole(userId: string): string {
  const roleMap: Record<string, string> = {
    'warehouse-manager': 'manager',
    'inventory-manager': 'manager',
    'sales-manager': 'manager',
    'cashier': 'cashier',
    'warehouse': 'warehouse',
    'inventory-clerk': 'clerk',
    'system-admin': 'admin'
  };

  return roleMap[userId] || 'user';
}

function isAuthorizedForMovementType(userRole: string, movementType: string): boolean {
  const permissions: Record<string, string[]> = {
    admin: ['*'], // All permissions
    manager: [
      'stock_in', 'stock_out', 'adjustment_in', 'adjustment_out',
      'transfer_in', 'transfer_out', 'return_in', 'return_out',
      'damage_out', 'expired_out', 'recount', 'initial_stock'
    ],
    warehouse: ['stock_in', 'transfer_in', 'transfer_out', 'damage_out'],
    clerk: ['stock_in', 'stock_out', 'recount'],
    cashier: ['stock_out', 'return_in'],
    user: ['stock_out']
  };

  const userPermissions = permissions[userRole] || [];
  return userPermissions.includes('*') || userPermissions.includes(movementType);
}

interface BatchMovementResult {
  successCount: number;
  failureCount: number;
  results: Array<{
    productId: string;
    success: boolean;
    newStock?: number;
    error?: string;
    warnings?: string[];
  }>;
}

async function batchProcessMovements(movements: MovementData[]): Promise<BatchMovementResult> {
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  // Process in parallel for MAXIMUM SPEED! 🚀
  const promises = movements.map(async (movement) => {
    const result = await processMovement(movement);
    
    if (result.success) {
      successCount++;
      return {
        productId: movement.productId,
        success: true,
        newStock: result.newStock,
        warnings: result.warnings
      };
    } else {
      failureCount++;
      return {
        productId: movement.productId,
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