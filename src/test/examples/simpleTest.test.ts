import { describe, it, expect } from 'vitest';
import { TestDataFactory } from '../factories/testDataFactory';

describe('Simple Test Framework Verification', () => {
  it('should create a product using TestDataFactory', () => {
    const product = TestDataFactory.createProduct();
    
    expect(product).toBeDefined();
    expect(product.id).toBeDefined();
    expect(product.name).toBeDefined();
    expect(product.sku).toBeDefined();
    expect(product.price).toBeGreaterThan(0);
    expect(product.cost).toBeGreaterThan(0);
    expect(product.stock).toBeGreaterThanOrEqual(0);
  });

  it('should create multiple products with unique SKUs', () => {
    const products = TestDataFactory.createBulkProducts(5);
    
    expect(products).toHaveLength(5);
    
    const skus = products.map(p => p.sku);
    const uniqueSkus = new Set(skus);
    expect(uniqueSkus.size).toBe(5);
  });

  it('should create realistic inventory data', () => {
    const inventoryData = TestDataFactory.createRealisticInventoryData();
    
    expect(inventoryData.products.length).toBeGreaterThan(0);
    expect(inventoryData.categories.length).toBeGreaterThan(0);
    expect(inventoryData.stockMovements.length).toBeGreaterThan(0);
  });
});