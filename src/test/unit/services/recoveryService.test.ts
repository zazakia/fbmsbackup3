import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecoveryService } from '../../../services/recoveryService';
import { ErrorHandlingService } from '../../../services/errorHandlingService';
import { createProductMovement } from '../../../api/productHistory';

// Mock dependencies
vi.mock('../../../api/productHistory', () => ({
  createProductMovement: vi.fn()
}));

vi.mock('../../../services/errorHandlingService', () => ({
  ErrorHandlingService: {
    logError: vi.fn(),
    formatDatabaseError: vi.fn(),
    formatBusinessError: vi.fn()
  }
}));

describe('RecoveryService', () => {
  const testProduct = {
    id: 'test-1',
    name: 'Test Product',
    stock: 100
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rollbackMovement', () => {
    it('should create reverse movement successfully', async () => {
      // Mock successful movement creation
      (createProductMovement as any).mockResolvedValue({ error: null });

      const result = await RecoveryService.rollbackMovement(
        testProduct,
        'mov-1',
        10,
        {
          userId: 'user-1',
          referenceId: 'ref-1'
        }
      );

      expect(result).toBe(true);
      expect(createProductMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'test-1',
          type: 'rollback_out',
          quantity: 10,
          referenceType: 'rollback',
          metadata: expect.objectContaining({
            originalMovementId: 'mov-1',
            isRollback: true
          })
        })
      );
    });

    it('should handle failed movement creation', async () => {
      // Mock failed movement creation
      (createProductMovement as any).mockResolvedValue({
        error: new Error('Database error')
      });

      const result = await RecoveryService.rollbackMovement(
        testProduct,
        'mov-1',
        10
      );

      expect(result).toBe(false);
      expect(ErrorHandlingService.logError).toHaveBeenCalled();
    });

    it('should create correct movement type based on stock change', async () => {
      (createProductMovement as any).mockResolvedValue({ error: null });

      // Test positive stock change
      await RecoveryService.rollbackMovement(testProduct, 'mov-1', 10);
      expect(createProductMovement).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'rollback_out' })
      );

      // Test negative stock change
      await RecoveryService.rollbackMovement(testProduct, 'mov-2', -10);
      expect(createProductMovement).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'rollback_in' })
      );
    });
  });

  describe('rollbackTransaction', () => {
    const testOperations = [
      {
        productId: 'test-1',
        movementId: 'mov-1',
        originalStock: 100,
        stockChange: 10,
        userId: 'user-1'
      },
      {
        productId: 'test-2',
        movementId: 'mov-2',
        originalStock: 50,
        stockChange: 5,
        userId: 'user-1'
      }
    ];

    it('should rollback all operations successfully', async () => {
      // Mock successful movement creation
      (createProductMovement as any).mockResolvedValue({ error: null });

      const result = await RecoveryService.rollbackTransaction(testOperations);

      expect(result.success).toBe(true);
      expect(result.rolledBackOperations).toHaveLength(2);
      expect(result.failedOperations).toHaveLength(0);
      expect(createProductMovement).toHaveBeenCalledTimes(2);
    });

    it('should handle partially failed rollback', async () => {
      // Mock first operation success, second failure
      (createProductMovement as any)
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: new Error('Failed') });

      const result = await RecoveryService.rollbackTransaction(testOperations);

      expect(result.success).toBe(false);
      expect(result.rolledBackOperations).toHaveLength(1);
      expect(result.failedOperations).toHaveLength(1);
      expect(result.error).toContain('Failed to rollback 1 operations');
    });

    it('should process operations in reverse order', async () => {
      (createProductMovement as any).mockResolvedValue({ error: null });

      await RecoveryService.rollbackTransaction(testOperations);

      // Verify operations were processed in reverse order
      const calls = (createProductMovement as any).mock.calls;
      expect(calls[0][0].metadata.originalMovementId).toBe('mov-2');
      expect(calls[1][0].metadata.originalMovementId).toBe('mov-1');
    });
  });

  describe('verifyRollback', () => {
    const testOperations = [
      {
        productId: 'test-1',
        movementId: 'mov-1',
        originalStock: 100,
        stockChange: 10
      },
      {
        productId: 'test-2',
        movementId: 'mov-2',
        originalStock: 50,
        stockChange: 5
      }
    ];

    it('should verify successful rollback', async () => {
      const result = {
        success: true,
        rolledBackOperations: testOperations,
        failedOperations: []
      };

      const verified = await RecoveryService.verifyRollback(testOperations, result);
      expect(verified).toBe(true);
    });

    it('should fail verification if any operations failed', async () => {
      const result = {
        success: false,
        rolledBackOperations: [testOperations[0]],
        failedOperations: [testOperations[1]]
      };

      const verified = await RecoveryService.verifyRollback(testOperations, result);
      expect(verified).toBe(false);
    });
  });

  describe('retryFailedRollbacks', () => {
    const failedOperations = [
      {
        productId: 'test-1',
        movementId: 'mov-1',
        originalStock: 100,
        stockChange: 10
      }
    ];

    it('should retry failed operations with backoff', async () => {
      // Mock first attempt fails, second succeeds
      (createProductMovement as any)
        .mockResolvedValueOnce({ error: new Error('Failed') })
        .mockResolvedValueOnce({ error: null });

      const result = await RecoveryService.retryFailedRollbacks(failedOperations, 2);

      expect(result.success).toBe(true);
      expect(result.rolledBackOperations).toHaveLength(1);
      expect(result.failedOperations).toHaveLength(0);
      expect(createProductMovement).toHaveBeenCalledTimes(2);
    });

    it('should call cleanup if retries exhausted', async () => {
      // Mock all attempts fail
      (createProductMovement as any).mockResolvedValue({ error: new Error('Failed') });
      
      const spyCleanup = vi.spyOn(RecoveryService, 'cleanupFailedRollbacks');

      const result = await RecoveryService.retryFailedRollbacks(failedOperations, 2);

      expect(result.success).toBe(false);
      expect(spyCleanup).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        'ALERT: Manual intervention required for failed rollbacks:',
        expect.any(Object)
      );
    });
  });
});