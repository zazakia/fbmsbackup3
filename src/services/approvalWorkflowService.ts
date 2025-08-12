import { PurchaseOrder, EnhancedPurchaseOrderStatus } from '../types/business';
import { UserRole } from '../types/auth';
import { validatePurchaseOrderApproval } from '../utils/purchaseOrderPermissions';
import { purchaseOrderStateMachine } from './purchaseOrderStateMachine';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { receivingIntegrationService, ApprovalContext } from './receivingIntegrationService';

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

      // Check and handle proper status transitions  
      const currentStatus = purchaseOrder.enhancedStatus || this.mapLegacyToEnhanced(purchaseOrder.status);
      
      // If the PO is in draft, first transition it to pending_approval
      if (currentStatus === 'draft') {
        const canTransitionToPending = purchaseOrderStateMachine.canTransition(
          currentStatus,
          'pending_approval'
        );
        
        if (!canTransitionToPending) {
          return {
            success: false,
            purchaseOrderId: purchaseOrder.id,
            error: `Cannot move purchase order from ${currentStatus} to pending approval`
          };
        }
        
        // Update to pending_approval first
        await this.updatePurchaseOrderStatus(
          purchaseOrder.id,
          'pending_approval',
          request
        );
        
        // Update the purchase order enhanced status for the next check
        purchaseOrder.enhancedStatus = 'pending_approval';
      }
      
      // Now check if we can transition to approved
      const updatedStatus = purchaseOrder.enhancedStatus || this.mapLegacyToEnhanced(purchaseOrder.status);
      const canTransitionToApproved = purchaseOrderStateMachine.canTransition(
        updatedStatus,
        'approved'
      );

      if (!canTransitionToApproved) {
        return {
          success: false,
          purchaseOrderId: purchaseOrder.id,
          error: `Cannot approve purchase order in status: ${updatedStatus}`
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
      await auditService.logPurchaseOrderAudit(
        purchaseOrder.id,
        purchaseOrder.poNumber,
        'status_changed',
        {
          performedBy: request.userId,
          performedByName: request.userEmail,
          reason: `Approved: ${request.reason}${request.comments ? ` - ${request.comments}` : ''}`
        },
        { status: previousStatus },
        { status: newStatus }
      );

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

      // NEW: Integrate with receiving after successful approval
      try {
        const approvalContext: ApprovalContext = {
          approvedBy: request.userId,
          approvedAt: new Date(request.timestamp),
          reason: request.reason,
          comments: request.comments,
          userRole
        };

        const integrationResult = await receivingIntegrationService.onPurchaseOrderApproved(
          purchaseOrder.id,
          approvalContext
        );

        // Log integration result (non-blocking)
        if (!integrationResult.success) {
          console.warn(`Receiving integration failed for PO ${purchaseOrder.id}:`, integrationResult.error);
        } else {
          console.log(`Receiving integration successful for PO ${purchaseOrder.id}`);
        }
      } catch (integrationError) {
        // Integration failure should not block approval success
        console.error('Receiving integration error:', integrationError);
      }

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
    await auditService.logPurchaseOrderAudit(
      'BULK_OPERATION',
      `Bulk Approval (${purchaseOrders.length} orders)`,
      'bulk_approved',
      {
        performedBy: request.userId,
        performedByName: request.userEmail,
        reason: `Bulk approval: ${request.reason}${request.comments ? ` - ${request.comments}` : ''}`,
        metadata: {
          purchaseOrderIds: request.purchaseOrderIds,
          successCount,
          failureCount,
          totalAmount: purchaseOrders.reduce((sum, po) => sum + po.total, 0)
        }
      }
    );

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

    // NEW: Batch receiving integration processing
    if (successCount > 0) {
      try {
        // Refresh receiving queue once for all successful approvals
        await receivingIntegrationService.refreshReceivingQueue();
        
        console.log(`Bulk receiving integration completed for ${successCount} approved purchase orders`);
        
        // Log bulk integration success
        await auditService.logPurchaseOrderAudit(
          'BULK_INTEGRATION',
          `Bulk Integration (${successCount} orders)`,
          'bulk_receiving_integration',
          {
            performedBy: request.userId,
            performedByName: request.userEmail,
            reason: `Bulk receiving integration for ${successCount} approved purchase orders`,
            metadata: {
              successfulApprovals: successCount,
              totalProcessed: purchaseOrders.length,
              approvedPurchaseOrderIds: purchaseOrders
                .filter((_, index) => results[index].success)
                .map(po => po.id)
            }
          }
        );
      } catch (integrationError) {
        // Batch integration failure should not affect approval results
        console.error('Bulk receiving integration failed:', integrationError);
        
        // Log the failure for monitoring
        await auditService.logPurchaseOrderAudit(
          'BULK_INTEGRATION_FAILED',
          `Failed Bulk Integration (${successCount} orders)`,
          'bulk_receiving_integration_failed',
          {
            performedBy: request.userId,
            performedByName: request.userEmail,
            reason: `Bulk receiving integration failed: ${integrationError instanceof Error ? integrationError.message : 'Unknown error'}`,
            metadata: {
              successfulApprovals: successCount,
              errorDetails: integrationError instanceof Error ? integrationError.stack : String(integrationError)
            }
          }
        ).catch(auditError => {
          console.error('Failed to log bulk integration failure:', auditError);
        });
      }
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
      const currentStatus = purchaseOrder.enhancedStatus || this.mapLegacyToEnhanced(purchaseOrder.status);
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
      await auditService.logPurchaseOrderAudit(
        purchaseOrder.id,
        purchaseOrder.poNumber,
        'status_changed',
        {
          performedBy: request.userId,
          performedByName: request.userEmail,
          reason: `Rejected: ${request.reason} - ${request.comments}`
        },
        { status: previousStatus },
        { status: newStatus }
      );

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

      // NEW: Integrate with receiving after successful rejection/cancellation
      try {
        const statusChangeContext = {
          changedBy: request.userId,
          changedAt: new Date(request.timestamp),
          reason: `Rejected: ${request.reason} - ${request.comments}`,
          previousStatus: this.mapLegacyToEnhanced(previousStatus),
          newStatus: 'cancelled' as const
        };

        const integrationResult = await receivingIntegrationService.onPurchaseOrderStatusChanged(
          purchaseOrder.id,
          statusChangeContext.previousStatus,
          statusChangeContext.newStatus,
          statusChangeContext
        );

        // Log integration result (non-blocking)
        if (!integrationResult.success) {
          console.warn(`Receiving integration failed for rejected PO ${purchaseOrder.id}:`, integrationResult.error);
        } else {
          console.log(`Receiving integration successful for rejected PO ${purchaseOrder.id}`);
        }
      } catch (integrationError) {
        // Integration failure should not block rejection success
        console.error('Receiving integration error during rejection:', integrationError);
      }

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
    // Import supabase client
    const { supabase } = await import('../utils/supabase');
    
    try {
      // Update both legacy status and enhanced_status in database
      const updates: any = {
        enhanced_status: newStatus
      };

      // Add approval fields for approved status
      if (newStatus === 'approved') {
        updates.approved_by = request.userId;
        updates.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', purchaseOrderId)
        .select()
        .single();

      if (error) {
        console.error(`Failed to update PO ${purchaseOrderId} status:`, error);
        throw error;
      }

      console.log(`✅ Successfully updated PO ${purchaseOrderId} status to ${newStatus}`, data);
      return data;
    } catch (error) {
      console.error(`Error updating PO ${purchaseOrderId} status:`, error);
      throw error;
    }
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