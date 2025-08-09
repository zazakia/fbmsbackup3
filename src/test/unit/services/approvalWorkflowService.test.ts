import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  approvalWorkflowService,
  ApprovalRequest,
  BulkApprovalRequest,
  RejectionRequest
} from '../../../services/approvalWorkflowService';
import { notificationService } from '../../../services/notificationService';
import { auditService } from '../../../services/auditService';
import { purchaseOrderStateMachine } from '../../../services/purchaseOrderStateMachine';
import { validatePurchaseOrderApproval } from '../../../utils/purchaseOrderPermissions';
import { PurchaseOrder, PurchaseOrderItem } from '../../../types/business';
import { UserRole } from '../../../types/auth';

// Mock dependencies
vi.mock('../../../services/notificationService');
vi.mock('../../../services/auditService');
vi.mock('../../../services/purchaseOrderStateMachine');
vi.mock('../../../utils/purchaseOrderPermissions');

const mockNotificationService = notificationService as any;
const mockAuditService = auditService as any;
const mockStateMachine = purchaseOrderStateMachine as any;
const mockValidateApproval = validatePurchaseOrderApproval as Mock;

describe('ApprovalWorkflowService', () => {
  let samplePO: PurchaseOrder;
  let samplePOItem: PurchaseOrderItem;
  let approvalRequest: ApprovalRequest;
  let rejectionRequest: RejectionRequest;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Sample purchase order item
    samplePOItem = {
      id: 'item1',
      productId: 'prod1',
      productName: 'Test Product',
      sku: 'TEST-001',
      quantity: 10,
      cost: 100,
      total: 1000
    };

    // Sample purchase order
    samplePO = {
      id: 'po1',
      poNumber: 'PO-2024-001',
      supplierId: 'supplier1',
      supplierName: 'Test Supplier',
      items: [samplePOItem],
      subtotal: 1000,
      tax: 120,
      total: 1120,
      status: 'draft',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    // Sample approval request
    approvalRequest = {
      purchaseOrderId: 'po1',
      reason: 'Budget approved',
      comments: 'All requirements met',
      userId: 'user1',
      userEmail: 'approver@test.com',
      timestamp: new Date().toISOString(),
      reasonId: 'standard_approval'
    };

    // Sample rejection request
    rejectionRequest = {
      purchaseOrderId: 'po1',
      reason: 'Insufficient budget',
      comments: 'Budget allocation needs review',
      userId: 'user1',
      userEmail: 'approver@test.com',
      timestamp: new Date().toISOString(),
      reasonId: 'insufficient_budget'
    };

    // Default mock implementations
    mockValidateApproval.mockReturnValue({ isValid: true });
    mockStateMachine.canTransition = vi.fn().mockReturnValue(true);
    mockAuditService.logPurchaseOrderAction = vi.fn().mockResolvedValue(undefined);
    mockNotificationService.sendApprovalDecision = vi.fn().mockResolvedValue([]);
  });

  describe('approvePurchaseOrder', () => {
    it('should successfully approve a valid purchase order', async () => {
      // Arrange
      const userRole: UserRole = 'manager';

      // Act
      const result = await approvalWorkflowService.approvePurchaseOrder(
        samplePO,
        approvalRequest,
        userRole
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.purchaseOrderId).toBe('po1');
      expect(result.previousStatus).toBe('draft');
      expect(result.newStatus).toBe('approved');

      // Verify permissions were checked
      expect(mockValidateApproval).toHaveBeenCalledWith(userRole, samplePO.total, samplePO);

      // Verify state transition was validated
      expect(mockStateMachine.canTransition).toHaveBeenCalledWith('draft', 'approved');

      // Verify audit logging
      expect(mockAuditService.logPurchaseOrderAction).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseOrderId: 'po1',
          action: 'status_changed',
          performedBy: 'user1'
        })
      );

      // Verify notification was sent
      expect(mockNotificationService.sendApprovalDecision).toHaveBeenCalledWith(
        samplePO,
        'approved',
        expect.objectContaining({
          name: 'approver@test.com',
          email: 'approver@test.com',
          role: userRole
        }),
        'Budget approved',
        'All requirements met'
      );
    });

    it('should fail approval when user lacks permission', async () => {
      // Arrange
      const userRole: UserRole = 'employee';
      mockValidateApproval.mockReturnValue({
        isValid: false,
        reason: 'User does not have permission to approve purchase orders'
      });

      // Act
      const result = await approvalWorkflowService.approvePurchaseOrder(
        samplePO,
        approvalRequest,
        userRole
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User does not have permission to approve purchase orders');
      expect(mockNotificationService.sendApprovalDecision).not.toHaveBeenCalled();
    });

    it('should fail approval when status transition is invalid', async () => {
      // Arrange
      const userRole: UserRole = 'manager';
      samplePO.status = 'received'; // Cannot approve a received order
      mockStateMachine.canTransition.mockReturnValue(false);

      // Act
      const result = await approvalWorkflowService.approvePurchaseOrder(
        samplePO,
        approvalRequest,
        userRole
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot approve purchase order in status: fully_received');
    });

    it('should handle approval amount limits for managers', async () => {
      // Arrange
      const userRole: UserRole = 'manager';
      const highValuePO = { ...samplePO, total: 150000 }; // Above manager limit
      mockValidateApproval.mockReturnValue({
        isValid: false,
        reason: 'Approval amount 150000 exceeds limit 100000 for role manager'
      });

      // Act
      const result = await approvalWorkflowService.approvePurchaseOrder(
        highValuePO,
        approvalRequest,
        userRole
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds limit');
    });
  });

  describe('rejectPurchaseOrder', () => {
    it('should successfully reject a valid purchase order', async () => {
      // Arrange
      const userRole: UserRole = 'manager';

      // Act
      const result = await approvalWorkflowService.rejectPurchaseOrder(
        samplePO,
        rejectionRequest,
        userRole
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.purchaseOrderId).toBe('po1');
      expect(result.previousStatus).toBe('draft');
      expect(result.newStatus).toBe('cancelled');

      // Verify notification was sent
      expect(mockNotificationService.sendApprovalDecision).toHaveBeenCalledWith(
        samplePO,
        'rejected',
        expect.objectContaining({
          role: userRole
        }),
        'Insufficient budget',
        'Budget allocation needs review'
      );
    });

    it('should fail rejection when user lacks permission', async () => {
      // Arrange
      const userRole: UserRole = 'cashier';
      mockValidateApproval.mockReturnValue({
        isValid: false,
        reason: 'User does not have permission to approve purchase orders'
      });

      // Act
      const result = await approvalWorkflowService.rejectPurchaseOrder(
        samplePO,
        rejectionRequest,
        userRole
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User does not have permission to approve purchase orders');
    });
  });

  describe('bulkApprovePurchaseOrders', () => {
    let multiplePOs: PurchaseOrder[];
    let bulkRequest: BulkApprovalRequest;

    beforeEach(() => {
      multiplePOs = [
        { ...samplePO, id: 'po1', poNumber: 'PO-2024-001', total: 5000 },
        { ...samplePO, id: 'po2', poNumber: 'PO-2024-002', total: 8000 },
        { ...samplePO, id: 'po3', poNumber: 'PO-2024-003', total: 12000 }
      ];

      bulkRequest = {
        purchaseOrderIds: ['po1', 'po2', 'po3'],
        reason: 'Bulk approval for monthly orders',
        comments: 'All orders reviewed and approved',
        userId: 'user1',
        userEmail: 'manager@test.com',
        timestamp: new Date().toISOString(),
        reasonId: 'bulk_approval'
      };
    });

    it('should successfully approve multiple purchase orders', async () => {
      // Arrange
      const userRole: UserRole = 'manager';

      // Act
      const result = await approvalWorkflowService.bulkApprovePurchaseOrders(
        multiplePOs,
        bulkRequest,
        userRole
      );

      // Assert
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.results).toHaveLength(3);

      // Verify all orders were processed
      result.results.forEach(r => expect(r.success).toBe(true));

      // Verify bulk notification was sent
      expect(mockNotificationService.sendBulkApprovalNotification).toHaveBeenCalledWith(
        multiplePOs,
        'approved',
        expect.objectContaining({
          email: 'manager@test.com',
          role: userRole
        }),
        'Bulk approval for monthly orders'
      );
    });

    it('should handle partial failures in bulk approval', async () => {
      // Arrange
      const userRole: UserRole = 'manager';
      
      // Make second PO fail permission check
      mockValidateApproval
        .mockReturnValueOnce({ isValid: true })  // First PO succeeds
        .mockReturnValueOnce({ isValid: false, reason: 'Amount too high' }) // Second PO fails
        .mockReturnValueOnce({ isValid: true }); // Third PO succeeds

      // Act
      const result = await approvalWorkflowService.bulkApprovePurchaseOrders(
        multiplePOs,
        bulkRequest,
        userRole
      );

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toContain('PO-2024-002: Amount too high');

      // Verify only successful orders are in notification
      const successfulPOs = [multiplePOs[0], multiplePOs[2]];
      expect(mockNotificationService.sendBulkApprovalNotification).toHaveBeenCalledWith(
        successfulPOs,
        'approved',
        expect.anything(),
        expect.anything()
      );
    });

    it('should handle all failures in bulk approval', async () => {
      // Arrange
      const userRole: UserRole = 'employee';
      mockValidateApproval.mockReturnValue({
        isValid: false,
        reason: 'Employee role cannot approve purchase orders'
      });

      // Act
      const result = await approvalWorkflowService.bulkApprovePurchaseOrders(
        multiplePOs,
        bulkRequest,
        userRole
      );

      // Assert
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(3);
      expect(result.errors).toHaveLength(3);

      // Verify no notification was sent for successful orders
      expect(mockNotificationService.sendBulkApprovalNotification).not.toHaveBeenCalled();
    });
  });

  describe('validateApprovalThresholds', () => {
    it('should validate manager approval limits', () => {
      // Arrange
      const userRole: UserRole = 'manager';
      const highValuePOs = [
        { ...samplePO, total: 60000 },
        { ...samplePO, total: 50000 }
      ];

      // Act
      const result = approvalWorkflowService.validateApprovalThresholds(highValuePOs, userRole);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain(expect.stringContaining('exceeds limit'));
    });

    it('should allow admin to approve any amount', () => {
      // Arrange
      const userRole: UserRole = 'admin';
      const veryHighValuePOs = [
        { ...samplePO, total: 500000 },
        { ...samplePO, total: 300000 }
      ];

      // Act
      const result = approvalWorkflowService.validateApprovalThresholds(veryHighValuePOs, userRole);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject approval for roles without permission', () => {
      // Arrange
      const userRole: UserRole = 'cashier';
      const lowValuePOs = [{ ...samplePO, total: 1000 }];

      // Act
      const result = approvalWorkflowService.validateApprovalThresholds(lowValuePOs, userRole);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Role cashier cannot approve purchase orders');
    });

    it('should validate high-value orders requiring manager approval', () => {
      // Arrange
      const userRole: UserRole = 'employee';
      const highValuePOs = [{ ...samplePO, total: 75000 }];

      // Act
      const result = approvalWorkflowService.validateApprovalThresholds(highValuePOs, userRole);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('High-value orders require manager or admin approval');
    });
  });

  describe('sendOverdueApprovalReminders', () => {
    beforeEach(() => {
      // Mock the private method by spying on the service
      vi.spyOn(approvalWorkflowService as any, 'getOverduePurchaseOrders')
        .mockResolvedValue([]);
      vi.spyOn(approvalWorkflowService as any, 'getApprovingUsers')
        .mockResolvedValue([
          { email: 'manager@test.com', name: 'Test Manager', role: 'manager' }
        ]);
    });

    it('should send reminders for overdue approvals', async () => {
      // Arrange
      const overduePOs = [
        { ...samplePO, id: 'po1', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, // 5 days ago
        { ...samplePO, id: 'po2', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } // 10 days ago
      ];

      vi.spyOn(approvalWorkflowService as any, 'getOverduePurchaseOrders')
        .mockResolvedValue(overduePOs);

      mockNotificationService.sendOverdueReminder = vi.fn().mockResolvedValue([]);

      // Act
      const result = await approvalWorkflowService.sendOverdueApprovalReminders('manager');

      // Assert
      expect(result.sent).toBe(2);
      expect(result.message).toContain('Sent 2 overdue approval reminders');
      expect(mockNotificationService.sendOverdueReminder).toHaveBeenCalledTimes(2);
    });

    it('should handle case with no overdue approvals', async () => {
      // Arrange - default mock returns empty array

      // Act
      const result = await approvalWorkflowService.sendOverdueApprovalReminders('manager');

      // Assert
      expect(result.sent).toBe(0);
      expect(result.message).toBe('No overdue approvals found');
      expect(mockNotificationService.sendOverdueReminder).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      vi.spyOn(approvalWorkflowService as any, 'getOverduePurchaseOrders')
        .mockRejectedValue(new Error('Database error'));

      // Act
      const result = await approvalWorkflowService.sendOverdueApprovalReminders('manager');

      // Assert
      expect(result.sent).toBe(0);
      expect(result.error).toBe('Failed to send reminders');
    });
  });

  describe('getApprovalStats', () => {
    it('should return approval workflow statistics', async () => {
      // Act
      const stats = await approvalWorkflowService.getApprovalStats('manager');

      // Assert
      expect(stats).toHaveProperty('pendingApprovals');
      expect(stats).toHaveProperty('totalApproved');
      expect(stats).toHaveProperty('totalRejected');
      expect(stats).toHaveProperty('averageApprovalTime');
      expect(stats).toHaveProperty('approvalRate');
      expect(stats).toHaveProperty('overdueApprovals');
      expect(stats).toHaveProperty('highValuePending');
    });

    it('should accept date range filter', async () => {
      // Arrange
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31')
      };

      // Act
      const stats = await approvalWorkflowService.getApprovalStats('manager', dateRange);

      // Assert
      expect(stats).toBeDefined();
    });
  });

  describe('getApprovalHistory', () => {
    it('should retrieve approval history for a purchase order', async () => {
      // Arrange
      const mockHistory = [
        {
          id: 'audit1',
          purchaseOrderId: 'po1',
          action: 'status_changed',
          performedBy: 'user1',
          timestamp: new Date(),
          oldValues: { status: 'draft' },
          newValues: { status: 'approved' }
        }
      ];

      mockAuditService.getPurchaseOrderAuditLog = vi.fn().mockResolvedValue(mockHistory);

      // Act
      const history = await approvalWorkflowService.getApprovalHistory('po1');

      // Assert
      expect(history).toEqual(mockHistory);
      expect(mockAuditService.getPurchaseOrderAuditLog).toHaveBeenCalledWith('po1', {
        actions: ['status_changed', 'approved', 'rejected']
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors during approval', async () => {
      // Arrange
      const userRole: UserRole = 'manager';
      mockAuditService.logPurchaseOrderAction.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await approvalWorkflowService.approvePurchaseOrder(
        samplePO,
        approvalRequest,
        userRole
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle notification service errors', async () => {
      // Arrange
      const userRole: UserRole = 'manager';
      mockNotificationService.sendApprovalDecision.mockRejectedValue(new Error('Email service down'));

      // Act
      const result = await approvalWorkflowService.approvePurchaseOrder(
        samplePO,
        approvalRequest,
        userRole
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service down');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete approval workflow with notifications and audit', async () => {
      // Arrange
      const userRole: UserRole = 'manager';
      let auditCallCount = 0;
      let notificationCallCount = 0;

      mockAuditService.logPurchaseOrderAction = vi.fn(() => {
        auditCallCount++;
        return Promise.resolve();
      });

      mockNotificationService.sendApprovalDecision = vi.fn(() => {
        notificationCallCount++;
        return Promise.resolve([]);
      });

      // Act
      const result = await approvalWorkflowService.approvePurchaseOrder(
        samplePO,
        approvalRequest,
        userRole
      );

      // Assert
      expect(result.success).toBe(true);
      expect(auditCallCount).toBe(1);
      expect(notificationCallCount).toBe(1);

      // Verify the sequence of operations - all functions were called
      expect(mockValidateApproval).toHaveBeenCalled();
      expect(mockAuditService.logPurchaseOrderAction).toHaveBeenCalled();
      expect(mockNotificationService.sendApprovalDecision).toHaveBeenCalled();
    });

    it('should handle edge case of zero-amount purchase orders', async () => {
      // Arrange
      const userRole: UserRole = 'manager';
      const zeroPO = { ...samplePO, total: 0, subtotal: 0, tax: 0 };

      // Act
      const result = await approvalWorkflowService.approvePurchaseOrder(
        zeroPO,
        approvalRequest,
        userRole
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockValidateApproval).toHaveBeenCalledWith(userRole, 0, zeroPO);
    });
  });
});