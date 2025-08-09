import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceService } from '../../../services/performanceService';
import { ErrorHandlingService } from '../../../services/errorHandlingService';

// Mock ErrorHandlingService
vi.mock('../../../services/errorHandlingService', () => ({
  ErrorHandlingService: {
    logError: vi.fn(),
    formatBusinessError: vi.fn()
  }
}));

describe('PerformanceService', () => {
  const testProduct = {
    id: 'test-1',
    name: 'Test Product',
    stock: 100
  };

  const testMovement = {
    id: 'mov-1',
    productId: 'test-1',
    type: 'sale',
    quantity: 10
  };

  beforeEach(() => {
    PerformanceService.clearCache();
    PerformanceService.clearMetrics();
    PerformanceService.setSimulateFailure(false);
    vi.clearAllMocks();
  });

  describe('Cache Management', () => {
    it('should cache and retrieve products', () => {
      PerformanceService.cacheProduct(testProduct);
      const cached = PerformanceService.getCachedProduct(testProduct.id);
      expect(cached).toEqual(testProduct);
    });

    it('should cache and retrieve movements', () => {
      PerformanceService.cacheMovement(testMovement);
      const cached = PerformanceService.getCachedMovement(testMovement.id);
      expect(cached).toEqual(testMovement);
    });

    it('should clear cache when requested', () => {
      PerformanceService.cacheProduct(testProduct);
      PerformanceService.cacheMovement(testMovement);
      PerformanceService.clearCache();

      expect(PerformanceService.getCachedProduct(testProduct.id)).toBeUndefined();
      expect(PerformanceService.getCachedMovement(testMovement.id)).toBeUndefined();
    });
  });

  describe('Batch Processing', () => {
    it('should process updates in batches', async () => {
      const updates = Array(150).fill(null).map((_, i) => ({
        productId: `prod-${i}`,
        quantity: 10,
        type: 'sale'
      }));

      const result = await PerformanceService.batchProcessStockUpdates(updates);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(150);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle failures in batch processing', async () => {
      // Enable failure simulation
      PerformanceService.setSimulateFailure(true);

      const updates = [
        { productId: 'test-1', quantity: 10, type: 'sale' },
        { productId: 'test-2', quantity: -1, type: 'invalid' }, // Will fail
        { productId: 'test-3', quantity: 5, type: 'sale' }
      ];

      const result = await PerformanceService.batchProcessStockUpdates(updates);

      expect(result.success).toBe(false);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Invalid quantity');
    });
  });

  describe('Performance Monitoring', () => {
    it('should record and retrieve operation metrics', async () => {
      // Record a test operation
      PerformanceService.recordOperationDuration('testOperation', 1500);
      PerformanceService.recordOperationDuration('testOperation', 2500);

      const metrics = PerformanceService.getOperationMetrics('testOperation');
      
      expect(metrics.count).toBe(2);
      expect(metrics.average).toBe(2000);
      expect(metrics.min).toBe(1500);
      expect(metrics.max).toBe(2500);
    });

    it('should analyze performance and provide recommendations', async () => {
      // Record slow operation
      PerformanceService.recordOperationDuration('testOperation', 2500);

      const analysis = PerformanceService.analyzePerformance('testOperation');

      expect(analysis.status).toBe('critical');
      expect(analysis.recommendations).toContain('Consider optimizing the operation for better performance');
      expect(analysis.metrics).toBeDefined();
    });

    it('should detect when cache is nearly full', () => {
      // Fill cache close to capacity
      for (let i = 0; i < 900; i++) {
        PerformanceService.cacheProduct({
          id: `prod-${i}`,
          name: `Product ${i}`,
          stock: 100
        });
      }

      // Record some metrics
      PerformanceService.recordOperationDuration('testOperation', 1000);

      const analysis = PerformanceService.analyzePerformance('testOperation');
      
      expect(analysis.status).toBe('warning');
      expect(analysis.recommendations).toContain('Cache is nearly full, consider adjusting cache size');
    });
  });

  describe('Error Handling', () => {
    it('should log errors during batch processing', async () => {
      // Force an error in batch processing
      const error = new Error('Batch processing error');
      const mockBatchProcess = vi.spyOn(Promise, 'all');
      mockBatchProcess.mockRejectedValueOnce(error);

      try {
        await PerformanceService.batchProcessStockUpdates([
          { productId: 'test-1', quantity: 10, type: 'sale' }
        ]);
      } catch (e) {
        expect(ErrorHandlingService.logError).toHaveBeenCalled();
        expect(ErrorHandlingService.formatBusinessError).toHaveBeenCalledWith(
          'Batch processing failed',
          'performance'
        );
      }

      mockBatchProcess.mockRestore();
    });
  });
});