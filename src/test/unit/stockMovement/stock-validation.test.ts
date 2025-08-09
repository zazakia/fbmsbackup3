import { describe, it, expect } from 'vitest';
import {
  validateMovementType,
  validateStockCalculation,
  validateProductStock,
  validateCartStock,
  validateStockUpdate,
  detectConcurrentStockIssues,
  StockUpdateOptions
} from '../../../utils/stockValidation';

describe('Stock Validation Tests', () => {
  describe('validateMovementType', () => {
    it('should correctly identify stock-out types', () => {
      const result = validateMovementType('sale');
      expect(result.isValid).toBe(true);
      expect(result.direction).toBe('OUT');
    });

    it('should correctly identify stock-in types', () => {
      const result = validateMovementType('purchase');
      expect(result.isValid).toBe(true);
      expect(result.direction).toBe('IN');
    });

    it('should reject invalid movement types', () => {
      const result = validateMovementType('invalid_type');
      expect(result.isValid).toBe(false);
      expect(result.direction).toBe(null);
      expect(result.error).toContain('Invalid movement type');
    });
  });

  describe('validateStockCalculation', () => {
    it('should validate stock decrease correctly', () => {
      const result = validateStockCalculation(100, 20, 'sale');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate stock increase correctly', () => {
      const result = validateStockCalculation(50, 30, 'purchase');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should prevent negative stock', () => {
      const result = validateStockCalculation(10, 20, 'sale');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('NEGATIVE_STOCK');
    });

    it('should reject invalid quantities', () => {
      const result = validateStockCalculation(100, -10, 'sale');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_QUANTITY');
    });

    it('should warn about large stock changes', () => {
      const result = validateStockCalculation(100, 250, 'purchase');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Large stock change detected');
    });
  });

  describe('validateProductStock', () => {
    const testProduct = {
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

    it('should validate active product correctly', () => {
      const result = validateProductStock(testProduct, 10);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject inactive products', () => {
      const inactiveProduct = { ...testProduct, isActive: false };
      const result = validateProductStock(inactiveProduct, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should validate stock-out operations', () => {
      const options: StockUpdateOptions = {
        movementType: 'sale',
        preventNegative: true
      };
      const result = validateProductStock(testProduct, 120, options);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
    });

    it('should warn about low stock', () => {
      const result = validateProductStock(testProduct, 90);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('below minimum level');
    });
  });

  describe('validateCartStock', () => {
    const products = [
      {
        id: 'test-1',
        name: 'Test Product 1',
        sku: 'TEST-001',
        price: 100,
        cost: 50,
        stock: 100,
        category: '1',
        isActive: true
      },
      {
        id: 'test-2',
        name: 'Test Product 2',
        sku: 'TEST-002',
        price: 200,
        cost: 100,
        stock: 50,
        category: '1',
        isActive: true
      }
    ];

    const cartItems = [
      {
        product: products[0],
        quantity: 10,
        total: 1000
      },
      {
        product: products[1],
        quantity: 20,
        total: 4000
      }
    ];

    it('should validate cart with sufficient stock', () => {
      const result = validateCartStock(cartItems, products);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify insufficient stock in cart', () => {
      const largeCart = [
        {
          product: products[0],
          quantity: 150, // More than available
          total: 15000
        }
      ];
      const result = validateCartStock(largeCart, products, { preventNegative: true });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('validateStockUpdate', () => {
    const testProduct = {
      id: 'test-1',
      name: 'Test Product',
      sku: 'TEST-001',
      price: 100,
      cost: 50,
      stock: 100,
      category: '1',
      isActive: true
    };

    it('should validate stock updates with movement type', () => {
      const options: StockUpdateOptions = {
        movementType: 'sale',
        preventNegative: true
      };
      const result = validateStockUpdate(testProduct, 50, options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid movement types', () => {
      const options: StockUpdateOptions = {
        movementType: 'invalid_type',
        preventNegative: true
      };
      const result = validateStockUpdate(testProduct, 50, options);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('MOVEMENT_TYPE_MISMATCH');
    });
  });

  describe('detectConcurrentStockIssues', () => {
    it('should detect stock changes during cart session', () => {
      const originalProduct = {
        id: 'test-1',
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100,
        cost: 50,
        stock: 100,
        category: '1',
        isActive: true
      };

      const cartItems = [
        {
          product: { ...originalProduct }, // Product in cart with original stock
          quantity: 10,
          total: 1000
        }
      ];

      const currentProducts = [
        {
          ...originalProduct,
          stock: 80 // Stock changed since adding to cart
        }
      ];

      const errors = detectConcurrentStockIssues(cartItems, currentProducts);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('CONCURRENT_MODIFICATION');
    });
  });
});