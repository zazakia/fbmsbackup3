import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PurchaseOrder, PurchaseOrderItem } from '../../../types/business';

// Mock the entire purchases module
vi.mock('../../../api/purchases', () => ({
  getPurchaseOrder: vi.fn(),
  updatePurchaseOrder: vi.fn(),
  receivePurchaseOrder: vi.fn()
}));

// Mock products module
vi.mock('../../../api/products', () => ({
  updateStock: vi.fn()
}));

describe('Purchase Order Receiving Logic - Unit Tests', () => {
  let mockGetPurchaseOrder: any;
  let mockUpdatePurchaseOrder: any;
  let mockUpdateStock: any;
  let receivePurchaseOrder: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Re-import the actual implementation
    const actualPurchases = await vi.importActual('../../../api/purchases');
    receivePurchaseOrder = (actualPurchases as any).receivePurchaseOrder;
    
    const purchases = await import('../../../api/purchases');
    const products = await import('../../../api/products');
    
    mockGetPurchaseOrder = vi.mocked(purchases.getPurchaseOrder);
    mockUpdatePurchaseOrder = vi.mocked(purchases.updatePurchaseOrder);
    mockUpdateStock = vi.mocked(products.updateStock);

    // Setup default successful mocks
    mockUpdateStock.mockResolvedValue({ data: true, error: null });
    mockUpdatePurchaseOrder.mockResolvedValue({ 
      data: { id: 'po-123', status: 'received' }, 
      error: null 
    });
  });

  describe('Input Validation', () => {
    it('should reject over-receiving beyond ordered quantities', async () => {
      const testPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000
          }
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'sent',
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: testPO, error: null });

      // Try to receive more than ordered
      const result = await receivePurchaseOrder('po-123', [
        { id: 'item-1', productId: 'product-1', quantity: 150 } // Over 100 ordered
      ]);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Maximum receivable');
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });

    it('should reject negative quantities', async () => {
      const testPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000
          }
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'sent',
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: testPO, error: null });

      const result = await receivePurchaseOrder('po-123', [
        { id: 'item-1', productId: 'product-1', quantity: -10 }
      ]);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Invalid received quantity');
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });

    it('should reject receiving for completed orders', async () => {
      const completedPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000
          }
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'received', // Already completed
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: completedPO, error: null });

      const result = await receivePurchaseOrder('po-123', [
        { id: 'item-1', productId: 'product-1', quantity: 50 }
      ]);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Cannot receive items for purchase order in status: received');
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });
  });

  describe('Partial Receipts Logic', () => {
    it('should calculate correct deltas for partial receipts', async () => {
      const testPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000
          } as PurchaseOrderItem,
          {
            id: 'item-2',
            productId: 'product-2',
            productName: 'Widget B',
            sku: 'WGT-B-001',
            quantity: 50,
            cost: 20,
            total: 1000
          } as PurchaseOrderItem
        ],
        subtotal: 2000,
        tax: 240,
        total: 2240,
        status: 'sent',
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: testPO, error: null });

      const result = await receivePurchaseOrder('po-123', [
        { id: 'item-1', productId: 'product-1', quantity: 30 }, // Partial: 30/100
        { id: 'item-2', productId: 'product-2', quantity: 50 }  // Full: 50/50
      ]);

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledTimes(2);
      expect(mockUpdateStock).toHaveBeenCalledWith('product-1', 30, 'add', expect.any(Object));
      expect(mockUpdateStock).toHaveBeenCalledWith('product-2', 50, 'add', expect.any(Object));
    });

    it('should handle subsequent partial receipts correctly', async () => {
      // PO with some items already partially received
      const partiallyReceivedPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000,
            receivedQuantity: 30 // 30 already received
          } as PurchaseOrderItem & { receivedQuantity: number },
          {
            id: 'item-2',
            productId: 'product-2',
            productName: 'Widget B',
            sku: 'WGT-B-001',
            quantity: 50,
            cost: 20,
            total: 1000,
            receivedQuantity: 25 // 25 already received
          } as PurchaseOrderItem & { receivedQuantity: number }
        ],
        subtotal: 2000,
        tax: 240,
        total: 2240,
        status: 'partial',
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: partiallyReceivedPO, error: null });

      // Second partial receipt
      const result = await receivePurchaseOrder('po-123', [
        { id: 'item-1', productId: 'product-1', quantity: 40 }, // Additional 40 (total 70/100)
        { id: 'item-2', productId: 'product-2', quantity: 25 }  // Additional 25 (total 50/50 = complete)
      ]);

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledTimes(2);
      expect(mockUpdateStock).toHaveBeenCalledWith('product-1', 40, 'add', expect.any(Object));
      expect(mockUpdateStock).toHaveBeenCalledWith('product-2', 25, 'add', expect.any(Object));
    });
  });

  describe('Property Consistency', () => {
    it('should normalize legacy receivedQty to receivedQuantity', async () => {
      // PO with legacy receivedQty properties
      const legacyPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000,
            receivedQty: 10 // Legacy property
          } as any
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'partial',
        createdBy: 'user-1',
        createdAt: new Date()
      };
      
      mockGetPurchaseOrder.mockResolvedValue({ data: legacyPO, error: null });
      
      // Mock updatePurchaseOrder to capture the normalized items
      mockUpdatePurchaseOrder.mockImplementation(async (id, updates) => {
        const items = updates.items as any[];
        // Should use receivedQuantity and clear receivedQty
        items.forEach(item => {
          expect(item.receivedQuantity).toBeDefined();
          expect(item.receivedQty).toBeUndefined();
        });
        return { data: { ...legacyPO, ...updates }, error: null };
      });

      const result = await receivePurchaseOrder('po-123', [
        { id: 'item-1', productId: 'product-1', quantity: 20 } // 10 + 20 = 30 total
      ]);

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledWith('product-1', 20, 'add', expect.any(Object));
    });
  });

  describe('Status Transitions', () => {
    it('should set status to partial when some items remain', async () => {
      const testPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000
          } as PurchaseOrderItem
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'sent',
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: testPO, error: null });
      
      // Mock to verify status change
      mockUpdatePurchaseOrder.mockImplementation(async (id, updates) => {
        expect(updates.status).toBe('partial');
        expect(updates.receivedDate).toBeUndefined(); // Should not set received date for partial
        return { data: { ...testPO, ...updates }, error: null };
      });

      const result = await receivePurchaseOrder('po-123', [
        { id: 'item-1', productId: 'product-1', quantity: 50 } // Only partial receipt: 50/100
      ]);

      expect(result.error).toBeNull();
    });

    it('should set status to received when all items complete', async () => {
      const testPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000
          } as PurchaseOrderItem,
          {
            id: 'item-2',
            productId: 'product-2',
            productName: 'Widget B',
            sku: 'WGT-B-001',
            quantity: 50,
            cost: 20,
            total: 1000
          } as PurchaseOrderItem
        ],
        subtotal: 2000,
        tax: 240,
        total: 2240,
        status: 'sent',
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: testPO, error: null });
      
      // Mock to verify status change
      mockUpdatePurchaseOrder.mockImplementation(async (id, updates) => {
        expect(updates.status).toBe('received');
        expect(updates.receivedDate).toBeInstanceOf(Date);
        return { data: { ...testPO, ...updates }, error: null };
      });

      const result = await receivePurchaseOrder('po-123', [
        { id: 'item-1', productId: 'product-1', quantity: 100 }, // Full receipt
        { id: 'item-2', productId: 'product-2', quantity: 50 }   // Full receipt
      ]);

      expect(result.error).toBeNull();
    });
  });

  describe('Auto-receive Mode', () => {
    it('should receive all remaining quantities in auto mode', async () => {
      const testPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000
          } as PurchaseOrderItem,
          {
            id: 'item-2',
            productId: 'product-2',
            productName: 'Widget B',
            sku: 'WGT-B-001',
            quantity: 50,
            cost: 20,
            total: 1000
          } as PurchaseOrderItem
        ],
        subtotal: 2000,
        tax: 240,
        total: 2240,
        status: 'sent',
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: testPO, error: null });
      
      mockUpdatePurchaseOrder.mockImplementation(async (id, updates) => {
        expect(updates.status).toBe('received');
        // Check that all items are fully received
        const items = updates.items as any[];
        expect(items[0].receivedQuantity).toBe(100);
        expect(items[1].receivedQuantity).toBe(50);
        return { data: { ...testPO, ...updates }, error: null };
      });

      // Auto mode: no receivedItems specified
      const result = await receivePurchaseOrder('po-123');

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledTimes(2);
      expect(mockUpdateStock).toHaveBeenCalledWith('product-1', 100, 'add', expect.any(Object));
      expect(mockUpdateStock).toHaveBeenCalledWith('product-2', 50, 'add', expect.any(Object));
    });
  });

  describe('Context Tracking', () => {
    it('should include receiving context in inventory updates', async () => {
      const testPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000
          } as PurchaseOrderItem
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'sent',
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: testPO, error: null });

      const context = {
        receivedBy: 'user-123',
        reason: 'Scheduled delivery',
        timestamp: new Date('2025-01-15T10:00:00Z')
      };

      const result = await receivePurchaseOrder('po-123', [
        { id: 'item-1', productId: 'product-1', quantity: 50 }
      ], context);

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledWith(
        'product-1',
        50,
        'add',
        {
          referenceId: 'po-123',
          userId: 'user-123',
          reason: 'Scheduled delivery'
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should return error for non-existent PO', async () => {
      mockGetPurchaseOrder.mockResolvedValue({ 
        data: null, 
        error: new Error('Purchase order not found') 
      });

      const result = await receivePurchaseOrder('po-nonexistent');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Purchase order not found');
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });

    it('should handle zero quantities correctly', async () => {
      const testPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000
          } as PurchaseOrderItem
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'sent',
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: testPO, error: null });

      const result = await receivePurchaseOrder('po-123', [
        { id: 'item-1', productId: 'product-1', quantity: 0 }
      ]);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Invalid received quantity');
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });

    it('should reject empty items list in explicit mode', async () => {
      const testPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-001',
        supplierId: 'supplier-1',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'Widget A',
            sku: 'WGT-A-001',
            quantity: 100,
            cost: 10,
            total: 1000
          } as PurchaseOrderItem
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'sent',
        createdBy: 'user-1',
        createdAt: new Date()
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: testPO, error: null });

      const result = await receivePurchaseOrder('po-123', []); // Empty array

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('No quantities specified for receiving');
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });
  });
});