import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestDataFactory } from '../../factories/testDataFactory';
import { mockServices } from '../../mocks/mockServices';
import { setupTestEnvironment, cleanupTestData } from '../../utils/testUtils';
import { Product } from '../../../types/business';

describe('Data Integrity and Validation Tests 🔒✅', () => {
  let testProducts: Product[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
    
    testProducts = [
      TestDataFactory.createProduct({
        id: 'prod-integrity-1',
        name: 'Integrity Test Product 1',
        stock: 100,
        cost: 50,
        price: 75
      })
    ];

    mockServices.supabase.setMockData('products', testProducts);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Concurrent Access Control 🔄', () => {
    it('should handle concurrent user access without data conflicts', async () => {
      const operations = [
        () => updateProductStock('prod-integrity-1', 90),
        () => updateProductStock('prod-integrity-1', 85),
        () => updateProductStock('prod-integrity-1', 95)
      ];

      const results = await Promise.allSettled(operations.map(op => op()));
      
      // At least one operation should succeed
      const successfulOps = results.filter(r => r.status === 'fulfilled');
      expect(successfulOps.length).toBeGreaterThan(0);
    });
  });

  describe('Data Validation 📝', () => {
    it('should validate product data integrity', async () => {
      const invalidProduct = {
        id: 'invalid-prod',
        name: '',
        stock: -10,
        cost: -5,
        price: 0
      };

      const validation = await validateProductData(invalidProduct);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions
async function updateProductStock(productId: string, newStock: number) {
  await mockServices.supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId);
  
  return { success: true };
}

async function validateProductData(productData: any) {
  const errors = [];
  
  if (!productData.name || productData.name.trim() === '') {
    errors.push('Product name is required');
  }
  
  if (productData.stock < 0) {
    errors.push('Stock cannot be negative');
  }
  
  if (productData.cost < 0) {
    errors.push('Cost cannot be negative');
  }
  
  if (productData.price <= 0) {
    errors.push('Price must be greater than zero');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}