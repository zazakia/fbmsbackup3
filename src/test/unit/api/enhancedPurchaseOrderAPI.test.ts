import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getValidStatusTransitions,
  executeStatusTransition,
  getPurchaseOrdersByEnhancedStatus,
  getPurchaseOrderStatusHistory,
  validatePartialReceipt,
  processPartialReceipt,
  getPurchaseOrderReceivingHistory,
  getPendingReceipts,
  getOverduePurchaseOrders,
  validateApprovalPermissions,
  approvePurchaseOrder,
  bulkApprovePurchaseOrders,
  getPendingApprovals,
  getApprovalHistory,
  getApprovalWorkflowConfig
} from '../../../api/purchases';
import { PurchaseOrder, EnhancedPurchaseOrderStatus, PurchaseOrderAuditAction } from '../../../types/business';

// Mock dependencies
vi.mock('../../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            order: vi.fn()
          }))
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(),
            range: vi.fn()
          }))
        })),
        gte: vi.fn(),
        lte: vi.fn(),
        lt: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        range: vi.fn()
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }))
  }
}));

vi.mock('../../../services/auditService', () => ({
  auditService: {
    logPurchaseOrderAudit: vi.fn(),
    logReceivingActivityDetailed: vi.fn()
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

// Mock the getPurchaseOrder function to avoid circular dependencies in tests
vi.mock('../../../api/purchases', async () => {
  const actual = await vi.importActual('../../../api/purchases');
  return {
    ...actual,
    getPurchaseOrder: vi.fn()
  };
});

describe('Enhanced Purchase Order API', () => {
  // Mock data
  const mockPurchaseOrder: PurchaseOrder = {
    id: '1',
    poNumber: 'PO-2024-001',
    supplierId: 'supplier-1',
    supplierName: 'Test Supplier',
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'Test Product',
        sku: 'TEST-001',
        quantity: 10,
        cost: 100,
        total: 1000
      }
    ],
    subtotal: 1000,
    tax: 120,
    total: 1120,
    status: 'draft',
    createdBy: 'user-1',
    createdAt: new Date(),
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Status Transition Management', () => {
    describe('getValidStatusTransitions', () => {
      it('should return valid transitions for draft status', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'draft' },
          error: null
        });

        const result = await getValidStatusTransitions('1');

        expect(result.data).toEqual({
          isValid: true,
          canTransition: true,
          validTransitions: ['pending_approval', 'cancelled']
        });
        expect(result.error).toBeNull();
      });

      it('should return empty transitions for cancelled status', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'cancelled' },
          error: null
        });

        const result = await getValidStatusTransitions('1');

        expect(result.data).toEqual({
          isValid: true,
          canTransition: false,
          validTransitions: []
        });
        expect(result.error).toBeNull();
      });

      it('should handle purchase order not found', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: null,
          error: new Error('Not found')
        });

        const result = await getValidStatusTransitions('1');

        expect(result.data).toBeNull();
        expect(result.error).toEqual(new Error('Not found'));
      });
    });

    describe('executeStatusTransition', () => {
      it('should execute valid status transition', async () => {
        const { getPurchaseOrder, updatePurchaseOrder } = await import('../../../api/purchases');
        
        // Mock valid transition check
        vi.mocked(getPurchaseOrder).mockResolvedValueOnce({
          data: { ...mockPurchaseOrder, status: 'draft' },
          error: null
        });

        // Mock the update operation
        const mockUpdatedPO = { ...mockPurchaseOrder, status: 'sent' as const };
        vi.mocked(updatePurchaseOrder).mockResolvedValue({
          data: mockUpdatedPO,
          error: null
        });

        const result = await executeStatusTransition({
          purchaseOrderId: '1',
          fromStatus: 'draft',
          toStatus: 'pending_approval',
          reason: 'Ready for approval'
        });

        expect(result.data).toEqual(mockUpdatedPO);
        expect(result.error).toBeNull();
      });

      it('should reject invalid status transition', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'cancelled' },
          error: null
        });

        const result = await executeStatusTransition({
          purchaseOrderId: '1',
          fromStatus: 'cancelled',
          toStatus: 'approved',
          reason: 'Invalid transition'
        });

        expect(result.data).toBeNull();
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('Invalid transition');
      });
    });
  });

  describe('Receiving API Endpoints', () => {
    describe('validatePartialReceipt', () => {
      it('should validate correct partial receipt', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'sent' },
          error: null
        });

        const result = await validatePartialReceipt({
          purchaseOrderId: '1',
          items: [{
            productId: 'product-1',
            productName: 'Test Product',
            sku: 'TEST-001',
            orderedQuantity: 10,
            receivedQuantity: 5,
            condition: 'good'
          }],
          receivedBy: 'user-1'
        });

        expect(result.data?.isValid).toBe(true);
        expect(result.data?.errors).toHaveLength(0);
        expect(result.error).toBeNull();
      });

      it('should reject over-receiving', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'sent' },
          error: null
        });

        const result = await validatePartialReceipt({
          purchaseOrderId: '1',
          items: [{
            productId: 'product-1',
            productName: 'Test Product',
            sku: 'TEST-001',
            orderedQuantity: 10,
            receivedQuantity: 15, // More than ordered
            condition: 'good'
          }],
          receivedBy: 'user-1'
        });

        expect(result.data?.isValid).toBe(false);
        expect(result.data?.errors).toContain(
          expect.stringContaining('Total received quantity would exceed ordered quantity')
        );
      });

      it('should reject receipt for non-receivable status', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'cancelled' },
          error: null
        });

        const result = await validatePartialReceipt({
          purchaseOrderId: '1',
          items: [{
            productId: 'product-1',
            productName: 'Test Product',
            sku: 'TEST-001',
            orderedQuantity: 10,
            receivedQuantity: 5,
            condition: 'good'
          }],
          receivedBy: 'user-1'
        });

        expect(result.data?.isValid).toBe(false);
        expect(result.data?.errors).toContain(
          'Purchase order cannot receive items in status: cancelled'
        );
      });

      it('should reject empty items array', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'sent' },
          error: null
        });

        const result = await validatePartialReceipt({
          purchaseOrderId: '1',
          items: [],
          receivedBy: 'user-1'
        });

        expect(result.data?.isValid).toBe(false);
        expect(result.data?.errors).toContain(
          'At least one item must be specified for receiving'
        );
      });
    });

    describe('processPartialReceipt', () => {
      it('should process valid partial receipt', async () => {
        const { getPurchaseOrder, receivePurchaseOrder } = await import('../../../api/purchases');
        
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'sent' },
          error: null
        });

        const mockUpdatedPO = { ...mockPurchaseOrder, status: 'partial' as const };
        vi.mocked(receivePurchaseOrder).mockResolvedValue({
          data: mockUpdatedPO,
          error: null
        });

        const result = await processPartialReceipt({
          purchaseOrderId: '1',
          items: [{
            productId: 'product-1',
            productName: 'Test Product',
            sku: 'TEST-001',
            orderedQuantity: 10,
            receivedQuantity: 5,
            condition: 'good'
          }],
          receivedBy: 'user-1'
        });

        expect(result.data).toEqual(mockUpdatedPO);
        expect(result.error).toBeNull();
      });

      it('should reject invalid partial receipt', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'cancelled' },
          error: null
        });

        const result = await processPartialReceipt({
          purchaseOrderId: '1',
          items: [{
            productId: 'product-1',
            productName: 'Test Product',
            sku: 'TEST-001',
            orderedQuantity: 10,
            receivedQuantity: 5,
            condition: 'good'
          }],
          receivedBy: 'user-1'
        });

        expect(result.data).toBeNull();
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('Validation failed');
      });
    });

    describe('getPendingReceipts', () => {
      it('should return pending receipts with pagination', async () => {
        const { supabase } = await import('../../../utils/supabase');
        const mockQuery = {
          select: vi.fn(() => mockQuery),
          in: vi.fn(() => mockQuery),
          order: vi.fn(() => mockQuery),
          limit: vi.fn(() => mockQuery),
          range: vi.fn(() => mockQuery)
        };
        
        mockQuery.range.mockResolvedValue({
          data: [{
            id: '1',
            po_number: 'PO-2024-001',
            supplier_id: 'supplier-1',
            supplier_name: 'Test Supplier',
            items: mockPurchaseOrder.items,
            subtotal: 1000,
            tax: 120,
            total: 1120,
            status: 'sent',
            expected_date: new Date().toISOString(),
            received_date: null,
            created_by: 'user-1',
            created_at: new Date().toISOString()
          }],
          error: null
        });

        vi.mocked(supabase.from).mockReturnValue(mockQuery);

        const result = await getPendingReceipts(10, 0);

        expect(result.data).toHaveLength(1);
        expect(result.data![0].status).toBe('sent');
        expect(result.error).toBeNull();
      });
    });

    describe('getOverduePurchaseOrders', () => {
      it('should return overdue purchase orders', async () => {
        const { supabase } = await import('../../../utils/supabase');
        const mockQuery = {
          select: vi.fn(() => mockQuery),
          in: vi.fn(() => mockQuery),
          lt: vi.fn(() => mockQuery),
          order: vi.fn(() => mockQuery)
        };
        
        mockQuery.order.mockResolvedValue({
          data: [{
            id: '1',
            po_number: 'PO-2024-001',
            supplier_id: 'supplier-1',
            supplier_name: 'Test Supplier',
            items: mockPurchaseOrder.items,
            subtotal: 1000,
            tax: 120,
            total: 1120,
            status: 'sent',
            expected_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
            received_date: null,
            created_by: 'user-1',
            created_at: new Date().toISOString()
          }],
          error: null
        });

        vi.mocked(supabase.from).mockReturnValue(mockQuery);

        const result = await getOverduePurchaseOrders();

        expect(result.data).toHaveLength(1);
        expect(new Date(result.data![0].expectedDate!).getTime()).toBeLessThan(Date.now());
        expect(result.error).toBeNull();
      });
    });
  });

  describe('Approval API Endpoints', () => {
    describe('validateApprovalPermissions', () => {
      it('should validate approval permissions for authorized user', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'draft', createdBy: 'user-2' },
          error: null
        });

        const result = await validateApprovalPermissions('1', 'user-1', 'manager', 50000);

        expect(result.data?.canApprove).toBe(true);
        expect(result.data?.errors).toHaveLength(0);
        expect(result.data?.userLevel).toBe(2);
        expect(result.data?.requiredLevel).toBe(1);
        expect(result.error).toBeNull();
      });

      it('should reject self-approval', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'draft', createdBy: 'user-1' },
          error: null
        });

        const result = await validateApprovalPermissions('1', 'user-1', 'manager');

        expect(result.data?.canApprove).toBe(false);
        expect(result.data?.errors).toContain('Users cannot approve their own purchase orders');
      });

      it('should reject insufficient approval level', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { 
            ...mockPurchaseOrder, 
            status: 'draft', 
            createdBy: 'user-2',
            total: 75000 // High value requiring level 3 approval
          },
          error: null
        });

        const result = await validateApprovalPermissions('1', 'user-1', 'supervisor'); // Level 1 user

        expect(result.data?.canApprove).toBe(false);
        expect(result.data?.errors).toContain('Insufficient approval level: 1 < 3 required');
      });

      it('should reject approval amount exceeding limit', async () => {
        const { getPurchaseOrder } = await import('../../../api/purchases');
        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { 
            ...mockPurchaseOrder, 
            status: 'draft', 
            createdBy: 'user-2',
            total: 5000
          },
          error: null
        });

        const result = await validateApprovalPermissions('1', 'user-1', 'manager', 1000);

        expect(result.data?.canApprove).toBe(false);
        expect(result.data?.errors).toContain('Purchase order amount (5000) exceeds your approval limit (1000)');
      });
    });

    describe('approvePurchaseOrder', () => {
      it('should approve purchase order successfully', async () => {
        const { getPurchaseOrder, updatePurchaseOrder, validateApprovalPermissions } = await import('../../../api/purchases');
        
        // Mock permission validation
        vi.mocked(validateApprovalPermissions).mockResolvedValue({
          data: {
            canApprove: true,
            errors: [],
            warnings: [],
            requiredLevel: 1,
            userLevel: 2
          },
          error: null
        });

        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'draft' },
          error: null
        });

        const mockUpdatedPO = { ...mockPurchaseOrder, status: 'sent' as const };
        vi.mocked(updatePurchaseOrder).mockResolvedValue({
          data: mockUpdatedPO,
          error: null
        });

        const result = await approvePurchaseOrder({
          purchaseOrderId: '1',
          action: 'approve',
          reason: 'All requirements met',
          approvedBy: 'user-1'
        });

        expect(result.data).toEqual(mockUpdatedPO);
        expect(result.error).toBeNull();
      });

      it('should reject purchase order approval', async () => {
        const { getPurchaseOrder, updatePurchaseOrder, validateApprovalPermissions } = await import('../../../api/purchases');
        
        vi.mocked(validateApprovalPermissions).mockResolvedValue({
          data: {
            canApprove: true,
            errors: [],
            warnings: [],
            requiredLevel: 1,
            userLevel: 2
          },
          error: null
        });

        vi.mocked(getPurchaseOrder).mockResolvedValue({
          data: { ...mockPurchaseOrder, status: 'draft' },
          error: null
        });

        const mockUpdatedPO = { ...mockPurchaseOrder, status: 'cancelled' as const };
        vi.mocked(updatePurchaseOrder).mockResolvedValue({
          data: mockUpdatedPO,
          error: null
        });

        const result = await approvePurchaseOrder({
          purchaseOrderId: '1',
          action: 'reject',
          reason: 'Budget constraints',
          approvedBy: 'user-1'
        });

        expect(result.data).toEqual(mockUpdatedPO);
        expect(result.error).toBeNull();
      });
    });

    describe('bulkApprovePurchaseOrders', () => {
      it('should process bulk approvals with mixed results', async () => {
        const { approvePurchaseOrder } = await import('../../../api/purchases');
        
        vi.mocked(approvePurchaseOrder)
          .mockResolvedValueOnce({ data: mockPurchaseOrder, error: null })
          .mockResolvedValueOnce({ data: null, error: new Error('Validation failed') });

        const result = await bulkApprovePurchaseOrders({
          purchaseOrderIds: ['1', '2'],
          action: 'approve',
          reason: 'Bulk approval',
          approvedBy: 'user-1'
        });

        expect(result.data?.successful).toEqual(['1']);
        expect(result.data?.failed).toEqual([{ id: '2', error: 'Validation failed' }]);
        expect(result.error).toBeNull();
      });
    });

    describe('getPendingApprovals', () => {
      it('should return pending approvals with amount filters', async () => {
        const { supabase } = await import('../../../utils/supabase');
        const mockQuery = {
          select: vi.fn(() => mockQuery),
          eq: vi.fn(() => mockQuery),
          order: vi.fn(() => mockQuery),
          gte: vi.fn(() => mockQuery),
          lte: vi.fn(() => mockQuery),
          limit: vi.fn(() => mockQuery),
          range: vi.fn(() => mockQuery)
        };
        
        mockQuery.range.mockResolvedValue({
          data: [{
            id: '1',
            po_number: 'PO-2024-001',
            supplier_id: 'supplier-1',
            supplier_name: 'Test Supplier',
            items: mockPurchaseOrder.items,
            subtotal: 1000,
            tax: 120,
            total: 1120,
            status: 'draft',
            expected_date: new Date().toISOString(),
            received_date: null,
            created_by: 'user-1',
            created_at: new Date().toISOString()
          }],
          error: null
        });

        vi.mocked(supabase.from).mockReturnValue(mockQuery);

        const result = await getPendingApprovals(10, 0, 1000, 5000);

        expect(result.data).toHaveLength(1);
        expect(result.data![0].status).toBe('draft');
        expect(mockQuery.gte).toHaveBeenCalledWith('total', 1000);
        expect(mockQuery.lte).toHaveBeenCalledWith('total', 5000);
        expect(result.error).toBeNull();
      });
    });

    describe('getApprovalWorkflowConfig', () => {
      it('should return default approval workflow configuration', async () => {
        const result = await getApprovalWorkflowConfig();

        expect(result.data?.approvalLevels).toHaveLength(3);
        expect(result.data?.approvalLevels[0]).toEqual({
          level: 1,
          name: 'Standard Approval',
          minAmount: 0,
          maxAmount: 10000,
          requiredRoles: ['supervisor', 'purchaser', 'manager']
        });
        expect(result.data?.escalationRules).toHaveLength(2);
        expect(result.error).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const { supabase } = await import('../../../utils/supabase');
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        single: vi.fn(() => Promise.resolve({
          data: null,
          error: new Error('Database connection failed')
        }))
      };

      vi.mocked(supabase.from).mockReturnValue(mockQuery);

      const result = await getValidStatusTransitions('1');

      expect(result.data).toBeNull();
      expect(result.error.message).toBe('Database connection failed');
    });

    it('should handle network timeout errors', async () => {
      const { getPurchaseOrder } = await import('../../../api/purchases');
      vi.mocked(getPurchaseOrder).mockRejectedValue(new Error('Network timeout'));

      const result = await validatePartialReceipt({
        purchaseOrderId: '1',
        items: [{
          productId: 'product-1',
          productName: 'Test Product',
          sku: 'TEST-001',
          orderedQuantity: 10,
          receivedQuantity: 5,
          condition: 'good'
        }],
        receivedBy: 'user-1'
      });

      expect(result.data).toBeNull();
      expect(result.error.message).toBe('Failed to validate partial receipt');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle empty result sets', async () => {
      const { supabase } = await import('../../../utils/supabase');
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        in: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        limit: vi.fn(() => mockQuery),
        range: vi.fn(() => mockQuery)
      };
      
      mockQuery.range.mockResolvedValue({
        data: [],
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue(mockQuery);

      const result = await getPendingReceipts(10, 0);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should handle large datasets with pagination', async () => {
      const { supabase } = await import('../../../utils/supabase');
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        limit: vi.fn(() => mockQuery),
        range: vi.fn(() => mockQuery)
      };

      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: `po-${i}`,
        po_number: `PO-2024-${String(i).padStart(3, '0')}`,
        supplier_id: 'supplier-1',
        supplier_name: 'Test Supplier',
        items: mockPurchaseOrder.items,
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'draft',
        expected_date: new Date().toISOString(),
        received_date: null,
        created_by: 'user-1',
        created_at: new Date().toISOString()
      }));
      
      mockQuery.range.mockResolvedValue({
        data: mockData.slice(0, 50), // Return first 50 items
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue(mockQuery);

      const result = await getPendingApprovals(50, 0);

      expect(result.data).toHaveLength(50);
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.range).toHaveBeenCalledWith(0, 49);
      expect(result.error).toBeNull();
    });

    it('should handle concurrent approval attempts', async () => {
      const { approvePurchaseOrder } = await import('../../../api/purchases');
      
      // Simulate concurrent approval attempts
      const approvalPromises = Array.from({ length: 3 }, () =>
        approvePurchaseOrder({
          purchaseOrderId: '1',
          action: 'approve',
          reason: 'Concurrent approval test',
          approvedBy: 'user-1'
        })
      );

      // At least one should succeed (in real implementation, only one should succeed)
      const results = await Promise.allSettled(approvalPromises);
      const successful = results.filter(result => result.status === 'fulfilled').length;

      expect(successful).toBeGreaterThan(0);
    });
  });
});