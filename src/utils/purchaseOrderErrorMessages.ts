import { PurchaseOrderValidationError } from '../services/purchaseOrderValidationService';
import { SystemError } from '../services/errorHandlingService';
import { StockValidationError } from './stockValidation';

// Error message templates with context-aware formatting
export interface ErrorMessageTemplate {
  title: string;
  message: string;
  actionText?: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  icon?: string;
  autoHide?: boolean;
  duration?: number;
}

export interface ErrorContext {
  userRole?: string;
  operationType?: string;
  productName?: string;
  supplierName?: string;
  amount?: number;
  quantity?: number;
  remainingQuantity?: number;
  approvalLimit?: number;
}

export class PurchaseOrderErrorMessages {

  /**
   * Get user-friendly error message for purchase order validation errors
   */
  static getValidationErrorMessage(
    error: PurchaseOrderValidationError,
    context: ErrorContext = {}
  ): ErrorMessageTemplate {
    
    const templates: Record<string, (ctx: ErrorContext) => ErrorMessageTemplate> = {
      
      // Creation Errors
      'SUPPLIER_REQUIRED': () => ({
        title: 'Supplier Required',
        message: 'Please select a supplier before creating the purchase order.',
        actionText: 'Select Supplier',
        severity: 'error',
        icon: '👥'
      }),

      'NO_ITEMS': () => ({
        title: 'No Items Added',
        message: 'Add at least one product to the purchase order.',
        actionText: 'Add Products',
        severity: 'error',
        icon: '📦'
      }),

      'INVALID_PO_NUMBER_FORMAT': () => ({
        title: 'Invalid PO Number',
        message: 'Purchase order number should follow format PO-YYYY-NNNNNN (e.g., PO-2024-000001).',
        severity: 'warning',
        icon: '📋',
        actionText: 'Fix Format'
      }),

      'DUPLICATE_PRODUCTS': () => ({
        title: 'Duplicate Products',
        message: 'Some products appear multiple times. Please combine quantities or remove duplicates.',
        actionText: 'Fix Duplicates',
        severity: 'error',
        icon: '⚠️'
      }),

      'INVALID_QUANTITY': (ctx) => ({
        title: 'Invalid Quantity',
        message: ctx.productName 
          ? `Invalid quantity for ${ctx.productName}. Please enter a positive number.`
          : 'Please enter a valid quantity (positive number).',
        actionText: 'Fix Quantity',
        severity: 'error',
        icon: '🔢'
      }),

      'INVALID_UNIT_PRICE': (ctx) => ({
        title: 'Invalid Price',
        message: ctx.productName 
          ? `Invalid unit price for ${ctx.productName}. Please enter a positive amount.`
          : 'Please enter a valid unit price.',
        actionText: 'Fix Price',
        severity: 'error',
        icon: '💰'
      }),

      'TOTAL_MISMATCH': () => ({
        title: 'Total Amount Mismatch',
        message: 'The total amount doesn\'t match the sum of item costs. Please verify your calculations.',
        actionText: 'Recalculate',
        severity: 'error',
        icon: '🧮'
      }),

      // Date Validation Errors
      'INVALID_DELIVERY_DATE': () => ({
        title: 'Invalid Delivery Date',
        message: 'Expected delivery date must be after the order date.',
        actionText: 'Fix Date',
        severity: 'error',
        icon: '📅'
      }),

      'FUTURE_ORDER_DATE': () => ({
        title: 'Future Order Date',
        message: 'Order date is set in the future. Please verify this is correct.',
        severity: 'warning',
        icon: '📅',
        actionText: 'Verify Date'
      }),

      // Approval Errors
      'INSUFFICIENT_APPROVAL_PERMISSION': (ctx) => ({
        title: 'Cannot Approve',
        message: `Your role (${ctx.userRole || 'current role'}) doesn't have permission to approve purchase orders.`,
        actionText: 'Contact Manager',
        severity: 'error',
        icon: '🔒'
      }),

      'APPROVAL_AMOUNT_EXCEEDED': (ctx) => ({
        title: 'Approval Limit Exceeded',
        message: ctx.amount && ctx.approvalLimit
          ? `This order (₱${ctx.amount.toLocaleString()}) exceeds your approval limit of ₱${ctx.approvalLimit.toLocaleString()}.`
          : 'This purchase order exceeds your approval limit.',
        actionText: 'Request Higher Approval',
        severity: 'error',
        icon: '💸'
      }),

      'SELF_APPROVAL_NOT_ALLOWED': (ctx) => ({
        title: 'Cannot Self-Approve',
        message: 'You cannot approve purchase orders that you created. Please ask another manager or admin to approve.',
        actionText: 'Find Approver',
        severity: 'error',
        icon: '🚫'
      }),

      'ALREADY_APPROVED': () => ({
        title: 'Already Approved',
        message: 'This purchase order has already been approved and cannot be approved again.',
        severity: 'info',
        icon: '✅',
        autoHide: true
      }),

      // Status Transition Errors
      'INVALID_STATUS_TRANSITION': () => ({
        title: 'Invalid Status Change',
        message: 'This status change is not allowed based on current purchase order state.',
        actionText: 'Check Status',
        severity: 'error',
        icon: '🔄'
      }),

      'NOT_PENDING_APPROVAL': () => ({
        title: 'Not Ready for Approval',
        message: 'This purchase order must be submitted for approval first.',
        actionText: 'Submit for Approval',
        severity: 'error',
        icon: '📝'
      }),

      // Receiving Errors
      'INVALID_RECEIVING_STATUS': () => ({
        title: 'Cannot Receive Items',
        message: 'This purchase order is not in the correct status to receive items. It must be approved first.',
        actionText: 'Check Status',
        severity: 'error',
        icon: '📦'
      }),

      'OVER_RECEIVING': (ctx) => ({
        title: 'Over-Receiving Detected',
        message: ctx.productName && ctx.quantity && ctx.remainingQuantity
          ? `You're trying to receive ${ctx.quantity} units of ${ctx.productName}, but only ${ctx.remainingQuantity} units are remaining.`
          : 'You\'re trying to receive more items than ordered.',
        actionText: 'Adjust Quantity',
        severity: 'error',
        icon: '📊'
      }),

      'INVALID_RECEIVED_QUANTITY': (ctx) => ({
        title: 'Invalid Received Quantity',
        message: ctx.productName
          ? `Please enter a valid received quantity for ${ctx.productName}.`
          : 'Please enter a valid received quantity.',
        actionText: 'Fix Quantity',
        severity: 'error',
        icon: '🔢'
      }),

      'PRODUCT_NOT_IN_ORDER': (ctx) => ({
        title: 'Product Not Ordered',
        message: ctx.productName
          ? `${ctx.productName} was not included in this purchase order.`
          : 'This product was not included in the purchase order.',
        actionText: 'Remove Product',
        severity: 'error',
        icon: '❌'
      }),

      'EXPIRED_PRODUCT': (ctx) => ({
        title: 'Expired Product',
        message: ctx.productName
          ? `${ctx.productName} has already expired and cannot be received.`
          : 'This product has already expired.',
        actionText: 'Contact Supplier',
        severity: 'error',
        icon: '⚠️'
      }),

      'NEAR_EXPIRY_PRODUCT': (ctx) => ({
        title: 'Product Expires Soon',
        message: ctx.productName
          ? `${ctx.productName} expires within 30 days. Please verify the expiry date.`
          : 'This product expires within 30 days.',
        severity: 'warning',
        icon: '⏰',
        actionText: 'Verify Date'
      }),

      'DAMAGED_GOODS': (ctx) => ({
        title: 'Damaged Goods Reported',
        message: ctx.productName
          ? `${ctx.productName} has been marked as damaged. Please document the damage.`
          : 'Damaged goods have been reported.',
        severity: 'warning',
        icon: '💥',
        actionText: 'Document Damage'
      }),

      // Permission Errors
      'INSUFFICIENT_RECEIVING_PERMISSION': () => ({
        title: 'Cannot Receive Items',
        message: 'You don\'t have permission to receive purchase order items.',
        actionText: 'Contact Warehouse Staff',
        severity: 'error',
        icon: '🔒'
      }),

      'INSUFFICIENT_CANCELLATION_PERMISSION': () => ({
        title: 'Cannot Cancel Order',
        message: 'You don\'t have permission to cancel this purchase order.',
        actionText: 'Contact Manager',
        severity: 'error',
        icon: '🔒'
      }),

      // Warning Messages
      'LARGE_QUANTITY': (ctx) => ({
        title: 'Large Quantity Order',
        message: ctx.productName && ctx.quantity
          ? `You're ordering a large quantity of ${ctx.productName} (${ctx.quantity.toLocaleString()} units).`
          : 'You\'re ordering a very large quantity.',
        severity: 'warning',
        icon: '📈',
        actionText: 'Verify Quantity'
      }),

      'HIGH_VALUE_ITEM': (ctx) => ({
        title: 'High-Value Purchase',
        message: ctx.amount
          ? `This item has a high total value of ₱${ctx.amount.toLocaleString()}.`
          : 'This is a high-value purchase.',
        severity: 'warning',
        icon: '💎',
        actionText: 'Verify Amount'
      }),

      'APPROACHING_APPROVAL_LIMIT': (ctx) => ({
        title: 'Near Approval Limit',
        message: ctx.amount && ctx.approvalLimit
          ? `This order (₱${ctx.amount.toLocaleString()}) is close to your approval limit (₱${ctx.approvalLimit.toLocaleString()}).`
          : 'This purchase is approaching your approval limit.',
        severity: 'warning',
        icon: '⚠️',
        actionText: 'Review Amount'
      }),

      // Recovery Messages
      'OPERATION_QUEUED': () => ({
        title: 'Operation Queued',
        message: 'The operation couldn\'t be completed right now and has been queued for later processing.',
        severity: 'info',
        icon: '⏳',
        actionText: 'Check Later',
        autoHide: true,
        duration: 5000
      }),

      'PARTIAL_SUCCESS': () => ({
        title: 'Partially Completed',
        message: 'Some items were processed successfully, but others require manual review.',
        severity: 'warning',
        icon: '⚡',
        actionText: 'Review Items'
      }),

      // Generic fallback
      'UNKNOWN_ERROR': () => ({
        title: 'Unexpected Error',
        message: 'An unexpected error occurred. Please try again or contact support.',
        actionText: 'Try Again',
        severity: 'error',
        icon: '❓'
      })
    };

    const template = templates[error.code];
    if (template) {
      return template(context);
    }

    // Fallback to generic message
    return {
      title: 'Validation Error',
      message: error.message,
      severity: error.severity,
      icon: error.severity === 'error' ? '❌' : error.severity === 'warning' ? '⚠️' : 'ℹ️',
      actionText: 'Fix Issue'
    };
  }

  /**
   * Get user-friendly error message for system errors
   */
  static getSystemErrorMessage(
    error: SystemError,
    context: ErrorContext = {}
  ): ErrorMessageTemplate {
    
    const templates: Record<string, (ctx: ErrorContext) => ErrorMessageTemplate> = {
      
      'VALIDATION_ERROR': () => ({
        title: 'Validation Failed',
        message: 'Please check the highlighted fields and correct any errors.',
        actionText: 'Fix Errors',
        severity: 'error',
        icon: '📝'
      }),

      'DATABASE_ERROR': () => ({
        title: 'Database Error',
        message: 'A database error occurred. The operation has been saved and will be retried automatically.',
        severity: 'error',
        icon: '💾',
        actionText: 'Try Again'
      }),

      'NETWORK_ERROR': () => ({
        title: 'Connection Problem',
        message: 'Network connection issue. Please check your internet connection and try again.',
        actionText: 'Retry',
        severity: 'error',
        icon: '🌐'
      }),

      'BUSINESS_ERROR': () => ({
        title: 'Business Rule Violation',
        message: 'This operation violates business rules. Please review and make necessary changes.',
        actionText: 'Review Rules',
        severity: 'error',
        icon: '📋'
      })
    };

    const template = templates[error.code];
    if (template) {
      return template(context);
    }

    return {
      title: 'System Error',
      message: error.message || 'An error occurred while processing your request.',
      severity: 'error',
      icon: '⚠️',
      actionText: 'Try Again'
    };
  }

  /**
   * Get user-friendly error message for stock validation errors
   */
  static getStockValidationErrorMessage(
    error: StockValidationError,
    context: ErrorContext = {}
  ): ErrorMessageTemplate {
    
    const templates: Record<string, (ctx: ErrorContext) => ErrorMessageTemplate> = {
      
      'INSUFFICIENT_STOCK': (ctx) => ({
        title: 'Not Enough Stock',
        message: `There are only ${error.availableStock} units of ${error.productName} available, but you're trying to use ${error.requestedQuantity} units.`,
        actionText: 'Reduce Quantity',
        severity: 'error',
        icon: '📦'
      }),

      'NEGATIVE_STOCK': (ctx) => ({
        title: 'Invalid Stock Operation',
        message: `This operation would result in negative stock for ${error.productName}.`,
        actionText: 'Check Quantities',
        severity: 'error',
        icon: '❌'
      }),

      'PRODUCT_NOT_FOUND': (ctx) => ({
        title: 'Product Not Found',
        message: error.productName !== 'unknown' 
          ? `${error.productName} could not be found in inventory.`
          : 'The selected product could not be found.',
        actionText: 'Select Different Product',
        severity: 'error',
        icon: '🔍'
      }),

      'CONCURRENT_MODIFICATION': (ctx) => ({
        title: 'Stock Level Changed',
        message: `The stock level for ${error.productName} changed while you were working. Please refresh and try again.`,
        actionText: 'Refresh',
        severity: 'warning',
        icon: '🔄'
      }),

      'MOVEMENT_TYPE_MISMATCH': (ctx) => ({
        title: 'Invalid Movement Type',
        message: 'The stock movement type is not valid for this operation.',
        actionText: 'Check Operation',
        severity: 'error',
        icon: '🚫'
      })
    };

    const template = templates[error.code];
    if (template) {
      return template(context);
    }

    return {
      title: 'Stock Validation Error',
      message: error.message,
      severity: 'error',
      icon: '📦',
      actionText: 'Fix Issue'
    };
  }

  /**
   * Format multiple errors into a single message
   */
  static formatMultipleErrors(
    errors: (PurchaseOrderValidationError | StockValidationError)[],
    context: ErrorContext = {}
  ): ErrorMessageTemplate {
    
    if (errors.length === 0) {
      return {
        title: 'No Errors',
        message: 'All validations passed.',
        severity: 'success',
        icon: '✅'
      };
    }

    if (errors.length === 1) {
      const error = errors[0];
      if ('severity' in error) {
        return this.getValidationErrorMessage(error, context);
      } else {
        return this.getStockValidationErrorMessage(error, context);
      }
    }

    // Multiple errors
    const errorCount = errors.filter(e => 'severity' in e ? e.severity === 'error' : true).length;
    const warningCount = errors.filter(e => 'severity' in e ? e.severity === 'warning' : false).length;

    let title = 'Multiple Issues Found';
    let message = '';
    
    if (errorCount > 0 && warningCount > 0) {
      message = `Found ${errorCount} error${errorCount > 1 ? 's' : ''} and ${warningCount} warning${warningCount > 1 ? 's' : ''} that need attention.`;
    } else if (errorCount > 0) {
      message = `Found ${errorCount} error${errorCount > 1 ? 's' : ''} that must be fixed before continuing.`;
    } else {
      title = 'Warnings Found';
      message = `Found ${warningCount} warning${warningCount > 1 ? 's' : ''} that should be reviewed.`;
    }

    return {
      title,
      message,
      severity: errorCount > 0 ? 'error' : 'warning',
      icon: errorCount > 0 ? '❌' : '⚠️',
      actionText: 'Review All Issues'
    };
  }

  /**
   * Get contextual suggestions based on error type and user role
   */
  static getContextualSuggestions(
    error: PurchaseOrderValidationError,
    userRole: string,
    context: ErrorContext = {}
  ): string[] {
    
    const baseSuggestions = error.suggestions || [];
    const contextualSuggestions: string[] = [];

    // Add role-specific suggestions
    if (error.code === 'INSUFFICIENT_APPROVAL_PERMISSION') {
      if (userRole === 'employee') {
        contextualSuggestions.push('Ask your manager to review and approve this order');
      } else if (userRole === 'manager') {
        contextualSuggestions.push('Contact an admin for orders exceeding your limit');
      }
    }

    if (error.code === 'OVER_RECEIVING' && userRole === 'employee') {
      contextualSuggestions.push('Check with warehouse supervisor before proceeding');
    }

    // Add operation-specific suggestions
    if (context.operationType === 'receiving') {
      if (['INVALID_RECEIVED_QUANTITY', 'PRODUCT_NOT_IN_ORDER'].includes(error.code)) {
        contextualSuggestions.push('Verify the delivery receipt against the purchase order');
      }
    }

    return [...baseSuggestions, ...contextualSuggestions];
  }

  /**
   * Generate recovery instructions for failed operations
   */
  static getRecoveryInstructions(
    error: PurchaseOrderValidationError | SystemError,
    _context: ErrorContext = {}
  ): string[] {
    
    const instructions: string[] = [];
    const errorCode = 'code' in error ? error.code : (error as any).code;

    switch (errorCode) {
      case 'DATABASE_ERROR':
        instructions.push('1. Wait a moment and try the operation again');
        instructions.push('2. If the error persists, contact system administrator');
        instructions.push('3. Your data has been saved and the operation will be retried automatically');
        break;

      case 'NETWORK_ERROR':
        instructions.push('1. Check your internet connection');
        instructions.push('2. Refresh the page and try again');
        instructions.push('3. If offline, your changes will sync when connection is restored');
        break;

      case 'OVER_RECEIVING':
        instructions.push('1. Verify the actual quantity received');
        instructions.push('2. Check if there are additional shipments expected');
        instructions.push('3. Contact the supplier if there\'s a quantity discrepancy');
        instructions.push('4. Document any over-shipment for future reference');
        break;

      case 'APPROVAL_AMOUNT_EXCEEDED':
        instructions.push('1. Review the purchase amount and verify accuracy');
        instructions.push('2. Consider splitting the order if possible');
        instructions.push('3. Request approval from a user with higher limits');
        instructions.push('4. Add justification notes for high-value purchases');
        break;

      default:
        instructions.push('1. Review the error details carefully');
        instructions.push('2. Make the necessary corrections');
        instructions.push('3. Try the operation again');
        instructions.push('4. Contact support if the problem persists');
    }

    return instructions;
  }
}