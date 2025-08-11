import { 
  PurchaseOrder, 
  EnhancedPurchaseOrderStatus,
  StatusTransition,
  ValidationError 
} from '../types/business';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface TransitionContext {
  performedBy: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class PurchaseOrderStateMachine {
  private readonly validTransitions: Map<EnhancedPurchaseOrderStatus, EnhancedPurchaseOrderStatus[]>;

  constructor() {
    this.validTransitions = new Map([
      ['draft', ['pending_approval', 'cancelled']],
      ['pending_approval', ['approved', 'draft', 'cancelled']],
      ['approved', ['sent_to_supplier', 'partially_received', 'fully_received', 'cancelled']],
      ['sent_to_supplier', ['partially_received', 'fully_received', 'cancelled']],
      ['partially_received', ['fully_received']],
      ['fully_received', ['closed']],
      ['cancelled', []],
      ['closed', []]
    ]);
  }

  /**
   * Check if a transition from one status to another is valid
   */
  canTransition(from: EnhancedPurchaseOrderStatus, to: EnhancedPurchaseOrderStatus): boolean {
    const allowedTransitions = this.validTransitions.get(from);
    return allowedTransitions?.includes(to) ?? false;
  }

  /**
   * Validate a status transition with business rules
   */
  validateTransition(
    purchaseOrder: PurchaseOrder, 
    newStatus: EnhancedPurchaseOrderStatus,
    context: TransitionContext
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Convert current status to enhanced status if needed
    const currentStatus = this.mapLegacyToEnhancedStatus(purchaseOrder.status);

    // Check if transition is allowed by state machine
    if (!this.canTransition(currentStatus, newStatus)) {
      errors.push({
        field: 'status',
        message: `Invalid transition from ${currentStatus} to ${newStatus}`,
        code: 'INVALID_TRANSITION'
      });
    }

    // Business rule validations
    if (newStatus === 'pending_approval') {
      if (!purchaseOrder.items || purchaseOrder.items.length === 0) {
        errors.push({
          field: 'items',
          message: 'Purchase order must have at least one item before approval',
          code: 'NO_ITEMS'
        });
      }

      if (purchaseOrder.total <= 0) {
        errors.push({
          field: 'total',
          message: 'Purchase order total must be greater than zero',
          code: 'INVALID_TOTAL'
        });
      }

      if (!purchaseOrder.supplierId) {
        errors.push({
          field: 'supplierId',
          message: 'Supplier must be selected before approval',
          code: 'NO_SUPPLIER'
        });
      }
    }

    if (newStatus === 'approved') {
      // Additional validation for approval
      if (!context.performedBy) {
        errors.push({
          field: 'performedBy',
          message: 'Approver information is required',
          code: 'NO_APPROVER'
        });
      }
    }

    if (newStatus === 'partially_received' || newStatus === 'fully_received') {
      if (currentStatus !== 'approved' && currentStatus !== 'sent_to_supplier' && currentStatus !== 'partially_received') {
        errors.push({
          field: 'status',
          message: 'Purchase order must be approved or sent to supplier before receiving',
          code: 'NOT_READY_FOR_RECEIVING'
        });
      }
    }

    if (newStatus === 'cancelled') {
      if (currentStatus === 'fully_received' || currentStatus === 'closed') {
        errors.push({
          field: 'status',
          message: 'Cannot cancel a received or closed purchase order',
          code: 'CANNOT_CANCEL_RECEIVED'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute a status transition with validation
   */
  executeTransition(
    purchaseOrder: PurchaseOrder,
    newStatus: EnhancedPurchaseOrderStatus,
    context: TransitionContext
  ): Promise<{
    updatedPurchaseOrder: PurchaseOrder;
    transition: StatusTransition;
    isValid: boolean;
    errors: ValidationError[];
  }> {
    return new Promise((resolve) => {
      const validation = this.validateTransition(purchaseOrder, newStatus, context);
      
      if (!validation.isValid) {
        resolve({
          updatedPurchaseOrder: purchaseOrder,
          transition: {} as StatusTransition,
          isValid: false,
          errors: validation.errors
        });
        return;
      }

      const currentStatus = this.mapLegacyToEnhancedStatus(purchaseOrder.status);
      
      const transition: StatusTransition = {
        id: this.generateTransitionId(),
        fromStatus: currentStatus,
        toStatus: newStatus,
        timestamp: context.timestamp || new Date(),
        performedBy: context.performedBy,
        reason: context.reason,
        metadata: context.metadata
      };

      // Update purchase order status
      const updatedPurchaseOrder: PurchaseOrder = {
        ...purchaseOrder,
        status: this.mapEnhancedToLegacyStatus(newStatus)
      };

      // Set specific dates based on status
      if (newStatus === 'fully_received' && !updatedPurchaseOrder.receivedDate) {
        updatedPurchaseOrder.receivedDate = new Date();
      }

      resolve({
        updatedPurchaseOrder,
        transition,
        isValid: true,
        errors: []
      });
    });
  }

  /**
   * Get all valid transitions from current status
   */
  getValidTransitions(currentStatus: EnhancedPurchaseOrderStatus): EnhancedPurchaseOrderStatus[] {
    return this.validTransitions.get(currentStatus) || [];
  }

  /**
   * Check if a purchase order is in a final state
   */
  isFinalState(status: EnhancedPurchaseOrderStatus): boolean {
    const validTransitions = this.validTransitions.get(status);
    return !validTransitions || validTransitions.length === 0;
  }

  /**
   * Get the next logical status based on business rules
   */
  getNextLogicalStatus(
    purchaseOrder: PurchaseOrder,
    receivedQuantities?: Record<string, number>
  ): EnhancedPurchaseOrderStatus | null {
    const currentStatus = this.mapLegacyToEnhancedStatus(purchaseOrder.status);

    switch (currentStatus) {
      case 'draft':
        return 'pending_approval';
      
      case 'pending_approval':
        return 'approved';
      
      case 'approved':
        return 'sent_to_supplier';
      
      case 'sent_to_supplier':
      case 'partially_received':
        if (receivedQuantities) {
          const isFullyReceived = this.checkIfFullyReceived(purchaseOrder, receivedQuantities);
          return isFullyReceived ? 'fully_received' : 'partially_received';
        }
        return 'partially_received';
      
      case 'fully_received':
        return 'closed';
      
      default:
        return null;
    }
  }

  /**
   * Map legacy status to enhanced status for backward compatibility
   */
  private mapLegacyToEnhancedStatus(legacyStatus: string): EnhancedPurchaseOrderStatus {
    const statusMap: Record<string, EnhancedPurchaseOrderStatus> = {
      'draft': 'draft',
      'sent': 'sent_to_supplier',
      'received': 'fully_received',
      'partial': 'partially_received',
      'cancelled': 'cancelled'
    };

    return statusMap[legacyStatus] || 'draft';
  }

  /**
   * Map enhanced status back to legacy status for backward compatibility
   */
  private mapEnhancedToLegacyStatus(enhancedStatus: EnhancedPurchaseOrderStatus): string {
    const statusMap: Record<EnhancedPurchaseOrderStatus, string> = {
      'draft': 'draft',
      'pending_approval': 'draft', // Map back to draft for legacy compatibility
      // After approval, treat as ready for receiving in legacy status model
      'approved': 'sent',
      'sent_to_supplier': 'sent',
      'partially_received': 'partial',
      'fully_received': 'received',
      'cancelled': 'cancelled',
      'closed': 'received' // Map to received for legacy compatibility
    };

    return statusMap[enhancedStatus] || 'draft';
  }

  /**
   * Check if all items in purchase order have been fully received
   */
  private checkIfFullyReceived(
    purchaseOrder: PurchaseOrder,
    receivedQuantities: Record<string, number>
  ): boolean {
    return purchaseOrder.items.every(item => {
      const receivedQty = receivedQuantities[item.productId] || 0;
      return receivedQty >= item.quantity;
    });
  }

  /**
   * Generate a unique transition ID
   */
  private generateTransitionId(): string {
    return `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate that user has permission for the transition
   */
  validateUserPermissions(
    userRole: string,
    newStatus: EnhancedPurchaseOrderStatus,
    purchaseOrder: PurchaseOrder
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Define role-based permissions
    const rolePermissions = {
      'admin': ['*'], // Admin can do everything
      'manager': ['pending_approval', 'approved', 'cancelled', 'partially_received', 'fully_received'],
      'purchaser': ['draft', 'pending_approval', 'cancelled'],
      'warehouse': ['partially_received', 'fully_received'],
      'employee': ['draft']
    };

    const allowedStatuses = rolePermissions[userRole as keyof typeof rolePermissions] || [];
    
    if (!allowedStatuses.includes('*') && !allowedStatuses.includes(newStatus)) {
      errors.push({
        field: 'permission',
        message: `User role '${userRole}' does not have permission to transition to '${newStatus}'`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Additional approval amount validation for managers
    if (newStatus === 'approved' && userRole === 'manager') {
      const maxApprovalAmount = 50000; // Example threshold
      if (purchaseOrder.total > maxApprovalAmount) {
        errors.push({
          field: 'approval_amount',
          message: `Purchase order amount ₱${purchaseOrder.total} exceeds manager approval limit of ₱${maxApprovalAmount}`,
          code: 'EXCEEDS_APPROVAL_LIMIT'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export a singleton instance
export const purchaseOrderStateMachine = new PurchaseOrderStateMachine();