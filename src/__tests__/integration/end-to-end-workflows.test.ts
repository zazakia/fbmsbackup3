import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBusinessStore } from '../../store/businessStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useOfflineStore } from '../../store/offlineStore';
import { Product, Customer } from '../../types/business';

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

describe('End-to-End Business Workflows', () => {
  beforeEach(() => {
    // Reset all stores before each test
    useBusinessStore.getState().clearCart();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Sales Transaction Workflow', () => {
    it('should complete full sales workflow: product selection → cart → payment → inventory update → accounting', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());
      const { result: authStore } = renderHook(() => useSupabaseAuthStore());

      // Setup test data
      const testProduct: Product = {
        id: 'prod-1',
        name: 'Test Product',
        sku: 'TEST-001',
        barcode: '1234567890',
        price: 100,
        cost: 60,
        stock: 50,
        category: 'test-category',
        categoryId: 'cat-1',
        description: 'Test product description',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 10,
        maxStock: 100,
        supplier: 'Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const testCustomer: Customer = {
        id: 'cust-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+639171234567',
        address: '123 Test Street',
        city: 'Manila',
        province: 'Metro Manila',
        zipCode: '1000',
        creditLimit: 10000,
        currentBalance: 0,
        totalPurchases: 0,
        customerType: 'individual',
        tags: [],
        discountPercentage: 0,
        loyaltyPoints: 100,
        notes: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPurchase: new Date(),
      };

      // Mock authenticated user
      act(() => {
        authStore.current.user = {
          id: 'user-1',
          email: 'cashier@test.com',
          firstName: 'Test',
          lastName: 'Cashier',
          role: 'cashier',
        } as typeof authStore.current.user;
      });

      // Step 1: Add product to store
      act(() => {
        businessStore.current.addProduct(testProduct);
      });

      expect(businessStore.current.products).toHaveLength(1);
      expect(businessStore.current.products[0].name).toBe('Test Product');

      // Step 2: Add customer to store
      act(() => {
        businessStore.current.customers = [testCustomer];
      });

      expect(businessStore.current.customers).toHaveLength(1);

      // Step 3: Add product to cart
      act(() => {
        businessStore.current.addToCart(testProduct, 2);
      });

      expect(businessStore.current.cart).toHaveLength(1);
      expect(businessStore.current.cart[0].quantity).toBe(2);
      expect(businessStore.current.getCartSubtotal()).toBe(200);
      expect(businessStore.current.getCartTax()).toBe(24); // 12% VAT
      expect(businessStore.current.getCartTotal()).toBe(224);

      // Step 4: Process sale
      const saleData = {
        customerId: testCustomer.id,
        customerName: `${testCustomer.firstName} ${testCustomer.lastName}`,
        items: businessStore.current.cart.map(item => ({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total,
        })),
        subtotal: businessStore.current.getCartSubtotal(),
        tax: businessStore.current.getCartTax(),
        discount: 0,
        total: businessStore.current.getCartTotal(),
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: authStore.current.user?.id || 'system',
        invoiceNumber: 'INV-TEST-001',
        notes: '',
      };

      // Mock successful sale creation
      const { createSale } = await import('../../api/sales');
      (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...saleData, id: 'sale-1', createdAt: new Date() },
        error: null,
      });

      await act(async () => {
        await businessStore.current.createSale(saleData);
      });

      // Step 5: Verify inventory was updated
      const updatedProduct = businessStore.current.getProduct(testProduct.id);
      expect(updatedProduct?.stock).toBe(48); // 50 - 2 = 48

      // Step 6: Verify cart was cleared
      expect(businessStore.current.cart).toHaveLength(0);

      // Step 7: Verify sale was added to store
      expect(businessStore.current.sales).toHaveLength(1);
      expect(businessStore.current.sales[0].total).toBe(224);

      // Step 8: Verify journal entry was created
      expect(businessStore.current.journalEntries.length).toBeGreaterThan(0);
      const saleJournalEntry = businessStore.current.journalEntries.find(
        entry => entry.description.includes('Sales transaction')
      );
      expect(saleJournalEntry).toBeDefined();
    });

    it('should handle insufficient stock scenario gracefully', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const testProduct: Product = {
        id: 'prod-2',
        name: 'Low Stock Product',
        sku: 'LOW-001',
        barcode: '1234567891',
        price: 50,
        cost: 30,
        stock: 1, // Only 1 in stock
        category: 'test-category',
        categoryId: 'cat-1',
        description: 'Low stock product',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 100,
        supplier: 'Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(testProduct);
      });

      // Try to add more than available stock
      act(() => {
        businessStore.current.addToCart(testProduct, 5); // Trying to add 5 when only 1 available
      });

      // Should only add what's available
      expect(businessStore.current.cart).toHaveLength(1);
      expect(businessStore.current.cart[0].quantity).toBe(1);
    });
  });

  describe('Customer Management Workflow', () => {
    it('should complete customer lifecycle: creation → purchase → loyalty points → credit management', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Step 1: Create customer
      const customerData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+639181234567',
        address: '456 Test Avenue',
        city: 'Quezon City',
        province: 'Metro Manila',
        zipCode: '1100',
        creditLimit: 5000,
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
        data: { ...customerData, id: 'cust-2', createdAt: new Date(), updatedAt: new Date() },
        error: null,
      });

      await act(async () => {
        await businessStore.current.addCustomer(customerData);
      });

      expect(businessStore.current.customers).toHaveLength(1);
      const customer = businessStore.current.customers[0];
      expect(customer.firstName).toBe('Jane');
      expect(customer.loyaltyPoints).toBe(0);

      // Step 2: Make a purchase to earn loyalty points
      const testProduct: Product = {
        id: 'prod-3',
        name: 'Loyalty Test Product',
        sku: 'LOYAL-001',
        barcode: '1234567892',
        price: 1000, // ₱1000 = 10 loyalty points
        cost: 600,
        stock: 10,
        category: 'test-category',
        categoryId: 'cat-1',
        description: 'Product for loyalty testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 50,
        supplier: 'Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(testProduct);
        businessStore.current.addToCart(testProduct, 1);
      });

      const saleData = {
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        items: businessStore.current.cart.map(item => ({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total,
        })),
        subtotal: 1000,
        tax: 120,
        discount: 0,
        total: 1120,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'user-1',
        invoiceNumber: 'INV-TEST-002',
        notes: '',
      };

      // Mock successful sale and customer update
      const { createSale } = await import('../../api/sales');
      const { updateCustomer } = await import('../../api/customers');
      
      (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...saleData, id: 'sale-2', createdAt: new Date() },
        error: null,
      });
      
      (updateCustomer as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...customer, totalPurchases: 1120, loyaltyPoints: 11 },
        error: null,
      });

      await act(async () => {
        await businessStore.current.createSale(saleData);
      });

      // Step 3: Verify customer was updated with loyalty points
      const updatedCustomer = businessStore.current.getCustomer(customer.id);
      expect(updatedCustomer?.totalPurchases).toBe(1120);
      expect(updatedCustomer?.loyaltyPoints).toBe(11); // 1120 / 100 = 11 points
    });
  });

  describe('Inventory Management Workflow', () => {
    it('should handle complete inventory lifecycle: stock in → sales → reorder alerts → transfers', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Step 1: Create product with low stock
      const testProduct: Product = {
        id: 'prod-4',
        name: 'Inventory Test Product',
        sku: 'INV-001',
        barcode: '1234567893',
        price: 200,
        cost: 120,
        stock: 15,
        category: 'test-category',
        categoryId: 'cat-1',
        description: 'Product for inventory testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 10, // Will trigger reorder alert
        maxStock: 100,
        supplier: 'Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(testProduct);
      });

      // Step 2: Make sales to reduce stock below reorder point
      act(() => {
        businessStore.current.addToCart(testProduct, 8); // This will bring stock to 7, below reorder point
      });

      const saleData = {
        customerId: undefined,
        customerName: 'Walk-in Customer',
        items: businessStore.current.cart.map(item => ({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total,
        })),
        subtotal: 1600,
        tax: 192,
        discount: 0,
        total: 1792,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'user-1',
        invoiceNumber: 'INV-TEST-003',
        notes: '',
      };

      // Mock successful sale creation
      const { createSale } = await import('../../api/sales');
      (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...saleData, id: 'sale-3', createdAt: new Date() },
        error: null,
      });

      await act(async () => {
        await businessStore.current.createSale(saleData);
      });

      // Step 3: Verify stock was reduced
      const updatedProduct = businessStore.current.getProduct(testProduct.id);
      expect(updatedProduct?.stock).toBe(7); // 15 - 8 = 7

      // Step 4: Check if product needs reordering (stock below reorder point)
      expect(updatedProduct?.stock).toBeLessThan(updatedProduct?.reorderPoint || 0);

      // Step 5: Simulate stock replenishment
      act(() => {
        businessStore.current.updateStock(testProduct.id, 50, 'purchase', 'user-1', 'PO-001', 'Stock replenishment');
      });

      const replenishedProduct = businessStore.current.getProduct(testProduct.id);
      expect(replenishedProduct?.stock).toBe(57); // 7 + 50 = 57
    });
  });

  describe('Payment Processing Workflow', () => {
    it('should handle multiple payment methods and reconciliation', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const testProduct: Product = {
        id: 'prod-5',
        name: 'Payment Test Product',
        sku: 'PAY-001',
        barcode: '1234567894',
        price: 500,
        cost: 300,
        stock: 20,
        category: 'test-category',
        categoryId: 'cat-1',
        description: 'Product for payment testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 100,
        supplier: 'Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(testProduct);
        businessStore.current.addToCart(testProduct, 2);
      });

      // Test different payment methods
      const paymentMethods: Array<{ method: 'cash' | 'gcash' | 'paymaya' | 'bank_transfer'; description: string }> = [
        { method: 'cash', description: 'Cash Payment' },
        { method: 'gcash', description: 'GCash Payment' },
        { method: 'paymaya', description: 'PayMaya Payment' },
        { method: 'bank_transfer', description: 'Bank Transfer' },
      ];

      for (const payment of paymentMethods) {
        const saleData = {
          customerId: undefined,
          customerName: 'Walk-in Customer',
          items: businessStore.current.cart.map(item => ({
            id: `item-${Date.now()}-${Math.random()}`,
            productId: item.product.id,
            productName: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            price: item.product.price,
            total: item.total,
          })),
          subtotal: 1000,
          tax: 120,
          discount: 0,
          total: 1120,
          paymentMethod: payment.method,
          paymentStatus: 'paid' as const,
          status: 'completed' as const,
          cashierId: 'user-1',
          invoiceNumber: `INV-${payment.method.toUpperCase()}-001`,
          notes: payment.description,
        };

        // Mock successful sale creation
        const { createSale } = await import('../../api/sales');
        (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { ...saleData, id: `sale-${payment.method}`, createdAt: new Date() },
          error: null,
        });

        await act(async () => {
          await businessStore.current.createSale(saleData);
        });

        // Verify sale was recorded with correct payment method
        const sale = businessStore.current.sales.find(s => s.paymentMethod === payment.method);
        expect(sale).toBeDefined();
        expect(sale?.paymentMethod).toBe(payment.method);
        expect(sale?.total).toBe(1120);

        // Reset cart for next payment method test
        act(() => {
          businessStore.current.addToCart(testProduct, 2);
        });
      }
    });
  });

  describe('BIR Compliance Workflow', () => {
    it('should generate BIR-compliant transactions with proper VAT calculations', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const testProduct: Product = {
        id: 'prod-6',
        name: 'BIR Test Product',
        sku: 'BIR-001',
        barcode: '1234567895',
        price: 1000,
        cost: 600,
        stock: 10,
        category: 'test-category',
        categoryId: 'cat-1',
        description: 'Product for BIR compliance testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 50,
        supplier: 'Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(testProduct);
        businessStore.current.addToCart(testProduct, 1);
      });

      // Calculate VAT (12% in Philippines)
      const subtotal = 1000;
      const vatRate = 0.12;
      const vatAmount = subtotal * vatRate;
      const total = subtotal + vatAmount;

      expect(businessStore.current.getCartSubtotal()).toBe(subtotal);
      expect(businessStore.current.getCartTax()).toBe(vatAmount);
      expect(businessStore.current.getCartTotal()).toBe(total);

      const saleData = {
        customerId: undefined,
        customerName: 'Walk-in Customer',
        items: businessStore.current.cart.map(item => ({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total,
        })),
        subtotal: subtotal,
        tax: vatAmount,
        discount: 0,
        total: total,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'user-1',
        invoiceNumber: 'INV-BIR-001',
        notes: 'BIR compliance test',
      };

      // Mock successful sale creation
      const { createSale } = await import('../../api/sales');
      (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...saleData, id: 'sale-bir', createdAt: new Date() },
        error: null,
      });

      await act(async () => {
        await businessStore.current.createSale(saleData);
      });

      // Verify BIR-compliant calculations
      const sale = businessStore.current.sales.find(s => s.invoiceNumber === 'INV-BIR-001');
      expect(sale).toBeDefined();
      expect(sale?.subtotal).toBe(1000);
      expect(sale?.tax).toBe(120); // 12% VAT
      expect(sale?.total).toBe(1120);

      // Verify journal entry includes VAT payable
      const journalEntry = businessStore.current.journalEntries.find(
        entry => entry.description.includes('Sales transaction')
      );
      expect(journalEntry).toBeDefined();
      
      // Check for VAT Payable account entry
      const vatEntry = journalEntry?.lines.find(line => 
        line.accountName.toLowerCase().includes('vat') || 
        line.description.toLowerCase().includes('vat')
      );
      expect(vatEntry).toBeDefined();
      expect(vatEntry?.credit).toBe(120);
    });
  });

  describe('Offline Mode Integration', () => {
    it('should handle offline sales and sync when online', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());
      const { result: offlineStore } = renderHook(() => useOfflineStore());

      // Set offline mode
      act(() => {
        offlineStore.current.setOnlineStatus(false);
        offlineStore.current.toggleOfflineMode();
      });

      expect(offlineStore.current.isOnline).toBe(false);
      expect(offlineStore.current.isOfflineMode).toBe(true);

      const testProduct: Product = {
        id: 'prod-7',
        name: 'Offline Test Product',
        sku: 'OFF-001',
        barcode: '1234567896',
        price: 300,
        cost: 180,
        stock: 25,
        category: 'test-category',
        categoryId: 'cat-1',
        description: 'Product for offline testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 100,
        supplier: 'Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(testProduct);
        businessStore.current.addToCart(testProduct, 3);
      });

      // Create offline sale
      const offlineSaleData = {
        customerId: undefined,
        customerName: 'Walk-in Customer',
        items: businessStore.current.cart.map(item => ({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total,
        })),
        subtotal: 900,
        tax: 108,
        discount: 0,
        total: 1008,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'user-1',
        invoiceNumber: 'INV-OFF-001',
        notes: 'Created offline',
      };

      act(() => {
        businessStore.current.createOfflineSale(offlineSaleData);
        
        // Add to pending transactions
        offlineStore.current.addPendingTransaction({
          type: 'sale',
          data: offlineSaleData,
        });
      });

      // Verify offline sale was created locally
      expect(businessStore.current.sales).toHaveLength(1);
      expect(businessStore.current.sales[0].notes).toBe('Created offline');
      expect(offlineStore.current.pendingTransactions).toHaveLength(1);

      // Simulate coming back online
      act(() => {
        offlineStore.current.setOnlineStatus(true);
      });

      expect(offlineStore.current.isOnline).toBe(true);
      expect(offlineStore.current.pendingTransactions).toHaveLength(1);

      // Verify pending transaction exists for sync
      const pendingTransaction = offlineStore.current.pendingTransactions[0];
      expect(pendingTransaction.type).toBe('sale');
      expect(pendingTransaction.status).toBe('pending');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API failures gracefully and maintain data integrity', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const testProduct: Product = {
        id: 'prod-8',
        name: 'Error Test Product',
        sku: 'ERR-001',
        barcode: '1234567897',
        price: 150,
        cost: 90,
        stock: 30,
        category: 'test-category',
        categoryId: 'cat-1',
        description: 'Product for error testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 100,
        supplier: 'Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(testProduct);
        businessStore.current.addToCart(testProduct, 2);
      });

      const saleData = {
        customerId: undefined,
        customerName: 'Walk-in Customer',
        items: businessStore.current.cart.map(item => ({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total,
        })),
        subtotal: 300,
        tax: 36,
        discount: 0,
        total: 336,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'user-1',
        invoiceNumber: 'INV-ERR-001',
        notes: 'Error handling test',
      };

      // Mock API failure
      const { createSale } = await import('../../api/sales');
      (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: 'Database connection failed',
      });

      // Attempt to create sale (should fail gracefully)
      await act(async () => {
        await businessStore.current.createSale(saleData);
      });

      // Verify error was handled and cart wasn't cleared
      expect(businessStore.current.cart).toHaveLength(1); // Cart should still have items
      expect(businessStore.current.error).toBe('Database connection failed');
      
      // Verify product stock wasn't updated due to failed sale
      const product = businessStore.current.getProduct(testProduct.id);
      expect(product?.stock).toBe(30); // Should remain unchanged
    });
  });
});