import { 
  NotificationTemplate,
  NotificationEvent,
  EmailNotificationConfig 
} from '../types/purchaseOrderConfig';
import { purchaseOrderWorkflowConfigService } from './purchaseOrderWorkflowConfigService';
import { PurchaseOrder } from '../types/business';
import { UserRole } from '../types/auth';

export interface WorkflowNotificationContext {
  purchaseOrder: PurchaseOrder;
  event: NotificationEvent;
  actor: {
    userId: string;
    name: string;
    email: string;
    role: UserRole;
  };
  metadata?: Record<string, any>;
}

export interface NotificationRecipient {
  email: string;
  name?: string;
  role?: UserRole;
  userId?: string;
}

export interface TemplateVariable {
  key: string;
  value: string | number | boolean;
  type: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'array';
}

export interface NotificationResult {
  success: boolean;
  templateId: string;
  recipients: string[];
  error?: string;
  deliveryStatus: Record<string, 'sent' | 'failed' | 'pending'>;
}

export class WorkflowNotificationService {
  private readonly defaultTemplates: NotificationTemplate[] = [
    {
      id: 'approval_request_v2',
      name: 'Enhanced Approval Request',
      event: 'approval_request',
      subject: '[Action Required] Purchase Order {{poNumber}} - {{totalAmount}} Approval Needed',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Purchase Order Approval Required</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">{{companyName}}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">Purchase Management System</p>
            </div>
            
            <!-- Alert Banner -->
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 0;">
              <div style="display: flex; align-items: center;">
                <div style="color: #92400e; font-weight: bold; font-size: 16px;">⚠️ Approval Required</div>
                <div style="margin-left: auto; color: #92400e; font-size: 14px;">Priority: {{priority}}</div>
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 24px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                Hello {{recipientName}},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #374151;">
                A purchase order requires your approval. Please review the details below:
              </p>
              
              <!-- Purchase Order Details Card -->
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 24px 0;">
                <div style="background-color: #f9fafb; padding: 16px; border-bottom: 1px solid #e5e7eb;">
                  <h3 style="margin: 0; color: #111827; font-size: 18px;">{{poNumber}}</h3>
                </div>
                <div style="padding: 16px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Supplier:</td>
                      <td style="padding: 8px 0; color: #111827; font-weight: 600;">{{supplierName}}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Total Amount:</td>
                      <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 18px;">{{totalAmount}}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Items:</td>
                      <td style="padding: 8px 0; color: #111827;">{{itemCount}} items</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Expected Delivery:</td>
                      <td style="padding: 8px 0; color: #111827;">{{expectedDate}}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Created:</td>
                      <td style="padding: 8px 0; color: #111827;">{{createdDate}} by {{creatorName}}</td>
                    </tr>
                    {{#if urgencyReason}}
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Urgency:</td>
                      <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">{{urgencyReason}}</td>
                    </tr>
                    {{/if}}
                  </table>
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="{{approvalUrl}}&action=approve" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 12px;">✓ Approve</a>
                <a href="{{approvalUrl}}&action=reject" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 12px;">✗ Reject</a>
                <a href="{{approvalUrl}}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">👁️ Review Details</a>
              </div>
              
              {{#if approvalDeadline}}
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                  ⏰ <strong>Deadline:</strong> Please review by {{approvalDeadline}}
                </p>
              </div>
              {{/if}}
              
              <!-- Item Summary -->
              {{#if itemSummary}}
              <div style="margin: 24px 0;">
                <h4 style="color: #374151; margin: 0 0 12px 0;">Items Summary:</h4>
                <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px;">
                  <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">{{itemSummary}}</p>
                </div>
              </div>
              {{/if}}
              
              <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
                This approval request was generated automatically. If you have questions, please contact the finance team or the purchase order creator.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                {{companyName}} Purchase Management System<br>
                <a href="{{dashboardUrl}}" style="color: #2563eb; text-decoration: none;">Access Dashboard</a> | 
                <a href="{{helpUrl}}" style="color: #2563eb; text-decoration: none;">Get Help</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      textBody: `
Purchase Order Approval Required

Hello {{recipientName}},

A purchase order requires your approval:

Purchase Order: {{poNumber}}
Supplier: {{supplierName}}
Total Amount: {{totalAmount}}
Items: {{itemCount}}
Expected Delivery: {{expectedDate}}
Created: {{createdDate}} by {{creatorName}}
Priority: {{priority}}

{{#if urgencyReason}}
Urgency: {{urgencyReason}}
{{/if}}

Please review and approve at: {{approvalUrl}}

{{#if approvalDeadline}}
Deadline: {{approvalDeadline}}
{{/if}}

{{#if itemSummary}}
Items: {{itemSummary}}
{{/if}}

{{companyName}} Purchase Management System
Dashboard: {{dashboardUrl}}
      `,
      variables: [
        'poNumber', 'supplierName', 'totalAmount', 'itemCount', 'expectedDate',
        'createdDate', 'creatorName', 'priority', 'urgencyReason', 'approvalUrl',
        'approvalDeadline', 'itemSummary', 'dashboardUrl', 'helpUrl', 'companyName',
        'recipientName'
      ],
      isActive: true,
      priority: 'high',
      delayMinutes: 0
    },
    
    {
      id: 'price_variance_alert',
      name: 'Price Variance Alert',
      event: 'price_variance_alert',
      subject: 'Price Variance Alert: {{poNumber}} - {{varianceAmount}} difference detected',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
            <h2 style="color: #dc2626; margin: 0 0 16px 0;">⚠️ Price Variance Detected</h2>
            <p><strong>Purchase Order:</strong> {{poNumber}}</p>
            <p><strong>Supplier:</strong> {{supplierName}}</p>
            <p><strong>Expected Amount:</strong> {{originalAmount}}</p>
            <p><strong>Received Amount:</strong> {{receivedAmount}}</p>
            <p><strong>Variance:</strong> {{varianceAmount}} ({{variancePercentage}}%)</p>
            <p><strong>Variance Type:</strong> {{varianceType}}</p>
          </div>
          
          <p>A significant price variance has been detected in the above purchase order. Please review and take appropriate action.</p>
          
          {{#if requiresApproval}}
          <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin: 16px 0;">
            <p style="margin: 0; color: #92400e;"><strong>Action Required:</strong> This variance requires management approval before processing.</p>
          </div>
          {{/if}}
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="{{reviewUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Review Variance</a>
          </div>
        </body>
        </html>
      `,
      textBody: `
Price Variance Alert

Purchase Order: {{poNumber}}
Supplier: {{supplierName}}
Expected Amount: {{originalAmount}}
Received Amount: {{receivedAmount}}
Variance: {{varianceAmount}} ({{variancePercentage}}%)

{{#if requiresApproval}}
This variance requires management approval before processing.
{{/if}}

Review at: {{reviewUrl}}
      `,
      variables: [
        'poNumber', 'supplierName', 'originalAmount', 'receivedAmount',
        'varianceAmount', 'variancePercentage', 'varianceType', 'requiresApproval', 'reviewUrl'
      ],
      isActive: true,
      priority: 'high',
      delayMinutes: 0
    },
    
    {
      id: 'receiving_reminder',
      name: 'Receiving Reminder',
      event: 'receiving_reminder',
      subject: 'Reminder: {{orderCount}} Purchase Orders Ready for Receiving',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">📦 Receiving Reminder</h2>
          <p>Hello {{recipientName}},</p>
          <p>The following purchase orders are ready for receiving:</p>
          
          <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="margin: 0 0 12px 0;">Summary</h3>
            <p><strong>Orders Ready:</strong> {{orderCount}}</p>
            <p><strong>Total Value:</strong> {{totalValue}}</p>
            <p><strong>Oldest Order:</strong> {{oldestOrderAge}} days</p>
          </div>
          
          <h4>Orders Awaiting Receipt:</h4>
          <ul>
            {{#each orders}}
            <li>{{poNumber}} - {{supplier}} ({{amount}}) - {{daysOld}} days old</li>
            {{/each}}
          </ul>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="{{receivingUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Start Receiving</a>
          </div>
        </body>
        </html>
      `,
      textBody: `
Receiving Reminder

Hello {{recipientName}},

{{orderCount}} purchase orders are ready for receiving:

Total Value: {{totalValue}}
Oldest Order: {{oldestOrderAge}} days

Orders awaiting receipt:
{{#each orders}}
- {{poNumber}} - {{supplier}} ({{amount}}) - {{daysOld}} days old
{{/each}}

Start receiving at: {{receivingUrl}}
      `,
      variables: [
        'recipientName', 'orderCount', 'totalValue', 'oldestOrderAge', 
        'orders', 'receivingUrl'
      ],
      isActive: true,
      priority: 'normal',
      delayMinutes: 0
    },

    {
      id: 'partial_receipt',
      name: 'Partial Receipt Notification',
      event: 'partial_receipt',
      subject: 'Partial Receipt Recorded: {{poNumber}} - {{receivedItems}}/{{totalItems}} items received',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">📦 Partial Receipt Recorded</h2>
          <p>A partial receipt has been recorded for purchase order {{poNumber}}:</p>
          
          <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 16px 0;">
            <p><strong>Purchase Order:</strong> {{poNumber}}</p>
            <p><strong>Supplier:</strong> {{supplierName}}</p>
            <p><strong>Received By:</strong> {{receivedBy}}</p>
            <p><strong>Receipt Date:</strong> {{receiptDate}}</p>
            <p><strong>Items Received:</strong> {{receivedItems}} of {{totalItems}}</p>
            <p><strong>Completion:</strong> {{completionPercentage}}%</p>
          </div>
          
          {{#if hasRemainingItems}}
          <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin: 16px 0;">
            <h4 style="margin: 0 0 8px 0; color: #92400e;">Outstanding Items:</h4>
            <ul style="margin: 0; color: #92400e;">
              {{#each remainingItems}}
              <li>{{productName}}: {{remainingQuantity}} {{unit}} ({{expectedDate}})</li>
              {{/each}}
            </ul>
          </div>
          {{/if}}
          
          {{#if notes}}
          <div style="background: #f9fafb; border-radius: 6px; padding: 12px; margin: 16px 0;">
            <h4 style="margin: 0 0 8px 0;">Notes:</h4>
            <p style="margin: 0;">{{notes}}</p>
          </div>
          {{/if}}
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="{{poUrl}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Purchase Order</a>
          </div>
        </body>
        </html>
      `,
      textBody: `
Partial Receipt Recorded

Purchase Order: {{poNumber}}
Supplier: {{supplierName}}
Received By: {{receivedBy}}
Receipt Date: {{receiptDate}}
Items Received: {{receivedItems}} of {{totalItems}} ({{completionPercentage}}%)

{{#if hasRemainingItems}}
Outstanding Items:
{{#each remainingItems}}
- {{productName}}: {{remainingQuantity}} {{unit}}
{{/each}}
{{/if}}

{{#if notes}}
Notes: {{notes}}
{{/if}}

View purchase order: {{poUrl}}
      `,
      variables: [
        'poNumber', 'supplierName', 'receivedBy', 'receiptDate', 'receivedItems',
        'totalItems', 'completionPercentage', 'hasRemainingItems', 'remainingItems',
        'notes', 'poUrl'
      ],
      isActive: true,
      priority: 'normal',
      delayMinutes: 0
    }
  ];

  constructor() {
    // Initialize default templates if not already set
    this.initializeDefaultTemplates();
  }

  /**
   * Send workflow notification
   */
  async sendWorkflowNotification(
    context: WorkflowNotificationContext,
    recipients: NotificationRecipient[]
  ): Promise<NotificationResult> {
    try {
      const template = purchaseOrderWorkflowConfigService.getNotificationTemplate(context.event);
      
      if (!template) {
        return {
          success: false,
          templateId: '',
          recipients: [],
          error: `No template found for event: ${context.event}`,
          deliveryStatus: {}
        };
      }

      if (!template.isActive) {
        return {
          success: false,
          templateId: template.id,
          recipients: [],
          error: 'Template is not active',
          deliveryStatus: {}
        };
      }

      // Generate template variables
      const variables = this.generateTemplateVariables(context);
      
      // Process recipients
      const processedRecipients = await this.processRecipients(recipients, context);
      
      // Send notifications
      const deliveryStatus: Record<string, 'sent' | 'failed' | 'pending'> = {};
      
      for (const recipient of processedRecipients) {
        try {
          await this.sendSingleNotification(template, recipient, variables, context);
          deliveryStatus[recipient.email] = 'sent';
        } catch (error) {
          console.error(`Failed to send notification to ${recipient.email}:`, error);
          deliveryStatus[recipient.email] = 'failed';
        }
      }

      return {
        success: true,
        templateId: template.id,
        recipients: processedRecipients.map(r => r.email),
        deliveryStatus
      };

    } catch (error) {
      console.error('Failed to send workflow notification:', error);
      return {
        success: false,
        templateId: '',
        recipients: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryStatus: {}
      };
    }
  }

  /**
   * Generate template variables from context
   */
  private generateTemplateVariables(context: WorkflowNotificationContext): Record<string, any> {
    const { purchaseOrder, actor, metadata } = context;
    
    const baseVariables = {
      // Purchase Order Info
      poNumber: purchaseOrder.poNumber || purchaseOrder.id,
      supplierName: purchaseOrder.supplierName,
      totalAmount: this.formatCurrency(purchaseOrder.total),
      itemCount: purchaseOrder.items.length,
      createdDate: this.formatDate(purchaseOrder.createdAt),
      expectedDate: purchaseOrder.expectedDate ? this.formatDate(purchaseOrder.expectedDate) : 'Not specified',
      status: this.formatStatus(purchaseOrder.status),
      currency: purchaseOrder.currency || 'PHP',
      
      // Actor Info
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: this.formatRole(actor.role),
      creatorName: actor.name, // Alias for backward compatibility
      
      // System Info
      companyName: 'FBMS',
      dashboardUrl: this.getDashboardUrl(),
      helpUrl: this.getHelpUrl(),
      timestamp: this.formatDateTime(new Date()),
      
      // URLs
      approvalUrl: this.getApprovalUrl(purchaseOrder.id),
      poUrl: this.getPurchaseOrderUrl(purchaseOrder.id),
      receivingUrl: this.getReceivingUrl(purchaseOrder.id),
      reviewUrl: this.getReviewUrl(purchaseOrder.id),
      
      // Derived Info
      priority: this.getPriority(purchaseOrder, context.event),
      itemSummary: this.getItemSummary(purchaseOrder.items.slice(0, 5)),
      
      // Conditional fields
      urgencyReason: metadata?.urgencyReason,
      approvalDeadline: metadata?.approvalDeadline ? this.formatDate(metadata.approvalDeadline) : null,
      notes: metadata?.notes,
    };

    // Add event-specific variables
    switch (context.event) {
      case 'price_variance_alert':
        return {
          ...baseVariables,
          originalAmount: this.formatCurrency(metadata?.originalAmount || 0),
          receivedAmount: this.formatCurrency(metadata?.receivedAmount || 0),
          varianceAmount: this.formatCurrency(metadata?.varianceAmount || 0),
          variancePercentage: metadata?.variancePercentage || 0,
          varianceType: metadata?.varianceType || 'unknown',
          requiresApproval: metadata?.requiresApproval || false
        };
        
      case 'partial_receipt':
        return {
          ...baseVariables,
          receivedBy: metadata?.receivedBy || actor.name,
          receiptDate: this.formatDate(metadata?.receiptDate || new Date()),
          receivedItems: metadata?.receivedItems || 0,
          totalItems: metadata?.totalItems || purchaseOrder.items.length,
          completionPercentage: metadata?.completionPercentage || 0,
          hasRemainingItems: metadata?.hasRemainingItems || false,
          remainingItems: metadata?.remainingItems || []
        };
        
      case 'receiving_reminder':
        return {
          ...baseVariables,
          orderCount: metadata?.orderCount || 1,
          totalValue: this.formatCurrency(metadata?.totalValue || purchaseOrder.total),
          oldestOrderAge: metadata?.oldestOrderAge || 0,
          orders: metadata?.orders || [{ 
            poNumber: purchaseOrder.poNumber,
            supplier: purchaseOrder.supplierName,
            amount: this.formatCurrency(purchaseOrder.total),
            daysOld: 0
          }]
        };
        
      default:
        return baseVariables;
    }
  }

  /**
   * Process and validate recipients
   */
  private async processRecipients(
    recipients: NotificationRecipient[],
    context: WorkflowNotificationContext
  ): Promise<NotificationRecipient[]> {
    const processed: NotificationRecipient[] = [];
    
    for (const recipient of recipients) {
      // Add recipient name if missing
      const processedRecipient: NotificationRecipient = {
        ...recipient,
        name: recipient.name || this.extractNameFromEmail(recipient.email)
      };
      
      processed.push(processedRecipient);
    }
    
    return processed;
  }

  /**
   * Send single notification
   */
  private async sendSingleNotification(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    variables: Record<string, any>,
    context: WorkflowNotificationContext
  ): Promise<void> {
    // Add recipient-specific variables
    const recipientVariables = {
      ...variables,
      recipientName: recipient.name || 'User',
      recipientEmail: recipient.email,
      recipientRole: recipient.role ? this.formatRole(recipient.role) : ''
    };

    const subject = this.replaceVariables(template.subject, recipientVariables);
    const htmlBody = this.replaceVariables(template.htmlBody, recipientVariables);
    const textBody = this.replaceVariables(template.textBody, recipientVariables);

    // Apply delay if configured
    if (template.delayMinutes && template.delayMinutes > 0) {
      await new Promise(resolve => setTimeout(resolve, template.delayMinutes * 60 * 1000));
    }

    // Mock email sending (in real implementation, this would use actual email service)
    console.log(`📧 Workflow Notification Sent:`, {
      event: context.event,
      template: template.id,
      to: recipient.email,
      subject,
      priority: template.priority,
      htmlPreview: htmlBody.substring(0, 200) + '...'
    });

    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    const config = purchaseOrderWorkflowConfigService.getConfig();
    
    if (config.emailNotifications.templates.length === 0) {
      // Add default templates
      for (const template of this.defaultTemplates) {
        purchaseOrderWorkflowConfigService.updateConfig({
          emailNotifications: {
            ...config.emailNotifications,
            templates: [...config.emailNotifications.templates, template]
          }
        });
      }
    }
  }

  /**
   * Replace variables in template
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Handle Handlebars-style conditionals and loops (basic implementation)
    result = this.processHandlebarsConditionals(result, variables);
    result = this.processHandlebarsLoops(result, variables);
    
    // Replace simple variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value || ''));
    }
    
    return result;
  }

  /**
   * Process Handlebars-style conditionals
   */
  private processHandlebarsConditionals(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Process {{#if condition}} blocks
    const ifPattern = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    result = result.replace(ifPattern, (match, condition, content) => {
      return variables[condition] ? content : '';
    });
    
    return result;
  }

  /**
   * Process Handlebars-style loops
   */
  private processHandlebarsLoops(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Process {{#each array}} blocks
    const eachPattern = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    result = result.replace(eachPattern, (match, arrayName, content) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        let itemContent = content;
        for (const [key, value] of Object.entries(item)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          itemContent = itemContent.replace(regex, String(value || ''));
        }
        return itemContent;
      }).join('');
    });
    
    return result;
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

  private formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleString('en-PH');
  }

  private formatStatus(status: string): string {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  private formatRole(role: UserRole): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  private getPriority(purchaseOrder: PurchaseOrder, event: NotificationEvent): string {
    if (purchaseOrder.total > 100000) return 'High';
    if (purchaseOrder.total > 50000) return 'Medium';
    return 'Normal';
  }

  private getItemSummary(items: any[]): string {
    return items.map(item => `${item.productName} (${item.quantity})`).join(', ');
  }

  private extractNameFromEmail(email: string): string {
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/[._]/g, ' ');
  }

  private getDashboardUrl(): string {
    return `${window.location.origin}/dashboard`;
  }

  private getHelpUrl(): string {
    return `${window.location.origin}/help`;
  }

  private getApprovalUrl(purchaseOrderId: string): string {
    return `${window.location.origin}/purchase-orders/${purchaseOrderId}/approve`;
  }

  private getPurchaseOrderUrl(purchaseOrderId: string): string {
    return `${window.location.origin}/purchase-orders/${purchaseOrderId}`;
  }

  private getReceivingUrl(purchaseOrderId: string): string {
    return `${window.location.origin}/purchase-orders/${purchaseOrderId}/receive`;
  }

  private getReviewUrl(purchaseOrderId: string): string {
    return `${window.location.origin}/purchase-orders/${purchaseOrderId}/review`;
  }
}

// Export singleton instance
export const workflowNotificationService = new WorkflowNotificationService();
export default workflowNotificationService;