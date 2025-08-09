import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { useBusinessStore } from '../../../store/businessStore';
import { BusinessService } from '../../../services/businessService';

// Mock BusinessService
vi.mock('../../../services/businessService', () => ({
  BusinessService: {
    validateProductStock: vi.fn(),
    validateCartStock: vi.fn(),
    validateStockUpdate: vi.fn(),
    validateStockMovement: vi.fn()
  }
}));

// Mock Supabase API
vi.mock('../../../api/products', () => ({
  supaCreateProduct: vi.fn(),
  supaUpdateProduct: vi.fn(),
  supaDeleteProduct: vi.fn(),
  createProductMovement: vi.fn()
}));

describe('Business Store', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    useBusinessStore.setState({
      products: [],
      cart: [],
      error: null,
      isLoading: false
    });
  });

  describe('addToCart', () => {
    it('should validate stock before adding to cart', () => {
      // Mock validation success
      (BusinessService.validateProductStock as any).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Add to cart
      const store = useBusinessStore.getState();
      store.addToCart(testProduct, 10);

      // Verify validation was called
      expect(BusinessService.validateProductStock).toHaveBeenCalledWith(
        testProduct,
        10,
        {
          movementType: 'sale',
          preventNegative: true
        }
      );

      // Verify cart was updated
      const updatedCart = useBusinessStore.getState().cart;
      expect(updatedCart).toHaveLength(1);
      expect(updatedCart[0]).toEqual({
        product: testProduct,
        quantity: 10
      });
    });

    it('should not add to cart if validation fails', () => {
      // Mock validation failure
      (BusinessService.validateProductStock as any).mockReturnValue({
        isValid: false,
        errors: [{ message: 'Insufficient stock' }],
        warnings: []
      });

      // Try to add to cart
      const store = useBusinessStore.getState();
      store.addToCart(testProduct, 10);

      // Verify cart was not updated
      const updatedStore = useBusinessStore.getState();
      expect(updatedStore.cart).toHaveLength(0);
      expect(updatedStore.error).toBe('Insufficient stock');
    });

    it('should update quantity for existing cart item', () => {
      // Mock validation success
      (BusinessService.validateProductStock as any).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Add product twice
      const store = useBusinessStore.getState();
      store.addToCart(testProduct, 10);
      store.addToCart(testProduct, 5);

      // Verify cart was updated correctly
      const updatedCart = useBusinessStore.getState().cart;
      expect(updatedCart).toHaveLength(1);
      expect(updatedCart[0].quantity).toBe(15);
    });
  });

  describe('updateCartItem', () => {
    it('should validate new quantity before updating', () => {
      // Mock validation success
      (BusinessService.validateProductStock as any).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Setup initial state
      useBusinessStore.setState({
        products: [testProduct],
        cart: [{ product: testProduct, quantity: 10 }],
        error: null
      });

      // Update cart item
      const store = useBusinessStore.getState();
      store.updateCartItem(testProduct.id, 20);

      // Verify validation was called with correct parameters
      expect(BusinessService.validateProductStock).toHaveBeenCalledWith(
        testProduct,
        20,
        {
          movementType: 'sale',
          preventNegative: true
        }
      );

      // Verify cart was updated
      const updatedCart = useBusinessStore.getState().cart;
      expect(updatedCart[0].quantity).toBe(20);
    });

    it('should not update if validation fails', () => {
      // Mock validation failure
      (BusinessService.validateProductStock as any).mockReturnValue({
        isValid: false,
        errors: [{ message: 'Insufficient stock' }],
        warnings: []
      });

      // Setup initial state
      useBusinessStore.setState({
        products: [testProduct],
        cart: [{ product: testProduct, quantity: 10 }],
        error: null
      });

      // Try to update cart item
      const store = useBusinessStore.getState();
      store.updateCartItem(testProduct.id, 20);

      // Verify cart was not updated
      const updatedStore = useBusinessStore.getState();
      expect(updatedStore.cart[0].quantity).toBe(10);
      expect(updatedStore.error).toBe('Insufficient stock');
    });

    it('should remove item if quantity is zero or negative', () => {
      // Setup initial state
      useBusinessStore.setState({
        cart: [{ product: testProduct, quantity: 10 }],
        error: null
      });

      // Update with zero quantity
      const store = useBusinessStore.getState();
      store.updateCartItem(testProduct.id, 0);

      // Verify item was removed
      const updatedCart = useBusinessStore.getState().cart;
      expect(updatedCart).toHaveLength(0);
    });
  });
});