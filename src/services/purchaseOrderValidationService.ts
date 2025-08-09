import { PurchaseOrder, PurchaseOrderItem, Product } from '../types/business';
import { UserRole } from '../types/auth';
import { ValidationResult, ValidationRule } from '../utils/validation';
import { StockValidationError, validateStockCalculation, STOCK_IN_TYPES } from '../utils/stockValidation';

// Enhanced purchase order validation error types
export interface PurchaseOrderValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning' | 'info';
  suggestions: string[];
  context?: Record<string, any>;
}

export interface PurchaseOrderValidationResult {
  isValid: boolean;
  errors: PurchaseOrderValidationError[];
  warnings: PurchaseOrderValidationError[];
  canProceedWithWarnings?: boolean;
}

// Purchase order item validation for receiving
export interface ReceivingValidationItem {
  productId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  previouslyReceived: number;
  condition?: 'good' | 'damaged' | 'expired';
  batchNumber?: string;
  expiryDate?: Date;
}

export interface ReceivingValidationContext {
  purchaseOrderId: string;
  receivedBy: string;
  receivedDate: Date;
  allowOverReceiving?: boolean;
  tolerancePercentage?: number;
}

export class PurchaseOrderValidationService {
  
  /**
   * Validate purchase order creation
   */
  static validatePurchaseOrderCreation(purchaseOrder: Partial<PurchaseOrder>): PurchaseOrderValidationResult {
    const errors: PurchaseOrderValidationError[] = [];
    const warnings: PurchaseOrderValidationError[] = [];

    // Validate required fields
    if (!purchaseOrder.supplierId) {
      errors.push({
        code: 'SUPPLIER_REQUIRED',
        message: 'Supplier selection is required',
        field: 'supplierId',
        severity: 'error',
        suggestions: ['Select a supplier from the list', 'Create a new supplier if needed']
      });
    }

    if (!purchaseOrder.items || purchaseOrder.items.length === 0) {
      errors.push({
        code: 'NO_ITEMS',
        message: 'At least one item is required',
        field: 'items',
        severity: 'error',
        suggestions: ['Add products to the purchase order', 'Search and select products from inventory']
      });
    }

    // Validate purchase order number format
    if (purchaseOrder.poNumber) {
      const poNumberPattern = /^PO-\d{4}-\d{6}$/;
      if (!poNumberPattern.test(purchaseOrder.poNumber)) {
        warnings.push({
          code: 'INVALID_PO_NUMBER_FORMAT',
          message: 'Purchase order number format should be PO-YYYY-NNNNNN',
          field: 'poNumber',
          severity: 'warning',
          suggestions: ['Use format PO-YYYY-NNNNNN', 'System will auto-generate if left blank']
        });
      }
    }

    // Validate dates
    if (purchaseOrder.orderDate) {
      const orderDate = new Date(purchaseOrder.orderDate);
      const today = new Date();
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      
      if (orderDate > today) {
        warnings.push({
          code: 'FUTURE_ORDER_DATE',
          message: 'Order date is in the future',
          field: 'orderDate',
          severity: 'warning',
          suggestions: ['Verify the order date is correct']
        });
      }
      
      if (orderDate < oneYearAgo) {
        warnings.push({
          code: 'OLD_ORDER_DATE',
          message: 'Order date is more than a year ago',
          field: 'orderDate',
          severity: 'warning',
          suggestions: ['Verify the order date is correct']
        });
      }
    }

    if (purchaseOrder.expectedDeliveryDate) {
      const expectedDate = new Date(purchaseOrder.expectedDeliveryDate);
      const orderDate = purchaseOrder.orderDate ? new Date(purchaseOrder.orderDate) : new Date();
      
      if (expectedDate <= orderDate) {
        errors.push({
          code: 'INVALID_DELIVERY_DATE',
          message: 'Expected delivery date must be after order date',
          field: 'expectedDeliveryDate',
          severity: 'error',
          suggestions: ['Set delivery date to be after order date', 'Allow reasonable time for supplier delivery']
        });
      }
    }

    // Validate items
    if (purchaseOrder.items) {
      const itemValidation = this.validatePurchaseOrderItems(purchaseOrder.items);
      errors.push(...itemValidation.errors);
      warnings.push(...itemValidation.warnings);
    }

    // Validate totals
    if (purchaseOrder.items && purchaseOrder.total !== undefined) {
      const calculatedTotal = purchaseOrder.items.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0);
      
      if (Math.abs(calculatedTotal - purchaseOrder.total) > 0.01) {
        errors.push({
          code: 'TOTAL_MISMATCH',
          message: `Total amount mismatch. Calculated: ₱${calculatedTotal.toFixed(2)}, Provided: ₱${purchaseOrder.total.toFixed(2)}`,
          field: 'total',
          severity: 'error',
          suggestions: ['Recalculate totals', 'Check item quantities and prices']
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceedWithWarnings: warnings.length > 0 && errors.length === 0
    };
  }

  /**
   * Validate purchase order items
   */
  static validatePurchaseOrderItems(items: PurchaseOrderItem[]): PurchaseOrderValidationResult {
    const errors: PurchaseOrderValidationError[] = [];
    const warnings: PurchaseOrderValidationError[] = [];

    items.forEach((item, index) => {
      const itemPrefix = `Item ${index + 1}`;

      // Validate product ID
      if (!item.productId) {
        errors.push({
          code: 'INVALID_PRODUCT_ID',
          message: `${itemPrefix}: Product is required`,
          field: `items[${index}].productId`,
          severity: 'error',
          suggestions: ['Select a valid product', 'Check if product exists in inventory']
        });
      }

      // Validate quantity
      if (!item.quantity || item.quantity <= 0) {
        errors.push({
          code: 'INVALID_QUANTITY',
          message: `${itemPrefix}: Quantity must be greater than zero`,
          field: `items[${index}].quantity`,
          severity: 'error',
          suggestions: ['Enter a valid quantity', 'Remove item if not needed']
        });
      } else if (!Number.isInteger(item.quantity)) {
        warnings.push({
          code: 'NON_INTEGER_QUANTITY',
          message: `${itemPrefix}: Non-integer quantity detected`,
          field: `items[${index}].quantity`,
          severity: 'warning',
          suggestions: ['Use whole numbers for quantities', 'Verify if fractional quantities are intended']
        });
      }

      // Validate unit price
      if (!item.unitPrice || item.unitPrice <= 0) {
        errors.push({
          code: 'INVALID_UNIT_PRICE',
          message: `${itemPrefix}: Unit price must be greater than zero`,
          field: `items[${index}].unitPrice`,
          severity: 'error',
          suggestions: ['Enter a valid unit price', 'Check supplier pricing']
        });
      }

      // Validate large quantities
      if (item.quantity && item.quantity > 10000) {
        warnings.push({
          code: 'LARGE_QUANTITY',
          message: `${itemPrefix}: Very large quantity (${item.quantity} units)`,
          field: `items[${index}].quantity`,
          severity: 'warning',
          suggestions: ['Verify quantity is correct', 'Consider splitting into multiple orders']
        });
      }

      // Validate high-value items
      if (item.quantity && item.unitPrice && (item.quantity * item.unitPrice) > 100000) {
        warnings.push({
          code: 'HIGH_VALUE_ITEM',
          message: `${itemPrefix}: High value item (₱${(item.quantity * item.unitPrice).toFixed(2)})`,
          field: `items[${index}].total`,
          severity: 'warning',
          suggestions: ['Verify pricing is correct', 'Consider approval requirements for high-value items']
        });
      }
    });

    // Check for duplicate products
    const productIds = items.map(item => item.productId).filter(Boolean);
    const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);
    
    if (duplicates.length > 0) {
      errors.push({
        code: 'DUPLICATE_PRODUCTS',
        message: 'Duplicate products detected in the order',
        severity: 'error',
        suggestions: ['Combine quantities for duplicate products', 'Remove duplicate entries']
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate purchase order status transition
   */
  static validateStatusTransition(
    currentStatus: string,
    newStatus: string,
    userRole: UserRole,
    purchaseOrder: PurchaseOrder
  ): PurchaseOrderValidationResult {
    const errors: PurchaseOrderValidationError[] = [];
    const warnings: PurchaseOrderValidationError[] = [];

    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      'draft': ['pending_approval', 'cancelled'],
      'pending_approval': ['approved', 'draft', 'cancelled'],
      'approved': ['sent_to_supplier', 'partially_received', 'fully_received', 'cancelled'],
      'sent_to_supplier': ['partially_received', 'fully_received', 'cancelled'],
      'partially_received': ['fully_received'],
      'fully_received': ['closed'],
      'cancelled': [],
      'closed': []
    };

    // Check if transition is valid
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      errors.push({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${currentStatus} to ${newStatus}`,
        severity: 'error',
        suggestions: [
          `Valid transitions from ${currentStatus}: ${validTransitions[currentStatus]?.join(', ') || 'none'}`,
          'Check business rules for status transitions'
        ]
      });
    }

    // Role-based transition validation
    const roleValidation = this.validateRoleBasedStatusTransition(currentStatus, newStatus, userRole, purchaseOrder);
    errors.push(...roleValidation.errors);
    warnings.push(...roleValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate role-based status transitions
   */
  static validateRoleBasedStatusTransition(
    currentStatus: string,
    newStatus: string,
    userRole: UserRole,
    purchaseOrder: PurchaseOrder
  ): PurchaseOrderValidationResult {
    const errors: PurchaseOrderValidationError[] = [];
    const warnings: PurchaseOrderValidationError[] = [];

    // Approval transitions
    if (newStatus === 'approved') {
      if (!['admin', 'manager'].includes(userRole)) {
        errors.push({
          code: 'INSUFFICIENT_APPROVAL_PERMISSION',
          message: 'Insufficient permissions to approve purchase orders',
          severity: 'error',
          suggestions: ['Contact a manager or admin for approval', 'Request approval permissions']
        });
      }

      // Check approval amount limits
      if (userRole === 'manager' && purchaseOrder.total > 50000) {
        errors.push({
          code: 'APPROVAL_AMOUNT_EXCEEDED',
          message: `Manager approval limit exceeded (₱${purchaseOrder.total.toFixed(2)} > ₱50,000.00)`,
          severity: 'error',
          suggestions: ['Request admin approval', 'Split order into smaller amounts']
        });
      }
    }

    // Receiving transitions
    if (newStatus === 'partially_received' || newStatus === 'fully_received') {
      if (!['admin', 'manager', 'employee'].includes(userRole)) {
        errors.push({
          code: 'INSUFFICIENT_RECEIVING_PERMISSION',
          message: 'Insufficient permissions to receive purchase orders',
          severity: 'error',
          suggestions: ['Contact warehouse staff for receiving', 'Request receiving permissions']
        });
      }
    }

    // Cancellation restrictions
    if (newStatus === 'cancelled') {
      if (currentStatus === 'fully_received') {
        errors.push({
          code: 'CANNOT_CANCEL_RECEIVED_ORDER',
          message: 'Cannot cancel a fully received purchase order',
          severity: 'error',
          suggestions: ['Create return order if needed', 'Contact manager for assistance']
        });
      }

      if (!['admin', 'manager'].includes(userRole) && currentStatus !== 'draft') {
        errors.push({
          code: 'INSUFFICIENT_CANCELLATION_PERMISSION',
          message: 'Insufficient permissions to cancel non-draft purchase orders',
          severity: 'error',
          suggestions: ['Contact a manager for cancellation', 'Request cancellation permissions']
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate receiving operation
   */
  static validateReceiving(
    purchaseOrder: PurchaseOrder,
    receivingItems: ReceivingValidationItem[],
    context: ReceivingValidationContext
  ): PurchaseOrderValidationResult {
    const errors: PurchaseOrderValidationError[] = [];
    const warnings: PurchaseOrderValidationError[] = [];

    // Validate purchase order status
    if (!['approved', 'sent_to_supplier', 'partially_received'].includes(purchaseOrder.status)) {
      errors.push({
        code: 'INVALID_RECEIVING_STATUS',
        message: `Cannot receive items for purchase order in ${purchaseOrder.status} status`,
        severity: 'error',
        suggestions: ['Ensure purchase order is approved', 'Check purchase order status']
      });
      return { isValid: false, errors, warnings };
    }

    // Validate receiving items
    receivingItems.forEach((receivingItem, index) => {
      const orderItem = purchaseOrder.items.find(item => item.productId === receivingItem.productId);
      
      if (!orderItem) {
        errors.push({
          code: 'PRODUCT_NOT_IN_ORDER',
          message: `Product ${receivingItem.productId} is not in the original purchase order`,
          severity: 'error',
          suggestions: ['Remove invalid product from receiving', 'Check product ID']
        });
        return;
      }

      const totalReceived = receivingItem.previouslyReceived + receivingItem.receivedQuantity;
      const remaining = orderItem.quantity - receivingItem.previouslyReceived;

      // Validate received quantity
      if (receivingItem.receivedQuantity <= 0) {
        errors.push({
          code: 'INVALID_RECEIVED_QUANTITY',
          message: `Invalid received quantity for ${orderItem.productName || receivingItem.productId}`,
          severity: 'error',
          suggestions: ['Enter a positive quantity', 'Remove item if nothing received']
        });
      }

      // Check over-receiving
      if (!context.allowOverReceiving && receivingItem.receivedQuantity > remaining) {
        errors.push({
          code: 'OVER_RECEIVING',
          message: `Over-receiving detected for ${orderItem.productName || receivingItem.productId}. Ordered: ${orderItem.quantity}, Already received: ${receivingItem.previouslyReceived}, Attempting to receive: ${receivingItem.receivedQuantity}`,
          severity: 'error',
          suggestions: [
            `Maximum receivable quantity: ${remaining}`,
            'Reduce received quantity',
            'Enable over-receiving if intentional'
          ]
        });
      } else if (context.allowOverReceiving && receivingItem.receivedQuantity > remaining) {
        const overReceivePercentage = ((receivingItem.receivedQuantity - remaining) / remaining) * 100;
        if (context.tolerancePercentage && overReceivePercentage > context.tolerancePercentage) {
          warnings.push({
            code: 'OVER_RECEIVING_TOLERANCE_EXCEEDED',
            message: `Over-receiving tolerance exceeded for ${orderItem.productName || receivingItem.productId} (${overReceivePercentage.toFixed(1)}% over)`,
            severity: 'warning',
            suggestions: [
              'Verify quantity is correct',
              'Document reason for over-receiving'
            ]
          });
        }
      }

      // Validate expiry dates for perishable items
      if (receivingItem.expiryDate) {
        const expiryDate = new Date(receivingItem.expiryDate);
        const today = new Date();
        const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

        if (expiryDate <= today) {
          errors.push({
            code: 'EXPIRED_PRODUCT',
            message: `Product ${orderItem.productName || receivingItem.productId} is already expired`,
            severity: 'error',
            suggestions: ['Do not receive expired products', 'Contact supplier for replacement']
          });
        } else if (expiryDate <= thirtyDaysFromNow) {
          warnings.push({
            code: 'NEAR_EXPIRY_PRODUCT',
            message: `Product ${orderItem.productName || receivingItem.productId} expires within 30 days`,
            severity: 'warning',
            suggestions: ['Check expiry date is correct', 'Plan for quick sale/use']
          });
        }
      }

      // Validate damaged goods
      if (receivingItem.condition === 'damaged') {
        warnings.push({
          code: 'DAMAGED_GOODS',
          message: `Damaged goods received for ${orderItem.productName || receivingItem.productId}`,
          severity: 'warning',
          suggestions: ['Document damage with photos', 'Contact supplier about damaged goods', 'Consider partial acceptance']
        });
      }
    });

    // Validate receiving date
    if (context.receivedDate) {
      const receivedDate = new Date(context.receivedDate);
      const orderDate = new Date(purchaseOrder.orderDate);
      const today = new Date();

      if (receivedDate < orderDate) {
        errors.push({
          code: 'INVALID_RECEIVED_DATE',
          message: 'Received date cannot be before order date',
          severity: 'error',
          suggestions: ['Set received date after order date']
        });
      }

      if (receivedDate > today) {
        errors.push({
          code: 'FUTURE_RECEIVED_DATE',
          message: 'Received date cannot be in the future',
          severity: 'error',
          suggestions: ['Set received date to today or earlier']
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceedWithWarnings: warnings.length > 0 && errors.length === 0
    };
  }

  /**
   * Validate purchase order approval
   */
  static validateApproval(
    purchaseOrder: PurchaseOrder,
    approverRole: UserRole,
    approverUserId: string
  ): PurchaseOrderValidationResult {
    const errors: PurchaseOrderValidationError[] = [];
    const warnings: PurchaseOrderValidationError[] = [];

    // Check if already approved
    if (purchaseOrder.status === 'approved') {
      errors.push({
        code: 'ALREADY_APPROVED',
        message: 'Purchase order is already approved',
        severity: 'error',
        suggestions: ['Check purchase order status', 'No action needed']
      });
      return { isValid: false, errors, warnings };
    }

    // Check if in correct status for approval
    if (purchaseOrder.status !== 'pending_approval') {
      errors.push({
        code: 'NOT_PENDING_APPROVAL',
        message: `Purchase order must be in pending_approval status for approval (current: ${purchaseOrder.status})`,
        severity: 'error',
        suggestions: ['Submit purchase order for approval first']
      });
    }

    // Role-based approval permissions are handled in validateApprovalAmount

    // Self-approval check
    if (purchaseOrder.createdBy === approverUserId) {
      if (!['admin'].includes(approverRole)) {
        errors.push({
          code: 'SELF_APPROVAL_NOT_ALLOWED',
          message: 'Cannot approve your own purchase order',
          severity: 'error',
          suggestions: ['Request approval from another manager or admin']
        });
      } else {
        warnings.push({
          code: 'SELF_APPROVAL_WARNING',
          message: 'Approving your own purchase order (admin override)',
          severity: 'warning',
          suggestions: ['Consider having another admin review']
        });
      }
    }

    // Amount-based approval validation
    const amountValidation = this.validateApprovalAmount(purchaseOrder.total, approverRole);
    errors.push(...amountValidation.errors);
    warnings.push(...amountValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceedWithWarnings: warnings.length > 0 && errors.length === 0
    };
  }

  /**
   * Validate approval amount limits
   */
  static validateApprovalAmount(
    amount: number,
    approverRole: UserRole
  ): PurchaseOrderValidationResult {
    const errors: PurchaseOrderValidationError[] = [];
    const warnings: PurchaseOrderValidationError[] = [];

    // Define approval limits
    const approvalLimits: Record<UserRole, number> = {
      cashier: 0, // No approval permission
      employee: 5000,
      accountant: 15000,
      manager: 50000,
      admin: Infinity
    };

    const limit = approvalLimits[approverRole] || 0;

    if (amount > limit) {
      if (limit === 0) {
        errors.push({
          code: 'NO_APPROVAL_PERMISSION',
          message: `Role ${approverRole} cannot approve purchase orders`,
          severity: 'error',
          suggestions: ['Contact a manager or admin for approval']
        });
      } else {
        errors.push({
          code: 'APPROVAL_LIMIT_EXCEEDED',
          message: `Purchase amount ₱${amount.toFixed(2)} exceeds approval limit ₱${limit.toFixed(2)} for ${approverRole}`,
          severity: 'error',
          suggestions: [
            'Request approval from higher authority',
            'Split order into smaller amounts',
            `Contact admin for orders over ₱${limit.toFixed(2)}`
          ]
        });
      }
    } else if (amount > (limit * 0.8)) {
      warnings.push({
        code: 'APPROACHING_APPROVAL_LIMIT',
        message: `Purchase amount ₱${amount.toFixed(2)} is approaching approval limit ₱${limit.toFixed(2)}`,
        severity: 'warning',
        suggestions: ['Consider if amount is correct', 'Document justification for high-value purchase']
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create user-friendly error message
   */
  static formatErrorMessage(error: PurchaseOrderValidationError): string {
    let message = error.message;
    
    if (error.suggestions.length > 0) {
      message += '\n\nSuggestions:\n' + error.suggestions.map(s => `• ${s}`).join('\n');
    }
    
    return message;
  }

  /**
   * Group errors by severity
   */
  static groupErrorsBySeverity(errors: PurchaseOrderValidationError[]): {
    errors: PurchaseOrderValidationError[];
    warnings: PurchaseOrderValidationError[];
    info: PurchaseOrderValidationError[];
  } {
    return {
      errors: errors.filter(e => e.severity === 'error'),
      warnings: errors.filter(e => e.severity === 'warning'),
      info: errors.filter(e => e.severity === 'info')
    };
  }
}