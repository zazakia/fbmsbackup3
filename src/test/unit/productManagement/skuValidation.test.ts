import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Product } from '../../../types/business';

describe('SKU Uniqueness Validation and Duplicate Prevention', () => {
  let testProducts: Product[];

  beforeEach(async () => {
    await setupTestEnvironment({
      mockDatabase: true,
      loadTestData: true,
      testDataScale: 'small'
    });

    // Create test products with known SKUs
    testProducts = [
      TestDataFactory.createProduct({ sku: 'ELEC-001', name: 'Electronics Product 1' }),
      TestDataFactory.createProduct({ sku: 'ELEC-002', name: 'Electronics Product 2' }),
      TestDataFactory.createProduct({ sku: 'FOOD-001', name: 'Food Product 1' }),
      TestDataFactory.createProduct({ sku: 'CLOTH-001', name: 'Clothing Product 1' }),
      TestDataFactory.createProduct({ sku: 'HOME-001', name: 'Home Product 1' })
    ];

    // Load test data into mock database
    mockServices.supabase.setMockData('products', testProducts);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('SKU Format Validation', () => {
    it('should accept valid SKU formats', () => {
      const validSKUs = [
        'PROD-001',
        'ABC123',
        'SKU-2024-001',
        'ITEM_001',
        'P001',
        'CATEGORY-SUBCATEGORY-001',
        '12345',
        'A1B2C3'
      ];

      validSKUs.forEach(sku => {
        expect(isValidSKUFormat(sku)).toBe(true);
      });
    });

    it('should reject invalid SKU formats', () => {
      const invalidSKUs = [
        '', // Empty
        '   ', // Whitespace only
        'SKU WITH SPACES',
        'SKU@SPECIAL',
        'SKU#123',
        'SKU%001',
        'SKU&001',
        'SKU*001',
        'SKU(001)',
        'SKU+001',
        'SKU=001',
        'SKU[001]',
        'SKU{001}',
        'SKU|001',
        'SKU\\001',
        'SKU/001',
        'SKU?001',
        'SKU<001>',
        'SKU"001"',
        "SKU'001'",
        'SKU`001`',
        'SKU~001',
        'SKU!001'
      ];

      invalidSKUs.forEach(sku => {
        expect(isValidSKUFormat(sku)).toBe(false);
      });
    });

    it('should enforce SKU length limits', () => {
      const tooShort = 'A'; // Less than minimum
      const tooLong = 'A'.repeat(51); // More than maximum (assuming 50 char limit)
      const justRight = 'VALID-SKU-001';

      expect(isValidSKULength(tooShort)).toBe(false);
      expect(isValidSKULength(tooLong)).toBe(false);
      expect(isValidSKULength(justRight)).toBe(true);
    });

    it('should handle case sensitivity correctly', () => {
      const sku1 = 'PROD-001';
      const sku2 = 'prod-001';
      const sku3 = 'Prod-001';

      // Assuming SKUs are case-insensitive
      expect(normalizeSKU(sku1)).toBe(normalizeSKU(sku2));
      expect(normalizeSKU(sku1)).toBe(normalizeSKU(sku3));
    });
  });

  describe('SKU Uniqueness Validation', () => {
    it('should detect duplicate SKUs in existing products', async () => {
      const existingSKU = testProducts[0].sku;
      const newProduct = TestDataFactory.createProduct({ sku: existingSKU });

      const isDuplicate = await checkSKUExists(existingSKU);
      expect(isDuplicate).toBe(true);

      const validationResult = await validateSKUUniqueness(newProduct.sku);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toBe('SKU already exists');
    });

    it('should allow unique SKUs for new products', async () => {
      const uniqueSKU = 'UNIQUE-001';

      const isDuplicate = await checkSKUExists(uniqueSKU);
      expect(isDuplicate).toBe(false);

      const validationResult = await validateSKUUniqueness(uniqueSKU);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.error).toBeNull();
    });

    it('should handle case-insensitive duplicate detection', async () => {
      const existingSKU = testProducts[0].sku.toUpperCase();
      const duplicateSKU = existingSKU.toLowerCase();

      const validationResult = await validateSKUUniqueness(duplicateSKU);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toBe('SKU already exists');
    });

    it('should allow same SKU when updating existing product', async () => {
      const existingProduct = testProducts[0];
      const sameSKU = existingProduct.sku;

      const validationResult = await validateSKUUniqueness(sameSKU, existingProduct.id);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.error).toBeNull();
    });

    it('should detect duplicate when updating to existing SKU', async () => {
      const productToUpdate = testProducts[0];
      const existingSKU = testProducts[1].sku;

      const validationResult = await validateSKUUniqueness(existingSKU, productToUpdate.id);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toBe('SKU already exists');
    });

    it('should handle whitespace and trimming in SKU validation', async () => {
      const existingSKU = testProducts[0].sku;
      const skuWithWhitespace = `  ${existingSKU}  `;

      const validationResult = await validateSKUUniqueness(skuWithWhitespace);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toBe('SKU already exists');
    });
  });

  describe('Batch SKU Validation', () => {
    it('should validate multiple SKUs for batch operations', async () => {
      const skusToValidate = [
        'NEW-001',
        'NEW-002',
        testProducts[0].sku, // Duplicate
        'NEW-003',
        testProducts[1].sku  // Another duplicate
      ];

      const validationResults = await validateSKUsBatch(skusToValidate);

      expect(validationResults).toHaveLength(5);
      expect(validationResults[0].isValid).toBe(true);
      expect(validationResults[1].isValid).toBe(true);
      expect(validationResults[2].isValid).toBe(false);
      expect(validationResults[3].isValid).toBe(true);
      expect(validationResults[4].isValid).toBe(false);
    });

    it('should detect duplicates within the batch itself', async () => {
      const skusToValidate = [
        'NEW-001',
        'NEW-002',
        'NEW-001', // Duplicate within batch
        'NEW-003'
      ];

      const validationResults = await validateSKUsBatch(skusToValidate);

      expect(validationResults[0].isValid).toBe(true);
      expect(validationResults[1].isValid).toBe(true);
      expect(validationResults[2].isValid).toBe(false);
      expect(validationResults[2].error).toBe('Duplicate SKU in batch');
      expect(validationResults[3].isValid).toBe(true);
    });

    it('should handle empty batch validation', async () => {
      const validationResults = await validateSKUsBatch([]);
      expect(validationResults).toHaveLength(0);
    });
  });

  describe('SKU Generation and Suggestions', () => {
    it('should generate unique SKU suggestions', async () => {
      const baseSKU = 'PROD';
      const suggestions = await generateSKUSuggestions(baseSKU, 5);

      expect(suggestions).toHaveLength(5);
      suggestions.forEach(sku => {
        expect(sku).toMatch(/^PROD-\d{3}$/);
      });

      // Verify all suggestions are unique
      const uniqueSuggestions = new Set(suggestions);
      expect(uniqueSuggestions.size).toBe(suggestions.length);
    });

    it('should avoid existing SKUs in suggestions', async () => {
      const baseSKU = 'ELEC'; // Base that matches existing products
      const suggestions = await generateSKUSuggestions(baseSKU, 3);

      // Check that none of the suggestions match existing SKUs
      for (const suggestion of suggestions) {
        const exists = await checkSKUExists(suggestion);
        expect(exists).toBe(false);
      }
    });

    it('should generate SKU from product name', () => {
      const productNames = [
        'Samsung Galaxy Phone',
        'Apple iPhone 15',
        'Nike Running Shoes',
        'Coca Cola 1 Liter',
        'Office Chair Ergonomic'
      ];

      const expectedPatterns = [
        /^SAM-\d{3}$/,
        /^APP-\d{3}$/,
        /^NIK-\d{3}$/,
        /^COC-\d{3}$/,
        /^OFF-\d{3}$/
      ];

      productNames.forEach((name, index) => {
        const generatedSKU = generateSKUFromName(name);
        expect(generatedSKU).toMatch(expectedPatterns[index]);
      });
    });

    it('should handle special characters in product names', () => {
      const productNames = [
        'Product & Service',
        'Item #1 Special',
        'Product (Large)',
        'Item - Version 2.0',
        'Product/Service Bundle'
      ];

      productNames.forEach(name => {
        const generatedSKU = generateSKUFromName(name);
        expect(isValidSKUFormat(generatedSKU)).toBe(true);
        expect(generatedSKU).not.toContain('&');
        expect(generatedSKU).not.toContain('#');
        expect(generatedSKU).not.toContain('(');
        expect(generatedSKU).not.toContain(')');
        expect(generatedSKU).not.toContain('/');
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => 
        TestDataFactory.createProduct({ sku: `BULK-${i.toString().padStart(5, '0')}` })
      );

      mockServices.supabase.setMockData('products', largeDataset);

      const startTime = performance.now();
      const validationResult = await validateSKUUniqueness('NEW-SKU-001');
      const endTime = performance.now();

      expect(validationResult.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should use efficient search algorithms for SKU lookup', async () => {
      const testSKU = 'SEARCH-TEST-001';
      
      // Mock efficient search implementation
      const searchSpy = vi.fn().mockResolvedValue(false);
      
      // Replace the search function temporarily
      const originalCheck = checkSKUExists;
      (global as any).checkSKUExists = searchSpy;

      await validateSKUUniqueness(testSKU);

      expect(searchSpy).toHaveBeenCalledWith(testSKU);
      expect(searchSpy).toHaveBeenCalledTimes(1);

      // Restore original function
      (global as any).checkSKUExists = originalCheck;
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Simulate database error
      mockServices.supabase.setMockError(new Error('Database connection failed'));

      const validationResult = await validateSKUUniqueness('TEST-SKU');

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toBe('Unable to validate SKU uniqueness');
    });

    it('should handle network timeouts', async () => {
      // Simulate network timeout
      mockServices.supabase.setMockDelay(5000);

      const startTime = performance.now();
      const validationResult = await validateSKUUniqueness('TEST-SKU', undefined, 1000); // 1 second timeout
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.error).toBe('Validation timeout');
    });

    it('should provide meaningful error messages', async () => {
      const testCases = [
        { sku: '', expectedError: 'SKU cannot be empty' },
        { sku: '   ', expectedError: 'SKU cannot be empty' },
        { sku: 'A'.repeat(51), expectedError: 'SKU too long' },
        { sku: 'SKU WITH SPACES', expectedError: 'SKU contains invalid characters' },
        { sku: 'SKU@SPECIAL', expectedError: 'SKU contains invalid characters' }
      ];

      for (const testCase of testCases) {
        const validationResult = await validateSKUUniqueness(testCase.sku);
        expect(validationResult.isValid).toBe(false);
        expect(validationResult.error).toBe(testCase.expectedError);
      }
    });
  });
});

// Helper functions for SKU validation
function isValidSKUFormat(sku: string): boolean {
  if (!sku || typeof sku !== 'string') return false;
  
  // Allow alphanumeric characters, hyphens, and underscores
  const validPattern = /^[A-Za-z0-9_-]+$/;
  return validPattern.test(sku.trim());
}

function isValidSKULength(sku: string): boolean {
  const trimmed = sku?.trim() || '';
  return trimmed.length >= 2 && trimmed.length <= 50;
}

function normalizeSKU(sku: string): string {
  return sku?.trim().toUpperCase() || '';
}

async function checkSKUExists(sku: string, excludeId?: string): Promise<boolean> {
  try {
    const normalizedSKU = normalizeSKU(sku);
    
    let query = mockServices.supabase
      .from('products')
      .select('id')
      .ilike('sku', normalizedSKU);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const result = await query.single();
    return result.data !== null;
  } catch (error) {
    // If no results found, SKU doesn't exist
    return false;
  }
}

async function validateSKUUniqueness(
  sku: string, 
  excludeId?: string, 
  timeout?: number
): Promise<{ isValid: boolean; error: string | null }> {
  try {
    // Basic format validation
    if (!sku || !sku.trim()) {
      return { isValid: false, error: 'SKU cannot be empty' };
    }

    if (!isValidSKUFormat(sku)) {
      return { isValid: false, error: 'SKU contains invalid characters' };
    }

    if (!isValidSKULength(sku)) {
      return { isValid: false, error: sku.trim().length > 50 ? 'SKU too long' : 'SKU too short' };
    }

    // Check uniqueness with optional timeout
    const checkPromise = checkSKUExists(sku, excludeId);
    
    let exists: boolean;
    if (timeout) {
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Validation timeout')), timeout)
      );
      exists = await Promise.race([checkPromise, timeoutPromise]);
    } else {
      exists = await checkPromise;
    }

    if (exists) {
      return { isValid: false, error: 'SKU already exists' };
    }

    return { isValid: true, error: null };
  } catch (error) {
    if (error instanceof Error && error.message === 'Validation timeout') {
      return { isValid: false, error: 'Validation timeout' };
    }
    return { isValid: false, error: 'Unable to validate SKU uniqueness' };
  }
}

async function validateSKUsBatch(skus: string[]): Promise<Array<{ sku: string; isValid: boolean; error: string | null }>> {
  const results: Array<{ sku: string; isValid: boolean; error: string | null }> = [];
  const seenSKUs = new Set<string>();

  for (const sku of skus) {
    const normalizedSKU = normalizeSKU(sku);
    
    // Check for duplicates within the batch
    if (seenSKUs.has(normalizedSKU)) {
      results.push({ sku, isValid: false, error: 'Duplicate SKU in batch' });
      continue;
    }
    
    seenSKUs.add(normalizedSKU);
    
    // Validate against existing products
    const validationResult = await validateSKUUniqueness(sku);
    results.push({ sku, ...validationResult });
  }

  return results;
}

async function generateSKUSuggestions(baseSKU: string, count: number): Promise<string[]> {
  const suggestions: string[] = [];
  let counter = 1;

  while (suggestions.length < count) {
    const suggestion = `${baseSKU}-${counter.toString().padStart(3, '0')}`;
    const exists = await checkSKUExists(suggestion);
    
    if (!exists) {
      suggestions.push(suggestion);
    }
    
    counter++;
    
    // Prevent infinite loop
    if (counter > 9999) break;
  }

  return suggestions;
}

function generateSKUFromName(productName: string): string {
  // Extract first 3 letters from the first word
  const firstWord = productName.split(' ')[0];
  const prefix = firstWord.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
  
  // Generate random 3-digit number
  const suffix = Math.floor(Math.random() * 900 + 100).toString();
  
  return `${prefix}-${suffix}`;
}