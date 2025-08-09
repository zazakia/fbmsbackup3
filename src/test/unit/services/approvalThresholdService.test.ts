import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ApprovalThresholdService,
  approvalThresholdService
} from '../../../services/approvalThresholdService';
import { PurchaseOrder } from '../../../types/business';
import { UserRole } from '../../../types/auth';

// Mock the workflow config service
vi.mock('../../../services/purchaseOrderWorkflowConfigService', () => ({
  purchaseOrderWorkflowConfigService: {
    getApprovalThreshold: vi.fn(),
    getConfig: vi.fn(() => ({
      emailNotifications: {
        escalationSettings: {
          enabled: true,
          levels: [
            { level: 1, afterHours: 24, recipients: [{ type: 'role', value: 'manager' }], priority: 'normal' },
            { level: 2, afterHours: 48, recipients: [{ type: 'role', value: 'admin' }], priority: 'high' }
          ],
          skipWeekends: true,
          skipHolidays: true
        }
      }
    }))
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock purchase order workflow config service
import { purchaseOrderWorkflowConfigService } from '../../../services/purchaseOrderWorkflowConfigService';

describe('ApprovalThresholdService', () => {
  let service: ApprovalThresholdService;

  const mockPurchaseOrder: PurchaseOrder = {
    id: 'po-001',
    poNumber: 'PO-2024-001',
    supplierName: 'Test Supplier',
    supplierCategory: 'standard',
    total: 25000,
    status: 'draft',
    currency: 'PHP',
    paymentTerms: 'Net 30',
    department: 'operations',
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'Test Product',
        category: 'office-supplies',
        quantity: 10,
        unitPrice: 2500,
        totalPrice: 25000
      }
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  } as PurchaseOrder;

  const mockThreshold = {
    id: 'threshold-1',
    name: 'Medium Purchase',
    minAmount: 10000,
    maxAmount: 50000,
    requiredRoles: ['manager' as UserRole, 'admin' as UserRole],
    requiredApprovers: 2,
    escalationTimeHours: 48,
    skipWeekends: true,
    skipHolidays: true,
    priority: 'medium' as const,
    autoApprove: false,
    isActive: true
  };

  const mockInitiator = {
    userId: 'user-1',
    name: 'John Doe',
    role: 'employee' as UserRole
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    service = new ApprovalThresholdService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Approval Request Creation', () => {
    it('should create approval request for valid purchase order', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);

      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);

      expect(request).toBeDefined();
      expect(request!.purchaseOrderId).toBe('po-001');
      expect(request!.threshold).toEqual(mockThreshold);
      expect(request!.requiredApprovals).toBe(2);
      expect(request!.status).toBe('pending');
      expect(request!.receivedApprovals).toHaveLength(0);
      expect(request!.priority).toBe('medium');
    });

    it('should return null when no threshold found', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(null);

      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);

      expect(request).toBeNull();
    });

    it('should set expiration time with escalation', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);

      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);

      expect(request!.expiresAt).toBeDefined();
      const expectedExpiration = new Date(request!.createdAt);
      expectedExpiration.setHours(expectedExpiration.getHours() + 48);
      
      expect(request!.expiresAt!.getTime()).toBeCloseTo(expectedExpiration.getTime(), -10000); // Within 10 seconds
    });

    it('should store request metadata correctly', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);

      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);

      expect(request!.metadata).toEqual({
        initiator: 'user-1',
        initiatorName: 'John Doe',
        totalAmount: 25000,
        supplierName: 'Test Supplier',
        itemCount: 1
      });
    });
  });

  describe('Approval Decision Submission', () => {
    it('should accept valid approval decision', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);
      
      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      const requestId = request!.id;

      const decision = {
        approved: true,
        approver: {
          userId: 'manager-1',
          name: 'Manager Smith',
          role: 'manager' as UserRole,
          email: 'manager@company.com'
        },
        reason: 'Approved for necessary operations'
      };

      const result = await service.submitApproval(requestId, decision);

      expect(result.success).toBe(true);
      expect(result.message).toContain('1 more approval');
      
      const updatedRequest = service.getApprovalRequest(requestId);
      expect(updatedRequest!.receivedApprovals).toHaveLength(1);
      expect(updatedRequest!.receivedApprovals[0].approved).toBe(true);
      expect(updatedRequest!.receivedApprovals[0].approver.name).toBe('Manager Smith');
    });

    it('should reject approval from unauthorized role', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);
      
      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      const requestId = request!.id;

      const decision = {
        approved: true,
        approver: {
          userId: 'employee-1',
          name: 'Employee Doe',
          role: 'employee' as UserRole,
          email: 'employee@company.com'
        }
      };

      const result = await service.submitApproval(requestId, decision);

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not have required role');
    });

    it('should reject duplicate approvals from same user', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);
      
      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      const requestId = request!.id;

      const decision = {
        approved: true,
        approver: {
          userId: 'manager-1',
          name: 'Manager Smith',
          role: 'manager' as UserRole,
          email: 'manager@company.com'
        }
      };

      // First approval
      await service.submitApproval(requestId, decision);

      // Second approval from same user
      const result = await service.submitApproval(requestId, decision);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already provided a decision');
    });

    it('should mark request as rejected on rejection', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);
      
      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      const requestId = request!.id;

      const decision = {
        approved: false,
        approver: {
          userId: 'manager-1',
          name: 'Manager Smith',
          role: 'manager' as UserRole,
          email: 'manager@company.com'
        },
        reason: 'Budget constraints'
      };

      const result = await service.submitApproval(requestId, decision);

      expect(result.success).toBe(true);
      expect(result.finalStatus).toBe('rejected');
      
      const updatedRequest = service.getApprovalRequest(requestId);
      expect(updatedRequest!.status).toBe('rejected');
    });

    it('should mark request as approved when enough approvals received', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue({
        ...mockThreshold,
        requiredApprovers: 1
      });
      
      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      const requestId = request!.id;

      const decision = {
        approved: true,
        approver: {
          userId: 'manager-1',
          name: 'Manager Smith',
          role: 'manager' as UserRole,
          email: 'manager@company.com'
        }
      };

      const result = await service.submitApproval(requestId, decision);

      expect(result.success).toBe(true);
      expect(result.finalStatus).toBe('approved');
      
      const updatedRequest = service.getApprovalRequest(requestId);
      expect(updatedRequest!.status).toBe('approved');
    });
  });

  describe('Request Retrieval and Filtering', () => {
    it('should get approval request by ID', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);
      
      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      const retrieved = service.getApprovalRequest(request!.id);

      expect(retrieved).toEqual(request);
    });

    it('should return null for non-existent request ID', () => {
      const retrieved = service.getApprovalRequest('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should get approval requests for purchase order', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);
      
      await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      await service.createApprovalRequest({
        ...mockPurchaseOrder,
        id: 'po-002'
      }, mockInitiator);

      const requests = service.getApprovalRequestsForPO('po-001');

      expect(requests).toHaveLength(1);
      expect(requests[0].purchaseOrderId).toBe('po-001');
    });

    it('should get pending approvals by role', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);
      
      await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      await service.createApprovalRequest({
        ...mockPurchaseOrder,
        id: 'po-002',
        total: 15000
      }, mockInitiator);

      const managerRequests = service.getPendingApprovalsByRole('manager');
      const employeeRequests = service.getPendingApprovalsByRole('employee');

      expect(managerRequests).toHaveLength(2);
      expect(employeeRequests).toHaveLength(0);
    });

    it('should sort pending approvals by priority', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold)
        .mockReturnValueOnce({ ...mockThreshold, priority: 'urgent' })
        .mockReturnValueOnce({ ...mockThreshold, priority: 'low' })
        .mockReturnValueOnce({ ...mockThreshold, priority: 'high' });

      await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      await service.createApprovalRequest({ ...mockPurchaseOrder, id: 'po-002' }, mockInitiator);
      await service.createApprovalRequest({ ...mockPurchaseOrder, id: 'po-003' }, mockInitiator);

      const requests = service.getPendingApprovalsByRole('manager');

      expect(requests[0].priority).toBe('urgent');
      expect(requests[1].priority).toBe('high');
      expect(requests[2].priority).toBe('low');
    });
  });

  describe('Escalation Processing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should identify overdue approvals', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue({
        ...mockThreshold,
        escalationTimeHours: 24
      });

      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      
      // Fast forward 25 hours
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);

      const overdueRequests = service.getOverdueApprovals();

      expect(overdueRequests).toHaveLength(1);
      expect(overdueRequests[0].id).toBe(request!.id);
    });

    it('should process escalations for overdue requests', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue({
        ...mockThreshold,
        escalationTimeHours: 24
      });

      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      
      // Fast forward 25 hours
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);

      const escalations = await service.processEscalations();

      expect(escalations).toHaveLength(1);
      expect(escalations[0].requestId).toBe(request!.id);
      expect(escalations[0].level).toBe(1);
      expect(escalations[0].reason).toBe('timeout');
      
      const escalatedRequest = service.getApprovalRequest(request!.id);
      expect(escalatedRequest!.status).toBe('escalated');
    });

    it('should mark request as expired when no more escalation levels', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue({
        ...mockThreshold,
        escalationTimeHours: 24
      });

      // Mock config with no escalation levels
      vi.mocked(purchaseOrderWorkflowConfigService.getConfig).mockReturnValue({
        emailNotifications: {
          escalationSettings: {
            enabled: true,
            levels: [], // No escalation levels
            skipWeekends: true,
            skipHolidays: true
          }
        }
      } as any);

      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      
      // Fast forward 25 hours
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);

      const escalations = await service.processEscalations();

      expect(escalations).toHaveLength(0);
      
      const expiredRequest = service.getApprovalRequest(request!.id);
      expect(expiredRequest!.status).toBe('expired');
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk approve multiple requests', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue({
        ...mockThreshold,
        requiredApprovers: 1
      });

      const request1 = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      const request2 = await service.createApprovalRequest({
        ...mockPurchaseOrder,
        id: 'po-002'
      }, mockInitiator);

      const approver = {
        userId: 'manager-1',
        name: 'Manager Smith',
        role: 'manager' as UserRole,
        email: 'manager@company.com'
      };

      const result = await service.bulkApprove([request1!.id, request2!.id], approver, 'Bulk approval');

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      
      expect(service.getApprovalRequest(request1!.id)!.status).toBe('approved');
      expect(service.getApprovalRequest(request2!.id)!.status).toBe('approved');
    });

    it('should handle partial failures in bulk approval', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue({
        ...mockThreshold,
        requiredApprovers: 1
      });

      const request1 = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);

      const approver = {
        userId: 'employee-1',
        name: 'Employee Doe',
        role: 'employee' as UserRole, // Wrong role
        email: 'employee@company.com'
      };

      const result = await service.bulkApprove([request1!.id, 'non-existent'], approver, 'Bulk approval');

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].error).toContain('does not have required role');
      expect(result.failed[1].error).toContain('not found');
    });
  });

  describe('Statistics and Reporting', () => {
    it('should calculate approval statistics', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue({
        ...mockThreshold,
        requiredApprovers: 1
      });

      // Create requests with different outcomes
      const request1 = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      const request2 = await service.createApprovalRequest({ ...mockPurchaseOrder, id: 'po-002' }, mockInitiator);

      // Approve first request
      await service.submitApproval(request1!.id, {
        approved: true,
        approver: {
          userId: 'manager-1',
          name: 'Manager Smith',
          role: 'manager' as UserRole,
          email: 'manager@company.com'
        }
      });

      // Reject second request
      await service.submitApproval(request2!.id, {
        approved: false,
        approver: {
          userId: 'manager-1',
          name: 'Manager Smith',
          role: 'manager' as UserRole,
          email: 'manager@company.com'
        }
      });

      const stats = service.getApprovalStatistics();

      expect(stats.totalRequests).toBe(2);
      expect(stats.approvedRequests).toBe(1);
      expect(stats.rejectedRequests).toBe(1);
      expect(stats.pendingRequests).toBe(0);
      expect(stats.averageApprovalTimeHours).toBeGreaterThan(0);
      expect(stats.approvalsByPriority.medium).toBe(2);
      expect(stats.approvalsByThreshold['Medium Purchase']).toBe(2);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up old completed requests', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue({
        ...mockThreshold,
        requiredApprovers: 1
      });

      // Create and approve old request
      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);
      await service.submitApproval(request!.id, {
        approved: true,
        approver: {
          userId: 'manager-1',
          name: 'Manager Smith',
          role: 'manager' as UserRole,
          email: 'manager@company.com'
        }
      });

      // Modify the created date to be old
      const approvalRequest = service.getApprovalRequest(request!.id);
      if (approvalRequest) {
        approvalRequest.createdAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      }

      const removedCount = service.cleanupOldRequests(90);

      expect(removedCount).toBe(1);
      expect(service.getApprovalRequest(request!.id)).toBeNull();
    });

    it('should not clean up recent or pending requests', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);

      // Create pending request
      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);

      const removedCount = service.cleanupOldRequests(90);

      expect(removedCount).toBe(0);
      expect(service.getApprovalRequest(request!.id)).toBeDefined();
    });
  });

  describe('Subscription System', () => {
    it('should notify subscribers of approval changes', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue(mockThreshold);

      const mockCallback = vi.fn();
      const unsubscribe = service.subscribeToApprovals(mockCallback);

      const request = await service.createApprovalRequest(mockPurchaseOrder, mockInitiator);

      expect(mockCallback).toHaveBeenCalledWith(request);

      unsubscribe();

      await service.submitApproval(request!.id, {
        approved: true,
        approver: {
          userId: 'manager-1',
          name: 'Manager Smith',
          role: 'manager' as UserRole,
          email: 'manager@company.com'
        }
      });

      // Should not be called after unsubscribe
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ApprovalThresholdService Integration', () => {
  it('should work with singleton instance', () => {
    expect(approvalThresholdService).toBeInstanceOf(ApprovalThresholdService);
  });

  it('should persist data across instances', async () => {
    const service1 = new ApprovalThresholdService();
    const service2 = new ApprovalThresholdService();

    vi.mocked(purchaseOrderWorkflowConfigService.getApprovalThreshold).mockReturnValue({
      id: 'threshold-1',
      name: 'Test Threshold',
      minAmount: 0,
      maxAmount: 1000,
      requiredRoles: ['manager' as UserRole],
      requiredApprovers: 1,
      escalationTimeHours: 24,
      skipWeekends: true,
      skipHolidays: true,
      priority: 'low',
      autoApprove: false,
      isActive: true
    });

    const mockPO = {
      id: 'po-test',
      total: 500,
      items: []
    } as PurchaseOrder;

    const request = await service1.createApprovalRequest(mockPO, {
      userId: 'user-1',
      name: 'Test User',
      role: 'employee'
    });

    const retrieved = service2.getApprovalRequest(request!.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.purchaseOrderId).toBe('po-test');
  });
});