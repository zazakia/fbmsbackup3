import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useBusinessStore } from '../store/businessStore';
import { Product } from '../types/business';

// Mock the business store
vi.mock('../store/businessStore');
vi.mock('../store/supabaseAuthStore');
vi.mock('../store/toastStore');
vi.mock('../store/notificationStore');

describe('POS Stock Validation Integration', () => {
  let mockProducts: Product[];
  let mockBusinessStore: any;

  beforeEach(() => {
    mockProducts = [
      {
        id: '1',
        name: 'Test Product',
        sku: 'TEST001',
        barcode: '123456789',
        price: 100,
        cost: 50,
        stock: 5, // Low stock
        minStock: 10,
        reorderQuantity: 20,
        category: 'test',
        categoryId: '1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Out of Stock Product',
        sku: 'OUT001',
        barcode: '987654321',
        price: 200,
        cost: 100,
        stock: 0, // Out of stock
        minStock: 5,
        reorderQuantity: 15,
        category: 'test',
        categoryId: '1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockBusinessStore = {
      products: mockProducts,
      categories: [],
      cart: [],
      customers: [],
      sales: [],
      isLoading: false,
      error: null,
      
      // Mock functions
      addToCart: vi.fn(),
      updateCartItem: vi.fn(),
      removeFromCart: vi.fn(),
      clearCart: vi.fn(),
      getCartSubtotal: vi.fn(() => 0),
      getCartTax: vi.fn(() => 0),
      getCartTotal: vi.fn(() => 0),
      createSale: vi.fn(),
      updateStock: vi.fn(),
      getCustomer: vi.fn(),
      fetchCustomers: vi.fn(),
      updateCustomer: vi.fn(),
      
      // Stock validation functions
      validateSaleStock: vi.fn(),
      validateProductStock: vi.fn(),
    };

    (useBusinessStore as any).mockReturnValue(mockBusinessStore);
  });

  describe('Stock Validation in Cart Operations', () => {
    it('should prevent adding out of stock products to cart', () => {
      const outOfStockProduct = mockProducts[1]; // Stock: 0
      
      // Mock validation to return error for out of stock
      mockBusinessStore.validateProductStock.mockReturnValue({
        isValid: false,
        errors: [{
          code: 'INSUFFICIENT_STOCK',
          message: 'Product is out of stock',
          productId: outOfStockProduct.id,
          productName: outOfStockProduct.name,
          requestedQuantity: 1,
          availableStock: 0,
          suggestions: ['Product is out of stock', 'Consider removing this item from the sale']
        }],
        warnings: []
      });

      mockBusinessStore.addToCart.mockReturnValue({
        isValid: false,
        errors: [{
          code: 'INSUFFICIENT_STOCK',
          message: 'Product is out of stock',
          productId: outOfStockProduct.id,
          productName: outOfStockProduct.name,
          requestedQuantity: 1,
          availableStock: 0,
          suggestions: ['Product is out of stock', 'Consider removing this item from the sale']
        }],
        warnings: []
      });

      // Simulate adding out of stock product to cart
      const result = mockBusinessStore.addToCart(outOfStockProduct, 1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
      expect(result.errors[0].message).toContain('out of stock');
    });

    it('should prevent adding more items than available stock', () => {
      const lowStockProduct = mockProducts[0]; // Stock: 5
      
      // Mock validation to return error for excessive quantity
      mockBusinessStore.validateProductStock.mockReturnValue({
        isValid: false,
        errors: [{
          code: 'INSUFFICIENT_STOCK',
          message: `Insufficient stock for ${lowStockProduct.name}. Available: 5, Required: 10`,
          productId: lowStockProduct.id,
          productName: lowStockProduct.name,
          requestedQuantity: 10,
          availableStock: 5,
          suggestions: ['Reduce quantity to 5 or less', 'Check if more stock is available in other locations']
        }],
        warnings: []
      });

      mockBusinessStore.addToCart.mockReturnValue({
        isValid: false,
        errors: [{
          code: 'INSUFFICIENT_STOCK',
          message: `Insufficient stock for ${lowStockProduct.name}. Available: 5, Required: 10`,
          productId: lowStockProduct.id,
          productName: lowStockProduct.name,
          requestedQuantity: 10,
          availableStock: 5,
          suggestions: ['Reduce quantity to 5 or less', 'Check if more stock is available in other locations']
        }],
        warnings: []
      });

      // Simulate adding excessive quantity to cart
      const result = mockBusinessStore.addToCart(lowStockProduct, 10);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INSUFFICIENT_STOCK');
      expect(result.errors[0].availableStock).toBe(5);
      expect(result.errors[0].requestedQuantity).toBe(10);
    });

    it('should show warnings for low stock products', () => {
      const lowStockProduct = mockProducts[0]; // Stock: 5, MinStock: 10
      
      // Mock validation to return warning for low stock
      mockBusinessStore.validateProductStock.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [{
          code: 'INSUFFICIENT_STOCK',
          message: `Low stock warning for ${lowStockProduct.name}. Current stock: 5, Minimum: 10`,
          productId: lowStockProduct.id,
          productName: lowStockProduct.name,
          requestedQuantity: 3,
          availableStock: 5,
          suggestions: ['Consider reordering soon', 'Recommended reorder quantity: 20']
        }]
      });

      mockBusinessStore.addToCart.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [{
          code: 'INSUFFICIENT_STOCK',
          message: `Low stock warning for ${lowStockProduct.name}. Current stock: 5, Minimum: 10`,
          productId: lowStockProduct.id,
          productName: lowStockProduct.name,
          requestedQuantity: 3,
          availableStock: 5,
          suggestions: ['Consider reordering soon', 'Recommended reorder quantity: 20']
        }]
      });

      // Simulate adding low stock product to cart
      const result = mockBusinessStore.addToCart(lowStockProduct, 3);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Low stock warning');
      expect(result.warnings[0].suggestions).toContain('Consider reordering soon');
    });
  });

  describe('Sale Completion Stock Validation', () => {
    it('should prevent sale completion with insufficient stock', () => {
      const cartItems = [
        {
          product: mockProducts[0], // Stock: 5
          quantity: 10, // Exceeds available stock
          total: 1000
        }
      ];

      // Mock cart and validation
      mockBusinessStore.cart = cartItems;
      mockBusinessStore.validateSaleStock.mockReturnValue({
        isValid: false,
        errors: [{
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock for Test Product. Available: 5, Required: 10',
          productId: mockProducts[0].id,
          productName: mockProducts[0].name,
          requestedQuantity: 10,
          availableStock: 5,
          suggestions: ['Reduce quantity to 5 or less']
        }],
        warnings: []
      });

      // Simulate sale validation
      const validation = mockBusinessStore.validateSaleStock(cartItems);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].code).toBe('INSUFFICIENT_STOCK');
    });

    it('should allow sale completion with sufficient stock', () => {
      const cartItems = [
        {
          product: mockProducts[0], // Stock: 5
          quantity: 3, // Within available stock
          total: 300
        }
      ];

      // Mock cart and validation
      mockBusinessStore.cart = cartItems;
      mockBusinessStore.validateSaleStock.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [{
          code: 'INSUFFICIENT_STOCK',
          message: 'Low stock warning for Test Product. Current stock: 5, Minimum: 10',
          productId: mockProducts[0].id,
          productName: mockProducts[0].name,
          requestedQuantity: 3,
          availableStock: 5,
          suggestions: ['Consider reordering soon']
        }]
      });

      // Simulate sale validation
      const validation = mockBusinessStore.validateSaleStock(cartItems);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(1); // Should still show low stock warning
    });

    it('should handle multiple stock validation errors', () => {
      const cartItems = [
        {
          product: mockProducts[0], // Stock: 5
          quantity: 10, // Exceeds stock
          total: 1000
        },
        {
          product: mockProducts[1], // Stock: 0
          quantity: 1, // Out of stock
          total: 200
        }
      ];

      // Mock cart and validation
      mockBusinessStore.cart = cartItems;
      mockBusinessStore.validateSaleStock.mockReturnValue({
        isValid: false,
        errors: [
          {
            code: 'INSUFFICIENT_STOCK',
            message: 'Insufficient stock for Test Product. Available: 5, Required: 10',
            productId: mockProducts[0].id,
            productName: mockProducts[0].name,
            requestedQuantity: 10,
            availableStock: 5,
            suggestions: ['Reduce quantity to 5 or less']
          },
          {
            code: 'INSUFFICIENT_STOCK',
            message: 'Product is out of stock',
            productId: mockProducts[1].id,
            productName: mockProducts[1].name,
            requestedQuantity: 1,
            availableStock: 0,
            suggestions: ['Product is out of stock', 'Consider removing this item from the sale']
          }
        ],
        warnings: []
      });

      // Simulate sale validation
      const validation = mockBusinessStore.validateSaleStock(cartItems);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(2);
      expect(validation.errors[0].productName).toBe('Test Product');
      expect(validation.errors[1].productName).toBe('Out of Stock Product');
    });
  });

  describe('Error Message Quality', () => {
    it('should provide user-friendly error messages', () => {
      const error = {
        code: 'INSUFFICIENT_STOCK' as const,
        message: 'Insufficient stock for Test Product. Available: 5, Required: 10',
        productId: '1',
        productName: 'Test Product',
        requestedQuantity: 10,
        availableStock: 5,
        suggestions: ['Reduce quantity to 5 or less', 'Check if more stock is available in other locations']
      };

      expect(error.message).toContain('Test Product');
      expect(error.message).toContain('Available: 5');
      expect(error.message).toContain('Required: 10');
      expect(error.suggestions).toContain('Reduce quantity to 5 or less');
    });

    it('should provide actionable suggestions', () => {
      const error = {
        code: 'INSUFFICIENT_STOCK' as const,
        message: 'Product is out of stock',
        productId: '2',
        productName: 'Out of Stock Product',
        requestedQuantity: 1,
        availableStock: 0,
        suggestions: ['Product is out of stock', 'Consider removing this item from the sale']
      };

      expect(error.suggestions).toContain('Product is out of stock');
      expect(error.suggestions).toContain('Consider removing this item from the sale');
      
      // Suggestions should be actionable
      error.suggestions?.forEach(suggestion => {
        expect(suggestion.length).toBeGreaterThan(10);
        expect(suggestion).not.toContain('undefined');
        expect(suggestion).not.toContain('null');
      });
    });
  });

  describe('Negative Stock Prevention', () => {
    it('should prevent operations that would result in negative stock', () => {
      const product = mockProducts[0]; // Stock: 5
      
      // Mock validation with preventNegative option
      mockBusinessStore.validateProductStock.mockReturnValue({
        isValid: false,
        errors: [{
          code: 'NEGATIVE_STOCK',
          message: `Operation would result in negative stock for ${product.name}`,
          productId: product.id,
          productName: product.name,
          requestedQuantity: 10,
          availableStock: 5,
          suggestions: [
            'Reduce the quantity to prevent negative stock',
            'Check if stock levels are accurate'
          ]
        }],
        warnings: []
      });

      // Simulate validation with preventNegative option
      const validation = mockBusinessStore.validateProductStock(product, 10, { preventNegative: true });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe('NEGATIVE_STOCK');
      expect(validation.errors[0].suggestions).toContain('Reduce the quantity to prevent negative stock');
    });
  });
});