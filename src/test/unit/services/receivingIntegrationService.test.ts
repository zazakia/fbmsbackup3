import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  receivingIntegrationService,
  ApprovalContext,
  StatusChangeContext,
  IntegrationResult,
  ValidationResult
} from '../../../services/receivingIntegrationService';
import { receivingDashboardService } from '../../../services/receivingDashboardService';
import { auditService } from '../../../services/auditService';
import { EnhancedPurchaseOrder, EnhancedPurchaseOrderStatus } from '../../../types/business';
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

vi.mock('../../../services/notificationService', () => ({
  notificationService: {
    // Mock methods as needed
  }
}));

describe('ReceivingIntegrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('onPurchaseOrderApproved', () => {
    it('should successfully process approval integration', async () => {
      const purchaseOrderId = 'po-123';
      const approvalContext: ApprovalContext = {
        approvedBy: 'user-456',
        approvedAt: new Date(),
        reason: 'Approved for procurement',
        comments: 'Urgent order',
        userRole: 'manager' as UserRole
      };

      // Mock successful receiving queue refresh
      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      
      // Mock successful audit logging
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-id');

      const result: IntegrationResult = await receivingIntegrationService.onPurchaseOrderApproved(
        purchaseOrderId,
        approvalContext
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(true);
      expect(result.notificationsSent).toBe(1);
      expect(result.auditLogId).toBe('audit-log-id');
      expect(result.error).toBeUndefined();

      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledOnce();
      expect(auditService.logPurchaseOrderAction).toHaveBeenCalledWith({
        purchaseOrderId,
        purchaseOrderNumber: expect.any(String),
        action: 'receiving_integration',
        performedBy: approvalContext.approvedBy,
        performedByName: approvalContext.approvedBy,
        timestamp: approvalContext.approvedAt,
        reason: expect.stringContaining('Approved PO integrated with receiving queue'),
        metadata: expect.objectContaining({
          integrationEventId: expect.any(String),
          receivingQueueChange: 'added',
          approverRole: approvalContext.userRole
        })
      });
    });

    it('should handle errors gracefully', async () => {
      const purchaseOrderId = 'po-123';
      const approvalContext: ApprovalContext = {
        approvedBy: 'user-456',
        approvedAt: new Date(),
        reason: 'Test approval',
        userRole: 'manager' as UserRole
      };

      // Mock receiving queue refresh failure
      vi.mocked(receivingDashboardService.getReceivingQueue).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result: IntegrationResult = await receivingIntegrationService.onPurchaseOrderApproved(
        purchaseOrderId,
        approvalContext
      );

      expect(result.success).toBe(false);
      expect(result.receivingQueueUpdated).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(result.notificationsSent).toBe(0);
    });
  });

  describe('onPurchaseOrderStatusChanged', () => {
    it('should handle status change from draft to approved', async () => {
      const purchaseOrderId = 'po-123';
      const previousStatus: EnhancedPurchaseOrderStatus = 'draft';
      const newStatus: EnhancedPurchaseOrderStatus = 'approved';
      const context: StatusChangeContext = {
        changedBy: 'user-456',
        changedAt: new Date(),
        reason: 'Status updated',
        previousStatus,
        newStatus
      };

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-id');

      const result: IntegrationResult = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        previousStatus,
        newStatus,
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(true);
      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledOnce();
    });

    it('should handle status change from approved to cancelled', async () => {
      const purchaseOrderId = 'po-123';
      const previousStatus: EnhancedPurchaseOrderStatus = 'approved';
      const newStatus: EnhancedPurchaseOrderStatus = 'cancelled';
      const context: StatusChangeContext = {
        changedBy: 'user-456',
        changedAt: new Date(),
        reason: 'Order cancelled',
        previousStatus,
        newStatus
      };

      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);
      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-id');

      const result: IntegrationResult = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        previousStatus,
        newStatus,
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(true);
      expect(result.notificationsSent).toBe(1); // Cancellation notification sent
    });

    it('should not update receiving queue for non-receivable status changes', async () => {
      const purchaseOrderId = 'po-123';
      const previousStatus: EnhancedPurchaseOrderStatus = 'draft';
      const newStatus: EnhancedPurchaseOrderStatus = 'pending_approval';
      const context: StatusChangeContext = {
        changedBy: 'user-456',
        changedAt: new Date(),
        previousStatus,
        newStatus
      };

      vi.mocked(auditService.logPurchaseOrderAction).mockResolvedValue('audit-log-id');

      const result: IntegrationResult = await receivingIntegrationService.onPurchaseOrderStatusChanged(
        purchaseOrderId,
        previousStatus,
        newStatus,
        context
      );

      expect(result.success).toBe(true);
      expect(result.receivingQueueUpdated).toBe(false);
      expect(receivingDashboardService.getReceivingQueue).not.toHaveBeenCalled();
    });
  });

  describe('validateReceivingReadiness', () => {
    it('should validate a complete purchase order successfully', () => {
      const purchaseOrder: EnhancedPurchaseOrder = {
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
        status: 'approved' as EnhancedPurchaseOrderStatus,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdAt: new Date(),
        
        // Enhanced fields
        statusHistory: [],
        receivingHistory: [],
        validationErrors: [],
        approvalHistory: [],
        totalReceived: 0,
        totalPending: 10,
        isPartiallyReceived: false,
        isFullyReceived: false
      };

      const result: ValidationResult = receivingIntegrationService.validateReceivingReadiness(purchaseOrder);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const purchaseOrder: EnhancedPurchaseOrder = {
        id: 'po-123',
        poNumber: '',
        supplierId: '',
        supplierName: '',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        status: 'draft' as EnhancedPurchaseOrderStatus,
        createdAt: new Date(),
        
        // Enhanced fields
        statusHistory: [],
        receivingHistory: [],
        validationErrors: [],
        approvalHistory: [],
        totalReceived: 0,
        totalPending: 0,
        isPartiallyReceived: false,
        isFullyReceived: false
      };

      const result: ValidationResult = receivingIntegrationService.validateReceivingReadiness(purchaseOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Supplier information is missing');
      expect(result.errors).toContain('Purchase order has no items');
      expect(result.errors).toContain('Purchase order total is invalid');
      expect(result.errors).toContain("Purchase order status 'draft' is not receivable");
    });

    it('should detect invalid items', () => {
      const purchaseOrder: EnhancedPurchaseOrder = {
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
            quantity: 0, // Invalid quantity
            cost: -10, // Invalid cost
            total: 0
          }
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'approved' as EnhancedPurchaseOrderStatus,
        createdAt: new Date(),
        
        // Enhanced fields
        statusHistory: [],
        receivingHistory: [],
        validationErrors: [],
        approvalHistory: [],
        totalReceived: 0,
        totalPending: 0,
        isPartiallyReceived: false,
        isFullyReceived: false
      };

      const result: ValidationResult = receivingIntegrationService.validateReceivingReadiness(purchaseOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item 1 has invalid quantity');
      expect(result.errors).toContain('Item 1 has invalid cost');
    });

    it('should generate appropriate warnings', () => {
      const purchaseOrder: EnhancedPurchaseOrder = {
        id: 'po-123',
        poNumber: '', // Missing PO number
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
        status: 'approved' as EnhancedPurchaseOrderStatus,
        expectedDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday - past date
        createdAt: new Date(),
        
        // Enhanced fields
        statusHistory: [],
        receivingHistory: [],
        validationErrors: [],
        approvalHistory: [],
        totalReceived: 0,
        totalPending: 10,
        isPartiallyReceived: false,
        isFullyReceived: false
      };

      const result: ValidationResult = receivingIntegrationService.validateReceivingReadiness(purchaseOrder);

      expect(result.isValid).toBe(true); // Should be valid despite warnings
      expect(result.warnings).toContain('Purchase order number not set');
      expect(result.warnings).toContain('Expected delivery date is in the past');
    });
  });

  describe('isReceivableStatus', () => {
    it('should correctly identify receivable statuses', () => {
      expect(receivingIntegrationService.isReceivableStatus('approved')).toBe(true);
      expect(receivingIntegrationService.isReceivableStatus('sent_to_supplier')).toBe(true);
      expect(receivingIntegrationService.isReceivableStatus('partially_received')).toBe(true);
    });

    it('should correctly identify non-receivable statuses', () => {
      expect(receivingIntegrationService.isReceivableStatus('draft')).toBe(false);
      expect(receivingIntegrationService.isReceivableStatus('pending_approval')).toBe(false);
      expect(receivingIntegrationService.isReceivableStatus('fully_received')).toBe(false);
      expect(receivingIntegrationService.isReceivableStatus('cancelled')).toBe(false);
      expect(receivingIntegrationService.isReceivableStatus('closed')).toBe(false);
    });
  });

  describe('refreshReceivingQueue', () => {
    it('should refresh receiving queue successfully', async () => {
      vi.mocked(receivingDashboardService.getReceivingQueue).mockResolvedValue([]);

      await expect(receivingIntegrationService.refreshReceivingQueue()).resolves.not.toThrow();
      expect(receivingDashboardService.getReceivingQueue).toHaveBeenCalledOnce();
    });

    it('should throw error when refresh fails', async () => {
      const error = new Error('Network error');
      vi.mocked(receivingDashboardService.getReceivingQueue).mockRejectedValue(error);

      await expect(receivingIntegrationService.refreshReceivingQueue()).rejects.toThrow('Network error');
    });
  });
});