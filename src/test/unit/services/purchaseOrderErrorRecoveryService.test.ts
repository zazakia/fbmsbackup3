import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PurchaseOrderErrorRecoveryService } from '../../../services/purchaseOrderErrorRecoveryService';
import { SystemError } from '../../../services/errorHandlingService';
import { PurchaseOrderValidationError } from '../../../services/purchaseOrderValidationService';

// Mock the AuditService
vi.mock('../../../services/auditService', () => ({
  AuditService: {
    logPurchaseOrderAction: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('PurchaseOrderErrorRecoveryService', () => {
  
  const mockRecoveryContext = {
    operationType: 'receiving' as const,
    purchaseOrderId: 'po-1',
    userId: 'user-1',
    timestamp: new Date(),
    attemptNumber: 1,
    maxRetries: 3,
    originalData: {
      receivingItems: [
        {
          productId: 'prod-1',
          orderedQuantity: 10,
          receivedQuantity: 8,
          previouslyReceived: 0
        }
      ],
      purchaseOrder: {
        id: 'po-1',
        items: [
          {
            productId: 'prod-1',
            productName: 'Test Product',
            quantity: 10
          }
        ]
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleReceivingFailure', () => {
    it('should handle database error with retry strategy', async () => {
      const databaseError: SystemError = {
        code: 'DATABASE_ERROR',
        message: 'Connection timeout',
        details: 'Database connection failed'
      };

      const result = await PurchaseOrderErrorRecoveryService.handleReceivingFailure(
        databaseError,
        mockRecoveryContext,
        mockRecoveryContext.originalData
      );

      expect(result.success).toBe(true);
      expect(result.recoveryAction.type).toBe('retry_operation');
      expect(result.requiresManualIntervention).toBe(false);
    });

    it('should handle validation error with manual intervention', async () => {
      const validationError: PurchaseOrderValidationError = {
        code: 'OVER_RECEIVING',
        message: 'Received quantity exceeds ordered quantity',
        severity: 'error',
        suggestions: ['Reduce quantity', 'Check supplier delivery']
      };

      const result = await PurchaseOrderErrorRecoveryService.handleReceivingFailure(
        validationError,
        mockRecoveryContext,
        mockRecoveryContext.originalData
      );

      expect(result.requiresManualIntervention).toBe(false); // First action should be partial recovery
      expect(result.recoveryAction.type).toBe('partial_recovery');
    });

    it('should return manual intervention for unknown error types', async () => {
      const unknownError: SystemError = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown system error'
      };

      const result = await PurchaseOrderErrorRecoveryService.handleReceivingFailure(
        unknownError,
        mockRecoveryContext,
        mockRecoveryContext.originalData
      );

      expect(result.success).toBe(false);
      expect(result.requiresManualIntervention).toBe(true);
      expect(result.recoveryAction.type).toBe('manual_intervention');
    });

    it('should reject recovery when max retries exceeded', async () => {
      const databaseError: SystemError = {
        code: 'DATABASE_ERROR',
        message: 'Connection timeout'
      };

      const contextWithMaxRetries = {
        ...mockRecoveryContext,
        attemptNumber: 5, // Exceeds max retries
        maxRetries: 3
      };

      const result = await PurchaseOrderErrorRecoveryService.handleReceivingFailure(
        databaseError,
        contextWithMaxRetries,
        mockRecoveryContext.originalData
      );

      expect(result.success).toBe(false);
      expect(result.requiresManualIntervention).toBe(true);
      expect(result.message).toContain('Operation failed after');
    });

    it('should handle permission errors appropriately', async () => {
      const permissionError: PurchaseOrderValidationError = {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'User lacks required permissions',
        severity: 'error',
        suggestions: ['Contact administrator', 'Request permissions']
      };

      const result = await PurchaseOrderErrorRecoveryService.handleReceivingFailure(
        permissionError,
        mockRecoveryContext,
        mockRecoveryContext.originalData
      );

      expect(result.requiresManualIntervention).toBe(true);
      expect(result.recoveryAction.type).toBe('manual_intervention');
    });
  });

  describe('getAvailableRecoveryActions', () => {
    it('should return retry actions for database errors', () => {
      const databaseError: SystemError = {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed'
      };

      const actions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(databaseError);

      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe('retry_operation');
      expect(actions[1].type).toBe('queue_for_later');
    });

    it('should return partial recovery actions for validation errors', () => {
      const validationError: PurchaseOrderValidationError = {
        code: 'OVER_RECEIVING',
        message: 'Over-receiving detected',
        severity: 'error',
        suggestions: []
      };

      const actions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(validationError);

      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe('partial_recovery');
      expect(actions[1].type).toBe('manual_intervention');
    });

    it('should return manual intervention for unknown errors', () => {
      const unknownError: SystemError = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error'
      };

      const actions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(unknownError);

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('manual_intervention');
    });
  });

  describe('canAutoRecover', () => {
    it('should return true for database errors', () => {
      const databaseError: SystemError = {
        code: 'DATABASE_ERROR',
        message: 'Database error'
      };

      const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(databaseError);
      expect(canRecover).toBe(true);
    });

    it('should return false for validation errors', () => {
      const validationError: PurchaseOrderValidationError = {
        code: 'OVER_RECEIVING',
        message: 'Validation error',
        severity: 'error',
        suggestions: []
      };

      const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(validationError);
      expect(canRecover).toBe(false);
    });

    it('should return false for permission errors', () => {
      const permissionError: PurchaseOrderValidationError = {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Permission denied',
        severity: 'error',
        suggestions: []
      };

      const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(permissionError);
      expect(canRecover).toBe(false);
    });

    it('should return true for stock calculation errors', () => {
      const stockError: PurchaseOrderValidationError = {
        code: 'INSUFFICIENT_STOCK',
        message: 'Insufficient stock',
        severity: 'error',
        suggestions: []
      };

      const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(stockError);
      expect(canRecover).toBe(true);
    });

    it('should return false for unknown errors', () => {
      const unknownError: SystemError = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error'
      };

      const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(unknownError);
      expect(canRecover).toBe(false);
    });
  });

  describe('estimateRecoveryTime', () => {
    it('should return time estimate for known errors', () => {
      const databaseError: SystemError = {
        code: 'DATABASE_ERROR',
        message: 'Database error'
      };

      const estimate = PurchaseOrderErrorRecoveryService.estimateRecoveryTime(databaseError);
      expect(estimate).toBe('5-10 seconds');
    });

    it('should return immediate time for partial recovery', () => {
      const validationError: PurchaseOrderValidationError = {
        code: 'OVER_RECEIVING',
        message: 'Over-receiving',
        severity: 'error',
        suggestions: []
      };

      const estimate = PurchaseOrderErrorRecoveryService.estimateRecoveryTime(validationError);
      expect(estimate).toBe('Immediate');
    });

    it('should return unknown for unrecognized errors', () => {
      const unknownError: SystemError = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error'
      };

      const estimate = PurchaseOrderErrorRecoveryService.estimateRecoveryTime(unknownError);
      expect(estimate).toBe('Unknown');
    });
  });

  describe('Recovery Strategy Mapping', () => {
    it('should have appropriate strategies for database errors', () => {
      const databaseErrors = ['DATABASE_ERROR', 'CONNECTION_TIMEOUT', 'DEADLOCK_DETECTED'];
      
      databaseErrors.forEach(errorCode => {
        const error: SystemError = { code: errorCode, message: 'Test error' };
        const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(error);
        const actions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(error);
        
        expect(canRecover).toBe(true);
        expect(actions[0].type).toBe('retry_operation');
      });
    });

    it('should have appropriate strategies for validation errors', () => {
      const validationErrors = ['OVER_RECEIVING', 'INVALID_RECEIVED_QUANTITY', 'PRODUCT_NOT_IN_ORDER'];
      
      validationErrors.forEach(errorCode => {
        const error: PurchaseOrderValidationError = {
          code: errorCode,
          message: 'Test error',
          severity: 'error',
          suggestions: []
        };
        const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(error);
        const actions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(error);
        
        expect(canRecover).toBe(false);
        expect(actions[0].type).toBe('partial_recovery');
      });
    });

    it('should have appropriate strategies for stock errors', () => {
      const stockErrors = ['INSUFFICIENT_STOCK', 'NEGATIVE_STOCK', 'CONCURRENT_MODIFICATION'];
      
      stockErrors.forEach(errorCode => {
        const error: PurchaseOrderValidationError = {
          code: errorCode,
          message: 'Test error',
          severity: 'error',
          suggestions: []
        };
        const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(error);
        const actions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(error);
        
        expect(canRecover).toBe(true);
        expect(actions[0].type).toBe('retry_operation');
      });
    });

    it('should have appropriate strategies for permission errors', () => {
      const permissionErrors = ['INSUFFICIENT_PERMISSIONS', 'APPROVAL_LIMIT_EXCEEDED', 'AUTHENTICATION_REQUIRED'];
      
      permissionErrors.forEach(errorCode => {
        const error: PurchaseOrderValidationError = {
          code: errorCode,
          message: 'Test error',
          severity: 'error',
          suggestions: []
        };
        const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(error);
        const actions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(error);
        
        expect(canRecover).toBe(false);
        expect(actions[0].type).toBe('manual_intervention');
      });
    });

    it('should have appropriate strategies for business rule errors', () => {
      const businessErrors = ['INVALID_STATUS_TRANSITION', 'ALREADY_APPROVED', 'CANNOT_CANCEL_RECEIVED_ORDER'];
      
      businessErrors.forEach(errorCode => {
        const error: PurchaseOrderValidationError = {
          code: errorCode,
          message: 'Test error',
          severity: 'error',
          suggestions: []
        };
        const canRecover = PurchaseOrderErrorRecoveryService.canAutoRecover(error);
        const actions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(error);
        
        expect(canRecover).toBe(true);
        expect(actions[0].type).toBe('rollback_changes');
      });
    });
  });

  describe('Recovery Action Priority', () => {
    it('should prioritize actions correctly for database errors', () => {
      const databaseError: SystemError = {
        code: 'DATABASE_ERROR',
        message: 'Database error'
      };

      const actions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(databaseError);
      
      expect(actions[0].priority).toBe(1);
      expect(actions[0].autoExecute).toBe(true);
      expect(actions[1].priority).toBe(2);
      expect(actions[1].autoExecute).toBe(false);
    });

    it('should set correct auto-execution flags', () => {
      const testCases = [
        { code: 'DATABASE_ERROR', expectedAutoExecute: true },
        { code: 'OVER_RECEIVING', expectedAutoExecute: false },
        { code: 'INSUFFICIENT_PERMISSIONS', expectedAutoExecute: false },
        { code: 'INVALID_STATUS_TRANSITION', expectedAutoExecute: true }
      ];

      testCases.forEach(testCase => {
        const error: SystemError = {
          code: testCase.code,
          message: 'Test error'
        };
        const actions = PurchaseOrderErrorRecoveryService.getAvailableRecoveryActions(error);
        
        expect(actions[0].autoExecute).toBe(testCase.expectedAutoExecute);
      });
    });
  });
});