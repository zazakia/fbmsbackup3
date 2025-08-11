import { describe, it, expect } from 'vitest';
import { 
  ApprovalContext,
  IntegrationResult,
  ValidationResult,
  IntegrationEvent,
  StatusChangeContext
} from '../../../services/receivingIntegrationService';
import { UserRole } from '../../../types/auth';
import { EnhancedPurchaseOrderStatus } from '../../../types/business';

describe('Receiving Integration Types', () => {
  describe('ApprovalContext', () => {
    it('should validate required fields', () => {
      const validContext: ApprovalContext = {
        approvedBy: 'user-123',
        approvedAt: new Date(),
        reason: 'Test approval',
        userRole: 'manager' as UserRole
      };

      expect(validContext.approvedBy).toBeTruthy();
      expect(validContext.approvedAt).toBeInstanceOf(Date);
      expect(validContext.reason).toBeTruthy();
      expect(validContext.userRole).toBeTruthy();
    });

    it('should handle optional comments field', () => {
      const contextWithComments: ApprovalContext = {
        approvedBy: 'user-123',
        approvedAt: new Date(),
        reason: 'Test approval',
        comments: 'Additional notes',
        userRole: 'admin' as UserRole
      };

      expect(contextWithComments.comments).toBe('Additional notes');

      const contextWithoutComments: ApprovalContext = {
        approvedBy: 'user-123',
        approvedAt: new Date(),
        reason: 'Test approval',
        userRole: 'manager' as UserRole
      };

      expect(contextWithoutComments.comments).toBeUndefined();
    });

    it('should support different user roles', () => {
      const roles: UserRole[] = ['admin', 'manager', 'employee', 'accountant'];
      
      roles.forEach(role => {
        const context: ApprovalContext = {
          approvedBy: 'user-123',
          approvedAt: new Date(),
          reason: 'Test approval',
          userRole: role
        };

        expect(context.userRole).toBe(role);
      });
    });
  });

  describe('IntegrationResult', () => {
    it('should validate successful integration result', () => {
      const successResult: IntegrationResult = {
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 2,
        auditLogId: 'audit-123'
      };

      expect(successResult.success).toBe(true);
      expect(successResult.receivingQueueUpdated).toBe(true);
      expect(successResult.notificationsSent).toBe(2);
      expect(successResult.auditLogId).toBe('audit-123');
      expect(successResult.error).toBeUndefined();
    });

    it('should validate failed integration result', () => {
      const failureResult: IntegrationResult = {
        success: false,
        receivingQueueUpdated: false,
        error: 'Database connection failed',
        notificationsSent: 0
      };

      expect(failureResult.success).toBe(false);
      expect(failureResult.receivingQueueUpdated).toBe(false);
      expect(failureResult.error).toBe('Database connection failed');
      expect(failureResult.notificationsSent).toBe(0);
      expect(failureResult.auditLogId).toBeUndefined();
    });

    it('should handle mixed success scenarios', () => {
      const partialSuccessResult: IntegrationResult = {
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 0, // Notifications failed but queue updated
        auditLogId: 'audit-456'
      };

      expect(partialSuccessResult.success).toBe(true);
      expect(partialSuccessResult.receivingQueueUpdated).toBe(true);
      expect(partialSuccessResult.notificationsSent).toBe(0);
      expect(partialSuccessResult.auditLogId).toBe('audit-456');
    });
  });

  describe('ValidationResult', () => {
    it('should validate successful validation result', () => {
      const validResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      expect(validResult.warnings).toHaveLength(0);
    });

    it('should validate failed validation result', () => {
      const invalidResult: ValidationResult = {
        isValid: false,
        errors: ['Missing supplier', 'Invalid total'],
        warnings: ['No expected date']
      };

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(2);
      expect(invalidResult.errors).toContain('Missing supplier');
      expect(invalidResult.errors).toContain('Invalid total');
      expect(invalidResult.warnings).toHaveLength(1);
      expect(invalidResult.warnings).toContain('No expected date');
    });

    it('should validate result with warnings only', () => {
      const validWithWarnings: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Expected date is in the past', 'No PO number']
      };

      expect(validWithWarnings.isValid).toBe(true);
      expect(validWithWarnings.errors).toHaveLength(0);
      expect(validWithWarnings.warnings).toHaveLength(2);
    });
  });

  describe('IntegrationEvent', () => {
    it('should validate complete integration event', () => {
      const event: IntegrationEvent = {
        id: 'event-123',
        purchaseOrderId: 'po-456',
        eventType: 'po_approved',
        timestamp: new Date(),
        triggeringUser: 'user-789',
        context: {
          reason: 'Approved for purchase',
          userRole: 'manager'
        },
        processingStatus: 'processed',
        retryCount: 0
      };

      expect(event.id).toBe('event-123');
      expect(event.purchaseOrderId).toBe('po-456');
      expect(event.eventType).toBe('po_approved');
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.triggeringUser).toBe('user-789');
      expect(event.context).toEqual({
        reason: 'Approved for purchase',
        userRole: 'manager'
      });
      expect(event.processingStatus).toBe('processed');
      expect(event.retryCount).toBe(0);
      expect(event.errorMessage).toBeUndefined();
    });

    it('should validate event types', () => {
      const eventTypes = ['po_approved', 'po_status_changed', 'po_cancelled'] as const;
      
      eventTypes.forEach(type => {
        const event: IntegrationEvent = {
          id: 'event-123',
          purchaseOrderId: 'po-456',
          eventType: type,
          timestamp: new Date(),
          triggeringUser: 'user-789',
          context: {},
          processingStatus: 'pending',
          retryCount: 0
        };

        expect(event.eventType).toBe(type);
      });
    });

    it('should validate processing statuses', () => {
      const statuses = ['pending', 'processed', 'failed'] as const;
      
      statuses.forEach(status => {
        const event: IntegrationEvent = {
          id: 'event-123',
          purchaseOrderId: 'po-456',
          eventType: 'po_approved',
          timestamp: new Date(),
          triggeringUser: 'user-789',
          context: {},
          processingStatus: status,
          retryCount: 0
        };

        expect(event.processingStatus).toBe(status);
      });
    });

    it('should handle failed event with error message', () => {
      const failedEvent: IntegrationEvent = {
        id: 'event-123',
        purchaseOrderId: 'po-456',
        eventType: 'po_status_changed',
        timestamp: new Date(),
        triggeringUser: 'user-789',
        context: {},
        processingStatus: 'failed',
        retryCount: 3,
        errorMessage: 'Network timeout occurred'
      };

      expect(failedEvent.processingStatus).toBe('failed');
      expect(failedEvent.retryCount).toBe(3);
      expect(failedEvent.errorMessage).toBe('Network timeout occurred');
    });
  });

  describe('StatusChangeContext', () => {
    it('should validate complete status change context', () => {
      const context: StatusChangeContext = {
        changedBy: 'user-123',
        changedAt: new Date(),
        reason: 'Status updated by manager',
        previousStatus: 'draft' as EnhancedPurchaseOrderStatus,
        newStatus: 'approved' as EnhancedPurchaseOrderStatus
      };

      expect(context.changedBy).toBe('user-123');
      expect(context.changedAt).toBeInstanceOf(Date);
      expect(context.reason).toBe('Status updated by manager');
      expect(context.previousStatus).toBe('draft');
      expect(context.newStatus).toBe('approved');
    });

    it('should handle context without reason', () => {
      const context: StatusChangeContext = {
        changedBy: 'user-123',
        changedAt: new Date(),
        previousStatus: 'pending_approval' as EnhancedPurchaseOrderStatus,
        newStatus: 'approved' as EnhancedPurchaseOrderStatus
      };

      expect(context.changedBy).toBe('user-123');
      expect(context.changedAt).toBeInstanceOf(Date);
      expect(context.reason).toBeUndefined();
      expect(context.previousStatus).toBe('pending_approval');
      expect(context.newStatus).toBe('approved');
    });

    it('should validate different status transitions', () => {
      const transitions: Array<{
        from: EnhancedPurchaseOrderStatus;
        to: EnhancedPurchaseOrderStatus;
      }> = [
        { from: 'draft', to: 'pending_approval' },
        { from: 'pending_approval', to: 'approved' },
        { from: 'approved', to: 'sent_to_supplier' },
        { from: 'sent_to_supplier', to: 'partially_received' },
        { from: 'partially_received', to: 'fully_received' },
        { from: 'approved', to: 'cancelled' }
      ];

      transitions.forEach(({ from, to }) => {
        const context: StatusChangeContext = {
          changedBy: 'user-123',
          changedAt: new Date(),
          previousStatus: from,
          newStatus: to
        };

        expect(context.previousStatus).toBe(from);
        expect(context.newStatus).toBe(to);
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce required fields at compile time', () => {
      // This test ensures TypeScript compilation catches missing required fields
      // If this compiles, the types are correctly defined
      
      const approvalContext: ApprovalContext = {
        approvedBy: 'user-123',
        approvedAt: new Date(),
        reason: 'Test',
        userRole: 'admin' as UserRole
        // comments is optional
      };

      const integrationResult: IntegrationResult = {
        success: true,
        receivingQueueUpdated: true,
        notificationsSent: 1
        // error and auditLogId are optional
      };

      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      expect(approvalContext).toBeDefined();
      expect(integrationResult).toBeDefined();
      expect(validationResult).toBeDefined();
    });
  });
});