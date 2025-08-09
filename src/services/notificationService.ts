import { PurchaseOrder } from '../types/business';
import { UserRole } from '../types/auth';

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
}

export interface NotificationRecipient {
  email: string;
  name?: string;
  role?: UserRole;
  userId?: string;
}

export interface NotificationRequest {
  templateId: string;
  recipients: NotificationRecipient[];
  variables: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'approval' | 'status_change' | 'reminder' | 'alert';
  metadata?: Record<string, unknown>;
}

export interface NotificationConfig {
  enabled: boolean;
  emailProvider: 'supabase' | 'sendgrid' | 'ses' | 'mock';
  defaultSender: {
    email: string;
    name: string;
  };
  retryAttempts: number;
  retryDelayMs: number;
  batchSize: number;
  templates: NotificationTemplate[];
}

export interface NotificationLog {
  id: string;
  templateId: string;
  recipient: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  sentAt?: Date;
  failureReason?: string;
  attempts: number;
  metadata?: Record<string, unknown>;
}

class NotificationService {
  private config: NotificationConfig;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Send approval request notification
   */
  async sendApprovalRequest(
    purchaseOrder: PurchaseOrder,
    approvers: NotificationRecipient[],
    metadata?: Record<string, any>
  ): Promise<NotificationLog[]> {
    const variables = {
      poNumber: purchaseOrder.poNumber,
      supplierName: purchaseOrder.supplierName,
      totalAmount: this.formatCurrency(purchaseOrder.total),
      itemCount: purchaseOrder.items.length,
      createdDate: this.formatDate(purchaseOrder.createdAt),
      expectedDate: purchaseOrder.expectedDate ? this.formatDate(purchaseOrder.expectedDate) : 'Not specified',
      approvalUrl: this.getApprovalUrl(purchaseOrder.id),
      dashboardUrl: this.getDashboardUrl(),
      companyName: 'FBMS',
      itemSummary: this.getItemSummary(purchaseOrder.items.slice(0, 5))
    };

    const request: NotificationRequest = {
      templateId: 'approval_request',
      recipients: approvers,
      variables,
      priority: purchaseOrder.total > 50000 ? 'high' : 'normal',
      category: 'approval',
      metadata: {
        purchaseOrderId: purchaseOrder.id,
        action: 'approval_request',
        ...metadata
      }
    };

    return this.sendNotification(request);
  }

  /**
   * Send approval decision notification
   */
  async sendApprovalDecision(
    purchaseOrder: PurchaseOrder,
    decision: 'approved' | 'rejected',
    approverInfo: {
      name: string;
      email: string;
      role: string;
    },
    reason?: string,
    comments?: string,
    recipients?: NotificationRecipient[]
  ): Promise<NotificationLog[]> {
    const variables = {
      poNumber: purchaseOrder.poNumber,
      supplierName: purchaseOrder.supplierName,
      totalAmount: this.formatCurrency(purchaseOrder.total),
      decision: decision.charAt(0).toUpperCase() + decision.slice(1),
      approverName: approverInfo.name,
      approverRole: approverInfo.role,
      approvalDate: this.formatDate(new Date()),
      reason: reason || '',
      comments: comments || '',
      itemCount: purchaseOrder.items.length,
      dashboardUrl: this.getDashboardUrl(),
      companyName: 'FBMS'
    };

    // Default recipients: creator, managers, finance team
    const defaultRecipients = await this.getDefaultRecipients(decision, purchaseOrder);
    const finalRecipients = recipients || defaultRecipients;

    const request: NotificationRequest = {
      templateId: decision === 'approved' ? 'approval_granted' : 'approval_rejected',
      recipients: finalRecipients,
      variables,
      priority: decision === 'rejected' ? 'high' : 'normal',
      category: 'status_change',
      metadata: {
        purchaseOrderId: purchaseOrder.id,
        action: `approval_${decision}`,
        approverId: approverInfo.email
      }
    };

    return this.sendNotification(request);
  }

  /**
   * Send bulk approval notification
   */
  async sendBulkApprovalNotification(
    purchaseOrders: PurchaseOrder[],
    decision: 'approved' | 'rejected',
    approverInfo: {
      name: string;
      email: string;
      role: string;
    },
    reason?: string,
    recipients?: NotificationRecipient[]
  ): Promise<NotificationLog[]> {
    const totalAmount = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
    const suppliers = Array.from(new Set(purchaseOrders.map(po => po.supplierName)));

    const variables = {
      orderCount: purchaseOrders.length,
      totalAmount: this.formatCurrency(totalAmount),
      suppliers: suppliers.slice(0, 3).join(', ') + (suppliers.length > 3 ? ` +${suppliers.length - 3} more` : ''),
      decision: decision.charAt(0).toUpperCase() + decision.slice(1),
      approverName: approverInfo.name,
      approverRole: approverInfo.role,
      approvalDate: this.formatDate(new Date()),
      reason: reason || '',
      dashboardUrl: this.getDashboardUrl(),
      companyName: 'FBMS',
      orderDetails: purchaseOrders.slice(0, 10).map(po => ({
        poNumber: po.poNumber,
        supplier: po.supplierName,
        amount: this.formatCurrency(po.total)
      }))
    };

    const defaultRecipients = await this.getDefaultRecipients('bulk_' + decision);
    const finalRecipients = recipients || defaultRecipients;

    const request: NotificationRequest = {
      templateId: `bulk_${decision}`,
      recipients: finalRecipients,
      variables,
      priority: 'high',
      category: 'approval',
      metadata: {
        purchaseOrderIds: purchaseOrders.map(po => po.id),
        action: `bulk_approval_${decision}`,
        approverId: approverInfo.email
      }
    };

    return this.sendNotification(request);
  }

  /**
   * Send overdue approval reminder
   */
  async sendOverdueReminder(
    purchaseOrders: PurchaseOrder[],
    approvers: NotificationRecipient[],
    daysSinceCreated: number
  ): Promise<NotificationLog[]> {
    const totalAmount = purchaseOrders.reduce((sum, po) => sum + po.total, 0);

    const variables = {
      orderCount: purchaseOrders.length,
      daysSinceCreated: daysSinceCreated.toString(),
      totalAmount: this.formatCurrency(totalAmount),
      urgencyLevel: daysSinceCreated > 7 ? 'Critical' : daysSinceCreated > 3 ? 'High' : 'Medium',
      approvalUrl: this.getDashboardUrl() + '/approvals',
      companyName: 'FBMS',
      orderList: purchaseOrders.slice(0, 5).map(po => ({
        poNumber: po.poNumber,
        supplier: po.supplierName,
        amount: this.formatCurrency(po.total),
        daysSince: Math.floor((Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      }))
    };

    const request: NotificationRequest = {
      templateId: 'overdue_approval_reminder',
      recipients: approvers,
      variables,
      priority: daysSinceCreated > 7 ? 'urgent' : 'high',
      category: 'reminder',
      metadata: {
        purchaseOrderIds: purchaseOrders.map(po => po.id),
        action: 'overdue_reminder',
        daysSinceCreated
      }
    };

    return this.sendNotification(request);
  }

  /**
   * Send status change notification
   */
  async sendStatusChangeNotification(
    purchaseOrder: PurchaseOrder,
    oldStatus: string,
    newStatus: string,
    changedBy: {
      name: string;
      email: string;
      role: string;
    },
    reason?: string,
    recipients?: NotificationRecipient[]
  ): Promise<NotificationLog[]> {
    const variables = {
      poNumber: purchaseOrder.poNumber,
      supplierName: purchaseOrder.supplierName,
      oldStatus: this.formatStatus(oldStatus),
      newStatus: this.formatStatus(newStatus),
      changedBy: changedBy.name,
      changedDate: this.formatDate(new Date()),
      reason: reason || '',
      dashboardUrl: this.getDashboardUrl(),
      companyName: 'FBMS'
    };

    const defaultRecipients = await this.getStatusChangeRecipients(purchaseOrder, newStatus);
    const finalRecipients = recipients || defaultRecipients;

    const request: NotificationRequest = {
      templateId: 'status_change',
      recipients: finalRecipients,
      variables,
      priority: 'normal',
      category: 'status_change',
      metadata: {
        purchaseOrderId: purchaseOrder.id,
        action: 'status_change',
        oldStatus,
        newStatus
      }
    };

    return this.sendNotification(request);
  }

  /**
   * Core notification sending logic
   */
  private async sendNotification(request: NotificationRequest): Promise<NotificationLog[]> {
    if (!this.config.enabled) {
      console.log('Notifications disabled, skipping:', request);
      return [];
    }

    const template = this.config.templates.find(t => t.id === request.templateId);
    if (!template) {
      throw new Error(`Template not found: ${request.templateId}`);
    }

    const logs: NotificationLog[] = [];

    // Process recipients in batches
    for (let i = 0; i < request.recipients.length; i += this.config.batchSize) {
      const batch = request.recipients.slice(i, i + this.config.batchSize);
      
      for (const recipient of batch) {
        const log = await this.sendSingleNotification(template, recipient, request);
        logs.push(log);
      }
    }

    // Log notification batch
    console.log(`Sent ${logs.length} notifications for template ${request.templateId}`, {
      category: request.category,
      priority: request.priority,
      metadata: request.metadata
    });

    return logs;
  }

  /**
   * Send notification to a single recipient
   */
  private async sendSingleNotification(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    request: NotificationRequest
  ): Promise<NotificationLog> {
    const log: NotificationLog = {
      id: this.generateId(),
      templateId: template.id,
      recipient: recipient.email,
      subject: this.replaceVariables(template.subject, request.variables),
      status: 'pending',
      attempts: 0,
      metadata: request.metadata
    };

    try {
      const subject = this.replaceVariables(template.subject, request.variables);
      const htmlBody = this.replaceVariables(template.htmlBody, request.variables);
      const textBody = this.replaceVariables(template.textBody, request.variables);

      // Send based on configured provider
      switch (this.config.emailProvider) {
        case 'supabase':
          await this.sendViaSupabase(recipient, subject, htmlBody, textBody);
          break;
        case 'mock':
          await this.sendViaMock(recipient, subject, htmlBody, textBody);
          break;
        default:
          throw new Error(`Unsupported email provider: ${this.config.emailProvider}`);
      }

      log.status = 'sent';
      log.sentAt = new Date();
      log.attempts = 1;
    } catch (error) {
      log.status = 'failed';
      log.failureReason = error instanceof Error ? error.message : 'Unknown error';
      log.attempts = 1;
      console.error('Failed to send notification:', error);
    }

    return log;
  }

  /**
   * Send via Supabase (if email service is configured)
   */
  private async sendViaSupabase(
    recipient: NotificationRecipient,
    subject: string,
    htmlBody: string,
    textBody: string
  ): Promise<void> {
    // In a real implementation, this would use Supabase Edge Functions or a third-party service
    console.log('Sending email via Supabase:', {
      to: recipient.email,
      subject,
      preview: htmlBody.substring(0, 100) + '...'
    });
    
    // Mock delay to simulate sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Mock email sending for development/testing
   */
  private async sendViaMock(
    recipient: NotificationRecipient,
    subject: string,
    htmlBody: string,
    textBody: string
  ): Promise<void> {
    console.log('📧 Mock Email Sent:', {
      to: recipient.email,
      subject,
      htmlPreview: htmlBody.substring(0, 200) + '...',
      textPreview: textBody.substring(0, 200) + '...'
    });

    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(template: string, variables: Record<string, unknown>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value || ''));
    }
    
    return result;
  }

  /**
   * Get default recipients for different notification types
   */
  private async getDefaultRecipients(
    type: string,
    purchaseOrder?: PurchaseOrder
  ): Promise<NotificationRecipient[]> {
    // In a real implementation, this would query user/role management systems
    return [
      { email: 'manager@fbms.com', name: 'Purchase Manager', role: 'manager' as UserRole },
      { email: 'finance@fbms.com', name: 'Finance Team', role: 'accountant' as UserRole }
    ];
  }

  /**
   * Get recipients for status change notifications
   */
  private async getStatusChangeRecipients(
    purchaseOrder: PurchaseOrder,
    newStatus: string
  ): Promise<NotificationRecipient[]> {
    return [
      { email: 'creator@fbms.com', name: 'Order Creator' },
      { email: 'warehouse@fbms.com', name: 'Warehouse Team' }
    ];
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): NotificationConfig {
    return {
      enabled: true,
      emailProvider: 'mock',
      defaultSender: {
        email: 'noreply@fbms.com',
        name: 'FBMS System'
      },
      retryAttempts: 3,
      retryDelayMs: 5000,
      batchSize: 10,
      templates: this.getDefaultTemplates()
    };
  }

  /**
   * Get default email templates
   */
  private getDefaultTemplates(): NotificationTemplate[] {
    return [
      {
        id: 'approval_request',
        name: 'Approval Request',
        subject: 'Purchase Order {{poNumber}} Requires Your Approval - {{totalAmount}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Purchase Order Approval Required</h2>
            <p>Hello,</p>
            <p>A new purchase order requires your approval:</p>
            
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0;">{{poNumber}}</h3>
              <p><strong>Supplier:</strong> {{supplierName}}</p>
              <p><strong>Total Amount:</strong> {{totalAmount}}</p>
              <p><strong>Items:</strong> {{itemCount}}</p>
              <p><strong>Expected Delivery:</strong> {{expectedDate}}</p>
            </div>

            <div style="margin: 24px 0;">
              <a href="{{approvalUrl}}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review & Approve</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              Please review this purchase order at your earliest convenience.
            </p>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">{{companyName}} Purchase Management System</p>
          </div>
        `,
        textBody: `
Purchase Order Approval Required

Purchase Order: {{poNumber}}
Supplier: {{supplierName}}
Total Amount: {{totalAmount}}
Items: {{itemCount}}
Expected Delivery: {{expectedDate}}

Please review this purchase order at: {{approvalUrl}}

{{companyName}} Purchase Management System
        `,
        variables: ['poNumber', 'supplierName', 'totalAmount', 'itemCount', 'expectedDate', 'approvalUrl', 'companyName']
      },
      {
        id: 'approval_granted',
        name: 'Approval Granted',
        subject: 'Purchase Order {{poNumber}} Approved',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Purchase Order Approved ✓</h2>
            <p>Great news! The following purchase order has been approved:</p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0;">{{poNumber}}</h3>
              <p><strong>Supplier:</strong> {{supplierName}}</p>
              <p><strong>Amount:</strong> {{totalAmount}}</p>
              <p><strong>Approved By:</strong> {{approverName}} ({{approverRole}})</p>
              <p><strong>Approval Date:</strong> {{approvalDate}}</p>
              {{#if reason}}<p><strong>Notes:</strong> {{reason}}</p>{{/if}}
            </div>

            <p>The purchase order is now ready for processing.</p>
            
            <div style="margin: 24px 0;">
              <a href="{{dashboardUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Dashboard</a>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">{{companyName}} Purchase Management System</p>
          </div>
        `,
        textBody: `
Purchase Order Approved ✓

Purchase Order: {{poNumber}}
Supplier: {{supplierName}}
Amount: {{totalAmount}}
Approved By: {{approverName}} ({{approverRole}})
Approval Date: {{approvalDate}}
{{#if reason}}Notes: {{reason}}{{/if}}

The purchase order is now ready for processing.

View Dashboard: {{dashboardUrl}}

{{companyName}} Purchase Management System
        `,
        variables: ['poNumber', 'supplierName', 'totalAmount', 'approverName', 'approverRole', 'approvalDate', 'reason', 'dashboardUrl', 'companyName']
      },
      {
        id: 'approval_rejected',
        name: 'Approval Rejected',
        subject: 'Purchase Order {{poNumber}} Rejected',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Purchase Order Rejected</h2>
            <p>The following purchase order has been rejected:</p>
            
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0;">{{poNumber}}</h3>
              <p><strong>Supplier:</strong> {{supplierName}}</p>
              <p><strong>Amount:</strong> {{totalAmount}}</p>
              <p><strong>Rejected By:</strong> {{approverName}} ({{approverRole}})</p>
              <p><strong>Rejection Date:</strong> {{approvalDate}}</p>
              <p><strong>Reason:</strong> {{reason}}</p>
              {{#if comments}}<p><strong>Comments:</strong> {{comments}}</p>{{/if}}
            </div>

            <p>Please review the rejection reason and make necessary changes before resubmitting.</p>
            
            <div style="margin: 24px 0;">
              <a href="{{dashboardUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Dashboard</a>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">{{companyName}} Purchase Management System</p>
          </div>
        `,
        textBody: `
Purchase Order Rejected

Purchase Order: {{poNumber}}
Supplier: {{supplierName}}
Amount: {{totalAmount}}
Rejected By: {{approverName}} ({{approverRole}})
Rejection Date: {{approvalDate}}
Reason: {{reason}}
{{#if comments}}Comments: {{comments}}{{/if}}

Please review the rejection reason and make necessary changes before resubmitting.

View Dashboard: {{dashboardUrl}}

{{companyName}} Purchase Management System
        `,
        variables: ['poNumber', 'supplierName', 'totalAmount', 'approverName', 'approverRole', 'approvalDate', 'reason', 'comments', 'dashboardUrl', 'companyName']
      },
      {
        id: 'overdue_approval_reminder',
        name: 'Overdue Approval Reminder',
        subject: 'REMINDER: {{orderCount}} Purchase Orders Awaiting Approval ({{daysSinceCreated}} days)',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">⏰ Purchase Orders Awaiting Approval</h2>
            <p>You have {{orderCount}} purchase orders that have been awaiting approval for {{daysSinceCreated}} days.</p>
            
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
              <p><strong>Priority Level:</strong> {{urgencyLevel}}</p>
              <p><strong>Total Value:</strong> {{totalAmount}}</p>
              <p><strong>Days Since Created:</strong> {{daysSinceCreated}}</p>
            </div>

            <h3>Orders Requiring Attention:</h3>
            <ul>
              {{#each orderList}}
                <li>{{poNumber}} - {{supplier}} ({{amount}}) - {{daysSince}} days</li>
              {{/each}}
            </ul>

            <div style="margin: 24px 0;">
              <a href="{{approvalUrl}}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review Now</a>
            </div>
            
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">{{companyName}} Purchase Management System</p>
          </div>
        `,
        textBody: `
⏰ Purchase Orders Awaiting Approval

You have {{orderCount}} purchase orders awaiting approval for {{daysSinceCreated}} days.

Priority Level: {{urgencyLevel}}
Total Value: {{totalAmount}}

Orders requiring attention:
{{#each orderList}}
- {{poNumber}} - {{supplier}} ({{amount}}) - {{daysSince}} days
{{/each}}

Review at: {{approvalUrl}}

{{companyName}} Purchase Management System
        `,
        variables: ['orderCount', 'daysSinceCreated', 'urgencyLevel', 'totalAmount', 'orderList', 'approvalUrl', 'companyName']
      }
    ];
  }

  // Helper methods
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  private formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatStatus(status: string): string {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private getItemSummary(items: any[]): string {
    return items.map(item => `${item.productName} (${item.quantity})`).join(', ');
  }

  private getApprovalUrl(purchaseOrderId: string): string {
    return `${window.location.origin}/purchase-orders/${purchaseOrderId}/approve`;
  }

  private getDashboardUrl(): string {
    return `${window.location.origin}/dashboard`;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;