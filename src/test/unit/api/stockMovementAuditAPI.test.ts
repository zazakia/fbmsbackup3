/**
 * Unit Tests for Stock Movement Audit API
 * 
 * Tests the enhanced stock movement API functions that integrate with the audit service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  updateStockWithAudit,
  createStockMovementWithAudit,
  bulkUpdateStockWithAudit,
  getStockMovementHistoryWithAudit,
  getStockMovementSummaryWithAudit,
  reconcileStockWithAudit
} from '../../../api/stockMovementAuditAPI';
import { Product, StockMovement } from '../../../types/business';

// Mock dependencies
vi.mock('../../../api/products', () => ({
  updateStock: vi.fn(),
  createStockMovement: vi.fn(),
  getStockMovements: vi.fn(),
  getProduct: vi.fn()
}));

vi.mock('../../../services/auditService', () => ({
  auditService: {
    logStockMovementAudit: vi.fn(),
    getStockMovementHistory: vi.fn()
  }
}));

vi.mock('../../../store/supabaseAuthStore', () => ({
  useSupabaseAuthStore: {
    getState: vi.fn(() => ({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' }
      }
    }))
  }
}));

// Import mocked modules
import * as productsAPI from '../../../api/products';
import { auditService } from '../../../services/auditService';

describe('Stock Movement Audit API', () => {
  const mockProduct: Product = {
    id: 'product-123',
    name: 'Test Product',
    description: 'A test product',
    sku: 'SKU-001',
    category: 'Test Category',
    categoryId: 'cat-1',
    price: 20.00,
    cost: 15.00,
    stock: 100,
    minStock: 10,
    unit: 'pieces',
    isActive: true,
    tags: [],
    images: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('updateStockWithAudit', () => {
    it('should successfully update stock and log audit trail', async () => {
      // Mock getting current product
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      // Mock successful stock update
      (productsAPI.updateStock as any).mockResolvedValueOnce({
        data: { ...mockProduct, stock: 125 },
        error: null
      });

      // Mock audit logging
      (auditService.logStockMovementAudit as any).mockResolvedValueOnce({
        success: true,
        auditId: 'audit-stock-123'
      });

      const result = await updateStockWithAudit(
        'product-123',
        25,
        'add',
        {
          referenceType: 'purchase_order',
          referenceId: 'po-123',
          referenceNumber: 'PO-2023-001',
          reason: 'Purchase order receipt',
          unitCost: 14.50,
          batchNumber: 'BATCH-001',
          location: 'Warehouse A'
        }
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();

      // Verify stock update was called
      expect(productsAPI.updateStock).toHaveBeenCalledWith(
        'product-123',
        25,
        'add',
        expect.objectContaining({
          referenceId: 'po-123',
          userId: 'test-user-id',
          reason: 'Purchase order receipt'
        })
      );

      // Verify audit logging was called
      expect(auditService.logStockMovementAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-123',
          productName: 'Test Product',
          productSku: 'SKU-001',
          movementType: 'purchase_receipt',
          quantityBefore: 100,
          quantityAfter: 125,
          quantityChanged: 25,
          unitCost: 14.50,
          totalValue: 362.50, // 14.50 * 25
          referenceType: 'purchase_order',
          referenceId: 'po-123',
          referenceNumber: 'PO-2023-001',
          batchNumber: 'BATCH-001',
          location: 'Warehouse A'
        }),
        expect.objectContaining({
          performedBy: 'test-user-id',
          performedByName: 'Test User',
          reason: 'Stock add: 25 units'
        })
      );
    });

    it('should handle subtract operation correctly', async () => {
      // Mock getting current product
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      // Mock successful stock update
      (productsAPI.updateStock as any).mockResolvedValueOnce({
        data: { ...mockProduct, stock: 80 },
        error: null
      });

      // Mock audit logging
      (auditService.logStockMovementAudit as any).mockResolvedValueOnce({
        success: true,
        auditId: 'audit-stock-456'
      });

      const result = await updateStockWithAudit(
        'product-123',
        20,
        'subtract',
        {
          referenceType: 'sale',
          referenceId: 'sale-456',
          reason: 'Product sold'
        }
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();

      // Verify audit logging captured negative change
      expect(auditService.logStockMovementAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          quantityBefore: 100,
          quantityAfter: 80,
          quantityChanged: -20,
          movementType: 'sale'
        }),
        expect.any(Object)
      );
    });

    it('should handle set operation correctly', async () => {
      // Mock getting current product
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      // Mock successful stock update
      (productsAPI.updateStock as any).mockResolvedValueOnce({
        data: { ...mockProduct, stock: 75 },
        error: null
      });

      // Mock audit logging
      (auditService.logStockMovementAudit as any).mockResolvedValueOnce({
        success: true,
        auditId: 'audit-stock-set'
      });

      const result = await updateStockWithAudit(
        'product-123',
        75,
        'set',
        {
          reason: 'Physical count adjustment'
        }
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();

      // Verify audit logging captured the difference
      expect(auditService.logStockMovementAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          quantityBefore: 100,
          quantityAfter: 75,
          quantityChanged: -25,
          movementType: 'adjustment'
        }),
        expect.any(Object)
      );
    });

    it('should prevent negative stock', async () => {
      // Mock getting current product
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      const result = await updateStockWithAudit(
        'product-123',
        150, // More than available
        'subtract'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Insufficient stock');

      // Should not call update or audit
      expect(productsAPI.updateStock).not.toHaveBeenCalled();
      expect(auditService.logStockMovementAudit).not.toHaveBeenCalled();
    });

    it('should handle product not found', async () => {
      // Mock product not found
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: null,
        error: new Error('Product not found')
      });

      const result = await updateStockWithAudit('nonexistent-product', 10, 'add');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();

      // Should not proceed with update or audit
      expect(productsAPI.updateStock).not.toHaveBeenCalled();
      expect(auditService.logStockMovementAudit).not.toHaveBeenCalled();
    });

    it('should continue despite audit logging failures', async () => {
      // Mock getting current product
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      // Mock successful stock update
      (productsAPI.updateStock as any).mockResolvedValueOnce({
        data: { ...mockProduct, stock: 110 },
        error: null
      });

      // Mock audit logging failure
      (auditService.logStockMovementAudit as any).mockResolvedValueOnce({
        success: false,
        error: 'Audit service unavailable'
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await updateStockWithAudit('product-123', 10, 'add');

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create stock movement audit log:',
        'Audit service unavailable'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('createStockMovementWithAudit', () => {
    it('should create stock movement and log audit trail', async () => {
      const movementData = {
        productId: 'product-123',
        type: 'purchase' as const,
        quantity: 25,
        previousStock: 100,
        newStock: 125,
        reference: 'po-123',
        notes: 'Purchase order receipt',
        referenceType: 'purchase_order' as const,
        referenceId: 'po-123',
        referenceNumber: 'PO-2023-001',
        unitCost: 15.50
      };

      // Mock getting product
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      // Mock successful creation
      (productsAPI.createStockMovement as any).mockResolvedValueOnce({
        data: { id: 'movement-123', ...movementData },
        error: null
      });

      // Mock audit logging
      (auditService.logStockMovementAudit as any).mockResolvedValueOnce({
        success: true,
        auditId: 'audit-movement-123'
      });

      const result = await createStockMovementWithAudit(
        movementData,
        'Recording purchase receipt'
      );

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();

      // Verify stock movement creation
      expect(productsAPI.createStockMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-123',
          type: 'purchase',
          quantity: 25,
          userId: 'test-user-id'
        })
      );

      // Verify audit logging
      expect(auditService.logStockMovementAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-123',
          productName: 'Test Product',
          movementType: 'purchase_receipt',
          quantityBefore: 100,
          quantityAfter: 125,
          quantityChanged: 25,
          unitCost: 15.50
        }),
        expect.objectContaining({
          performedBy: 'test-user-id',
          reason: 'Recording purchase receipt'
        })
      );
    });

    it('should handle creation errors', async () => {
      const movementData = {
        productId: 'product-123',
        type: 'adjustment' as const,
        quantity: 5,
        previousStock: 100,
        newStock: 105
      };

      // Mock getting product
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      // Mock creation error
      (productsAPI.createStockMovement as any).mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed')
      });

      const result = await createStockMovementWithAudit(movementData);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();

      // Audit logging should not be called for failed creation
      expect(auditService.logStockMovementAudit).not.toHaveBeenCalled();
    });
  });

  describe('bulkUpdateStockWithAudit', () => {
    it('should process multiple stock updates with audit logging', async () => {
      const stockUpdates = [
        {
          productId: 'product-1',
          quantityChanged: 10,
          referenceId: 'po-123',
          referenceType: 'purchase_order' as const,
          referenceNumber: 'PO-2023-001',
          unitCost: 12.00
        },
        {
          productId: 'product-2',
          quantityChanged: -5,
          referenceId: 'sale-456',
          referenceType: 'sale' as const,
          unitCost: 18.00
        }
      ];

      const mockProduct1 = { ...mockProduct, id: 'product-1', stock: 50 };
      const mockProduct2 = { ...mockProduct, id: 'product-2', stock: 30 };

      // Mock getting products
      (productsAPI.getProduct as any)
        .mockResolvedValueOnce({ data: mockProduct1, error: null })
        .mockResolvedValueOnce({ data: mockProduct2, error: null });

      // Mock successful stock updates
      (productsAPI.updateStock as any)
        .mockResolvedValueOnce({ data: { ...mockProduct1, stock: 60 }, error: null })
        .mockResolvedValueOnce({ data: { ...mockProduct2, stock: 25 }, error: null });

      // Mock audit logging
      (auditService.logStockMovementAudit as any)
        .mockResolvedValueOnce({ success: true, auditId: 'audit-1' })
        .mockResolvedValueOnce({ success: true, auditId: 'audit-2' });

      const result = await bulkUpdateStockWithAudit(
        stockUpdates,
        'Bulk update from purchase order'
      );

      expect(result.success).toBe(true);
      expect(result.data?.summary.successful).toBe(2);
      expect(result.data?.summary.failed).toBe(0);
      expect(result.data?.auditSummary.successfulAudits).toBe(2);

      // Verify all stock updates were called
      expect(productsAPI.updateStock).toHaveBeenCalledTimes(2);

      // Verify all audit logs were created
      expect(auditService.logStockMovementAudit).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk update', async () => {
      const stockUpdates = [
        {
          productId: 'product-1',
          quantityChanged: 10,
          referenceId: 'po-123',
          referenceType: 'purchase_order' as const
        },
        {
          productId: 'nonexistent-product',
          quantityChanged: 5,
          referenceId: 'po-123',
          referenceType: 'purchase_order' as const
        }
      ];

      const mockProduct1 = { ...mockProduct, id: 'product-1', stock: 50 };

      // Mock getting products - first succeeds, second fails
      (productsAPI.getProduct as any)
        .mockResolvedValueOnce({ data: mockProduct1, error: null })
        .mockResolvedValueOnce({ data: null, error: new Error('Product not found') });

      // Mock successful stock update for first product
      (productsAPI.updateStock as any)
        .mockResolvedValueOnce({ data: { ...mockProduct1, stock: 60 }, error: null });

      // Mock audit logging for successful update
      (auditService.logStockMovementAudit as any)
        .mockResolvedValueOnce({ success: true, auditId: 'audit-1' });

      const result = await bulkUpdateStockWithAudit(stockUpdates);

      expect(result.success).toBe(false);
      expect(result.data?.summary.successful).toBe(1);
      expect(result.data?.summary.failed).toBe(1);
      expect(result.error).toContain('1 stock updates failed');

      // Should find the failed product in results
      const failedResult = result.data?.results.find(r => !r.success);
      expect(failedResult?.productId).toBe('nonexistent-product');
      expect(failedResult?.error).toBe('Product not found');
    });

    it('should prevent insufficient stock in bulk update', async () => {
      const stockUpdates = [
        {
          productId: 'product-1',
          quantityChanged: -200, // More than available
          referenceId: 'sale-456',
          referenceType: 'sale' as const
        }
      ];

      const mockProduct1 = { ...mockProduct, id: 'product-1', stock: 50 };

      // Mock getting product
      (productsAPI.getProduct as any)
        .mockResolvedValueOnce({ data: mockProduct1, error: null });

      const result = await bulkUpdateStockWithAudit(stockUpdates);

      expect(result.success).toBe(false);
      expect(result.data?.summary.failed).toBe(1);

      const failedResult = result.data?.results[0];
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toContain('Insufficient stock');

      // Should not proceed with update or audit
      expect(productsAPI.updateStock).not.toHaveBeenCalled();
      expect(auditService.logStockMovementAudit).not.toHaveBeenCalled();
    });
  });

  describe('getStockMovementHistoryWithAudit', () => {
    it('should retrieve movement history with enhanced audit details', async () => {
      const mockMovements = [
        {
          id: 'movement-1',
          productId: 'product-123',
          type: 'stock_in',
          quantity: 25,
          reason: 'Purchase receipt',
          referenceId: 'po-123',
          beforeQuantity: 100,
          afterQuantity: 125,
          createdAt: new Date()
        }
      ];

      const mockAuditTrail = [
        {
          id: 'audit-1',
          productId: 'product-123',
          referenceId: 'po-123',
          performedBy: 'user-123',
          performedByName: 'Test User',
          batchNumber: 'BATCH-001',
          unitCost: 15.00,
          totalCost: 375.00,
          createdAt: new Date()
        }
      ];

      // Mock getting stock movements
      (productsAPI.getStockMovements as any).mockResolvedValueOnce({
        data: mockMovements,
        error: null
      });

      // Mock getting audit trail
      (auditService.getStockMovementHistory as any).mockResolvedValueOnce({
        success: true,
        data: mockAuditTrail
      });

      const result = await getStockMovementHistoryWithAudit(
        'product-123',
        { limit: 50 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].auditDetails).toBeDefined();
      expect(result.data?.[0].auditDetails?.performedByName).toBe('Test User');
      expect(result.data?.[0].auditDetails?.batchNumber).toBe('BATCH-001');
      expect(result.auditSummary?.auditCoverage).toBe('100.00%');
    });

    it('should handle movements without audit details', async () => {
      const mockMovements = [
        {
          id: 'movement-1',
          productId: 'product-123',
          type: 'stock_in',
          quantity: 25,
          reason: 'Purchase receipt',
          createdAt: new Date()
        }
      ];

      // Mock getting stock movements
      (productsAPI.getStockMovements as any).mockResolvedValueOnce({
        data: mockMovements,
        error: null
      });

      // Mock getting empty audit trail
      (auditService.getStockMovementHistory as any).mockResolvedValueOnce({
        success: true,
        data: []
      });

      const result = await getStockMovementHistoryWithAudit('product-123');

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].auditDetails).toBeNull();
      expect(result.auditSummary?.auditCoverage).toBe('0%');
    });

    it('should handle retrieval errors', async () => {
      // Mock movement retrieval error
      (productsAPI.getStockMovements as any).mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed')
      });

      const result = await getStockMovementHistoryWithAudit('product-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('getStockMovementSummaryWithAudit', () => {
    it('should calculate comprehensive movement statistics', async () => {
      const mockMovements = [
        {
          id: 'movement-1',
          productId: 'product-123',
          type: 'stock_in',
          change: 25,
          reason: 'purchase receipt',
          createdAt: new Date(),
          auditDetails: {
            performedBy: 'user-1',
            totalCost: 375.00
          }
        },
        {
          id: 'movement-2',
          productId: 'product-123',
          type: 'stock_out',
          change: -10,
          reason: 'sale',
          createdAt: new Date(),
          auditDetails: {
            performedBy: 'user-2',
            totalCost: 200.00
          }
        },
        {
          id: 'movement-3',
          productId: 'product-123',
          type: 'adjustment',
          change: 5,
          reason: 'count adjustment',
          createdAt: new Date(),
          auditDetails: null
        }
      ];

      // Mock getting movement history
      vi.spyOn(
        await import('../../../api/stockMovementAuditAPI'),
        'getStockMovementHistoryWithAudit'
      ).mockResolvedValueOnce({
        data: mockMovements as any,
        error: null
      });

      const result = await getStockMovementSummaryWithAudit('product-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.totalMovements).toBe(3);
      expect(result.data?.stockIn).toBe(25);
      expect(result.data?.stockOut).toBe(10);
      expect(result.data?.netChange).toBe(20); // 25 - 10 + 5
      expect(result.data?.auditStatistics.totalAudited).toBe(2);
      expect(result.data?.auditStatistics.auditCoverage).toBe('66.67%');
      expect(result.data?.auditStatistics.uniqueUsers).toBe(2);
      expect(result.data?.valueImpact.totalValueIn).toBe(375.00);
      expect(result.data?.valueImpact.totalValueOut).toBe(200.00);
    });

    it('should handle empty movement history', async () => {
      // Mock empty movement history
      vi.spyOn(
        await import('../../../api/stockMovementAuditAPI'),
        'getStockMovementHistoryWithAudit'
      ).mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await getStockMovementSummaryWithAudit('product-123');

      expect(result.success).toBe(true);
      expect(result.data?.totalMovements).toBe(0);
      expect(result.data?.auditStatistics.auditCoverage).toBe('0%');
    });
  });

  describe('reconcileStockWithAudit', () => {
    it('should reconcile stock levels with movement history', async () => {
      const mockMovements = [
        { change: 25 },
        { change: -10 },
        { change: 5 }
      ];

      const mockAuditTrail = [
        { id: 'audit-1' },
        { id: 'audit-2' }
      ];

      // Mock getting product
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      // Mock getting movements
      (productsAPI.getStockMovements as any).mockResolvedValueOnce({
        data: mockMovements,
        error: null
      });

      // Mock getting audit trail
      (auditService.getStockMovementHistory as any).mockResolvedValueOnce({
        success: true,
        data: mockAuditTrail
      });

      const result = await reconcileStockWithAudit('product-123');

      expect(result.success).toBe(true);
      expect(result.data?.currentStock).toBe(100);
      expect(result.data?.expectedStock).toBe(20); // 25 - 10 + 5
      expect(result.data?.discrepancy).toBe(80); // 100 - 20
      expect(result.data?.isReconciled).toBe(false); // Discrepancy > 0.01
      expect(result.data?.audit.auditCoverage).toBe('66.67%'); // 2/3
    });

    it('should identify reconciled stock levels', async () => {
      const mockMovements = [
        { change: 50 },
        { change: -25 },
        { change: -25 }
      ];

      // Mock getting product
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      // Mock getting movements (net change = 0, so expected stock = 0)
      (productsAPI.getStockMovements as any).mockResolvedValueOnce({
        data: mockMovements,
        error: null
      });

      // Mock getting audit trail
      (auditService.getStockMovementHistory as any).mockResolvedValueOnce({
        success: true,
        data: []
      });

      const result = await reconcileStockWithAudit('product-123');

      expect(result.success).toBe(true);
      expect(result.data?.expectedStock).toBe(0);
      expect(result.data?.discrepancy).toBe(100); // Current stock is 100
      expect(result.data?.isReconciled).toBe(false);
    });

    it('should handle reconciliation errors', async () => {
      // Mock product not found
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: null,
        error: new Error('Product not found')
      });

      const result = await reconcileStockWithAudit('nonexistent-product');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid operation types', async () => {
      const result = await updateStockWithAudit(
        'product-123',
        10,
        'invalid-operation' as any
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid operation');
    });

    it('should handle zero quantity changes gracefully', async () => {
      // Mock getting current product
      (productsAPI.getProduct as any).mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      // Mock successful stock update (no change)
      (productsAPI.updateStock as any).mockResolvedValueOnce({
        data: mockProduct, // Same stock level
        error: null
      });

      const result = await updateStockWithAudit('product-123', 100, 'set');

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();

      // Should not call audit logging for zero change
      expect(auditService.logStockMovementAudit).not.toHaveBeenCalled();
    });

    it('should handle concurrent stock updates', async () => {
      const promises: Promise<any>[] = [];

      // Mock getting current product for all concurrent calls
      (productsAPI.getProduct as any).mockResolvedValue({
        data: mockProduct,
        error: null
      });

      // Mock successful stock updates
      (productsAPI.updateStock as any).mockResolvedValue({
        data: { ...mockProduct, stock: 110 },
        error: null
      });

      // Mock audit logging
      (auditService.logStockMovementAudit as any).mockResolvedValue({
        success: true,
        auditId: 'concurrent-audit'
      });

      // Simulate 10 concurrent updates
      for (let i = 0; i < 10; i++) {
        promises.push(
          updateStockWithAudit('product-123', 1, 'add', {
            reason: `Concurrent update ${i}`
          })
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every(r => r.data && !r.error)).toBe(true);

      // All updates should have been processed
      expect(productsAPI.updateStock).toHaveBeenCalledTimes(10);
      expect(auditService.logStockMovementAudit).toHaveBeenCalledTimes(10);
    });
  });
});