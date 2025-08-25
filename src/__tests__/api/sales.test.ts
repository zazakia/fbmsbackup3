import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSale,
  getSales,
  getSale,
  updateSale,
  processSaleTransaction,
  calculateSaleTotal,
  applySaleDiscount,
  validateSaleData
} from '../../api/sales';
import { Sale, SaleItem, PaymentMethod } from '../../types/business';

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null })
  })
};

vi.mock('../../utils/supabase', () => ({ supabase: mockSupabase }));

const createTestSale = (overrides = {}): Omit<Sale, 'id' | 'createdAt'> => ({
  customerId: 'customer-1',
  items: [{
    productId: 'product-1',
    productName: 'Test Product',
    quantity: 2,
    price: 100,
    total: 200
  }],
  subtotal: 200,
  tax: 24,
  total: 224,
  paymentMethod: 'cash' as PaymentMethod,
  status: 'completed',
  createdBy: 'user-1',
  ...overrides
});

describe('Sales API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSale', () => {
    it('should create sale successfully', async () => {
      const testSale = createTestSale();
      const expectedResult = { id: 'sale-1', createdAt: new Date(), ...testSale };

      mockSupabase.from().single.mockResolvedValueOnce({
        data: expectedResult,
        error: null
      });

      const result = await createSale(testSale);

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject(expectedResult);
    });

    it('should validate sale data before creation', async () => {
      const invalidSale = createTestSale({ items: [] });

      const result = await createSale(invalidSale);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('items');
    });
  });

  describe('processSaleTransaction', () => {
    it('should process complete sale transaction', async () => {
      const saleData = createTestSale();
      
      // Mock inventory check
      vi.doMock('../../api/products', () => ({
        checkStockAvailability: vi.fn().mockResolvedValue({
          data: { available: true }, error: null
        }),
        updateStock: vi.fn().mockResolvedValue({ error: null })
      }));

      const result = await processSaleTransaction(saleData);

      expect(result.error).toBeNull();
      expect(result.data?.status).toBe('completed');
    });

    it('should handle insufficient stock', async () => {
      const saleData = createTestSale();

      vi.doMock('../../api/products', () => ({
        checkStockAvailability: vi.fn().mockResolvedValue({
          data: { available: false, shortage: 5 }, error: null
        })
      }));

      const result = await processSaleTransaction(saleData);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('insufficient stock');
    });
  });

  describe('calculateSaleTotal', () => {
    it('should calculate totals correctly', () => {
      const items: SaleItem[] = [
        { productId: '1', productName: 'Item 1', quantity: 2, price: 100, total: 200 },
        { productId: '2', productName: 'Item 2', quantity: 1, price: 50, total: 50 }
      ];

      const result = calculateSaleTotal(items);

      expect(result.subtotal).toBe(250);
      expect(result.tax).toBe(30); // 12% VAT
      expect(result.total).toBe(280);
    });

    it('should handle discounts', () => {
      const items: SaleItem[] = [
        { productId: '1', productName: 'Item 1', quantity: 1, price: 100, total: 100 }
      ];

      const result = calculateSaleTotal(items, { type: 'percentage', value: 10 });

      expect(result.subtotal).toBe(100);
      expect(result.discount).toBe(10);
      expect(result.discountedSubtotal).toBe(90);
      expect(result.tax).toBe(10.8); // 12% of 90
      expect(result.total).toBe(100.8);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent sales', async () => {
      const sales = Array.from({ length: 10 }, () => createTestSale());
      
      mockSupabase.from().single.mockResolvedValue({
        data: { id: 'sale-test', ...createTestSale() },
        error: null
      });

      const results = await Promise.all(sales.map(sale => createSale(sale)));

      expect(results.every(r => r.error === null)).toBe(true);
    });
  });
});