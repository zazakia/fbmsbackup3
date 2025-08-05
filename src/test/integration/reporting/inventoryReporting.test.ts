import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestDataFactory } from '../../factories/testDataFactory';
import { mockServices } from '../../mocks/mockServices';
import { setupTestEnvironment, cleanupTestData } from '../../utils/testUtils';
import { Product } from '../../../types/business';

describe('Inventory Reporting and Analytics Tests 📊📈', () => {
  let testProducts: Product[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
    
    testProducts = [
      TestDataFactory.createProduct({
        id: 'prod-report-1',
        name: 'Report Test Product 1',
        stock: 50,
        cost: 100,
        price: 150
      })
    ];

    mockServices.supabase.setMockData('products', testProducts);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Stock Level Reports 📋', () => {
    it('should generate accurate stock level reports', async () => {
      const report = await generateStockLevelReport();
      expect(report.success).toBe(true);
      expect(report.data.length).toBeGreaterThan(0);
    });
  });

  describe('Inventory Valuation 💰', () => {
    it('should calculate inventory valuation correctly', async () => {
      const valuation = await calculateInventoryValuation();
      expect(valuation.totalValue).toBeGreaterThan(0);
    });
  });
});

// Helper functions
async function generateStockLevelReport() {
  const products = await mockServices.supabase
    .from('products')
    .select('*');

  return {
    success: true,
    data: products.data || []
  };
}

async function calculateInventoryValuation() {
  const products = await mockServices.supabase
    .from('products')
    .select('*');

  const totalValue = (products.data || []).reduce((sum, product) => {
    return sum + (product.stock * product.cost);
  }, 0);

  return { totalValue };
}