import { describe, it, expect, beforeEach } from 'vitest';
import { PurchaseOrderValidationService } from '../../../services/purchaseOrderValidationService';
import { PurchaseOrder, PurchaseOrderItem } from '../../../types/business';
import { UserRole } from '../../../types/auth';

describe('PurchaseOrderValidationService', () => {
  
  describe('validatePurchaseOrderCreation', () => {
    it('should pass validation for valid purchase order', () => {
      const validPO: Partial<PurchaseOrder> = {
        supplierId: 'supplier-1',
        poNumber: 'PO-2024-000001',
        orderDate: new Date().toISOString(),
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            quantity: 10,
            unitPrice: 100,
            total: 1000
          } as PurchaseOrderItem
        ],
        total: 1000
      };

      const result = PurchaseOrderValidationService.validatePurchaseOrderCreation(validPO);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when supplier is missing', () => {
      const invalidPO: Partial<PurchaseOrder> = {
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            quantity: 10,
            unitPrice: 100,
            total: 1000
          } as PurchaseOrderItem
        ],
        total: 1000
      };

      const result = PurchaseOrderValidationService.validatePurchaseOrderCreation(invalidPO);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('SUPPLIER_REQUIRED');
      expect(result.errors[0].severity).toBe('error');
    });

    it('should fail validation when no items are provided', () => {
      const invalidPO: Partial<PurchaseOrder> = {
        supplierId: 'supplier-1',
        items: [],
        total: 0
      };

      const result = PurchaseOrderValidationService.validatePurchaseOrderCreation(invalidPO);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_ITEMS')).toBe(true);
    });

    it('should warn about invalid PO number format', () => {
      const invalidPO: Partial<PurchaseOrder> = {
        supplierId: 'supplier-1',
        poNumber: 'INVALID-FORMAT',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            quantity: 10,
            unitPrice: 100,
            total: 1000
          } as PurchaseOrderItem
        ],
        total: 1000
      };

      const result = PurchaseOrderValidationService.validatePurchaseOrderCreation(invalidPO);
      
      expect(result.warnings.some(w => w.code === 'INVALID_PO_NUMBER_FORMAT')).toBe(true);
    });

    it('should fail validation when expected delivery date is before order date', () => {
      const invalidPO: Partial<PurchaseOrder> = {
        supplierId: 'supplier-1',
        orderDate: new Date().toISOString(),
        expectedDeliveryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            quantity: 10,
            unitPrice: 100,
            total: 1000
          } as PurchaseOrderItem
        ],
        total: 1000
      };

      const result = PurchaseOrderValidationService.validatePurchaseOrderCreation(invalidPO);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_DELIVERY_DATE')).toBe(true);
    });

    it('should fail validation when total amount mismatch', () => {
      const invalidPO: Partial<PurchaseOrder> = {
        supplierId: 'supplier-1',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            quantity: 10,
            unitPrice: 100,
            total: 1000
          } as PurchaseOrderItem
        ],
        total: 1500 // Wrong total
      };

      const result = PurchaseOrderValidationService.validatePurchaseOrderCreation(invalidPO);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'TOTAL_MISMATCH')).toBe(true);
    });
  });

  describe('validatePurchaseOrderItems', () => {
    it('should pass validation for valid items', () => {
      const validItems: PurchaseOrderItem[] = [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Product 1',
          quantity: 10,
          unitPrice: 100,
          total: 1000
        } as PurchaseOrderItem,
        {
          id: 'item-2',
          productId: 'prod-2',
          productName: 'Product 2',
          quantity: 5,
          unitPrice: 200,
          total: 1000
        } as PurchaseOrderItem
      ];

      const result = PurchaseOrderValidationService.validatePurchaseOrderItems(validItems);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid quantity', () => {
      const invalidItems: PurchaseOrderItem[] = [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Product 1',
          quantity: 0, // Invalid quantity
          unitPrice: 100,
          total: 1000
        } as PurchaseOrderItem
      ];

      const result = PurchaseOrderValidationService.validatePurchaseOrderItems(invalidItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_QUANTITY')).toBe(true);
    });

    it('should fail validation for invalid unit price', () => {
      const invalidItems: PurchaseOrderItem[] = [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Product 1',
          quantity: 10,
          unitPrice: 0, // Invalid price
          total: 1000
        } as PurchaseOrderItem
      ];

      const result = PurchaseOrderValidationService.validatePurchaseOrderItems(invalidItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_UNIT_PRICE')).toBe(true);
    });

    it('should warn about non-integer quantities', () => {
      const items: PurchaseOrderItem[] = [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Product 1',
          quantity: 10.5, // Non-integer quantity
          unitPrice: 100,
          total: 1050
        } as PurchaseOrderItem
      ];

      const result = PurchaseOrderValidationService.validatePurchaseOrderItems(items);
      
      expect(result.warnings.some(w => w.code === 'NON_INTEGER_QUANTITY')).toBe(true);
    });

    it('should warn about large quantities', () => {
      const items: PurchaseOrderItem[] = [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Product 1',
          quantity: 15000, // Large quantity
          unitPrice: 1,
          total: 15000
        } as PurchaseOrderItem
      ];

      const result = PurchaseOrderValidationService.validatePurchaseOrderItems(items);
      
      expect(result.warnings.some(w => w.code === 'LARGE_QUANTITY')).toBe(true);
    });

    it('should warn about high-value items', () => {
      const items: PurchaseOrderItem[] = [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Product 1',
          quantity: 100,
          unitPrice: 2000, // High value
          total: 200000
        } as PurchaseOrderItem
      ];

      const result = PurchaseOrderValidationService.validatePurchaseOrderItems(items);
      
      expect(result.warnings.some(w => w.code === 'HIGH_VALUE_ITEM')).toBe(true);
    });

    it('should fail validation for duplicate products', () => {
      const duplicateItems: PurchaseOrderItem[] = [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Product 1',
          quantity: 10,
          unitPrice: 100,
          total: 1000
        } as PurchaseOrderItem,
        {
          id: 'item-2',
          productId: 'prod-1', // Duplicate product
          productName: 'Product 1',
          quantity: 5,
          unitPrice: 100,
          total: 500
        } as PurchaseOrderItem
      ];

      const result = PurchaseOrderValidationService.validatePurchaseOrderItems(duplicateItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_PRODUCTS')).toBe(true);
    });
  });

  describe('validateStatusTransition', () => {
    const mockPO: PurchaseOrder = {
      id: 'po-1',
      poNumber: 'PO-2024-000001',
      supplierId: 'supplier-1',
      status: 'draft',
      total: 1000,
      items: [],
      orderDate: new Date().toISOString(),
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should allow valid status transitions', () => {
      const validTransitions = [
        { from: 'draft', to: 'pending_approval' },
        { from: 'pending_approval', to: 'approved' },
        { from: 'approved', to: 'partially_received' },
        { from: 'partially_received', to: 'fully_received' },
        { from: 'fully_received', to: 'closed' }
      ];

      validTransitions.forEach(transition => {
        const result = PurchaseOrderValidationService.validateStatusTransition(
          transition.from,
          transition.to,
          'admin',
          { ...mockPO, status: transition.from }
        );
        
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid status transitions', () => {
      const invalidTransitions = [
        { from: 'draft', to: 'fully_received' },
        { from: 'cancelled', to: 'approved' },
        { from: 'closed', to: 'draft' },
        { from: 'fully_received', to: 'draft' }
      ];

      invalidTransitions.forEach(transition => {
        const result = PurchaseOrderValidationService.validateStatusTransition(
          transition.from,
          transition.to,
          'admin',
          { ...mockPO, status: transition.from }
        );
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'INVALID_STATUS_TRANSITION')).toBe(true);
      });
    });
  });

  describe('validateRoleBasedStatusTransition', () => {
    const mockPO: PurchaseOrder = {
      id: 'po-1',
      poNumber: 'PO-2024-000001',
      supplierId: 'supplier-1',
      status: 'pending_approval',
      total: 1000,
      items: [],
      orderDate: new Date().toISOString(),
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should allow admin to approve orders', () => {
      const result = PurchaseOrderValidationService.validateRoleBasedStatusTransition(
        'pending_approval',
        'approved',
        'admin',
        mockPO
      );
      
      expect(result.isValid).toBe(true);
    });

    it('should allow manager to approve orders within limit', () => {
      const result = PurchaseOrderValidationService.validateRoleBasedStatusTransition(
        'pending_approval',
        'approved',
        'manager',
        { ...mockPO, total: 30000 } // Within manager limit
      );
      
      expect(result.isValid).toBe(true);
    });

    it('should reject manager approval for orders exceeding limit', () => {
      const result = PurchaseOrderValidationService.validateRoleBasedStatusTransition(
        'pending_approval',
        'approved',
        'manager',
        { ...mockPO, total: 60000 } // Exceeds manager limit
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'APPROVAL_AMOUNT_EXCEEDED')).toBe(true);
    });

    it('should reject employee approval', () => {
      const result = PurchaseOrderValidationService.validateRoleBasedStatusTransition(
        'pending_approval',
        'approved',
        'employee',
        mockPO
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INSUFFICIENT_APPROVAL_PERMISSION')).toBe(true);
    });

    it('should prevent cancellation of fully received orders', () => {
      const result = PurchaseOrderValidationService.validateRoleBasedStatusTransition(
        'fully_received',
        'cancelled',
        'admin',
        { ...mockPO, status: 'fully_received' }
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'CANNOT_CANCEL_RECEIVED_ORDER')).toBe(true);
    });
  });

  describe('validateReceiving', () => {
    const mockPO: PurchaseOrder = {
      id: 'po-1',
      poNumber: 'PO-2024-000001',
      supplierId: 'supplier-1',
      status: 'approved',
      total: 1000,
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Product 1',
          quantity: 10,
          unitPrice: 100,
          total: 1000
        } as PurchaseOrderItem
      ],
      orderDate: new Date().toISOString(),
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should pass validation for valid receiving', () => {
      const receivingItems = [
        {
          productId: 'prod-1',
          orderedQuantity: 10,
          receivedQuantity: 8,
          previouslyReceived: 0,
          condition: 'good' as const
        }
      ];

      const context = {
        purchaseOrderId: 'po-1',
        receivedBy: 'user-2',
        receivedDate: new Date()
      };

      const result = PurchaseOrderValidationService.validateReceiving(
        mockPO,
        receivingItems,
        context
      );
      
      expect(result.isValid).toBe(true);
    });

    it('should reject receiving for incorrect PO status', () => {
      const receivingItems = [
        {
          productId: 'prod-1',
          orderedQuantity: 10,
          receivedQuantity: 8,
          previouslyReceived: 0,
          condition: 'good' as const
        }
      ];

      const context = {
        purchaseOrderId: 'po-1',
        receivedBy: 'user-2',
        receivedDate: new Date()
      };

      const result = PurchaseOrderValidationService.validateReceiving(
        { ...mockPO, status: 'draft' },
        receivingItems,
        context
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_RECEIVING_STATUS')).toBe(true);
    });

    it('should reject over-receiving when not allowed', () => {
      const receivingItems = [
        {
          productId: 'prod-1',
          orderedQuantity: 10,
          receivedQuantity: 15, // Over-receiving
          previouslyReceived: 0,
          condition: 'good' as const
        }
      ];

      const context = {
        purchaseOrderId: 'po-1',
        receivedBy: 'user-2',
        receivedDate: new Date(),
        allowOverReceiving: false
      };

      const result = PurchaseOrderValidationService.validateReceiving(
        mockPO,
        receivingItems,
        context
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'OVER_RECEIVING')).toBe(true);
    });

    it('should warn about over-receiving when tolerance is exceeded', () => {
      const receivingItems = [
        {
          productId: 'prod-1',
          orderedQuantity: 10,
          receivedQuantity: 15, // 50% over
          previouslyReceived: 0,
          condition: 'good' as const
        }
      ];

      const context = {
        purchaseOrderId: 'po-1',
        receivedBy: 'user-2',
        receivedDate: new Date(),
        allowOverReceiving: true,
        tolerancePercentage: 10 // Only allow 10% over
      };

      const result = PurchaseOrderValidationService.validateReceiving(
        mockPO,
        receivingItems,
        context
      );
      
      expect(result.warnings.some(w => w.code === 'OVER_RECEIVING_TOLERANCE_EXCEEDED')).toBe(true);
    });

    it('should reject expired products', () => {
      const receivingItems = [
        {
          productId: 'prod-1',
          orderedQuantity: 10,
          receivedQuantity: 8,
          previouslyReceived: 0,
          condition: 'good' as const,
          expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        }
      ];

      const context = {
        purchaseOrderId: 'po-1',
        receivedBy: 'user-2',
        receivedDate: new Date()
      };

      const result = PurchaseOrderValidationService.validateReceiving(
        mockPO,
        receivingItems,
        context
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'EXPIRED_PRODUCT')).toBe(true);
    });

    it('should warn about near-expiry products', () => {
      const receivingItems = [
        {
          productId: 'prod-1',
          orderedQuantity: 10,
          receivedQuantity: 8,
          previouslyReceived: 0,
          condition: 'good' as const,
          expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
        }
      ];

      const context = {
        purchaseOrderId: 'po-1',
        receivedBy: 'user-2',
        receivedDate: new Date()
      };

      const result = PurchaseOrderValidationService.validateReceiving(
        mockPO,
        receivingItems,
        context
      );
      
      expect(result.warnings.some(w => w.code === 'NEAR_EXPIRY_PRODUCT')).toBe(true);
    });

    it('should warn about damaged goods', () => {
      const receivingItems = [
        {
          productId: 'prod-1',
          orderedQuantity: 10,
          receivedQuantity: 8,
          previouslyReceived: 0,
          condition: 'damaged' as const
        }
      ];

      const context = {
        purchaseOrderId: 'po-1',
        receivedBy: 'user-2',
        receivedDate: new Date()
      };

      const result = PurchaseOrderValidationService.validateReceiving(
        mockPO,
        receivingItems,
        context
      );
      
      expect(result.warnings.some(w => w.code === 'DAMAGED_GOODS')).toBe(true);
    });
  });

  describe('validateApproval', () => {
    const mockPO: PurchaseOrder = {
      id: 'po-1',
      poNumber: 'PO-2024-000001',
      supplierId: 'supplier-1',
      status: 'pending_approval',
      total: 30000,
      items: [],
      orderDate: new Date().toISOString(),
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should pass validation for valid approval', () => {
      const result = PurchaseOrderValidationService.validateApproval(
        mockPO,
        'admin',
        'user-2' // Different from creator
      );
      
      expect(result.isValid).toBe(true);
    });

    it('should reject approval of already approved order', () => {
      const result = PurchaseOrderValidationService.validateApproval(
        { ...mockPO, status: 'approved' },
        'admin',
        'user-2'
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'ALREADY_APPROVED')).toBe(true);
    });

    it('should reject approval if not in pending_approval status', () => {
      const result = PurchaseOrderValidationService.validateApproval(
        { ...mockPO, status: 'draft' },
        'admin',
        'user-2'
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NOT_PENDING_APPROVAL')).toBe(true);
    });

    it('should reject self-approval for non-admin', () => {
      const result = PurchaseOrderValidationService.validateApproval(
        mockPO,
        'manager',
        'user-1' // Same as creator
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'SELF_APPROVAL_NOT_ALLOWED')).toBe(true);
    });

    it('should warn about self-approval for admin', () => {
      const result = PurchaseOrderValidationService.validateApproval(
        mockPO,
        'admin',
        'user-1' // Same as creator
      );
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'SELF_APPROVAL_WARNING')).toBe(true);
    });
  });

  describe('validateApprovalAmount', () => {
    it('should pass validation for amounts within limits', () => {
      const testCases = [
        { amount: 3000, role: 'employee' as UserRole },
        { amount: 10000, role: 'accountant' as UserRole },
        { amount: 40000, role: 'manager' as UserRole },
        { amount: 100000, role: 'admin' as UserRole }
      ];

      testCases.forEach(testCase => {
        const result = PurchaseOrderValidationService.validateApprovalAmount(
          testCase.amount,
          testCase.role
        );
        
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject amounts exceeding limits', () => {
      const testCases = [
        { amount: 6000, role: 'employee' as UserRole },
        { amount: 20000, role: 'accountant' as UserRole },
        { amount: 60000, role: 'manager' as UserRole }
      ];

      testCases.forEach(testCase => {
        const result = PurchaseOrderValidationService.validateApprovalAmount(
          testCase.amount,
          testCase.role
        );
        
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'APPROVAL_LIMIT_EXCEEDED')).toBe(true);
      });
    });

    it('should warn when approaching limits', () => {
      const testCases = [
        { amount: 4500, role: 'employee' as UserRole, limit: 5000 },
        { amount: 45000, role: 'manager' as UserRole, limit: 50000 }
      ];

      testCases.forEach(testCase => {
        const result = PurchaseOrderValidationService.validateApprovalAmount(
          testCase.amount,
          testCase.role
        );
        
        expect(result.warnings.some(w => w.code === 'APPROACHING_APPROVAL_LIMIT')).toBe(true);
      });
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with suggestions', () => {
      const error = {
        code: 'INVALID_QUANTITY',
        message: 'Quantity must be positive',
        field: 'quantity',
        severity: 'error' as const,
        suggestions: ['Enter a positive number', 'Remove item if not needed']
      };

      const formatted = PurchaseOrderValidationService.formatErrorMessage(error);
      
      expect(formatted).toContain('Quantity must be positive');
      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('• Enter a positive number');
      expect(formatted).toContain('• Remove item if not needed');
    });

    it('should format error message without suggestions', () => {
      const error = {
        code: 'INVALID_QUANTITY',
        message: 'Quantity must be positive',
        field: 'quantity',
        severity: 'error' as const,
        suggestions: []
      };

      const formatted = PurchaseOrderValidationService.formatErrorMessage(error);
      
      expect(formatted).toBe('Quantity must be positive');
      expect(formatted).not.toContain('Suggestions:');
    });
  });

  describe('groupErrorsBySeverity', () => {
    it('should group errors by severity correctly', () => {
      const errors = [
        { code: 'ERROR1', message: 'Error 1', severity: 'error' as const, suggestions: [] },
        { code: 'WARN1', message: 'Warning 1', severity: 'warning' as const, suggestions: [] },
        { code: 'ERROR2', message: 'Error 2', severity: 'error' as const, suggestions: [] },
        { code: 'INFO1', message: 'Info 1', severity: 'info' as const, suggestions: [] }
      ];

      const grouped = PurchaseOrderValidationService.groupErrorsBySeverity(errors);
      
      expect(grouped.errors).toHaveLength(2);
      expect(grouped.warnings).toHaveLength(1);
      expect(grouped.info).toHaveLength(1);
    });
  });
});