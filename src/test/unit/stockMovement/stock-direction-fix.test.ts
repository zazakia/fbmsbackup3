import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { useBusinessStore } from '../../../store/businessStore';

// Mock createProductMovement to avoid Supabase calls
vi.mock('../../../api/productHistory', () => ({
  createProductMovement: vi.fn().mockResolvedValue({ error: null })
}));

describe('Stock Direction Fix Tests', () => {
  beforeEach(() => {
    const store = useBusinessStore.getState();
    
    // Reset store to fresh state
    useBusinessStore.setState({
      ...store,
      products: [],
      customers: [],
      sales: [],
      cart: [],
      error: null,
      isLoading: false
    });
  });

  describe('createMovementRecord', () => {
    it('should correctly decrease stock for sales transactions', async () => {
      const store = useBusinessStore.getState();
      
      // Add a test product directly to store
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
      
      useBusinessStore.setState({
        ...store,
        products: [testProduct]
      });
      
      // Create a sale movement
      await store.createMovementRecord(
        testProduct.id,
        'sale',
        10,
        'Test sale transaction',
        {
          referenceNumber: 'TEST-SALE-001',
          userId: 'test-user'
        }
      );
      
      // Verify stock was decreased
      const updatedProduct = useBusinessStore.getState().products.find(p => p.id === testProduct.id);
      expect(updatedProduct?.stock).toBe(90);
    });

    it('should correctly increase stock for purchase transactions', async () => {
      const store = useBusinessStore.getState();
      
      // Add a test product directly to store
      const testProduct = {
        id: 'test-2',
        name: 'Test Product',
        sku: 'TEST-002',
        price: 100,
        cost: 50,
        stock: 50,
        category: '1',
        isActive: true
      };
      
      useBusinessStore.setState({
        ...store,
        products: [testProduct]
      });
      
      // Create a purchase movement
      await store.createMovementRecord(
        testProduct.id,
        'purchase',
        20,
        'Test purchase transaction',
        {
          referenceNumber: 'TEST-PO-001',
          userId: 'test-user'
        }
      );
      
      // Verify stock was increased
      const updatedProduct = useBusinessStore.getState().products.find(p => p.id === testProduct.id);
      expect(updatedProduct?.stock).toBe(70);
    });

    it('should throw error for invalid movement type', async () => {
      const store = useBusinessStore.getState();
      
      // Add a test product directly to store
      const testProduct = {
        id: 'test-3',
        name: 'Test Product',
        sku: 'TEST-003',
        price: 100,
        cost: 50,
        stock: 100,
        category: '1',
        isActive: true
      };
      
      useBusinessStore.setState({
        ...store,
        products: [testProduct]
      });
      
      // Try to create movement with invalid type
      await expect(store.createMovementRecord(
        testProduct.id,
        'invalid_type' as any,
        10,
        'Test invalid movement',
        {
          referenceNumber: 'TEST-INV-001',
          userId: 'test-user'
        }
      )).rejects.toThrow('Invalid movement type');
    });

    it('should handle multiple sales correctly', async () => {
      const store = useBusinessStore.getState();
      
      // Add a test product directly to store
      const testProduct = {
        id: 'test-4',
        name: 'Test Product',
        sku: 'TEST-004',
        price: 100,
        cost: 50,
        stock: 100,
        category: '1',
        isActive: true
      };
      
      useBusinessStore.setState({
        ...store,
        products: [testProduct]
      });
      
      // Create multiple sale movements
      await store.createMovementRecord(
        testProduct.id,
        'sale',
        10,
        'Test sale 1',
        {
          referenceNumber: 'TEST-SALE-001',
          userId: 'test-user'
        }
      );
      
      await store.createMovementRecord(
        testProduct.id,
        'sale',
        20,
        'Test sale 2',
        {
          referenceNumber: 'TEST-SALE-002',
          userId: 'test-user'
        }
      );
      
      // Verify stock was decreased correctly
      const updatedProduct = useBusinessStore.getState().products.find(p => p.id === testProduct.id);
      expect(updatedProduct?.stock).toBe(70); // 100 - 10 - 20
    });
  });
});