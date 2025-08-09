import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandlingService } from '../../../services/errorHandlingService';
import { StockValidationError } from '../../../utils/stockValidation';

describe('ErrorHandlingService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  describe('formatValidationError', () => {
    it('should format insufficient stock error correctly', () => {
      const errors: StockValidationError[] = [{
        code: 'INSUFFICIENT_STOCK',
        message: 'Not enough stock',
        productId: 'test-1',
        productName: 'Test Product',
        requestedQuantity: 10,
        availableStock: 5,
        suggestions: ['Reduce quantity']
      }];

      const result = ErrorHandlingService.formatValidationError(errors);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('Insufficient stock for "Test Product"');
      expect(result.message).toContain('Available: 5');
      expect(result.message).toContain('Requested: 10');
    });

    it('should combine multiple validation errors', () => {
      const errors: StockValidationError[] = [
        {
          code: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock',
          productId: 'test-1',
          productName: 'Product 1',
          requestedQuantity: 10,
          availableStock: 5,
          suggestions: ['Reduce quantity']
        },
        {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found',
          productId: 'test-2',
          productName: 'Product 2',
          requestedQuantity: 1,
          availableStock: 0,
          suggestions: ['Check product ID']
        }
      ];

      const result = ErrorHandlingService.formatValidationError(errors);
      expect(result.message).toContain('Product 1');
      expect(result.message).toContain('Product 2');
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('formatDatabaseError', () => {
    it('should format database error correctly', () => {
      const error = new Error('Connection failed');
      const result = ErrorHandlingService.formatDatabaseError(error, 'insert');
      
      expect(result.code).toBe('DATABASE_ERROR');
      expect(result.message).toBe('Database operation failed');
      expect(result.details).toBe('Connection failed');
      expect(result.operation).toBe('insert');
    });
  });

  describe('formatNetworkError', () => {
    it('should format network error correctly', () => {
      const error = new Error('Network timeout');
      const result = ErrorHandlingService.formatNetworkError(error, 2);
      
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe('Network operation failed');
      expect(result.retryCount).toBe(2);
    });
  });

  describe('formatBusinessError', () => {
    it('should format business error correctly', () => {
      const result = ErrorHandlingService.formatBusinessError(
        'Invalid operation',
        'stock-update'
      );
      
      expect(result.code).toBe('BUSINESS_ERROR');
      expect(result.message).toBe('Invalid operation');
      expect(result.context).toBe('stock-update');
    });
  });

  describe('determineErrorSeverity', () => {
    it('should determine high severity for multiple validation errors', () => {
      const error = ErrorHandlingService.formatValidationError([
        {
          code: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock',
          productId: 'test-1',
          productName: 'Product 1',
          requestedQuantity: 10,
          availableStock: 5,
          suggestions: []
        },
        {
          code: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock',
          productId: 'test-2',
          productName: 'Product 2',
          requestedQuantity: 8,
          availableStock: 3,
          suggestions: []
        }
      ]);

      const severity = ErrorHandlingService.determineErrorSeverity(error);
      expect(severity).toBe('high');
    });

    it('should determine high severity for database errors', () => {
      const error = ErrorHandlingService.formatDatabaseError(new Error('Connection failed'));
      const severity = ErrorHandlingService.determineErrorSeverity(error);
      expect(severity).toBe('high');
    });

    it('should determine severity based on retry count for network errors', () => {
      const error1 = ErrorHandlingService.formatNetworkError(new Error(), 1);
      const error2 = ErrorHandlingService.formatNetworkError(new Error(), 3);

      expect(ErrorHandlingService.determineErrorSeverity(error1)).toBe('medium');
      expect(ErrorHandlingService.determineErrorSeverity(error2)).toBe('high');
    });
  });

  describe('getSuggestedActions', () => {
    it('should get suggestions for validation errors', () => {
      const error = ErrorHandlingService.formatValidationError([
        {
          code: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock',
          productId: 'test-1',
          productName: 'Test Product',
          requestedQuantity: 10,
          availableStock: 5,
          suggestions: ['Reduce quantity', 'Check stock level']
        }
      ]);

      const suggestions = ErrorHandlingService.getSuggestedActions(error);
      expect(suggestions).toContain('Reduce quantity');
      expect(suggestions).toContain('Check stock level');
    });

    it('should get suggestions for database errors', () => {
      const error = ErrorHandlingService.formatDatabaseError(new Error());
      const suggestions = ErrorHandlingService.getSuggestedActions(error);
      expect(suggestions).toContain('Try the operation again');
      expect(suggestions).toContain('Check database connectivity');
    });
  });

  describe('handleError', () => {
    it('should handle error with logging and suggestions', () => {
      const error = ErrorHandlingService.formatValidationError([
        {
          code: 'INSUFFICIENT_STOCK',
          message: 'Not enough stock',
          productId: 'test-1',
          productName: 'Test Product',
          requestedQuantity: 10,
          availableStock: 5,
          suggestions: ['Reduce quantity']
        }
      ]);

      const result = ErrorHandlingService.handleError(error);
      
      expect(result.message).toContain('Test Product');
      expect(result.severity).toBe('medium');
      expect(result.suggestions).toContain('Reduce quantity');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log high severity errors to console.error', () => {
      const error = ErrorHandlingService.formatDatabaseError(new Error('Critical error'));
      ErrorHandlingService.handleError(error);
      expect(console.error).toHaveBeenCalled();
    });
  });
});