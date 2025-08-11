import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  receivingIntegrationService,
  StatusChangeContext,
  IntegrationResult
} from '../../../services/receivingIntegrationService';
import { receivingDashboardService } from '../../../services/receivingDashboardService';
import { auditService } from '../../../services/auditService';
import { EnhancedPurchaseOrderStatus } from '../../../types/business';

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

describe('onPurchaseOrderStatusChanged Event Handler', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const createStatusChangeContext = (
    previous: EnhancedPurchaseOrderStatus,
    current: EnhancedPurchaseOrderStatus,
    overrides: Partial<StatusChangeContext> = {}
  ): StatusChangeContext => ({
    changedBy: 'user-123',
    changedAt: new Date('2024-01-15T10:00:00Z'),
    reason: 'Status updated',
    previousStatus: previous,
    newStatus: current,
    ...overrides
  });

  describe('Receiving Queue Addition (Non-receivable -> Receivable)', () => {
    it('should add PO to receiving queue when transitioning draft -> approved', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('draft', 'approved');

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'draft',
        'approved',
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(true);
      expect(result.notificationsSent).toBe(0); // No notifications for approval transition
      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledOnce();

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      expect(auditCall.metadata?.receivingQueueChange).toBe('added');
    });

    it('should add PO to receiving queue when transitioning pending_approval -> approved', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('pending_approval', 'approved');

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'pending_approval',
        'approved',
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(true);

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      expect(auditCall.metadata?.receivingQueueChange).toBe('added');
    });
  });

  describe('Receiving Queue Removal (Receivable -> Non-receivable)', () => {
    it('should remove PO from receiving queue when transitioning approved -> cancelled', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('approved', 'cancelled', {
        reason: 'Budget cancelled'
      });

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'approved',
        'cancelled',
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(true);
      expect(result.notificationsSent).toBe(1); // Cancellation notification sent
      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledOnce();

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      expect(auditCall.metadata?.receivingQueueChange).toBe('removed');
    });

    it('should remove PO from receiving queue when transitioning sent_to_supplier -> fully_received', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('sent_to_supplier', 'fully_received');

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'sent_to_supplier',
        'fully_received',
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(true);
      expect(result.notificationsSent).toBe(0); // No notification for completion

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      expect(auditCall.metadata?.receivingQueueChange).toBe('removed');
    });
  });

  describe('Receiving Queue Updates (Receivable -> Receivable)', () => {
    it('should update PO in receiving queue when transitioning approved -> sent_to_supplier', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('approved', 'sent_to_supplier');

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'approved',
        'sent_to_supplier',
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(true);
      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledOnce();

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      expect(auditCall.metadata?.receivingQueueChange).toBe('updated');
    });

    it('should update PO in receiving queue when transitioning sent_to_supplier -> partially_received', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('sent_to_supplier', 'partially_received');

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'sent_to_supplier',
        'partially_received',
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(true);

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      expect(auditCall.metadata?.receivingQueueChange).toBe('updated');
    });
  });

  describe('No Receiving Queue Changes (Non-receivable -> Non-receivable)', () => {
    it('should not update receiving queue when transitioning draft -> pending_approval', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('draft', 'pending_approval');

      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'draft',
        'pending_approval',
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(false);
      expect(receivingDashboardService.getReceivingQueue).not.toHaveBeenCalled();

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      expect(auditCall.metadata?.receivingQueueChange).toBe('none');
    });

    it('should not update receiving queue when transitioning fully_received -> closed', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('fully_received', 'closed');

      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'fully_received',
        'closed',
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(false);
      expect(receivingDashboardService.getReceivingQueue).not.toHaveBeenCalled();
    });
  });

  describe('Audit Trail Logging', () => {
    it('should log status change with proper metadata', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('approved', 'sent_to_supplier', {
        changedBy: 'manager@fbms.com',
        reason: 'Order sent to supplier'
      });

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'approved',
        'sent_to_supplier',
        context
      );

      expect(auditService.logPurchaseOrderAction).toHaveBeenCalledWith({
        purchaseOrderId: 'po-12345',
        purchaseOrderNumber: '12345',
        action: 'receiving_integration',
        performedBy: 'manager@fbms.com',
        performedByName: 'manager@fbms.com',
        timestamp: context.changedAt,
        reason: 'Status change integrated with receiving queue: approved -> sent_to_supplier',
        metadata: {
          integrationEventId: expect.stringMatching(/^status_change_po-12345_\d+$/),
          receivingQueueChange: 'updated',
          previousStatus: 'approved',
          newStatus: 'sent_to_supplier'
        }
      });
    });

    it('should include unique integration event IDs', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('draft', 'approved');

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-1');

      // Call multiple times
      await Promise.all([
        receivingIntegrationService.onPurchaseOrderStatusChanged(
          purchaseOrderId, 'draft', 'approved', context
        ),
        receivingIntegrationService.onPurchaseOrderStatusChanged(
          purchaseOrderId, 'approved', 'sent_to_supplier', context
        )
      ]);

      const calls = vi.mocked(auditService.logPurchaseOrderAction).mock.calls;
      const eventId1 = calls[0][0].metadata?.integrationEventId;
      const eventId2 = calls[1][0].metadata?.integrationEventId;
      expect(eventId1).not.toBe(eventId2);
      expect(eventId1).toMatch(/^status_change_/);
      expect(eventId2).toMatch(/^status_change_/);
    });
  });

  describe('Notification Handling', () => {
    it('should send cancellation notification only for cancelled status', async () => {
      const transitions = [
        { from: 'approved', to: 'cancelled', expectNotification: true },
        { from: 'sent_to_supplier', to: 'cancelled', expectNotification: true },
        { from: 'approved', to: 'sent_to_supplier', expectNotification: false },
        { from: 'sent_to_supplier', to: 'partially_received', expectNotification: false }
      ] as const;

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      for (const { from, to, expectNotification } of transitions) {
        vi.clearAllMocks();
        
        const context = createStatusChangeContext(from, to);
        
        const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
          'po-test',
          from,
          to,
          context
        );

        expect(result.notificationsSent).toBe(expectNotification ? 1 : 0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle receiving queue refresh failure', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('draft', 'approved');

      const error = new Error('Database timeout');
      vi.mocked(receivingDashboardService.getReceivingQueue).mockRejectedValue(error);

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'draft',
        'approved',
        context
      );

      expect(result.success).toBe(false);
      expect(result.receivingQueueUpdated).toBe(false);
      expect(result.error).toBe('Database timeout');
    });

    it('should handle audit logging failure', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('draft', 'pending_approval');

      vi.mocked(auditService.logPurchaseOrderAction).mockRejectedValue(
        new Error('Audit service down')
      );

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'draft',
        'pending_approval',
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Audit service down');
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log processing start with status transition', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('approved', 'sent_to_supplier');

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'approved',
        'sent_to_supplier',
        context
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Processing status change integration for PO po-12345: approved -> sent_to_supplier'
      );
    });

    it('should log errors with context', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('draft', 'approved');

      const error = new Error('Test error');
      vi.mocked(receivingDashboardService.getReceivingQueue).mockRejectedValue(error);

      await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'draft',
        'approved',
        context
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in onPurchaseOrderStatusChanged:',
        error
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle same status transition', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('approved', 'approved');

      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'approved',
        'approved',
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(false);
      expect(receivingDashboardService.getReceivingQueue).not.toHaveBeenCalled();

      const auditCall = vi.mocked(auditService.logPurchaseOrderAction).mock.calls[0][0];
      expect(auditCall.metadata?.receivingQueueChange).toBe('none');
    });

    it('should handle context without reason', async () => {
      const purchaseOrderId = 'po-12345';
      const context = createStatusChangeContext('draft', 'approved');
      delete (context as any).reason;

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-789');

      const result = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        'draft',
        'approved',
        context
      );

      expect(result.success).toBe(true);
    });
  });
});