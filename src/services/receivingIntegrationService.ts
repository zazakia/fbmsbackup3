import { EnhancedPurchaseOrder, EnhancedPurchaseOrderStatus } from '../types/business';
import { UserRole } from '../types/auth';
import { receivingDashboardService } from './receivingDashboardService';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export interface ApprovalContext {
  approvedBy: string;
  approvedAt: Date;
  reason: string;
  comments?: string;
  userRole: UserRole;
}

export interface StatusChangeContext {
  changedBy: string;
  changedAt: Date;
  reason?: string;
  previousStatus: EnhancedPurchaseOrderStatus;
  newStatus: EnhancedPurchaseOrderStatus;
}

export interface IntegrationResult {
  success: boolean;
  receivingQueueUpdated: boolean;
  error?: string;
  notificationsSent: number;
  auditLogId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IntegrationEvent {
  id: string;
  purchaseOrderId: string;
  eventType: 'po_approved' | 'po_status_changed' | 'po_cancelled';
  timestamp: Date;
  triggeringUser: string;
  context: Record<string, unknown>;
  processingStatus: 'pending' | 'processed' | 'failed';
  retryCount: number;
  errorMessage?: string;
}

class ReceivingIntegrationService {
  private readonly RECEIVABLE_STATUSES: EnhancedPurchaseOrderStatus[] = [
    'approved',
    'sent_to_supplier', 
    'partially_received'
  ];

  private refreshDebounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 500; // 500ms debounce
  private refreshQueue: Set<string> = new Set(); // Track pending refresh requests

  /**
   * Handle purchase order approval event
   */
  async onPurchaseOrderApproved(
    purchaseOrderId: string,
    approvalContext: ApprovalContext
  ): Promise<IntegrationResult> {
    try {
      console.log(`Processing approval integration for PO ${purchaseOrderId}`);

      // Create integration event
      const eventId = `approval_${purchaseOrderId}_${Date.now()}`;
      const integrationEvent: IntegrationEvent = {
        id: eventId,
        purchaseOrderId,
        eventType: 'po_approved',
        timestamp: approvalContext.approvedAt,
        triggeringUser: approvalContext.approvedBy,
        context: {
          reason: approvalContext.reason,
          comments: approvalContext.comments,
          userRole: approvalContext.userRole
        },
        processingStatus: 'pending',
        retryCount: 0
      };

      // Refresh receiving queue to include newly approved PO
      await receivingDashboardService.getReceivingQueue();

      // Log integration event
      const auditResult = await auditService.logPurchaseOrderAudit(
        purchaseOrderId,
        purchaseOrderId.slice(-8),
        'receiving_integration',
        {
          performedBy: approvalContext.approvedBy,
          performedByName: approvalContext.approvedBy,
          reason: `Approved PO integrated with receiving queue: ${approvalContext.reason}`,
          metadata: {
            integrationEventId: eventId,
            receivingQueueChange: 'added',
            approverRole: approvalContext.userRole
          }
        }
      );
      const auditLogId = auditResult.success ? auditResult.data?.id : undefined;

      // Send notification to receiving team
      const notificationsSent = await this.notifyReceivingTeam(
        purchaseOrderId,
        'approval',
        approvalContext
      );

      integrationEvent.processingStatus = 'processed';

      return {
        success: true,
        receivingQueueUpdated: true,
        notificationsSent,
        auditLogId
      };

    } catch (error) {
      console.error('Error in onPurchaseOrderApproved:', error);
      return {
        success: false,
        receivingQueueUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationsSent: 0
      };
    }
  }

  /**
   * Handle purchase order status change event
   */
  async onPurchaseOrderStatusChanged(
    purchaseOrderId: string,
    previousStatus: EnhancedPurchaseOrderStatus,
    newStatus: EnhancedPurchaseOrderStatus,
    context: StatusChangeContext
  ): Promise<IntegrationResult> {
    try {
      console.log(`Processing status change integration for PO ${purchaseOrderId}: ${previousStatus} -> ${newStatus}`);

      const eventId = `status_change_${purchaseOrderId}_${Date.now()}`;
      
      // Determine receiving queue action needed
      const wasReceivable = this.RECEIVABLE_STATUSES.includes(previousStatus);
      const isReceivable = this.RECEIVABLE_STATUSES.includes(newStatus);
      
      let receivingQueueChange: 'added' | 'updated' | 'removed' | 'none' = 'none';
      
      if (!wasReceivable && isReceivable) {
        receivingQueueChange = 'added';
      } else if (wasReceivable && !isReceivable) {
        receivingQueueChange = 'removed';
      } else if (wasReceivable && isReceivable) {
        receivingQueueChange = 'updated';
      }

      // Refresh receiving queue if change affects receivability
      let receivingQueueUpdated = false;
      if (receivingQueueChange !== 'none') {
        await receivingDashboardService.getReceivingQueue();
        receivingQueueUpdated = true;
      }

      // Log integration event
      const auditResult = await auditService.logPurchaseOrderAudit(
        purchaseOrderId,
        purchaseOrderId.slice(-8),
        'receiving_integration',
        {
          performedBy: context.changedBy,
          performedByName: context.changedBy,
          reason: `Status change integrated with receiving queue: ${previousStatus} -> ${newStatus}`,
          metadata: {
            integrationEventId: eventId,
            receivingQueueChange,
            previousStatus,
            newStatus
          }
        }
      );
      const auditLogId = auditResult.success ? auditResult.data?.id : undefined;

      // Send notifications if needed
      let notificationsSent = 0;
      if (receivingQueueChange === 'removed' && newStatus === 'cancelled') {
        notificationsSent = await this.notifyReceivingTeam(
          purchaseOrderId,
          'cancellation',
          context
        );
      }

      return {
        success: true,
        receivingQueueUpdated,
        notificationsSent,
        auditLogId
      };

    } catch (error) {
      console.error('Error in onPurchaseOrderStatusChanged:', error);
      return {
        success: false,
        receivingQueueUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationsSent: 0
      };
    }
  }

  /**
   * Validate if purchase order is ready for receiving
   */
  validateReceivingReadiness(purchaseOrder: EnhancedPurchaseOrder): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!purchaseOrder.supplierId || !purchaseOrder.supplierName) {
      errors.push('Supplier information is missing');
    }

    if (!purchaseOrder.items || purchaseOrder.items.length === 0) {
      errors.push('Purchase order has no items');
    }

    if (!purchaseOrder.total || purchaseOrder.total <= 0) {
      errors.push('Purchase order total is invalid');
    }

    // Check status
    if (!this.RECEIVABLE_STATUSES.includes(purchaseOrder.status)) {
      errors.push(`Purchase order status '${purchaseOrder.status}' is not receivable`);
    }

    // Check items
    purchaseOrder.items?.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1} has invalid quantity`);
      }
      if (!item.cost || item.cost <= 0) {
        errors.push(`Item ${index + 1} has invalid cost`);
      }
    });

    // Warnings
    if (!purchaseOrder.expectedDate) {
      warnings.push('No expected delivery date set');
    } else if (purchaseOrder.expectedDate < new Date()) {
      warnings.push('Expected delivery date is in the past');
    }

    if (!purchaseOrder.poNumber) {
      warnings.push('Purchase order number not set');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Refresh receiving queue manually
   */
  async refreshReceivingQueue(): Promise<void> {
    try {
      await receivingDashboardService.getReceivingQueue();
      console.log('Receiving queue refreshed successfully');
    } catch (error) {
      console.error('Error refreshing receiving queue:', error);
      throw error;
    }
  }

  /**
   * Debounced refresh for multiple rapid requests
   */
  async refreshReceivingQueueDebounced(requestId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Add request to queue
      if (requestId) {
        this.refreshQueue.add(requestId);
      }

      // Clear existing timer
      if (this.refreshDebounceTimer) {
        clearTimeout(this.refreshDebounceTimer);
      }

      // Set new timer
      this.refreshDebounceTimer = setTimeout(async () => {
        try {
          const queueSize = this.refreshQueue.size;
          this.refreshQueue.clear();
          
          console.log(`Executing debounced refresh for ${queueSize} requests`);
          await this.refreshReceivingQueue();
          resolve();
        } catch (error) {
          console.error('Debounced refresh failed:', error);
          reject(error);
        } finally {
          this.refreshDebounceTimer = null;
        }
      }, this.DEBOUNCE_DELAY);
    });
  }

  /**
   * Refresh with retry logic for error recovery
   */
  async refreshReceivingQueueWithRetry(maxRetries = 3, backoffMultiplier = 2): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.refreshReceivingQueue();
        
        if (attempt > 1) {
          console.log(`Receiving queue refresh succeeded on attempt ${attempt}`);
        }
        return; // Success
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          const delay = Math.pow(backoffMultiplier, attempt - 1) * 1000; // Exponential backoff
          console.warn(`Receiving queue refresh attempt ${attempt} failed, retrying in ${delay}ms:`, error);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`Receiving queue refresh failed after ${maxRetries} attempts:`, error);
        }
      }
    }
    
    throw lastError || new Error('Refresh failed with unknown error');
  }

  /**
   * Get refresh status and statistics
   */
  getRefreshStatus(): {
    isDebouncing: boolean;
    pendingRequests: number;
    lastRefreshTime?: Date;
  } {
    return {
      isDebouncing: this.refreshDebounceTimer !== null,
      pendingRequests: this.refreshQueue.size,
      // Note: lastRefreshTime would need to be tracked separately if needed
    };
  }

  /**
   * Clear pending refresh requests
   */
  clearPendingRefresh(): void {
    if (this.refreshDebounceTimer) {
      clearTimeout(this.refreshDebounceTimer);
      this.refreshDebounceTimer = null;
    }
    this.refreshQueue.clear();
    console.log('Cleared pending refresh requests');
  }

  /**
   * Check if a status is receivable
   */
  isReceivableStatus(status: EnhancedPurchaseOrderStatus): boolean {
    return this.RECEIVABLE_STATUSES.includes(status);
  }

  /**
   * Send notifications to receiving team
   */
  private async notifyReceivingTeam(
    purchaseOrderId: string,
    eventType: 'approval' | 'cancellation',
    context: ApprovalContext | StatusChangeContext
  ): Promise<number> {
    try {
      // In a real implementation, this would send notifications
      // For now, we'll use the existing notification service pattern
      console.log(`Sending ${eventType} notification for PO ${purchaseOrderId}`);
      
      // Mock notification count
      return 1;
    } catch (error) {
      console.error('Error sending receiving team notifications:', error);
      return 0;
    }
  }
}

export const receivingIntegrationService = new ReceivingIntegrationService();
export default receivingIntegrationService;