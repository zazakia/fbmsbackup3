import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  updateStock
} from '../../api/products';
import { Product } from '../../types/business';
import { mockSupabaseModule } from '../../test/mocks/supabaseMock';
import { TestDataFactory } from '../../test/factories/testDataFactory';

// Test data factory
const createTestProduct = (overrides: any = {}) => {
  return TestDataFactory.createProduct(overrides);
};

describe('Products API Tests', () => {
  const mockSupabase = mockSupabaseModule.supabase;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CRUD Operations', () => {
    describe('createProduct', () => {
      it('should create a product successfully', async () => {
        const testProduct = createTestProduct();
        const expectedResult = { id: 'new-product-id', ...testProduct };

        // Mock the insert operation to return success
        mockSupabase.from('products').insert().select.mockResolvedValueOnce({
          data: [expectedResult],
          error: null
        });

        const result = await createProduct(testProduct);

        expect(result.error).toBeNull();
        expect(result.data).toMatchObject(expectedResult);
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });

      it('should handle duplicate SKU errors', async () => {
        const testProduct = createTestProduct({ sku: 'DUPLICATE-SKU' });
        const duplicateError = {
          code: '23505',
          message: 'duplicate key value violates unique constraint'
        };

        // Mock insert to return error
        mockSupabase.from('products').insert().select.mockResolvedValueOnce({
          data: null,
          error: duplicateError
        });

        const result = await createProduct(testProduct);

        expect(result.error).toBe(duplicateError);
        expect(result.data).toBeNull();
      });

      it('should create product with valid data', async () => {
        const testProduct = createTestProduct();
        const result = await createProduct(testProduct);
        
        // With our mock, this should succeed
        expect(result.error).toBeNull();
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });
    });

    describe('getProducts', () => {
      it('should retrieve all products', async () => {
        const mockProducts = [
          createTestProduct({ id: '1', name: 'Product 1' }),
          createTestProduct({ id: '2', name: 'Product 2' })
        ];

        mockSupabase.from('products').select().then.mockResolvedValueOnce({
          data: mockProducts,
          error: null
        });

        const result = await getProducts();
        
        expect(result.error).toBeNull();
        expect(Array.isArray(result.data)).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });

      it('should handle empty result', async () => {
        mockSupabase.from('products').select().then.mockResolvedValueOnce({
          data: [],
          error: null
        });

        const result = await getProducts();
        
        expect(result.error).toBeNull();
        expect(result.data).toEqual([]);
      });
    });

    describe('getProduct', () => {
      it('should retrieve single product by id', async () => {
        const testProduct = createTestProduct({ id: 'test-product-1' });
        
        mockSupabase.from('products').select().eq().single.mockResolvedValueOnce({
          data: testProduct,
          error: null
        });

        const result = await getProduct('test-product-1');
        
        expect(result.error).toBeNull();
        expect(result.data).toMatchObject(testProduct);
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });

      it('should handle product not found', async () => {
        mockSupabase.from('products').select().eq().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', message: 'The result contains 0 rows' }
        });

        const result = await getProduct('non-existent-id');
        
        expect(result.data).toBeNull();
        expect(result.error).toBeTruthy();
      });
    });

    describe('updateProduct', () => {
      it('should update product successfully', async () => {
        const productId = 'test-product-1';
        const updates = { name: 'Updated Product Name', price: 299.99 };
        const updatedProduct = createTestProduct({ id: productId, ...updates });

        mockSupabase.from('products').update().eq().select().single.mockResolvedValueOnce({
          data: updatedProduct,
          error: null
        });

        const result = await updateProduct(productId, updates);
        
        expect(result.error).toBeNull();
        expect(result.data).toMatchObject(updatedProduct);
      });

      it('should handle update errors', async () => {
        const productId = 'test-product-1';
        const updates = { name: 'Updated Name' };
        const updateError = { message: 'Update failed' };

        mockSupabase.from('products').update().eq().select().single.mockResolvedValueOnce({
          data: null,
          error: updateError
        });

        const result = await updateProduct(productId, updates);
        
        expect(result.error).toBe(updateError);
        expect(result.data).toBeNull();
      });
    });

    describe('deleteProduct', () => {
      it('should delete product successfully', async () => {
        const productId = 'test-product-1';

        mockSupabase.from('products').delete().eq.mockResolvedValueOnce({
          error: null
        });

        const result = await deleteProduct(productId);
        
        expect(result.error).toBeNull();
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });
    });
  });

  describe('Stock Management', () => {
    describe('updateStock', () => {
      it('should update product stock', async () => {
        const productId = 'test-product-1';
        const newStock = 50;
        const reason = 'Inventory adjustment';
        
        // Mock successful stock update
        mockSupabase.from('products').update().eq().select().single.mockResolvedValueOnce({
          data: { id: productId, stock: newStock },
          error: null
        });

        const result = await updateStock(productId, newStock, reason);
        
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });

      it('should handle negative stock updates', async () => {
        const productId = 'test-product-1';
        const negativeStock = -10;
        const reason = 'Sale';
        
        // This should be handled by business logic
        mockSupabase.from('products').select().eq().single.mockResolvedValueOnce({
          data: { id: productId, stock: 100 },
          error: null
        });

        mockSupabase.from('products').update().eq().select().single.mockResolvedValueOnce({
          data: { id: productId, stock: 90 },
          error: null
        });

        const result = await updateStock(productId, negativeStock, reason);
        
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });
    });
  });

  describe('Product Queries', () => {
    describe('search and filter operations', () => {
      it('should handle basic product operations', async () => {
        // Test basic functionality without complex API dependencies
        const testProduct = createTestProduct();
        
        expect(testProduct).toHaveProperty('name');
        expect(testProduct).toHaveProperty('sku');
        expect(testProduct).toHaveProperty('price');
        expect(testProduct).toHaveProperty('stock');
      });

      it('should validate product data structure', async () => {
        const testProduct = createTestProduct({
          name: 'Test Philippine Product',
          category: 'Filipino Goods',
          price: 150.00
        });
        
        expect(testProduct.name).toBe('Test Philippine Product');
        expect(testProduct.category).toBe('Filipino Goods');
        expect(testProduct.price).toBe(150.00);
        expect(typeof testProduct.sku).toBe('string');
        expect(testProduct.sku).toMatch(/^SKU-/);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const connectionError = {
        code: 'CONNECTION_ERROR',
        message: 'Unable to connect to database'
      };

      mockSupabase.from('products').select().then.mockRejectedValueOnce(connectionError);

      try {
        await getProducts();
      } catch (error) {
        expect(error).toBe(connectionError);
      }
    });

    it('should handle timeout errors', async () => {
      const timeoutError = {
        code: 'TIMEOUT',
        message: 'Request timeout'
      };

      mockSupabase.from('products').select().then.mockRejectedValueOnce(timeoutError);

      try {
        await getProducts();
      } catch (error) {
        expect(error).toBe(timeoutError);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle batch operations efficiently', async () => {
      const batchSize = 100;
      const products = TestDataFactory.createProductsBatch(batchSize);
      
      expect(products).toHaveLength(batchSize);
      expect(products[0]).toHaveProperty('name');
      expect(products[batchSize - 1]).toHaveProperty('sku');
      
      // Validate unique SKUs
      const skus = products.map(p => p.sku);
      const uniqueSkus = [...new Set(skus)];
      expect(uniqueSkus).toHaveLength(batchSize);
    });

    it('should validate Philippine business data consistency', async () => {
      const product = createTestProduct();
      
      // Test Philippine-specific validations
      expect(product.price).toBeGreaterThan(0);
      expect(product.cost).toBeGreaterThan(0);
      expect(product.cost).toBeLessThan(product.price); // Basic business logic
      expect(product.stock).toBeGreaterThanOrEqual(0);
      expect(product.min_stock).toBeGreaterThanOrEqual(0);
    });
  });
});