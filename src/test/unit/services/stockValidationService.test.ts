import { describe, it, expect, beforeEach } from 'vitest';
import { StockValidationService } from '../../../services/stockValidationService';
import { Product, CartItem } from '../../../types/business';

describe('StockValidationService', () => {
  const testProduct: Product = {
    id: 'test-1',
    name: 'Test Product',
    sku: 'TEST-001',
    price: 100,
    cost: 50,
    stock: 100,
    minStock: 20,
    category: '1',
    isActive: true
  };

  beforeEach(() => {
    // Clear cache before each test
    StockValidationService.clearCache();
  });

  describe('validateStockChange', () => {
    it('should validate stock change correctly', () => {
      const result = StockValidationService.validateStockChange(testProduct, 10, {
        movementType: 'sale',
        preventNegative: true
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should use cached results for same parameters', () => {
      // First validation
      const result1 = StockValidationService.validateStockChange(testProduct, 10, {
        movementType: 'sale',
        preventNegative: true
      });

      // Get cache entry
      const cached = StockValidationService.getCacheEntry(testProduct, 10, {
        movementType: 'sale',
        preventNegative: true
      });

      // Second validation
      const result2 = StockValidationService.validateStockChange(testProduct, 10, {
        movementType: 'sale',
        preventNegative: true
      });

      expect(cached).toBeDefined();
      expect(result1).toEqual(result2);
    });

    it('should invalidate cache when product stock changes', () => {
      // First validation
      StockValidationService.validateStockChange(testProduct, 10, {
        movementType: 'sale',
        preventNegative: true
      });

      // Change product stock
      const updatedProduct = { ...testProduct, stock: 50 };

      // Second validation
      const result = StockValidationService.validateStockChange(updatedProduct, 10, {
        movementType: 'sale',
        preventNegative: true
      });

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateBulkStockChanges', () => {
    it('should validate multiple changes correctly', () => {
      const changes = [
        {
          product: testProduct,
          quantity: 10,
          options: { movementType: 'sale', preventNegative: true }
        },
        {
          product: { ...testProduct, id: 'test-2', stock: 50 },
          quantity: 20,
          options: { movementType: 'sale', preventNegative: true }
        }
      ];

      const result = StockValidationService.validateBulkStockChanges(changes);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect all errors from invalid changes', () => {
      const changes = [
        {
          product: testProduct,
          quantity: 150, // More than stock
          options: { movementType: 'sale', preventNegative: true }
        },
        {
          product: { ...testProduct, id: 'test-2', stock: 50 },
          quantity: 60, // More than stock
          options: { movementType: 'sale', preventNegative: true }
        }
      ];

      const result = StockValidationService.validateBulkStockChanges(changes);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('validateCartWithConcurrency', () => {
    it('should detect concurrent modifications', () => {
      const cartItems: CartItem[] = [
        {
          product: { ...testProduct }, // Product in cart with original stock
          quantity: 10,
          total: 1000
        }
      ];

      const currentProducts = [
        {
          ...testProduct,
          stock: 80 // Stock changed since adding to cart
        }
      ];

      const result = StockValidationService.validateCartWithConcurrency(
        cartItems,
        currentProducts,
        { preventNegative: true }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('CONCURRENT_MODIFICATION');
    });

    it('should validate cart if no concurrent modifications', () => {
      const cartItems: CartItem[] = [
        {
          product: { ...testProduct },
          quantity: 10,
          total: 1000
        }
      ];

      const currentProducts = [
        { ...testProduct } // Same stock level
      ];

      const result = StockValidationService.validateCartWithConcurrency(
        cartItems,
        currentProducts,
        { preventNegative: true }
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateStockMovement', () => {
    it('should validate valid movement type correctly', () => {
      const result = StockValidationService.validateStockMovement(
        testProduct,
        10,
        'sale',
        { preventNegative: true }
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid movement type', () => {
      const result = StockValidationService.validateStockMovement(
        testProduct,
        10,
        'invalid_type',
        { preventNegative: true }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MOVEMENT_TYPE_MISMATCH');
    });

    it('should validate stock sufficiency for movement', () => {
      const result = StockValidationService.validateStockMovement(
        testProduct,
        150,
        'sale',
        { preventNegative: true }
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('cache management', () => {
    it('should track cache size correctly', () => {
      expect(StockValidationService.getCacheSize()).toBe(0);

      StockValidationService.validateStockChange(testProduct, 10);
      expect(StockValidationService.getCacheSize()).toBe(1);

      StockValidationService.validateStockChange(testProduct, 20);
      expect(StockValidationService.getCacheSize()).toBe(2);

      StockValidationService.clearCache();
      expect(StockValidationService.getCacheSize()).toBe(0);
    });

    it('should clear specific cache entries', () => {
      StockValidationService.validateStockChange(testProduct, 10);
      StockValidationService.validateStockChange(testProduct, 20);
      expect(StockValidationService.getCacheSize()).toBe(2);

      StockValidationService.clearCacheEntry(testProduct, 10);
      expect(StockValidationService.getCacheSize()).toBe(1);

      const entry = StockValidationService.getCacheEntry(testProduct, 10);
      expect(entry).toBeUndefined();
    });
  });
});