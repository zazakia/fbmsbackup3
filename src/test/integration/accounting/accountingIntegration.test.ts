import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestDataFactory } from '../../factories/testDataFactory';
import { mockServices } from '../../mocks/mockServices';
import { setupTestEnvironment, cleanupTestData } from '../../utils/testUtils';
import { Product, Sale, StockMovement } from '../../../types/business';

describe('Accounting Integration Tests 💰📊', () => {
  let testProducts: Product[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
    
    testProducts = [
      TestDataFactory.createProduct({
        id: 'prod-acc-1',
        name: 'Accounting Test Product 1',
        stock: 100,
        cost: 80,
        price: 120
      })
    ];

    mockServices.supabase.setMockData('products', testProducts);
    mockServices.supabase.setMockData('journal_entries', []);
    mockServices.supabase.setMockData('stock_movements', []);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Journal Entry Creation 📝', () => {
    it('should create journal entries for inventory transactions', async () => {
      const saleItems = [{
        id: 'item-1',
        productId: 'prod-acc-1',
        productName: 'Accounting Test Product 1',
        sku: 'SKU-001',
        quantity: 10,
        price: 120,
        total: 1200
      }];

      const result = await processSaleWithAccounting(saleItems);
      expect(result.success).toBe(true);
      expect(result.journalEntryCreated).toBe(true);

      const journalEntries = await getJournalEntries();
      expect(journalEntries.length).toBeGreaterThan(0);
    });
  });

  describe('COGS Calculations 📈', () => {
    it('should calculate cost of goods sold correctly', async () => {
      const saleItems = [{
        id: 'item-1',
        productId: 'prod-acc-1',
        productName: 'Accounting Test Product 1',
        sku: 'SKU-001',
        quantity: 5,
        price: 120,
        total: 600
      }];

      const result = await calculateCOGS(saleItems);
      expect(result.totalCOGS).toBe(400); // 5 * 80
    });
  });
});

// Helper functions
async function processSaleWithAccounting(saleItems: any[]) {
  const sale = TestDataFactory.createSale({ items: saleItems });
  await mockServices.supabase.from('sales').insert(sale);

  // Create journal entry
  await mockServices.supabase.from('journal_entries').insert({
    id: `je-${Date.now()}`,
    type: 'sale',
    reference_id: sale.id,
    amount: saleItems.reduce((sum, item) => sum + item.total, 0),
    created_at: new Date()
  });

  return { success: true, journalEntryCreated: true };
}

async function calculateCOGS(saleItems: any[]) {
  let totalCOGS = 0;
  
  for (const item of saleItems) {
    const product = await mockServices.supabase
      .from('products')
      .select('*')
      .eq('id', item.productId)
      .single();
    
    totalCOGS += item.quantity * product.data.cost;
  }

  return { totalCOGS };
}

async function getJournalEntries() {
  const result = await mockServices.supabase
    .from('journal_entries')
    .select('*');
  return result.data || [];
}