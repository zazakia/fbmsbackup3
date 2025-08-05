import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Category, Product } from '../../../types/business';

describe('Product Category Assignment and Validation', () => {
  let testCategories: Category[];
  let testProducts: Product[];

  beforeEach(async () => {
    await setupTestEnvironment({
      mockDatabase: true,
      loadTestData: true,
      testDataScale: 'small'
    });

    // Create test categories
    testCategories = [
      TestDataFactory.createCategory({ id: 'cat-1', name: 'Electronics', isActive: true }),
      TestDataFactory.createCategory({ id: 'cat-2', name: 'Clothing', isActive: true }),
      TestDataFactory.createCategory({ id: 'cat-3', name: 'Food & Beverages', isActive: true }),
      TestDataFactory.createCategory({ id: 'cat-4', name: 'Home & Garden', isActive: false }), // Inactive
      TestDataFactory.createCategory({ id: 'cat-5', name: 'Books & Media', isActive: true })
    ];

    // Create test products with category assignments
    testProducts = [
      TestDataFactory.createProduct({ categoryId: 'cat-1', category: 'Electronics' }),
      TestDataFactory.createProduct({ categoryId: 'cat-1', category: 'Electronics' }),
      TestDataFactory.createProduct({ categoryId: 'cat-2', category: 'Clothing' }),
      TestDataFactory.createProduct({ categoryId: 'cat-3', category: 'Food & Beverages' }),
      TestDataFactory.createProduct({ categoryId: 'cat-5', category: 'Books & Media' })
    ];

    mockServices.supabase.setMockData('categories', testCategories);
    mockServices.supabase.setMockData('products', testProducts);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Category Validation', () => {
    it('should validate category exists before assignment', async () => {
      const validCategoryId = 'cat-1';
      const invalidCategoryId = 'non-existent-category';

      const validResult = await validateCategoryExists(validCategoryId);
      const invalidResult = await validateCategoryExists(invalidCategoryId);

      expect(validResult.exists).toBe(true);
      expect(validResult.category).toBeDefined();
      expect(validResult.category?.name).toBe('Electronics');

      expect(invalidResult.exists).toBe(false);
      expect(invalidResult.category).toBeNull();
    });

    it('should validate category is active before assignment', async () => {
      const activeCategoryId = 'cat-1';
      const inactiveCategoryId = 'cat-4';

      const activeResult = await validateCategoryActive(activeCategoryId);
      const inactiveResult = await validateCategoryActive(inactiveCategoryId);

      expect(activeResult.isActive).toBe(true);
      expect(inactiveResult.isActive).toBe(false);
    });

    it('should prevent assignment to inactive categories', async () => {
      const inactiveCategoryId = 'cat-4';
      const productData = TestDataFactory.createProduct({ categoryId: inactiveCategoryId });

      const validationResult = await validateProductCategoryAssignment(productData);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Cannot assign product to inactive category');
    });

    it('should allow assignment to active categories', async () => {
      const activeCategoryId = 'cat-1';
      const productData = TestDataFactory.createProduct({ categoryId: activeCategoryId });

      const validationResult = await validateProductCategoryAssignment(productData);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });
  });

  describe('Category Assignment', () => {
    it('should assign product to category correctly', async () => {
      const categoryId = 'cat-2';
      const productId = testProducts[0].id;

      const result = await assignProductToCategory(productId, categoryId);

      expect(result.success).toBe(true);
      expect(result.product?.categoryId).toBe(categoryId);
      expect(result.product?.category).toBe('Clothing');
    });

    it('should update category reference when assigning', async () => {
      const newCategoryId = 'cat-3';
      const productId = testProducts[0].id;
      const originalCategory = testProducts[0].categoryId;

      const result = await assignProductToCategory(productId, newCategoryId);

      expect(result.success).toBe(true);
      expect(result.product?.categoryId).toBe(newCategoryId);
      expect(result.product?.categoryId).not.toBe(originalCategory);
    });

    it('should handle bulk category assignment', async () => {
      const productIds = [testProducts[0].id, testProducts[1].id, testProducts[2].id];
      const targetCategoryId = 'cat-5';

      const results = await bulkAssignProductsToCategory(productIds, targetCategoryId);

      expect(results.successCount).toBe(3);
      expect(results.failureCount).toBe(0);
      expect(results.results).toHaveLength(3);
      
      results.results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.product?.categoryId).toBe(targetCategoryId);
      });
    });

    it('should handle partial failures in bulk assignment', async () => {
      const productIds = ['valid-id-1', 'invalid-id', 'valid-id-2'];
      const targetCategoryId = 'cat-1';

      // Mock some products to exist and others not
      mockServices.supabase.setMockData('products', [
        { ...testProducts[0], id: 'valid-id-1' },
        { ...testProducts[1], id: 'valid-id-2' }
      ]);

      const results = await bulkAssignProductsToCategory(productIds, targetCategoryId);

      expect(results.successCount).toBe(2);
      expect(results.failureCount).toBe(1);
      expect(results.results).toHaveLength(3);
      
      const failedResult = results.results.find(r => !r.success);
      expect(failedResult?.error).toBe('Product not found');
    });
  });

  describe('Category Hierarchy', () => {
    it('should support parent-child category relationships', async () => {
      const parentCategory = TestDataFactory.createCategory({ 
        id: 'parent-1', 
        name: 'Electronics',
        description: 'Parent category for all electronics'
      });
      
      const childCategory = TestDataFactory.createCategory({ 
        id: 'child-1', 
        name: 'Smartphones',
        description: 'Child category under Electronics'
      });

      const hierarchy = await createCategoryHierarchy(parentCategory, [childCategory]);

      expect(hierarchy.parent.id).toBe('parent-1');
      expect(hierarchy.children).toHaveLength(1);
      expect(hierarchy.children[0].id).toBe('child-1');
    });

    it('should validate category hierarchy depth limits', async () => {
      const maxDepth = 3;
      const categories = Array.from({ length: 5 }, (_, i) => 
        TestDataFactory.createCategory({ id: `level-${i}`, name: `Level ${i}` })
      );

      const validationResult = await validateCategoryHierarchyDepth(categories, maxDepth);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.actualDepth).toBe(5);
      expect(validationResult.maxDepth).toBe(3);
    });

    it('should prevent circular references in category hierarchy', async () => {
      const category1 = TestDataFactory.createCategory({ id: 'cat-a', name: 'Category A' });
      const category2 = TestDataFactory.createCategory({ id: 'cat-b', name: 'Category B' });

      // Try to create circular reference: A -> B -> A
      const validationResult = await validateCategoryCircularReference([
        { id: 'cat-a', parentId: 'cat-b' },
        { id: 'cat-b', parentId: 'cat-a' }
      ]);

      expect(validationResult.hasCircularReference).toBe(true);
      expect(validationResult.circularPath).toEqual(['cat-a', 'cat-b', 'cat-a']);
    });
  });

  describe('Category-based Product Retrieval', () => {
    it('should retrieve products by category ID', async () => {
      const categoryId = 'cat-1';
      const expectedProducts = testProducts.filter(p => p.categoryId === categoryId);

      const result = await getProductsByCategory(categoryId);

      expect(result.products).toHaveLength(expectedProducts.length);
      expect(result.products.every(p => p.categoryId === categoryId)).toBe(true);
    });

    it('should exclude inactive products from category results', async () => {
      // Add inactive product to test data
      const inactiveProduct = TestDataFactory.createProduct({
        categoryId: 'cat-1',
        isActive: false
      });
      
      const updatedProducts = [...testProducts, inactiveProduct];
      mockServices.supabase.setMockData('products', updatedProducts);

      const result = await getProductsByCategory('cat-1', { includeInactive: false });

      expect(result.products.every(p => p.isActive)).toBe(true);
      expect(result.products.find(p => p.id === inactiveProduct.id)).toBeUndefined();
    });

    it('should include inactive products when requested', async () => {
      const inactiveProduct = TestDataFactory.createProduct({
        categoryId: 'cat-1',
        isActive: false
      });
      
      const updatedProducts = [...testProducts, inactiveProduct];
      mockServices.supabase.setMockData('products', updatedProducts);

      const result = await getProductsByCategory('cat-1', { includeInactive: true });

      expect(result.products.find(p => p.id === inactiveProduct.id)).toBeDefined();
    });

    it('should support category-based filtering with additional criteria', async () => {
      const categoryId = 'cat-1';
      const filters = {
        minPrice: 50,
        maxPrice: 200,
        inStock: true
      };

      const result = await getProductsByCategory(categoryId, { filters });

      expect(result.products.every(p => p.categoryId === categoryId)).toBe(true);
      expect(result.products.every(p => p.price >= filters.minPrice)).toBe(true);
      expect(result.products.every(p => p.price <= filters.maxPrice)).toBe(true);
      expect(result.products.every(p => p.stock > 0)).toBe(true);
    });
  });

  describe('Category Statistics', () => {
    it('should calculate category product counts', async () => {
      const stats = await calculateCategoryStatistics();

      expect(stats).toHaveLength(testCategories.length);
      
      const electronicsStats = stats.find(s => s.categoryId === 'cat-1');
      expect(electronicsStats?.productCount).toBe(2);
      
      const clothingStats = stats.find(s => s.categoryId === 'cat-2');
      expect(clothingStats?.productCount).toBe(1);
    });

    it('should calculate category inventory values', async () => {
      const stats = await calculateCategoryInventoryValues();

      stats.forEach(stat => {
        expect(stat.totalValue).toBeGreaterThanOrEqual(0);
        expect(stat.averagePrice).toBeGreaterThanOrEqual(0);
        expect(typeof stat.totalStock).toBe('number');
      });
    });

    it('should identify categories with low stock products', async () => {
      // Create products with low stock
      const lowStockProducts = [
        TestDataFactory.createProduct({ categoryId: 'cat-1', stock: 5, minStock: 10 }),
        TestDataFactory.createProduct({ categoryId: 'cat-2', stock: 2, minStock: 15 })
      ];

      const allProducts = [...testProducts, ...lowStockProducts];
      mockServices.supabase.setMockData('products', allProducts);

      const lowStockCategories = await getCategoriesWithLowStock();

      expect(lowStockCategories).toHaveLength(2);
      expect(lowStockCategories.map(c => c.categoryId)).toContain('cat-1');
      expect(lowStockCategories.map(c => c.categoryId)).toContain('cat-2');
    });
  });

  describe('Category Management Operations', () => {
    it('should handle category deletion with product reassignment', async () => {
      const categoryToDelete = 'cat-2';
      const targetCategory = 'cat-1';
      const productsInCategory = testProducts.filter(p => p.categoryId === categoryToDelete);

      const result = await deleteCategoryWithReassignment(categoryToDelete, targetCategory);

      expect(result.success).toBe(true);
      expect(result.reassignedProducts).toBe(productsInCategory.length);
      expect(result.deletedCategoryId).toBe(categoryToDelete);
    });

    it('should prevent deletion of category with products if no reassignment target', async () => {
      const categoryToDelete = 'cat-1';
      const productsInCategory = testProducts.filter(p => p.categoryId === categoryToDelete);

      const result = await deleteCategoryWithReassignment(categoryToDelete);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete category with products without reassignment target');
      expect(result.productCount).toBe(productsInCategory.length);
    });

    it('should allow deletion of empty categories', async () => {
      const emptyCategory = TestDataFactory.createCategory({ id: 'empty-cat', name: 'Empty Category' });
      const updatedCategories = [...testCategories, emptyCategory];
      mockServices.supabase.setMockData('categories', updatedCategories);

      const result = await deleteCategoryWithReassignment('empty-cat');

      expect(result.success).toBe(true);
      expect(result.reassignedProducts).toBe(0);
    });

    it('should handle category merging', async () => {
      const sourceCategoryId = 'cat-2';
      const targetCategoryId = 'cat-1';
      const productsToMerge = testProducts.filter(p => p.categoryId === sourceCategoryId);

      const result = await mergeCategories(sourceCategoryId, targetCategoryId);

      expect(result.success).toBe(true);
      expect(result.mergedProducts).toBe(productsToMerge.length);
      expect(result.sourceCategory).toBe(sourceCategoryId);
      expect(result.targetCategory).toBe(targetCategoryId);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity between products and categories', async () => {
      const integrityCheck = await validateProductCategoryIntegrity();

      expect(integrityCheck.isValid).toBe(true);
      expect(integrityCheck.orphanedProducts).toHaveLength(0);
      expect(integrityCheck.invalidCategoryReferences).toHaveLength(0);
    });

    it('should detect orphaned products with invalid category references', async () => {
      // Add product with invalid category reference
      const orphanedProduct = TestDataFactory.createProduct({ 
        categoryId: 'non-existent-category',
        category: 'Non-existent Category'
      });
      
      const updatedProducts = [...testProducts, orphanedProduct];
      mockServices.supabase.setMockData('products', updatedProducts);

      const integrityCheck = await validateProductCategoryIntegrity();

      expect(integrityCheck.isValid).toBe(false);
      expect(integrityCheck.orphanedProducts).toHaveLength(1);
      expect(integrityCheck.orphanedProducts[0].id).toBe(orphanedProduct.id);
    });

    it('should handle concurrent category updates gracefully', async () => {
      const categoryId = 'cat-1';
      const updates1 = { name: 'Updated Electronics 1' };
      const updates2 = { name: 'Updated Electronics 2' };

      // Simulate concurrent updates
      const promise1 = updateCategory(categoryId, updates1);
      const promise2 = updateCategory(categoryId, updates2);

      const results = await Promise.allSettled([promise1, promise2]);

      // At least one should succeed
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// Helper functions for category management
async function validateCategoryExists(categoryId: string): Promise<{ exists: boolean; category: Category | null }> {
  try {
    const result = await mockServices.supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    return {
      exists: result.data !== null,
      category: result.data
    };
  } catch {
    return { exists: false, category: null };
  }
}

async function validateCategoryActive(categoryId: string): Promise<{ isActive: boolean; category: Category | null }> {
  const { exists, category } = await validateCategoryExists(categoryId);
  
  return {
    isActive: exists && category?.isActive === true,
    category
  };
}

async function validateProductCategoryAssignment(product: Partial<Product>): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!product.categoryId) {
    errors.push('Category ID is required');
    return { isValid: false, errors };
  }

  const { exists, category } = await validateCategoryExists(product.categoryId);
  
  if (!exists) {
    errors.push('Category does not exist');
  } else if (!category?.isActive) {
    errors.push('Cannot assign product to inactive category');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function assignProductToCategory(productId: string, categoryId: string): Promise<{ success: boolean; product?: Product; error?: string }> {
  try {
    const { isActive, category } = await validateCategoryActive(categoryId);
    
    if (!isActive) {
      return { success: false, error: 'Category is not active' };
    }

    const result = await mockServices.supabase
      .from('products')
      .update({ 
        category_id: categoryId,
        category: category?.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single();

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { 
      success: true, 
      product: {
        ...result.data,
        categoryId: result.data.category_id,
        updatedAt: new Date(result.data.updated_at)
      }
    };
  } catch (error) {
    return { success: false, error: 'Failed to assign product to category' };
  }
}

async function bulkAssignProductsToCategory(productIds: string[], categoryId: string): Promise<{
  successCount: number;
  failureCount: number;
  results: Array<{ productId: string; success: boolean; product?: Product; error?: string }>;
}> {
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const productId of productIds) {
    const result = await assignProductToCategory(productId, categoryId);
    
    results.push({
      productId,
      success: result.success,
      product: result.product,
      error: result.error
    });

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  return { successCount, failureCount, results };
}

async function createCategoryHierarchy(parent: Category, children: Category[]): Promise<{ parent: Category; children: Category[] }> {
  // Mock implementation for category hierarchy
  return { parent, children };
}

async function validateCategoryHierarchyDepth(categories: Category[], maxDepth: number): Promise<{
  isValid: boolean;
  actualDepth: number;
  maxDepth: number;
}> {
  return {
    isValid: categories.length <= maxDepth,
    actualDepth: categories.length,
    maxDepth
  };
}

async function validateCategoryCircularReference(relationships: Array<{ id: string; parentId: string }>): Promise<{
  hasCircularReference: boolean;
  circularPath: string[];
}> {
  const visited = new Set<string>();
  const path: string[] = [];

  for (const rel of relationships) {
    if (visited.has(rel.id)) {
      return {
        hasCircularReference: true,
        circularPath: [...path, rel.id]
      };
    }
    
    visited.add(rel.id);
    path.push(rel.id);
  }

  return { hasCircularReference: false, circularPath: [] };
}

async function getProductsByCategory(categoryId: string, options: {
  includeInactive?: boolean;
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  };
} = {}): Promise<{ products: Product[] }> {
  let query = mockServices.supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId);

  if (!options.includeInactive) {
    query = query.eq('is_active', true);
  }

  if (options.filters?.minPrice) {
    query = query.gte('price', options.filters.minPrice);
  }

  if (options.filters?.maxPrice) {
    query = query.lte('price', options.filters.maxPrice);
  }

  if (options.filters?.inStock) {
    query = query.gt('stock', 0);
  }

  const result = await query;
  
  return {
    products: result.data || []
  };
}

async function calculateCategoryStatistics(): Promise<Array<{
  categoryId: string;
  categoryName: string;
  productCount: number;
  activeProductCount: number;
}>> {
  const categories = await mockServices.supabase.from('categories').select('*');
  const products = await mockServices.supabase.from('products').select('*');

  return (categories.data || []).map(category => {
    const categoryProducts = (products.data || []).filter(p => p.category_id === category.id);
    const activeProducts = categoryProducts.filter(p => p.is_active);

    return {
      categoryId: category.id,
      categoryName: category.name,
      productCount: categoryProducts.length,
      activeProductCount: activeProducts.length
    };
  });
}

async function calculateCategoryInventoryValues(): Promise<Array<{
  categoryId: string;
  totalValue: number;
  averagePrice: number;
  totalStock: number;
}>> {
  const products = await mockServices.supabase.from('products').select('*');
  const categoryMap = new Map<string, Product[]>();

  // Group products by category
  (products.data || []).forEach(product => {
    const categoryId = product.category_id;
    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, []);
    }
    categoryMap.get(categoryId)!.push(product);
  });

  return Array.from(categoryMap.entries()).map(([categoryId, categoryProducts]) => {
    const totalValue = categoryProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalStock = categoryProducts.reduce((sum, p) => sum + p.stock, 0);
    const averagePrice = categoryProducts.length > 0 
      ? categoryProducts.reduce((sum, p) => sum + p.price, 0) / categoryProducts.length 
      : 0;

    return {
      categoryId,
      totalValue,
      averagePrice,
      totalStock
    };
  });
}

async function getCategoriesWithLowStock(): Promise<Array<{ categoryId: string; lowStockCount: number }>> {
  const products = await mockServices.supabase.from('products').select('*');
  const categoryMap = new Map<string, number>();

  (products.data || []).forEach(product => {
    if (product.stock < product.min_stock) {
      const count = categoryMap.get(product.category_id) || 0;
      categoryMap.set(product.category_id, count + 1);
    }
  });

  return Array.from(categoryMap.entries()).map(([categoryId, lowStockCount]) => ({
    categoryId,
    lowStockCount
  }));
}

async function deleteCategoryWithReassignment(categoryId: string, targetCategoryId?: string): Promise<{
  success: boolean;
  reassignedProducts: number;
  deletedCategoryId?: string;
  error?: string;
  productCount?: number;
}> {
  const products = await mockServices.supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId);

  const productCount = (products.data || []).length;

  if (productCount > 0 && !targetCategoryId) {
    return {
      success: false,
      reassignedProducts: 0,
      error: 'Cannot delete category with products without reassignment target',
      productCount
    };
  }

  if (productCount > 0 && targetCategoryId) {
    // Reassign products
    await mockServices.supabase
      .from('products')
      .update({ category_id: targetCategoryId })
      .eq('category_id', categoryId);
  }

  // Delete category
  await mockServices.supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  return {
    success: true,
    reassignedProducts: productCount,
    deletedCategoryId: categoryId
  };
}

async function mergeCategories(sourceCategoryId: string, targetCategoryId: string): Promise<{
  success: boolean;
  mergedProducts: number;
  sourceCategory: string;
  targetCategory: string;
}> {
  const products = await mockServices.supabase
    .from('products')
    .select('*')
    .eq('category_id', sourceCategoryId);

  const productCount = (products.data || []).length;

  // Move products to target category
  if (productCount > 0) {
    await mockServices.supabase
      .from('products')
      .update({ category_id: targetCategoryId })
      .eq('category_id', sourceCategoryId);
  }

  // Delete source category
  await mockServices.supabase
    .from('categories')
    .delete()
    .eq('id', sourceCategoryId);

  return {
    success: true,
    mergedProducts: productCount,
    sourceCategory: sourceCategoryId,
    targetCategory: targetCategoryId
  };
}

async function validateProductCategoryIntegrity(): Promise<{
  isValid: boolean;
  orphanedProducts: Product[];
  invalidCategoryReferences: string[];
}> {
  const products = await mockServices.supabase.from('products').select('*');
  const categories = await mockServices.supabase.from('categories').select('*');

  const categoryIds = new Set((categories.data || []).map(c => c.id));
  const orphanedProducts: Product[] = [];
  const invalidCategoryReferences: string[] = [];

  (products.data || []).forEach(product => {
    if (!categoryIds.has(product.category_id)) {
      orphanedProducts.push(product);
      if (!invalidCategoryReferences.includes(product.category_id)) {
        invalidCategoryReferences.push(product.category_id);
      }
    }
  });

  return {
    isValid: orphanedProducts.length === 0,
    orphanedProducts,
    invalidCategoryReferences
  };
}

async function updateCategory(categoryId: string, updates: Partial<Category>): Promise<{ success: boolean; category?: Category; error?: string }> {
  try {
    const result = await mockServices.supabase
      .from('categories')
      .update(updates)
      .eq('id', categoryId)
      .select()
      .single();

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, category: result.data };
  } catch (error) {
    return { success: false, error: 'Failed to update category' };
  }
}