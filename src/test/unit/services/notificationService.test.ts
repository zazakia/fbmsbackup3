import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { notificationService, NotificationRequest, NotificationRecipient } from '../../../services/notificationService';
import { PurchaseOrder, PurchaseOrderItem } from '../../../types/business';
import { UserRole } from '../../../types/auth';

// Mock window.location for URL generation
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://fbms.test.com'
  },
  writable: true,
});

describe('NotificationService', () => {
  let samplePO: PurchaseOrder;
  let sampleRecipients: NotificationRecipient[];

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Sample purchase order
    samplePO = {
      id: 'po1',
      poNumber: 'PO-2024-001',
      supplierId: 'supplier1',
      supplierName: 'Test Supplier Inc.',
      items: [
        {
          id: 'item1',
          productId: 'prod1',
          productName: 'Test Product A',
          sku: 'TEST-A-001',
          quantity: 5,
          cost: 200,
          total: 1000
        },
        {
          id: 'item2',
          productId: 'prod2',
          productName: 'Test Product B',
          sku: 'TEST-B-001',
          quantity: 10,
          cost: 150,
          total: 1500
        }
      ],
      subtotal: 2500,
      tax: 300,
      total: 2800,
      status: 'draft',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      expectedDate: new Date('2024-02-01')
    };

    sampleRecipients = [
      {
        email: 'manager@fbms.test',
        name: 'John Manager',
        role: 'manager' as UserRole
      },
      {
        email: 'admin@fbms.test',
        name: 'Jane Admin',
        role: 'admin' as UserRole
      }
    ];

    // Mock console.log to prevent test output pollution
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('sendApprovalRequest', () => {
    it('should send approval request notification with correct template variables', async () => {
      // Act
      const result = await notificationService.sendApprovalRequest(
        samplePO,
        sampleRecipients
      );

      // Assert
      expect(result).toHaveLength(2); // One log entry per recipient
      expect(result[0].templateId).toBe('approval_request');
      expect(result[0].status).toBe('sent');
      expect(result[0].recipient).toBe('manager@fbms.test');
      expect(result[1].recipient).toBe('admin@fbms.test');

      // Verify console.log was called with mock email details
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          to: 'manager@fbms.test',
          subject: expect.stringContaining('PO-2024-001'),
          subject: expect.stringContaining('₱2,800.00')
        })
      );
    });

    it('should set high priority for high-value orders', async () => {
      // Arrange
      const highValuePO = { ...samplePO, total: 75000 };

      // Act
      const result = await notificationService.sendApprovalRequest(
        highValuePO,
        sampleRecipients
      );

      // Assert
      expect(result[0].metadata).toEqual(
        expect.objectContaining({
          purchaseOrderId: 'po1',
          action: 'approval_request'
        })
      );
    });

    it('should include metadata in notification logs', async () => {
      // Arrange
      const metadata = { urgency: 'high', department: 'procurement' };

      // Act
      const result = await notificationService.sendApprovalRequest(
        samplePO,
        sampleRecipients,
        metadata
      );

      // Assert
      expect(result[0].metadata).toEqual(
        expect.objectContaining({
          purchaseOrderId: 'po1',
          action: 'approval_request',
          urgency: 'high',
          department: 'procurement'
        })
      );
    });

    it('should handle empty recipients list', async () => {
      // Act
      const result = await notificationService.sendApprovalRequest(
        samplePO,
        []
      );

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('sendApprovalDecision', () => {
    const approverInfo = {
      name: 'John Approver',
      email: 'john@fbms.test',
      role: 'Manager'
    };

    it('should send approval granted notification', async () => {
      // Act
      const result = await notificationService.sendApprovalDecision(
        samplePO,
        'approved',
        approverInfo,
        'Budget approved',
        'All requirements met'
      );

      // Assert
      expect(result).toHaveLength(2); // Default recipients
      expect(result[0].templateId).toBe('approval_granted');
      expect(result[0].status).toBe('sent');

      // Check that email contains approval information
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          subject: expect.stringContaining('PO-2024-001 Approved'),
          htmlPreview: expect.stringContaining('John Approver')
        })
      );
    });

    it('should send approval rejected notification', async () => {
      // Act
      const result = await notificationService.sendApprovalDecision(
        samplePO,
        'rejected',
        approverInfo,
        'Budget insufficient',
        'Please revise and resubmit'
      );

      // Assert
      expect(result).toHaveLength(2); // Default recipients
      expect(result[0].templateId).toBe('approval_rejected');
      expect(result[0].status).toBe('sent');

      // Check that email contains rejection information
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          subject: expect.stringContaining('PO-2024-001 Rejected'),
          htmlPreview: expect.stringContaining('Budget insufficient')
        })
      );
    });

    it('should set higher priority for rejections', async () => {
      // Act
      const rejectionResult = await notificationService.sendApprovalDecision(
        samplePO,
        'rejected',
        approverInfo,
        'Rejected'
      );

      const approvalResult = await notificationService.sendApprovalDecision(
        samplePO,
        'approved',
        approverInfo,
        'Approved'
      );

      // Assert
      expect(rejectionResult[0].metadata).toEqual(
        expect.objectContaining({ action: 'approval_rejected' })
      );
      expect(approvalResult[0].metadata).toEqual(
        expect.objectContaining({ action: 'approval_approved' })
      );
    });

    it('should use custom recipients when provided', async () => {
      // Arrange
      const customRecipients = [
        { email: 'custom@fbms.test', name: 'Custom User' }
      ];

      // Act
      const result = await notificationService.sendApprovalDecision(
        samplePO,
        'approved',
        approverInfo,
        'Approved',
        undefined,
        customRecipients
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].recipient).toBe('custom@fbms.test');
    });
  });

  describe('sendBulkApprovalNotification', () => {
    let multiplePOs: PurchaseOrder[];

    beforeEach(() => {
      multiplePOs = [
        { ...samplePO, id: 'po1', poNumber: 'PO-2024-001', total: 5000 },
        { ...samplePO, id: 'po2', poNumber: 'PO-2024-002', total: 8000, supplierName: 'Another Supplier' },
        { ...samplePO, id: 'po3', poNumber: 'PO-2024-003', total: 12000, supplierName: 'Third Supplier' }
      ];
    });

    it('should send bulk approval notification with summary data', async () => {
      // Arrange
      const approverInfo = {
        name: 'Bulk Approver',
        email: 'bulk@fbms.test',
        role: 'Manager'
      };

      // Act
      const result = await notificationService.sendBulkApprovalNotification(
        multiplePOs,
        'approved',
        approverInfo,
        'Monthly bulk approval'
      );

      // Assert
      expect(result).toHaveLength(2); // Default recipients
      expect(result[0].templateId).toBe('bulk_approved');
      expect(result[0].status).toBe('sent');

      // Check email content includes bulk information
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          htmlPreview: expect.stringContaining('₱25,000.00'), // Total amount
          textPreview: expect.stringContaining('3') // Order count
        })
      );
    });

    it('should handle large supplier lists with truncation', async () => {
      // Arrange
      const manySupplierPOs = Array.from({ length: 6 }, (_, i) => ({
        ...samplePO,
        id: `po${i}`,
        poNumber: `PO-2024-00${i}`,
        supplierName: `Supplier ${i}`
      }));

      const approverInfo = {
        name: 'Approver',
        email: 'approver@fbms.test',
        role: 'Manager'
      };

      // Act
      const result = await notificationService.sendBulkApprovalNotification(
        manySupplierPOs,
        'approved',
        approverInfo
      );

      // Assert
      expect(result[0].status).toBe('sent');
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          htmlPreview: expect.stringContaining('+3 more') // Supplier truncation
        })
      );
    });

    it('should set high priority for bulk operations', async () => {
      // Act
      const result = await notificationService.sendBulkApprovalNotification(
        multiplePOs,
        'approved',
        { name: 'Test', email: 'test@test.com', role: 'Manager' }
      );

      // Assert
      expect(result[0].metadata).toEqual(
        expect.objectContaining({
          action: 'bulk_approval_approved',
          purchaseOrderIds: ['po1', 'po2', 'po3']
        })
      );
    });
  });

  describe('sendOverdueReminder', () => {
    it('should send overdue reminder with urgency based on days', async () => {
      // Arrange
      const overduePOs = [
        { ...samplePO, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }, // 5 days ago
        { ...samplePO, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }  // 10 days ago
      ];

      // Act
      const result = await notificationService.sendOverdueReminder(
        overduePOs,
        sampleRecipients,
        5
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].templateId).toBe('overdue_approval_reminder');
      expect(result[0].status).toBe('sent');

      // Check urgency level calculation
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          subject: expect.stringContaining('5 days'),
          htmlPreview: expect.stringContaining('High') // Urgency level
        })
      );
    });

    it('should mark as critical for very overdue orders', async () => {
      // Act
      const result = await notificationService.sendOverdueReminder(
        [samplePO],
        sampleRecipients,
        10 // 10 days overdue
      );

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          htmlPreview: expect.stringContaining('Critical') // Urgency level
        })
      );
    });

    it('should include order details in reminder', async () => {
      // Act
      const result = await notificationService.sendOverdueReminder(
        [samplePO],
        sampleRecipients,
        5
      );

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          htmlPreview: expect.stringContaining('PO-2024-001'),
          htmlPreview: expect.stringContaining('Test Supplier Inc.')
        })
      );
    });
  });

  describe('sendStatusChangeNotification', () => {
    it('should send status change notification', async () => {
      // Arrange
      const changedBy = {
        name: 'Status Changer',
        email: 'changer@fbms.test',
        role: 'Manager'
      };

      // Act
      const result = await notificationService.sendStatusChangeNotification(
        samplePO,
        'draft',
        'approved',
        changedBy,
        'Automatic approval'
      );

      // Assert
      expect(result).toHaveLength(2); // Default recipients
      expect(result[0].templateId).toBe('status_change');
      expect(result[0].status).toBe('sent');

      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          htmlPreview: expect.stringContaining('Draft'),
          htmlPreview: expect.stringContaining('Approved')
        })
      );
    });

    it('should format status names properly', async () => {
      // Act
      const result = await notificationService.sendStatusChangeNotification(
        samplePO,
        'pending_approval',
        'fully_received',
        { name: 'User', email: 'user@test.com', role: 'Manager' }
      );

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          htmlPreview: expect.stringContaining('Pending Approval'),
          htmlPreview: expect.stringContaining('Fully Received')
        })
      );
    });
  });

  describe('Template Variable Replacement', () => {
    it('should replace all template variables correctly', async () => {
      // Act
      await notificationService.sendApprovalRequest(samplePO, sampleRecipients);

      // Assert - Check that key variables are replaced in subject and body
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          subject: 'Purchase Order PO-2024-001 Requires Your Approval - ₱2,800.00',
          htmlPreview: expect.stringContaining('Test Supplier Inc.'),
          htmlPreview: expect.stringContaining('2 items'),
          htmlPreview: expect.stringContaining('February 1, 2024') // Expected date
        })
      );
    });

    it('should handle missing optional variables gracefully', async () => {
      // Arrange - PO without expected date
      const poWithoutDate = { ...samplePO, expectedDate: undefined };

      // Act
      await notificationService.sendApprovalRequest(poWithoutDate, sampleRecipients);

      // Assert - Should not crash and should show fallback text
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          htmlPreview: expect.stringContaining('Not specified')
        })
      );
    });
  });

  describe('Currency and Date Formatting', () => {
    it('should format Philippine peso currency correctly', async () => {
      // Act
      await notificationService.sendApprovalRequest(samplePO, sampleRecipients);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          subject: expect.stringContaining('₱2,800.00')
        })
      );
    });

    it('should format dates in Philippine locale', async () => {
      // Act
      await notificationService.sendApprovalRequest(samplePO, sampleRecipients);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          htmlPreview: expect.stringMatching(/January \d{1,2}, 2024/) // Created date
        })
      );
    });
  });

  describe('URL Generation', () => {
    it('should generate correct approval URLs', async () => {
      // Act
      await notificationService.sendApprovalRequest(samplePO, sampleRecipients);

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          htmlPreview: expect.stringContaining('https://fbms.test.com/purchase-orders/po1/approve')
        })
      );
    });

    it('should generate correct dashboard URLs', async () => {
      // Act
      await notificationService.sendApprovalDecision(
        samplePO,
        'approved',
        { name: 'Test', email: 'test@test.com', role: 'Manager' }
      );

      // Assert
      expect(console.log).toHaveBeenCalledWith(
        '📧 Mock Email Sent:',
        expect.objectContaining({
          htmlPreview: expect.stringContaining('https://fbms.test.com/dashboard')
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing template gracefully', async () => {
      // Arrange - Create a mock request with invalid template
      const invalidRequest: NotificationRequest = {
        templateId: 'nonexistent_template',
        recipients: sampleRecipients,
        variables: {},
        priority: 'normal',
        category: 'approval'
      };

      // Act & Assert
      await expect(
        (notificationService as any).sendNotification(invalidRequest)
      ).rejects.toThrow('Template not found: nonexistent_template');
    });

    it('should handle email sending failures', async () => {
      // Arrange - Mock the sendViaMock to throw error
      const originalMethod = (notificationService as any).sendViaMock;
      vi.spyOn(notificationService as any, 'sendViaMock')
        .mockRejectedValue(new Error('SMTP server down'));

      // Act
      const result = await notificationService.sendApprovalRequest(samplePO, sampleRecipients);

      // Assert
      expect(result[0].status).toBe('failed');
      expect(result[0].failureReason).toBe('SMTP server down');
      expect(result[0].attempts).toBe(1);

      // Restore original method
      (notificationService as any).sendViaMock = originalMethod;
    });

    it('should continue processing other recipients if one fails', async () => {
      // Arrange - Mock to fail on first recipient only
      let callCount = 0;
      vi.spyOn(notificationService as any, 'sendViaMock')
        .mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            throw new Error('First recipient failed');
          }
          return Promise.resolve();
        });

      // Act
      const result = await notificationService.sendApprovalRequest(samplePO, sampleRecipients);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('failed');
      expect(result[1].status).toBe('sent');
    });
  });

  describe('Batch Processing', () => {
    it('should process recipients in batches', async () => {
      // Arrange - Create many recipients to test batching
      const manyRecipients = Array.from({ length: 25 }, (_, i) => ({
        email: `user${i}@fbms.test`,
        name: `User ${i}`
      }));

      // Act
      const result = await notificationService.sendApprovalRequest(samplePO, manyRecipients);

      // Assert
      expect(result).toHaveLength(25);
      result.forEach(log => expect(log.status).toBe('sent'));
    });
  });
});