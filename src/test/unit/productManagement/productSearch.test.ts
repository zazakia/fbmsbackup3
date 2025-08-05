import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Product, Category } from '../../../types/business';

describe('Product Search and Filtering Functionality', () => {
  let testProducts: Product[];
  let testCategories: Category[];

  beforeEach(async () => {
    await setupTestEnvironment({
      mockDatabase: true,
      loadTestData: true,
      testDataScale: 'small'
    });

    // Create test categories
    testCategories = [
      TestDataFactory.createCategory({ id: 'cat-1', name: 'Electronics' }),
      TestDataFactory.createCategory({ id: 'cat-2', name: 'Clothing' }),
      TestDataFactory.createCategory({ id: 'cat-3', name: 'Food & Beverages' })
    ];

    // Create test products with specific search-friendly data
    testProducts = [
      TestDataFactory.createProduct({
        name: 'Samsung Galaxy Phone',
        sku: 'ELEC-001',
        barcode: '1234567890123',
        description: 'Latest Samsung smartphone with advanced features',
        categoryId: 'cat-1',
        category: 'Electronics',
        price: 25000,
        tags: ['smartphone', 'android', 'samsung']
      }),
      TestDataFactory.createProduct({
        name: 'Apple iPhone 15',
        sku: 'ELEC-002',
        barcode: '2345678901234',
        description: 'Premium Apple iPhone with iOS',
        categoryId: 'cat-1',
        category: 'Electronics',
        price: 45000,
        tags: ['smartphone', 'ios', 'apple']
      }),
      TestDataFactory.createProduct({
        name: 'Nike Running Shoes',
        sku: 'CLOTH-001',
        barcode: '3456789012345',
        description: 'Comfortable running shoes for athletes',
        categoryId: 'cat-2',
        category: 'Clothing',
        price: 5000,
        tags: ['shoes', 'running', 'nike']
      }),
      TestDataFactory.createProduct({
        name: 'Coca Cola 1 Liter',
        sku: 'FOOD-001',
        barcode: '4567890123456',
        description: 'Refreshing cola drink',
        categoryId: 'cat-3',
        category: 'Food & Beverages',
        price: 50,
        tags: ['beverage', 'cola', 'soft drink']
      }),
      TestDataFactory.createProduct({
        name: 'Samsung TV 55 inch',
        sku: 'ELEC-003',
        barcode: '5678901234567',
        description: 'Large screen smart TV',
        categoryId: 'cat-1',
        category: 'Electronics',
        price: 35000,
        tags: ['tv', 'smart tv', 'samsung']
      })
    ];

    mockServices.supabase.setMockData('products', testProducts);
    mockServices.supabase.setMockData('categories', testCategories);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Text-based Search', () => {
    it('should search products by name', async () => {
      const searchTerm = 'Samsung';
      const results = await searchProducts(searchTerm);

      expect(results.products).toHaveLength(2);
      expect(results.products.every(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))).toBe(true);
    });

    it('should search products by SKU', async () => {
      const searchTerm = 'ELEC-001';
      const results = await searchProducts(searchTerm);

      expect(results.products).toHaveLength(1);
      expect(results.products[0].sku).toBe(searchTerm);
    });

    it('should search products by barcode', async () => {
      const searchTerm = '1234567890123';
      const results = await searchProducts(searchTerm);

      expect(results.products).toHaveLength(1);
      expect(results.products[0].barcode).toBe(searchTerm);
    });

    it('should search products by description', async () => {
      const searchTerm = 'smartphone';
      const results = await searchProducts(searchTerm);

      expect(results.products).toHaveLength(2);
      expect(results.products.every(p => 
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )).toBe(true);
    });

    it('should perform case-insensitive search', async () => {
      const searchTerms = ['samsung', 'SAMSUNG', 'Samsung', 'sAmSuNg'];

      for (const term of searchTerms) {
        const results = await searchProducts(term);
        expect(results.products).toHaveLength(2);
      }
    });

    it('should handle partial word matching', async () => {
      const searchTerm = 'Gala'; // Partial match for "Galaxy"
      const results = await searchProducts(searchTerm);

      expect(results.products).toHaveLength(1);
      expect(results.products[0].name).toContain('Galaxy');
    });

    it('should handle multiple word search', async () => {
      const searchTerm = 'Samsung Phone';
      const results = await searchProducts(searchTerm);

      expect(results.products).toHaveLength(1);
      expect(results.products[0].name).toBe('Samsung Galaxy Phone');
    });

    it('should return empty results for non-matching search', async () => {
      const searchTerm = 'NonExistentProduct';
      const results = await searchProducts(searchTerm);

      expect(results.products).toHaveLength(0);
    });

    it('should handle special characters in search', async () => {
      const searchTerms = ['55 inch', 'iPhone 15', 'Coca Cola'];

      for (const term of searchTerms) {
        const results = await searchProducts(term);
        expect(results.products.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Category-based Filtering', () => {
    it('should filter products by category', async () => {
      const categoryId = 'cat-1';
      const results = await searchProducts('', { categoryId });

      expect(results.products).toHaveLength(3); // All electronics
      expect(results.products.every(p => p.categoryId === categoryId)).toBe(true);
    });

    it('should combine text search with category filter', async () => {
      const searchTerm = 'Samsung';
      const categoryId = 'cat-1';
      const results = await searchProducts(searchTerm, { categoryId });

      expect(results.products).toHaveLength(2);
      expect(results.products.every(p => 
        p.categoryId === categoryId && 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )).toBe(true);
    });

    it('should handle multiple category filtering', async () => {
      const categoryIds = ['cat-1', 'cat-2'];
      const results = await searchProducts('', { categoryIds });

      expect(results.products).toHaveLength(4); // Electronics + Clothing
      expect(results.products.every(p => categoryIds.includes(p.categoryId))).toBe(true);
    });
  });

  describe('Price Range Filtering', () => {
    it('should filter products by minimum price', async () => {
      const minPrice = 10000;
      const results = await searchProducts('', { minPrice });

      expect(results.products.every(p => p.price >= minPrice)).toBe(true);
    });

    it('should filter products by maximum price', async () => {
      const maxPrice = 10000;
      const results = await searchProducts('', { maxPrice });

      expect(results.products.every(p => p.price <= maxPrice)).toBe(true);
    });

    it('should filter products by price range', async () => {
      const minPrice = 1000;
      const maxPrice = 30000;
      const results = await searchProducts('', { minPrice, maxPrice });

      expect(results.products.every(p => p.price >= minPrice && p.price <= maxPrice)).toBe(true);
    });

    it('should handle exact price matching', async () => {
      const exactPrice = 5000;
      const results = await searchProducts('', { minPrice: exactPrice, maxPrice: exactPrice });

      expect(results.products).toHaveLength(1);
      expect(results.products[0].price).toBe(exactPrice);
    });
  });

  describe('Stock-based Filtering', () => {
    it('should filter products in stock', async () => {
      const results = await searchProducts('', { inStock: true });

      expect(results.products.every(p => p.stock > 0)).toBe(true);
    });

    it('should filter products out of stock', async () => {
      // Add out of stock product
      const outOfStockProduct = TestDataFactory.createProduct({ stock: 0 });
      const updatedProducts = [...testProducts, outOfStockProduct];
      mockServices.supabase.setMockData('products', updatedProducts);

      const results = await searchProducts('', { outOfStock: true });

      expect(results.products.every(p => p.stock === 0)).toBe(true);
    });

    it('should filter products by minimum stock level', async () => {
      const minStock = 50;
      const results = await searchProducts('', { minStock });

      expect(results.products.every(p => p.stock >= minStock)).toBe(true);
    });

    it('should filter products below minimum stock threshold', async () => {
      const results = await searchProducts('', { belowMinStock: true });

      expect(results.products.every(p => p.stock < p.minStock)).toBe(true);
    });
  });

  describe('Tag-based Search', () => {
    it('should search products by tags', async () => {
      const tag = 'smartphone';
      const results = await searchProducts('', { tags: [tag] });

      expect(results.products).toHaveLength(2);
      expect(results.products.every(p => p.tags.includes(tag))).toBe(true);
    });

    it('should search products by multiple tags (OR logic)', async () => {
      const tags = ['samsung', 'nike'];
      const results = await searchProducts('', { tags, tagLogic: 'OR' });

      expect(results.products).toHaveLength(3); // 2 Samsung + 1 Nike
      expect(results.products.every(p => 
        tags.some(tag => p.tags.includes(tag))
      )).toBe(true);
    });

    it('should search products by multiple tags (AND logic)', async () => {
      const tags = ['smartphone', 'samsung'];
      const results = await searchProducts('', { tags, tagLogic: 'AND' });

      expect(results.products).toHaveLength(1);
      expect(results.products.every(p => 
        tags.every(tag => p.tags.includes(tag))
      )).toBe(true);
    });
  });

  describe('Sorting and Ordering', () => {
    it('should sort products by name ascending', async () => {
      const results = await searchProducts('', { sortBy: 'name', sortOrder: 'asc' });

      const names = results.products.map(p => p.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    it('should sort products by name descending', async () => {
      const results = await searchProducts('', { sortBy: 'name', sortOrder: 'desc' });

      const names = results.products.map(p => p.name);
      const sortedNames = [...names].sort().reverse();
      expect(names).toEqual(sortedNames);
    });

    it('should sort products by price ascending', async () => {
      const results = await searchProducts('', { sortBy: 'price', sortOrder: 'asc' });

      const prices = results.products.map(p => p.price);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    });

    it('should sort products by price descending', async () => {
      const results = await searchProducts('', { sortBy: 'price', sortOrder: 'desc' });

      const prices = results.products.map(p => p.price);
      const sortedPrices = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sortedPrices);
    });

    it('should sort products by stock level', async () => {
      const results = await searchProducts('', { sortBy: 'stock', sortOrder: 'asc' });

      const stockLevels = results.products.map(p => p.stock);
      const sortedStockLevels = [...stockLevels].sort((a, b) => a - b);
      expect(stockLevels).toEqual(sortedStockLevels);
    });

    it('should sort products by creation date', async () => {
      const results = await searchProducts('', { sortBy: 'createdAt', sortOrder: 'desc' });

      const dates = results.products.map(p => p.createdAt.getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('Pagination', () => {
    it('should paginate search results', async () => {
      const pageSize = 2;
      const page1 = await searchProducts('', { limit: pageSize, offset: 0 });
      const page2 = await searchProducts('', { limit: pageSize, offset: pageSize });

      expect(page1.products).toHaveLength(pageSize);
      expect(page2.products).toHaveLength(pageSize);
      
      // Ensure no overlap between pages
      const page1Ids = page1.products.map(p => p.id);
      const page2Ids = page2.products.map(p => p.id);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));
      expect(overlap).toHaveLength(0);
    });

    it('should handle last page with fewer results', async () => {
      const pageSize = 3;
      const totalProducts = testProducts.length;
      const lastPageOffset = Math.floor(totalProducts / pageSize) * pageSize;
      const expectedLastPageSize = totalProducts % pageSize;

      const lastPage = await searchProducts('', { limit: pageSize, offset: lastPageOffset });

      expect(lastPage.products).toHaveLength(expectedLastPageSize);
    });

    it('should return total count for pagination', async () => {
      const results = await searchProducts('', { includeTotalCount: true });

      expect(results.totalCount).toBe(testProducts.length);
      expect(results.products).toHaveLength(testProducts.length);
    });
  });

  describe('Advanced Search Features', () => {
    it('should support fuzzy search for typos', async () => {
      const searchTerm = 'Samsng'; // Missing 'u' in Samsung
      const results = await searchProducts(searchTerm, { fuzzySearch: true });

      expect(results.products.length).toBeGreaterThan(0);
      expect(results.products.some(p => p.name.includes('Samsung'))).toBe(true);
    });

    it('should highlight search terms in results', async () => {
      const searchTerm = 'Samsung';
      const results = await searchProducts(searchTerm, { highlightMatches: true });

      expect(results.products.length).toBeGreaterThan(0);
      results.products.forEach(product => {
        expect(product.highlightedName).toBeDefined();
        expect(product.highlightedDescription).toBeDefined();
      });
    });

    it('should provide search suggestions', async () => {
      const partialTerm = 'Sam';
      const suggestions = await getSearchSuggestions(partialTerm);

      expect(suggestions).toContain('Samsung');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should track search analytics', async () => {
      const searchTerm = 'iPhone';
      await searchProducts(searchTerm, { trackAnalytics: true });

      const analytics = await getSearchAnalytics();
      expect(analytics.recentSearches).toContain(searchTerm);
      expect(analytics.searchCount[searchTerm]).toBe(1);
    });

    it('should support search within results', async () => {
      // First search
      const initialResults = await searchProducts('Electronics');
      
      // Search within results
      const refinedResults = await searchProducts('Samsung', { 
        searchWithin: initialResults.products.map(p => p.id) 
      });

      expect(refinedResults.products.length).toBeLessThanOrEqual(initialResults.products.length);
      expect(refinedResults.products.every(p => p.name.includes('Samsung'))).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large result sets efficiently', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => 
        TestDataFactory.createProduct({ name: `Product ${i}` })
      );
      mockServices.supabase.setMockData('products', largeDataset);

      const startTime = performance.now();
      const results = await searchProducts('Product');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(results.products.length).toBeGreaterThan(0);
    });

    it('should implement search result caching', async () => {
      const searchTerm = 'Samsung';
      
      // First search (should cache)
      const startTime1 = performance.now();
      const results1 = await searchProducts(searchTerm, { useCache: true });
      const endTime1 = performance.now();

      // Second search (should use cache)
      const startTime2 = performance.now();
      const results2 = await searchProducts(searchTerm, { useCache: true });
      const endTime2 = performance.now();

      expect(results1.products).toEqual(results2.products);
      expect(endTime2 - startTime2).toBeLessThan(endTime1 - startTime1);
    });

    it('should optimize database queries', async () => {
      const searchSpy = vi.fn();
      
      // Mock query optimization
      const originalFrom = mockServices.supabase.from;
      mockServices.supabase.from = vi.fn().mockImplementation((table) => {
        searchSpy();
        return originalFrom.call(mockServices.supabase, table);
      });

      await searchProducts('Samsung', { optimizeQuery: true });

      expect(searchSpy).toHaveBeenCalledTimes(1); // Should make only one optimized query
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockServices.supabase.setMockError(new Error('Database connection failed'));

      const results = await searchProducts('Samsung');

      expect(results.products).toHaveLength(0);
      expect(results.error).toBe('Search temporarily unavailable');
    });

    it('should handle invalid search parameters', async () => {
      const results = await searchProducts('', { 
        minPrice: -100, // Invalid negative price
        maxPrice: 'invalid' as any // Invalid type
      });

      expect(results.products).toHaveLength(0);
      expect(results.error).toBe('Invalid search parameters');
    });

    it('should handle search timeout', async () => {
      mockServices.supabase.setMockDelay(10000); // 10 second delay

      const results = await searchProducts('Samsung', { timeout: 1000 }); // 1 second timeout

      expect(results.products).toHaveLength(0);
      expect(results.error).toBe('Search timeout');
    });
  });
});

// Helper functions for product search
interface SearchOptions {
  categoryId?: string;
  categoryIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  outOfStock?: boolean;
  minStock?: number;
  belowMinStock?: boolean;
  tags?: string[];
  tagLogic?: 'AND' | 'OR';
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeTotalCount?: boolean;
  fuzzySearch?: boolean;
  highlightMatches?: boolean;
  trackAnalytics?: boolean;
  searchWithin?: string[];
  useCache?: boolean;
  optimizeQuery?: boolean;
  timeout?: number;
}

interface SearchResult {
  products: (Product & { 
    highlightedName?: string; 
    highlightedDescription?: string; 
  })[];
  totalCount?: number;
  error?: string;
}

async function searchProducts(searchTerm: string, options: SearchOptions = {}): Promise<SearchResult> {
  try {
    // Handle timeout
    if (options.timeout) {
      const timeoutPromise = new Promise<SearchResult>((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), options.timeout)
      );
      
      const searchPromise = performSearch(searchTerm, options);
      
      try {
        return await Promise.race([searchPromise, timeoutPromise]);
      } catch (error) {
        return { products: [], error: 'Search timeout' };
      }
    }

    return await performSearch(searchTerm, options);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Database')) {
      return { products: [], error: 'Search temporarily unavailable' };
    }
    return { products: [], error: 'Invalid search parameters' };
  }
}

async function performSearch(searchTerm: string, options: SearchOptions): Promise<SearchResult> {
  let query = mockServices.supabase.from('products').select('*');

  // Text search
  if (searchTerm.trim()) {
    const searchPattern = `%${searchTerm}%`;
    query = query.or(`name.ilike.${searchPattern},sku.ilike.${searchPattern},barcode.ilike.${searchPattern},description.ilike.${searchPattern}`);
  }

  // Category filtering
  if (options.categoryId) {
    query = query.eq('category_id', options.categoryId);
  }
  if (options.categoryIds && options.categoryIds.length > 0) {
    query = query.in('category_id', options.categoryIds);
  }

  // Price filtering
  if (options.minPrice !== undefined) {
    query = query.gte('price', options.minPrice);
  }
  if (options.maxPrice !== undefined) {
    query = query.lte('price', options.maxPrice);
  }

  // Stock filtering
  if (options.inStock) {
    query = query.gt('stock', 0);
  }
  if (options.outOfStock) {
    query = query.eq('stock', 0);
  }
  if (options.minStock !== undefined) {
    query = query.gte('stock', options.minStock);
  }

  // Search within specific products
  if (options.searchWithin && options.searchWithin.length > 0) {
    query = query.in('id', options.searchWithin);
  }

  // Sorting
  if (options.sortBy) {
    const ascending = options.sortOrder !== 'desc';
    query = query.order(options.sortBy, { ascending });
  }

  // Pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
  }

  const result = await query;
  let products = result.data || [];

  // Apply additional filtering that can't be done in SQL
  if (options.belowMinStock) {
    products = products.filter(p => p.stock < p.min_stock);
  }

  if (options.tags && options.tags.length > 0) {
    if (options.tagLogic === 'AND') {
      products = products.filter(p => 
        options.tags!.every(tag => p.tags?.includes(tag))
      );
    } else {
      products = products.filter(p => 
        options.tags!.some(tag => p.tags?.includes(tag))
      );
    }
  }

  // Apply highlighting if requested
  if (options.highlightMatches && searchTerm.trim()) {
    products = products.map(product => ({
      ...product,
      highlightedName: highlightText(product.name, searchTerm),
      highlightedDescription: product.description ? highlightText(product.description, searchTerm) : undefined
    }));
  }

  // Track analytics if requested
  if (options.trackAnalytics && searchTerm.trim()) {
    await trackSearchAnalytics(searchTerm);
  }

  return {
    products,
    totalCount: options.includeTotalCount ? products.length : undefined
  };
}

function highlightText(text: string, searchTerm: string): string {
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

async function getSearchSuggestions(partialTerm: string): Promise<string[]> {
  const result = await mockServices.supabase
    .from('products')
    .select('name')
    .ilike('name', `%${partialTerm}%`)
    .limit(10);

  const suggestions = new Set<string>();
  
  (result.data || []).forEach(product => {
    const words = product.name.split(' ');
    words.forEach(word => {
      if (word.toLowerCase().startsWith(partialTerm.toLowerCase())) {
        suggestions.add(word);
      }
    });
  });

  return Array.from(suggestions);
}

let searchAnalytics = {
  recentSearches: [] as string[],
  searchCount: {} as Record<string, number>
};

async function trackSearchAnalytics(searchTerm: string): Promise<void> {
  searchAnalytics.recentSearches.unshift(searchTerm);
  searchAnalytics.recentSearches = searchAnalytics.recentSearches.slice(0, 100); // Keep last 100

  searchAnalytics.searchCount[searchTerm] = (searchAnalytics.searchCount[searchTerm] || 0) + 1;
}

async function getSearchAnalytics(): Promise<typeof searchAnalytics> {
  return { ...searchAnalytics };
}