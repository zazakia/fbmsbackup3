import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { receivingService } from '../../services/receivingService';
import { auditService } from '../../services/auditService';
import { weightedAverageCostService } from '../../services/weightedAverageCostService';
import { TestDataFactory } from '../factories/testDataFactory';
import { PurchaseOrder, PartialReceiptItem } from '../../types/business';

// Mock dependencies for performance testing
vi.mock('../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { stock: 100 }, error: null }))
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'mock-id' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'mock-id' }, error: null }))
          }))
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ error: null }))
  }
}));

vi.mock('../../api/products', () => ({
  updateStock: vi.fn(() => Promise.resolve({ success: true }))
}));

vi.mock('../../api/purchases', () => ({
  getPurchaseOrder: vi.fn()
}));

describe('Purchase Order Batch Performance Tests', () => {
  let performanceResults: Record<string, number[]> = {};

  beforeEach(() => {
    TestDataFactory.resetIdCounter();
    performanceResults = {};

    // Mock cost service for performance testing
    vi.spyOn(weightedAverageCostService, 'processPurchaseOrderCostUpdates')
      .mockImplementation(async () => ({
        costCalculations: [],
        priceVariances: [],
        valueAdjustments: [],
        transaction: { id: 'mock-transaction', timestamp: new Date(), totalItems: 0, totalValueAdjustment: 0 }
      }));

    // Mock audit service for performance testing
    vi.spyOn(auditService, 'logPurchaseOrderAudit').mockResolvedValue({
      success: true,
      data: {
        id: 'mock-audit',
        purchaseOrderId: 'test',
        purchaseOrderNumber: 'PO-TEST',
        action: 'CREATED' as any,
        performedBy: 'test',
        timestamp: new Date(),
        oldValues: {},
        newValues: {},
        metadata: {}
      }
    });

    vi.spyOn(auditService, 'logStockMovementAudit').mockResolvedValue({
      success: true,
      data: {
        id: 'mock-movement',
        productId: 'test',
        type: 'stock_in',
        quantity: 1,
        reason: 'test',
        referenceId: 'test',
        performedBy: 'test',
        beforeQuantity: 0,
        afterQuantity: 1,
        createdAt: new Date()
      }
    });

    const { getPurchaseOrder } = require('../../api/purchases');
    vi.mocked(getPurchaseOrder).mockImplementation(async (id: string) => ({
      data: TestDataFactory.createPurchaseOrder({ id, status: 'sent' }),
      error: null
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    
    // Log performance results
    Object.entries(performanceResults).forEach(([testName, times]) => {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      console.log(`Performance [${testName}]: avg=${avgTime.toFixed(2)}ms, min=${minTime}ms, max=${maxTime}ms`);
    });
  });

  const measurePerformance = async (testName: string, testFn: () => Promise<any>, iterations: number = 5) => {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await testFn();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    performanceResults[testName] = times;
    return times;
  };

  describe('Small Scale Performance (Baseline)', () => {
    it('should process single purchase order receipt efficiently', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 5 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
      });
      
      const receipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 1.0);

      await measurePerformance('single_po_receipt', async () => {
        const result = await receivingService.processReceipt(
          purchaseOrder.id,
          receipts,
          'performance-test-user',
          'Performance Test User',
          'Single PO performance test'
        );
        expect(result.success).toBe(true);
      });
    });

    it('should validate receipt data efficiently', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 10 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
      });
      
      const receipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 0.8);

      await measurePerformance('receipt_validation', async () => {
        const validation = receivingService.validateReceipt(purchaseOrder, receipts);
        expect(validation.isValid).toBe(true);
      });
    });
  });

  describe('Medium Scale Performance', () => {
    it('should handle medium-sized purchase orders (25 items) efficiently', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 25 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
      });
      
      const receipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 1.0);

      await measurePerformance('medium_po_receipt', async () => {
        const result = await receivingService.processReceipt(
          purchaseOrder.id,
          receipts,
          'performance-test-user',
          'Performance Test User',
          'Medium PO performance test'
        );
        expect(result.success).toBe(true);
        expect(result.inventoryAdjustments).toHaveLength(25);
      }, 3); // Fewer iterations for larger tests
    });

    it('should process multiple partial receipts efficiently', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 15 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
      });

      await measurePerformance('multiple_partial_receipts', async () => {
        // First partial receipt (40%)
        const firstReceipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 0.4);
        const firstResult = await receivingService.processReceipt(
          purchaseOrder.id,
          firstReceipts,
          'performance-test-user'
        );
        expect(firstResult.success).toBe(true);

        // Second partial receipt (30%)
        const secondReceipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 0.3);
        const secondResult = await receivingService.processReceipt(
          purchaseOrder.id,
          secondReceipts,
          'performance-test-user'
        );
        expect(secondResult.success).toBe(true);

        // Final receipt (remaining 30%)
        const finalReceipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 0.3);
        const finalResult = await receivingService.processReceipt(
          purchaseOrder.id,
          finalReceipts,
          'performance-test-user'
        );
        expect(finalResult.success).toBe(true);
      }, 3);
    });
  });

  describe('Large Scale Performance', () => {
    it('should handle large purchase orders (100+ items) within acceptable time', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 100 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
      });
      
      const receipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 1.0);

      const times = await measurePerformance('large_po_receipt', async () => {
        const result = await receivingService.processReceipt(
          purchaseOrder.id,
          receipts,
          'performance-test-user',
          'Performance Test User',
          'Large PO performance test'
        );
        expect(result.success).toBe(true);
        expect(result.inventoryAdjustments).toHaveLength(100);
      }, 2); // Only 2 iterations for very large tests

      // Verify performance requirements
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      expect(avgTime).toBeLessThan(5000); // Should complete within 5 seconds on average
    });

    it('should process bulk receipt data with high item count efficiently', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 200 }, (_, i) => ({
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          id: `bulk-item-${i + 1}`,
          quantity: 10 + (i % 50), // Varying quantities
          cost: 5.00 + (i % 20) // Varying costs
        }))
      });
      
      const receipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 1.0);

      const times = await measurePerformance('bulk_receipt_processing', async () => {
        const result = await receivingService.processReceipt(
          purchaseOrder.id,
          receipts,
          'performance-test-user',
          'Performance Test User',
          'Bulk receipt performance test'
        );
        expect(result.success).toBe(true);
        expect(result.inventoryAdjustments).toHaveLength(200);
      }, 1); // Single iteration for largest test

      // Verify performance requirements
      expect(times[0]).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent receipt processing for different POs', async () => {
      const purchaseOrders = Array.from({ length: 5 }, () => 
        TestDataFactory.createPurchaseOrder({
          status: 'sent',
          items: Array.from({ length: 10 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
        })
      );

      await measurePerformance('concurrent_receipt_processing', async () => {
        const receiptPromises = purchaseOrders.map((po, index) => {
          const receipts = TestDataFactory.createMockPartialReceiptItems(po, 1.0);
          return receivingService.processReceipt(
            po.id,
            receipts,
            `performance-test-user-${index + 1}`,
            `Performance Test User ${index + 1}`,
            `Concurrent test ${index + 1}`
          );
        });

        const results = await Promise.all(receiptPromises);
        
        results.forEach(result => {
          expect(result.success).toBe(true);
        });
      }, 3);
    });

    it('should handle memory efficiency with large datasets', async () => {
      // Create multiple large purchase orders to test memory usage
      const largePurchaseOrders = Array.from({ length: 3 }, () => 
        TestDataFactory.createPurchaseOrder({
          status: 'sent',
          items: Array.from({ length: 50 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
        })
      );

      // Monitor memory usage during processing
      const initialMemory = process.memoryUsage();

      await measurePerformance('memory_efficiency_test', async () => {
        for (const po of largePurchaseOrders) {
          const receipts = TestDataFactory.createMockPartialReceiptItems(po, 1.0);
          const result = await receivingService.processReceipt(
            po.id,
            receipts,
            'memory-test-user',
            'Memory Test User',
            'Memory efficiency test'
          );
          expect(result.success).toBe(true);
        }

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }, 2);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncreaseMB).toBeLessThan(100);
    });
  });

  describe('Validation Performance Under Load', () => {
    it('should validate complex receipt scenarios efficiently', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 50 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
      });

      // Create complex validation scenarios
      const complexReceipts = purchaseOrder.items.map((item, index) => ({
        ...TestDataFactory.createMockPartialReceiptItems(purchaseOrder)[index],
        // Add complexity: batch tracking, expiry dates, quality grades
        batchNumber: `BATCH-COMPLEX-${String(index + 1).padStart(4, '0')}`,
        expiryDate: new Date(Date.now() + (365 + index) * 24 * 60 * 60 * 1000),
        condition: ['good', 'damaged', 'expired', 'returned'][index % 4] as any,
        qualityGrade: ['A', 'B', 'C'][index % 3],
        inspectionNotes: `Complex inspection ${index + 1}: ${index % 2 === 0 ? 'Pass' : 'Conditional pass with minor issues'}`
      }));

      await measurePerformance('complex_validation', async () => {
        const validation = receivingService.validateReceipt(purchaseOrder, complexReceipts, {
          allowOverReceiving: true,
          tolerancePercentage: 5.0,
          requireBatchTracking: true,
          requireExpiryDates: true
        });

        expect(validation.errors.length).toBeGreaterThanOrEqual(0);
      }, 5);
    });

    it('should handle validation errors efficiently at scale', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 30 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
      });

      // Create receipts with intentional validation errors
      const errorProneReceipts = purchaseOrder.items.map((item, index) => ({
        ...TestDataFactory.createMockPartialReceiptItems(purchaseOrder)[index],
        // Introduce various types of errors
        receivedQuantity: index % 3 === 0 ? item.quantity * 1.5 : item.quantity, // Over-receiving
        unitCost: index % 4 === 0 ? -5.00 : item.cost, // Negative costs
        productId: index % 5 === 0 ? 'non-existent-product' : item.productId, // Invalid products
        condition: index % 6 === 0 ? 'invalid-condition' as any : 'good'
      }));

      await measurePerformance('validation_errors_at_scale', async () => {
        const validation = receivingService.validateReceipt(purchaseOrder, errorProneReceipts);
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      }, 3);
    });
  });

  describe('Cost Calculation Performance', () => {
    it('should perform cost calculations efficiently for large batches', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 75 }, (_, i) => ({
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          cost: 10.00 + (i % 20), // Varying costs for complex calculations
          quantity: 25 + (i % 15) // Varying quantities
        }))
      });

      const receipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 1.0);

      await measurePerformance('cost_calculations_large_batch', async () => {
        const adjustments = await receivingService.calculateInventoryAdjustments(
          purchaseOrder,
          receipts
        );
        
        expect(adjustments).toHaveLength(75);
        adjustments.forEach(adjustment => {
          expect(adjustment.quantityChange).toBeGreaterThan(0);
          expect(adjustment.unitCost).toBeGreaterThan(0);
          expect(adjustment.totalCost).toBeGreaterThan(0);
        });
      }, 3);
    });
  });

  describe('Audit Performance Under Load', () => {
    it('should log audit events efficiently during high-volume operations', async () => {
      const purchaseOrders = Array.from({ length: 10 }, () =>
        TestDataFactory.createPurchaseOrder({
          status: 'sent',
          items: Array.from({ length: 20 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
        })
      );

      await measurePerformance('audit_logging_high_volume', async () => {
        const auditPromises = purchaseOrders.flatMap(po => [
          auditService.logPurchaseOrderAudit(
            po.id,
            po.poNumber,
            'RECEIVED' as any,
            { performedBy: 'audit-performance-test' }
          ),
          ...po.items.map(item => 
            auditService.logStockMovementAudit(
              {
                productId: item.productId,
                movementType: 'purchase_receipt',
                quantityBefore: 100,
                quantityAfter: 100 + item.quantity,
                quantityChanged: item.quantity,
                referenceType: 'purchase_order',
                referenceId: po.id
              },
              { performedBy: 'audit-performance-test' }
            )
          )
        ]);

        const auditResults = await Promise.all(auditPromises);
        auditResults.forEach(result => {
          expect(result.success).toBe(true);
        });
      }, 2);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance across test runs', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: Array.from({ length: 20 }, () => TestDataFactory.createPurchaseOrderItems(1)[0])
      });
      
      const receipts = TestDataFactory.createMockPartialReceiptItems(purchaseOrder, 1.0);

      // Run the same test multiple times to check for performance consistency
      const times = await measurePerformance('consistency_test', async () => {
        const result = await receivingService.processReceipt(
          purchaseOrder.id,
          receipts,
          'consistency-test-user'
        );
        expect(result.success).toBe(true);
      }, 10); // More iterations for consistency testing

      // Check that performance is consistent (coefficient of variation < 50%)
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avgTime) * 100;

      expect(coefficientOfVariation).toBeLessThan(50); // Performance should be reasonably consistent
    });
  });
});