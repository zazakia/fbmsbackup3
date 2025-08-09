import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { updateStock, getProductStock } from '../../../api/products';
import { PurchaseOrder, PurchaseOrderItem } from '../../../types/business';

// Mock the products API
vi.mock('../../../api/products', () => ({
  updateStock: vi.fn(),
  getProductStock: vi.fn()
}));

// Mock Supabase
vi.mock('../../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

// Mock getPurchaseOrder and updatePurchaseOrder functions
vi.mock('../../../api/purchases', async () => {
  const actual = await vi.importActual('../../../api/purchases');
  return {
    ...actual,
    getPurchaseOrder: vi.fn(),
    updatePurchaseOrder: vi.fn()
  };
});

const mockUpdateStock = vi.mocked(updateStock);
const mockGetProductStock = vi.mocked(getProductStock);

describe('Purchase Order Inventory Adjustment Accuracy', () => {
  let testPO: PurchaseOrder;
  let mockGetPurchaseOrder: any;
  let mockUpdatePurchaseOrder: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import mocked functions - we need to import after the mocks are set up
    const { getPurchaseOrder, updatePurchaseOrder } = await import('../../../api/purchases');
    mockGetPurchaseOrder = vi.mocked(getPurchaseOrder);
    mockUpdatePurchaseOrder = vi.mocked(updatePurchaseOrder);

    // Create test purchase order
    testPO = {
      id: 'po-test-123',
      poNumber: 'PO-2025-001',
      supplierId: 'supplier-1',
      supplierName: 'Test Supplier',
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          productName: 'Widget A',
          sku: 'WGT-A-001',
          quantity: 100,
          cost: 10.50,
          total: 1050
        },
        {
          id: 'item-2',
          productId: 'product-2',
          productName: 'Widget B',
          sku: 'WGT-B-001',
          quantity: 50,
          cost: 25.00,
          total: 1250
        }
      ],
      subtotal: 2300,
      tax: 276,
      total: 2576,
      status: 'sent',
      expectedDate: new Date('2025-01-15'),
      createdBy: 'user-1',
      createdAt: new Date('2025-01-01')
    };

    // Setup default mocks
    mockGetPurchaseOrder.mockResolvedValue({ data: testPO, error: null });
    mockUpdatePurchaseOrder.mockResolvedValue({ data: { ...testPO }, error: null });
    mockUpdateStock.mockResolvedValue({ data: true, error: null });
    mockGetProductStock.mockResolvedValue({ data: 0, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Idempotent Operations', () => {
    it('should prevent duplicate stock adjustments for same operation', async () => {
      // Setup PO with items already partially received
      const poWithPartialReceipt: PurchaseOrder = {
        ...testPO,
        items: testPO.items.map(item => ({
          ...item,
          receivedQuantity: item.quantity / 2 // 50% already received
        })) as PurchaseOrderItem[],
        status: 'partial'
      };
      
      mockGetPurchaseOrder.mockResolvedValue({ data: poWithPartialReceipt, error: null });

      // Try to receive the same items again
      const receivingItems = [
        { id: 'item-1', productId: 'product-1', quantity: 50 }, // Same as already received
        { id: 'item-2', productId: 'product-2', quantity: 25 }  // Same as already received
      ];

      const { receivePurchaseOrder } = await import('../../../api/purchases');
      const result = await receivePurchaseOrder('po-test-123', receivingItems);

      // Should succeed and only adjust inventory for the new delta (which is 0)
      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledTimes(2);
      
      // Check that the inventory adjustments are for the correct amounts (50 each)
      expect(mockUpdateStock).toHaveBeenCalledWith('product-1', 50, 'add', expect.any(Object));
      expect(mockUpdateStock).toHaveBeenCalledWith('product-2', 25, 'add', expect.any(Object));
    });

    it('should calculate correct deltas for partial receipts', async () => {
      // Setup PO with no prior receipts
      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 30 }, // Partial: 30/100
        { id: 'item-2', productId: 'product-2', quantity: 50 }  // Full: 50/50
      ]);

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledTimes(2);
      expect(mockUpdateStock).toHaveBeenCalledWith('product-1', 30, 'add', expect.any(Object));
      expect(mockUpdateStock).toHaveBeenCalledWith('product-2', 50, 'add', expect.any(Object));
    });

    it('should handle subsequent partial receipts correctly', async () => {
      // First partial receipt
      const poAfterFirstReceipt: PurchaseOrder = {
        ...testPO,
        items: [
          { ...testPO.items[0], receivedQuantity: 30 }, // 30/100 received
          { ...testPO.items[1], receivedQuantity: 25 }  // 25/50 received
        ] as PurchaseOrderItem[],
        status: 'partial'
      };

      mockGetPurchaseOrder.mockResolvedValue({ data: poAfterFirstReceipt, error: null });

      // Second partial receipt
      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 40 }, // Additional 40 (total 70/100)
        { id: 'item-2', productId: 'product-2', quantity: 25 }  // Additional 25 (total 50/50 = complete)
      ]);

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledTimes(2);
      expect(mockUpdateStock).toHaveBeenCalledWith('product-1', 40, 'add', expect.any(Object));
      expect(mockUpdateStock).toHaveBeenCalledWith('product-2', 25, 'add', expect.any(Object));
    });
  });

  describe('Error Handling and Rollback', () => {
    it('should rollback inventory changes if PO update fails', async () => {
      // Mock inventory updates to succeed but PO update to fail
      mockUpdateStock.mockResolvedValue({ data: true, error: null });
      mockUpdatePurchaseOrder.mockResolvedValue({ 
        data: null, 
        error: new Error('Database connection failed') 
      });

      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 50 }
      ]);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Database connection failed');
      
      // Should have called updateStock twice: once for the original update, once for rollback
      expect(mockUpdateStock).toHaveBeenCalledTimes(2);
      expect(mockUpdateStock).toHaveBeenNthCalledWith(1, 'product-1', 50, 'add', expect.any(Object));
      expect(mockUpdateStock).toHaveBeenNthCalledWith(2, 'product-1', 50, 'subtract', expect.any(Object));
    });

    it('should rollback partial inventory changes if later update fails', async () => {
      // Mock first inventory update to succeed, second to fail
      mockUpdateStock
        .mockResolvedValueOnce({ data: true, error: null })  // First product succeeds
        .mockResolvedValueOnce({ data: null, error: new Error('Product not found') }); // Second fails

      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 50 },
        { id: 'item-2', productId: 'product-2', quantity: 25 }
      ]);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Product not found');
      
      // Should have called updateStock 3 times: product-1 add, product-2 add (fails), product-1 rollback
      expect(mockUpdateStock).toHaveBeenCalledTimes(3);
      expect(mockUpdateStock).toHaveBeenNthCalledWith(3, 'product-1', 50, 'subtract', expect.any(Object));
    });

    it('should handle rollback failures gracefully', async () => {
      // Mock all operations to fail
      mockUpdateStock.mockResolvedValue({ data: null, error: new Error('Database error') });
      mockUpdatePurchaseOrder.mockResolvedValue({ 
        data: null, 
        error: new Error('PO update failed') 
      });

      // Mock console.error to avoid cluttering test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 50 }
      ]);

      expect(result.error).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalled(); // Should log rollback failures
      
      consoleSpy.mockRestore();
    });
  });

  describe('Input Validation', () => {
    it('should reject over-receiving beyond ordered quantities', async () => {
      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 150 } // Over 100 ordered
      ]);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Maximum receivable');
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });

    it('should reject negative quantities', async () => {
      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: -10 }
      ]);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Invalid received quantity');
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });

    it('should reject receiving for invalid PO status', async () => {
      const completedPO = { ...testPO, status: 'received' as const };
      mockGetPurchaseOrder.mockResolvedValue({ data: completedPO, error: null });

      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 50 }
      ]);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Cannot receive items for purchase order in status: received');
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });

    it('should reject empty receiving items when not in auto mode', async () => {
      const result = await receivePurchaseOrder('po-test-123', []);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('No quantities specified for receiving');
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });
  });

  describe('Status Transitions', () => {
    it('should set status to partial when some items remain', async () => {
      mockUpdatePurchaseOrder.mockImplementation(async (id, updates) => {
        expect(updates.status).toBe('partial');
        return { data: { ...testPO, ...updates }, error: null };
      });

      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 50 } // Only partial receipt
      ]);

      expect(result.error).toBeNull();
    });

    it('should set status to received when all items complete', async () => {
      mockUpdatePurchaseOrder.mockImplementation(async (id, updates) => {
        expect(updates.status).toBe('received');
        expect(updates.receivedDate).toBeInstanceOf(Date);
        return { data: { ...testPO, ...updates }, error: null };
      });

      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 100 },
        { id: 'item-2', productId: 'product-2', quantity: 50 }
      ]);

      expect(result.error).toBeNull();
    });

    it('should handle auto-receive mode correctly', async () => {
      mockUpdatePurchaseOrder.mockImplementation(async (id, updates) => {
        expect(updates.status).toBe('received');
        // Check that all items are fully received
        const items = updates.items as any[];
        expect(items[0].receivedQuantity).toBe(100);
        expect(items[1].receivedQuantity).toBe(50);
        return { data: { ...testPO, ...updates }, error: null };
      });

      // Auto mode: no receivedItems specified
      const result = await receivePurchaseOrder('po-test-123');

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledTimes(2);
      expect(mockUpdateStock).toHaveBeenCalledWith('product-1', 100, 'add', expect.any(Object));
      expect(mockUpdateStock).toHaveBeenCalledWith('product-2', 50, 'add', expect.any(Object));
    });
  });

  describe('Property Consistency', () => {
    it('should normalize receivedQty to receivedQuantity consistently', async () => {
      // PO with legacy receivedQty properties
      const legacyPO = {
        ...testPO,
        items: testPO.items.map(item => ({
          ...item,
          receivedQty: 10 // Legacy property
        }))
      };
      
      mockGetPurchaseOrder.mockResolvedValue({ data: legacyPO as any, error: null });
      
      mockUpdatePurchaseOrder.mockImplementation(async (id, updates) => {
        const items = updates.items as any[];
        // Should use receivedQuantity and clear receivedQty
        items.forEach(item => {
          expect(item.receivedQuantity).toBeDefined();
          expect(item.receivedQty).toBeUndefined();
        });
        return { data: { ...testPO, ...updates }, error: null };
      });

      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 20 }
      ]);

      expect(result.error).toBeNull();
    });

    it('should maintain data integrity across partial receipts', async () => {
      const poWithMixedData = {
        ...testPO,
        items: [
          { ...testPO.items[0], receivedQuantity: 25 }, // New property
          { ...testPO.items[1], receivedQty: 15 } as any // Legacy property
        ]
      };
      
      mockGetPurchaseOrder.mockResolvedValue({ data: poWithMixedData as any, error: null });

      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 30 }, // 25 + 30 = 55 total
        { id: 'item-2', productId: 'product-2', quantity: 20 }  // 15 + 20 = 35 total
      ]);

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledWith('product-1', 30, 'add', expect.any(Object));
      expect(mockUpdateStock).toHaveBeenCalledWith('product-2', 20, 'add', expect.any(Object));
    });
  });

  describe('Context and Audit Trail', () => {
    it('should include receiving context in inventory updates', async () => {
      const context = {
        receivedBy: 'user-123',
        reason: 'Scheduled delivery',
        timestamp: new Date('2025-01-15T10:00:00Z')
      };

      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 50 }
      ], context);

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledWith(
        'product-1',
        50,
        'add',
        {
          referenceId: 'po-test-123',
          userId: 'user-123',
          reason: 'Scheduled delivery'
        }
      );
    });

    it('should use default context when none provided', async () => {
      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 50 }
      ]);

      expect(result.error).toBeNull();
      expect(mockUpdateStock).toHaveBeenCalledWith(
        'product-1',
        50,
        'add',
        {
          referenceId: 'po-test-123',
          userId: 'user-1', // From PO createdBy
          reason: 'Purchase Order Receipt'
        }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle PO with no items gracefully', async () => {
      const emptyPO = { ...testPO, items: [] };
      mockGetPurchaseOrder.mockResolvedValue({ data: emptyPO, error: null });

      const result = await receivePurchaseOrder('po-test-123');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('no items to receive');
    });

    it('should handle missing product IDs', async () => {
      const invalidPO = {
        ...testPO,
        items: [
          { ...testPO.items[0], productId: '' }, // Empty productId
          { ...testPO.items[1], productId: null as any } // Null productId
        ]
      };
      mockGetPurchaseOrder.mockResolvedValue({ data: invalidPO, error: null });

      const result = await receivePurchaseOrder('po-test-123');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('missing productId');
    });

    it('should handle zero quantities correctly', async () => {
      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 0 }
      ]);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Invalid received quantity');
    });

    it('should not make inventory adjustments when no actual changes', async () => {
      // PO already fully received
      const fullyReceivedPO = {
        ...testPO,
        items: testPO.items.map(item => ({
          ...item,
          receivedQuantity: item.quantity // Already fully received
        })),
        status: 'received' as const
      };
      
      mockGetPurchaseOrder.mockResolvedValue({ data: fullyReceivedPO, error: null });

      const result = await receivePurchaseOrder('po-test-123', [
        { id: 'item-1', productId: 'product-1', quantity: 0 }
      ]);

      // Should reject due to invalid status, not due to zero quantities
      expect(result.error).toBeTruthy();
      expect(mockUpdateStock).not.toHaveBeenCalled();
    });
  });
});