import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  weightedAverageCostService,
  WeightedAverageCostResult,
  PriceVarianceRecord,
  CostUpdateTransaction
} from '../../../services/weightedAverageCostService';
import { PurchaseOrderItem } from '../../../types/business';
import { TestDataFactory } from '../../factories/testDataFactory';

// Mock dependencies
vi.mock('../../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { 
              id: 'prod-1', 
              cost: 10.00, 
              stock: 100,
              total_cost: 1000.00 
            }, 
            error: null 
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'cost-calc-1' }, error: null }))
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ error: null }))
  }
}));

vi.mock('../../../services/auditService', () => ({
  auditService: {
    logStockMovementAudit: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

describe('WeightedAverageCostService - Comprehensive Tests', () => {
  beforeEach(() => {
    TestDataFactory.resetIdCounter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateWeightedAverageCost - Core Calculations', () => {
    it('should calculate weighted average cost correctly for simple case', () => {
      const result = weightedAverageCostService.calculateWeightedAverageCost({
        currentStock: 100,
        currentCost: 10.00,
        incomingQuantity: 50,
        incomingCost: 12.00
      });

      expect(result).toEqual({
        currentStock: 100,
        currentCost: 10.00,
        currentValue: 1000.00,
        incomingQuantity: 50,
        incomingCost: 12.00,
        incomingValue: 600.00,
        newStock: 150,
        newWeightedAverageCost: 10.67, // (1000 + 600) / 150 = 10.666...
        newTotalValue: 1600.00,
        costVariance: 0.67,
        costVariancePercentage: 6.67
      });
    });

    it('should handle zero current stock correctly', () => {
      const result = weightedAverageCostService.calculateWeightedAverageCost({
        currentStock: 0,
        currentCost: 0.00,
        incomingQuantity: 100,
        incomingCost: 15.00
      });

      expect(result).toEqual({
        currentStock: 0,
        currentCost: 0.00,
        currentValue: 0.00,
        incomingQuantity: 100,
        incomingCost: 15.00,
        incomingValue: 1500.00,
        newStock: 100,
        newWeightedAverageCost: 15.00, // All incoming cost
        newTotalValue: 1500.00,
        costVariance: 15.00,
        costVariancePercentage: 0 // Undefined percentage for zero base
      });
    });

    it('should handle zero incoming quantity correctly', () => {
      const result = weightedAverageCostService.calculateWeightedAverageCost({
        currentStock: 50,
        currentCost: 8.00,
        incomingQuantity: 0,
        incomingCost: 12.00
      });

      expect(result).toEqual({
        currentStock: 50,
        currentCost: 8.00,
        currentValue: 400.00,
        incomingQuantity: 0,
        incomingCost: 12.00,
        incomingValue: 0.00,
        newStock: 50,
        newWeightedAverageCost: 8.00, // No change
        newTotalValue: 400.00,
        costVariance: 0.00,
        costVariancePercentage: 0.00
      });
    });

    it('should calculate correct percentages for cost variance', () => {
      const result = weightedAverageCostService.calculateWeightedAverageCost({
        currentStock: 200,
        currentCost: 20.00,
        incomingQuantity: 100,
        incomingCost: 26.00 // 30% higher cost
      });

      const expectedNewCost = (200 * 20.00 + 100 * 26.00) / 300; // 22.00
      const expectedVariance = expectedNewCost - 20.00; // 2.00
      const expectedPercentage = (expectedVariance / 20.00) * 100; // 10.00%

      expect(result.newWeightedAverageCost).toBeCloseTo(22.00, 2);
      expect(result.costVariance).toBeCloseTo(2.00, 2);
      expect(result.costVariancePercentage).toBeCloseTo(10.00, 2);
    });

    it('should handle large quantities without precision issues', () => {
      const result = weightedAverageCostService.calculateWeightedAverageCost({
        currentStock: 100000,
        currentCost: 1.23456789,
        incomingQuantity: 50000,
        incomingCost: 1.34567891
      });

      expect(result.newStock).toBe(150000);
      expect(result.newWeightedAverageCost).toBeCloseTo(1.270, 3);
      expect(result.newTotalValue).toBeCloseTo(190500, 2);
    });
  });

  describe('processPurchaseOrderCostUpdates - Integration Tests', () => {
    let mockPurchaseOrderItems: PurchaseOrderItem[];
    let mockReceiptItems: Parameters<typeof weightedAverageCostService.processPurchaseOrderCostUpdates>[2];

    beforeEach(() => {
      mockPurchaseOrderItems = [
        TestDataFactory.createPurchaseOrderItems(1)[0],
        {
          ...TestDataFactory.createPurchaseOrderItems(1)[0],
          productId: 'prod-2',
          cost: 25.00,
          quantity: 40
        }
      ];

      mockReceiptItems = [
        {
          productId: 'prod-1',
          receivedQuantity: 50,
          actualCost: 12.00,
          batchNumber: 'BATCH-001'
        },
        {
          productId: 'prod-2', 
          receivedQuantity: 30,
          actualCost: 27.00,
          batchNumber: 'BATCH-002'
        }
      ];
    });

    it('should process cost updates for multiple products', async () => {
      const result = await weightedAverageCostService.processPurchaseOrderCostUpdates(
        'po-123',
        mockPurchaseOrderItems,
        mockReceiptItems,
        'cost-test-user'
      );

      expect(result.costCalculations).toHaveLength(2);
      expect(result.priceVariances).toHaveLength(2);
      expect(result.transaction.id).toBeDefined();
      expect(result.transaction.totalItems).toBe(2);
      
      // Verify cost calculations
      const prodOneCost = result.costCalculations.find(c => c.productId === 'prod-1');
      expect(prodOneCost).toBeDefined();
      expect(prodOneCost!.newWeightedAverageCost).toBeGreaterThan(0);

      const prodTwoCost = result.costCalculations.find(c => c.productId === 'prod-2');
      expect(prodTwoCost).toBeDefined();
      expect(prodTwoCost!.newWeightedAverageCost).toBeGreaterThan(0);
    });

    it('should detect and record price variances', async () => {
      const receiptWithVariance = [{
        productId: 'prod-1',
        receivedQuantity: 50,
        actualCost: 15.00, // 50% higher than ordered cost
        batchNumber: 'BATCH-HIGH-VARIANCE'
      }];

      const result = await weightedAverageCostService.processPurchaseOrderCostUpdates(
        'po-variance-test',
        [mockPurchaseOrderItems[0]],
        receiptWithVariance,
        'variance-test-user'
      );

      expect(result.priceVariances).toHaveLength(1);
      const variance = result.priceVariances[0];
      expect(variance.productId).toBe('prod-1');
      expect(variance.variancePercentage).toBeCloseTo(50.0, 1);
      expect(variance.varianceType).toBe('unfavorable');
      expect(variance.requiresApproval).toBe(true); // Significant variance
    });

    it('should handle favorable price variances correctly', async () => {
      const receiptWithFavorableVariance = [{
        productId: 'prod-1',
        receivedQuantity: 100,
        actualCost: 8.00, // 20% lower than ordered cost (10.00)
        batchNumber: 'BATCH-FAVORABLE'
      }];

      const result = await weightedAverageCostService.processPurchaseOrderCostUpdates(
        'po-favorable-test',
        [mockPurchaseOrderItems[0]],
        receiptWithFavorableVariance,
        'favorable-test-user'
      );

      expect(result.priceVariances).toHaveLength(1);
      const variance = result.priceVariances[0];
      expect(variance.varianceType).toBe('favorable');
      expect(variance.variancePercentage).toBeCloseTo(-20.0, 1);
      expect(variance.totalVarianceAmount).toBeCloseTo(-200.0, 2); // 100 * -2.00
    });

    it('should skip cost updates for zero received quantities', async () => {
      const receiptWithZeroQuantity = [{
        productId: 'prod-1',
        receivedQuantity: 0,
        actualCost: 12.00,
        batchNumber: 'BATCH-ZERO'
      }];

      const result = await weightedAverageCostService.processPurchaseOrderCostUpdates(
        'po-zero-test',
        [mockPurchaseOrderItems[0]],
        receiptWithZeroQuantity,
        'zero-test-user'
      );

      expect(result.costCalculations).toHaveLength(0);
      expect(result.priceVariances).toHaveLength(0);
      expect(result.transaction.totalItems).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const { supabase } = require('../../../utils/supabase');
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Database error' } 
            }))
          }))
        }))
      });

      const result = await weightedAverageCostService.processPurchaseOrderCostUpdates(
        'po-error-test',
        [mockPurchaseOrderItems[0]],
        [mockReceiptItems[0]],
        'error-test-user'
      );

      expect(result.costCalculations).toHaveLength(0);
      expect(result.priceVariances).toHaveLength(0);
      expect(result.transaction.hasErrors).toBe(true);
    });
  });

  describe('calculatePriceVariance - Variance Detection', () => {
    it('should calculate positive variance for higher actual cost', () => {
      const poItem = TestDataFactory.createPurchaseOrderItems(1)[0];
      poItem.cost = 20.00;

      const receiptItem = {
        productId: poItem.productId,
        receivedQuantity: 50,
        actualCost: 25.00, // 25% higher
        batchNumber: 'BATCH-POSITIVE'
      };

      const variance = weightedAverageCostService.calculatePriceVariance(poItem, receiptItem);

      expect(variance.orderedCost).toBe(20.00);
      expect(variance.actualCost).toBe(25.00);
      expect(variance.varianceAmount).toBe(5.00);
      expect(variance.variancePercentage).toBe(25.0);
      expect(variance.totalVarianceAmount).toBe(250.0); // 50 * 5.00
      expect(variance.varianceType).toBe('unfavorable');
    });

    it('should calculate negative variance for lower actual cost', () => {
      const poItem = TestDataFactory.createPurchaseOrderItems(1)[0];
      poItem.cost = 30.00;

      const receiptItem = {
        productId: poItem.productId,
        receivedQuantity: 20,
        actualCost: 24.00, // 20% lower
        batchNumber: 'BATCH-NEGATIVE'
      };

      const variance = weightedAverageCostService.calculatePriceVariance(poItem, receiptItem);

      expect(variance.varianceAmount).toBe(-6.00);
      expect(variance.variancePercentage).toBe(-20.0);
      expect(variance.totalVarianceAmount).toBe(-120.0); // 20 * -6.00
      expect(variance.varianceType).toBe('favorable');
    });

    it('should determine approval requirements based on variance threshold', () => {
      const poItem = TestDataFactory.createPurchaseOrderItems(1)[0];
      poItem.cost = 10.00;

      const smallVarianceReceipt = {
        productId: poItem.productId,
        receivedQuantity: 100,
        actualCost: 10.50, // 5% higher - within threshold
        batchNumber: 'BATCH-SMALL'
      };

      const smallVariance = weightedAverageCostService.calculatePriceVariance(poItem, smallVarianceReceipt);
      expect(smallVariance.requiresApproval).toBe(false);

      const largeVarianceReceipt = {
        productId: poItem.productId,
        receivedQuantity: 100,
        actualCost: 13.00, // 30% higher - exceeds threshold
        batchNumber: 'BATCH-LARGE'
      };

      const largeVariance = weightedAverageCostService.calculatePriceVariance(poItem, largeVarianceReceipt);
      expect(largeVariance.requiresApproval).toBe(true);
    });

    it('should handle zero cost variance correctly', () => {
      const poItem = TestDataFactory.createPurchaseOrderItems(1)[0];
      poItem.cost = 15.00;

      const exactCostReceipt = {
        productId: poItem.productId,
        receivedQuantity: 75,
        actualCost: 15.00, // Exact match
        batchNumber: 'BATCH-EXACT'
      };

      const variance = weightedAverageCostService.calculatePriceVariance(poItem, exactCostReceipt);

      expect(variance.varianceAmount).toBe(0.00);
      expect(variance.variancePercentage).toBe(0.00);
      expect(variance.totalVarianceAmount).toBe(0.00);
      expect(variance.varianceType).toBe('none');
      expect(variance.requiresApproval).toBe(false);
    });
  });

  describe('updateProductCosts - Database Operations', () => {
    it('should update product costs in database successfully', async () => {
      const costCalculation: WeightedAverageCostResult = {
        productId: 'prod-update-test',
        currentStock: 100,
        currentCost: 12.00,
        newStock: 150,
        newWeightedAverageCost: 13.50,
        costVariance: 1.50,
        costVariancePercentage: 12.5,
        calculatedAt: new Date(),
        calculatedBy: 'update-test-user'
      };

      const { supabase } = require('../../../utils/supabase');
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }));
      supabase.from.mockReturnValue({ update: mockUpdate });

      const result = await weightedAverageCostService.updateProductCosts([costCalculation]);

      expect(result.success).toBe(true);
      expect(result.updatedProducts).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith({
        cost: 13.50,
        updated_at: expect.any(String)
      });
    });

    it('should handle batch updates efficiently', async () => {
      const costCalculations: WeightedAverageCostResult[] = Array.from({ length: 10 }, (_, i) => ({
        productId: `prod-batch-${i + 1}`,
        currentStock: 100,
        currentCost: 10.00 + i,
        newStock: 150,
        newWeightedAverageCost: 11.00 + i,
        costVariance: 1.00,
        costVariancePercentage: 10.0,
        calculatedAt: new Date(),
        calculatedBy: 'batch-test-user'
      }));

      const result = await weightedAverageCostService.updateProductCosts(costCalculations);

      expect(result.success).toBe(true);
      expect(result.updatedProducts).toBe(10);
    });

    it('should handle partial failures in batch updates', async () => {
      const { supabase } = require('../../../utils/supabase');
      const mockUpdate = vi.fn((data) => ({
        eq: vi.fn(() => {
          // Simulate failure for specific product
          if (data.cost > 15.00) {
            return Promise.resolve({ error: { message: 'Update failed' } });
          }
          return Promise.resolve({ error: null });
        })
      }));
      supabase.from.mockReturnValue({ update: mockUpdate });

      const costCalculations: WeightedAverageCostResult[] = [
        {
          productId: 'prod-success',
          currentStock: 100,
          currentCost: 10.00,
          newStock: 150,
          newWeightedAverageCost: 12.00, // Will succeed
          costVariance: 2.00,
          costVariancePercentage: 20.0,
          calculatedAt: new Date(),
          calculatedBy: 'partial-test-user'
        },
        {
          productId: 'prod-failure',
          currentStock: 50,
          currentCost: 14.00,
          newStock: 75,
          newWeightedAverageCost: 16.00, // Will fail
          costVariance: 2.00,
          costVariancePercentage: 14.3,
          calculatedAt: new Date(),
          calculatedBy: 'partial-test-user'
        }
      ];

      const result = await weightedAverageCostService.updateProductCosts(costCalculations);

      expect(result.success).toBe(false);
      expect(result.updatedProducts).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures![0].productId).toBe('prod-failure');
    });
  });

  describe('Comprehensive Edge Cases and Error Handling', () => {
    it('should handle extremely small cost differences', () => {
      const result = weightedAverageCostService.calculateWeightedAverageCost({
        currentStock: 1000000,
        currentCost: 1.000000,
        incomingQuantity: 1,
        incomingCost: 1.000001
      });

      expect(result.newWeightedAverageCost).toBeCloseTo(1.000000, 6);
      expect(result.costVariance).toBeCloseTo(0.0, 6);
    });

    it('should handle very large cost differences', () => {
      const result = weightedAverageCostService.calculateWeightedAverageCost({
        currentStock: 10,
        currentCost: 1.00,
        incomingQuantity: 10,
        incomingCost: 1000.00
      });

      expect(result.newWeightedAverageCost).toBeCloseTo(500.50, 2);
      expect(result.costVariancePercentage).toBeCloseTo(50050.0, 1);
    });

    it('should maintain precision with many decimal places', () => {
      const result = weightedAverageCostService.calculateWeightedAverageCost({
        currentStock: 333,
        currentCost: 1.0 / 3, // 0.333333...
        incomingQuantity: 667,
        incomingCost: 2.0 / 3 // 0.666666...
      });

      expect(result.newWeightedAverageCost).toBeCloseTo(0.5556, 4);
      expect(result.newTotalValue).toBeCloseTo(555.6, 1);
    });

    it('should handle null and undefined values gracefully', async () => {
      const receiptWithNullCost = [{
        productId: 'prod-null-test',
        receivedQuantity: 50,
        actualCost: null as any,
        batchNumber: 'BATCH-NULL'
      }];

      const result = await weightedAverageCostService.processPurchaseOrderCostUpdates(
        'po-null-test',
        [TestDataFactory.createPurchaseOrderItems(1)[0]],
        receiptWithNullCost,
        'null-test-user'
      );

      expect(result.costCalculations).toHaveLength(0);
      expect(result.transaction.hasErrors).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batches efficiently', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        ...TestDataFactory.createPurchaseOrderItems(1)[0],
        productId: `prod-performance-${i + 1}`,
        cost: 10.00 + (i * 0.1)
      }));

      const largeReceipts = largeBatch.map((item, i) => ({
        productId: item.productId,
        receivedQuantity: 50 + i,
        actualCost: item.cost + (i * 0.05),
        batchNumber: `BATCH-PERF-${i + 1}`
      }));

      const startTime = performance.now();
      
      const result = await weightedAverageCostService.processPurchaseOrderCostUpdates(
        'po-performance-test',
        largeBatch,
        largeReceipts,
        'performance-test-user'
      );

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(result.costCalculations).toHaveLength(100);
      expect(result.priceVariances).toHaveLength(100);
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});