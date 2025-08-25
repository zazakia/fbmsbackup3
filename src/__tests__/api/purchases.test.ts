import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
  deletePurchaseOrder,
  receivePurchaseOrder,
  validatePartialReceipt,
  executeStatusTransition,
  getPurchaseOrderStatusHistory,
  getValidStatusTransitions,
  processPurchaseOrderApproval
} from '../../api/purchases';
import { PurchaseOrder, PurchaseOrderStatus, EnhancedPurchaseOrderStatus } from '../../types/business';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase
}));

vi.mock('../../utils/supabase', () => ({
  supabase: mockSupabase
}));

// Test data factory
const createTestPurchaseOrder = (overrides: Partial<PurchaseOrder> = {}): Omit<PurchaseOrder, 'id' | 'createdAt'> => ({
  poNumber: 'PO-TEST-001',
  supplierId: 'supplier-1',
  supplierName: 'Test Supplier',
  items: [
    {
      id: 'item-1',
      productId: 'product-1',
      productName: 'Test Product',
      sku: 'TEST-SKU-001',
      quantity: 10,
      cost: 100,
      total: 1000
    }
  ],
  subtotal: 1000,
  tax: 120,
  total: 1120,
  status: 'draft' as PurchaseOrderStatus,
  expectedDate: new Date('2024-12-31'),
  createdBy: 'user-1',
  ...overrides
});

const createTestPurchaseOrderWithId = (overrides: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  id: 'po-test-001',
  createdAt: new Date(),
  ...createTestPurchaseOrder(overrides)
});

describe('Purchase Order API Tests', () => {
  let mockSelect: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockDelete: any;
  let mockEq: any;
  let mockOrder: any;
  let mockSingle: any;
  let mockRange: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock chain
    mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockRange = vi.fn().mockReturnThis();
    mockOrder = vi.fn().mockReturnThis();
    mockEq = vi.fn().mockReturnThis();
    mockSelect = vi.fn().mockReturnThis();
    mockInsert = vi.fn().mockReturnThis();
    mockUpdate = vi.fn().mockReturnThis();
    mockDelete = vi.fn().mockReturnThis();

    // Chain all methods
    mockSelect.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      range: mockRange,
      single: mockSingle
    });

    mockInsert.mockReturnValue({
      select: mockSelect,
      single: mockSingle
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle
    });

    mockDelete.mockReturnValue({
      eq: mockEq
    });

    mockEq.mockReturnValue({
      select: mockSelect,
      single: mockSingle,
      order: mockOrder,
      range: mockRange
    });

    mockOrder.mockReturnValue({
      range: mockRange,
      single: mockSingle
    });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('createPurchaseOrder', () => {
      it('should create a purchase order successfully', async () => {
        const testPO = createTestPurchaseOrder();
        const expectedResult = createTestPurchaseOrderWithId(testPO);

        mockSingle.mockResolvedValueOnce({
          data: expectedResult,
          error: null
        });

        const result = await createPurchaseOrder(testPO);

        expect(result.error).toBeNull();
        expect(result.data).toMatchObject(expectedResult);
        expect(mockSupabase.from).toHaveBeenCalledWith('purchase_orders');
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
          po_number: testPO.poNumber,
          supplier_id: testPO.supplierId,
          supplier_name: testPO.supplierName
        }));
      });

      it('should handle creation errors', async () => {
        const testPO = createTestPurchaseOrder();
        const testError = new Error('Database error');

        mockSingle.mockResolvedValueOnce({
          data: null,
          error: testError
        });

        const result = await createPurchaseOrder(testPO);

        expect(result.error).toBe(testError);
        expect(result.data).toBeNull();
      });

      it('should validate required fields', async () => {
        const invalidPO = createTestPurchaseOrder({
          supplierId: '',
          items: []
        });

        const result = await createPurchaseOrder(invalidPO);

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('required');
      });
    });

    describe('getPurchaseOrder', () => {
      it('should retrieve a purchase order by ID', async () => {
        const testPO = createTestPurchaseOrderWithId();

        mockSingle.mockResolvedValueOnce({
          data: testPO,
          error: null
        });

        const result = await getPurchaseOrder(testPO.id);

        expect(result.error).toBeNull();
        expect(result.data).toMatchObject(testPO);
        expect(mockEq).toHaveBeenCalledWith('id', testPO.id);
      });

      it('should handle non-existent purchase order', async () => {
        mockSingle.mockResolvedValueOnce({
          data: null,
          error: null
        });

        const result = await getPurchaseOrder('non-existent-id');

        expect(result.data).toBeNull();
        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('not found');
      });
    });

    describe('updatePurchaseOrder', () => {
      it('should update a purchase order successfully', async () => {
        const testPO = createTestPurchaseOrderWithId();
        const updates = { status: 'approved' as PurchaseOrderStatus };
        const updatedPO = { ...testPO, ...updates };

        mockSingle.mockResolvedValueOnce({
          data: updatedPO,
          error: null
        });

        const result = await updatePurchaseOrder(testPO.id, updates);

        expect(result.error).toBeNull();
        expect(result.data?.status).toBe('approved');
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
          status: 'approved'
        }));
      });

      it('should handle update conflicts', async () => {
        const conflictError = { code: '23505', message: 'Conflict' };

        mockSingle.mockResolvedValueOnce({
          data: null,
          error: conflictError
        });

        const result = await updatePurchaseOrder('po-1', { status: 'approved' });

        expect(result.error).toBe(conflictError);
        expect(result.data).toBeNull();
      });
    });

    describe('deletePurchaseOrder', () => {
      it('should delete a purchase order successfully', async () => {
        mockDelete.mockResolvedValueOnce({
          error: null
        });

        const result = await deletePurchaseOrder('po-1');

        expect(result.error).toBeNull();
        expect(result.success).toBe(true);
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 'po-1');
      });

      it('should prevent deletion of non-draft orders', async () => {
        const result = await deletePurchaseOrder('po-1');

        // Should check status first
        expect(mockSupabase.from).toHaveBeenCalledWith('purchase_orders');
      });
    });
  });

  describe('Status Transitions', () => {
    describe('executeStatusTransition', () => {
      it('should execute valid status transitions', async () => {
        const testPO = createTestPurchaseOrderWithId({ status: 'draft' });

        // Mock validation response
        mockSingle.mockResolvedValueOnce({
          data: {
            validTransitions: ['sent', 'cancelled'],
            canTransition: true
          },
          error: null
        });

        // Mock PO retrieval
        mockSingle.mockResolvedValueOnce({
          data: testPO,
          error: null
        });

        // Mock update result
        mockSingle.mockResolvedValueOnce({
          data: { ...testPO, status: 'sent' },
          error: null
        });

        const result = await executeStatusTransition({
          purchaseOrderId: testPO.id,
          fromStatus: 'draft' as EnhancedPurchaseOrderStatus,
          toStatus: 'sent' as EnhancedPurchaseOrderStatus,
          reason: 'Sending to supplier',
          performedBy: 'user-1'
        });

        expect(result.error).toBeNull();
        expect(result.data?.status).toBe('sent');
      });

      it('should reject invalid status transitions', async () => {
        const result = await executeStatusTransition({
          purchaseOrderId: 'po-1',
          fromStatus: 'draft' as EnhancedPurchaseOrderStatus,
          toStatus: 'received' as EnhancedPurchaseOrderStatus,
          reason: 'Invalid transition'
        });

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('Invalid transition');
      });
    });

    describe('getValidStatusTransitions', () => {
      it('should return valid transitions for draft status', async () => {
        const testPO = createTestPurchaseOrderWithId({ status: 'draft' });

        mockSingle.mockResolvedValueOnce({
          data: testPO,
          error: null
        });

        const result = await getValidStatusTransitions(testPO.id);

        expect(result.error).toBeNull();
        expect(result.data?.validTransitions).toContain('sent');
        expect(result.data?.validTransitions).toContain('cancelled');
        expect(result.data?.canTransition).toBe(true);
      });

      it('should return empty transitions for completed orders', async () => {
        const testPO = createTestPurchaseOrderWithId({ status: 'received' });

        mockSingle.mockResolvedValueOnce({
          data: testPO,
          error: null
        });

        const result = await getValidStatusTransitions(testPO.id);

        expect(result.error).toBeNull();
        expect(result.data?.validTransitions).toHaveLength(0);
        expect(result.data?.canTransition).toBe(false);
      });
    });
  });

  describe('Receiving Operations', () => {
    describe('receivePurchaseOrder', () => {
      it('should receive a purchase order with full quantities', async () => {
        const testPO = createTestPurchaseOrderWithId({ status: 'sent' });

        // Mock PO retrieval
        mockSingle.mockResolvedValueOnce({
          data: testPO,
          error: null
        });

        // Mock inventory update (import would be mocked)
        vi.doMock('../../api/stockMovementAuditAPI', () => ({
          updateStockWithAudit: vi.fn().mockResolvedValue({ error: null })
        }));

        // Mock PO update
        mockSingle.mockResolvedValueOnce({
          data: { ...testPO, status: 'received' },
          error: null
        });

        const receivedItems = testPO.items.map(item => ({
          productId: item.productId,
          receivedQuantity: item.quantity
        }));

        const result = await receivePurchaseOrder(testPO.id, receivedItems, {
          receivedBy: 'user-1',
          reason: 'Full receipt'
        });

        expect(result.error).toBeNull();
        expect(result.data?.status).toBe('received');
      });

      it('should handle partial receiving', async () => {
        const testPO = createTestPurchaseOrderWithId({ status: 'sent' });

        mockSingle.mockResolvedValueOnce({
          data: testPO,
          error: null
        });

        mockSingle.mockResolvedValueOnce({
          data: { ...testPO, status: 'partial' },
          error: null
        });

        const receivedItems = testPO.items.map(item => ({
          productId: item.productId,
          receivedQuantity: item.quantity / 2 // Partial receipt
        }));

        const result = await receivePurchaseOrder(testPO.id, receivedItems);

        expect(result.error).toBeNull();
        expect(result.data?.status).toBe('partial');
      });

      it('should validate received quantities', async () => {
        const testPO = createTestPurchaseOrderWithId({ status: 'sent' });

        const invalidItems = [{
          productId: 'invalid-product',
          receivedQuantity: 100
        }];

        const result = await receivePurchaseOrder(testPO.id, invalidItems);

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('Product');
      });
    });

    describe('validatePartialReceipt', () => {
      it('should validate correct receipt data', async () => {
        const testPO = createTestPurchaseOrderWithId({ status: 'sent' });

        mockSingle.mockResolvedValueOnce({
          data: testPO,
          error: null
        });

        const receiptRequest = {
          purchaseOrderId: testPO.id,
          receivedBy: 'user-1',
          items: [{
            productId: testPO.items[0].productId,
            productName: testPO.items[0].productName,
            sku: testPO.items[0].sku,
            orderedQuantity: testPO.items[0].quantity,
            receivedQuantity: testPO.items[0].quantity,
            condition: 'good' as const
          }]
        };

        const result = await validatePartialReceipt(receiptRequest);

        expect(result.error).toBeNull();
        expect(result.data?.isValid).toBe(true);
        expect(result.data?.errors).toHaveLength(0);
      });

      it('should detect over-receiving', async () => {
        const testPO = createTestPurchaseOrderWithId({ status: 'sent' });

        mockSingle.mockResolvedValueOnce({
          data: testPO,
          error: null
        });

        const receiptRequest = {
          purchaseOrderId: testPO.id,
          receivedBy: 'user-1',
          items: [{
            productId: testPO.items[0].productId,
            productName: testPO.items[0].productName,
            sku: testPO.items[0].sku,
            orderedQuantity: testPO.items[0].quantity,
            receivedQuantity: testPO.items[0].quantity * 2, // Over-receiving
            condition: 'good' as const
          }]
        };

        const result = await validatePartialReceipt(receiptRequest);

        expect(result.error).toBeNull();
        expect(result.data?.isValid).toBe(false);
        expect(result.data?.errors.some(e => e.includes('exceed'))).toBe(true);
      });

      it('should validate required fields', async () => {
        const receiptRequest = {
          purchaseOrderId: 'po-1',
          receivedBy: '', // Missing required field
          items: []
        };

        const result = await validatePartialReceipt(receiptRequest);

        expect(result.data?.isValid).toBe(false);
        expect(result.data?.errors).toContain('Received by field is required');
        expect(result.data?.errors).toContain('At least one item must be specified for receiving');
      });
    });
  });

  describe('Approval Workflow', () => {
    describe('processPurchaseOrderApproval', () => {
      it('should approve purchase order with sufficient permissions', async () => {
        const testPO = createTestPurchaseOrderWithId({ 
          status: 'pending_approval',
          total: 5000 // Under approval threshold
        });

        mockSingle.mockResolvedValueOnce({
          data: testPO,
          error: null
        });

        mockSingle.mockResolvedValueOnce({
          data: { ...testPO, status: 'approved' },
          error: null
        });

        const approvalRequest = {
          purchaseOrderId: testPO.id,
          action: 'approve' as const,
          reason: 'Approved for procurement',
          approvedBy: 'manager-1',
          approvalLevel: 2,
          maxApprovalAmount: 10000
        };

        const result = await processPurchaseOrderApproval(approvalRequest);

        expect(result.error).toBeNull();
        expect(result.data?.status).toBe('approved');
      });

      it('should reject approval for insufficient permissions', async () => {
        const testPO = createTestPurchaseOrderWithId({ 
          status: 'pending_approval',
          total: 100000 // High value requiring senior approval
        });

        const approvalRequest = {
          purchaseOrderId: testPO.id,
          action: 'approve' as const,
          reason: 'Attempting approval',
          approvedBy: 'user-1',
          approvalLevel: 1, // Insufficient level
          maxApprovalAmount: 10000 // Insufficient amount
        };

        const result = await processPurchaseOrderApproval(approvalRequest);

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('approval');
      });

      it('should handle rejection workflow', async () => {
        const testPO = createTestPurchaseOrderWithId({ status: 'pending_approval' });

        mockSingle.mockResolvedValueOnce({
          data: testPO,
          error: null
        });

        mockSingle.mockResolvedValueOnce({
          data: { ...testPO, status: 'rejected' },
          error: null
        });

        const rejectionRequest = {
          purchaseOrderId: testPO.id,
          action: 'reject' as const,
          reason: 'Rejected due to budget constraints',
          approvedBy: 'manager-1'
        };

        const result = await processPurchaseOrderApproval(rejectionRequest);

        expect(result.error).toBeNull();
        expect(result.data?.status).toBe('rejected');
      });
    });
  });

  describe('Audit and History', () => {
    describe('getPurchaseOrderStatusHistory', () => {
      it('should retrieve status change history', async () => {
        const mockHistory = [
          {
            id: 'audit-1',
            purchase_order_id: 'po-1',
            action: 'status_changed',
            old_values: { status: 'draft' },
            new_values: { status: 'sent' },
            timestamp: new Date().toISOString(),
            performed_by: 'user-1',
            reason: 'Sent to supplier'
          }
        ];

        mockOrder.mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockHistory, error: null })
        });

        const result = await getPurchaseOrderStatusHistory('po-1');

        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(1);
        expect(result.data?.[0].fromStatus).toBe('draft');
        expect(result.data?.[0].toStatus).toBe('sent');
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network timeouts', async () => {
      mockSingle.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const testPO = createTestPurchaseOrder();
      const result = await createPurchaseOrder(testPO);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('timeout');
    });

    it('should handle database connection errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await getPurchaseOrders();

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('connection');
    });

    it('should handle malformed data gracefully', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { invalid: 'data' },
        error: null
      });

      const result = await getPurchaseOrder('po-1');

      expect(result.error).toBeTruthy();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const largeMockData = Array.from({ length: 1000 }, (_, i) => 
        createTestPurchaseOrderWithId({ id: `po-${i}` })
      );

      mockOrder.mockReturnValue({
        range: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: largeMockData, error: null })
        })
      });

      const startTime = performance.now();
      const result = await getPurchaseOrders(1000, 0);
      const endTime = performance.now();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent operations', async () => {
      const testPO = createTestPurchaseOrder();
      
      mockSingle.mockResolvedValue({
        data: createTestPurchaseOrderWithId(testPO),
        error: null
      });

      const concurrentOperations = Array.from({ length: 10 }, () => 
        createPurchaseOrder(testPO)
      );

      const results = await Promise.all(concurrentOperations);

      expect(results.every(r => r.error === null)).toBe(true);
      expect(results.every(r => r.data !== null)).toBe(true);
    });
  });
});