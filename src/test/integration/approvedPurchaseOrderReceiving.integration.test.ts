import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { approvalWorkflowService, ApprovalRequest } from '../../services/approvalWorkflowService';
import { receivingIntegrationService } from '../../services/receivingIntegrationService';
import { receivingDashboardService } from '../../services/receivingDashboardService';
import { PurchaseOrder } from '../../types/business';
import { UserRole } from '../../types/auth';

// Mock all external dependencies
vi.mock('../../utils/purchaseOrderPermissions', () => ({
  validatePurchaseOrderApproval: vi.fn(() => ({ isValid: true }))
}));

vi.mock('../../services/purchaseOrderStateMachine', () => ({
  purchaseOrderStateMachine: {
    canTransition: vi.fn(() => true)
  }
}));

vi.mock('../../services/auditService', () => ({
  auditService: {
    logPurchaseOrderAction: vi.fn(() => Promise.resolve('audit-123'))
  }
}));

vi.mock('../../services/notificationService', () => ({
  notificationService: {
    sendApprovalDecision: vi.fn(() => Promise.resolve()),
    sendBulkApprovalNotification: vi.fn(() => Promise.resolve())
  }
}));

vi.mock('../../services/receivingDashboardService', () => ({
  receivingDashboardService: {
    getReceivingQueue: vi.fn(() => Promise.resolve([])),
    onReceivingIntegrationEvent: vi.fn()
  }
}));

vi.mock('../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }
}));

describe('Approved Purchase Order Receiving Integration - End to End', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const createTestPurchaseOrder = (): PurchaseOrder => ({
    id: 'po-integration-test',
    poNumber: 'PO-INT-001',
    supplierId: 'supplier-test',
    supplierName: 'Integration Test Supplier',
    items: [
      {
        id: 'item-test-1',
        productId: 'prod-test-1',
        productName: 'Test Product',
        sku: 'TEST-SKU-001',
        quantity: 50,
        cost: 25.99,
        total: 1299.50
      }
    ],
    subtotal: 1299.50,
    tax: 155.94,
    total: 1455.44,
    status: 'pending',
    createdAt: new Date('2024-01-15T10:00:00Z')
  });

  const createApprovalRequest = (): ApprovalRequest => ({
    purchaseOrderId: 'po-integration-test',
    reason: 'Integration test approval',
    comments: 'Testing end-to-end receiving integration',
    userId: 'test-manager-001',
    userEmail: 'testmanager@fbms.com',
    timestamp: '2024-01-15T14:30:00Z'
  });

  describe('Complete Approval to Receiving Flow', () => {
    it('should successfully approve PO and integrate with receiving system', async () => {
      const purchaseOrder = createTestPurchaseOrder();
      const approvalRequest = createApprovalRequest();
      const userRole: UserRole = 'manager';

      // Mock private method
      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      // Mock receiving dashboard refresh
      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);

      // Execute the approval
      const approvalResult = await approvalWorkflowService.approvePurchaseOrder(
        purchaseOrder,
        approvalRequest,
        userRole
      );

      // Verify approval succeeded
      expect(approvalResult.success).toBe(true);
      expect(approvalResult.purchaseOrderId).toBe('po-integration-test');
      expect(approvalResult.previousStatus).toBe('pending');
      expect(approvalResult.newStatus).toBe('sent');

      // Verify receiving queue was refreshed (integration occurred)
      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalled();

      // Verify integration success was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Receiving integration successful for PO po-integration-test'
      );

      updateStatusSpy.mockRestore();
    });

    it('should handle integration failure without blocking approval', async () => {
      const purchaseOrder = createTestPurchaseOrder();
      const approvalRequest = createApprovalRequest();
      const userRole: UserRole = 'manager';

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      // Mock receiving integration failure
      vi.mocked(receivingDashboardService.getReceivingQueue).mockRejectedValue(
        new Error('Receiving service temporarily unavailable')
      );

      const approvalResult = await approvalWorkflowService.approvePurchaseOrder(
        purchaseOrder,
        approvalRequest,
        userRole
      );

      // Approval should still succeed
      expect(approvalResult.success).toBe(true);
      expect(approvalResult.purchaseOrderId).toBe('po-integration-test');

      // Integration failure should be logged
      expect(console.error).toHaveBeenCalledWith(
        'Error in onPurchaseOrderApproved:',
        expect.any(Error)
      );

      updateStatusSpy.mockRestore();
    });
  });

  describe('Bulk Approval Integration', () => {
    it('should handle bulk approval with receiving integration', async () => {
      const purchaseOrders = [
        { ...createTestPurchaseOrder(), id: 'po-bulk-1', poNumber: 'PO-BULK-001' },
        { ...createTestPurchaseOrder(), id: 'po-bulk-2', poNumber: 'PO-BULK-002' },
        { ...createTestPurchaseOrder(), id: 'po-bulk-3', poNumber: 'PO-BULK-003' }
      ];

      const bulkRequest = {
        purchaseOrderIds: ['po-bulk-1', 'po-bulk-2', 'po-bulk-3'],
        reason: 'Bulk integration test',
        comments: 'Testing bulk receiving integration',
        userId: 'test-admin-001',
        userEmail: 'testadmin@fbms.com',
        timestamp: '2024-01-15T15:00:00Z'
      };

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      // Mock successful individual and batch integrations
      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);

      const bulkResult = await approvalWorkflowService.bulkApprovePurchaseOrders(
        purchaseOrders,
        bulkRequest,
        'admin'
      );

      expect(bulkResult.successCount).toBe(3);
      expect(bulkResult.failureCount).toBe(0);

      // Verify individual integrations occurred (once per PO)
      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledTimes(4); // 3 individual + 1 batch

      // Verify bulk integration success was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Bulk receiving integration completed for 3 approved purchase orders'
      );

      updateStatusSpy.mockRestore();
    });
  });

  describe('Purchase Order Status Changes', () => {
    it('should handle status change integration', async () => {
      const statusChangeContext = {
        changedBy: 'test-user',
        changedAt: new Date(),
        reason: 'Status updated for integration test',
        previousStatus: 'draft' as const,
        newStatus: 'approved' as const
      };

      const integrationResult = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        'po-status-test',
        'draft',
        'approved',
        statusChangeContext
      );

      expect(integrationResult.success).toBe(true);
      expect(integrationResult.receivingQueueUpdated).toBe(true);

      // Verify receiving queue was refreshed
      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalled();
    });

    it('should handle cancellation integration', async () => {
      const statusChangeContext = {
        changedBy: 'test-user',
        changedAt: new Date(),
        reason: 'Order cancelled for integration test',
        previousStatus: 'approved' as const,
        newStatus: 'cancelled' as const
      };

      const integrationResult = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        'po-cancel-test',
        'approved',
        'cancelled',
        statusChangeContext
      );

      expect(integrationResult.success).toBe(true);
      expect(integrationResult.receivingQueueUpdated).toBe(true);
      expect(integrationResult.notificationsSent).toBe(1); // Cancellation notification
    });
  });

  describe('Validation Integration', () => {
    it('should validate purchase orders correctly', () => {
      const validPO = {
        id: 'po-validation-test',
        poNumber: 'PO-VAL-001',
        supplierId: 'supplier-val',
        supplierName: 'Validation Supplier',
        items: [
          {
            id: 'item-val-1',
            productId: 'prod-val-1',
            productName: 'Validation Product',
            sku: 'VAL-001',
            quantity: 10,
            cost: 50,
            total: 500
          }
        ],
        subtotal: 500,
        tax: 60,
        total: 560,
        status: 'approved' as const,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        statusHistory: [],
        receivingHistory: [],
        validationErrors: [],
        approvalHistory: [],
        totalReceived: 0,
        totalPending: 10,
        isPartiallyReceived: false,
        isFullyReceived: false
      };

      const validation = receivingIntegrationService.validateReceivingReadiness(validPO);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid purchase orders', () => {
      const invalidPO = {
        id: 'po-invalid-test',
        poNumber: '',
        supplierId: '',
        supplierName: '',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        status: 'draft' as const,
        createdAt: new Date(),
        statusHistory: [],
        receivingHistory: [],
        validationErrors: [],
        approvalHistory: [],
        totalReceived: 0,
        totalPending: 0,
        isPartiallyReceived: false,
        isFullyReceived: false
      };

      const validation = receivingIntegrationService.validateReceivingReadiness(invalidPO);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Supplier information is missing');
      expect(validation.errors).toContain('Purchase order has no items');
      expect(validation.errors).toContain("Purchase order status 'draft' is not receivable");
    });
  });

  describe('Debounced Refresh Integration', () => {
    it('should handle multiple rapid refresh requests', async () => {
      // Clear any existing timers
      receivingIntegrationService.clearPendingRefresh();

      const refreshPromises = [
        receivingIntegrationService.refreshReceivingQueueDebounced('req-1'),
        receivingIntegrationService.refreshReceivingQueueDebounced('req-2'),
        receivingIntegrationService.refreshReceivingQueueDebounced('req-3')
      ];

      // Wait for debounced execution with timeout
      await Promise.all(refreshPromises);

      // Add small delay to ensure debounced execution completes
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should only call the underlying refresh once due to debouncing
      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledTimes(1);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Executing debounced refresh for 3 requests'
      );
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('Error Recovery Integration', () => {
    it('should retry failed refresh operations', async () => {
      // Mock first two calls to fail, third to succeed
      vi.mocked(receivingDashboardService.getReceivingQueue)
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'))
        .mockResolvedValueOnce([]);

      await receivingIntegrationService.refreshReceivingQueueWithRetry(3);

      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Receiving queue refresh succeeded on attempt 3'
      );
    });

    it('should fail after max retries exceeded', async () => {
      vi.mocked(receivingDashboardService.getReceivingQueue)
        .mockRejectedValue(new Error('Persistent error'));

      await expect(
        receivingIntegrationService.refreshReceivingQueueWithRetry(2)
      ).rejects.toThrow('Persistent error');

      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration Statistics', () => {
    it('should provide refresh status information', () => {
      receivingIntegrationService.clearPendingRefresh();
      
      const status = receivingIntegrationService.getRefreshStatus();
      
      expect(status.isDebouncing).toBe(false);
      expect(status.pendingRequests).toBe(0);
    });
  });
});