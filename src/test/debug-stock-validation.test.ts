import { describe, it, expect, beforeEach } from 'vitest';
import { useBusinessStore } from '../store/businessStore';
import { Product } from '../types/business';

describe('Debug Stock Validation', () => {
  let store: ReturnType<typeof useBusinessStore>;
  let mockProduct: Product;

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

    // Reset the store and set up test data directly
    useBusinessStore.setState({
      products: [mockProduct],
      cart: [],
      isLoading: false,
      error: null
    });
    
    store = useBusinessStore.getState();
  });

  it('should debug addToCart functionality', () => {
    // Check initial state
    expect(store.products).toHaveLength(1);
    expect(store.cart).toHaveLength(0);
    expect(store.products[0].stock).toBe(10);
    
    const result = store.addToCart(mockProduct, 5);
    
    // Check result
    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Get fresh store state
    const freshStore = useBusinessStore.getState();
    expect(freshStore.cart).toHaveLength(1);
    expect(freshStore.cart[0].quantity).toBe(5);
  });

  it('should debug validation directly', () => {
    const validation = store.validateProductStock(mockProduct.id, 5);
    console.log('Direct validation result:', validation);
    
    expect(validation).toBeDefined();
  });
});