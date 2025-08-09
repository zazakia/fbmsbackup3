import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PurchaseOrderValidationService } from '../../../services/purchaseOrderValidationService';
import { PurchaseOrderErrorRecoveryService } from '../../../services/purchaseOrderErrorRecoveryService';
import { PurchaseOrderErrorMessages } from '../../../utils/purchaseOrderErrorMessages';
import { PurchaseOrder, PurchaseOrderItem, Product } from '../../../types/business';
import { useBusinessStore } from '../../../store/businessStore';

// Mock the business store
vi.mock('../../../store/businessStore', () => ({
  useBusinessStore: {
    getState: vi.fn(),
    setState: vi.fn()
  }
}));

// Mock audit service for integration tests
vi.mock('../../../services/auditService', () => ({
  AuditService: {
    logPurchaseOrderAction: vi.fn().mockResolvedValue(undefined),
    logStockMovement: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Purchase Order Error Handling Integration Tests', () => {
  
  let mockBusinessStore: any;
  let testProducts: Product[];
  let testPurchaseOrder: PurchaseOrder;

  beforeEach(() => {
    // Setup mock business store
    testProducts = [
      {
        id: 'prod-1',
        name: 'Widget A',
        sku: 'WID-001',
        price: 100,
        cost: 60,
        stock: 50,
        category: 'Widgets',
        unit: 'piece',
        minStock: 10,
        maxStock: 200,
        isActive: true,
        description: 'Test Widget A',
        barcode: 'WID001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'prod-2',
        name: 'Widget B',
        sku: 'WID-002',
        price: 200,
        cost: 120,
        stock: 25,
        category: 'Widgets',
        unit: 'piece',
        minStock: 5,
        maxStock: 100,
        isActive: true,
        description: 'Test Widget B',
        barcode: 'WID002',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    testPurchaseOrder = {
      id: 'po-1',
      poNumber: 'PO-2024-000001',
      supplierId: 'supplier-1',
      supplierName: 'Test Supplier',
      status: 'approved',
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Widget A',
          quantity: 20,
          unitPrice: 60,
          total: 1200
        } as PurchaseOrderItem,
        {
          id: 'item-2',
          productId: 'prod-2',
          productName: 'Widget B',
          quantity: 10,
          unitPrice: 120,
          total: 1200
        } as PurchaseOrderItem
      ],
      subtotal: 2400,
      tax: 0,
      total: 2400,
      notes: 'Test purchase order',
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockBusinessStore = {
      products: testProducts,
      purchaseOrders: [testPurchaseOrder],
      addPurchaseOrder: vi.fn(),
      updatePurchaseOrder: vi.fn(),
      updateProductStock: vi.fn(),
      addStockMovement: vi.fn()
    };

    (useBusinessStore.getState as any).mockReturnValue(mockBusinessStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Purchase Order Creation Error Handling', () => {
    it('should handle complete purchase order creation workflow with validation errors', async () => {
      // Step 1: Try to create PO with validation errors
      const invalidPO: Partial<PurchaseOrder> = {
        // Missing supplierId - should trigger SUPPLIER_REQUIRED error
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Widget A',
            quantity: -5, // Invalid quantity - should trigger INVALID_QUANTITY error
            unitPrice: 0, // Invalid price - should trigger INVALID_UNIT_PRICE error
            total: 0
          } as PurchaseOrderItem
        ],
        total: 100 // Wrong total - should trigger TOTAL_MISMATCH error
      };

      // Step 2: Validate creation
      const validationResult = PurchaseOrderValidationService.validatePurchaseOrderCreation(invalidPO);
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);

      // Step 3: Format errors for user display
      const errorMessages = validationResult.errors.map(error => 
        PurchaseOrderErrorMessages.getValidationErrorMessage(error)
      );

      expect(errorMessages.some(msg => msg.title === 'Supplier Required')).toBe(true);
      expect(errorMessages.some(msg => msg.title === 'Invalid Quantity')).toBe(true);
      expect(errorMessages.some(msg => msg.title === 'Invalid Price')).toBe(true);

      // Step 4: Multiple error formatting
      const multipleErrorMessage = PurchaseOrderErrorMessages.formatMultipleErrors(
        validationResult.errors
      );

      expect(multipleErrorMessage.title).toBe('Multiple Issues Found');
      expect(multipleErrorMessage.severity).toBe('error');
      expect(multipleErrorMessage.message).toContain('error');

      // Step 5: Get recovery instructions
      const firstError = validationResult.errors[0];
      const recoveryInstructions = PurchaseOrderErrorMessages.getRecoveryInstructions(firstError);
      
      expect(recoveryInstructions).toBeInstanceOf(Array);
      expect(recoveryInstructions.length).toBeGreaterThan(0);
    });

    it('should handle warnings and allow proceeding with caution', () => {
      // Create PO with warnings but no errors
      const warningPO: Partial<PurchaseOrder> = {
        supplierId: 'supplier-1',
        poNumber: 'WRONG-FORMAT', // Should trigger format warning
        orderDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Future date warning
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Widget A',
            quantity: 15000, // Large quantity warning
            unitPrice: 100,
            total: 1500000 // High value warning
          } as PurchaseOrderItem
        ],
        total: 1500000
      };

      const validationResult = PurchaseOrderValidationService.validatePurchaseOrderCreation(warningPO);
      
      expect(validationResult.isValid).toBe(true); // No errors, only warnings
      expect(validationResult.warnings.length).toBeGreaterThan(0);
      expect(validationResult.canProceedWithWarnings).toBe(true);

      // Format warnings for user display
      const warningMessages = validationResult.warnings.map(warning => 
        PurchaseOrderErrorMessages.getValidationErrorMessage(warning)
      );

      expect(warningMessages.some(msg => msg.severity === 'warning')).toBe(true);
    });
  });

  describe('Purchase Order Approval Error Handling Integration', () => {
    it('should handle approval workflow with role-based permission errors', () => {
      // Test cashier approval (should fail)
      const cashierApproval = PurchaseOrderValidationService.validateApproval(
        { ...testPurchaseOrder, status: 'pending_approval', total: 1000 },
        'cashier',
        'approver-user'
      );
      expect(cashierApproval.isValid).toBe(false);
      expect(cashierApproval.errors.length).toBeGreaterThan(0);

      // Test manager with exceeding amount (should fail)
      const managerApproval = PurchaseOrderValidationService.validateApproval(
        { ...testPurchaseOrder, status: 'pending_approval', total: 60000 },
        'manager',
        'approver-user'
      );
      expect(managerApproval.isValid).toBe(false);
      expect(managerApproval.errors.length).toBeGreaterThan(0);

      // Test admin approval (should pass)
      const adminApproval = PurchaseOrderValidationService.validateApproval(
        { ...testPurchaseOrder, status: 'pending_approval', total: 100000 },
        'admin',
        'approver-user'
      );
      expect(adminApproval.isValid).toBe(true);
    });

    it('should handle self-approval scenarios', () => {
      const selfApprovalScenarios = [
        {
          role: 'manager' as const,
          createdBy: 'user-1',
          approvingBy: 'user-1', // Same user
          shouldFail: true,
          expectedError: 'SELF_APPROVAL_NOT_ALLOWED'
        },
        {
          role: 'admin' as const,
          createdBy: 'user-1',
          approvingBy: 'user-1', // Same user, but admin
          shouldFail: false, // Admin can self-approve but gets warning
          expectedWarning: 'SELF_APPROVAL_WARNING'
        }
      ];

      selfApprovalScenarios.forEach(scenario => {
        const approvalPO = {
          ...testPurchaseOrder,
          status: 'pending_approval',
          createdBy: scenario.createdBy
        };

        const validationResult = PurchaseOrderValidationService.validateApproval(
          approvalPO,
          scenario.role,
          scenario.approvingBy
        );

        if (scenario.shouldFail) {
          expect(validationResult.isValid).toBe(false);
          expect(validationResult.errors.some(e => e.code === scenario.expectedError)).toBe(true);
        } else {
          expect(validationResult.isValid).toBe(true);
          if (scenario.expectedWarning) {
            expect(validationResult.warnings.some(w => w.code === scenario.expectedWarning)).toBe(true);
          }
        }
      });
    });
  });

  describe('Purchase Order Receiving Error Handling Integration', () => {
    it('should handle complete receiving workflow with various error conditions', async () => {
      // Test scenario: Receiving with multiple error conditions
      const receivingItems = [
        {
          productId: 'prod-1',
          orderedQuantity: 20,
          receivedQuantity: 25, // Over-receiving
          previouslyReceived: 0,
          condition: 'good' as const
        },
        {
          productId: 'prod-2',
          orderedQuantity: 10,
          receivedQuantity: -5, // Invalid quantity
          previouslyReceived: 0,
          condition: 'good' as const
        },
        {
          productId: 'prod-3', // Product not in order
          orderedQuantity: 0,
          receivedQuantity: 5,
          previouslyReceived: 0,
          condition: 'good' as const
        }
      ];

      const receivingContext = {
        purchaseOrderId: 'po-1',
        receivedBy: 'user-2',
        receivedDate: new Date(),
        allowOverReceiving: false
      };

      // Step 1: Validate receiving
      const validationResult = PurchaseOrderValidationService.validateReceiving(
        testPurchaseOrder,
        receivingItems,
        receivingContext
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);

      // Step 2: Check for specific error codes
      expect(validationResult.errors.some(e => e.code === 'OVER_RECEIVING')).toBe(true);
      expect(validationResult.errors.some(e => e.code === 'INVALID_RECEIVED_QUANTITY')).toBe(true);
      expect(validationResult.errors.some(e => e.code === 'PRODUCT_NOT_IN_ORDER')).toBe(true);

      // Step 3: Test error recovery
      const mockError = {
        code: 'OVER_RECEIVING',
        message: 'Over-receiving detected',
        severity: 'error' as const,
        suggestions: ['Reduce quantity']
      };

      const recoveryContext = {
        operationType: 'receiving' as const,
        purchaseOrderId: 'po-1',
        userId: 'user-2',
        timestamp: new Date(),
        attemptNumber: 1,
        maxRetries: 3,
        originalData: { receivingItems, purchaseOrder: testPurchaseOrder }
      };

      const recoveryResult = await PurchaseOrderErrorRecoveryService.handleReceivingFailure(
        mockError,
        recoveryContext,
        recoveryContext.originalData
      );

      expect(recoveryResult).toBeDefined();
      expect(recoveryResult.recoveryAction.type).toBe('partial_recovery');

      // Step 4: Format error messages for user
      const errorMessages = validationResult.errors.map(error => 
        PurchaseOrderErrorMessages.getValidationErrorMessage(
          error,
          { 
            productName: receivingItems.find(item => item.productId === 'prod-1')?.productId,
            quantity: 25,
            remainingQuantity: 20
          }
        )
      );

      expect(errorMessages.some(msg => msg.title === 'Over-Receiving Detected')).toBe(true);
    });

    it('should handle partial receiving with tolerance settings', async () => {
      // Test over-receiving with tolerance
      const receivingItems = [
        {
          productId: 'prod-1',
          orderedQuantity: 20,
          receivedQuantity: 22, // 10% over (within tolerance)
          previouslyReceived: 0,
          condition: 'good' as const
        },
        {
          productId: 'prod-2',
          orderedQuantity: 10,
          receivedQuantity: 15, // 50% over (exceeds tolerance)
          previouslyReceived: 0,
          condition: 'good' as const
        }
      ];

      const receivingContext = {
        purchaseOrderId: 'po-1',
        receivedBy: 'user-2',
        receivedDate: new Date(),
        allowOverReceiving: true,
        tolerancePercentage: 20 // Allow 20% over-receiving
      };

      const validationResult = PurchaseOrderValidationService.validateReceiving(
        testPurchaseOrder,
        receivingItems,
        receivingContext
      );

      // Should pass validation but have warnings for exceeding tolerance
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.warnings.some(w => w.code === 'OVER_RECEIVING_TOLERANCE_EXCEEDED')).toBe(true);
    });

    it('should handle damaged and expired products during receiving', () => {
      const receivingItems = [
        {
          productId: 'prod-1',
          orderedQuantity: 20,
          receivedQuantity: 15,
          previouslyReceived: 0,
          condition: 'damaged' as const // Should trigger warning
        },
        {
          productId: 'prod-2',
          orderedQuantity: 10,
          receivedQuantity: 8,
          previouslyReceived: 0,
          condition: 'good' as const,
          expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired - should trigger error
        }
      ];

      const receivingContext = {
        purchaseOrderId: 'po-1',
        receivedBy: 'user-2',
        receivedDate: new Date()
      };

      const validationResult = PurchaseOrderValidationService.validateReceiving(
        testPurchaseOrder,
        receivingItems,
        receivingContext
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.code === 'EXPIRED_PRODUCT')).toBe(true);
      expect(validationResult.warnings.some(w => w.code === 'DAMAGED_GOODS')).toBe(true);
    });
  });

  describe('Error Recovery Integration Tests', () => {
    it('should handle database error recovery with retry mechanism', async () => {
      const databaseError = {
        code: 'DATABASE_ERROR',
        message: 'Database connection timeout'
      };

      const recoveryContext = {
        operationType: 'receiving' as const,
        purchaseOrderId: 'po-1',
        userId: 'user-1',
        timestamp: new Date(),
        attemptNumber: 1,
        maxRetries: 3
      };

      // Test first attempt
      const firstAttempt = await PurchaseOrderErrorRecoveryService.handleReceivingFailure(
        databaseError,
        recoveryContext,
        {}
      );

      expect(firstAttempt.success).toBe(true);
      expect(firstAttempt.recoveryAction.type).toBe('retry_operation');
      expect(firstAttempt.requiresManualIntervention).toBe(false);

      // Test max retries exceeded
      const maxRetriesContext = {
        ...recoveryContext,
        attemptNumber: 4, // Exceeds max retries
        maxRetries: 3
      };

      const maxRetriesAttempt = await PurchaseOrderErrorRecoveryService.handleReceivingFailure(
        databaseError,
        maxRetriesContext,
        {}
      );

      expect(maxRetriesAttempt.success).toBe(false);
      expect(maxRetriesAttempt.requiresManualIntervention).toBe(true);
    });

    it('should provide comprehensive error recovery information', async () => {
      const testErrors = [
        { code: 'DATABASE_ERROR', canAutoRecover: true, estimatedTime: '5-10 seconds' },
        { code: 'OVER_RECEIVING', canAutoRecover: false, estimatedTime: 'Immediate' },
        { code: 'INSUFFICIENT_PERMISSIONS', canAutoRecover: false, estimatedTime: '10-30 minutes' },
        { code: 'INSUFFICIENT_STOCK', canAutoRecover: true, estimatedTime: '2-5 seconds' }
      ];

      testErrors.forEach(testError => {
        const error = { code: testError.code, message: 'Test error' };
        
        const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(error as any);
        const estimatedTime = PurchaseOrderErrorRecoveryService.estimateRecoveryTime(error as any);
        const availableActions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(error as any);

        expect(canRecover).toBe(testError.canAutoRecover);
        expect(estimatedTime).toBe(testError.estimatedTime);
        expect(availableActions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Complete Error Handling Workflow Integration', () => {
    it('should handle complete purchase order lifecycle with error recovery', async () => {
      // Scenario: Complete workflow from creation to receiving with errors and recovery
      
      // Step 1: Create PO with validation errors
      const invalidPO = {
        supplierId: 'supplier-1',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Widget A',
            quantity: 0, // Invalid
            unitPrice: 100,
            total: 0
          } as PurchaseOrderItem
        ],
        total: 100
      };

      const creationValidation = PurchaseOrderValidationService.validatePurchaseOrderCreation(invalidPO);
      expect(creationValidation.isValid).toBe(false);

      // Step 2: Fix validation errors and create valid PO
      const validPO = {
        ...invalidPO,
        items: [
          {
            ...invalidPO.items[0],
            quantity: 20,
            total: 2000
          } as PurchaseOrderItem
        ],
        total: 2000
      };

      const correctedValidation = PurchaseOrderValidationService.validatePurchaseOrderCreation(validPO);
      expect(correctedValidation.isValid).toBe(true);

      // Step 3: Try to approve with insufficient permissions
      const cashierApproval = PurchaseOrderValidationService.validateApproval(
        { ...testPurchaseOrder, status: 'pending_approval', total: 2000 },
        'cashier',
        'cashier-user'
      );

      expect(cashierApproval.isValid).toBe(false);
      expect(cashierApproval.errors.some(e => e.code === 'NO_APPROVAL_PERMISSION')).toBe(true);

      // Step 4: Approve with proper permissions
      const adminApproval = PurchaseOrderValidationService.validateApproval(
        { ...testPurchaseOrder, status: 'pending_approval', total: 2000 },
        'admin',
        'admin-user'
      );

      expect(adminApproval.isValid).toBe(true);

      // Step 5: Try receiving with errors
      const invalidReceiving = [
        {
          productId: 'prod-1',
          orderedQuantity: 20,
          receivedQuantity: 30, // Over-receiving
          previouslyReceived: 0,
          condition: 'good' as const
        }
      ];

      const receivingValidation = PurchaseOrderValidationService.validateReceiving(
        { ...testPurchaseOrder, status: 'approved' },
        invalidReceiving,
        {
          purchaseOrderId: 'po-1',
          receivedBy: 'warehouse-user',
          receivedDate: new Date(),
          allowOverReceiving: false
        }
      );

      expect(receivingValidation.isValid).toBe(false);

      // Step 6: Handle receiving error with recovery
      const overReceivingError = {
        code: 'OVER_RECEIVING',
        message: 'Over-receiving detected',
        severity: 'error' as const,
        suggestions: ['Reduce quantity']
      };

      const recoveryResult = await PurchaseOrderErrorRecoveryService.handleReceivingFailure(
        overReceivingError,
        {
          operationType: 'receiving' as const,
          purchaseOrderId: 'po-1',
          userId: 'warehouse-user',
          timestamp: new Date(),
          attemptNumber: 1,
          maxRetries: 3,
          originalData: { receivingItems: invalidReceiving, purchaseOrder: testPurchaseOrder }
        },
        { receivingItems: invalidReceiving }
      );

      expect(recoveryResult.recoveryAction.type).toBe('partial_recovery');

      // Step 7: Complete with corrected receiving
      const correctedReceiving = [
        {
          productId: 'prod-1',
          orderedQuantity: 20,
          receivedQuantity: 18, // Within limits
          previouslyReceived: 0,
          condition: 'good' as const
        }
      ];

      const finalReceivingValidation = PurchaseOrderValidationService.validateReceiving(
        { ...testPurchaseOrder, status: 'approved' },
        correctedReceiving,
        {
          purchaseOrderId: 'po-1',
          receivedBy: 'warehouse-user',
          receivedDate: new Date()
        }
      );

      expect(finalReceivingValidation.isValid).toBe(true);
    });

    it('should provide contextual error messages throughout the workflow', () => {
      // Test contextual error messaging for different user roles and operations
      const testCases = [
        {
          error: {
            code: 'INSUFFICIENT_APPROVAL_PERMISSION',
            message: 'No approval permission',
            severity: 'error' as const,
            suggestions: []
          },
          userRole: 'employee',
          expectedSuggestions: ['Ask your manager to review and approve this order']
        },
        {
          error: {
            code: 'OVER_RECEIVING',
            message: 'Over-receiving detected',
            severity: 'error' as const,
            suggestions: []
          },
          userRole: 'employee',
          operationType: 'receiving',
          expectedSuggestions: ['Check with warehouse supervisor before proceeding']
        }
      ];

      testCases.forEach(testCase => {
        const contextualSuggestions = PurchaseOrderErrorMessages.getContextualSuggestions(
          testCase.error,
          testCase.userRole,
          { operationType: testCase.operationType }
        );

        testCase.expectedSuggestions.forEach(expectedSuggestion => {
          expect(contextualSuggestions).toContain(expectedSuggestion);
        });
      });
    });
  });
});