import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PriceVarianceService, VarianceThresholds, PriceVarianceRecord } from '../../../services/priceVarianceService';
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

describe('PriceVarianceService', () => {
  let service: PriceVarianceService;

  beforeEach(() => {
    service = new PriceVarianceService();
    vi.clearAllMocks();
  });

  describe('detectAndRecordVariances', () => {
    it('should detect and record significant price variances', async () => {
      // Mock product details lookup
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: { name: 'Test Product', sku: 'TEST001' }, 
              error: null 
            })
          }))
        })),
        insert: vi.fn(() => ({ error: null }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const purchaseOrderItems: PurchaseOrderItem[] = [
        {
          id: '1',
          productId: 'product1',
          productName: 'Test Product',
          productSku: 'TEST001',
          quantity: 100,
          cost: 10.0,
          total: 1000
        }
      ];

      const actualReceipts = [
        {
          productId: 'product1',
          actualCost: 12.0, // 20% variance
          receivedQuantity: 100,
          supplierId: 'supplier1'
        }
      ];

      const result = await service.detectAndRecordVariances(
        purchaseOrderItems,
        actualReceipts,
        'po123',
        'purchase_order'
      );

      expect(result.variances).toHaveLength(1);
      expect(result.alerts).toHaveLength(2); // Should generate significant + approval required alerts

      const variance = result.variances[0];
      expect(variance.productId).toBe('product1');
      expect(variance.expectedCost).toBe(10.0);
      expect(variance.actualCost).toBe(12.0);
      expect(variance.variance).toBe(2.0);
      expect(variance.variancePercentage).toBe(20);
      expect(variance.totalVarianceAmount).toBe(200);
      expect(variance.status).toBe('pending');

      expect(result.analysis.totalVariances).toBe(1);
      expect(result.analysis.unfavorableVariances).toBe(1);
      expect(result.analysis.significantVariances).toBe(1);
    });

    it('should not record variances below threshold', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: { name: 'Test Product', sku: 'TEST001' }, 
              error: null 
            })
          }))
        })),
        insert: vi.fn(() => ({ error: null }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const purchaseOrderItems: PurchaseOrderItem[] = [
        {
          id: '1',
          productId: 'product1',
          productName: 'Test Product',
          productSku: 'TEST001',
          quantity: 100,
          cost: 10.0,
          total: 1000
        }
      ];

      const actualReceipts = [
        {
          productId: 'product1',
          actualCost: 10.1, // Only 1% variance (below 5% threshold)
          receivedQuantity: 10 // Small quantity to stay below amount threshold too
        }
      ];

      const result = await service.detectAndRecordVariances(
        purchaseOrderItems,
        actualReceipts,
        'po123',
        'purchase_order'
      );

      expect(result.variances).toHaveLength(0);
      expect(result.alerts).toHaveLength(0);
    });

    it('should record variances that meet amount threshold even if percentage is low', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: { name: 'Test Product', sku: 'TEST001' }, 
              error: null 
            })
          }))
        })),
        insert: vi.fn(() => ({ error: null }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const purchaseOrderItems: PurchaseOrderItem[] = [
        {
          id: '1',
          productId: 'product1',
          productName: 'Test Product',
          productSku: 'TEST001',
          quantity: 1000,
          cost: 100.0,
          total: 100000
        }
      ];

      const actualReceipts = [
        {
          productId: 'product1',
          actualCost: 101.0, // Only 1% variance but $1000 total impact
          receivedQuantity: 1000
        }
      ];

      const customThresholds: Partial<VarianceThresholds> = {
        minimumAmount: 500 // $500 threshold
      };

      const result = await service.detectAndRecordVariances(
        purchaseOrderItems,
        actualReceipts,
        'po123',
        'purchase_order',
        customThresholds
      );

      expect(result.variances).toHaveLength(1);
      expect(result.variances[0].totalVarianceAmount).toBe(1000);
    });

    it('should generate critical variance alerts for large variances', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: { name: 'Test Product', sku: 'TEST001' }, 
              error: null 
            })
          }))
        })),
        insert: vi.fn(() => ({ error: null }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const purchaseOrderItems: PurchaseOrderItem[] = [
        {
          id: '1',
          productId: 'product1',
          productName: 'Test Product',
          productSku: 'TEST001',
          quantity: 100,
          cost: 10.0,
          total: 1000
        }
      ];

      const actualReceipts = [
        {
          productId: 'product1',
          actualCost: 15.0, // 50% variance - critical
          receivedQuantity: 100
        }
      ];

      const result = await service.detectAndRecordVariances(
        purchaseOrderItems,
        actualReceipts,
        'po123',
        'purchase_order'
      );

      expect(result.alerts).toHaveLength(2); // Critical and approval required alerts
      
      const criticalAlert = result.alerts.find(alert => alert.alertType === 'critical_variance');
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.severity).toBe('critical');
      expect(criticalAlert?.recipientRoles).toContain('procurement_manager');
    });

    it('should auto-approve small favorable variances', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: { name: 'Test Product', sku: 'TEST001' }, 
              error: null 
            })
          }))
        })),
        insert: vi.fn(() => ({ error: null }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const purchaseOrderItems: PurchaseOrderItem[] = [
        {
          id: '1',
          productId: 'product1',
          productName: 'Test Product',
          productSku: 'TEST001',
          quantity: 100,
          cost: 10.0,
          total: 1000
        }
      ];

      const actualReceipts = [
        {
          productId: 'product1',
          actualCost: 9.2, // 8% favorable variance
          receivedQuantity: 100
        }
      ];

      const result = await service.detectAndRecordVariances(
        purchaseOrderItems,
        actualReceipts,
        'po123',
        'purchase_order'
      );

      expect(result.variances).toHaveLength(1);
      expect(result.variances[0].status).toBe('approved'); // Auto-approved favorable variance
      expect(result.analysis.favorableVariances).toBe(1);
    });
  });

  describe('reviewVariance', () => {
    it('should approve price variance and mark alerts as resolved', async () => {
      const mockEq = vi.fn().mockReturnValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn(() => ({
        update: mockUpdate
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      await service.reviewVariance('variance123', 'approve', 'manager1', 'Approved due to market conditions');

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'approved',
        reviewed_by: 'manager1',
        reviewed_at: expect.any(String),
        notes: 'Approved due to market conditions'
      });
    });

    it('should reject price variance with proper status update', async () => {
      const mockEq = vi.fn().mockReturnValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = vi.fn(() => ({
        update: mockUpdate
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      await service.reviewVariance('variance123', 'reject', 'manager1');

      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'rejected',
        reviewed_by: 'manager1',
        reviewed_at: expect.any(String),
        notes: 'Variance rejected by manager1'
      });
    });
  });

  describe('generateVarianceReport', () => {
    it('should generate comprehensive variance report', async () => {
      const mockVarianceData = [
        {
          id: 'var1',
          product_id: 'product1',
          product_name: 'Product 1',
          product_sku: 'SKU001',
          reference_id: 'po123',
          reference_type: 'purchase_order',
          expected_cost: 10.0,
          actual_cost: 12.0,
          variance: 2.0,
          variance_percentage: 20,
          quantity: 100,
          total_variance_amount: 200,
          detected_at: '2024-01-15T10:00:00Z',
          status: 'pending',
          products: { name: 'Product 1', sku: 'SKU001', category: 'Electronics' }
        },
        {
          id: 'var2',
          product_id: 'product2',
          product_name: 'Product 2',
          product_sku: 'SKU002',
          reference_id: 'po124',
          reference_type: 'purchase_order',
          expected_cost: 5.0,
          actual_cost: 4.5,
          variance: -0.5,
          variance_percentage: -10,
          quantity: 50,
          total_variance_amount: -25,
          detected_at: '2024-01-16T14:00:00Z',
          status: 'approved',
          products: { name: 'Product 2', sku: 'SKU002', category: 'Office Supplies' }
        }
      ];

      const mockSelect = vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockVarianceData, error: null }))
          }))
        }))
      }));

      const mockFrom = vi.fn(() => ({ select: mockSelect }));
      mockSupabase.from.mockImplementation(mockFrom);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      const report = await service.generateVarianceReport(dateFrom, dateTo);

      expect(report.period.from).toEqual(dateFrom);
      expect(report.period.to).toEqual(dateTo);
      
      expect(report.summary.totalVariances).toBe(2);
      expect(report.summary.favorableVariances).toBe(1);
      expect(report.summary.unfavorableVariances).toBe(1);
      expect(report.summary.significantVariances).toBe(2);
      expect(report.summary.totalVarianceAmount).toBe(175); // 200 + (-25)

      expect(report.variancesByProduct).toHaveLength(2);
      expect(report.variancesByCategory).toHaveLength(2);
      expect(report.trends).toHaveLength(expect.any(Number));
    });

    it('should handle empty result sets', async () => {
      const mockSelect = vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }));

      const mockFrom = vi.fn(() => ({ select: mockSelect }));
      mockSupabase.from.mockImplementation(mockFrom);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');

      const report = await service.generateVarianceReport(dateFrom, dateTo);

      expect(report.summary.totalVariances).toBe(0);
      expect(report.variancesByProduct).toHaveLength(0);
      expect(report.variancesByCategory).toHaveLength(0);
    });

    it('should apply filters correctly', async () => {
      const mockSelect = vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            in: vi.fn(() => ({
              or: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        }))
      }));

      const mockFrom = vi.fn(() => ({ select: mockSelect }));
      mockSupabase.from.mockImplementation(mockFrom);

      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');
      const filters = {
        productIds: ['product1', 'product2'],
        minVariancePercentage: 10
      };

      await service.generateVarianceReport(dateFrom, dateTo, filters);

      expect(mockSelect).toHaveBeenCalled();
      // The specific filter methods should be called in the chain
    });
  });

  describe('analyzeVariances', () => {
    it('should correctly analyze collection of variances', () => {
      const variances: PriceVarianceRecord[] = [
        {
          id: 'var1',
          productId: 'product1',
          productName: 'Product 1',
          productSku: 'SKU001',
          referenceId: 'po123',
          referenceType: 'purchase_order',
          expectedCost: 10.0,
          actualCost: 12.0,
          variance: 2.0,
          variancePercentage: 20,
          quantity: 100,
          totalVarianceAmount: 200,
          detectedAt: new Date(),
          status: 'pending'
        },
        {
          id: 'var2',
          productId: 'product2',
          productName: 'Product 2',
          productSku: 'SKU002',
          referenceId: 'po124',
          referenceType: 'purchase_order',
          expectedCost: 5.0,
          actualCost: 4.5,
          variance: -0.5,
          variancePercentage: -10,
          quantity: 50,
          totalVarianceAmount: -25,
          detectedAt: new Date(),
          status: 'approved'
        },
        {
          id: 'var3',
          productId: 'product3',
          productName: 'Product 3',
          productSku: 'SKU003',
          referenceId: 'po125',
          referenceType: 'purchase_order',
          expectedCost: 8.0,
          actualCost: 8.2,
          variance: 0.2,
          variancePercentage: 2.5,
          quantity: 200,
          totalVarianceAmount: 40,
          detectedAt: new Date(),
          status: 'approved'
        }
      ];

      // Access the private method through any casting for testing
      const analysis = (service as any).analyzeVariances(variances);

      expect(analysis.totalVariances).toBe(3);
      expect(analysis.significantVariances).toBe(2); // 20% and -10% are > 10%
      expect(analysis.favorableVariances).toBe(1); // Only the -0.5 variance
      expect(analysis.unfavorableVariances).toBe(2); // 2.0 and 0.2 variances
      expect(analysis.totalVarianceAmount).toBe(215); // 200 + (-25) + 40
      expect(analysis.averageVariancePercentage).toBeCloseTo(10.83, 1); // (20 + 10 + 2.5) / 3
      expect(analysis.topVariancesByAmount[0].id).toBe('var1'); // Highest absolute amount
      expect(analysis.topVariancesByPercentage[0].id).toBe('var1'); // Highest percentage
    });

    it('should handle empty variance array', () => {
      const analysis = (service as any).analyzeVariances([]);

      expect(analysis.totalVariances).toBe(0);
      expect(analysis.significantVariances).toBe(0);
      expect(analysis.favorableVariances).toBe(0);
      expect(analysis.unfavorableVariances).toBe(0);
      expect(analysis.totalVarianceAmount).toBe(0);
      expect(analysis.averageVariancePercentage).toBe(0);
      expect(analysis.topVariancesByAmount).toHaveLength(0);
      expect(analysis.topVariancesByPercentage).toHaveLength(0);
    });
  });

  describe('variance thresholds', () => {
    it('should use custom thresholds when provided', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ 
              data: { name: 'Test Product', sku: 'TEST001' }, 
              error: null 
            })
          }))
        })),
        insert: vi.fn(() => ({ error: null }))
      }));

      mockSupabase.from.mockImplementation(mockFrom);

      const purchaseOrderItems: PurchaseOrderItem[] = [
        {
          id: '1',
          productId: 'product1',
          productName: 'Test Product',
          productSku: 'TEST001',
          quantity: 100,
          cost: 10.0,
          total: 1000
        }
      ];

      const actualReceipts = [
        {
          productId: 'product1',
          actualCost: 10.7, // 7% variance
          receivedQuantity: 100
        }
      ];

      const customThresholds: Partial<VarianceThresholds> = {
        minimumPercentage: 2.0, // Lower threshold
        significantPercentage: 5.0,
        criticalPercentage: 15.0
      };

      const result = await service.detectAndRecordVariances(
        purchaseOrderItems,
        actualReceipts,
        'po123',
        'purchase_order',
        customThresholds
      );

      expect(result.variances).toHaveLength(1); // Should record with 7% variance
      expect(result.analysis.significantVariances).toBe(1); // 7% > 5% threshold
    });
  });
});