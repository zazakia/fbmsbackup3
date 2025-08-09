import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { WeightedAverageCostService, CostCalculationInput, WeightedAverageCostResult } from '../../../services/weightedAverageCostService';
import { PurchaseOrderItem } from '../../../types/business';
import { supabase } from '../../../utils/supabase';

// Mock Supabase
vi.mock('../../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

const mockSupabase = supabase as {
  from: Mock;
  rpc: Mock;
};

describe('WeightedAverageCostService', () => {
  let service: WeightedAverageCostService;

  beforeEach(() => {
    service = new WeightedAverageCostService();
    vi.clearAllMocks();
  });

  describe('calculateWeightedAverageCost', () => {
    it('should calculate weighted average cost correctly with existing stock', () => {
      const input: CostCalculationInput = {
        productId: 'product1',
        currentStock: 100,
        currentCost: 10.0,
        incomingQuantity: 50,
        incomingCost: 12.0
      };

      const result = service.calculateWeightedAverageCost(input);

      const expectedNewCost = ((100 * 10.0) + (50 * 12.0)) / (100 + 50);

      expect(result).toEqual({
        productId: 'product1',
        currentStock: 100,
        currentCost: 10.0,
        currentTotalValue: 1000,
        incomingQuantity: 50,
        incomingCost: 12.0,
        incomingTotalValue: 600,
        newStock: 150,
        newWeightedAverageCost: Number(expectedNewCost.toFixed(4)),
        newTotalValue: 1600,
        costVariance: Number((expectedNewCost - 10.0).toFixed(4)),
        costVariancePercentage: Number(((expectedNewCost - 10.0) / 10.0 * 100).toFixed(2)),
        significantVariance: Math.abs((expectedNewCost - 10.0) / 10.0 * 100) > 10
      });
    });

    it('should handle zero existing stock correctly', () => {
      const input: CostCalculationInput = {
        productId: 'product1',
        currentStock: 0,
        currentCost: 0,
        incomingQuantity: 50,
        incomingCost: 12.0
      };

      const result = service.calculateWeightedAverageCost(input);

      expect(result.newWeightedAverageCost).toBe(12.0);
      expect(result.newStock).toBe(50);
      expect(result.newTotalValue).toBe(600);
      expect(result.significantVariance).toBe(false); // No variance when current cost is 0
    });

    it('should detect significant variance when cost change exceeds 10%', () => {
      const input: CostCalculationInput = {
        productId: 'product1',
        currentStock: 100,
        currentCost: 10.0,
        incomingQuantity: 100,
        incomingCost: 15.0 // 50% higher cost
      };

      const result = service.calculateWeightedAverageCost(input);

      expect(result.significantVariance).toBe(true);
      expect(Math.abs(result.costVariancePercentage)).toBeGreaterThan(10);
    });

    it('should throw error for invalid quantities', () => {
      const input: CostCalculationInput = {
        productId: 'product1',
        currentStock: -10,
        currentCost: 10.0,
        incomingQuantity: 50,
        incomingCost: 12.0
      };

      expect(() => service.calculateWeightedAverageCost(input)).toThrow('Invalid stock quantities');
    });

    it('should throw error for invalid costs', () => {
      const input: CostCalculationInput = {
        productId: 'product1',
        currentStock: 100,
        currentCost: -5.0,
        incomingQuantity: 50,
        incomingCost: 12.0
      };

      expect(() => service.calculateWeightedAverageCost(input)).toThrow('Invalid cost values');
    });
  });

  describe('calculateBatchWeightedAverageCosts', () => {
    it('should calculate costs for multiple products', async () => {
      // Mock database calls
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
              .mockResolvedValueOnce({ data: { cost: 10.0, stock: 100 }, error: null })
              .mockResolvedValueOnce({ data: { cost: 15.0, stock: 100 }, error: null })
          }))
        }))
      }));
      
      mockSupabase.from.mockImplementation(mockFrom);

      const products = [
        {
          productId: 'product1',
          incomingQuantity: 50,
          incomingCost: 12.0,
          referenceId: 'po123'
        },
        {
          productId: 'product2',
          incomingQuantity: 25,
          incomingCost: 18.0,
          referenceId: 'po123'
        }
      ];

      const results = await service.calculateBatchWeightedAverageCosts(products);

      expect(results).toHaveLength(2);
      expect(results[0].productId).toBe('product1');
      expect(results[1].productId).toBe('product2');
      expect(results[0].newStock).toBe(150); // 100 + 50
      expect(results[1].newStock).toBe(125);  // 100 + 25
    });

    it('should handle database errors gracefully', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Product not found' } })
          }))
        }))
      }));
      
      mockSupabase.from.mockImplementation(mockFrom);

      const products = [
        {
          productId: 'invalid_product',
          incomingQuantity: 50,
          incomingCost: 12.0
        }
      ];

      const results = await service.calculateBatchWeightedAverageCosts(products);

      expect(results).toHaveLength(0); // Should skip invalid products
    });
  });

  describe('detectPriceVariances', () => {
    it('should detect significant price variances', async () => {
      // Mock database calls for saving variances
      const mockFrom = vi.fn(() => ({
        insert: vi.fn(() => ({ error: null }))
      }));
      
      mockSupabase.from.mockImplementation(mockFrom);

      const purchaseOrderItems: PurchaseOrderItem[] = [
        {
          id: '1',
          productId: 'product1',
          productName: 'Test Product 1',
          productSku: 'SKU001',
          quantity: 100,
          cost: 10.0,
          total: 1000
        },
        {
          id: '2',
          productId: 'product2',
          productName: 'Test Product 2',
          productSku: 'SKU002',
          quantity: 50,
          cost: 20.0,
          total: 1000
        }
      ];

      const actualReceipts = [
        {
          productId: 'product1',
          actualCost: 12.0, // 20% increase
          receivedQuantity: 100
        },
        {
          productId: 'product2',
          actualCost: 18.0, // 10% decrease (above 5% threshold)
          receivedQuantity: 50
        }
      ];

      const variances = await service.detectPriceVariances(
        purchaseOrderItems,
        actualReceipts,
        'po123'
      );

      expect(variances).toHaveLength(2);
      
      const variance1 = variances.find(v => v.productId === 'product1');
      const variance2 = variances.find(v => v.productId === 'product2');

      expect(variance1?.variancePercentage).toBe(20);
      expect(variance1?.totalVarianceAmount).toBe(200); // $2 * 100 units
      
      expect(variance2?.variancePercentage).toBe(-10);
      expect(variance2?.totalVarianceAmount).toBe(-100); // -$2 * 50 units
    });

    it('should not record minor variances below threshold', async () => {
      const mockFrom = vi.fn(() => ({
        insert: vi.fn(() => ({ error: null }))
      }));
      
      mockSupabase.from.mockImplementation(mockFrom);

      const purchaseOrderItems: PurchaseOrderItem[] = [
        {
          id: '1',
          productId: 'product1',
          productName: 'Test Product 1',
          productSku: 'SKU001',
          quantity: 100,
          cost: 10.0,
          total: 1000
        }
      ];

      const actualReceipts = [
        {
          productId: 'product1',
          actualCost: 10.30, // Only 3% increase (below 5% threshold)
          receivedQuantity: 100
        }
      ];

      const variances = await service.detectPriceVariances(
        purchaseOrderItems,
        actualReceipts,
        'po123'
      );

      expect(variances).toHaveLength(0); // Should not record minor variances
    });
  });

  describe('updateProductCosts', () => {
    it('should update product costs using database transaction', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockFrom = vi.fn(() => ({
        insert: vi.fn(() => ({ error: null }))
      }));
      
      mockSupabase.rpc.mockImplementation(mockRpc);
      mockSupabase.from.mockImplementation(mockFrom);

      const costResults: WeightedAverageCostResult[] = [
        {
          productId: 'product1',
          currentStock: 100,
          currentCost: 10.0,
          currentTotalValue: 1000,
          incomingQuantity: 50,
          incomingCost: 12.0,
          incomingTotalValue: 600,
          newStock: 150,
          newWeightedAverageCost: 10.67,
          newTotalValue: 1600,
          costVariance: 0.67,
          costVariancePercentage: 6.7,
          significantVariance: false
        }
      ];

      const transaction = await service.updateProductCosts(
        costResults,
        'po123',
        'purchase_order',
        'user1'
      );

      expect(mockRpc).toHaveBeenCalledWith(
        'update_product_costs_batch',
        expect.objectContaining({
          cost_updates: expect.arrayContaining([
            expect.objectContaining({
              product_id: 'product1',
              old_cost: 10.0,
              new_cost: 10.67,
              stock_quantity: 150
            })
          ])
        })
      );

      expect(transaction.status).toBe('completed');
      expect(transaction.products).toHaveLength(1);
      expect(transaction.totalValueAdjustment).toBe(600); // 1600 - 1000
    });

    it('should handle database errors and set transaction status to failed', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });
      const mockFrom = vi.fn(() => ({
        insert: vi.fn(() => ({ error: null }))
      }));
      
      mockSupabase.rpc.mockImplementation(mockRpc);
      mockSupabase.from.mockImplementation(mockFrom);

      const costResults: WeightedAverageCostResult[] = [
        {
          productId: 'product1',
          currentStock: 100,
          currentCost: 10.0,
          currentTotalValue: 1000,
          incomingQuantity: 50,
          incomingCost: 12.0,
          incomingTotalValue: 600,
          newStock: 150,
          newWeightedAverageCost: 10.67,
          newTotalValue: 1600,
          costVariance: 0.67,
          costVariancePercentage: 6.7,
          significantVariance: false
        }
      ];

      await expect(
        service.updateProductCosts(costResults, 'po123', 'purchase_order', 'user1')
      ).rejects.toThrow('Failed to update product costs');
    });
  });

  describe('processPurchaseOrderCostUpdates', () => {
    it('should process complete purchase order cost updates', async () => {
      // Mock all database calls
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { cost: 10.0, stock: 100 }, error: null })
          }))
        })),
        insert: vi.fn(() => ({ error: null }))
      }));
      
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      
      mockSupabase.from.mockImplementation(mockFrom);
      mockSupabase.rpc.mockImplementation(mockRpc);

      const purchaseOrderItems: PurchaseOrderItem[] = [
        {
          id: '1',
          productId: 'product1',
          productName: 'Test Product 1',
          productSku: 'SKU001',
          quantity: 100,
          cost: 10.0,
          total: 1000
        }
      ];

      const receipts = [
        {
          productId: 'product1',
          receivedQuantity: 50,
          actualCost: 12.0
        }
      ];

      const result = await service.processPurchaseOrderCostUpdates(
        'po123',
        purchaseOrderItems,
        receipts,
        'user1'
      );

      expect(result.costCalculations).toHaveLength(1);
      expect(result.priceVariances).toHaveLength(1);
      expect(result.valueAdjustments).toHaveLength(1);
      expect(result.transaction.status).toBe('completed');

      const costCalc = result.costCalculations[0];
      expect(costCalc.productId).toBe('product1');
      expect(costCalc.incomingQuantity).toBe(50);
      expect(costCalc.incomingCost).toBe(12.0);

      const priceVariance = result.priceVariances[0];
      expect(priceVariance.productId).toBe('product1');
      expect(priceVariance.expectedCost).toBe(10.0);
      expect(priceVariance.actualCost).toBe(12.0);
      expect(priceVariance.variancePercentage).toBe(20);

      const valueAdjustment = result.valueAdjustments[0];
      expect(valueAdjustment.productId).toBe('product1');
      expect(valueAdjustment.adjustmentType).toBe('increase');
    });
  });

  describe('generateInventoryValueAdjustments', () => {
    it('should generate correct GL adjustments for cost increases', () => {
      const costResults: WeightedAverageCostResult[] = [
        {
          productId: 'product1',
          currentStock: 100,
          currentCost: 10.0,
          currentTotalValue: 1000,
          incomingQuantity: 50,
          incomingCost: 12.0,
          incomingTotalValue: 600,
          newStock: 150,
          newWeightedAverageCost: 10.67,
          newTotalValue: 1600,
          costVariance: 0.67,
          costVariancePercentage: 6.7,
          significantVariance: false
        }
      ];

      const adjustments = service.generateInventoryValueAdjustments(costResults);

      expect(adjustments).toHaveLength(1);
      
      const adjustment = adjustments[0];
      expect(adjustment.productId).toBe('product1');
      expect(adjustment.oldCost).toBe(10.0);
      expect(adjustment.newCost).toBe(10.67);
      expect(adjustment.adjustmentType).toBe('increase');
      expect(adjustment.adjustmentAmount).toBe(600);
      expect(adjustment.glAccountDebit).toBe('1200'); // Inventory
      expect(adjustment.glAccountCredit).toBe('2000'); // Accounts Payable
    });

    it('should generate correct GL adjustments for cost decreases', () => {
      const costResults: WeightedAverageCostResult[] = [
        {
          productId: 'product1',
          currentStock: 100,
          currentCost: 10.0,
          currentTotalValue: 1000,
          incomingQuantity: 50,
          incomingCost: 8.0,
          incomingTotalValue: 400,
          newStock: 150,
          newWeightedAverageCost: 9.33,
          newTotalValue: 1400,
          costVariance: -0.67,
          costVariancePercentage: -6.7,
          significantVariance: false
        }
      ];

      const adjustments = service.generateInventoryValueAdjustments(costResults);

      expect(adjustments).toHaveLength(1);
      
      const adjustment = adjustments[0];
      expect(adjustment.adjustmentType).toBe('increase'); // Still increase because new total value > old total value
      expect(adjustment.adjustmentAmount).toBe(400); // 1400 - 1000
    });
  });
});