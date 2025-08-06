import { describe, it, expect, beforeEach } from 'vitest';
import { 
  validateProductStock, 
  validateCartStock, 
  validateStockUpdate,
  formatStockValidationErrors,
  formatStockValidationSuggestions,
  detectConcurrentStockIssues
} from '../utils/stockValidation';
import { Product, CartItem } from '../types/business';

describe('Stock Validation', () => {
  let mockProduct: Product;
  let mockLowStockProduct: Product;
  let mockOutOfStockProduct: Product;

  beforeEach(() => {
    mockProduct = {
      id: '1',
      name: 'Test Product',
      description: 'A test product',
      sku: 'TEST001',
      barcode: '123456789',
      category: 'Test Category',
      categoryId: '1',
      price: 100,
      cost: 50,
      stock: 10,
      minStock: 5,
      reorderQuantity: 20,
      unit: 'pcs',
      isActive: true,
      tags: [],
      images: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockLowStockProduct = {
      ...mockProduct,
      id: '2',
      name: 'Low Stock Product',
      stock: 3,
      minStock: 5
    };

    mockOutOfStockProduct = {
      ...mockProduct,
      id: '3',
      name: 'Out of Stock Product',
      stock: 0
    };
  });

  describe('validateProductStock', () => {
    it('should validate sufficient stock successfully', () => {
      const result = validateProductStock(mockProduct, 5);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect insufficient stock', () => {
      const result = validateProductStock(mockProduct, 15);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
      expect(result.errors[0].message).toContain('Insufficient stock');
      expect(result.errors[0].availableStock).toBe(10);
      expect(result.errors[0].requestedQuantity).toBe(15);
    });

    it('should detect out of stock', () => {
      const result = validateProductStock(mockOutOfStockProduct, 1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
      expect(result.errors[0].suggestions).toContain('Product is out of stock');
    });

    it('should warn about low stock', () => {
      const result = validateProductStock(mockLowStockProduct, 2);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Low stock warning');
    });

    it('should detect invalid quantity', () => {
      const result = validateProductStock(mockProduct, 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_QUANTITY');
    });

    it('should detect negative quantity', () => {
      const result = validateProductStock(mockProduct, -5);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_QUANTITY');
    });

    it('should handle product not found', () => {
      const result = validateProductStock(undefined, 5);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should prevent negative stock when option is enabled', () => {
      const result = validateProductStock(mockProduct, 15, { preventNegative: true });
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NEGATIVE_STOCK')).toBe(true);
    });

    it('should provide helpful suggestions for insufficient stock', () => {
      const result = validateProductStock(mockProduct, 15);
      
      expect(result.errors[0].suggestions).toContain('Reduce quantity to 10 or less');
      expect(result.errors[0].suggestions).toContain('Check if more stock is available in other locations');
    });

    it('should suggest reordering for low stock products', () => {
      const result = validateProductStock(mockLowStockProduct, 2);
      
      expect(result.warnings[0].suggestions).toContain('Consider reordering soon');
      expect(result.warnings[0].suggestions).toContain('Recommended reorder quantity: 20');
    });
  });

  describe('validateCartStock', () => {
    it('should validate cart with sufficient stock', () => {
      const cartItems: CartItem[] = [
        {
          product: mockProduct,
          quantity: 3,
          total: 300
        },
        {
          product: { ...mockProduct, id: '2', stock: 8 },
          quantity: 2,
          total: 200
        }
      ];

      const products = [mockProduct, { ...mockProduct, id: '2', stock: 8 }];
      const result = validateCartStock(cartItems, products);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect insufficient stock in cart', () => {
      const cartItems: CartItem[] = [
        {
          product: mockProduct,
          quantity: 15, // More than available stock (10)
          total: 1500
        }
      ];

      const result = validateCartStock(cartItems, [mockProduct]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
    });

    it('should detect multiple stock issues in cart', () => {
      const cartItems: CartItem[] = [
        {
          product: mockProduct,
          quantity: 15, // Insufficient stock
          total: 1500
        },
        {
          product: mockOutOfStockProduct,
          quantity: 1, // Out of stock
          total: 100
        }
      ];

      const products = [mockProduct, mockOutOfStockProduct];
      const result = validateCartStock(cartItems, products);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('validateStockUpdate', () => {
    it('should validate positive stock update', () => {
      const result = validateStockUpdate(mockProduct, 5);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate negative stock update within limits', () => {
      const result = validateStockUpdate(mockProduct, -5);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should prevent negative stock when option is enabled', () => {
      const result = validateStockUpdate(mockProduct, -15, { preventNegative: true });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('NEGATIVE_STOCK');
    });

    it('should warn about low stock after update', () => {
      const result = validateStockUpdate(mockProduct, -7); // 10 - 7 = 3, below minStock of 5
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('low stock');
    });

    it('should handle product not found', () => {
      const result = validateStockUpdate(undefined, 5);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('detectConcurrentStockIssues', () => {
    it('should detect duplicate products in cart exceeding stock', () => {
      const cartItems: CartItem[] = [
        {
          product: mockProduct,
          quantity: 6,
          total: 600
        },
        {
          product: mockProduct, // Same product again
          quantity: 5,
          total: 500
        }
      ];

      const errors = detectConcurrentStockIssues(cartItems, [mockProduct]);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INSUFFICIENT_STOCK');
      expect(errors[0].requestedQuantity).toBe(11); // 6 + 5
      expect(errors[0].availableStock).toBe(10);
      expect(errors[0].suggestions).toContain('Consolidate duplicate cart entries');
    });

    it('should not detect issues when total quantity is within stock', () => {
      const cartItems: CartItem[] = [
        {
          product: mockProduct,
          quantity: 4,
          total: 400
        },
        {
          product: mockProduct, // Same product again
          quantity: 3,
          total: 300
        }
      ];

      const errors = detectConcurrentStockIssues(cartItems, [mockProduct]);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('formatStockValidationErrors', () => {
    it('should format insufficient stock error', () => {
      const errors = [
        {
          code: 'INSUFFICIENT_STOCK' as const,
          message: 'Not enough stock',
          productId: '1',
          productName: 'Test Product',
          requestedQuantity: 15,
          availableStock: 10
        }
      ];

      const formatted = formatStockValidationErrors(errors);
      
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBe('Test Product: Not enough stock (Available: 10, Needed: 15)');
    });

    it('should format negative stock error', () => {
      const errors = [
        {
          code: 'NEGATIVE_STOCK' as const,
          message: 'Would cause negative stock',
          productId: '1',
          productName: 'Test Product',
          requestedQuantity: 15,
          availableStock: 10
        }
      ];

      const formatted = formatStockValidationErrors(errors);
      
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBe('Test Product: Operation would cause negative stock');
    });

    it('should format product not found error', () => {
      const errors = [
        {
          code: 'PRODUCT_NOT_FOUND' as const,
          message: 'Product not found',
          productId: '',
          productName: 'Unknown Product',
          requestedQuantity: 5,
          availableStock: 0
        }
      ];

      const formatted = formatStockValidationErrors(errors);
      
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBe('Product not found or invalid');
    });
  });

  describe('formatStockValidationSuggestions', () => {
    it('should collect and deduplicate suggestions', () => {
      const errors = [
        {
          code: 'INSUFFICIENT_STOCK' as const,
          message: 'Not enough stock',
          productId: '1',
          productName: 'Test Product',
          requestedQuantity: 15,
          availableStock: 10,
          suggestions: ['Reduce quantity', 'Check other locations']
        },
        {
          code: 'INSUFFICIENT_STOCK' as const,
          message: 'Not enough stock',
          productId: '2',
          productName: 'Another Product',
          requestedQuantity: 8,
          availableStock: 5,
          suggestions: ['Reduce quantity', 'Reorder stock'] // 'Reduce quantity' is duplicate
        }
      ];

      const suggestions = formatStockValidationSuggestions(errors);
      
      expect(suggestions).toHaveLength(3);
      expect(suggestions).toContain('Reduce quantity');
      expect(suggestions).toContain('Check other locations');
      expect(suggestions).toContain('Reorder stock');
    });

    it('should handle errors without suggestions', () => {
      const errors = [
        {
          code: 'PRODUCT_NOT_FOUND' as const,
          message: 'Product not found',
          productId: '',
          productName: 'Unknown Product',
          requestedQuantity: 5,
          availableStock: 0
        }
      ];

      const suggestions = formatStockValidationSuggestions(errors);
      
      expect(suggestions).toHaveLength(0);
    });
  });
});