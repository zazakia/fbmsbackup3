import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { receivingService } from '../../../services/receivingService';
import { auditService } from '../../../services/auditService';
import { updateStock } from '../../../api/products';
import { PurchaseOrder, PartialReceiptItem, StockMovement } from '../../../types/business';
import { TestDataFactory } from '../../factories/testDataFactory';

// Mock dependencies
vi.mock('../../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { stock: 100, cost: 10.00 }, 
            error: null 
          }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'mock-id' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ error: null }))
  }
}));

vi.mock('../../../api/products');
vi.mock('../../../api/purchases', () => ({
  getPurchaseOrder: vi.fn()
}));

describe('Inventory Synchronization Accuracy - Integration Tests', () => {
  let stockTransactions: Array<{
    productId: string;
    operation: 'add' | 'subtract';
    quantity: number;
    expectedStock: number;
    timestamp: Date;
    reference: string;
  }> = [];

  beforeEach(() => {
    TestDataFactory.resetIdCounter();
    stockTransactions = [];
    vi.clearAllMocks();

    // Mock updateStock to track all stock movements
    vi.mocked(updateStock).mockImplementation(async (productId, quantity, operation, context) => {
      const currentStock = 100; // Mock current stock
      const newStock = operation === 'add' ? currentStock + quantity : currentStock - quantity;
      
      stockTransactions.push({
        productId,
        operation,
        quantity,
        expectedStock: newStock,
        timestamp: new Date(),
        reference: context?.referenceId || 'test-ref'
      });

      return { success: true, newStock };
    });

    // Mock getPurchaseOrder
    const { getPurchaseOrder } = require('../../../api/purchases');
    vi.mocked(getPurchaseOrder).mockImplementation(async (id: string) => ({
      data: TestDataFactory.createPurchaseOrder({ id, status: 'sent' }),
      error: null
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    stockTransactions = [];
  });

  describe('Single Purchase Order Receipt Accuracy', () => {
    it('should maintain perfect stock accuracy for complete receipts', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: [
          TestDataFactory.createPurchaseOrderItems(1)[0],
          {
            ...TestDataFactory.createPurchaseOrderItems(1)[0],
            id: 'item-2',
            productId: 'prod-accuracy-2',
            quantity: 75
          }
        ]
      });

      const receipts: PartialReceiptItem[] = [
        {
          productId: 'prod-accuracy-1',
          productName: 'Accuracy Test Product 1',
          productSku: 'ACC-001',
          orderedQuantity: 100,
          receivedQuantity: 100,
          totalReceived: 100,
          previouslyReceived: 0,
          unitCost: 10.00,
          totalCost: 1000.00,
          condition: 'good'
        },
        {
          productId: 'prod-accuracy-2',
          productName: 'Accuracy Test Product 2',
          productSku: 'ACC-002',
          orderedQuantity: 75,
          receivedQuantity: 75,
          totalReceived: 75,
          previouslyReceived: 0,
          unitCost: 15.00,
          totalCost: 1125.00,
          condition: 'good'
        }
      ];

      const result = await receivingService.processReceipt(
        purchaseOrder.id,
        receipts,
        'accuracy-test-user',
        'Accuracy Test User',
        'Complete receipt accuracy test'
      );

      expect(result.success).toBe(true);
      expect(result.inventoryAdjustments).toHaveLength(2);

      // Verify exact stock movements
      expect(stockTransactions).toHaveLength(2);
      expect(stockTransactions[0].productId).toBe('prod-accuracy-1');
      expect(stockTransactions[0].quantity).toBe(100);
      expect(stockTransactions[0].operation).toBe('add');
      expect(stockTransactions[1].productId).toBe('prod-accuracy-2');
      expect(stockTransactions[1].quantity).toBe(75);
      expect(stockTransactions[1].operation).toBe('add');

      // Verify inventory adjustments match receipts exactly
      const adjustment1 = result.inventoryAdjustments!.find(a => a.productId === 'prod-accuracy-1');
      const adjustment2 = result.inventoryAdjustments!.find(a => a.productId === 'prod-accuracy-2');

      expect(adjustment1!.quantityChange).toBe(100);
      expect(adjustment1!.unitCost).toBe(10.00);
      expect(adjustment1!.totalCost).toBe(1000.00);

      expect(adjustment2!.quantityChange).toBe(75);
      expect(adjustment2!.unitCost).toBe(15.00);
      expect(adjustment2!.totalCost).toBe(1125.00);
    });

    it('should handle partial receipts with perfect accuracy', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: [{
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          id: 'item-partial',
          productId: 'prod-partial-accuracy',
          quantity: 200,
          cost: 12.50
        }]
      });

      // First partial receipt (60%)
      const firstReceipt: PartialReceiptItem[] = [{
        productId: 'prod-partial-accuracy',
        productName: 'Partial Accuracy Product',
        productSku: 'PAR-001',
        orderedQuantity: 200,
        receivedQuantity: 120,
        totalReceived: 120,
        previouslyReceived: 0,
        unitCost: 12.50,
        totalCost: 1500.00,
        condition: 'good'
      }];

      const firstResult = await receivingService.processReceipt(
        purchaseOrder.id,
        firstReceipt,
        'partial-accuracy-user',
        'Partial Test User',
        'First partial receipt'
      );

      expect(firstResult.success).toBe(true);
      expect(stockTransactions).toHaveLength(1);
      expect(stockTransactions[0].quantity).toBe(120);

      // Second partial receipt (remaining 40%)
      const secondReceipt: PartialReceiptItem[] = [{
        productId: 'prod-partial-accuracy',
        productName: 'Partial Accuracy Product',
        productSku: 'PAR-001',
        orderedQuantity: 200,
        receivedQuantity: 80,
        totalReceived: 200,
        previouslyReceived: 120,
        unitCost: 12.50,
        totalCost: 1000.00,
        condition: 'good'
      }];

      const secondResult = await receivingService.processReceipt(
        purchaseOrder.id,
        secondReceipt,
        'partial-accuracy-user',
        'Partial Test User',
        'Second partial receipt'
      );

      expect(secondResult.success).toBe(true);
      expect(stockTransactions).toHaveLength(2);
      expect(stockTransactions[1].quantity).toBe(80);

      // Verify total quantities match ordered quantity exactly
      const totalReceived = stockTransactions.reduce((sum, trans) => sum + trans.quantity, 0);
      expect(totalReceived).toBe(200);
    });
  });

  describe('Multiple Purchase Order Synchronization', () => {
    it('should maintain stock accuracy across concurrent purchase order receipts', async () => {
      const purchaseOrders = Array.from({ length: 3 }, (_, i) =>
        TestDataFactory.createPurchaseOrder({
          id: `po-concurrent-${i + 1}`,
          status: 'sent',
          items: [{
            ...TestDataFactory.createPurchaseOrderItems(1)[0],
            productId: 'prod-concurrent-shared', // Same product across POs
            quantity: 50 + (i * 10),
            cost: 10.00 + i
          }]
        })
      );

      const receipts = purchaseOrders.map((po, i) => [{
        productId: 'prod-concurrent-shared',
        productName: 'Concurrent Test Product',
        productSku: 'CON-001',
        orderedQuantity: 50 + (i * 10),
        receivedQuantity: 50 + (i * 10),
        totalReceived: 50 + (i * 10),
        previouslyReceived: 0,
        unitCost: 10.00 + i,
        totalCost: (50 + (i * 10)) * (10.00 + i),
        condition: 'good'
      }]);

      // Process receipts concurrently
      const receiptPromises = purchaseOrders.map((po, i) =>
        receivingService.processReceipt(
          po.id,
          receipts[i],
          `concurrent-user-${i + 1}`,
          `Concurrent User ${i + 1}`,
          `Concurrent receipt ${i + 1}`
        )
      );

      const results = await Promise.all(receiptPromises);

      // Verify all receipts succeeded
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify all stock movements were recorded
      expect(stockTransactions).toHaveLength(3);
      expect(stockTransactions.every(trans => trans.productId === 'prod-concurrent-shared')).toBe(true);

      // Verify total quantities
      const totalQuantity = stockTransactions.reduce((sum, trans) => sum + trans.quantity, 0);
      const expectedTotal = 50 + 60 + 70; // 180
      expect(totalQuantity).toBe(expectedTotal);
    });

    it('should handle interleaved receipts from different purchase orders accurately', async () => {
      const po1 = TestDataFactory.createPurchaseOrder({
        id: 'po-interleaved-1',
        status: 'sent',
        items: [{
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          productId: 'prod-interleaved-1',
          quantity: 100
        }]
      });

      const po2 = TestDataFactory.createPurchaseOrder({
        id: 'po-interleaved-2', 
        status: 'sent',
        items: [{
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          productId: 'prod-interleaved-1', // Same product
          quantity: 150
        }]
      });

      // Interleaved partial receipts
      const po1Receipt1: PartialReceiptItem[] = [{
        productId: 'prod-interleaved-1',
        productName: 'Interleaved Test Product',
        productSku: 'INT-001',
        orderedQuantity: 100,
        receivedQuantity: 60,
        totalReceived: 60,
        previouslyReceived: 0,
        unitCost: 10.00,
        totalCost: 600.00,
        condition: 'good'
      }];

      const po2Receipt1: PartialReceiptItem[] = [{
        productId: 'prod-interleaved-1',
        productName: 'Interleaved Test Product',
        productSku: 'INT-001',
        orderedQuantity: 150,
        receivedQuantity: 90,
        totalReceived: 90,
        previouslyReceived: 0,
        unitCost: 10.50,
        totalCost: 945.00,
        condition: 'good'
      }];

      const po1Receipt2: PartialReceiptItem[] = [{
        productId: 'prod-interleaved-1',
        productName: 'Interleaved Test Product',
        productSku: 'INT-001',
        orderedQuantity: 100,
        receivedQuantity: 40,
        totalReceived: 100,
        previouslyReceived: 60,
        unitCost: 10.00,
        totalCost: 400.00,
        condition: 'good'
      }];

      const po2Receipt2: PartialReceiptItem[] = [{
        productId: 'prod-interleaved-1',
        productName: 'Interleaved Test Product',
        productSku: 'INT-001',
        orderedQuantity: 150,
        receivedQuantity: 60,
        totalReceived: 150,
        previouslyReceived: 90,
        unitCost: 10.50,
        totalCost: 630.00,
        condition: 'good'
      }];

      // Process in interleaved order
      const result1 = await receivingService.processReceipt(po1.id, po1Receipt1, 'user-1');
      expect(result1.success).toBe(true);

      const result2 = await receivingService.processReceipt(po2.id, po2Receipt1, 'user-2');
      expect(result2.success).toBe(true);

      const result3 = await receivingService.processReceipt(po1.id, po1Receipt2, 'user-1');
      expect(result3.success).toBe(true);

      const result4 = await receivingService.processReceipt(po2.id, po2Receipt2, 'user-2');
      expect(result4.success).toBe(true);

      // Verify all receipts were processed correctly
      expect(stockTransactions).toHaveLength(4);
      expect(stockTransactions.map(t => t.quantity)).toEqual([60, 90, 40, 60]);

      // Verify total matches expected
      const totalReceived = stockTransactions.reduce((sum, trans) => sum + trans.quantity, 0);
      expect(totalReceived).toBe(250); // 100 + 150
    });
  });

  describe('Cost Calculation Accuracy', () => {
    it('should maintain accurate cost calculations across receipts', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: [{
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          productId: 'prod-cost-accuracy',
          quantity: 100,
          cost: 15.00
        }]
      });

      const receipt: PartialReceiptItem[] = [{
        productId: 'prod-cost-accuracy',
        productName: 'Cost Accuracy Product',
        productSku: 'COST-001',
        orderedQuantity: 100,
        receivedQuantity: 100,
        totalReceived: 100,
        previouslyReceived: 0,
        unitCost: 16.25, // Price variance
        totalCost: 1625.00,
        condition: 'good'
      }];

      const result = await receivingService.processReceipt(
        purchaseOrder.id,
        receipt,
        'cost-accuracy-user',
        'Cost User',
        'Cost accuracy test'
      );

      expect(result.success).toBe(true);
      expect(result.costCalculations).toBeDefined();
      
      const costCalc = result.costCalculations![0];
      expect(costCalc.productId).toBe('prod-cost-accuracy');
      expect(costCalc.newWeightedAverageCost).toBeCloseTo(14.17, 2); // Calculated weighted average
      
      // Verify cost variance is detected
      expect(result.priceVariances).toHaveLength(1);
      const priceVariance = result.priceVariances![0];
      expect(priceVariance.varianceAmount).toBeCloseTo(1.25, 2);
      expect(priceVariance.variancePercentage).toBeCloseTo(8.33, 2);
    });

    it('should handle fractional quantities and costs with precision', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: [{
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          productId: 'prod-fractional',
          quantity: 33.333,
          cost: 1.0 / 3 // 0.333333...
        }]
      });

      const receipt: PartialReceiptItem[] = [{
        productId: 'prod-fractional',
        productName: 'Fractional Product',
        productSku: 'FRAC-001',
        orderedQuantity: 33.333,
        receivedQuantity: 33.333,
        totalReceived: 33.333,
        previouslyReceived: 0,
        unitCost: 2.0 / 3, // 0.666666...
        totalCost: 33.333 * (2.0 / 3),
        condition: 'good'
      }];

      const result = await receivingService.processReceipt(
        purchaseOrder.id,
        receipt,
        'fractional-user',
        'Fractional User',
        'Fractional precision test'
      );

      expect(result.success).toBe(true);
      expect(result.inventoryAdjustments![0].quantityChange).toBeCloseTo(33.333, 3);
      expect(result.inventoryAdjustments![0].unitCost).toBeCloseTo(0.6667, 4);
      expect(result.inventoryAdjustments![0].totalCost).toBeCloseTo(22.222, 3);
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain referential integrity across all related records', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 3 }, (_, i) => ({
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          id: `integrity-item-${i + 1}`,
          productId: `prod-integrity-${i + 1}`,
          quantity: 50 + (i * 10)
        }))
      });

      const receipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 1.0);

      const result = await receivingService.processReceipt(
        purchaseOrder.id,
        receipts,
        'integrity-user',
        'Integrity User',
        'Data integrity test'
      );

      expect(result.success).toBe(true);

      // Verify all inventory adjustments reference the correct PO
      result.inventoryAdjustments!.forEach(adjustment => {
        expect(adjustment.referenceId).toBe(purchaseOrder.id);
        expect(adjustment.movementType).toBe('purchase_receipt');
      });

      // Verify all stock transactions reference the correct products
      stockTransactions.forEach((transaction, index) => {
        expect(transaction.productId).toBe(`prod-integrity-${index + 1}`);
        expect(transaction.reference).toBeDefined();
      });

      // Verify quantities match between adjustments and transactions
      result.inventoryAdjustments!.forEach((adjustment, index) => {
        expect(adjustment.quantityChange).toBe(stockTransactions[index].quantity);
      });
    });

    it('should handle rollback scenarios correctly', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: [{
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          productId: 'prod-rollback-test',
          quantity: 100
        }]
      });

      // Mock a failure during stock update
      vi.mocked(updateStock).mockImplementationOnce(async () => {
        throw new Error('Database connection failed');
      });

      const receipt: PartialReceiptItem[] = [{
        productId: 'prod-rollback-test',
        productName: 'Rollback Test Product',
        productSku: 'ROLL-001',
        orderedQuantity: 100,
        receivedQuantity: 100,
        totalReceived: 100,
        previouslyReceived: 0,
        unitCost: 10.00,
        totalCost: 1000.00,
        condition: 'good'
      }];

      const result = await receivingService.processReceipt(
        purchaseOrder.id,
        receipt,
        'rollback-user',
        'Rollback User',
        'Rollback test'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      
      // Verify no partial updates occurred
      expect(stockTransactions).toHaveLength(0);
    });
  });

  describe('Audit Trail Accuracy', () => {
    it('should create complete and accurate audit trails', async () => {
      const auditEntries: any[] = [];

      // Mock audit service to capture entries
      vi.spyOn(auditService, 'logStockMovementAudit').mockImplementation(async (data, context) => {
        auditEntries.push({ data, context });
        return { success: true, data: { id: 'audit-test' } as any };
      });

      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: [{
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          productId: 'prod-audit-trail',
          quantity: 75
        }]
      });

      const receipt: PartialReceiptItem[] = [{
        productId: 'prod-audit-trail',
        productName: 'Audit Trail Product',
        productSku: 'AUD-001',
        orderedQuantity: 75,
        receivedQuantity: 75,
        totalReceived: 75,
        previouslyReceived: 0,
        unitCost: 12.00,
        totalCost: 900.00,
        condition: 'good',
        batchNumber: 'BATCH-AUDIT-001'
      }];

      const result = await receivingService.processReceipt(
        purchaseOrder.id,
        receipt,
        'audit-trail-user',
        'Audit Trail User',
        'Audit trail accuracy test'
      );

      expect(result.success).toBe(true);

      // Verify audit entries were created
      expect(auditEntries).toHaveLength(1);
      
      const auditEntry = auditEntries[0];
      expect(auditEntry.data.productId).toBe('prod-audit-trail');
      expect(auditEntry.data.quantityChanged).toBe(75);
      expect(auditEntry.data.referenceType).toBe('purchase_order');
      expect(auditEntry.data.referenceId).toBe(purchaseOrder.id);
      expect(auditEntry.context.performedBy).toBe('audit-trail-user');
    });

    it('should maintain audit trail consistency across multiple operations', async () => {
      const allAuditEntries: any[] = [];

      vi.spyOn(auditService, 'logStockMovementAudit').mockImplementation(async (data, context) => {
        allAuditEntries.push({ data, context, timestamp: new Date() });
        return { success: true, data: { id: `audit-${allAuditEntries.length}` } as any };
      });

      const purchaseOrders = Array.from({ length: 2 }, (_, i) =>
        TestDataFactory.createPurchaseOrder({
          id: `po-audit-consistency-${i + 1}`,
          status: 'sent',
          items: [{
            ...TestDataFactory.createPurchaseOrderItems(1)[0],
            productId: `prod-audit-${i + 1}`,
            quantity: 50
          }]
        })
      );

      // Process multiple receipts
      for (let i = 0; i < purchaseOrders.length; i++) {
        const receipt: PartialReceiptItem[] = [{
          productId: `prod-audit-${i + 1}`,
          productName: `Audit Product ${i + 1}`,
          productSku: `AUD-${String(i + 1).padStart(3, '0')}`,
          orderedQuantity: 50,
          receivedQuantity: 50,
          totalReceived: 50,
          previouslyReceived: 0,
          unitCost: 10.00 + i,
          totalCost: 50 * (10.00 + i),
          condition: 'good'
        }];

        const result = await receivingService.processReceipt(
          purchaseOrders[i].id,
          receipt,
          `audit-user-${i + 1}`,
          `Audit User ${i + 1}`,
          `Audit consistency test ${i + 1}`
        );

        expect(result.success).toBe(true);
      }

      // Verify audit trail consistency
      expect(allAuditEntries).toHaveLength(2);
      
      allAuditEntries.forEach((entry, index) => {
        expect(entry.data.productId).toBe(`prod-audit-${index + 1}`);
        expect(entry.data.quantityChanged).toBe(50);
        expect(entry.context.performedBy).toBe(`audit-user-${index + 1}`);
        expect(entry.timestamp).toBeInstanceOf(Date);
      });

      // Verify chronological order
      expect(allAuditEntries[1].timestamp >= allAuditEntries[0].timestamp).toBe(true);
    });
  });

  describe('Performance Impact on Accuracy', () => {
    it('should maintain accuracy under high-volume operations', async () => {
      const largePurchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 50 }, (_, i) => ({
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          id: `bulk-item-${i + 1}`,
          productId: `prod-bulk-${i + 1}`,
          quantity: 20 + (i % 10),
          cost: 5.00 + (i % 5)
        }))
      });

      const bulkReceipts = TestDataFactory.createMockPartialReceiptItems(largePurchaseOrder, 1.0);

      const startTime = performance.now();
      
      const result = await receivingService.processReceipt(
        largePurchaseOrder.id,
        bulkReceipts,
        'bulk-accuracy-user',
        'Bulk Accuracy User',
        'High-volume accuracy test'
      );

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.inventoryAdjustments).toHaveLength(50);
      expect(stockTransactions).toHaveLength(50);

      // Verify accuracy despite volume
      result.inventoryAdjustments!.forEach((adjustment, index) => {
        const receipt = bulkReceipts[index];
        expect(adjustment.quantityChange).toBe(receipt.receivedQuantity);
        expect(adjustment.unitCost).toBe(receipt.unitCost);
        expect(adjustment.totalCost).toBeCloseTo(receipt.totalCost, 2);
      });

      // Verify performance doesn't compromise accuracy
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});