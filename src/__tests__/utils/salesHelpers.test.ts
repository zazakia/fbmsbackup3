import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { getCurrentCashierId, validateSaleData, sanitizeSaleData } from '../../utils/salesHelpers';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { supabase } from '../../utils/supabase';

// Mock the modules
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    }
  }
}));

vi.mock('../../store/supabaseAuthStore', () => ({
  useSupabaseAuthStore: {
    getState: vi.fn()
  }
}));

const mockSupabase = supabase as any;
const mockAuthStore = useSupabaseAuthStore as any;

describe('Sales Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentCashierId', () => {
    it('should return user ID from auth store if available', async () => {
      mockAuthStore.getState.mockReturnValue({
        user: { id: 'auth-store-user-123' }
      });

      const result = await getCurrentCashierId();
      expect(result).toBe('auth-store-user-123');
    });

    it('should fallback to Supabase auth if auth store user not available', async () => {
      mockAuthStore.getState.mockReturnValue({ user: null });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'supabase-user-456' } }
      });

      const result = await getCurrentCashierId();
      expect(result).toBe('supabase-user-456');
    });

    it('should return system-default if no user found', async () => {
      mockAuthStore.getState.mockReturnValue({ user: null });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      });

      const result = await getCurrentCashierId();
      expect(result).toBe('system-default');
    });

    it('should handle errors and return system-default', async () => {
      mockAuthStore.getState.mockReturnValue({ user: null });
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth error'));

      const result = await getCurrentCashierId();
      expect(result).toBe('system-default');
    });
  });

  describe('validateSaleData', () => {
    it('should validate valid sale data', () => {
      const validSale = {
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            price: 100,
            total: 200
          }
        ],
        total: 200,
        paymentMethod: 'cash'
      };

      const result = validateSaleData(validSale);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject sale without items', () => {
      const invalidSale = {
        items: [],
        total: 200,
        paymentMethod: 'cash'
      };

      const result = validateSaleData(invalidSale);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sale must have at least one item');
    });

    it('should reject sale with invalid total', () => {
      const invalidSale = {
        items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
        total: 0,
        paymentMethod: 'cash'
      };

      const result = validateSaleData(invalidSale);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sale total must be a positive number');
    });

    it('should reject sale without payment method', () => {
      const invalidSale = {
        items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
        total: 100
      };

      const result = validateSaleData(invalidSale);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Payment method is required');
    });

    it('should reject items with invalid quantities', () => {
      const invalidSale = {
        items: [
          { productId: 'prod-1', quantity: 0, price: 100 },
          { productId: 'prod-2', quantity: 'invalid', price: 100 }
        ],
        total: 100,
        paymentMethod: 'cash'
      };

      const result = validateSaleData(invalidSale);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item 1: Invalid quantity (0)');
      expect(result.errors).toContain('Item 2: Invalid quantity (invalid)');
    });

    it('should reject items without product ID', () => {
      const invalidSale = {
        items: [
          { quantity: 1, price: 100 }
        ],
        total: 100,
        paymentMethod: 'cash'
      };

      const result = validateSaleData(invalidSale);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item 1: Missing product ID');
    });
  });

  describe('sanitizeSaleData', () => {
    beforeEach(() => {
      mockAuthStore.getState.mockReturnValue({
        user: { id: 'test-user-123' }
      });
    });

    it('should add missing required fields', async () => {
      const incompleteSale = {
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            price: 100
          }
        ],
        total: 100,
        paymentMethod: 'cash'
      };

      const result = await sanitizeSaleData(incompleteSale);

      expect(result.cashierId).toBe('test-user-123');
      expect(result.invoiceNumber).toMatch(/^INV-/);
      expect(result.paymentStatus).toBe('pending');
      expect(result.status).toBe('active');
    });

    it('should sanitize item data', async () => {
      const saleWithIncompleteItems = {
        items: [
          {
            product: { id: 'prod-1', name: 'Test Product', price: 100 },
            quantity: 2
          }
        ],
        total: 200,
        paymentMethod: 'cash'
      };

      const result = await sanitizeSaleData(saleWithIncompleteItems);

      expect(result.items[0].productId).toBe('prod-1');
      expect(result.items[0].productName).toBe('Test Product');
      expect(result.items[0].price).toBe(100);
      expect(result.items[0].total).toBe(200);
      expect(result.items[0].id).toMatch(/^item-/);
    });

    it('should preserve existing values', async () => {
      const completeSale = {
        cashierId: 'existing-cashier',
        invoiceNumber: 'EXISTING-INV-123',
        paymentStatus: 'paid',
        status: 'completed',
        items: [
          {
            id: 'existing-item-1',
            productId: 'prod-1',
            productName: 'Existing Product',
            quantity: 1,
            price: 100,
            total: 100
          }
        ],
        total: 100,
        paymentMethod: 'cash'
      };

      const result = await sanitizeSaleData(completeSale);

      expect(result.cashierId).toBe('existing-cashier');
      expect(result.invoiceNumber).toBe('EXISTING-INV-123');
      expect(result.paymentStatus).toBe('paid');
      expect(result.status).toBe('completed');
      expect(result.items[0].id).toBe('existing-item-1');
    });
  });
});