import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approvalWorkflowService, ApprovalRequest, ApprovalResult } from '../../../services/approvalWorkflowService';
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
    onPurchaseOrderApproved: vi.fn()
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
    sendApprovalDecision: vi.fn()
  }
}));

describe('Enhanced ApprovalWorkflowService with Receiving Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const createMockPurchaseOrder = (overrides: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
    id: 'po-123',
    poNumber: 'PO-001',
    supplierId: 'supplier-456',
    supplierName: 'Test Supplier',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
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
    status: 'pending',
    createdAt: new Date(),
    ...overrides
  });

  const createApprovalRequest = (overrides: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
    purchaseOrderId: 'po-123',
    reason: 'Approved for procurement',
    comments: 'Urgent order',
    userId: 'user-456',
    userEmail: 'manager@fbms.com',
    timestamp: '2024-01-15T10:00:00Z',
    ...overrides
  });

  describe('Successful Approval with Integration', () => {
    it('should approve PO and integrate with receiving successfully', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createApprovalRequest();
      const userRole: UserRole = 'manager';

      // Mock successful validation and state machine
      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      
      // Mock successful receiving integration
      vi.mocked(receivingIntegrationService.onPurchaseOrderApproved).mockResolvedValue({
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 1,
        auditLogId: 'audit-789'
      });

      // Spy on the private method
      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result: ApprovalResult = await approvalWorkflowService.approvePurchaseOrder(
        purchaseOrder,
        request,
        userRole
      );

      expect(result.success).toBe(true);
      expect(result.purchaseOrderId).toBe('po-123');
      expect(result.previousStatus).toBe('pending');
      expect(result.newStatus).toBe('sent');

      // Verify receiving integration was called
      expect(receivingIntegrationService.onPurchaseOrderApproved).toHaveBeenCalledWith(
        'po-123',
        {
          approvedBy: 'user-456',
          approvedAt: new Date('2024-01-15T10:00:00Z'),
          reason: 'Approved for procurement',
          comments: 'Urgent order',
          userRole: 'manager'
        }
      );

      expect(console.log).toHaveBeenCalledWith('Receiving integration successful for PO po-123');

      updateStatusSpy.mockRestore();
    });

    it('should handle receiving integration failure gracefully', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createApprovalRequest();
      const userRole: UserRole = 'manager';

      // Mock successful validation and state machine
      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      
      // Mock receiving integration failure
      vi.mocked(receivingIntegrationService.onPurchaseOrderApproved).mockResolvedValue({
        success: false,
        receivingQueueUpdated: false,
        error: 'Database connection failed',
        notificationsSent: 0
      });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result: ApprovalResult = await approvalWorkflowService.approvePurchaseOrder(
        purchaseOrder,
        request,
        userRole
      );

      // Approval should still succeed despite integration failure
      expect(result.success).toBe(true);
      expect(result.purchaseOrderId).toBe('po-123');

      // Verify warning was logged
      expect(console.warn).toHaveBeenCalledWith(
        'Receiving integration failed for PO po-123:',
        'Database connection failed'
      );

      updateStatusSpy.mockRestore();
    });

    it('should handle receiving integration exception gracefully', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createApprovalRequest();
      const userRole: UserRole = 'manager';

      // Mock successful validation and state machine
      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      
      // Mock receiving integration exception
      vi.mocked(receivingIntegrationService.onPurchaseOrderApproved).mockRejectedValue(
        new Error('Network timeout')
      );

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result: ApprovalResult = await approvalWorkflowService.approvePurchaseOrder(
        purchaseOrder,
        request,
        userRole
      );

      // Approval should still succeed despite integration exception
      expect(result.success).toBe(true);
      expect(result.purchaseOrderId).toBe('po-123');

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        'Receiving integration error:',
        expect.any(Error)
      );

      updateStatusSpy.mockRestore();
    });
  });

  describe('Integration Context Creation', () => {
    it('should create proper approval context with all fields', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createApprovalRequest({
        userId: 'manager@company.com',
        reason: 'Budget approved by finance',
        comments: 'Supplier verified and ready to proceed',
        timestamp: '2024-02-15T14:30:00Z'
      });
      const userRole: UserRole = 'admin';

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      vi.mocked(receivingIntegrationService.onPurchaseOrderApproved).mockResolvedValue({
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 1
      });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      await approvalWorkflowService.approvePurchaseOrder(purchaseOrder, request, userRole);

      expect(receivingIntegrationService.onPurchaseOrderApproved).toHaveBeenCalledWith(
        'po-123',
        {
          approvedBy: 'manager@company.com',
          approvedAt: new Date('2024-02-15T14:30:00Z'),
          reason: 'Budget approved by finance',
          comments: 'Supplier verified and ready to proceed',
          userRole: 'admin'
        }
      );

      updateStatusSpy.mockRestore();
    });

    it('should create approval context without comments when not provided', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createApprovalRequest();
      delete (request as any).comments;
      const userRole: UserRole = 'manager';

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      vi.mocked(receivingIntegrationService.onPurchaseOrderApproved).mockResolvedValue({
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 1
      });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      await approvalWorkflowService.approvePurchaseOrder(purchaseOrder, request, userRole);

      expect(receivingIntegrationService.onPurchaseOrderApproved).toHaveBeenCalledWith(
        'po-123',
        expect.objectContaining({
          comments: undefined
        })
      );

      updateStatusSpy.mockRestore();
    });
  });

  describe('Integration Only After Successful Approval', () => {
    it('should not call integration when validation fails', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createApprovalRequest();
      const userRole: UserRole = 'employee'; // Insufficient role

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ 
        isValid: false, 
        reason: 'Insufficient permissions' 
      });

      const result = await approvalWorkflowService.approvePurchaseOrder(
        purchaseOrder,
        request,
        userRole
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
      expect(receivingIntegrationService.onPurchaseOrderApproved).not.toHaveBeenCalled();
    });

    it('should not call integration when state transition is invalid', async () => {
      const purchaseOrder = createMockPurchaseOrder({ status: 'received' });
      const request = createApprovalRequest();
      const userRole: UserRole = 'manager';

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(false);

      const result = await approvalWorkflowService.approvePurchaseOrder(
        purchaseOrder,
        request,
        userRole
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot approve purchase order in status');
      expect(receivingIntegrationService.onPurchaseOrderApproved).not.toHaveBeenCalled();
    });

    it('should not call integration when approval process throws error', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createApprovalRequest();
      const userRole: UserRole = 'manager';

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockRejectedValue(
        new Error('Audit service failed')
      );

      const result = await approvalWorkflowService.approvePurchaseOrder(
        purchaseOrder,
        request,
        userRole
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Audit service failed');
      expect(receivingIntegrationService.onPurchaseOrderApproved).not.toHaveBeenCalled();
    });
  });

  describe('Different User Roles', () => {
    const testRoles: UserRole[] = ['admin', 'manager', 'employee', 'accountant'];

    testRoles.forEach(role => {
      it(`should pass correct user role (${role}) to integration service`, async () => {
        const purchaseOrder = createMockPurchaseOrder();
        const request = createApprovalRequest();

        vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
        vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
        vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
        vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
        vi.mocked(receivingIntegrationService.onPurchaseOrderApproved).mockResolvedValue({
          success: true,
          receivingQueueUpdated: true,
          notificationsSent: 1
        });

        const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
          .mockResolvedValue(undefined);

        await approvalWorkflowService.approvePurchaseOrder(purchaseOrder, request, role);

        expect(receivingIntegrationService.onPurchaseOrderApproved).toHaveBeenCalledWith(
          'po-123',
          expect.objectContaining({
            userRole: role
          })
        );

        updateStatusSpy.mockRestore();
      });
    });
  });

  describe('Integration Timing', () => {
    it('should call integration after all approval steps complete', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createApprovalRequest();
      const userRole: UserRole = 'manager';

      const callOrder: string[] = [];

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockImplementation(async () => {
        callOrder.push('audit');
      });
      vi.mocked(notificationService.sendApprovalDecision).mockImplementation(async () => {
        callOrder.push('notification');
      });
      vi.mocked(receivingIntegrationService.onPurchaseOrderApproved).mockImplementation(async () => {
        callOrder.push('integration');
        return { success: true, receivingQueueUpdated: true, notificationsSent: 1 };
      });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockImplementation(async () => {
          callOrder.push('status_update');
        });

      await approvalWorkflowService.approvePurchaseOrder(purchaseOrder, request, userRole);

      expect(callOrder).toEqual(['status_update', 'audit', 'notification', 'integration']);

      updateStatusSpy.mockRestore();
    });
  });
});