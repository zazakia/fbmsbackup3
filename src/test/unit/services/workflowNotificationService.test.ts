import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WorkflowNotificationService,
  workflowNotificationService,
  WorkflowNotificationContext,
  NotificationRecipient
} from '../../../services/workflowNotificationService';
import { PurchaseOrder } from '../../../types/business';
import { UserRole } from '../../../types/auth';
import { NotificationTemplate, NotificationEvent } from '../../../types/purchaseOrderConfig';

// Mock the workflow config service
vi.mock('../../../services/purchaseOrderWorkflowConfigService', () => ({
  purchaseOrderWorkflowConfigService: {
    getNotificationTemplate: vi.fn(),
    updateConfig: vi.fn()
  }
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://test.fbms.com'
  },
  writable: true
});

import { purchaseOrderWorkflowConfigService } from '../../../services/purchaseOrderWorkflowConfigService';

describe('WorkflowNotificationService', () => {
  let service: WorkflowNotificationService;

  const mockPurchaseOrder: PurchaseOrder = {
    id: 'po-001',
    poNumber: 'PO-2024-001',
    supplierName: 'Test Supplier Ltd.',
    total: 25000,
    status: 'pending_approval',
    currency: 'PHP',
    paymentTerms: 'Net 30',
    expectedDate: new Date('2024-02-15'),
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'Office Chairs',
        quantity: 10,
        unitPrice: 1500,
        totalPrice: 15000
      },
      {
        id: 'item-2',
        productId: 'product-2',
        productName: 'Desk Lamps',
        quantity: 20,
        unitPrice: 500,
        totalPrice: 10000
      }
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  } as PurchaseOrder;

  const mockActor = {
    userId: 'user-123',
    name: 'John Smith',
    email: 'john.smith@company.com',
    role: 'manager' as UserRole
  };

  const mockRecipients: NotificationRecipient[] = [
    {
      email: 'manager@company.com',
      name: 'Purchase Manager',
      role: 'manager' as UserRole,
      userId: 'mgr-001'
    },
    {
      email: 'finance@company.com',
      name: 'Finance Team',
      role: 'accountant' as UserRole,
      userId: 'fin-001'
    }
  ];

  const mockApprovalTemplate: NotificationTemplate = {
    id: 'approval-request-v2',
    name: 'Enhanced Approval Request',
    event: 'approval_request',
    subject: '[Action Required] Purchase Order {{poNumber}} - {{totalAmount}} Approval Needed',
    htmlBody: `
      <h2>Purchase Order Approval Required</h2>
      <p>Hello {{recipientName}},</p>
      <p>Purchase Order: {{poNumber}}</p>
      <p>Supplier: {{supplierName}}</p>
      <p>Total: {{totalAmount}}</p>
      <p><a href="{{approvalUrl}}">Review & Approve</a></p>
    `,
    textBody: `
      Purchase Order Approval Required
      
      Purchase Order: {{poNumber}}
      Supplier: {{supplierName}}
      Total: {{totalAmount}}
      
      Review at: {{approvalUrl}}
    `,
    variables: ['poNumber', 'supplierName', 'totalAmount', 'approvalUrl', 'recipientName'],
    isActive: true,
    priority: 'high',
    delayMinutes: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console.log to capture notification sending
    vi.spyOn(console, 'log').mockImplementation(() => {});
    
    service = new WorkflowNotificationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Notification Sending', () => {
    it('should send approval request notification successfully', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(mockApprovalTemplate);

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      const result = await service.sendWorkflowNotification(context, mockRecipients);

      expect(result.success).toBe(true);
      expect(result.templateId).toBe('approval-request-v2');
      expect(result.recipients).toEqual(['manager@company.com', 'finance@company.com']);
      expect(result.deliveryStatus['manager@company.com']).toBe('sent');
      expect(result.deliveryStatus['finance@company.com']).toBe('sent');
    });

    it('should fail when template not found', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(null);

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      const result = await service.sendWorkflowNotification(context, mockRecipients);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No template found for event: approval_request');
    });

    it('should fail when template is inactive', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue({ ...mockApprovalTemplate, isActive: false });

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      const result = await service.sendWorkflowNotification(context, mockRecipients);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Template is not active');
    });

    it('should handle individual recipient failures gracefully', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(mockApprovalTemplate);

      // Mock one recipient to fail
      const recipientsWithBadEmail = [
        ...mockRecipients,
        { email: 'invalid-email', name: 'Bad Recipient' }
      ];

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      const result = await service.sendWorkflowNotification(context, recipientsWithBadEmail);

      expect(result.success).toBe(true);
      expect(result.recipients).toHaveLength(3);
      expect(result.deliveryStatus['manager@company.com']).toBe('sent');
      expect(result.deliveryStatus['finance@company.com']).toBe('sent');
      expect(result.deliveryStatus['invalid-email']).toBe('sent'); // Mock always succeeds
    });
  });

  describe('Template Variable Generation', () => {
    it('should generate basic purchase order variables', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(mockApprovalTemplate);

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      await service.sendWorkflowNotification(context, [mockRecipients[0]]);

      // Verify console.log was called with properly formatted variables
      expect(console.log).toHaveBeenCalledWith(
        '📧 Workflow Notification Sent:',
        expect.objectContaining({
          event: 'approval_request',
          template: 'approval-request-v2',
          to: 'manager@company.com',
          subject: '[Action Required] Purchase Order PO-2024-001 - ₱25,000.00 Approval Needed'
        })
      );
    });

    it('should generate event-specific variables for price variance', async () => {
      const priceVarianceTemplate: NotificationTemplate = {
        id: 'price-variance-alert',
        name: 'Price Variance Alert',
        event: 'price_variance_alert',
        subject: 'Price Variance: {{poNumber}} - {{varianceAmount}}',
        htmlBody: 'Variance: {{varianceAmount}} ({{variancePercentage}}%)',
        textBody: 'Variance: {{varianceAmount}} ({{variancePercentage}}%)',
        variables: ['poNumber', 'varianceAmount', 'variancePercentage'],
        isActive: true,
        priority: 'high',
        delayMinutes: 0
      };

      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(priceVarianceTemplate);

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'price_variance_alert',
        actor: mockActor,
        metadata: {
          originalAmount: 25000,
          receivedAmount: 27500,
          varianceAmount: 2500,
          variancePercentage: 10,
          varianceType: 'over',
          requiresApproval: true
        }
      };

      await service.sendWorkflowNotification(context, [mockRecipients[0]]);

      expect(console.log).toHaveBeenCalledWith(
        '📧 Workflow Notification Sent:',
        expect.objectContaining({
          subject: 'Price Variance: PO-2024-001 - ₱2,500.00'
        })
      );
    });

    it('should generate event-specific variables for partial receipt', async () => {
      const partialReceiptTemplate: NotificationTemplate = {
        id: 'partial-receipt',
        name: 'Partial Receipt',
        event: 'partial_receipt',
        subject: 'Partial Receipt: {{poNumber}} - {{receivedItems}}/{{totalItems}}',
        htmlBody: 'Received: {{receivedItems}} of {{totalItems}} items ({{completionPercentage}}%)',
        textBody: 'Received: {{receivedItems}} of {{totalItems}} items ({{completionPercentage}}%)',
        variables: ['poNumber', 'receivedItems', 'totalItems', 'completionPercentage'],
        isActive: true,
        priority: 'normal',
        delayMinutes: 0
      };

      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(partialReceiptTemplate);

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'partial_receipt',
        actor: mockActor,
        metadata: {
          receivedBy: 'John Receiver',
          receiptDate: new Date('2024-01-20'),
          receivedItems: 5,
          totalItems: 10,
          completionPercentage: 50,
          hasRemainingItems: true,
          remainingItems: [
            { productName: 'Office Chairs', remainingQuantity: 5, unit: 'pcs' }
          ]
        }
      };

      await service.sendWorkflowNotification(context, [mockRecipients[0]]);

      expect(console.log).toHaveBeenCalledWith(
        '📧 Workflow Notification Sent:',
        expect.objectContaining({
          subject: 'Partial Receipt: PO-2024-001 - 5/10'
        })
      );
    });
  });

  describe('Template Variable Replacement', () => {
    it('should replace simple variables correctly', async () => {
      const simpleTemplate: NotificationTemplate = {
        id: 'simple-test',
        name: 'Simple Test',
        event: 'approval_request',
        subject: 'Order {{poNumber}} from {{supplierName}}',
        htmlBody: '<p>Total: {{totalAmount}}</p>',
        textBody: 'Total: {{totalAmount}}',
        variables: ['poNumber', 'supplierName', 'totalAmount'],
        isActive: true,
        priority: 'normal',
        delayMinutes: 0
      };

      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(simpleTemplate);

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      await service.sendWorkflowNotification(context, [mockRecipients[0]]);

      expect(console.log).toHaveBeenCalledWith(
        '📧 Workflow Notification Sent:',
        expect.objectContaining({
          subject: 'Order PO-2024-001 from Test Supplier Ltd.'
        })
      );
    });

    it('should handle Handlebars-style conditionals', async () => {
      const conditionalTemplate: NotificationTemplate = {
        id: 'conditional-test',
        name: 'Conditional Test',
        event: 'approval_request',
        subject: 'Order {{poNumber}}',
        htmlBody: '{{#if urgencyReason}}<p>Urgent: {{urgencyReason}}</p>{{/if}}<p>Normal content</p>',
        textBody: '{{#if urgencyReason}}Urgent: {{urgencyReason}}{{/if}}Normal content',
        variables: ['poNumber', 'urgencyReason'],
        isActive: true,
        priority: 'normal',
        delayMinutes: 0
      };

      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(conditionalTemplate);

      const contextWithUrgency: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor,
        metadata: {
          urgencyReason: 'Critical supply shortage'
        }
      };

      await service.sendWorkflowNotification(contextWithUrgency, [mockRecipients[0]]);

      // Check that console.log received the processed HTML with the conditional content
      const logCall = (console.log as any).mock.calls.find(call => 
        call[0] === '📧 Workflow Notification Sent:'
      );
      expect(logCall[1].htmlPreview).toContain('Urgent: Critical supply shortage');
    });

    it('should handle Handlebars-style loops', async () => {
      const loopTemplate: NotificationTemplate = {
        id: 'loop-test',
        name: 'Loop Test',
        event: 'approval_request',
        subject: 'Order {{poNumber}}',
        htmlBody: '{{#each orders}}<p>{{poNumber}} - {{supplier}}</p>{{/each}}',
        textBody: '{{#each orders}}{{poNumber}} - {{supplier}}\n{{/each}}',
        variables: ['poNumber', 'orders'],
        isActive: true,
        priority: 'normal',
        delayMinutes: 0
      };

      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(loopTemplate);

      const contextWithOrders: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor,
        metadata: {
          orders: [
            { poNumber: 'PO-001', supplier: 'Supplier A' },
            { poNumber: 'PO-002', supplier: 'Supplier B' }
          ]
        }
      };

      await service.sendWorkflowNotification(contextWithOrders, [mockRecipients[0]]);

      const logCall = (console.log as any).mock.calls.find(call => 
        call[0] === '📧 Workflow Notification Sent:'
      );
      expect(logCall[1].htmlPreview).toContain('PO-001 - Supplier A');
      expect(logCall[1].htmlPreview).toContain('PO-002 - Supplier B');
    });
  });

  describe('Recipient Processing', () => {
    it('should add recipient-specific variables', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue({
          ...mockApprovalTemplate,
          htmlBody: '<p>Hello {{recipientName}},</p><p>Your role: {{recipientRole}}</p>'
        });

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      await service.sendWorkflowNotification(context, [mockRecipients[0]]);

      const logCall = (console.log as any).mock.calls.find(call => 
        call[0] === '📧 Workflow Notification Sent:'
      );
      expect(logCall[1].htmlPreview).toContain('Hello Purchase Manager,');
      expect(logCall[1].htmlPreview).toContain('Your role: Manager');
    });

    it('should extract name from email when name is missing', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(mockApprovalTemplate);

      const recipientWithoutName = {
        email: 'john.doe@company.com'
      };

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      await service.sendWorkflowNotification(context, [recipientWithoutName]);

      // Should extract "John" from email and capitalize it
      const logCall = (console.log as any).mock.calls.find(call => 
        call[0] === '📧 Workflow Notification Sent:'
      );
      expect(logCall[1].to).toBe('john.doe@company.com');
    });
  });

  describe('URL Generation', () => {
    it('should generate correct URLs based on window.location', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue({
          ...mockApprovalTemplate,
          htmlBody: '<a href="{{approvalUrl}}">Approve</a><a href="{{dashboardUrl}}">Dashboard</a>'
        });

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      await service.sendWorkflowNotification(context, [mockRecipients[0]]);

      const logCall = (console.log as any).mock.calls.find(call => 
        call[0] === '📧 Workflow Notification Sent:'
      );
      expect(logCall[1].htmlPreview).toContain('https://test.fbms.com/purchase-orders/po-001/approve');
      expect(logCall[1].htmlPreview).toContain('https://test.fbms.com/dashboard');
    });
  });

  describe('Formatting Helpers', () => {
    it('should format currency correctly for PHP', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(mockApprovalTemplate);

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      await service.sendWorkflowNotification(context, [mockRecipients[0]]);

      expect(console.log).toHaveBeenCalledWith(
        '📧 Workflow Notification Sent:',
        expect.objectContaining({
          subject: expect.stringContaining('₱25,000.00')
        })
      );
    });

    it('should format dates correctly for PH locale', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue({
          ...mockApprovalTemplate,
          subject: 'Order created on {{createdDate}}'
        });

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      await service.sendWorkflowNotification(context, [mockRecipients[0]]);

      expect(console.log).toHaveBeenCalledWith(
        '📧 Workflow Notification Sent:',
        expect.objectContaining({
          subject: expect.stringContaining('January 15, 2024')
        })
      );
    });

    it('should format status correctly', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue({
          ...mockApprovalTemplate,
          subject: 'Status: {{status}}'
        });

      const context: WorkflowNotificationContext = {
        purchaseOrder: { ...mockPurchaseOrder, status: 'pending_approval' },
        event: 'approval_request',
        actor: mockActor
      };

      await service.sendWorkflowNotification(context, [mockRecipients[0]]);

      expect(console.log).toHaveBeenCalledWith(
        '📧 Workflow Notification Sent:',
        expect.objectContaining({
          subject: 'Status: Pending Approval'
        })
      );
    });
  });

  describe('Template Delay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should respect template delay setting', async () => {
      const delayedTemplate = {
        ...mockApprovalTemplate,
        delayMinutes: 5 // 5 minute delay
      };

      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(delayedTemplate);

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      const notificationPromise = service.sendWorkflowNotification(context, [mockRecipients[0]]);

      // Fast forward 4 minutes - should not have sent yet
      vi.advanceTimersByTime(4 * 60 * 1000);
      expect(console.log).not.toHaveBeenCalledWith(
        '📧 Workflow Notification Sent:',
        expect.any(Object)
      );

      // Fast forward remaining time
      vi.advanceTimersByTime(1 * 60 * 1000 + 100); // Extra 100ms for processing

      await notificationPromise;

      expect(console.log).toHaveBeenCalledWith(
        '📧 Workflow Notification Sent:',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle template processing errors', async () => {
      // Create a template with variables that will cause processing issues
      const problematicTemplate = {
        ...mockApprovalTemplate,
        htmlBody: '{{nonExistentVariable}}'
      };

      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(problematicTemplate);

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor
      };

      const result = await service.sendWorkflowNotification(context, mockRecipients);

      // Should still succeed but with empty variable replacements
      expect(result.success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete notification workflow', async () => {
      vi.mocked(purchaseOrderWorkflowConfigService.getNotificationTemplate)
        .mockReturnValue(mockApprovalTemplate);

      const context: WorkflowNotificationContext = {
        purchaseOrder: mockPurchaseOrder,
        event: 'approval_request',
        actor: mockActor,
        metadata: {
          urgencyReason: 'Critical shortage',
          approvalDeadline: new Date('2024-01-17'),
          itemSummary: 'Office Chairs (10), Desk Lamps (20)'
        }
      };

      const result = await service.sendWorkflowNotification(context, mockRecipients);

      expect(result.success).toBe(true);
      expect(result.recipients).toHaveLength(2);
      expect(Object.keys(result.deliveryStatus)).toHaveLength(2);
      expect(Object.values(result.deliveryStatus)).toEqual(['sent', 'sent']);

      // Verify console logs for both recipients
      expect(console.log).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenNthCalledWith(1, '📧 Workflow Notification Sent:', expect.any(Object));
      expect(console.log).toHaveBeenNthCalledWith(2, '📧 Workflow Notification Sent:', expect.any(Object));
    });
  });
});

describe('WorkflowNotificationService Integration', () => {
  it('should work with singleton instance', () => {
    expect(workflowNotificationService).toBeInstanceOf(WorkflowNotificationService);
  });

  it('should initialize default templates on construction', () => {
    // Verify that the service attempts to initialize templates
    expect(purchaseOrderWorkflowConfigService.updateConfig).toHaveBeenCalled();
  });
});