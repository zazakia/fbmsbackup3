import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  checkStockAvailability,
  getProductsByCategory,
  searchProducts,
  getLowStockProducts,
  getProductHistory
} from '../../api/products';
import { Product } from '../../types/business';
import { mockSupabaseModule } from '../../test/mocks/supabaseMock';

// Test data factory
const createTestProduct = (overrides: Partial<Product> = {}): Omit<Product, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: 'Test Product',
  description: 'A test product for testing purposes',
  sku: 'TEST-SKU-001',
  barcode: '1234567890123',
  category: 'Electronics',
  price: 199.99,
  cost: 99.99,
  stock: 100,
  minStock: 10,
  unit: 'piece',
  isActive: true,
  ...overrides
});

const createTestProductWithId = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-test-001',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...createTestProduct(overrides)
});

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
        const expectedResult = createTestProductWithId(testProduct);

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
        const result = await getProducts();
        
        expect(result.error).toBeNull();
        expect(Array.isArray(result.data)).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });
    });

    describe('getProduct', () => {
      it('should retrieve single product by id', async () => {
        const productId = 'test-product-1';
        const result = await getProduct(productId);
        
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });
    });
  });

  describe('Stock Management', () => {
    describe('updateStock', () => {
      it('should update product stock', async () => {
        const productId = 'test-product-1';
        const newStock = 50;
        
        const result = await updateStock(productId, newStock);
        
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });
    });

    describe('checkStockAvailability', () => {
      it('should check if product has sufficient stock', async () => {
        const productId = 'test-product-1';
        const requiredQuantity = 10;
        
        const result = await checkStockAvailability(productId, requiredQuantity);
        
        expect(mockSupabase.from).toHaveBeenCalledWith('products');
      });
    });
  });
});
          sku: '',
          price: -1
        });

        const result = await createProduct(invalidProduct);

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('required');
      });

      it('should create initial stock movement record', async () => {
        const testProduct = createTestProduct({ stock: 50 });
        const expectedResult = createTestProductWithId(testProduct);

        mockSingle.mockResolvedValueOnce({
          data: expectedResult,
          error: null
        });

        // Mock stock movement creation
        vi.doMock('../../api/stockMovementAuditAPI', () => ({
          createStockMovement: vi.fn().mockResolvedValue({ error: null })
        }));

        const result = await createProduct(testProduct);

        expect(result.error).toBeNull();
        expect(result.data?.stock).toBe(50);
      });
    });

    describe('getProduct', () => {
      it('should retrieve a product by ID', async () => {
        const testProduct = createTestProductWithId();

        mockSingle.mockResolvedValueOnce({
          data: testProduct,
          error: null
        });

        const result = await getProduct(testProduct.id);

        expect(result.error).toBeNull();
        expect(result.data).toMatchObject(testProduct);
        expect(mockEq).toHaveBeenCalledWith('id', testProduct.id);
      });

      it('should handle non-existent product', async () => {
        mockSingle.mockResolvedValueOnce({
          data: null,
          error: null
        });

        const result = await getProduct('non-existent-id');

        expect(result.data).toBeNull();
        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('not found');
      });

      it('should retrieve product by SKU', async () => {
        const testProduct = createTestProductWithId({ sku: 'UNIQUE-SKU' });

        mockSingle.mockResolvedValueOnce({
          data: testProduct,
          error: null
        });

        const result = await getProduct(testProduct.sku, 'sku');

        expect(result.error).toBeNull();
        expect(result.data?.sku).toBe('UNIQUE-SKU');
        expect(mockEq).toHaveBeenCalledWith('sku', 'UNIQUE-SKU');
      });

      it('should retrieve product by barcode', async () => {
        const testProduct = createTestProductWithId({ barcode: '9876543210123' });

        mockSingle.mockResolvedValueOnce({
          data: testProduct,
          error: null
        });

        const result = await getProduct(testProduct.barcode!, 'barcode');

        expect(result.error).toBeNull();
        expect(result.data?.barcode).toBe('9876543210123');
        expect(mockEq).toHaveBeenCalledWith('barcode', '9876543210123');
      });
    });

    describe('getProducts', () => {
      it('should retrieve all products with pagination', async () => {
        const testProducts = Array.from({ length: 50 }, (_, i) => 
          createTestProductWithId({ id: `product-${i}`, name: `Product ${i}` })
        );

        mockOrder.mockReturnValue({
          range: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: testProducts, error: null })
          })
        });

        const result = await getProducts(50, 0);

        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(50);
        expect(mockOrder).toHaveBeenCalledWith('name', { ascending: true });
        expect(mockRange).toHaveBeenCalledWith(0, 49);
      });

      it('should handle empty product list', async () => {
        mockOrder.mockReturnValue({
          range: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        });

        const result = await getProducts();

        expect(result.error).toBeNull();
        expect(result.data).toEqual([]);
      });

      it('should filter active products only', async () => {
        const activeProducts = [
          createTestProductWithId({ id: 'active-1', isActive: true }),
          createTestProductWithId({ id: 'active-2', isActive: true })
        ];

        mockEq.mockReturnValue({
          order: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: activeProducts, error: null })
          })
        });

        const result = await getProducts(undefined, undefined, true);

        expect(result.error).toBeNull();
        expect(result.data?.every(p => p.isActive)).toBe(true);
        expect(mockEq).toHaveBeenCalledWith('is_active', true);
      });
    });

    describe('updateProduct', () => {
      it('should update product successfully', async () => {
        const testProduct = createTestProductWithId();
        const updates = { price: 299.99, cost: 149.99 };
        const updatedProduct = { ...testProduct, ...updates };

        mockSingle.mockResolvedValueOnce({
          data: updatedProduct,
          error: null
        });

        const result = await updateProduct(testProduct.id, updates);

        expect(result.error).toBeNull();
        expect(result.data?.price).toBe(299.99);
        expect(result.data?.cost).toBe(149.99);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
          price: 299.99,
          cost: 149.99
        }));
      });

      it('should prevent price below cost', async () => {
        const updates = { price: 50, cost: 100 };

        const result = await updateProduct('product-1', updates);

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('price cannot be below cost');
      });

      it('should validate stock changes', async () => {
        const updates = { stock: -10 };

        const result = await updateProduct('product-1', updates);

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('stock cannot be negative');
      });
    });

    describe('deleteProduct', () => {
      it('should soft delete product successfully', async () => {
        mockSingle.mockResolvedValueOnce({
          data: { is_active: false },
          error: null
        });

        const result = await deleteProduct('product-1');

        expect(result.error).toBeNull();
        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      });

      it('should prevent deletion of products with pending orders', async () => {
        // Mock checking for pending orders
        mockSingle.mockResolvedValueOnce({
          data: [{ id: 'order-1' }], // Has pending orders
          error: null
        });

        const result = await deleteProduct('product-1');

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('pending orders');
      });
    });
  });

  describe('Stock Management', () => {
    describe('updateStock', () => {
      it('should add stock successfully', async () => {
        const testProduct = createTestProductWithId({ stock: 100 });

        // Mock current product retrieval
        mockSingle.mockResolvedValueOnce({
          data: testProduct,
          error: null
        });

        // Mock stock update
        mockSingle.mockResolvedValueOnce({
          data: { ...testProduct, stock: 150 },
          error: null
        });

        const result = await updateStock(testProduct.id, 50, 'add', {
          referenceId: 'receipt-1',
          userId: 'user-1',
          reason: 'Stock received'
        });

        expect(result.error).toBeNull();
        expect(result.data?.stock).toBe(150);
      });

      it('should subtract stock successfully', async () => {
        const testProduct = createTestProductWithId({ stock: 100 });

        mockSingle.mockResolvedValueOnce({
          data: testProduct,
          error: null
        });

        mockSingle.mockResolvedValueOnce({
          data: { ...testProduct, stock: 75 },
          error: null
        });

        const result = await updateStock(testProduct.id, 25, 'subtract', {
          referenceId: 'sale-1',
          userId: 'user-1',
          reason: 'Product sold'
        });

        expect(result.error).toBeNull();
        expect(result.data?.stock).toBe(75);
      });

      it('should prevent negative stock', async () => {
        const testProduct = createTestProductWithId({ stock: 10 });

        mockSingle.mockResolvedValueOnce({
          data: testProduct,
          error: null
        });

        const result = await updateStock(testProduct.id, 20, 'subtract');

        expect(result.error).toBeTruthy();
        expect(result.error?.message).toContain('insufficient stock');
      });

      it('should set stock to specific value', async () => {
        const testProduct = createTestProductWithId({ stock: 100 });

        mockSingle.mockResolvedValueOnce({
          data: testProduct,
          error: null
        });

        mockSingle.mockResolvedValueOnce({
          data: { ...testProduct, stock: 200 },
          error: null
        });

        const result = await updateStock(testProduct.id, 200, 'set', {
          referenceId: 'inventory-adjustment-1',
          userId: 'user-1',
          reason: 'Physical count adjustment'
        });

        expect(result.error).toBeNull();
        expect(result.data?.stock).toBe(200);
      });

      it('should create stock movement audit record', async () => {
        const testProduct = createTestProductWithId({ stock: 100 });

        mockSingle.mockResolvedValue({
          data: testProduct,
          error: null
        });

        // Mock stock movement creation
        vi.doMock('../../api/stockMovementAuditAPI', () => ({
          createStockMovement: vi.fn().mockResolvedValue({ error: null })
        }));

        const result = await updateStock(testProduct.id, 25, 'add', {
          referenceId: 'receipt-1',
          userId: 'user-1',
          reason: 'Stock received'
        });

        expect(result.error).toBeNull();
      });
    });

    describe('checkStockAvailability', () => {
      it('should confirm adequate stock', async () => {
        const testProduct = createTestProductWithId({ stock: 100 });

        mockSingle.mockResolvedValueOnce({
          data: testProduct,
          error: null
        });

        const result = await checkStockAvailability(testProduct.id, 25);

        expect(result.error).toBeNull();
        expect(result.data?.available).toBe(true);
        expect(result.data?.currentStock).toBe(100);
        expect(result.data?.requestedQuantity).toBe(25);
      });

      it('should identify insufficient stock', async () => {
        const testProduct = createTestProductWithId({ stock: 10 });

        mockSingle.mockResolvedValueOnce({
          data: testProduct,
          error: null
        });

        const result = await checkStockAvailability(testProduct.id, 25);

        expect(result.error).toBeNull();
        expect(result.data?.available).toBe(false);
        expect(result.data?.shortage).toBe(15);
      });

      it('should handle multiple product availability check', async () => {
        const products = [
          createTestProductWithId({ id: 'p1', stock: 100 }),
          createTestProductWithId({ id: 'p2', stock: 50 })
        ];

        mockSingle.mockResolvedValueOnce({
          data: products,
          error: null
        });

        const checkItems = [
          { productId: 'p1', quantity: 10 },
          { productId: 'p2', quantity: 25 }
        ];

        const result = await checkStockAvailability(checkItems);

        expect(result.error).toBeNull();
        expect(result.data?.allAvailable).toBe(true);
        expect(result.data?.items).toHaveLength(2);
      });
    });

    describe('getLowStockProducts', () => {
      it('should identify products below minimum stock', async () => {
        const lowStockProducts = [
          createTestProductWithId({ id: 'low1', stock: 5, minStock: 10 }),
          createTestProductWithId({ id: 'low2', stock: 2, minStock: 15 })
        ];

        mockLt.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: lowStockProducts, error: null })
            })
          })
        });

        const result = await getLowStockProducts();

        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(2);
        expect(result.data?.every(p => p.stock < p.minStock)).toBe(true);
      });

      it('should return empty list when all products have adequate stock', async () => {
        mockLt.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        });

        const result = await getLowStockProducts();

        expect(result.error).toBeNull();
        expect(result.data).toEqual([]);
      });
    });
  });

  describe('Search and Filtering', () => {
    describe('searchProducts', () => {
      it('should search products by name', async () => {
        const searchResults = [
          createTestProductWithId({ name: 'iPhone 15 Pro' }),
          createTestProductWithId({ name: 'iPhone 15 Plus' })
        ];

        mockIlike.mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: searchResults, error: null })
            })
          })
        });

        const result = await searchProducts('iPhone');

        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(2);
        expect(mockIlike).toHaveBeenCalledWith('name', '%iPhone%');
      });

      it('should search products by SKU', async () => {
        const searchResults = [
          createTestProductWithId({ sku: 'APPLE-001' })
        ];

        mockIlike.mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: searchResults, error: null })
            })
          })
        });

        const result = await searchProducts('APPLE');

        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(1);
      });

      it('should handle empty search results', async () => {
        mockIlike.mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        });

        const result = await searchProducts('nonexistent');

        expect(result.error).toBeNull();
        expect(result.data).toEqual([]);
      });
    });

    describe('getProductsByCategory', () => {
      it('should retrieve products by category', async () => {
        const categoryProducts = [
          createTestProductWithId({ category: 'Electronics' }),
          createTestProductWithId({ category: 'Electronics' })
        ];

        mockEq.mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: categoryProducts, error: null })
            })
          })
        });

        const result = await getProductsByCategory('Electronics');

        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(2);
        expect(result.data?.every(p => p.category === 'Electronics')).toBe(true);
        expect(mockEq).toHaveBeenCalledWith('category', 'Electronics');
      });
    });
  });

  describe('Product History and Analytics', () => {
    describe('getProductHistory', () => {
      it('should retrieve product stock movement history', async () => {
        const mockHistory = [
          {
            id: 'movement-1',
            product_id: 'product-1',
            movement_type: 'add',
            quantity_delta: 50,
            reference_type: 'purchase_order',
            reference_id: 'po-1',
            created_at: new Date().toISOString(),
            performed_by: 'user-1',
            reason: 'Stock received'
          }
        ];

        mockEq.mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockHistory, error: null })
            })
          })
        });

        const result = await getProductHistory('product-1');

        expect(result.error).toBeNull();
        expect(result.data).toHaveLength(1);
        expect(result.data?.[0].movementType).toBe('add');
        expect(result.data?.[0].quantityDelta).toBe(50);
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database timeout errors', async () => {
      mockSingle.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 100)
        )
      );

      const result = await getProducts();

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('timeout');
    });

    it('should handle constraint violations gracefully', async () => {
      const constraintError = {
        code: '23514',
        message: 'Check constraint violation'
      };

      mockSingle.mockResolvedValueOnce({
        data: null,
        error: constraintError
      });

      const result = await createProduct(createTestProduct({ price: -100 }));

      expect(result.error).toBe(constraintError);
      expect(result.data).toBeNull();
    });

    it('should handle malformed product data', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { invalid: 'product data' },
        error: null
      });

      const result = await getProduct('product-1');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('invalid');
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk product operations efficiently', async () => {
      const bulkProducts = Array.from({ length: 100 }, (_, i) => 
        createTestProduct({ name: `Bulk Product ${i}`, sku: `BULK-${i}` })
      );

      const startTime = performance.now();
      
      const createPromises = bulkProducts.map(product => {
        mockSingle.mockResolvedValueOnce({
          data: createTestProductWithId(product),
          error: null
        });
        return createProduct(product);
      });

      const results = await Promise.all(createPromises);
      const endTime = performance.now();

      expect(results.every(r => r.error === null)).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should search large product catalogs efficiently', async () => {
      const largeResultSet = Array.from({ length: 500 }, (_, i) => 
        createTestProductWithId({ name: `Search Result ${i}` })
      );

      mockIlike.mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: largeResultSet, error: null })
          })
        })
      });

      const startTime = performance.now();
      const result = await searchProducts('Result');
      const endTime = performance.now();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });
});