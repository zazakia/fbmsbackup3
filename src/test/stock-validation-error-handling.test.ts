import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  validateProductStock, 
  validateCartStock, 
  validateStockUpdate,
  validateBulkStockOperation,
  createStockValidationError,
  formatStockValidationErrors,
  formatStockValidationSuggestions,
  detectConcurrentStockIssues
} from '../utils/stockValidation';
import { Product, CartItem } from '../types/business';

describe('Stock Validation and Error Handling', () => {
  let mockProduct: Product;
  let mockProducts: Product[];
  let mockCartItems: CartItem[];

  beforeEach(() => {
    mockProduct = {
      id: '1',
      name: 'Test Product',
      sku: 'TEST001',
      barcode: '123456789',
      price: 100,
      cost: 50,
      stock: 10,
      minStock: 5,
      reorderQuantity: 20,
      category: 'test',
      categoryId: '1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockProducts = [
      mockProduct,
      {
        id: '2',
        name: 'Low Stock Product',
        sku: 'LOW001',
        barcode: '987654321',
        price: 200,
        cost: 100,
        stock: 2,
        minStock: 5,
        reorderQuantity: 15,
        category: 'test',
        categoryId: '1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Out of Stock Product',
        sku: 'OUT001',
        barcode: '555666777',
        price: 150,
        cost: 75,
        stock: 0,
        minStock: 3,
        reorderQuantity: 10,
        category: 'test',
        categoryId: '1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockCartItems = [
      {
        product: mockProduct,
        quantity: 5,
        total: 500
      },
      {
        product: mockProducts[1], // Low stock product
        quantity: 1,
        total: 200
      }
    ];
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
      expect(result.errors[0].productName).toBe('Test Product');
      expect(result.errors[0].requestedQuantity).toBe(15);
      expect(result.errors[0].availableStock).toBe(10);
    });

    it('should prevent negative stock when option is enabled', () => {
      const result = validateProductStock(mockProduct, 15, { preventNegative: true });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('NEGATIVE_STOCK');
    });

    it('should handle product not found', () => {
      const result = validateProductStock(undefined, 5);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PRODUCT_NOT_FOUND');
    });

    it('should detect invalid quantity', () => {
      const result = validateProductStock(mockProduct, 0);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_QUANTITY');
    });

    it('should generate low stock warnings', () => {
      const lowStockProduct = mockProducts[1]; // Stock: 2, MinStock: 5
      const result = validateProductStock(lowStockProduct, 2);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Low stock warning');
    });

    it('should provide helpful suggestions for insufficient stock', () => {
      const result = validateProductStock(mockProduct, 15);
      
      expect(result.errors[0].suggestions).toContain('Reduce quantity to 10 or less');
      expect(result.errors[0].suggestions).toContain('Check if more stock is available in other locations');
      
      // Test reorder suggestion with a low stock product
      const lowStockProduct = { ...mockProduct, stock: 3 }; // Below minStock of 5
      const lowStockResult = validateProductStock(lowStockProduct, 5);
      const hasReorderSuggestion = lowStockResult.errors[0].suggestions?.some(s => s.includes('reorder'));
      expect(hasReorderSuggestion).toBe(true);
    });
  });

  describe('validateCartStock', () => {
    it('should validate cart with sufficient stock', () => {
      const result = validateCartStock(mockCartItems, mockProducts);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect insufficient stock in cart', () => {
      const cartWithExcessiveQuantity = [
        {
          product: mockProduct,
          quantity: 15, // Exceeds available stock of 10
          total: 1500
        }
      ];
      
      const result = validateCartStock(cartWithExcessiveQuantity, mockProducts);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
    });

    it('should detect multiple stock issues in cart', () => {
      const cartWithMultipleIssues = [
        {
          product: mockProduct,
          quantity: 15, // Exceeds stock
          total: 1500
        },
        {
          product: mockProducts[2], // Out of stock product
          quantity: 1,
          total: 150
        }
      ];
      
      const result = validateCartStock(cartWithMultipleIssues, mockProducts);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateStockUpdate', () => {
    it('should validate positive stock update', () => {
      const result = validateStockUpdate(mockProduct, 5); // Adding 5 units
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate negative stock update within limits', () => {
      const result = validateStockUpdate(mockProduct, -5); // Removing 5 units (stock: 10)
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should prevent negative stock when option is enabled', () => {
      const result = validateStockUpdate(mockProduct, -15, { preventNegative: true }); // Would result in -5
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('NEGATIVE_STOCK');
    });

    it('should generate low stock warnings after update', () => {
      const result = validateStockUpdate(mockProduct, -7); // Stock would be 3, below minStock of 5
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('low stock');
    });
  });

  describe('validateBulkStockOperation', () => {
    it('should validate bulk operation with sufficient stock', () => {
      const items = [
        { productId: '1', quantity: 5 },
        { productId: '2', quantity: 1 }
      ];
      
      const result = validateBulkStockOperation(items, mockProducts);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should consolidate duplicate product entries', () => {
      const items = [
        { productId: '1', quantity: 3 },
        { productId: '1', quantity: 4 }, // Same product, total: 7
        { productId: '2', quantity: 1 }
      ];
      
      const result = validateBulkStockOperation(items, mockProducts);
      
      expect(result.isValid).toBe(true); // Total 7 is within stock of 10
    });

    it('should detect insufficient stock in consolidated entries', () => {
      const items = [
        { productId: '1', quantity: 6 },
        { productId: '1', quantity: 6 }, // Same product, total: 12 (exceeds stock of 10)
      ];
      
      const result = validateBulkStockOperation(items, mockProducts);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
    });

    it('should handle non-existent products', () => {
      const items = [
        { productId: 'nonexistent', quantity: 1 }
      ];
      
      const result = validateBulkStockOperation(items, mockProducts);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('createStockValidationError', () => {
    it('should create insufficient stock error with suggestions', () => {
      const error = createStockValidationError('INSUFFICIENT_STOCK', mockProduct, 15);
      
      expect(error.code).toBe('INSUFFICIENT_STOCK');
      expect(error.productName).toBe('Test Product');
      expect(error.requestedQuantity).toBe(15);
      expect(error.availableStock).toBe(10);
      expect(error.suggestions).toContain('Reduce quantity to 10 or less');
      expect(error.suggestions).toContain('Consider reordering 20 units');
    });

    it('should create negative stock error with appropriate suggestions', () => {
      const error = createStockValidationError('NEGATIVE_STOCK', mockProduct, 15);
      
      expect(error.code).toBe('NEGATIVE_STOCK');
      expect(error.suggestions).toContain('Reduce the quantity to prevent negative stock');
      expect(error.suggestions).toContain('Verify current stock levels are accurate');
    });

    it('should create product not found error', () => {
      const error = createStockValidationError('PRODUCT_NOT_FOUND', mockProduct, 5);
      
      expect(error.code).toBe('PRODUCT_NOT_FOUND');
      expect(error.suggestions).toContain('Refresh the product list');
      expect(error.suggestions).toContain('Verify the product barcode or ID');
    });
  });

  describe('formatStockValidationErrors', () => {
    it('should format error messages for display', () => {
      const errors = [
        createStockValidationError('INSUFFICIENT_STOCK', mockProduct, 15),
        createStockValidationError('NEGATIVE_STOCK', mockProducts[1], 5)
      ];
      
      const formatted = formatStockValidationErrors(errors);
      
      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toContain('Test Product: Not enough stock');
      expect(formatted[1]).toContain('Low Stock Product: Operation would cause negative stock');
    });
  });

  describe('formatStockValidationSuggestions', () => {
    it('should extract and deduplicate suggestions', () => {
      const errors = [
        createStockValidationError('INSUFFICIENT_STOCK', mockProduct, 15),
        createStockValidationError('INSUFFICIENT_STOCK', mockProducts[1], 5)
      ];
      
      const suggestions = formatStockValidationSuggestions(errors);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('Check if more stock is available in other locations');
      
      // Should not have duplicates
      const uniqueSuggestions = [...new Set(suggestions)];
      expect(suggestions).toEqual(uniqueSuggestions);
    });
  });

  describe('detectConcurrentStockIssues', () => {
    it('should detect multiple cart entries for same product', () => {
      const cartWithDuplicates = [
        {
          product: mockProduct,
          quantity: 6,
          total: 600
        },
        {
          product: mockProduct, // Same product again
          quantity: 6,
          total: 600
        }
      ];
      
      const errors = detectConcurrentStockIssues(cartWithDuplicates, mockProducts);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INSUFFICIENT_STOCK');
      expect(errors[0].message).toContain('Multiple cart entries');
      expect(errors[0].requestedQuantity).toBe(12); // Total of both entries
    });

    it('should not report issues when total quantity is within stock', () => {
      const cartWithDuplicates = [
        {
          product: mockProduct,
          quantity: 3,
          total: 300
        },
        {
          product: mockProduct, // Same product again
          quantity: 4,
          total: 400
        }
      ];
      
      const errors = detectConcurrentStockIssues(cartWithDuplicates, mockProducts);
      
      expect(errors).toHaveLength(0); // Total 7 is within stock of 10
    });
  });

  describe('Error Message Quality', () => {
    it('should provide user-friendly error messages', () => {
      const error = createStockValidationError('INSUFFICIENT_STOCK', mockProduct, 15);
      
      expect(error.message).not.toContain('undefined');
      expect(error.message).not.toContain('null');
      expect(error.message).toContain(mockProduct.name);
      expect(error.message).toContain('Available: 10');
      expect(error.message).toContain('Requested: 15');
    });

    it('should provide actionable suggestions', () => {
      const error = createStockValidationError('INSUFFICIENT_STOCK', mockProduct, 15);
      
      error.suggestions?.forEach(suggestion => {
        expect(suggestion).toBeTruthy();
        expect(suggestion.length).toBeGreaterThan(10); // Meaningful suggestions
        expect(suggestion).not.toContain('undefined');
        expect(suggestion).not.toContain('null');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero stock products', () => {
      const zeroStockProduct = mockProducts[2]; // Stock: 0
      const result = validateProductStock(zeroStockProduct, 1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
      expect(result.errors[0].suggestions).toContain('Product is out of stock');
    });

    it('should handle negative quantities gracefully', () => {
      const result = validateProductStock(mockProduct, -5);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_QUANTITY');
    });

    it('should handle very large quantities', () => {
      const result = validateProductStock(mockProduct, 999999);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
    });

    it('should handle products without reorder quantities', () => {
      const productWithoutReorder = {
        ...mockProduct,
        reorderQuantity: undefined
      };
      
      const error = createStockValidationError('INSUFFICIENT_STOCK', productWithoutReorder, 15);
      
      expect(error.suggestions).toContain('Consider reordering this product');
    });
  });
});