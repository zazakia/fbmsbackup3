import { describe, it, expect, vi, beforeEach } from 'vitest';
import { purchasesDashboardService } from '../purchasesDashboardService';
import * as purchasesApi from '../../api/purchases';

// Mock the purchases API
vi.mock('../../api/purchases', () => ({
  getPurchaseOrders: vi.fn(),
  getSuppliers: vi.fn(),
  getPurchaseOrdersByStatus: vi.fn()
}));

describe('PurchasesDashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    purchasesDashboardService.clearCache();
  });

  describe('getDashboardData', () => {
    it('should fetch and aggregate dashboard data successfully', async () => {
      // Mock API responses
      const mockOrders = [
        {
          id: '1',
          poNumber: 'PO-001',
          supplierId: 'supplier-1',
          supplierName: 'Test Supplier',
          total: 1000,
          status: 'sent',
          createdAt: new Date().toISOString(),
          items: []
        }
      ];

      const mockSuppliers = [
        {
          id: 'supplier-1',
          name: 'Test Supplier',
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];

      vi.mocked(purchasesApi.getPurchaseOrders).mockResolvedValue({ data: mockOrders, error: null });
      vi.mocked(purchasesApi.getSuppliers).mockResolvedValue({ data: mockSuppliers, error: null });
      vi.mocked(purchasesApi.getPurchaseOrdersByStatus).mockResolvedValue({ data: [], error: null });

      const result = await purchasesDashboardService.getDashboardData();

      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.recentOrders).toBeDefined();
      expect(result.supplierPerformance).toBeDefined();
      expect(result.alerts).toBeDefined();
      expect(result.analytics).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(purchasesApi.getPurchaseOrders).mockResolvedValue({ 
        data: null, 
        error: new Error('API Error') 
      });

      await expect(purchasesDashboardService.getDashboardData()).rejects.toThrow('Failed to fetch purchase orders');
    });

    it('should use cached data when available', async () => {
      const mockData = {
        metrics: {
          totalPurchasesValue: 1000,
          totalPurchasesChange: 10,
          activePurchaseOrders: 5,
          pendingOrders: 2,
          averageOrderValue: 200,
          monthlySpending: 1000
        },
        recentOrders: [],
        supplierPerformance: [],
        alerts: [],
        analytics: {
          monthlyTrends: [],
          statusDistribution: [],
          categoryBreakdown: [],
          yearOverYearComparison: {
            currentYear: 1000,
            previousYear: 900,
            change: 100,
            changePercentage: 11.11
          }
        }
      };

      // First call should fetch data
      vi.mocked(purchasesApi.getPurchaseOrders).mockResolvedValue({ data: [], error: null });
      vi.mocked(purchasesApi.getSuppliers).mockResolvedValue({ data: [], error: null });
      vi.mocked(purchasesApi.getPurchaseOrdersByStatus).mockResolvedValue({ data: [], error: null });

      await purchasesDashboardService.getDashboardData();

      // Second call should use cache
      await purchasesDashboardService.getDashboardData();

      // API should only be called once due to caching
      expect(purchasesApi.getPurchaseOrders).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', () => {
      expect(() => purchasesDashboardService.clearCache()).not.toThrow();
    });
  });
});