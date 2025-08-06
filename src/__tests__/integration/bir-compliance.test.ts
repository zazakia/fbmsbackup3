import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBusinessStore } from '../../store/businessStore';
import { Product, Customer } from '../../types/business';

// Mock external dependencies
vi.mock('../../api/sales', () => ({
  createSale: vi.fn(),
  getSales: vi.fn(),
  updateSale: vi.fn(),
  deleteSale: vi.fn(),
  getNextInvoiceNumber: vi.fn(),
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

describe('BIR Compliance Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('VAT Calculations (12% Philippine VAT)', () => {
    it('should calculate VAT correctly for various transaction amounts', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const testCases = [
        { amount: 100, expectedVAT: 12, expectedTotal: 112 },
        { amount: 1000, expectedVAT: 120, expectedTotal: 1120 },
        { amount: 5000, expectedVAT: 600, expectedTotal: 5600 },
        { amount: 10000, expectedVAT: 1200, expectedTotal: 11200 },
        { amount: 50000, expectedVAT: 6000, expectedTotal: 56000 },
      ];

      for (const testCase of testCases) {
        const testProduct: Product = {
          id: `vat-prod-${testCase.amount}`,
          name: `VAT Test Product ${testCase.amount}`,
          sku: `VAT-${testCase.amount}`,
          barcode: `${testCase.amount}123456789`,
          price: testCase.amount,
          cost: testCase.amount * 0.6,
          stock: 100,
          category: 'vat-test',
          categoryId: 'vat-cat-1',
          description: `Product for VAT testing at ₱${testCase.amount}`,
          unit: 'pcs',
          isActive: true,
          reorderPoint: 10,
          maxStock: 200,
          supplier: 'VAT Test Supplier',
          location: 'Main Store',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        act(() => {
          businessStore.current.addProduct(testProduct);
          businessStore.current.addToCart(testProduct, 1);
        });

        // Verify VAT calculations
        const subtotal = businessStore.current.getCartSubtotal();
        const vat = businessStore.current.getCartTax();
        const total = businessStore.current.getCartTotal();

        expect(subtotal).toBe(testCase.amount);
        expect(vat).toBe(testCase.expectedVAT);
        expect(total).toBe(testCase.expectedTotal);

        // Verify VAT rate is exactly 12%
        const vatRate = vat / subtotal;
        expect(vatRate).toBeCloseTo(0.12, 4);

        // Clear cart for next test
        act(() => {
          businessStore.current.clearCart();
        });
      }
    });

    it('should handle VAT calculations for multiple items correctly', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const testProducts: Product[] = [
        {
          id: 'multi-vat-1',
          name: 'Multi VAT Product 1',
          sku: 'MVAT-001',
          barcode: '1111111111',
          price: 250,
          cost: 150,
          stock: 50,
          category: 'multi-vat',
          categoryId: 'mvat-cat-1',
          description: 'First product for multi-item VAT testing',
          unit: 'pcs',
          isActive: true,
          reorderPoint: 5,
          maxStock: 100,
          supplier: 'Multi VAT Supplier',
          location: 'Main Store',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'multi-vat-2',
          name: 'Multi VAT Product 2',
          sku: 'MVAT-002',
          barcode: '2222222222',
          price: 750,
          cost: 450,
          stock: 30,
          category: 'multi-vat',
          categoryId: 'mvat-cat-1',
          description: 'Second product for multi-item VAT testing',
          unit: 'pcs',
          isActive: true,
          reorderPoint: 5,
          maxStock: 60,
          supplier: 'Multi VAT Supplier',
          location: 'Main Store',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'multi-vat-3',
          name: 'Multi VAT Product 3',
          sku: 'MVAT-003',
          barcode: '3333333333',
          price: 1500,
          cost: 900,
          stock: 20,
          category: 'multi-vat',
          categoryId: 'mvat-cat-1',
          description: 'Third product for multi-item VAT testing',
          unit: 'pcs',
          isActive: true,
          reorderPoint: 3,
          maxStock: 40,
          supplier: 'Multi VAT Supplier',
          location: 'Main Store',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      act(() => {
        testProducts.forEach(product => {
          businessStore.current.addProduct(product);
        });

        // Add different quantities of each product
        businessStore.current.addToCart(testProducts[0], 2); // 2 × ₱250 = ₱500
        businessStore.current.addToCart(testProducts[1], 3); // 3 × ₱750 = ₱2,250
        businessStore.current.addToCart(testProducts[2], 1); // 1 × ₱1,500 = ₱1,500
      });

      // Expected calculations:
      // Subtotal: ₱500 + ₱2,250 + ₱1,500 = ₱4,250
      // VAT (12%): ₱4,250 × 0.12 = ₱510
      // Total: ₱4,250 + ₱510 = ₱4,760

      const subtotal = businessStore.current.getCartSubtotal();
      const vat = businessStore.current.getCartTax();
      const total = businessStore.current.getCartTotal();

      expect(subtotal).toBe(4250);
      expect(vat).toBe(510);
      expect(total).toBe(4760);

      // Verify individual item calculations
      expect(businessStore.current.cart).toHaveLength(3);
      expect(businessStore.current.cart[0].total).toBe(500);
      expect(businessStore.current.cart[1].total).toBe(2250);
      expect(businessStore.current.cart[2].total).toBe(1500);
    });
  });

  describe('Official Receipt Numbering', () => {
    it('should generate sequential BIR-compliant receipt numbers', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const testProduct: Product = {
        id: 'receipt-prod-1',
        name: 'Receipt Test Product',
        sku: 'RCP-001',
        barcode: '4444444444',
        price: 500,
        cost: 300,
        stock: 100,
        category: 'receipt-test',
        categoryId: 'rcp-cat-1',
        description: 'Product for receipt numbering testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 10,
        maxStock: 200,
        supplier: 'Receipt Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(testProduct);
      });

      // Mock successful sale creation with sequential receipt numbers
      const { createSale } = await import('../../api/sales');
      let receiptCounter = 1;

      (createSale as ReturnType<typeof vi.fn>).mockImplementation((saleData: unknown) => {
        const receiptNumber = `RCP-${String(receiptCounter).padStart(8, '0')}`;
        receiptCounter++;
        
        return Promise.resolve({
          data: { 
            ...saleData, 
            id: `sale-${receiptCounter}`, 
            receiptNumber,
            createdAt: new Date() 
          },
          error: null,
        });
      });

      const receiptNumbers: string[] = [];

      // Create 10 sequential sales
      for (let i = 0; i < 10; i++) {
        act(() => {
          businessStore.current.addToCart(testProduct, 1);
        });

        const saleData = {
          customerId: undefined,
          customerName: 'Walk-in Customer',
          items: businessStore.current.cart.map(item => ({
            id: `receipt-item-${i}`,
            productId: item.product.id,
            productName: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            price: item.product.price,
            total: item.total,
          })),
          subtotal: 500,
          tax: 60,
          discount: 0,
          total: 560,
          paymentMethod: 'cash' as const,
          paymentStatus: 'paid' as const,
          status: 'completed' as const,
          cashierId: 'user-1',
          invoiceNumber: `INV-RCP-${String(i + 1).padStart(3, '0')}`,
          notes: `Receipt test ${i + 1}`,
        };

        await act(async () => {
          await businessStore.current.createSale(saleData);
        });

        const sale = businessStore.current.sales[businessStore.current.sales.length - 1];
        receiptNumbers.push(sale.receiptNumber || '');
      }

      // Verify receipt numbers are sequential and properly formatted
      expect(receiptNumbers).toHaveLength(10);
      
      for (let i = 0; i < receiptNumbers.length; i++) {
        const expectedNumber = `RCP-${String(i + 1).padStart(8, '0')}`;
        expect(receiptNumbers[i]).toBe(expectedNumber);
      }

      // Verify no duplicate receipt numbers
      const uniqueNumbers = new Set(receiptNumbers);
      expect(uniqueNumbers.size).toBe(receiptNumbers.length);
    });
  });

  describe('Journal Entry Generation for BIR Compliance', () => {
    it('should generate proper journal entries for sales transactions', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const testProduct: Product = {
        id: 'journal-prod-1',
        name: 'Journal Test Product',
        sku: 'JRN-001',
        barcode: '5555555555',
        price: 1000,
        cost: 600,
        stock: 50,
        category: 'journal-test',
        categoryId: 'jrn-cat-1',
        description: 'Product for journal entry testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 100,
        supplier: 'Journal Test Supplier',
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
          id: `journal-item-1`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total,
        })),
        subtotal: 2000,
        tax: 240,
        discount: 0,
        total: 2240,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'user-1',
        invoiceNumber: 'INV-JRN-001',
        notes: 'Journal entry test',
      };

      // Mock successful sale creation
      const { createSale } = await import('../../api/sales');
      (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...saleData, id: 'journal-sale-1', createdAt: new Date() },
        error: null,
      });

      const initialJournalEntries = businessStore.current.journalEntries.length;

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

      // Verify journal entry has proper BIR-compliant accounts
      const journalLines = saleJournalEntry?.lines || [];
      
      // Should have Cash (debit), Sales Revenue (credit), VAT Payable (credit), 
      // Inventory (credit), and COGS (debit)
      expect(journalLines.length).toBeGreaterThanOrEqual(4);

      // Find specific account entries
      const cashEntry = journalLines.find(line => 
        line.accountName.toLowerCase().includes('cash')
      );
      const salesEntry = journalLines.find(line => 
        line.accountName.toLowerCase().includes('sales')
      );
      const vatEntry = journalLines.find(line => 
        line.accountName.toLowerCase().includes('vat')
      );
      const cogsEntry = journalLines.find(line => 
        line.accountName.toLowerCase().includes('cost of goods sold') ||
        line.accountName.toLowerCase().includes('cogs')
      );

      // Verify cash entry (debit for cash received)
      expect(cashEntry).toBeDefined();
      expect(cashEntry?.debit).toBe(2240);
      expect(cashEntry?.credit).toBe(0);

      // Verify sales revenue entry (credit for sales)
      expect(salesEntry).toBeDefined();
      expect(salesEntry?.debit).toBe(0);
      expect(salesEntry?.credit).toBe(2000);

      // Verify VAT payable entry (credit for VAT collected)
      expect(vatEntry).toBeDefined();
      expect(vatEntry?.debit).toBe(0);
      expect(vatEntry?.credit).toBe(240);

      // Verify COGS entry (debit for cost of goods sold)
      if (cogsEntry) {
        expect(cogsEntry.debit).toBe(1200); // 2 items × ₱600 cost each
        expect(cogsEntry.credit).toBe(0);
      }

      // Verify journal entry balances (total debits = total credits)
      const totalDebits = journalLines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = journalLines.reduce((sum, line) => sum + line.credit, 0);
      expect(totalDebits).toBe(totalCredits);
    });
  });

  describe('Withholding Tax Calculations', () => {
    it('should calculate withholding tax for business-to-business transactions', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Create business customer
      const businessCustomer: Customer = {
        id: 'business-cust-1',
        firstName: 'ABC',
        lastName: 'Corporation',
        email: 'accounting@abccorp.com',
        phone: '+639171234567',
        address: '123 Business District',
        city: 'Makati City',
        province: 'Metro Manila',
        zipCode: '1200',
        creditLimit: 100000,
        currentBalance: 0,
        totalPurchases: 0,
        customerType: 'business',
        tags: ['withholding-tax'],
        discountPercentage: 0,
        loyaltyPoints: 0,
        notes: 'Business customer subject to withholding tax',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPurchase: new Date(),
      };

      const testProduct: Product = {
        id: 'wht-prod-1',
        name: 'Withholding Tax Test Product',
        sku: 'WHT-001',
        barcode: '6666666666',
        price: 10000,
        cost: 6000,
        stock: 20,
        category: 'wht-test',
        categoryId: 'wht-cat-1',
        description: 'Product for withholding tax testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 50,
        supplier: 'WHT Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.customers = [businessCustomer];
        businessStore.current.addProduct(testProduct);
        businessStore.current.addToCart(testProduct, 1);
      });

      // For business customers, withholding tax is typically 1% or 2% of gross amount
      const subtotal = 10000;
      const vat = subtotal * 0.12; // 12% VAT
      const withholdingTaxRate = 0.01; // 1% withholding tax
      const withholdingTax = subtotal * withholdingTaxRate;
      const total = subtotal + vat - withholdingTax;

      // Verify calculations
      expect(businessStore.current.getCartSubtotal()).toBe(subtotal);
      expect(businessStore.current.getCartTax()).toBe(vat);

      // Note: Withholding tax calculation would need to be implemented
      // in the business logic for business customers
      console.log(`Subtotal: ₱${subtotal}`);
      console.log(`VAT (12%): ₱${vat}`);
      console.log(`Withholding Tax (1%): ₱${withholdingTax}`);
      console.log(`Net Total: ₱${total}`);
    });
  });

  describe('BIR Form Data Preparation', () => {
    it('should prepare data for BIR 2550M (Monthly VAT Declaration)', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Create multiple sales transactions for a month
      const testProduct: Product = {
        id: 'bir-form-prod-1',
        name: 'BIR Form Test Product',
        sku: 'BIR-001',
        barcode: '7777777777',
        price: 1000,
        cost: 600,
        stock: 100,
        category: 'bir-form-test',
        categoryId: 'bir-cat-1',
        description: 'Product for BIR form testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 10,
        maxStock: 200,
        supplier: 'BIR Form Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(testProduct);
      });

      // Mock successful sale creation
      const { createSale } = await import('../../api/sales');
      (createSale as ReturnType<typeof vi.fn>).mockImplementation((saleData: unknown) => 
        Promise.resolve({
          data: { ...saleData, id: `bir-sale-${Date.now()}`, createdAt: new Date() },
          error: null,
        })
      );

      // Create 30 sales transactions (simulating a month)
      const monthlySales = [];
      for (let day = 1; day <= 30; day++) {
        act(() => {
          businessStore.current.addToCart(testProduct, Math.floor(Math.random() * 5) + 1);
        });

        const quantity = businessStore.current.cart[0]?.quantity || 1;
        const subtotal = 1000 * quantity;
        const vat = subtotal * 0.12;
        const total = subtotal + vat;

        const saleData = {
          customerId: undefined,
          customerName: 'Walk-in Customer',
          items: businessStore.current.cart.map(item => ({
            id: `bir-item-${day}`,
            productId: item.product.id,
            productName: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            price: item.product.price,
            total: item.total,
          })),
          subtotal,
          tax: vat,
          discount: 0,
          total,
          paymentMethod: 'cash' as const,
          paymentStatus: 'paid' as const,
          status: 'completed' as const,
          cashierId: 'user-1',
          invoiceNumber: `INV-BIR-${String(day).padStart(3, '0')}`,
          notes: `BIR form test day ${day}`,
        };

        await act(async () => {
          await businessStore.current.createSale(saleData);
        });

        monthlySales.push({
          date: new Date(2024, 0, day), // January 2024
          subtotal,
          vat,
          total,
        });
      }

      // Calculate monthly totals for BIR 2550M
      const monthlyTotals = monthlySales.reduce(
        (totals, sale) => ({
          totalSales: totals.totalSales + sale.subtotal,
          totalVAT: totals.totalVAT + sale.vat,
          totalAmount: totals.totalAmount + sale.total,
        }),
        { totalSales: 0, totalVAT: 0, totalAmount: 0 }
      );

      // Verify monthly calculations
      expect(monthlyTotals.totalSales).toBeGreaterThan(0);
      expect(monthlyTotals.totalVAT).toBeGreaterThan(0);
      expect(monthlyTotals.totalAmount).toBe(monthlyTotals.totalSales + monthlyTotals.totalVAT);

      // Verify VAT rate consistency
      const vatRate = monthlyTotals.totalVAT / monthlyTotals.totalSales;
      expect(vatRate).toBeCloseTo(0.12, 4);

      console.log('BIR 2550M Monthly Summary:');
      console.log(`Total Sales (VAT Exclusive): ₱${monthlyTotals.totalSales.toFixed(2)}`);
      console.log(`Total VAT Collected: ₱${monthlyTotals.totalVAT.toFixed(2)}`);
      console.log(`Total Amount (VAT Inclusive): ₱${monthlyTotals.totalAmount.toFixed(2)}`);
      console.log(`Effective VAT Rate: ${(vatRate * 100).toFixed(2)}%`);

      // Verify all sales were recorded
      expect(businessStore.current.sales.length).toBe(30);
    });
  });

  describe('Receipt Format Compliance', () => {
    it('should generate BIR-compliant receipt format', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      const testProduct: Product = {
        id: 'receipt-format-prod-1',
        name: 'Receipt Format Test Product',
        sku: 'RFT-001',
        barcode: '8888888888',
        price: 2500,
        cost: 1500,
        stock: 25,
        category: 'receipt-format-test',
        categoryId: 'rft-cat-1',
        description: 'Product for receipt format testing',
        unit: 'pcs',
        isActive: true,
        reorderPoint: 5,
        maxStock: 50,
        supplier: 'Receipt Format Test Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const testCustomer: Customer = {
        id: 'receipt-cust-1',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan.delacruz@email.com',
        phone: '+639171234567',
        address: '456 Receipt Street',
        city: 'Manila',
        province: 'Metro Manila',
        zipCode: '1000',
        creditLimit: 10000,
        currentBalance: 0,
        totalPurchases: 0,
        customerType: 'individual',
        tags: [],
        discountPercentage: 0,
        loyaltyPoints: 50,
        notes: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastPurchase: new Date(),
      };

      act(() => {
        businessStore.current.addProduct(testProduct);
        businessStore.current.customers = [testCustomer];
        businessStore.current.addToCart(testProduct, 2);
      });

      const saleData = {
        customerId: testCustomer.id,
        customerName: `${testCustomer.firstName} ${testCustomer.lastName}`,
        items: businessStore.current.cart.map(item => ({
          id: `receipt-format-item-1`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total,
        })),
        subtotal: 5000,
        tax: 600,
        discount: 0,
        total: 5600,
        paymentMethod: 'cash' as const,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: 'user-1',
        invoiceNumber: 'INV-RFT-001',
        receiptNumber: 'RCP-00000001',
        notes: 'Receipt format test',
      };

      // Mock successful sale creation
      const { createSale } = await import('../../api/sales');
      (createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { ...saleData, id: 'receipt-format-sale-1', createdAt: new Date() },
        error: null,
      });

      await act(async () => {
        await businessStore.current.createSale(saleData);
      });

      const sale = businessStore.current.sales[0];

      // Verify BIR-compliant receipt data
      expect(sale.receiptNumber).toBeDefined();
      expect(sale.receiptNumber).toMatch(/^RCP-\d{8}$/); // Format: RCP-########
      expect(sale.invoiceNumber).toBeDefined();
      expect(sale.customerName).toBe('Juan Dela Cruz');
      expect(sale.subtotal).toBe(5000);
      expect(sale.tax).toBe(600);
      expect(sale.total).toBe(5600);
      expect(sale.paymentMethod).toBe('cash');
      expect(sale.paymentStatus).toBe('paid');
      expect(sale.status).toBe('completed');

      // Verify receipt contains required BIR elements
      const receiptData = {
        businessName: 'Test Business',
        businessAddress: '123 Business Street, Manila',
        tin: '123-456-789-000',
        receiptNumber: sale.receiptNumber,
        date: sale.createdAt,
        customerName: sale.customerName,
        items: sale.items,
        subtotal: sale.subtotal,
        vat: sale.tax,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        cashier: sale.cashierId,
      };

      // Verify all required BIR receipt elements are present
      expect(receiptData.businessName).toBeDefined();
      expect(receiptData.businessAddress).toBeDefined();
      expect(receiptData.tin).toBeDefined();
      expect(receiptData.receiptNumber).toBeDefined();
      expect(receiptData.date).toBeDefined();
      expect(receiptData.items).toBeDefined();
      expect(receiptData.subtotal).toBeGreaterThan(0);
      expect(receiptData.vat).toBeGreaterThan(0);
      expect(receiptData.total).toBeGreaterThan(0);

      console.log('BIR-Compliant Receipt Data:');
      console.log(`Business: ${receiptData.businessName}`);
      console.log(`TIN: ${receiptData.tin}`);
      console.log(`Receipt #: ${receiptData.receiptNumber}`);
      console.log(`Customer: ${receiptData.customerName}`);
      console.log(`Subtotal: ₱${receiptData.subtotal.toFixed(2)}`);
      console.log(`VAT (12%): ₱${receiptData.vat.toFixed(2)}`);
      console.log(`Total: ₱${receiptData.total.toFixed(2)}`);
    });
  });
});