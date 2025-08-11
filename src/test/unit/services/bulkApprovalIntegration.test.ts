import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approvalWorkflowService, BulkApprovalRequest, BulkApprovalResult } from '../../../services/approvalWorkflowService';
import { receivingIntegrationService } from '../../../services/receivingIntegrationService';
import { validatePurchaseOrderApproval } from '../../../utils/purchaseOrderPermissions';
import { purchaseOrderStateMachine } from '../../../services/purchaseOrderStateMachine';
import { auditService } from '../../../services/auditService';
import { notificationService } from '../../../services/notificationService';
import { PurchaseOrder } from '../../../types/business';
import { UserRole } from '../../../types/auth';

// Mock dependencies
vi.mock('../../../services/receivingIntegrationService', () => ({
  receivingIntegrationService: {
    onPurchaseOrderApproved: vi.fn(),
    refreshReceivingQueue: vi.fn()
  }
}));

vi.mock('../../../utils/purchaseOrderPermissions', () => ({
  validatePurchaseOrderApproval: vi.fn()
}));

vi.mock('../../../services/purchaseOrderStateMachine', () => ({
  purchaseOrderStateMachine: {
    canTransition: vi.fn()
  }
}));

vi.mock('../../../services/auditService', () => ({
  auditService: {
    logPurchaseOrderAction: vi.fn()
  }
}));

vi.mock('../../../services/notificationService', () => ({
  notificationService: {
    sendBulkApprovalNotification: vi.fn()
  }
}));

describe('Bulk Approval with Receiving Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default successful mocks
    vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
    vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
    vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
    vi.mocked(notificationService.sendBulkApprovalNotification).mockResolvedValue(undefined);
    vi.mocked(receivingIntegrationService.onPurchaseOrderApproved).mockResolvedValue({
      success: true,
      receivingQueueUpdated: true,
      notificationsSent: 1
    });
    vi.mocked(receivingIntegrationService.refreshReceivingQueue).mockResolvedValue(undefined);
  });

  const createMockPurchaseOrders = (count: number): PurchaseOrder[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `po-${i + 1}`,
      poNumber: `PO-00${i + 1}`,
      supplierId: `supplier-${i + 1}`,
      supplierName: `Supplier ${i + 1}`,
      items: [
        {
          id: `item-${i + 1}`,
          productId: `prod-${i + 1}`,
          productName: `Product ${i + 1}`,
          sku: `SKU-${i + 1}`,
          quantity: 10,
          cost: 100,
          total: 1000
        }
      ],
      subtotal: 1000,
      tax: 120,
      total: 1120,
      status: 'pending',
      createdAt: new Date()
    }));
  };

  const createBulkApprovalRequest = (purchaseOrderIds: string[]): BulkApprovalRequest => ({
    purchaseOrderIds,
    reason: 'Bulk approval for Q1 inventory',
    comments: 'All orders verified and approved',
    userId: 'manager-123',
    userEmail: 'manager@fbms.com',
    timestamp: '2024-01-15T10:00:00Z'
  });

  describe('Successful Bulk Approval with Integration', () => {
    it('should approve multiple POs and integrate with receiving', async () => {
      const purchaseOrders = createMockPurchaseOrders(3);
      const request = createBulkApprovalRequest(['po-1', 'po-2', 'po-3']);
      const userRole: UserRole = 'manager';

      // Mock private method
      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result: BulkApprovalResult = await approvalWorkflowService.bulkApprovePurchaseOrders(
        purchaseOrders,
        request,
        userRole
      );

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify individual integration calls for each PO
      expect(receivingIntegrationService.onPurchaseOrderApproved).toHaveBeenCalledTimes(3);

      // Verify batch integration processing
      expect(receivingIntegrationService.refreshReceivingQueue).toHaveBeenCalledOnce();

      // Verify bulk integration audit log
      expect(auditService.logPurchaseOrderAction).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseOrderId: 'BULK_INTEGRATION',
          action: 'bulk_receiving_integration',
          reason: 'Bulk receiving integration for 3 approved purchase orders',
          metadata: expect.objectContaining({
            successfulApprovals: 3,
            totalProcessed: 3,
            approvedPurchaseOrderIds: ['po-1', 'po-2', 'po-3']
          })
        })
      );

      expect(console.log).toHaveBeenCalledWith(
        'Bulk receiving integration completed for 3 approved purchase orders'
      );

      updateStatusSpy.mockRestore();
    });

    it('should handle partial bulk approval success', async () => {
      const purchaseOrders = createMockPurchaseOrders(3);
      const request = createBulkApprovalRequest(['po-1', 'po-2', 'po-3']);
      const userRole: UserRole = 'manager';

      // Make second PO fail validation
      vi.mocked(validatePurchaseOrderApproval)
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: false, reason: 'Insufficient funds' })
        .mockReturnValueOnce({ isValid: true });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result = await approvalWorkflowService.bulkApprovePurchaseOrders(
        purchaseOrders,
        request,
        userRole
      );

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toContain('PO-002: Insufficient funds');

      // Individual integration should be called only for successful approvals
      expect(receivingIntegrationService.onPurchaseOrderApproved).toHaveBeenCalledTimes(2);

      // Batch integration should still run for successful ones
      expect(receivingIntegrationService.refreshReceivingQueue).toHaveBeenCalledOnce();

      // Bulk integration audit should reflect only successful approvals
      expect(auditService.logPurchaseOrderAction).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseOrderId: 'BULK_INTEGRATION',
          reason: 'Bulk receiving integration for 2 approved purchase orders',
          metadata: expect.objectContaining({
            successfulApprovals: 2,
            totalProcessed: 3,
            approvedPurchaseOrderIds: ['po-1', 'po-3']
          })
        })
      );

      updateStatusSpy.mockRestore();
    });

    it('should skip batch integration when no approvals succeed', async () => {
      const purchaseOrders = createMockPurchaseOrders(2);
      const request = createBulkApprovalRequest(['po-1', 'po-2']);
      const userRole: UserRole = 'employee'; // Insufficient role

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ 
        isValid: false, 
        reason: 'Insufficient permissions' 
      });

      const result = await approvalWorkflowService.bulkApprovePurchaseOrders(
        purchaseOrders,
        request,
        userRole
      );

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(2);

      // No integration calls should be made
      expect(receivingIntegrationService.onPurchaseOrderApproved).not.toHaveBeenCalled();
      expect(receivingIntegrationService.refreshReceivingQueue).not.toHaveBeenCalled();

      // No bulk integration audit log should be created
      const bulkIntegrationCalls = vi.mocked(auditService.logPurchaseOrderAction).mock.calls
        .filter(call => call[0].purchaseOrderId === 'BULK_INTEGRATION');
      expect(bulkIntegrationCalls).toHaveLength(0);
    });
  });

  describe('Batch Integration Error Handling', () => {
    it('should handle batch integration failure gracefully', async () => {
      const purchaseOrders = createMockPurchaseOrders(2);
      const request = createBulkApprovalRequest(['po-1', 'po-2']);
      const userRole: UserRole = 'manager';

      // Mock individual integrations to succeed
      vi.mocked(receivingIntegrationService.onPurchaseOrderApproved).mockResolvedValue({
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 1
      });

      // Mock batch integration to fail
      vi.mocked(receivingIntegrationService.refreshReceivingQueue).mockRejectedValue(
        new Error('Database connection failed')
      );

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result = await approvalWorkflowService.bulkApprovePurchaseOrders(
        purchaseOrders,
        request,
        userRole
      );

      // Bulk approval should still succeed despite integration failure
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);

      // Error should be logged
      expect(console.error).toHaveBeenCalledWith(
        'Bulk receiving integration failed:',
        expect.any(Error)
      );

      // Failure audit log should be created
      expect(auditService.logPurchaseOrderAction).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseOrderId: 'BULK_INTEGRATION_FAILED',
          action: 'bulk_receiving_integration_failed',
          reason: expect.stringContaining('Database connection failed'),
          metadata: expect.objectContaining({
            successfulApprovals: 2,
            errorDetails: expect.any(String)
          })
        })
      );

      updateStatusSpy.mockRestore();
    });

    it('should handle audit logging failure for integration error', async () => {
      const purchaseOrders = createMockPurchaseOrders(1);
      const request = createBulkApprovalRequest(['po-1']);
      const userRole: UserRole = 'manager';

      // Mock batch integration to fail
      vi.mocked(receivingIntegrationService.refreshReceivingQueue).mockRejectedValue(
        new Error('Integration error')
      );

      // Mock audit service to fail when logging the integration failure
      vi.mocked(auditService.logPurchaseOrderAction)
        .mockResolvedValueOnce(undefined) // First call succeeds (normal bulk approval audit)
        .mockResolvedValueOnce(undefined) // Second call succeeds (bulk integration audit)  
        .mockRejectedValueOnce(new Error('Audit service down')); // Third call fails (integration failure audit)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result = await approvalWorkflowService.bulkApprovePurchaseOrders(
        purchaseOrders,
        request,
        userRole
      );

      expect(result.successCount).toBe(1);

      // Should log both the integration failure and the audit failure
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Bulk receiving integration failed:',
        expect.any(Error)
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to log bulk integration failure:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      updateStatusSpy.mockRestore();
    });
  });

  describe('Integration Timing and Order', () => {
    it('should perform batch integration after all individual approvals', async () => {
      const purchaseOrders = createMockPurchaseOrders(2);
      const request = createBulkApprovalRequest(['po-1', 'po-2']);
      const userRole: UserRole = 'manager';

      const callOrder: string[] = [];

      vi.mocked(receivingIntegrationService.onPurchaseOrderApproved).mockImplementation(async (poId) => {
        callOrder.push(`individual_integration_${poId}`);
        return { success: true, receivingQueueUpdated: true, notificationsSent: 1 };
      });

      vi.mocked(receivingIntegrationService.refreshReceivingQueue).mockImplementation(async () => {
        callOrder.push('batch_integration');
      });

      vi.mocked(notificationService.sendBulkApprovalNotification).mockImplementation(async () => {
        callOrder.push('bulk_notification');
      });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      await approvalWorkflowService.bulkApprovePurchaseOrders(purchaseOrders, request, userRole);

      expect(callOrder).toEqual([
        'individual_integration_po-1',
        'individual_integration_po-2', 
        'bulk_notification',
        'batch_integration'
      ]);

      updateStatusSpy.mockRestore();
    });
  });

  describe('Large Batch Processing', () => {
    it('should handle large batch efficiently', async () => {
      const purchaseOrders = createMockPurchaseOrders(50);
      const request = createBulkApprovalRequest(purchaseOrders.map(po => po.id));
      const userRole: UserRole = 'admin';

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result = await approvalWorkflowService.bulkApprovePurchaseOrders(
        purchaseOrders,
        request,
        userRole
      );

      expect(result.successCount).toBe(50);
      expect(result.failureCount).toBe(0);

      // Individual integration should be called for each PO
      expect(receivingIntegrationService.onPurchaseOrderApproved).toHaveBeenCalledTimes(50);

      // Batch integration should be called once regardless of batch size
      expect(receivingIntegrationService.refreshReceivingQueue).toHaveBeenCalledTimes(1);

      // Bulk integration audit should contain all PO IDs
      const bulkIntegrationCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls
        .find(call => call[0].purchaseOrderId === 'BULK_INTEGRATION');
      
      expect(bulkIntegrationCall?.[0].metadata?.approvedPurchaseOrderIds).toHaveLength(50);

      updateStatusSpy.mockRestore();
    });
  });

  describe('Mixed Success/Failure Scenarios', () => {
    it('should handle mixed individual integration results', async () => {
      const purchaseOrders = createMockPurchaseOrders(3);
      const request = createBulkApprovalRequest(['po-1', 'po-2', 'po-3']);
      const userRole: UserRole = 'manager';

      // Mock individual integrations with mixed results
      vi.mocked(receivingIntegrationService.onPurchaseOrderApproved)
        .mockResolvedValueOnce({ success: true, receivingQueueUpdated: true, notificationsSent: 1 })
        .mockResolvedValueOnce({ success: false, receivingQueueUpdated: false, error: 'Integration failed', notificationsSent: 0 })
        .mockResolvedValueOnce({ success: true, receivingQueueUpdated: true, notificationsSent: 1 });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result = await approvalWorkflowService.bulkApprovePurchaseOrders(
        purchaseOrders,
        request,
        userRole
      );

      // All PO approvals should succeed regardless of integration failures
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);

      // Batch integration should still run
      expect(receivingIntegrationService.refreshReceivingQueue).toHaveBeenCalledOnce();

      updateStatusSpy.mockRestore();
    });
  });
});