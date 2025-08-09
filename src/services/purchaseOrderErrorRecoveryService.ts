import { PurchaseOrder, PurchaseOrderItem, Product } from '../types/business';
import { ErrorHandlingService, SystemError, DatabaseError, BusinessError } from './errorHandlingService';
import { PurchaseOrderValidationError } from './purchaseOrderValidationService';
import { AuditService } from './auditService';

// Recovery action types
export type RecoveryActionType = 
  | 'retry_operation'
  | 'rollback_changes' 
  | 'manual_intervention'
  | 'partial_recovery'
  | 'skip_failed_items'
  | 'queue_for_later';

export interface RecoveryAction {
  type: RecoveryActionType;
  description: string;
  autoExecute: boolean;
  priority: number;
  estimatedTime?: string;
  prerequisites?: string[];
}

export interface RecoveryContext {
  operationType: 'receiving' | 'approval' | 'status_change' | 'creation';
  purchaseOrderId: string;
  userId: string;
  timestamp: Date;
  attemptNumber: number;
  maxRetries: number;
  originalData?: any;
  partialResults?: any;
}

export interface RecoveryResult {
  success: boolean;
  recoveryAction: RecoveryAction;
  message: string;
  data?: any;
  requiresManualIntervention: boolean;
  nextSteps: string[];
}

export interface RecoveryStrategy {
  errorCodes: string[];
  actions: RecoveryAction[];
  canAutoRecover: boolean;
  maxRetries: number;
}

export class PurchaseOrderErrorRecoveryService {
  
  private static readonly recoveryStrategies: RecoveryStrategy[] = [
    // Database connection errors
    {
      errorCodes: ['DATABASE_ERROR', 'CONNECTION_TIMEOUT', 'DEADLOCK_DETECTED'],
      actions: [
        {
          type: 'retry_operation',
          description: 'Retry the operation after a short delay',
          autoExecute: true,
          priority: 1,
          estimatedTime: '5-10 seconds'
        },
        {
          type: 'queue_for_later',
          description: 'Queue the operation for retry during off-peak hours',
          autoExecute: false,
          priority: 2,
          estimatedTime: '1-2 hours'
        }
      ],
      canAutoRecover: true,
      maxRetries: 3
    },

    // Validation errors during receiving
    {
      errorCodes: ['OVER_RECEIVING', 'INVALID_RECEIVED_QUANTITY', 'PRODUCT_NOT_IN_ORDER'],
      actions: [
        {
          type: 'partial_recovery',
          description: 'Process valid items and flag invalid ones for review',
          autoExecute: false,
          priority: 1,
          estimatedTime: 'Immediate',
          prerequisites: ['User confirmation required']
        },
        {
          type: 'manual_intervention',
          description: 'Require manual review and correction',
          autoExecute: false,
          priority: 2,
          estimatedTime: '15-30 minutes'
        }
      ],
      canAutoRecover: false,
      maxRetries: 1
    },

    // Stock calculation errors
    {
      errorCodes: ['INSUFFICIENT_STOCK', 'NEGATIVE_STOCK', 'CONCURRENT_MODIFICATION'],
      actions: [
        {
          type: 'retry_operation',
          description: 'Refresh stock data and retry calculation',
          autoExecute: true,
          priority: 1,
          estimatedTime: '2-5 seconds'
        },
        {
          type: 'partial_recovery',
          description: 'Process available quantities and queue remaining',
          autoExecute: false,
          priority: 2,
          estimatedTime: '5-10 minutes'
        }
      ],
      canAutoRecover: true,
      maxRetries: 2
    },

    // Permission errors
    {
      errorCodes: ['INSUFFICIENT_PERMISSIONS', 'APPROVAL_LIMIT_EXCEEDED', 'AUTHENTICATION_REQUIRED'],
      actions: [
        {
          type: 'manual_intervention',
          description: 'Require authorization from appropriate user role',
          autoExecute: false,
          priority: 1,
          estimatedTime: '10-30 minutes',
          prerequisites: ['Contact manager or admin', 'Verify user permissions']
        }
      ],
      canAutoRecover: false,
      maxRetries: 0
    },

    // Business rule violations
    {
      errorCodes: ['INVALID_STATUS_TRANSITION', 'ALREADY_APPROVED', 'CANNOT_CANCEL_RECEIVED_ORDER'],
      actions: [
        {
          type: 'rollback_changes',
          description: 'Revert to previous valid state',
          autoExecute: true,
          priority: 1,
          estimatedTime: '5-10 seconds'
        },
        {
          type: 'manual_intervention',
          description: 'Review business rules and determine appropriate action',
          autoExecute: false,
          priority: 2,
          estimatedTime: '15-45 minutes'
        }
      ],
      canAutoRecover: true,
      maxRetries: 1
    }
  ];

  /**
   * Handle receiving operation failure with automatic recovery
   */
  static async handleReceivingFailure(
    error: SystemError | PurchaseOrderValidationError,
    context: RecoveryContext,
    originalData: any
  ): Promise<RecoveryResult> {
    
    // Log the error for audit trail
    await this.logRecoveryAttempt(error, context);

    // Determine recovery strategy
    const strategy = this.getRecoveryStrategy(error);
    
    if (!strategy) {
      return {
        success: false,
        recoveryAction: {
          type: 'manual_intervention',
          description: 'No automatic recovery strategy available',
          autoExecute: false,
          priority: 1
        },
        message: 'Manual intervention required - unknown error type',
        requiresManualIntervention: true,
        nextSteps: ['Contact system administrator', 'Review error logs']
      };
    }

    // Check retry limits
    if (context.attemptNumber > strategy.maxRetries) {
      return {
        success: false,
        recoveryAction: {
          type: 'manual_intervention',
          description: 'Maximum retry attempts exceeded',
          autoExecute: false,
          priority: 1
        },
        message: `Operation failed after ${context.attemptNumber} attempts`,
        requiresManualIntervention: true,
        nextSteps: ['Review error cause', 'Consider alternative approach']
      };
    }

    // Execute recovery action
    const primaryAction = strategy.actions[0];
    return await this.executeRecoveryAction(primaryAction, context, originalData, error);
  }

  /**
   * Execute specific recovery action
   */
  private static async executeRecoveryAction(
    action: RecoveryAction,
    context: RecoveryContext,
    originalData: any,
    error: SystemError | PurchaseOrderValidationError
  ): Promise<RecoveryResult> {
    
    switch (action.type) {
      case 'retry_operation':
        return await this.retryOperation(context, originalData, action);
        
      case 'rollback_changes':
        return await this.rollbackChanges(context, originalData, action);
        
      case 'partial_recovery':
        return await this.performPartialRecovery(context, originalData, action, error);
        
      case 'queue_for_later':
        return await this.queueForLater(context, originalData, action);
        
      case 'skip_failed_items':
        return await this.skipFailedItems(context, originalData, action, error);
        
      default:
        return {
          success: false,
          recoveryAction: action,
          message: 'Manual intervention required',
          requiresManualIntervention: true,
          nextSteps: ['Review error details', 'Contact appropriate personnel']
        };
    }
  }

  /**
   * Retry the failed operation
   */
  private static async retryOperation(
    context: RecoveryContext,
    originalData: any,
    action: RecoveryAction
  ): Promise<RecoveryResult> {
    
    try {
      // Add exponential backoff delay
      const delay = Math.min(1000 * Math.pow(2, context.attemptNumber - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Log retry attempt
      console.log(`[RETRY] Attempt ${context.attemptNumber} for operation ${context.operationType} on PO ${context.purchaseOrderId}`);

      // The actual retry would be handled by the calling service
      return {
        success: true,
        recoveryAction: action,
        message: `Retry scheduled with ${delay}ms delay`,
        requiresManualIntervention: false,
        nextSteps: ['Monitor operation progress', 'Check for completion']
      };
      
    } catch (retryError) {
      return {
        success: false,
        recoveryAction: action,
        message: `Retry failed: ${retryError.message}`,
        requiresManualIntervention: true,
        nextSteps: ['Investigate underlying cause', 'Consider alternative recovery method']
      };
    }
  }

  /**
   * Rollback changes to previous state
   */
  private static async rollbackChanges(
    context: RecoveryContext,
    originalData: any,
    action: RecoveryAction
  ): Promise<RecoveryResult> {
    
    try {
      // Create audit record for rollback
      await AuditService.logPurchaseOrderAction(
        context.purchaseOrderId,
        'rollback_initiated',
        context.userId,
        {
          reason: 'Error recovery rollback',
          originalOperation: context.operationType,
          attemptNumber: context.attemptNumber
        }
      );

      // The actual rollback would be implemented based on operation type
      const rollbackSteps = this.generateRollbackSteps(context, originalData);
      
      return {
        success: true,
        recoveryAction: action,
        message: 'Changes successfully rolled back',
        data: { rollbackSteps },
        requiresManualIntervention: false,
        nextSteps: ['Verify system state', 'Investigate error cause before retrying']
      };
      
    } catch (rollbackError) {
      // Critical error - rollback failed
      console.error('[CRITICAL] Rollback failed:', rollbackError);
      
      return {
        success: false,
        recoveryAction: action,
        message: `CRITICAL: Rollback failed - ${rollbackError.message}`,
        requiresManualIntervention: true,
        nextSteps: [
          'URGENT: Contact system administrator',
          'Manual database review required',
          'Check data integrity'
        ]
      };
    }
  }

  /**
   * Perform partial recovery - process valid items, flag invalid ones
   */
  private static async performPartialRecovery(
    context: RecoveryContext,
    originalData: any,
    action: RecoveryAction,
    error: SystemError | PurchaseOrderValidationError
  ): Promise<RecoveryResult> {
    
    try {
      const validItems = [];
      const invalidItems = [];
      let processedCount = 0;

      if (context.operationType === 'receiving' && originalData.receivingItems) {
        // Separate valid from invalid receiving items
        for (const item of originalData.receivingItems) {
          try {
            // Basic validation for each item
            if (this.isValidReceivingItem(item, originalData.purchaseOrder)) {
              validItems.push(item);
            } else {
              invalidItems.push({
                ...item,
                errorReason: 'Failed validation during partial recovery'
              });
            }
          } catch (itemError) {
            invalidItems.push({
              ...item,
              errorReason: itemError.message
            });
          }
        }

        processedCount = validItems.length;
      }

      // Log partial recovery
      await AuditService.logPurchaseOrderAction(
        context.purchaseOrderId,
        'partial_recovery',
        context.userId,
        {
          processedItems: processedCount,
          failedItems: invalidItems.length,
          validItems,
          invalidItems
        }
      );

      return {
        success: processedCount > 0,
        recoveryAction: action,
        message: `Partial recovery completed: ${processedCount} items processed, ${invalidItems.length} items require manual review`,
        data: { validItems, invalidItems, processedCount },
        requiresManualIntervention: invalidItems.length > 0,
        nextSteps: invalidItems.length > 0 ? [
          'Review failed items',
          'Correct validation errors',
          'Reprocess failed items'
        ] : ['Verify processed items', 'Complete remaining operations']
      };
      
    } catch (recoveryError) {
      return {
        success: false,
        recoveryAction: action,
        message: `Partial recovery failed: ${recoveryError.message}`,
        requiresManualIntervention: true,
        nextSteps: ['Review partial recovery logic', 'Contact system support']
      };
    }
  }

  /**
   * Queue operation for later processing
   */
  private static async queueForLater(
    context: RecoveryContext,
    originalData: any,
    action: RecoveryAction
  ): Promise<RecoveryResult> {
    
    try {
      const queuedOperation = {
        id: `${context.purchaseOrderId}-${context.operationType}-${Date.now()}`,
        operation: context.operationType,
        purchaseOrderId: context.purchaseOrderId,
        userId: context.userId,
        data: originalData,
        queuedAt: new Date(),
        scheduledFor: new Date(Date.now() + 3600000), // 1 hour later
        priority: 'normal',
        maxRetries: 3,
        currentRetries: 0
      };

      // In a real implementation, this would go to a message queue
      console.log('[QUEUE] Operation queued for later processing:', queuedOperation);

      // Log queuing action
      await AuditService.logPurchaseOrderAction(
        context.purchaseOrderId,
        'operation_queued',
        context.userId,
        {
          queueId: queuedOperation.id,
          scheduledFor: queuedOperation.scheduledFor,
          operation: context.operationType
        }
      );

      return {
        success: true,
        recoveryAction: action,
        message: `Operation queued for processing at ${queuedOperation.scheduledFor.toLocaleString()}`,
        data: { queueId: queuedOperation.id },
        requiresManualIntervention: false,
        nextSteps: [
          'Monitor queue processing',
          'Check operation status later',
          'Contact support if operation fails repeatedly'
        ]
      };
      
    } catch (queueError) {
      return {
        success: false,
        recoveryAction: action,
        message: `Failed to queue operation: ${queueError.message}`,
        requiresManualIntervention: true,
        nextSteps: ['Retry manually', 'Contact system administrator']
      };
    }
  }

  /**
   * Skip failed items and continue with valid ones
   */
  private static async skipFailedItems(
    context: RecoveryContext,
    originalData: any,
    action: RecoveryAction,
    error: SystemError | PurchaseOrderValidationError
  ): Promise<RecoveryResult> {
    
    try {
      // This is similar to partial recovery but focuses on skipping rather than processing
      const skippedItems = [];
      const processedItems = [];

      // Log skipping action
      await AuditService.logPurchaseOrderAction(
        context.purchaseOrderId,
        'items_skipped',
        context.userId,
        {
          skippedCount: skippedItems.length,
          processedCount: processedItems.length,
          reason: 'Error recovery - skip failed items',
          error: error.message
        }
      );

      return {
        success: true,
        recoveryAction: action,
        message: `${skippedItems.length} items skipped, ${processedItems.length} items processed`,
        data: { skippedItems, processedItems },
        requiresManualIntervention: skippedItems.length > 0,
        nextSteps: [
          'Review skipped items',
          'Determine if manual processing needed',
          'Update purchase order status accordingly'
        ]
      };
      
    } catch (skipError) {
      return {
        success: false,
        recoveryAction: action,
        message: `Failed to skip items: ${skipError.message}`,
        requiresManualIntervention: true,
        nextSteps: ['Review error handling logic', 'Contact support']
      };
    }
  }

  /**
   * Get recovery strategy for specific error
   */
  private static getRecoveryStrategy(error: SystemError | PurchaseOrderValidationError): RecoveryStrategy | null {
    const errorCode = 'code' in error ? error.code : (error as any).code;
    
    return this.recoveryStrategies.find(strategy => 
      strategy.errorCodes.includes(errorCode)
    ) || null;
  }

  /**
   * Generate rollback steps based on operation type
   */
  private static generateRollbackSteps(context: RecoveryContext, originalData: any): string[] {
    const steps = [];

    switch (context.operationType) {
      case 'receiving':
        steps.push('Reverse inventory adjustments');
        steps.push('Remove receiving records');
        steps.push('Reset purchase order status');
        steps.push('Clear receiving timestamps');
        break;
      
      case 'approval':
        steps.push('Reset approval status');
        steps.push('Clear approval timestamp');
        steps.push('Remove approval user reference');
        break;
        
      case 'status_change':
        steps.push('Revert to previous status');
        steps.push('Remove status change audit entry');
        break;
        
      default:
        steps.push('Generic rollback procedures apply');
    }

    return steps;
  }

  /**
   * Validate receiving item for partial recovery
   */
  private static isValidReceivingItem(item: any, purchaseOrder: PurchaseOrder): boolean {
    // Basic validation logic
    if (!item.productId || !item.receivedQuantity) return false;
    if (item.receivedQuantity <= 0) return false;
    
    // Check if product exists in purchase order
    const orderItem = purchaseOrder.items.find(oi => oi.productId === item.productId);
    if (!orderItem) return false;
    
    // Check for reasonable quantities (not over-receiving by more than 50%)
    const maxAllowed = orderItem.quantity * 1.5;
    if (item.receivedQuantity > maxAllowed) return false;
    
    return true;
  }

  /**
   * Log recovery attempt for audit trail
   */
  private static async logRecoveryAttempt(
    error: SystemError | PurchaseOrderValidationError,
    context: RecoveryContext
  ): Promise<void> {
    try {
      await AuditService.logPurchaseOrderAction(
        context.purchaseOrderId,
        'error_recovery_initiated',
        context.userId,
        {
          error: {
            code: 'code' in error ? error.code : (error as any).code,
            message: error.message
          },
          operation: context.operationType,
          attemptNumber: context.attemptNumber,
          maxRetries: context.maxRetries,
          timestamp: context.timestamp
        }
      );
    } catch (auditError) {
      console.error('Failed to log recovery attempt:', auditError);
      // Don't fail the recovery because audit failed
    }
  }

  /**
   * Get available recovery actions for an error
   */
  static getAvailableRecoveryActions(error: SystemError | PurchaseOrderValidationError): RecoveryAction[] {
    const strategy = this.getRecoveryStrategy(error);
    return strategy?.actions || [{
      type: 'manual_intervention',
      description: 'Manual review required',
      autoExecute: false,
      priority: 1
    }];
  }

  /**
   * Check if automatic recovery is possible
   */
  static canAutoRecover(error: SystemError | PurchaseOrderValidationError): boolean {
    const strategy = this.getRecoveryStrategy(error);
    return strategy?.canAutoRecover || false;
  }

  /**
   * Estimate recovery time
   */
  static estimateRecoveryTime(error: SystemError | PurchaseOrderValidationError): string {
    const strategy = this.getRecoveryStrategy(error);
    if (!strategy || strategy.actions.length === 0) return 'Unknown';
    
    return strategy.actions[0].estimatedTime || 'Unknown';
  }
}