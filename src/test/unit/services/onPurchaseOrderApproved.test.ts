import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  receivingIntegrationService,
  ApprovalContext,
  IntegrationResult
} from '../../../services/receivingIntegrationService';
import { receivingDashboardService } from '../../../services/receivingDashboardService';
import { auditService } from '../../../services/auditService';
import { UserRole } from '../../../types/auth';

// Mock dependencies
vi.mock('../../../services/receivingDashboardService', () => ({
  receivingDashboardService: {
    getReceivingQueue: vi.fn()
  }
}));

vi.mock('../../../services/auditService', () => ({
  auditService: {
    logPurchaseOrderAction: vi.fn()
  }
}));

describe('onPurchaseOrderApproved Event Handler', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const createApprovalContext = (overrides: Partial<ApprovalContext> = {}): ApprovalContext => ({
    approvedBy: 'user-123',
    approvedAt: new Date('2024-01-15T10:00:00Z'),
    reason: 'Approved for procurement',
    userRole: 'manager' as UserRole,
    ...overrides
  });

  describe('Successful Processing', () => {
    it('should process approval with all required steps', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext({
        comments: 'Urgent order for Q1 inventory'
      });

      // Mock successful dependencies
      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result: IntegrationResult = await receivingIntegrationService.onPurchaseOrderApproved(
        purchaseOrderId,
        approvalContext
      );

      // Verify successful result
      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(true);
      expect(result.notificationsSent).toBe(1);
      expect(result.auditLogId).toBe('audit-log-789');
      expect(result.error).toBeUndefined();
    });

    it('should refresh receiving queue', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext();

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      await receivingIntegrationService.onPurchaseOrderApproved(purchaseOrderId, approvalContext);

      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledOnce();
    });

    it('should log audit trail with correct metadata', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext({
        approvedBy: 'manager@fbms.com',
        reason: 'Budget approved by finance',
        comments: 'Supplier verified',
        userRole: 'admin' as UserRole
      });

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      await receivingIntegrationService.onPurchaseOrderApproved(purchaseOrderId, approvalContext);

      expect(auditService.logPurchaseOrderAction).toHaveBeenCalledWith({
        purchaseOrderId: 'po-12345',
        purchaseOrderNumber: '12345', // Should extract last 8 chars
        action: 'receiving_integration',
        performedBy: 'manager@fbms.com',
        performedByName: 'manager@fbms.com',
        timestamp: approvalContext.approvedAt,
        reason: 'Approved PO integrated with receiving queue: Budget approved by finance',
        metadata: {
          integrationEventId: expect.stringMatching(/^approval_po-12345_\d+$/),
          receivingQueueChange: 'added',
          approverRole: 'admin'
        }
      });
    });

    it('should generate unique integration event IDs', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext();

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-1');

      // Call multiple times
      const results = await Promise.all([
        receivingIntegrationService.onPurchaseOrderApproved(purchaseOrderId, approvalContext),
        receivingIntegrationService.onPurchaseOrderApproved(purchaseOrderId, approvalContext)
      ]);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);

      // Verify unique event IDs were generated
      const calls = vi.mocked(auditService.logPurchaseOrderAction).mock.calls;
      const eventId1 = calls[0][0].metadata?.integrationEventId;
      const eventId2 = calls[1][0].metadata?.integrationEventId;
      expect(eventId1).not.toBe(eventId2);
    });

    it('should handle approval context without comments', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext();
      delete (approvalContext as any).comments; // Remove comments field

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderApproved(
        purchaseOrderId,
        approvalContext
      );

      expect(result.success).toBe(true);

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      expect(auditCall.metadata?.comments).toBeUndefined();
    });

    it('should handle different user roles', async () => {
      const purchaseOrderId = 'po-12345';
      const userRoles: UserRole[] = ['admin', 'manager', 'employee', 'accountant'];

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      for (const role of userRoles) {
        const approvalContext = createApprovalContext({ userRole: role });
        
        const result = await receivingIntegrationService.onPurchaseOrderApproved(
          purchaseOrderId,
          approvalContext
        );

        expect(result.success).toBe(true);
        
        const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls.pop();
        expect(auditCall?.[0].metadata?.approverRole).toBe(role);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle receiving queue refresh failure', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext();

      const error = new Error('Database connection timeout');
      vi.mocked(receivingDashboardService.getReceivingQueue).mockRejectedValue(error);

      const result = await receivingIntegrationService.onPurchaseOrderApproved(
        purchaseOrderId,
        approvalContext
      );

      expect(result.success).toBe(false);
      expect(result.receivingQueueUpdated).toBe(false);
      expect(result.error).toBe('Database connection timeout');
      expect(result.notificationsSent).toBe(0);
      expect(result.auditLogId).toBeUndefined();
    });

    it('should handle audit logging failure', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext();

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockRejectedValue(
        new Error('Audit service unavailable')
      );

      const result = await receivingIntegrationService.onPurchaseOrderApproved(
        purchaseOrderId,
        approvalContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Audit service unavailable');
    });

    it('should handle unexpected error types', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext();

      // Mock non-Error object being thrown
      vi.mocked(receivingDashboardService.getReceivingQueue).mockRejectedValue('String error');

      const result = await receivingIntegrationService.onPurchaseOrderApproved(
        purchaseOrderId,
        approvalContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should handle null/undefined errors', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext();

      vi.mocked(receivingDashboardService.getReceivingQueue).mockRejectedValue(null);

      const result = await receivingIntegrationService.onPurchaseOrderApproved(
        purchaseOrderId,
        approvalContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log processing start', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext();

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      await receivingIntegrationService.onPurchaseOrderApproved(purchaseOrderId, approvalContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Processing approval integration for PO po-12345'
      );
    });

    it('should log errors', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const error = new Error('Test error');
      vi.mocked(receivingDashboardService.getReceivingQueue).mockRejectedValue(error);

      await receivingIntegrationService.onPurchaseOrderApproved(purchaseOrderId, approvalContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in onPurchaseOrderApproved:', error);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Integration Event Creation', () => {
    it('should create proper integration event structure', async () => {
      const purchaseOrderId = 'po-12345';
      const approvalContext = createApprovalContext({
        approvedBy: 'user@test.com',
        reason: 'Budget approved',
        comments: 'Test comment',
        userRole: 'manager' as UserRole
      });

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      await receivingIntegrationService.onPurchaseOrderApproved(purchaseOrderId, approvalContext);

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      
      // Verify integration event metadata structure
      expect(auditCall.metadata).toMatchObject({
        integrationEventId: expect.stringMatching(/^approval_po-12345_\d+$/),
        receivingQueueChange: 'added',
        approverRole: 'manager'
      });

      // Verify context is properly captured
      expect(auditCall.metadata?.integrationEventId).toMatch(/^approval_/);
    });

    it('should handle long purchase order IDs', async () => {
      const purchaseOrderId = 'po-very-long-purchase-order-id-12345678901234567890';
      const approvalContext = createApprovalContext();

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      await receivingIntegrationService.onPurchaseOrderApproved(purchaseOrderId, approvalContext);

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      expect(auditCall.purchaseOrderNumber).toBe('34567890'); // Last 8 chars
    });
  });
});