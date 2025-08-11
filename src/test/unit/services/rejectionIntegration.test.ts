import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approvalWorkflowService, RejectionRequest, ApprovalResult } from '../../../services/approvalWorkflowService';
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
    onPurchaseOrderStatusChanged: vi.fn()
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

describe('Purchase Order Rejection with Receiving Integration', () => {
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
    status: 'approved',
    createdAt: new Date(),
    ...overrides
  });

  const createRejectionRequest = (overrides: Partial<RejectionRequest> = {}): RejectionRequest => ({
    purchaseOrderId: 'po-123',
    reason: 'Budget constraints',
    comments: 'Insufficient funds for this quarter',
    userId: 'manager-456',
    userEmail: 'manager@fbms.com',
    timestamp: '2024-01-15T10:00:00Z',
    ...overrides
  });

  describe('Successful Rejection with Integration', () => {
    it('should reject PO and integrate with receiving successfully', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createRejectionRequest();
      const userRole: UserRole = 'manager';

      // Mock successful validation and state machine
      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      
      // Mock successful receiving integration
      vi.mocked(receivingIntegrationService.onPurchaseOrderStatusChanged).mockResolvedValue({
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 1,
        auditLogId: 'audit-789'
      });

      // Spy on the private method
      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result: ApprovalResult = await approvalWorkflowService.rejectPurchaseOrder(
        purchaseOrder,
        request,
        userRole
      );

      expect(result.success).toBe(true);
      expect(result.purchaseOrderId).toBe('po-123');
      expect(result.previousStatus).toBe('approved');
      expect(result.newStatus).toBe('cancelled');

      // Verify receiving integration was called with correct context
      expect(receivingIntegrationService.onPurchaseOrderStatusChanged).toHaveBeenCalledWith(
        'po-123',
        'approved',
        'cancelled',
        {
          changedBy: 'manager-456',
          changedAt: new Date('2024-01-15T10:00:00Z'),
          reason: 'Rejected: Budget constraints - Insufficient funds for this quarter',
          previousStatus: 'approved',
          newStatus: 'cancelled'
        }
      );

      expect(console.log).toHaveBeenCalledWith('Receiving integration successful for rejected PO po-123');

      updateStatusSpy.mockRestore();
    });

    it('should handle different rejection reasons and comments', async () => {
      const purchaseOrder = createMockPurchaseOrder({ status: 'sent' });
      const request = createRejectionRequest({
        reason: 'Supplier issues',
        comments: 'Supplier cannot deliver on time'
      });
      const userRole: UserRole = 'admin';

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      vi.mocked(receivingIntegrationService.onPurchaseOrderStatusChanged).mockResolvedValue({
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 1
      });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result = await approvalWorkflowService.rejectPurchaseOrder(purchaseOrder, request, userRole);

      expect(result.success).toBe(true);

      // Verify context includes the specific rejection reason
      const integrationCall = vi.mocked(receivingIntegrationService.onPurchaseOrderStatusChanged).mock.calls[0];
      expect(integrationCall[3].reason).toBe('Rejected: Supplier issues - Supplier cannot deliver on time');
      expect(integrationCall[1]).toBe('sent_to_supplier'); // Previous status mapped from 'sent'
      expect(integrationCall[2]).toBe('cancelled');

      updateStatusSpy.mockRestore();
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle receiving integration failure gracefully', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createRejectionRequest();
      const userRole: UserRole = 'manager';

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      
      // Mock receiving integration failure
      vi.mocked(receivingIntegrationService.onPurchaseOrderStatusChanged).mockResolvedValue({
        success: false,
        receivingQueueUpdated: false,
        error: 'Failed to remove from receiving queue',
        notificationsSent: 0
      });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result = await approvalWorkflowService.rejectPurchaseOrder(purchaseOrder, request, userRole);

      // Rejection should still succeed despite integration failure
      expect(result.success).toBe(true);
      expect(result.purchaseOrderId).toBe('po-123');

      // Verify warning was logged
      expect(console.warn).toHaveBeenCalledWith(
        'Receiving integration failed for rejected PO po-123:',
        'Failed to remove from receiving queue'
      );

      updateStatusSpy.mockRestore();
    });

    it('should handle receiving integration exception gracefully', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createRejectionRequest();
      const userRole: UserRole = 'manager';

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      
      // Mock receiving integration exception
      vi.mocked(receivingIntegrationService.onPurchaseOrderStatusChanged).mockRejectedValue(
        new Error('Database connection lost')
      );

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      const result = await approvalWorkflowService.rejectPurchaseOrder(purchaseOrder, request, userRole);

      // Rejection should still succeed despite integration exception
      expect(result.success).toBe(true);
      expect(result.purchaseOrderId).toBe('po-123');

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        'Receiving integration error during rejection:',
        expect.any(Error)
      );

      updateStatusSpy.mockRestore();
    });
  });

  describe('Integration Context Mapping', () => {
    it('should correctly map legacy status to enhanced status for context', async () => {
      const statusMappings = [
        { legacy: 'pending', enhanced: 'pending_approval' },
        { legacy: 'approved', enhanced: 'approved' },
        { legacy: 'sent', enhanced: 'sent_to_supplier' },
        { legacy: 'partial', enhanced: 'partially_received' }
      ];

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      vi.mocked(receivingIntegrationService.onPurchaseOrderStatusChanged).mockResolvedValue({
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 1
      });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      for (const { legacy, enhanced } of statusMappings) {
        vi.clearAllMocks();
        
        const purchaseOrder = createMockPurchaseOrder({ status: legacy as any });
        const request = createRejectionRequest();
        
        await approvalWorkflowService.rejectPurchaseOrder(purchaseOrder, request, 'manager');

        const integrationCall = vi.mocked(receivingIntegrationService.onPurchaseOrderStatusChanged).mock.calls[0];
        expect(integrationCall[1]).toBe(enhanced); // Previous status
        expect(integrationCall[2]).toBe('cancelled'); // New status
      }

      updateStatusSpy.mockRestore();
    });

    it('should create proper status change context', async () => {
      const purchaseOrder = createMockPurchaseOrder({ status: 'approved' });
      const request = createRejectionRequest({
        userId: 'admin@company.com',
        reason: 'Quality concerns',
        comments: 'Product specifications not met',
        timestamp: '2024-02-15T14:30:00Z'
      });
      const userRole: UserRole = 'admin';

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
      vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
      vi.mocked(receivingIntegrationService.onPurchaseOrderStatusChanged).mockResolvedValue({
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 1
      });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockResolvedValue(undefined);

      await approvalWorkflowService.rejectPurchaseOrder(purchaseOrder, request, userRole);

      expect(receivingIntegrationService.onPurchaseOrderStatusChanged).toHaveBeenCalledWith(
        'po-123',
        'approved',
        'cancelled',
        {
          changedBy: 'admin@company.com',
          changedAt: new Date('2024-02-15T14:30:00Z'),
          reason: 'Rejected: Quality concerns - Product specifications not met',
          previousStatus: 'approved',
          newStatus: 'cancelled'
        }
      );

      updateStatusSpy.mockRestore();
    });
  });

  describe('Integration Only After Successful Rejection', () => {
    it('should not call integration when validation fails', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createRejectionRequest();
      const userRole: UserRole = 'employee'; // Insufficient role

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ 
        isValid: false, 
        reason: 'Insufficient permissions' 
      });

      const result = await approvalWorkflowService.rejectPurchaseOrder(purchaseOrder, request, userRole);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
      expect(receivingIntegrationService.onPurchaseOrderStatusChanged).not.toHaveBeenCalled();
    });

    it('should not call integration when state transition is invalid', async () => {
      const purchaseOrder = createMockPurchaseOrder({ status: 'received' });
      const request = createRejectionRequest();
      const userRole: UserRole = 'manager';

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(false);

      const result = await approvalWorkflowService.rejectPurchaseOrder(purchaseOrder, request, userRole);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot reject purchase order in status');
      expect(receivingIntegrationService.onPurchaseOrderStatusChanged).not.toHaveBeenCalled();
    });

    it('should not call integration when rejection process throws error', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createRejectionRequest();
      const userRole: UserRole = 'manager';

      vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
      vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
      vi.mocked(auditService.logPurchaseOrderAction).mockRejectedValue(
        new Error('Audit service failed')
      );

      const result = await approvalWorkflowService.rejectPurchaseOrder(purchaseOrder, request, userRole);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Audit service failed');
      expect(receivingIntegrationService.onPurchaseOrderStatusChanged).not.toHaveBeenCalled();
    });
  });

  describe('Integration Timing', () => {
    it('should call integration after all rejection steps complete', async () => {
      const purchaseOrder = createMockPurchaseOrder();
      const request = createRejectionRequest();
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
      vi.mocked(receivingIntegrationService.onPurchaseOrderStatusChanged).mockImplementation(async () => {
        callOrder.push('integration');
        return { success: true, receivingQueueUpdated: true, notificationsSent: 1 };
      });

      const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
        .mockImplementation(async () => {
          callOrder.push('status_update');
        });

      await approvalWorkflowService.rejectPurchaseOrder(purchaseOrder, request, userRole);

      expect(callOrder).toEqual(['status_update', 'audit', 'notification', 'integration']);

      updateStatusSpy.mockRestore();
    });
  });

  describe('Different Purchase Order States', () => {
    const testScenarios = [
      { status: 'pending', description: 'pending approval' },
      { status: 'approved', description: 'approved' },
      { status: 'sent', description: 'sent to supplier' },
      { status: 'partial', description: 'partially received' }
    ];

    testScenarios.forEach(({ status, description }) => {
      it(`should handle rejection from ${description} status`, async () => {
        const purchaseOrder = createMockPurchaseOrder({ status: status as any });
        const request = createRejectionRequest();
        const userRole: UserRole = 'manager';

        vi.mocked(validatePurchaseOrderApproval).mockReturnValue({ isValid: true });
        vi.mocked(purchaseOrderStateMachine.canTransition).mockReturnValue(true);
        vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue(undefined);
        vi.mocked(notificationService.sendApprovalDecision).mockResolvedValue(undefined);
        vi.mocked(receivingIntegrationService.onPurchaseOrderStatusChanged).mockResolvedValue({
          success: true,
          receivingQueueUpdated: true,
          notificationsSent: 1
        });

        const updateStatusSpy = vi.spyOn(approvalWorkflowService as any, 'updatePurchaseOrderStatus')
          .mockResolvedValue(undefined);

        const result = await approvalWorkflowService.rejectPurchaseOrder(purchaseOrder, request, userRole);

        expect(result.success).toBe(true);
        expect(result.previousStatus).toBe(status);
        expect(result.newStatus).toBe('cancelled');
        expect(receivingIntegrationService.onPurchaseOrderStatusChanged).toHaveBeenCalledWith(
          'po-123',
          expect.any(String), // Previous enhanced status
          'cancelled',
          expect.any(Object)
        );

        updateStatusSpy.mockRestore();
      });
    });
  });
});