import { PurchaseOrder, EnhancedPurchaseOrderStatus } from '../types/business';
import { UserRole } from '../types/auth';
import { validatePurchaseOrderApproval } from '../utils/purchaseOrderPermissions';
import { purchaseOrderStateMachine } from './purchaseOrderStateMachine';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export interface ApprovalRequest {
  purchaseOrderId: string;
  reason: string;
  comments?: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  reasonId?: string;
  customReason?: string;
}

export interface BulkApprovalRequest {
  purchaseOrderIds: string[];
  reason: string;
  comments?: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  reasonId?: string;
  customReason?: string;
}

export interface ApprovalResult {
  success: boolean;
  purchaseOrderId: string;
  error?: string;
  previousStatus?: string;
  newStatus?: string;
}

export interface BulkApprovalResult {
  results: ApprovalResult[];
  successCount: number;
  failureCount: number;
  errors: string[];
}

export interface RejectionRequest {
  purchaseOrderId: string;
  reason: string;
  comments: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  reasonId?: string;
  customReason?: string;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  slackEnabled: boolean;
  inAppEnabled: boolean;
  recipients: {
    creator: boolean;
    manager: boolean;
    finance: boolean;
    custom: string[];
  };
}

class ApprovalWorkflowService {
  /**
   * Approve a single purchase order
   */
  async approvePurchaseOrder(
    purchaseOrder: PurchaseOrder,
    request: ApprovalRequest,
    userRole: UserRole
  ): Promise<ApprovalResult> {
    try {
      // Validate approval permissions
      const validation = validatePurchaseOrderApproval(
        userRole,
        purchaseOrder.total,
        purchaseOrder
      );

      if (!validation.isValid) {
        return {
          success: false,
          purchaseOrderId: purchaseOrder.id,
          error: validation.reason
        };
      }

      // Check valid status transition
      const currentStatus = this.mapLegacyToEnhanced(purchaseOrder.status);
      const canTransitionToApproved = purchaseOrderStateMachine.canTransition(
        currentStatus,
        'approved'
      );

      if (!canTransitionToApproved) {
        return {
          success: false,
          purchaseOrderId: purchaseOrder.id,
          error: `Cannot approve purchase order in status: ${currentStatus}`
        };
      }

      // Execute the approval
      const previousStatus = purchaseOrder.status;
      const newStatus = this.mapEnhancedToLegacy('approved');

      // Update purchase order status
      // Note: In a real implementation, this would call the API
      await this.updatePurchaseOrderStatus(
        purchaseOrder.id,
        newStatus,
        request
      );

      // Log the approval in audit trail
      await auditService.logPurchaseOrderAction({
        purchaseOrderId: purchaseOrder.id,
        purchaseOrderNumber: purchaseOrder.poNumber,
        action: 'status_changed',
        performedBy: request.userId,
        performedByName: request.userEmail,
        timestamp: new Date(request.timestamp),
        oldValues: { status: previousStatus },
        newValues: { status: newStatus },
        reason: `Approved: ${request.reason}${request.comments ? ` - ${request.comments}` : ''}`
      });

      // Send approval notification
      await notificationService.sendApprovalDecision(
        purchaseOrder,
        'approved',
        {
          name: request.userEmail,
          email: request.userEmail,
          role: userRole
        },
        request.reason,
        request.comments
      );

      return {
        success: true,
        purchaseOrderId: purchaseOrder.id,
        previousStatus,
        newStatus
      };

    } catch (error) {
      console.error('Error approving purchase order:', error);
      return {
        success: false,
        purchaseOrderId: purchaseOrder.id,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Approve multiple purchase orders in bulk
   */
  async bulkApprovePurchaseOrders(
    purchaseOrders: PurchaseOrder[],
    request: BulkApprovalRequest,
    userRole: UserRole
  ): Promise<BulkApprovalResult> {
    const results: ApprovalResult[] = [];
    const errors: string[] = [];

    // Process each purchase order
    for (const po of purchaseOrders) {
      const approvalRequest: ApprovalRequest = {
        purchaseOrderId: po.id,
        reason: request.reason,
        comments: request.comments,
        userId: request.userId,
        userEmail: request.userEmail,
        timestamp: request.timestamp,
        reasonId: request.reasonId,
        customReason: request.customReason
      };

      const result = await this.approvePurchaseOrder(po, approvalRequest, userRole);
      results.push(result);

      if (!result.success && result.error) {
        errors.push(`${po.poNumber}: ${result.error}`);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    // Log bulk approval action
    await auditService.logPurchaseOrderAction({
      purchaseOrderId: 'BULK_OPERATION',
      purchaseOrderNumber: `Bulk Approval (${purchaseOrders.length} orders)`,
      action: 'bulk_approved',
      performedBy: request.userId,
      performedByName: request.userEmail,
      timestamp: new Date(request.timestamp),
      reason: `Bulk approval: ${request.reason}${request.comments ? ` - ${request.comments}` : ''}`,
      metadata: {
        purchaseOrderIds: request.purchaseOrderIds,
        successCount,
        failureCount,
        totalAmount: purchaseOrders.reduce((sum, po) => sum + po.total, 0)
      }
    });

    // Send bulk approval notification
    if (successCount > 0) {
      await notificationService.sendBulkApprovalNotification(
        purchaseOrders.filter((_, index) => results[index].success),
        'approved',
        {
          name: request.userEmail,
          email: request.userEmail,
          role: userRole
        },
        request.reason
      );
    }

    return {
      results,
      successCount,
      failureCount,
      errors
    };
  }

  /**
   * Reject a purchase order
   */
  async rejectPurchaseOrder(
    purchaseOrder: PurchaseOrder,
    request: RejectionRequest,
    userRole: UserRole
  ): Promise<ApprovalResult> {
    try {
      // Validate rejection permissions (same as approval permissions)
      const validation = validatePurchaseOrderApproval(
        userRole,
        purchaseOrder.total,
        purchaseOrder
      );

      if (!validation.isValid) {
        return {
          success: false,
          purchaseOrderId: purchaseOrder.id,
          error: validation.reason
        };
      }

      // Check valid status transition to cancelled
      const currentStatus = this.mapLegacyToEnhanced(purchaseOrder.status);
      const canTransitionToCancelled = purchaseOrderStateMachine.canTransition(
        currentStatus,
        'cancelled'
      );

      if (!canTransitionToCancelled) {
        return {
          success: false,
          purchaseOrderId: purchaseOrder.id,
          error: `Cannot reject purchase order in status: ${currentStatus}`
        };
      }

      // Execute the rejection
      const previousStatus = purchaseOrder.status;
      const newStatus = this.mapEnhancedToLegacy('cancelled');

      // Update purchase order status
      await this.updatePurchaseOrderStatus(
        purchaseOrder.id,
        newStatus,
        request
      );

      // Log the rejection in audit trail
      await auditService.logPurchaseOrderAction({
        purchaseOrderId: purchaseOrder.id,
        purchaseOrderNumber: purchaseOrder.poNumber,
        action: 'status_changed',
        performedBy: request.userId,
        performedByName: request.userEmail,
        timestamp: new Date(request.timestamp),
        oldValues: { status: previousStatus },
        newValues: { status: newStatus },
        reason: `Rejected: ${request.reason} - ${request.comments}`
      });

      // Send rejection notification
      await notificationService.sendApprovalDecision(
        purchaseOrder,
        'rejected',
        {
          name: request.userEmail,
          email: request.userEmail,
          role: userRole
        },
        request.reason,
        request.comments
      );

      return {
        success: true,
        purchaseOrderId: purchaseOrder.id,
        previousStatus,
        newStatus
      };

    } catch (error) {
      console.error('Error rejecting purchase order:', error);
      return {
        success: false,
        purchaseOrderId: purchaseOrder.id,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get approval workflow statistics
   */
  async getApprovalStats(userRole: UserRole, dateRange?: { from: Date; to: Date }) {
    // In a real implementation, this would query the database
    // For now, return mock data structure
    return {
      pendingApprovals: 0,
      totalApproved: 0,
      totalRejected: 0,
      averageApprovalTime: 0,
      approvalRate: 0,
      overdueApprovals: 0,
      highValuePending: 0
    };
  }

  /**
   * Get approval history for a purchase order
   */
  async getApprovalHistory(purchaseOrderId: string) {
    return auditService.getPurchaseOrderAuditLog(purchaseOrderId, {
      actions: ['status_changed', 'approved', 'rejected']
    });
  }

  /**
   * Configure notification settings for approval workflow
   */
  async updateNotificationConfig(config: NotificationConfig) {
    // In a real implementation, this would save to database/settings
    console.log('Updating notification config:', config);
  }

  /**
   * Send reminder notifications for overdue approvals
   */
  async sendOverdueApprovalReminders(userRole: UserRole) {
    try {
      // Get overdue purchase orders (older than 3 days)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      // In a real implementation, this would query the database
      // For now, we'll use a mock implementation
      const overduePOs = await this.getOverduePurchaseOrders(threeDaysAgo);
      
      if (overduePOs.length === 0) {
        return { sent: 0, message: 'No overdue approvals found' };
      }

      // Group by days overdue for different reminder urgency
      const criticalOverdue = overduePOs.filter(po => 
        Math.floor((Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24)) > 7
      );
      const normalOverdue = overduePOs.filter(po => 
        Math.floor((Date.now() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24)) <= 7
      );

      let totalSent = 0;

      // Send critical reminders
      if (criticalOverdue.length > 0) {
        const approvers = await this.getApprovingUsers(userRole);
        await notificationService.sendOverdueReminder(
          criticalOverdue,
          approvers,
          Math.floor((Date.now() - new Date(criticalOverdue[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
        );
        totalSent += criticalOverdue.length;
      }

      // Send normal reminders
      if (normalOverdue.length > 0) {
        const approvers = await this.getApprovingUsers(userRole);
        await notificationService.sendOverdueReminder(
          normalOverdue,
          approvers,
          Math.floor((Date.now() - new Date(normalOverdue[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
        );
        totalSent += normalOverdue.length;
      }

      return { sent: totalSent, message: `Sent ${totalSent} overdue approval reminders` };
    } catch (error) {
      console.error('Error sending overdue reminders:', error);
      return { sent: 0, error: 'Failed to send reminders' };
    }
  }

  /**
   * Get overdue purchase orders
   */
  private async getOverduePurchaseOrders(cutoffDate: Date): Promise<PurchaseOrder[]> {
    // In a real implementation, this would query the database for:
    // - POs with status 'draft' or 'pending_approval'
    // - Created before cutoffDate
    // - Not yet approved or rejected
    return [];
  }

  /**
   * Get users who can approve purchase orders
   */
  private async getApprovingUsers(userRole: UserRole) {
    // In a real implementation, this would query the user management system
    return [
      { email: 'manager@fbms.com', name: 'Purchase Manager', role: 'manager' as UserRole },
      { email: 'admin@fbms.com', name: 'System Admin', role: 'admin' as UserRole }
    ];
  }

  /**
   * Update purchase order status
   */
  private async updatePurchaseOrderStatus(
    purchaseOrderId: string,
    newStatus: string,
    request: any
  ) {
    // In a real implementation, this would call the purchase order API
    console.log(`Updating PO ${purchaseOrderId} status to ${newStatus}`, request);
  }

  /**
   * Map legacy status to enhanced status
   */
  private mapLegacyToEnhanced(legacyStatus: string): EnhancedPurchaseOrderStatus {
    const statusMap: Record<string, EnhancedPurchaseOrderStatus> = {
      'draft': 'draft',
      'pending': 'pending_approval',
      'approved': 'approved',
      'sent': 'sent_to_supplier',
      'received': 'fully_received',
      'partial': 'partially_received',
      'cancelled': 'cancelled'
    };
    return statusMap[legacyStatus] as EnhancedPurchaseOrderStatus || 'draft';
  }

  /**
   * Map enhanced status back to legacy status
   */
  private mapEnhancedToLegacy(enhancedStatus: EnhancedPurchaseOrderStatus): string {
    const statusMap: Record<EnhancedPurchaseOrderStatus, string> = {
      'draft': 'draft',
      'pending_approval': 'pending',
      'approved': 'sent', // Approved POs should be ready for receiving (map to 'sent')
      'sent_to_supplier': 'sent',
      'partially_received': 'partial',
      'fully_received': 'received',
      'cancelled': 'cancelled',
      'closed': 'received'
    };
    return statusMap[enhancedStatus] || 'draft';
  }

  /**
   * Validate approval thresholds based on business rules
   */
  validateApprovalThresholds(
    purchaseOrders: PurchaseOrder[],
    userRole: UserRole
  ): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];
    const totalAmount = purchaseOrders.reduce((sum, po) => sum + po.total, 0);

    // Example business rules - these would be configurable
    switch (userRole) {
      case 'manager':
        if (totalAmount > 100000) {
          violations.push(`Total amount ${totalAmount.toLocaleString()} exceeds manager limit of ₱100,000`);
        }
        break;
      case 'admin':
        // Admin has no limits
        break;
      default:
        violations.push(`Role ${userRole} cannot approve purchase orders`);
    }

    // Check for other business rules
    const highValueOrders = purchaseOrders.filter(po => po.total > 50000);
    if (highValueOrders.length > 0 && userRole !== 'admin' && userRole !== 'manager') {
      violations.push('High-value orders require manager or admin approval');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }
}

// Export singleton instance
export const approvalWorkflowService = new ApprovalWorkflowService();
export default approvalWorkflowService;