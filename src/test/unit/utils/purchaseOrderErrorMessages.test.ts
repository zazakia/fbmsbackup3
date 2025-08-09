import { describe, it, expect } from 'vitest';
import { PurchaseOrderErrorMessages } from '../../../utils/purchaseOrderErrorMessages';
import { PurchaseOrderValidationError } from '../../../services/purchaseOrderValidationService';
import { SystemError } from '../../../services/errorHandlingService';
import { StockValidationError } from '../../../utils/stockValidation';

describe('PurchaseOrderErrorMessages', () => {

  describe('getValidationErrorMessage', () => {
    it('should format supplier required error', () => {
      const error: PurchaseOrderValidationError = {
        code: 'SUPPLIER_REQUIRED',
        message: 'Supplier selection is required',
        field: 'supplierId',
        severity: 'error',
        suggestions: ['Select a supplier']
      };

      const message = PurchaseOrderErrorMessages.getValidationErrorMessage(error);

      expect(message.title).toBe('Supplier Required');
      expect(message.message).toBe('Please select a supplier before creating the purchase order.');
      expect(message.actionText).toBe('Select Supplier');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('👥');
    });

    it('should format no items error', () => {
      const error: PurchaseOrderValidationError = {
        code: 'NO_ITEMS',
        message: 'At least one item is required',
        field: 'items',
        severity: 'error',
        suggestions: ['Add products']
      };

      const message = PurchaseOrderErrorMessages.getValidationErrorMessage(error);

      expect(message.title).toBe('No Items Added');
      expect(message.message).toBe('Add at least one product to the purchase order.');
      expect(message.actionText).toBe('Add Products');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('📦');
    });

    it('should format invalid quantity error with product context', () => {
      const error: PurchaseOrderValidationError = {
        code: 'INVALID_QUANTITY',
        message: 'Invalid quantity',
        field: 'quantity',
        severity: 'error',
        suggestions: ['Enter positive number']
      };

      const context = {
        productName: 'Test Product'
      };

      const message = PurchaseOrderErrorMessages.getValidationErrorMessage(error, context);

      expect(message.title).toBe('Invalid Quantity');
      expect(message.message).toBe('Invalid quantity for Test Product. Please enter a positive number.');
      expect(message.actionText).toBe('Fix Quantity');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('🔢');
    });

    it('should format approval amount exceeded error with context', () => {
      const error: PurchaseOrderValidationError = {
        code: 'APPROVAL_AMOUNT_EXCEEDED',
        message: 'Approval limit exceeded',
        severity: 'error',
        suggestions: ['Request higher approval']
      };

      const context = {
        amount: 75000,
        approvalLimit: 50000,
        userRole: 'manager'
      };

      const message = PurchaseOrderErrorMessages.getValidationErrorMessage(error, context);

      expect(message.title).toBe('Approval Limit Exceeded');
      expect(message.message).toContain('₱75,000');
      expect(message.message).toContain('₱50,000');
      expect(message.actionText).toBe('Request Higher Approval');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('💸');
    });

    it('should format over-receiving error with product and quantity context', () => {
      const error: PurchaseOrderValidationError = {
        code: 'OVER_RECEIVING',
        message: 'Over-receiving detected',
        severity: 'error',
        suggestions: ['Adjust quantity']
      };

      const context = {
        productName: 'Widget A',
        quantity: 15,
        remainingQuantity: 5
      };

      const message = PurchaseOrderErrorMessages.getValidationErrorMessage(error, context);

      expect(message.title).toBe('Over-Receiving Detected');
      expect(message.message).toContain('Widget A');
      expect(message.message).toContain('15 units');
      expect(message.message).toContain('5 units');
      expect(message.actionText).toBe('Adjust Quantity');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('📊');
    });

    it('should format warning messages appropriately', () => {
      const error: PurchaseOrderValidationError = {
        code: 'LARGE_QUANTITY',
        message: 'Large quantity detected',
        severity: 'warning',
        suggestions: ['Verify quantity']
      };

      const context = {
        productName: 'Bulk Item',
        quantity: 50000
      };

      const message = PurchaseOrderErrorMessages.getValidationErrorMessage(error, context);

      expect(message.title).toBe('Large Quantity Order');
      expect(message.message).toContain('Bulk Item');
      expect(message.message).toContain('50,000 units');
      expect(message.severity).toBe('warning');
      expect(message.icon).toBe('📈');
    });

    it('should handle unknown error codes with fallback', () => {
      const error: PurchaseOrderValidationError = {
        code: 'UNKNOWN_ERROR_CODE',
        message: 'Some unknown error occurred',
        severity: 'error',
        suggestions: ['Try again']
      };

      const message = PurchaseOrderErrorMessages.getValidationErrorMessage(error);

      expect(message.title).toBe('Validation Error');
      expect(message.message).toBe('Some unknown error occurred');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('❌');
    });

    it('should format permission denied messages', () => {
      const error: PurchaseOrderValidationError = {
        code: 'INSUFFICIENT_APPROVAL_PERMISSION',
        message: 'No approval permission',
        severity: 'error',
        suggestions: ['Contact manager']
      };

      const context = {
        userRole: 'employee'
      };

      const message = PurchaseOrderErrorMessages.getValidationErrorMessage(error, context);

      expect(message.title).toBe('Cannot Approve');
      expect(message.message).toContain('employee');
      expect(message.actionText).toBe('Contact Manager');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('🔒');
    });

    it('should format high-value item warnings with amount', () => {
      const error: PurchaseOrderValidationError = {
        code: 'HIGH_VALUE_ITEM',
        message: 'High value item',
        severity: 'warning',
        suggestions: ['Verify amount']
      };

      const context = {
        amount: 250000
      };

      const message = PurchaseOrderErrorMessages.getValidationErrorMessage(error, context);

      expect(message.title).toBe('High-Value Purchase');
      expect(message.message).toContain('₱250,000');
      expect(message.severity).toBe('warning');
      expect(message.icon).toBe('💎');
    });
  });

  describe('getSystemErrorMessage', () => {
    it('should format database errors', () => {
      const error: SystemError = {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed',
        details: 'Connection timeout'
      };

      const message = PurchaseOrderErrorMessages.getSystemErrorMessage(error);

      expect(message.title).toBe('Database Error');
      expect(message.message).toContain('database error occurred');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('💾');
      expect(message.actionText).toBe('Try Again');
    });

    it('should format network errors', () => {
      const error: SystemError = {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        retryCount: 2
      };

      const message = PurchaseOrderErrorMessages.getSystemErrorMessage(error);

      expect(message.title).toBe('Connection Problem');
      expect(message.message).toContain('Network connection issue');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('🌐');
      expect(message.actionText).toBe('Retry');
    });

    it('should format business errors', () => {
      const error: SystemError = {
        code: 'BUSINESS_ERROR',
        message: 'Business rule violation',
        context: 'Status transition'
      };

      const message = PurchaseOrderErrorMessages.getSystemErrorMessage(error);

      expect(message.title).toBe('Business Rule Violation');
      expect(message.message).toContain('business rules');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('📋');
      expect(message.actionText).toBe('Review Rules');
    });

    it('should handle unknown system errors', () => {
      const error: SystemError = {
        code: 'UNKNOWN_SYSTEM_ERROR',
        message: 'Unknown system error'
      };

      const message = PurchaseOrderErrorMessages.getSystemErrorMessage(error);

      expect(message.title).toBe('System Error');
      expect(message.message).toBe('Unknown system error');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('⚠️');
      expect(message.actionText).toBe('Try Again');
    });
  });

  describe('getStockValidationErrorMessage', () => {
    it('should format insufficient stock error', () => {
      const error: StockValidationError = {
        code: 'INSUFFICIENT_STOCK',
        message: 'Not enough stock',
        productId: 'prod-1',
        productName: 'Test Product',
        requestedQuantity: 15,
        availableStock: 5,
        suggestions: ['Reduce quantity']
      };

      const message = PurchaseOrderErrorMessages.getStockValidationErrorMessage(error);

      expect(message.title).toBe('Not Enough Stock');
      expect(message.message).toContain('5 units of Test Product available');
      expect(message.message).toContain('15 units');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('📦');
      expect(message.actionText).toBe('Reduce Quantity');
    });

    it('should format product not found error', () => {
      const error: StockValidationError = {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found',
        productId: 'prod-1',
        productName: 'Missing Product',
        requestedQuantity: 10,
        availableStock: 0,
        suggestions: ['Select different product']
      };

      const message = PurchaseOrderErrorMessages.getStockValidationErrorMessage(error);

      expect(message.title).toBe('Product Not Found');
      expect(message.message).toContain('Missing Product could not be found');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('🔍');
      expect(message.actionText).toBe('Select Different Product');
    });

    it('should format concurrent modification error', () => {
      const error: StockValidationError = {
        code: 'CONCURRENT_MODIFICATION',
        message: 'Stock level changed',
        productId: 'prod-1',
        productName: 'Changed Product',
        requestedQuantity: 10,
        availableStock: 5,
        suggestions: ['Refresh and try again']
      };

      const message = PurchaseOrderErrorMessages.getStockValidationErrorMessage(error);

      expect(message.title).toBe('Stock Level Changed');
      expect(message.message).toContain('Changed Product');
      expect(message.message).toContain('refresh and try again');
      expect(message.severity).toBe('warning');
      expect(message.icon).toBe('🔄');
      expect(message.actionText).toBe('Refresh');
    });

    it('should handle unknown stock validation errors', () => {
      const error: StockValidationError = {
        code: 'UNKNOWN_STOCK_ERROR',
        message: 'Unknown stock error',
        productId: 'prod-1',
        productName: 'Test Product',
        requestedQuantity: 10,
        availableStock: 5,
        suggestions: []
      } as any;

      const message = PurchaseOrderErrorMessages.getStockValidationErrorMessage(error);

      expect(message.title).toBe('Stock Validation Error');
      expect(message.message).toBe('Unknown stock error');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('📦');
    });
  });

  describe('formatMultipleErrors', () => {
    it('should handle single validation error', () => {
      const errors: PurchaseOrderValidationError[] = [
        {
          code: 'SUPPLIER_REQUIRED',
          message: 'Supplier required',
          severity: 'error',
          suggestions: []
        }
      ];

      const message = PurchaseOrderErrorMessages.formatMultipleErrors(errors);

      expect(message.title).toBe('Supplier Required');
      expect(message.severity).toBe('error');
    });

    it('should handle single stock validation error', () => {
      const errors: StockValidationError[] = [
        {
          code: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock',
          productId: 'prod-1',
          productName: 'Test Product',
          requestedQuantity: 15,
          availableStock: 5,
          suggestions: []
        }
      ];

      const message = PurchaseOrderErrorMessages.formatMultipleErrors(errors);

      expect(message.title).toBe('Not Enough Stock');
      expect(message.severity).toBe('error');
    });

    it('should format multiple errors correctly', () => {
      const errors: PurchaseOrderValidationError[] = [
        {
          code: 'SUPPLIER_REQUIRED',
          message: 'Supplier required',
          severity: 'error',
          suggestions: []
        },
        {
          code: 'INVALID_QUANTITY',
          message: 'Invalid quantity',
          severity: 'error',
          suggestions: []
        },
        {
          code: 'LARGE_QUANTITY',
          message: 'Large quantity',
          severity: 'warning',
          suggestions: []
        }
      ];

      const message = PurchaseOrderErrorMessages.formatMultipleErrors(errors);

      expect(message.title).toBe('Multiple Issues Found');
      expect(message.message).toContain('2 errors');
      expect(message.message).toContain('1 warning');
      expect(message.severity).toBe('error');
      expect(message.icon).toBe('❌');
    });

    it('should format multiple warnings correctly', () => {
      const errors: PurchaseOrderValidationError[] = [
        {
          code: 'LARGE_QUANTITY',
          message: 'Large quantity',
          severity: 'warning',
          suggestions: []
        },
        {
          code: 'HIGH_VALUE_ITEM',
          message: 'High value',
          severity: 'warning',
          suggestions: []
        }
      ];

      const message = PurchaseOrderErrorMessages.formatMultipleErrors(errors);

      expect(message.title).toBe('Warnings Found');
      expect(message.message).toContain('2 warnings');
      expect(message.severity).toBe('warning');
      expect(message.icon).toBe('⚠️');
    });

    it('should handle empty error array', () => {
      const errors: PurchaseOrderValidationError[] = [];

      const message = PurchaseOrderErrorMessages.formatMultipleErrors(errors);

      expect(message.title).toBe('No Errors');
      expect(message.message).toBe('All validations passed.');
      expect(message.severity).toBe('success');
      expect(message.icon).toBe('✅');
    });
  });

  describe('getContextualSuggestions', () => {
    it('should provide role-specific suggestions for approval permission error', () => {
      const error: PurchaseOrderValidationError = {
        code: 'INSUFFICIENT_APPROVAL_PERMISSION',
        message: 'No approval permission',
        severity: 'error',
        suggestions: ['Contact manager']
      };

      const employeeSuggestions = PurchaseOrderErrorMessages.getContextualSuggestions(
        error,
        'employee'
      );

      expect(employeeSuggestions).toContain('Contact manager');
      expect(employeeSuggestions).toContain('Ask your manager to review and approve this order');

      const managerSuggestions = PurchaseOrderErrorMessages.getContextualSuggestions(
        error,
        'manager'
      );

      expect(managerSuggestions).toContain('Contact an admin for orders exceeding your limit');
    });

    it('should provide operation-specific suggestions', () => {
      const error: PurchaseOrderValidationError = {
        code: 'INVALID_RECEIVED_QUANTITY',
        message: 'Invalid quantity',
        severity: 'error',
        suggestions: ['Check quantity']
      };

      const suggestions = PurchaseOrderErrorMessages.getContextualSuggestions(
        error,
        'employee',
        { operationType: 'receiving' }
      );

      expect(suggestions).toContain('Check quantity');
      expect(suggestions).toContain('Verify the delivery receipt against the purchase order');
    });

    it('should provide warehouse-specific suggestions for over-receiving', () => {
      const error: PurchaseOrderValidationError = {
        code: 'OVER_RECEIVING',
        message: 'Over-receiving detected',
        severity: 'error',
        suggestions: ['Reduce quantity']
      };

      const suggestions = PurchaseOrderErrorMessages.getContextualSuggestions(
        error,
        'employee'
      );

      expect(suggestions).toContain('Reduce quantity');
      expect(suggestions).toContain('Check with warehouse supervisor before proceeding');
    });
  });

  describe('getRecoveryInstructions', () => {
    it('should provide database error recovery instructions', () => {
      const error: SystemError = {
        code: 'DATABASE_ERROR',
        message: 'Database error'
      };

      const instructions = PurchaseOrderErrorMessages.getRecoveryInstructions(error);

      expect(instructions).toContain('1. Wait a moment and try the operation again');
      expect(instructions).toContain('2. If the error persists, contact system administrator');
      expect(instructions).toContain('3. Your data has been saved and the operation will be retried automatically');
    });

    it('should provide network error recovery instructions', () => {
      const error: SystemError = {
        code: 'NETWORK_ERROR',
        message: 'Network error'
      };

      const instructions = PurchaseOrderErrorMessages.getRecoveryInstructions(error);

      expect(instructions).toContain('1. Check your internet connection');
      expect(instructions).toContain('2. Refresh the page and try again');
      expect(instructions).toContain('3. If offline, your changes will sync when connection is restored');
    });

    it('should provide over-receiving recovery instructions', () => {
      const error: PurchaseOrderValidationError = {
        code: 'OVER_RECEIVING',
        message: 'Over-receiving detected',
        severity: 'error',
        suggestions: []
      };

      const instructions = PurchaseOrderErrorMessages.getRecoveryInstructions(error);

      expect(instructions).toContain('1. Verify the actual quantity received');
      expect(instructions).toContain('2. Check if there are additional shipments expected');
      expect(instructions).toContain('3. Contact the supplier if there\'s a quantity discrepancy');
      expect(instructions).toContain('4. Document any over-shipment for future reference');
    });

    it('should provide approval amount exceeded recovery instructions', () => {
      const error: PurchaseOrderValidationError = {
        code: 'APPROVAL_AMOUNT_EXCEEDED',
        message: 'Approval limit exceeded',
        severity: 'error',
        suggestions: []
      };

      const instructions = PurchaseOrderErrorMessages.getRecoveryInstructions(error);

      expect(instructions).toContain('1. Review the purchase amount and verify accuracy');
      expect(instructions).toContain('2. Consider splitting the order if possible');
      expect(instructions).toContain('3. Request approval from a user with higher limits');
      expect(instructions).toContain('4. Add justification notes for high-value purchases');
    });

    it('should provide default recovery instructions for unknown errors', () => {
      const error: PurchaseOrderValidationError = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error',
        severity: 'error',
        suggestions: []
      };

      const instructions = PurchaseOrderErrorMessages.getRecoveryInstructions(error);

      expect(instructions).toContain('1. Review the error details carefully');
      expect(instructions).toContain('2. Make the necessary corrections');
      expect(instructions).toContain('3. Try the operation again');
      expect(instructions).toContain('4. Contact support if the problem persists');
    });
  });
});