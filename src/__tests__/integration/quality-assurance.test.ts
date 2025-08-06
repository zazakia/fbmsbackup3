import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBusinessStore } from '../../store/businessStore';
import { useOfflineStore } from '../../store/offlineStore';
import { Product } from '../../types/business';

// Mock external dependencies
vi.mock('../../api/sales', () => ({
  createSale: vi.fn(),
  getSales: vi.fn(),
  updateSale: vi.fn(),
  deleteSale: vi.fn(),
  getNextInvoiceNumber: vi.fn(),
}));

vi.mock('../../api/customers', () => ({
  getCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

vi.mock('../../api/productHistory', () => ({
  createProductMovement: vi.fn(),
}));

vi.mock('../../services/receiptService', () => ({
  receiptService: {
    createReceiptData: vi.fn().mockReturnValue({
      receiptNumber: 'RCP-123',
      businessName: 'Test Business',
      items: [],
      total: 0,
    }),
  },
}));

describe('Quality Assurance - Core Business Workflows', () => {
  beforeEach(() => {
    // Reset all stores before each test
    const businessStore = useBusinessStore.getState();
    businessStore.clearCart();
    // Reset products and customers arrays
    businessStore.products.length = 0;
    businessStore.customers.length = 0;
    businessStore.sales.length = 0;
    businessStore.journalEntries.length = 0;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POS Transaction Workflow', () => {
    it('should complete a basic sales transaction with proper VAT calculation', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Create test product
      const testProduct: Product = {
        id: 'test-prod-1',
        name: 'Test Product',
        sku: 'TEST-001',
        barcode: '1234567890',
        price: 1000,
        cost: 600,
        stock: 10,
        category: 'test',
        categoryId: 'test-cat-1',
        description: 'Test product',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 50,
        supplier: 'Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add product to store
      act(() => {
        businessStore.current.addProduct(testProduct);
      });

      expect(businessStore.current.products).toHaveLength(1);

      // Add to cart
      act(() => {
        businessStore.current.addToCart(testProduct, 2);
      });

      expect(businessStore.current.cart).toHaveLength(1);
      expect(businessStore.current.cart[0].quantity).toBe(2);

      // Verify calculations
      const subtotal = businessStore.current.getCartSubtotal();
      const tax = businessStore.current.getCartTax();
      const total = businessStore.current.getCartTotal();

      expect(subtotal).toBe(2000); // 2 × ₱1000
      expect(tax).toBe(240); // 12% VAT
      expect(total).toBe(2240); // ₱2000 + ₱240

      // Mock successful sale creation
      const { createSale } = await import('../../api/sales');
      (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          id: 'test-sale-1',
          subtotal: 2000,
          tax: 240,
          total: 2240,
          createdAt: new Date(),
        },
        error: null,
      });

      // Create sale
      const saleData = {
        customerId: undefined,
        customerName: 'Walk-in Customer',
        items: businessStore.current.cart.map(item => ({
          id: `item-${Date.now()}`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total,
        })),
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'test-user',
        invoiceNumber: 'INV-TEST-001',
        notes: '',
      };

      await act(async () => {
        await businessStore.current.createSale(saleData);
      });

      // Verify cart was cleared
      expect(businessStore.current.cart).toHaveLength(0);

      // Verify sale was recorded
      expect(businessStore.current.sales).toHaveLength(1);
      expect(businessStore.current.sales[0].total).toBe(2240);
    });

    it('should handle stock validation correctly', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const lowStockProduct: Product = {
        id: 'low-stock-prod',
        name: 'Low Stock Product',
        sku: 'LOW-001',
        barcode: '9876543210',
        price: 500,
        cost: 300,
        stock: 2, // Only 2 in stock
        category: 'test',
        categoryId: 'test-cat-1',
        description: 'Low stock product',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 20,
        supplier: 'Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(lowStockProduct);
      });

      // Try to add more than available stock
      act(() => {
        businessStore.current.addToCart(lowStockProduct, 5);
      });

      // Should only add available stock
      expect(businessStore.current.cart).toHaveLength(1);
      expect(businessStore.current.cart[0].quantity).toBe(2); // Limited to available stock
    });
  });

  describe('BIR Compliance Validation', () => {
    it('should calculate 12% VAT correctly for Philippine compliance', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const testAmounts = [100, 1000, 5000, 10000];

      for (const amount of testAmounts) {
        const product: Product = {
          id: `vat-test-${amount}`,
          name: `VAT Test ${amount}`,
          sku: `VAT-${amount}`,
          barcode: `${amount}123`,
          price: amount,
          cost: amount * 0.6,
          stock: 10,
          category: 'vat-test',
          categoryId: 'vat-cat',
          description: `VAT test product ${amount}`,
          unit: 'pcs',
          isActive: true,
          reorderPoint: 2,
          maxStock: 20,
          supplier: 'VAT Supplier',
          location: 'Main Store',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        act(() => {
          businessStore.current.addProduct(product);
          businessStore.current.addToCart(product, 1);
        });

        const subtotal = businessStore.current.getCartSubtotal();
        const vat = businessStore.current.getCartTax();
        const total = businessStore.current.getCartTotal();

        expect(subtotal).toBe(amount);
        expect(vat).toBe(amount * 0.12); // 12% VAT
        expect(total).toBe(amount * 1.12); // Amount + VAT

        // Clear cart for next test
        act(() => {
          businessStore.current.clearCart();
        });
      }
    });

    it('should generate proper journal entries for accounting compliance', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const product: Product = {
        id: 'journal-test-prod',
        name: 'Journal Test Product',
        sku: 'JRN-001',
        barcode: '1111111111',
        price: 1000,
        cost: 600,
        stock: 10,
        category: 'journal-test',
        categoryId: 'jrn-cat',
        description: 'Journal test product',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 2,
        maxStock: 20,
        supplier: 'Journal Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(product);
        businessStore.current.addToCart(product, 1);
      });

      // Mock successful sale creation
      const { createSale } = await import('../../api/sales');
      (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          id: 'journal-sale',
          subtotal: 1000,
          tax: 120,
          total: 1120,
          createdAt: new Date(),
        },
        error: null,
      });

      const initialJournalEntries = businessStore.current.journalEntries.length;

      const saleData = {
        customerId: undefined,
        customerName: 'Walk-in Customer',
        items: [{
          id: 'journal-item',
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          price: product.price,
          total: product.price,
        }],
        subtotal: 1000,
        tax: 120,
        discount: 0,
        total: 1120,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'test-user',
        invoiceNumber: 'INV-JRN-001',
        notes: '',
      };

      await act(async () => {
        await businessStore.current.createSale(saleData);
      });

      // Verify journal entry was created
      expect(businessStore.current.journalEntries.length).toBeGreaterThan(initialJournalEntries);

      const saleJournalEntry = businessStore.current.journalEntries.find(
        entry => entry.description.includes('Sales transaction')
      );

      expect(saleJournalEntry).toBeDefined();
      expect(saleJournalEntry?.lines).toBeDefined();

      // Verify journal entry balances
      const journalLines = saleJournalEntry?.lines || [];
      const totalDebits = journalLines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = journalLines.reduce((sum, line) => sum + line.credit, 0);
      
      expect(totalDebits).toBe(totalCredits); // Accounting equation must balance
      expect(totalDebits).toBeGreaterThan(0);
    });
  });

  describe('Customer Management', () => {
    it('should handle customer creation and loyalty points', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        phone: '+639171234567',
        address: '123 Test Street',
        city: 'Manila',
        province: 'Metro Manila',
        zipCode: '1000',
        creditLimit: 10000,
        currentBalance: 0,
        totalPurchases: 0,
        customerType: 'individual' as const,
        tags: [],
        discountPercentage: 0,
        loyaltyPoints: 0,
        notes: '',
        isActive: true,
        lastPurchase: new Date(),
      };

      // Mock successful customer creation
      const { createCustomer } = await import('../../api/customers');
      (createCustomer as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...customerData, id: 'test-customer-1', createdAt: new Date(), updatedAt: new Date() },
        error: null,
      });

      await act(async () => {
        await businessStore.current.addCustomer(customerData);
      });

      expect(businessStore.current.customers).toHaveLength(1);
      const customer = businessStore.current.customers[0];
      expect(customer.firstName).toBe('John');
      expect(customer.lastName).toBe('Doe');
      expect(customer.loyaltyPoints).toBe(0);
    });
  });

  describe('Offline Functionality', () => {
    it('should handle offline mode transitions', async () => {
      const { result: offlineStore } = renderHook(() => useOfflineStore());

      // Test online to offline transition
      act(() => {
        offlineStore.current.setOnlineStatus(false);
      });

      expect(offlineStore.current.isOnline).toBe(false);

      // Test offline mode toggle
      act(() => {
        offlineStore.current.toggleOfflineMode();
      });

      expect(offlineStore.current.isOfflineMode).toBe(true);

      // Test adding pending transactions
      act(() => {
        offlineStore.current.addPendingTransaction({
          type: 'sale',
          data: {
            items: [],
            total: 100,
            subtotal: 89.29,
            tax: 10.71,
          },
        });
      });

      expect(offlineStore.current.pendingTransactions).toHaveLength(1);
      expect(offlineStore.current.pendingTransactions[0].type).toBe('sale');
      expect(offlineStore.current.pendingTransactions[0].status).toBe('pending');

      // Test back online
      act(() => {
        offlineStore.current.setOnlineStatus(true);
      });

      expect(offlineStore.current.isOnline).toBe(true);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle moderate load efficiently', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const startTime = performance.now();

      // Create 50 products
      const products: Product[] = Array.from({ length: 50 }, (_, index) => ({
        id: `perf-prod-${index}`,
        name: `Performance Product ${index}`,
        sku: `PERF-${String(index).padStart(3, '0')}`,
        barcode: `${index}123456789`,
        price: Math.floor(Math.random() * 1000) + 100,
        cost: Math.floor(Math.random() * 500) + 50,
        stock: Math.floor(Math.random() * 100) + 10,
        category: 'performance',
        categoryId: 'perf-cat',
        description: `Performance test product ${index}`,
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 200,
        supplier: 'Performance Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      act(() => {
        products.forEach(product => {
          businessStore.current.addProduct(product);
        });
      });

      // Perform search operations
      const searchResults = businessStore.current.products.filter(p => 
        p.name.toLowerCase().includes('performance')
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(businessStore.current.products).toHaveLength(50);
      expect(searchResults).toHaveLength(50);

      console.log(`Performance test completed in ${executionTime.toFixed(2)}ms`);
    });

    it('should handle cart operations efficiently', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Create test products
      const products: Product[] = Array.from({ length: 10 }, (_, index) => ({
        id: `cart-perf-${index}`,
        name: `Cart Product ${index}`,
        sku: `CART-${index}`,
        barcode: `${index}987654321`,
        price: 100,
        cost: 60,
        stock: 100,
        category: 'cart-test',
        categoryId: 'cart-cat',
        description: `Cart test product ${index}`,
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 200,
        supplier: 'Cart Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      act(() => {
        products.forEach(product => {
          businessStore.current.addProduct(product);
        });
      });

      const startTime = performance.now();

      // Add all products to cart
      act(() => {
        products.forEach(product => {
          businessStore.current.addToCart(product, 2);
        });
      });

      // Calculate totals multiple times
      let subtotal = 0;
      let tax = 0;
      let total = 0;

      for (let i = 0; i < 10; i++) {
        subtotal = businessStore.current.getCartSubtotal();
        tax = businessStore.current.getCartTax();
        total = businessStore.current.getCartTotal();
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(500); // Should complete within 500ms
      expect(businessStore.current.cart).toHaveLength(10);
      expect(subtotal).toBe(2000); // 10 products × 2 quantity × ₱100 each
      expect(tax).toBe(240); // 12% VAT
      expect(total).toBe(2240);

      console.log(`Cart operations completed in ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const product: Product = {
        id: 'error-test-prod',
        name: 'Error Test Product',
        sku: 'ERR-001',
        barcode: '1111111111',
        price: 500,
        cost: 300,
        stock: 10,
        category: 'error-test',
        categoryId: 'err-cat',
        description: 'Error test product',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 2,
        maxStock: 20,
        supplier: 'Error Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(product);
        businessStore.current.addToCart(product, 1);
      });

      // Mock API failure
      const { createSale } = await import('../../api/sales');
      (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: 'Network error',
      });

      const saleData = {
        customerId: undefined,
        customerName: 'Walk-in Customer',
        items: [{
          id: 'error-item',
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          price: product.price,
          total: product.price,
        }],
        subtotal: 500,
        tax: 60,
        discount: 0,
        total: 560,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'test-user',
        invoiceNumber: 'INV-ERR-001',
        notes: '',
      };

      await act(async () => {
        await businessStore.current.createSale(saleData);
      });

      // Verify error was handled
      expect(businessStore.current.error).toBe('Network error');
      
      // Verify cart still has items (wasn't cleared due to error)
      expect(businessStore.current.cart).toHaveLength(1);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const product: Product = {
        id: 'integrity-test-prod',
        name: 'Integrity Test Product',
        sku: 'INT-001',
        barcode: '2222222222',
        price: 1000,
        cost: 600,
        stock: 20,
        category: 'integrity-test',
        categoryId: 'int-cat',
        description: 'Integrity test product',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 50,
        supplier: 'Integrity Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(product);
      });

      // Verify product was added
      expect(businessStore.current.products).toHaveLength(1);
      expect(businessStore.current.getProduct(product.id)).toBeDefined();

      // Add to cart and verify
      act(() => {
        businessStore.current.addToCart(product, 3);
      });

      expect(businessStore.current.cart).toHaveLength(1);
      expect(businessStore.current.cart[0].quantity).toBe(3);

      // Update cart quantity and verify
      act(() => {
        businessStore.current.updateCartItem(product.id, 5);
      });

      expect(businessStore.current.cart[0].quantity).toBe(5);

      // Remove from cart and verify
      act(() => {
        businessStore.current.removeFromCart(product.id);
      });

      expect(businessStore.current.cart).toHaveLength(0);

      // Verify product still exists in store
      expect(businessStore.current.products).toHaveLength(1);
      expect(businessStore.current.getProduct(product.id)).toBeDefined();
    });
  });
});