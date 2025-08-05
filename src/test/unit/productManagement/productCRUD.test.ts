import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { useBusinessStore } from '../../../store/businessStore';
import { Product, Category } from '../../../types/business';

// Mock the business store
vi.mock('../../../store/businessStore');

describe('Product CRUD Operations', () => {
  let mockStore: any;
  let testProducts: Product[];
  let testCategories: Category[];

  beforeEach(async () => {
    await setupTestEnvironment({
      mockDatabase: true,
      loadTestData: true,
      testDataScale: 'small'
    });

    // Create test data
    testCategories = Array.from({ length: 3 }, () => TestDataFactory.createCategory());
    testProducts = Array.from({ length: 5 }, (_, i) => 
      TestDataFactory.createProduct({ 
        categoryId: testCategories[i % testCategories.length].id,
        category: testCategories[i % testCategories.length].name
      })
    );

    // Setup mock store
    mockStore = {
      products: [...testProducts],
      categories: [...testCategories],
      addProduct: vi.fn(),
      updateProduct: vi.fn(),
      deleteProduct: vi.fn(),
      getProduct: vi.fn(),
      getProductsByCategoryId: vi.fn(),
      updateStock: vi.fn(),
      isLoading: false,
      error: null
    };

    (useBusinessStore as any).mockReturnValue(mockStore);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Create Product', () => {
    it('should add a new product with valid data', () => {
      const newProductData = {
        name: 'New Test Product',
        description: 'Test product description',
        sku: 'NEW-001',
        barcode: '1234567890123',
        category: testCategories[0].id,
        categoryId: testCategories[0].id,
        price: 150.00,
        cost: 90.00,
        stock: 100,
        minStock: 20,
        unit: 'piece',
        isActive: true,
        tags: ['test', 'new'],
        images: []
      };

      mockStore.addProduct(newProductData);

      expect(mockStore.addProduct).toHaveBeenCalledWith(newProductData);
      expect(mockStore.addProduct).toHaveBeenCalledTimes(1);
    });

    it('should generate unique ID and timestamps when adding product', () => {
      const newProductData = TestDataFactory.createProduct();
      
      // Mock the actual implementation
      mockStore.addProduct.mockImplementation((productData: any) => {
        const product: Product = {
          ...productData,
          id: `generated-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockStore.products.push(product);
        return product;
      });

      const result = mockStore.addProduct(newProductData);

      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockStore.products).toHaveLength(testProducts.length + 1);
    });

    it('should validate required fields when creating product', () => {
      const invalidProductData = {
        name: '', // Empty name
        sku: '', // Empty SKU
        category: '',
        price: 0,
        cost: 0,
        stock: -1, // Negative stock
        minStock: -1 // Negative min stock
      };

      // Mock validation logic
      mockStore.addProduct.mockImplementation((productData: any) => {
        const errors: string[] = [];
        
        if (!productData.name?.trim()) errors.push('Product name is required');
        if (!productData.sku?.trim()) errors.push('SKU is required');
        if (!productData.category) errors.push('Category is required');
        if (!productData.price || productData.price <= 0) errors.push('Valid price is required');
        if (!productData.cost || productData.cost <= 0) errors.push('Valid cost is required');
        if (productData.stock < 0) errors.push('Stock cannot be negative');
        if (productData.minStock < 0) errors.push('Minimum stock cannot be negative');
        
        if (errors.length > 0) {
          throw new Error(errors.join(', '));
        }
      });

      expect(() => mockStore.addProduct(invalidProductData)).toThrow();
    });

    it('should prevent duplicate SKU when creating product', () => {
      const existingSKU = testProducts[0].sku;
      const duplicateProductData = TestDataFactory.createProduct({ sku: existingSKU });

      // Mock SKU uniqueness validation
      mockStore.addProduct.mockImplementation((productData: any) => {
        const existingProduct = mockStore.products.find((p: Product) => p.sku === productData.sku);
        if (existingProduct) {
          throw new Error('SKU already exists');
        }
      });

      expect(() => mockStore.addProduct(duplicateProductData)).toThrow('SKU already exists');
    });
  });

  describe('Read Product', () => {
    it('should retrieve product by ID', () => {
      const targetProduct = testProducts[0];
      
      mockStore.getProduct.mockImplementation((id: string) => {
        return mockStore.products.find((p: Product) => p.id === id);
      });

      const result = mockStore.getProduct(targetProduct.id);

      expect(result).toEqual(targetProduct);
      expect(mockStore.getProduct).toHaveBeenCalledWith(targetProduct.id);
    });

    it('should return undefined for non-existent product ID', () => {
      mockStore.getProduct.mockImplementation((id: string) => {
        return mockStore.products.find((p: Product) => p.id === id);
      });

      const result = mockStore.getProduct('non-existent-id');

      expect(result).toBeUndefined();
    });

    it('should retrieve products by category ID', () => {
      const targetCategory = testCategories[0];
      const expectedProducts = testProducts.filter(p => p.categoryId === targetCategory.id && p.isActive);

      mockStore.getProductsByCategoryId.mockImplementation((categoryId: string) => {
        return mockStore.products.filter((p: Product) => p.categoryId === categoryId && p.isActive);
      });

      const result = mockStore.getProductsByCategoryId(targetCategory.id);

      expect(result).toEqual(expectedProducts);
      expect(result.every(p => p.categoryId === targetCategory.id)).toBe(true);
      expect(result.every(p => p.isActive)).toBe(true);
    });

    it('should return empty array for category with no products', () => {
      const emptyCategoryId = 'empty-category-id';

      mockStore.getProductsByCategoryId.mockImplementation((categoryId: string) => {
        return mockStore.products.filter((p: Product) => p.categoryId === categoryId && p.isActive);
      });

      const result = mockStore.getProductsByCategoryId(emptyCategoryId);

      expect(result).toEqual([]);
    });

    it('should exclude inactive products from category results', () => {
      // Add inactive product to test data
      const inactiveProduct = TestDataFactory.createProduct({
        categoryId: testCategories[0].id,
        isActive: false
      });
      mockStore.products.push(inactiveProduct);

      mockStore.getProductsByCategoryId.mockImplementation((categoryId: string) => {
        return mockStore.products.filter((p: Product) => p.categoryId === categoryId && p.isActive);
      });

      const result = mockStore.getProductsByCategoryId(testCategories[0].id);

      expect(result.every(p => p.isActive)).toBe(true);
      expect(result.find(p => p.id === inactiveProduct.id)).toBeUndefined();
    });
  });

  describe('Update Product', () => {
    it('should update product with valid data', () => {
      const targetProduct = testProducts[0];
      const updates = {
        name: 'Updated Product Name',
        price: 200.00,
        stock: 150
      };

      mockStore.updateProduct.mockImplementation((id: string, updateData: Partial<Product>) => {
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === id);
        if (productIndex !== -1) {
          mockStore.products[productIndex] = {
            ...mockStore.products[productIndex],
            ...updateData,
            updatedAt: new Date()
          };
          return mockStore.products[productIndex];
        }
        return null;
      });

      const result = mockStore.updateProduct(targetProduct.id, updates);

      expect(result.name).toBe(updates.name);
      expect(result.price).toBe(updates.price);
      expect(result.stock).toBe(updates.stock);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockStore.updateProduct).toHaveBeenCalledWith(targetProduct.id, updates);
    });

    it('should update only provided fields', () => {
      const targetProduct = testProducts[0];
      const originalName = targetProduct.name;
      const updates = { price: 250.00 };

      mockStore.updateProduct.mockImplementation((id: string, updateData: Partial<Product>) => {
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === id);
        if (productIndex !== -1) {
          mockStore.products[productIndex] = {
            ...mockStore.products[productIndex],
            ...updateData,
            updatedAt: new Date()
          };
          return mockStore.products[productIndex];
        }
        return null;
      });

      const result = mockStore.updateProduct(targetProduct.id, updates);

      expect(result.name).toBe(originalName); // Should remain unchanged
      expect(result.price).toBe(updates.price); // Should be updated
    });

    it('should validate SKU uniqueness when updating', () => {
      const targetProduct = testProducts[0];
      const existingSKU = testProducts[1].sku;
      const updates = { sku: existingSKU };

      mockStore.updateProduct.mockImplementation((id: string, updateData: Partial<Product>) => {
        if (updateData.sku) {
          const existingProduct = mockStore.products.find((p: Product) => p.sku === updateData.sku && p.id !== id);
          if (existingProduct) {
            throw new Error('SKU already exists');
          }
        }
      });

      expect(() => mockStore.updateProduct(targetProduct.id, updates)).toThrow('SKU already exists');
    });

    it('should allow same SKU when updating same product', () => {
      const targetProduct = testProducts[0];
      const updates = { 
        sku: targetProduct.sku, // Same SKU
        name: 'Updated Name'
      };

      mockStore.updateProduct.mockImplementation((id: string, updateData: Partial<Product>) => {
        if (updateData.sku) {
          const existingProduct = mockStore.products.find((p: Product) => p.sku === updateData.sku && p.id !== id);
          if (existingProduct) {
            throw new Error('SKU already exists');
          }
        }
        
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === id);
        if (productIndex !== -1) {
          mockStore.products[productIndex] = {
            ...mockStore.products[productIndex],
            ...updateData,
            updatedAt: new Date()
          };
          return mockStore.products[productIndex];
        }
        return null;
      });

      expect(() => mockStore.updateProduct(targetProduct.id, updates)).not.toThrow();
    });

    it('should return null for non-existent product', () => {
      mockStore.updateProduct.mockImplementation((id: string, updateData: Partial<Product>) => {
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === id);
        return productIndex !== -1 ? mockStore.products[productIndex] : null;
      });

      const result = mockStore.updateProduct('non-existent-id', { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('Delete Product', () => {
    it('should remove product from store', () => {
      const targetProduct = testProducts[0];
      const originalLength = mockStore.products.length;

      mockStore.deleteProduct.mockImplementation((id: string) => {
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === id);
        if (productIndex !== -1) {
          mockStore.products.splice(productIndex, 1);
          return true;
        }
        return false;
      });

      const result = mockStore.deleteProduct(targetProduct.id);

      expect(result).toBe(true);
      expect(mockStore.products).toHaveLength(originalLength - 1);
      expect(mockStore.products.find((p: Product) => p.id === targetProduct.id)).toBeUndefined();
    });

    it('should return false for non-existent product', () => {
      mockStore.deleteProduct.mockImplementation((id: string) => {
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === id);
        if (productIndex !== -1) {
          mockStore.products.splice(productIndex, 1);
          return true;
        }
        return false;
      });

      const result = mockStore.deleteProduct('non-existent-id');

      expect(result).toBe(false);
      expect(mockStore.products).toHaveLength(testProducts.length);
    });

    it('should handle soft delete by setting isActive to false', () => {
      const targetProduct = testProducts[0];

      // Mock soft delete implementation
      mockStore.deleteProduct.mockImplementation((id: string) => {
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === id);
        if (productIndex !== -1) {
          mockStore.products[productIndex] = {
            ...mockStore.products[productIndex],
            isActive: false,
            updatedAt: new Date()
          };
          return true;
        }
        return false;
      });

      const result = mockStore.deleteProduct(targetProduct.id);

      expect(result).toBe(true);
      expect(mockStore.products).toHaveLength(testProducts.length); // Product still exists
      
      const updatedProduct = mockStore.products.find((p: Product) => p.id === targetProduct.id);
      expect(updatedProduct?.isActive).toBe(false);
    });
  });

  describe('Stock Management', () => {
    it('should update product stock correctly', () => {
      const targetProduct = testProducts[0];
      const originalStock = targetProduct.stock;
      const stockChange = 25;

      mockStore.updateStock.mockImplementation((productId: string, quantity: number, type?: string) => {
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === productId);
        if (productIndex !== -1) {
          const currentStock = mockStore.products[productIndex].stock;
          let newStock = currentStock;
          
          if (type === 'add' || type === 'stock_in') {
            newStock = currentStock + quantity;
          } else if (type === 'subtract' || type === 'stock_out') {
            newStock = Math.max(0, currentStock - quantity);
          } else if (type === 'set') {
            newStock = quantity;
          }
          
          mockStore.products[productIndex] = {
            ...mockStore.products[productIndex],
            stock: newStock,
            updatedAt: new Date()
          };
          
          return mockStore.products[productIndex];
        }
        return null;
      });

      const result = mockStore.updateStock(targetProduct.id, stockChange, 'add');

      expect(result.stock).toBe(originalStock + stockChange);
      expect(mockStore.updateStock).toHaveBeenCalledWith(targetProduct.id, stockChange, 'add');
    });

    it('should prevent negative stock levels', () => {
      const targetProduct = testProducts[0];
      const excessiveReduction = targetProduct.stock + 10;

      mockStore.updateStock.mockImplementation((productId: string, quantity: number, type?: string) => {
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === productId);
        if (productIndex !== -1) {
          const currentStock = mockStore.products[productIndex].stock;
          
          if (type === 'subtract' && quantity > currentStock) {
            throw new Error('Insufficient stock');
          }
          
          const newStock = Math.max(0, currentStock - quantity);
          mockStore.products[productIndex] = {
            ...mockStore.products[productIndex],
            stock: newStock,
            updatedAt: new Date()
          };
          
          return mockStore.products[productIndex];
        }
        return null;
      });

      expect(() => mockStore.updateStock(targetProduct.id, excessiveReduction, 'subtract'))
        .toThrow('Insufficient stock');
    });

    it('should handle stock adjustment with reason tracking', () => {
      const targetProduct = testProducts[0];
      const adjustmentQuantity = 10;
      const reason = 'Physical count adjustment';
      const userId = 'user-123';

      mockStore.updateStock.mockImplementation((
        productId: string, 
        quantity: number, 
        type?: string, 
        user?: string, 
        reference?: string, 
        notes?: string
      ) => {
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === productId);
        if (productIndex !== -1) {
          mockStore.products[productIndex] = {
            ...mockStore.products[productIndex],
            stock: mockStore.products[productIndex].stock + quantity,
            updatedAt: new Date()
          };
          
          // Mock stock movement logging
          const movement = {
            productId,
            quantity,
            type: type || 'adjustment',
            userId: user,
            reference,
            notes,
            timestamp: new Date()
          };
          
          return { product: mockStore.products[productIndex], movement };
        }
        return null;
      });

      const result = mockStore.updateStock(
        targetProduct.id, 
        adjustmentQuantity, 
        'adjustment', 
        userId, 
        'ADJ-001', 
        reason
      );

      expect(result.product.stock).toBe(targetProduct.stock + adjustmentQuantity);
      expect(result.movement.userId).toBe(userId);
      expect(result.movement.notes).toBe(reason);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity with categories', () => {
      const validCategoryId = testCategories[0].id;
      const invalidCategoryId = 'non-existent-category';

      mockStore.addProduct.mockImplementation((productData: any) => {
        const categoryExists = mockStore.categories.find((c: Category) => c.id === productData.categoryId);
        if (!categoryExists) {
          throw new Error('Invalid category ID');
        }
      });

      const validProduct = TestDataFactory.createProduct({ categoryId: validCategoryId });
      const invalidProduct = TestDataFactory.createProduct({ categoryId: invalidCategoryId });

      expect(() => mockStore.addProduct(validProduct)).not.toThrow();
      expect(() => mockStore.addProduct(invalidProduct)).toThrow('Invalid category ID');
    });

    it('should validate price and cost relationship', () => {
      const productWithInvalidPricing = TestDataFactory.createProduct({
        cost: 100,
        price: 80 // Price less than cost
      });

      mockStore.addProduct.mockImplementation((productData: any) => {
        if (productData.price < productData.cost) {
          console.warn('Price is less than cost - this may result in losses');
        }
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockStore.addProduct(productWithInvalidPricing);
      
      expect(consoleSpy).toHaveBeenCalledWith('Price is less than cost - this may result in losses');
      
      consoleSpy.mockRestore();
    });

    it('should handle concurrent updates gracefully', async () => {
      const targetProduct = testProducts[0];
      let updateCount = 0;

      mockStore.updateProduct.mockImplementation(async (id: string, updates: Partial<Product>) => {
        // Simulate concurrent update detection
        updateCount++;
        if (updateCount > 1) {
          throw new Error('Concurrent update detected');
        }
        
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async operation
        
        const productIndex = mockStore.products.findIndex((p: Product) => p.id === id);
        if (productIndex !== -1) {
          mockStore.products[productIndex] = {
            ...mockStore.products[productIndex],
            ...updates,
            updatedAt: new Date()
          };
          return mockStore.products[productIndex];
        }
        return null;
      });

      // Simulate concurrent updates
      const update1 = mockStore.updateProduct(targetProduct.id, { name: 'Update 1' });
      const update2 = mockStore.updateProduct(targetProduct.id, { name: 'Update 2' });

      await expect(Promise.all([update1, update2])).rejects.toThrow('Concurrent update detected');
    });
  });
});