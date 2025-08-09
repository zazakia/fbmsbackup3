import { Product, StockMovementHistory } from '../types/business';
import { createProductMovement } from '../api/productHistory';
import { ErrorHandlingService } from './errorHandlingService';

interface RollbackOperation {
  productId: string;
  movementId: string;
  originalStock: number;
  stockChange: number;
  referenceId?: string;
  userId?: string;
}

interface RollbackResult {
  success: boolean;
  error?: string;
  rolledBackOperations: RollbackOperation[];
  failedOperations: RollbackOperation[];
}

export class RecoveryService {
  // Rollback a single stock movement
  static async rollbackMovement(
    product: Product,
    movementId: string,
    stockChange: number,
    options?: {
      referenceId?: string;
      userId?: string;
      reason?: string;
    }
  ): Promise<boolean> {
    try {
      // Create reverse movement to rollback the change
      const reverseMovement = {
        productId: product.id,
        type: stockChange > 0 ? 'rollback_out' : 'rollback_in',
        quantity: Math.abs(stockChange),
        previousStock: product.stock,
        resultingStock: product.stock - stockChange,
        reason: options?.reason || `Rollback of movement ${movementId}`,
        referenceId: options?.referenceId,
        referenceType: 'rollback',
        userId: options?.userId,
        metadata: {
          originalMovementId: movementId,
          isRollback: true
        }
      };

      // Create the rollback movement record
      const { error } = await createProductMovement(reverseMovement);

      if (error) {
        throw new Error(`Failed to create rollback movement: ${error.message}`);
      }

      return true;
    } catch (error) {
      // Log error and return false
      ErrorHandlingService.logError(
        ErrorHandlingService.formatDatabaseError(error, 'rollback'),
        'high'
      );
      return false;
    }
  }

  // Rollback multiple stock movements in a transaction
  static async rollbackTransaction(
    operations: RollbackOperation[]
  ): Promise<RollbackResult> {
    const rolledBackOperations: RollbackOperation[] = [];
    const failedOperations: RollbackOperation[] = [];

    // Sort operations to rollback in reverse order
    const sortedOperations = [...operations].sort((a, b) => b.movementId.localeCompare(a.movementId));

    for (const operation of sortedOperations) {
      try {
        const product = {
          id: operation.productId,
          stock: operation.originalStock
        } as Product;

        const success = await this.rollbackMovement(
          product,
          operation.movementId,
          operation.stockChange,
          {
            referenceId: operation.referenceId,
            userId: operation.userId,
            reason: `Automatic rollback of failed transaction`
          }
        );

        if (success) {
          rolledBackOperations.push(operation);
        } else {
          failedOperations.push(operation);
        }
      } catch (error) {
        failedOperations.push(operation);
        ErrorHandlingService.logError(
          ErrorHandlingService.formatDatabaseError(error, 'rollback-transaction'),
          'high'
        );
      }
    }

    return {
      success: failedOperations.length === 0,
      error: failedOperations.length > 0 
        ? `Failed to rollback ${failedOperations.length} operations`
        : undefined,
      rolledBackOperations,
      failedOperations
    };
  }

  // Verify rollback success
  static async verifyRollback(
    operations: RollbackOperation[],
    result: RollbackResult
  ): Promise<boolean> {
    // Check if all operations were rolled back
    if (result.failedOperations.length > 0) {
      return false;
    }

    // Verify each rolled back operation
    for (const operation of operations) {
      const matchingRollback = result.rolledBackOperations.find(
        op => op.movementId === operation.movementId
      );

      if (!matchingRollback) {
        return false;
      }
    }

    return true;
  }

  // Clean up failed rollbacks
  static async cleanupFailedRollbacks(
    failedOperations: RollbackOperation[]
  ): Promise<void> {
    if (failedOperations.length === 0) {
      return;
    }

    // Log failed operations for manual review
    ErrorHandlingService.logError(
      ErrorHandlingService.formatBusinessError(
        `Manual intervention required for failed rollbacks`,
        `rollback-cleanup`
      ),
      'high'
    );

    // Create system alert about failed rollbacks
    console.error('ALERT: Manual intervention required for failed rollbacks:', {
      failedOperations,
      timestamp: new Date().toISOString(),
      severity: 'high'
    });
  }

  // Retry failed rollbacks with exponential backoff
  static async retryFailedRollbacks(
    failedOperations: RollbackOperation[],
    maxRetries: number = 3
  ): Promise<RollbackResult> {
    let retryCount = 0;
    let lastResult: RollbackResult = {
      success: false,
      rolledBackOperations: [],
      failedOperations
    };

    while (retryCount < maxRetries && lastResult.failedOperations.length > 0) {
      // Wait with exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, retryCount) * 1000)
      );

      // Retry rollback
      lastResult = await this.rollbackTransaction(lastResult.failedOperations);
      retryCount++;
    }

    // If still have failures after retries, cleanup is needed
    if (lastResult.failedOperations.length > 0) {
      await this.cleanupFailedRollbacks(lastResult.failedOperations);
    }

    return lastResult;
  }
}