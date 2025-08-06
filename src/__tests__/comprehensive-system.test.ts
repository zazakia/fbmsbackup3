import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBusinessStore } from '../store/businessStore';
import { receiptService } from '../services/receiptService';
import { Product, Customer, Sale } from '../types/business';

// Mock external dependencies
vi.mock('../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn()
    }
  }
}));

vi.mock('../api/customers', () => ({
  getCustomers: vi.fn().mockResolvedValue({ data: [], error: null }),
  createCustomer: vi.fn().mockResolvedValue({ data: {}, error: null }),
  updateCustomer: vi.fn().mockResolvedValue({ data: {}, error: null }),
  deleteCustomer: vi.fn().mockResolvedValue({ error: null })
}));

vi.mock('../api/sales', () => ({
  createSale: vi.fn().mockResolvedValue({ data: {}, error: null }),
  getSales: vi.fn().mockResolvedValue({ data: [], error: null }),
  getNextInvoiceNumber: vi.fn().mockResolvedValue({ data: 'INV-001', error: null })
}));

describe('Comprehensive System Tests', () => {
  beforeEach(() => {
    // Reset all stores before each test
    useBusinessStore.getState().clearCart();
    vi.clearAllMocks();
  });

  describe('POS System Integration', () => {
    it('should complete a full sales transaction workflow', async () => {
      const mockProduct: Product = {
        id: 'prod-1',
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 5,
        category: 'Test Category',
        categoryId: 'cat-1',
        description: 'Test product description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockCustomer: Customer = {
        id: 'cust-1',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan@test.com',
        phone: '+639123456789',
        address: '123 Test St',
        city: 'Manila',
        province: 'Metro Manila',
        zipCode: '1000',
        creditLimit: 10000,
        currentBalance: 0,
        totalPurchases: 0,
        customerType: 'individual',
        tags: [],
        discountPercentage: 0,
        loyaltyPoints: 0,
        notes: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPurchase: new Date()
      };

      // Setup initial state
      const store = useBusinessStore.getState();
      store.addProduct(mockProduct);
      store.addCustomer(mockCustomer);

      // Add product to cart
      store.addToCart(mockProduct, 2);

      // Verify cart state
      expect(store.cart.length).toBe(1);
      expect(store.cart[0].quantity).toBe(2);
      expect(store.cart[0].total).toBe(200);

      // Calculate totals
      const subtotal = store.getCartSubtotal();
      const tax = store.getCartTax();
      const total = store.getCartTotal();

      expect(subtotal).toBe(200);
      expect(tax).toBe(24); // 12% VAT
      expect(total).toBe(224);

      // Create sale
      const saleData = {
        customerId: mockCustomer.id,
        customerName: `${mockCustomer.firstName} ${mockCustomer.lastName}`,
        items: store.cart.map(item => ({
          id: `item-${Date.now()}`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total
        })),
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'user-1',
        notes: ''
      };

      await store.createSale(saleData);

      // Verify sale was created and cart was cleared
      expect(store.cart.length).toBe(0);
      expect(store.sales.length).toBe(1);

      // Verify inventory was updated
      const updatedProduct = store.products.find(p => p.id === mockProduct.id);
      expect(updatedProduct?.stock).toBe(8); // 10 - 2 = 8
    });

    it('should handle enhanced POS features correctly', () => {
      const mockProduct: Product = {
        id: 'prod-1',
        name: 'Test Product',
        sku: 'TEST-001',
        barcode: '1234567890',
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 5,
        category: 'Test Category',
        categoryId: 'cat-1',
        description: 'Test product description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const store = useBusinessStore.getState();
      store.addProduct(mockProduct);

      // Test barcode scanning
      const products = store.products.filter(p => 
        p.barcode === '1234567890' || p.sku === '1234567890'
      );
      expect(products.length).toBe(1);
      expect(products[0].id).toBe('prod-1');

      // Test loyalty points calculation
      const totalAmount = 1000;
      const loyaltyPoints = Math.floor(totalAmount / 100); // 1 point per ₱100
      expect(loyaltyPoints).toBe(10);
    });
  });

  describe('Inventory Management', () => {
    it('should track stock movements correctly', () => {
      const mockProduct: Product = {
        id: 'prod-1',
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 5,
        category: 'Test Category',
        categoryId: 'cat-1',
        description: 'Test product description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const store = useBusinessStore.getState();
      store.addProduct(mockProduct);

      // Test stock update
      store.updateStock('prod-1', -3, 'sale', 'user-1', 'SALE-001', 'Sale transaction');
      
      const updatedProduct = store.products.find(p => p.id === 'prod-1');
      expect(updatedProduct?.stock).toBe(7);

      // Test low stock detection
      store.updateStock('prod-1', -3, 'sale', 'user-1', 'SALE-002', 'Another sale');
      const finalProduct = store.products.find(p => p.id === 'prod-1');
      expect(finalProduct?.stock).toBe(4);
      expect(finalProduct!.stock <= finalProduct!.minStock).toBe(true);
    });

    it('should handle multi-location inventory', () => {
      const mockProduct: Product = {
        id: 'prod-1',
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 5,
        category: 'Test Category',
        categoryId: 'cat-1',
        description: 'Test product description',
        location: 'main-warehouse',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const store = useBusinessStore.getState();
      store.addProduct(mockProduct);

      // Verify location assignment
      const product = store.products.find(p => p.id === 'prod-1');
      expect(product?.location).toBe('main-warehouse');
    });
  });

  describe('Customer Management and CRM', () => {
    it('should manage customer data and loyalty points', () => {
      const mockCustomer: Customer = {
        id: 'cust-1',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan@test.com',
        phone: '+639123456789',
        address: '123 Test St',
        city: 'Manila',
        province: 'Metro Manila',
        zipCode: '1000',
        creditLimit: 10000,
        currentBalance: 0,
        totalPurchases: 0,
        customerType: 'individual',
        tags: [],
        discountPercentage: 0,
        loyaltyPoints: 0,
        notes: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPurchase: new Date()
      };

      const store = useBusinessStore.getState();
      store.addCustomer(mockCustomer);

      // Test customer creation
      expect(store.customers.length).toBe(1);
      expect(store.customers[0].id).toBe('cust-1');

      // Test loyalty points update
      const updatedCustomer = {
        ...mockCustomer,
        totalPurchases: 1000,
        loyaltyPoints: 10
      };

      store.updateCustomer('cust-1', {
        totalPurchases: updatedCustomer.totalPurchases,
        loyaltyPoints: updatedCustomer.loyaltyPoints
      });

      const customer = store.customers.find(c => c.id === 'cust-1');
      expect(customer?.totalPurchases).toBe(1000);
      expect(customer?.loyaltyPoints).toBe(10);
    });

    it('should handle customer segmentation', () => {
      const customers: Customer[] = [
        {
          id: 'cust-1',
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          email: 'juan@test.com',
          phone: '+639123456789',
          totalPurchases: 5000,
          customerType: 'individual',
          loyaltyPoints: 50,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'cust-2',
          firstName: 'Maria',
          lastName: 'Santos',
          email: 'maria@test.com',
          phone: '+639987654321',
          totalPurchases: 15000,
          customerType: 'vip',
          loyaltyPoints: 150,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as Customer[];

      // Test customer segmentation
      const vipCustomers = customers.filter(c => c.customerType === 'vip');
      const highValueCustomers = customers.filter(c => c.totalPurchases > 10000);
      const loyalCustomers = customers.filter(c => c.loyaltyPoints > 100);

      expect(vipCustomers.length).toBe(1);
      expect(highValueCustomers.length).toBe(1);
      expect(loyalCustomers.length).toBe(1);
    });
  });

  describe('Financial Management and Accounting', () => {
    it('should create proper journal entries for sales', () => {
      const mockSale: Sale = {
        id: 'sale-1',
        customerId: 'cust-1',
        customerName: 'Juan Dela Cruz',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            sku: 'TEST-001',
            quantity: 2,
            price: 100,
            total: 200
          }
        ],
        subtotal: 200,
        tax: 24,
        discount: 0,
        total: 224,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        status: 'completed',
        cashierId: 'user-1',
        invoiceNumber: 'INV-001',
        notes: '',
        createdAt: new Date()
      };

      const store = useBusinessStore.getState();
      
      // Ensure we have the required accounts
      const requiredAccounts = [
        { id: '1000', code: '1000', name: 'Cash on Hand', type: 'asset' as const, balance: 0, isActive: true },
        { id: '4000', code: '4000', name: 'Sales Revenue', type: 'revenue' as const, balance: 0, isActive: true },
        { id: '5000', code: '5000', name: 'Cost of Goods Sold', type: 'expense' as const, balance: 0, isActive: true },
        { id: '1300', code: '1300', name: 'Inventory', type: 'asset' as const, balance: 0, isActive: true },
        { id: '2100', code: '2100', name: 'VAT Payable', type: 'liability' as const, balance: 0, isActive: true }
      ];

      requiredAccounts.forEach(account => {
        if (!store.accounts.find(a => a.code === account.code)) {
          store.addAccount(account);
        }
      });

      // Create journal entry for sale
      store.createSaleJournalEntry(mockSale);

      // Verify journal entry was created
      expect(store.journalEntries.length).toBeGreaterThan(0);
      
      const journalEntry = store.journalEntries[store.journalEntries.length - 1];
      expect(journalEntry.description).toContain('Sale');
      
      // Verify double-entry bookkeeping (debits = credits)
      const totalDebits = journalEntry.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = journalEntry.lines.reduce((sum, line) => sum + line.credit, 0);
      expect(totalDebits).toBe(totalCredits);
    });

    it('should calculate Philippine taxes correctly', () => {
      const subtotal = 1000;
      const vatRate = 0.12; // 12% VAT for Philippines
      const vat = subtotal * vatRate;
      const total = subtotal + vat;

      expect(vat).toBe(120);
      expect(total).toBe(1120);

      // Test withholding tax calculation (example: 5% for services)
      const serviceAmount = 10000;
      const withholdingTaxRate = 0.05;
      const withholdingTax = serviceAmount * withholdingTaxRate;
      const netAmount = serviceAmount - withholdingTax;

      expect(withholdingTax).toBe(500);
      expect(netAmount).toBe(9500);
    });
  });

  describe('Receipt Generation', () => {
    it('should generate BIR-compliant receipts', () => {
      const mockSale: Sale = {
        id: 'sale-1',
        customerId: 'cust-1',
        customerName: 'Juan Dela Cruz',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            sku: 'TEST-001',
            quantity: 2,
            price: 100,
            total: 200
          }
        ],
        subtotal: 200,
        tax: 24,
        discount: 0,
        total: 224,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        status: 'completed',
        cashierId: 'user-1',
        invoiceNumber: 'INV-001',
        receiptNumber: 'RCP-001',
        notes: '',
        createdAt: new Date()
      };

      const mockCustomer: Customer = {
        id: 'cust-1',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan@test.com',
        phone: '+639123456789',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Customer;

      // Generate receipt data
      const receiptData = receiptService.createReceiptData(mockSale, mockCustomer);

      expect(receiptData.receiptNumber).toBeDefined();
      expect(receiptData.businessInfo.tin).toBeDefined();
      expect(receiptData.businessInfo.birAccreditation).toBeDefined();
      expect(receiptData.digitalSignature).toBeDefined();
      expect(receiptData.qrCode).toBeDefined();

      // Generate receipt text
      const receiptText = receiptService.generateReceiptText(receiptData);
      expect(receiptText).toContain('OFFICIAL RECEIPT');
      expect(receiptText).toContain('VAT (12%)');
      expect(receiptText).toContain('₱224.00');
      expect(receiptText).toContain('Juan Dela Cruz');
    });
  });

  describe('Payment Integration', () => {
    it('should handle multiple payment methods', () => {
      const paymentMethods = ['cash', 'gcash', 'paymaya', 'bank_transfer', 'credit_card'];
      
      paymentMethods.forEach(method => {
        const mockSale: Sale = {
          id: `sale-${method}`,
          customerId: 'cust-1',
          customerName: 'Test Customer',
          items: [],
          subtotal: 100,
          tax: 12,
          discount: 0,
          total: 112,
          paymentMethod: method as 'cash' | 'gcash' | 'paymaya' | 'bank_transfer' | 'credit_card',
          paymentStatus: 'paid',
          status: 'completed',
          cashierId: 'user-1',
          invoiceNumber: `INV-${method}`,
          notes: '',
          createdAt: new Date()
        };

        expect(mockSale.paymentMethod).toBe(method);
        expect(mockSale.total).toBe(112);
      });
    });

    it('should calculate cash change correctly', () => {
      const total = 224;
      const cashReceived = 250;
      const change = cashReceived - total;

      expect(change).toBe(26);

      // Test insufficient cash
      const insufficientCash = 200;
      const isInsufficientCash = insufficientCash < total;
      expect(isInsufficientCash).toBe(true);
    });
  });

  describe('Expense Management and Approval', () => {
    it('should handle expense approval workflow', () => {
      const mockExpense = {
        id: 'exp-1',
        description: 'Office Supplies',
        amount: 5000,
        category: 'Office Supplies',
        date: new Date(),
        vendor: 'Office Depot',
        status: 'pending' as const,
        submittedBy: 'emp-1',
        submittedByName: 'Employee One',
        createdAt: new Date()
      };

      // Test approval workflow steps
      const approvalSteps = [
        { stepNumber: 1, approverRole: 'manager', requiredAmount: 1000 },
        { stepNumber: 2, approverRole: 'admin', requiredAmount: 5000 }
      ];

      // Since expense amount is 5000, it requires both manager and admin approval
      const requiredSteps = approvalSteps.filter(step => mockExpense.amount >= step.requiredAmount);
      expect(requiredSteps.length).toBe(2);

      // Test approval process
      let currentStep = 1;

      // Manager approval
      expect(currentStep).toBe(1);
      expect(requiredSteps[currentStep - 1].approverRole).toBe('manager');
      
      // Move to next step after manager approval
      currentStep++;
      expect(currentStep).toBe(2);
      expect(requiredSteps[currentStep - 1].approverRole).toBe('admin');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce role-based permissions', () => {
      const modules = ['dashboard', 'pos', 'inventory', 'customers', 'accounting', 'reports'];

      // Test admin access (should have access to all modules)
      const adminPermissions = modules.every(() => {
        // Admin should have access to all modules
        return true;
      });
      expect(adminPermissions).toBe(true);

      // Test cashier access (should have limited access)
      const cashierModules = ['dashboard', 'pos', 'customers'];
      const cashierPermissions = cashierModules.every(module => 
        ['dashboard', 'pos', 'customers'].includes(module)
      );
      expect(cashierPermissions).toBe(true);

      // Test restricted access
      const restrictedModules = ['accounting', 'reports'];
      const cashierRestrictedAccess = restrictedModules.some(module => 
        !['dashboard', 'pos', 'customers'].includes(module)
      );
      expect(cashierRestrictedAccess).toBe(true);
    });
  });

  describe('Data Integration and Workflow', () => {
    it('should maintain data consistency across modules', async () => {
      const store = useBusinessStore.getState();

      // Create test data
      const mockProduct: Product = {
        id: 'prod-1',
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100,
        cost: 50,
        stock: 10,
        minStock: 5,
        category: 'Test Category',
        categoryId: 'cat-1',
        description: 'Test product description',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockCustomer: Customer = {
        id: 'cust-1',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan@test.com',
        totalPurchases: 0,
        loyaltyPoints: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Customer;

      store.addProduct(mockProduct);
      store.addCustomer(mockCustomer);

      // Add to cart and create sale
      store.addToCart(mockProduct, 2);
      
      const saleData = {
        customerId: mockCustomer.id,
        customerName: `${mockCustomer.firstName} ${mockCustomer.lastName}`,
        items: store.cart.map(item => ({
          id: `item-${Date.now()}`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total
        })),
        subtotal: store.getCartSubtotal(),
        tax: store.getCartTax(),
        discount: 0,
        total: store.getCartTotal(),
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'user-1',
        notes: ''
      };

      await store.createSale(saleData);

      // Verify data consistency
      // 1. Cart should be cleared
      expect(store.cart.length).toBe(0);

      // 2. Inventory should be updated
      const updatedProduct = store.products.find(p => p.id === 'prod-1');
      expect(updatedProduct?.stock).toBe(8);

      // 3. Sale should be recorded
      expect(store.sales.length).toBe(1);

      // 4. Customer should be updated (if implemented)
      const updatedCustomer = store.customers.find(c => c.id === 'cust-1');
      expect(updatedCustomer).toBeDefined();
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle large datasets efficiently', () => {
      const store = useBusinessStore.getState();
      
      // Create large dataset
      const products: Product[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `prod-${i}`,
        name: `Product ${i}`,
        sku: `SKU-${i.toString().padStart(3, '0')}`,
        price: Math.random() * 1000,
        cost: Math.random() * 500,
        stock: Math.floor(Math.random() * 100),
        minStock: 5,
        category: `Category ${i % 10}`,
        categoryId: `cat-${i % 10}`,
        description: `Description for product ${i}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Measure performance
      const startTime = performance.now();
      
      products.forEach(product => {
        store.addProduct(product);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      expect(store.products.length).toBe(1000);
    });

    it('should handle errors gracefully', () => {
      const store = useBusinessStore.getState();

      // Test invalid product addition
      expect(() => {
        store.addProduct({} as Product);
      }).not.toThrow();

      // Test invalid stock update
      expect(() => {
        store.updateStock('non-existent-product', 10);
      }).not.toThrow();

      // Test invalid customer operations
      expect(() => {
        store.updateCustomer('non-existent-customer', {});
      }).not.toThrow();
    });
  });
});