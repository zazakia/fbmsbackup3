import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBusinessStore } from '../store/businessStore';
import type { Sale, PurchaseOrder, Product } from '../types/business';

// Mock data
const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Test Product 1',
    sku: 'TEST-001',
    barcode: '123456789',
    price: 100,
    cost: 60,
    stock: 50,
    minStock: 10,
    categoryId: 'cat-1',
    unit: 'piece',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod-2',
    name: 'Test Product 2',
    sku: 'TEST-002',
    barcode: '987654321',
    price: 200,
    cost: 120,
    stock: 30,
    minStock: 5,
    categoryId: 'cat-1',
    unit: 'piece',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockSale: Omit<Sale, 'id' | 'createdAt'> = {
  invoiceNumber: 'INV-001',
  customerId: 'cust-1',
  customerName: 'Test Customer',
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      productName: 'Test Product 1',
      sku: 'TEST-001',
      quantity: 2,
      price: 100,
      total: 200
    },
    {
      id: 'item-2',
      productId: 'prod-2',
      productName: 'Test Product 2',
      sku: 'TEST-002',
      quantity: 1,
      price: 200,
      total: 200
    }
  ],
  subtotal: 400,
  tax: 48, // 12% VAT
  discount: 0,
  total: 448,
  paymentMethod: 'cash',
  paymentStatus: 'paid',
  status: 'completed',
  cashierId: 'user-1',
  notes: 'Test sale'
};

const mockPurchaseOrder: Omit<PurchaseOrder, 'id' | 'createdAt'> = {
  poNumber: 'PO-001',
  supplierId: 'supp-1',
  supplierName: 'Test Supplier',
  items: [
    {
      id: 'po-item-1',
      productId: 'prod-1',
      productName: 'Test Product 1',
      sku: 'TEST-001',
      quantity: 20,
      cost: 60,
      total: 1200
    },
    {
      id: 'po-item-2',
      productId: 'prod-2',
      productName: 'Test Product 2',
      sku: 'TEST-002',
      quantity: 10,
      cost: 120,
      total: 1200
    }
  ],
  subtotal: 2400,
  tax: 288, // 12% VAT
  total: 2688,
  status: 'draft',
  expectedDate: new Date(),
  createdBy: 'user-1'
};

describe('Integration Fixes Tests', () => {
  beforeEach(() => {
    // Get fresh store state and reset it
    const defaultState = useBusinessStore.getState();
    
    // Reset store state completely
    useBusinessStore.setState({
      products: [...mockProducts],
      sales: [],
      purchaseOrders: [],
      journalEntries: [],
      accounts: defaultState.accounts, // Keep default accounts
      cart: [],
      customers: defaultState.customers,
      categories: defaultState.categories,
      suppliers: defaultState.suppliers,
      expenses: defaultState.expenses,
      expenseCategories: defaultState.expenseCategories,
      employees: defaultState.employees,
      payrollPeriods: defaultState.payrollPeriods,
      payrollEntries: defaultState.payrollEntries,
      leaveRecords: defaultState.leaveRecords,
      timeRecords: defaultState.timeRecords,
      payrollSettings: defaultState.payrollSettings,
      isLoading: false,
      error: null
    });
  });

  describe('Sales → Accounting Integration', () => {
    it('should create automatic journal entry when sale is completed', () => {
      const store = useBusinessStore.getState();
      const initialJournalEntries = store.journalEntries.length;
      
      // Create a sale
      store.createSale(mockSale);
      
      // Check that journal entry was created
      const updatedJournalEntries = useBusinessStore.getState().journalEntries;
      expect(updatedJournalEntries.length).toBe(initialJournalEntries + 1);
      
      const journalEntry = updatedJournalEntries[updatedJournalEntries.length - 1];
      expect(journalEntry.reference).toBe(mockSale.invoiceNumber);
      expect(journalEntry.description).toContain('Test Customer');
    });

    it('should create correct journal entry lines for sale', () => {
      const store = useBusinessStore.getState();
      store.createSale(mockSale);
      
      const journalEntries = useBusinessStore.getState().journalEntries;
      const journalEntry = journalEntries[journalEntries.length - 1];
      
      // Should have 5 lines: Cash (DR), Sales Revenue (CR), VAT Payable (CR), COGS (DR), Inventory (CR)
      expect(journalEntry.lines.length).toBe(5);
      
      // Find specific lines
      const cashLine = journalEntry.lines.find(line => line.accountName === 'Cash on Hand');
      const salesLine = journalEntry.lines.find(line => line.accountName === 'Sales Revenue');
      const vatLine = journalEntry.lines.find(line => line.accountName === 'VAT Payable');
      const cogsLine = journalEntry.lines.find(line => line.accountName === 'Cost of Goods Sold');
      const inventoryLine = journalEntry.lines.find(line => line.accountName === 'Inventory');
      
      // Verify cash debit (total amount received)
      expect(cashLine?.debit).toBe(448);
      expect(cashLine?.credit).toBe(0);
      
      // Verify sales revenue credit (subtotal without tax)
      expect(salesLine?.debit).toBe(0);
      expect(salesLine?.credit).toBe(400);
      
      // Verify VAT payable credit
      expect(vatLine?.debit).toBe(0);
      expect(vatLine?.credit).toBe(48);
      
      // Verify COGS debit (total cost of items sold)
      const expectedCogs = (60 * 2) + (120 * 1); // 240
      expect(cogsLine?.debit).toBe(expectedCogs);
      expect(cogsLine?.credit).toBe(0);
      
      // Verify inventory credit (reduction)
      expect(inventoryLine?.debit).toBe(0);
      expect(inventoryLine?.credit).toBe(expectedCogs);
    });

    it('should handle sales without VAT correctly', () => {
      const store = useBusinessStore.getState();
      const saleWithoutVat = { ...mockSale, tax: 0, total: 400 };
      store.createSale(saleWithoutVat);
      
      const journalEntries = useBusinessStore.getState().journalEntries;
      const journalEntry = journalEntries[journalEntries.length - 1];
      
      // Should have 4 lines: Cash (DR), Sales Revenue (CR), COGS (DR), Inventory (CR)
      // No VAT line
      expect(journalEntry.lines.length).toBe(4);
      
      const vatLine = journalEntry.lines.find(line => line.accountName === 'VAT Payable');
      expect(vatLine).toBeUndefined();
    });

    it('should update inventory stock when sale is created', () => {
      const store = useBusinessStore.getState();
      const initialProduct1Stock = store.products.find(p => p.id === 'prod-1')?.stock || 0;
      const initialProduct2Stock = store.products.find(p => p.id === 'prod-2')?.stock || 0;
      
      store.createSale(mockSale);
      
      const updatedProducts = useBusinessStore.getState().products;
      const product1 = updatedProducts.find(p => p.id === 'prod-1');
      const product2 = updatedProducts.find(p => p.id === 'prod-2');
      
      // Stock should be reduced by sale quantities
      expect(product1?.stock).toBe(initialProduct1Stock - 2);
      expect(product2?.stock).toBe(initialProduct2Stock - 1);
    });

    it('should clear cart after sale completion', () => {
      const store = useBusinessStore.getState();
      // Add items to cart first
      store.addToCart(mockProducts[0], 2);
      store.addToCart(mockProducts[1], 1);
      
      expect(useBusinessStore.getState().cart.length).toBe(2);
      
      store.createSale(mockSale);
      
      // Cart should be cleared
      expect(useBusinessStore.getState().cart.length).toBe(0);
    });
  });

  describe('Purchase → Inventory Integration', () => {
    let purchaseOrderId: string;

    beforeEach(() => {
      const store = useBusinessStore.getState();
      // Create a purchase order first
      store.addPurchaseOrder(mockPurchaseOrder);
      const purchaseOrders = useBusinessStore.getState().purchaseOrders;
      purchaseOrderId = purchaseOrders[purchaseOrders.length - 1].id;
    });

    it('should update inventory when purchase order is received', () => {
      const store = useBusinessStore.getState();
      const initialProduct1Stock = store.products.find(p => p.id === 'prod-1')?.stock || 0;
      const initialProduct2Stock = store.products.find(p => p.id === 'prod-2')?.stock || 0;
      
      const receivedItems = [
        { productId: 'prod-1', receivedQuantity: 20 },
        { productId: 'prod-2', receivedQuantity: 10 }
      ];
      
      store.receivePurchaseOrder(purchaseOrderId, receivedItems);
      
      const updatedProducts = useBusinessStore.getState().products;
      const product1 = updatedProducts.find(p => p.id === 'prod-1');
      const product2 = updatedProducts.find(p => p.id === 'prod-2');
      
      // Stock should be increased by received quantities
      expect(product1?.stock).toBe(initialProduct1Stock + 20);
      expect(product2?.stock).toBe(initialProduct2Stock + 10);
    });

    it('should update purchase order status when fully received', () => {
      const store = useBusinessStore.getState();
      const receivedItems = [
        { productId: 'prod-1', receivedQuantity: 20 },
        { productId: 'prod-2', receivedQuantity: 10 }
      ];
      
      store.receivePurchaseOrder(purchaseOrderId, receivedItems);
      
      const updatedPO = useBusinessStore.getState().purchaseOrders.find(po => po.id === purchaseOrderId);
      expect(updatedPO?.status).toBe('received');
      expect(updatedPO?.receivedDate).toBeDefined();
    });

    it('should set status to partial when partially received', () => {
      const store = useBusinessStore.getState();
      const receivedItems = [
        { productId: 'prod-1', receivedQuantity: 15 }, // Partial (ordered 20)
        { productId: 'prod-2', receivedQuantity: 10 }  // Full (ordered 10)
      ];
      
      store.receivePurchaseOrder(purchaseOrderId, receivedItems);
      
      const updatedPO = useBusinessStore.getState().purchaseOrders.find(po => po.id === purchaseOrderId);
      expect(updatedPO?.status).toBe('partial');
      expect(updatedPO?.receivedDate).toBeUndefined(); // No received date for partial
    });

    it('should update product costs from purchase order', () => {
      const store = useBusinessStore.getState();
      const initialProduct1Cost = store.products.find(p => p.id === 'prod-1')?.cost;
      
      // Create PO with different cost
      const poWithDifferentCost = {
        ...mockPurchaseOrder,
        items: [{
          ...mockPurchaseOrder.items[0],
          cost: 70 // Different from current cost of 60
        }]
      };
      
      store.addPurchaseOrder(poWithDifferentCost);
      const newPOs = useBusinessStore.getState().purchaseOrders;
      const newPOId = newPOs[newPOs.length - 1].id;
      
      const receivedItems = [{ productId: 'prod-1', receivedQuantity: 20 }];
      store.receivePurchaseOrder(newPOId, receivedItems);
      
      const updatedProduct = useBusinessStore.getState().products.find(p => p.id === 'prod-1');
      expect(updatedProduct?.cost).toBe(70);
      expect(updatedProduct?.cost).not.toBe(initialProduct1Cost);
    });

    it('should handle invalid purchase order ID gracefully', () => {
      const store = useBusinessStore.getState();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const receivedItems = [{ productId: 'prod-1', receivedQuantity: 10 }];
      store.receivePurchaseOrder('invalid-id', receivedItems);
      
      expect(consoleSpy).toHaveBeenCalledWith('Purchase order invalid-id not found');
      consoleSpy.mockRestore();
    });
  });

  describe('Purchase → Accounting Integration', () => {
    let purchaseOrderId: string;

    beforeEach(() => {
      const store = useBusinessStore.getState();
      store.addPurchaseOrder(mockPurchaseOrder);
      const purchaseOrders = useBusinessStore.getState().purchaseOrders;
      purchaseOrderId = purchaseOrders[purchaseOrders.length - 1].id;
    });

    it('should create journal entry when purchase order is received', () => {
      const store = useBusinessStore.getState();
      const initialJournalEntries = useBusinessStore.getState().journalEntries.length;
      
      const receivedItems = [
        { productId: 'prod-1', receivedQuantity: 20 },
        { productId: 'prod-2', receivedQuantity: 10 }
      ];
      
      store.receivePurchaseOrder(purchaseOrderId, receivedItems);
      
      const updatedJournalEntries = useBusinessStore.getState().journalEntries;
      expect(updatedJournalEntries.length).toBe(initialJournalEntries + 1);
      
      const journalEntry = updatedJournalEntries[updatedJournalEntries.length - 1];
      expect(journalEntry.reference).toBe(mockPurchaseOrder.poNumber);
      expect(journalEntry.description).toContain('Test Supplier');
    });

    it('should create correct journal entry lines for purchase', () => {
      const store = useBusinessStore.getState();
      const receivedItems = [
        { productId: 'prod-1', receivedQuantity: 20 },
        { productId: 'prod-2', receivedQuantity: 10 }
      ];
      
      store.receivePurchaseOrder(purchaseOrderId, receivedItems);
      
      const journalEntries = useBusinessStore.getState().journalEntries;
      const journalEntry = journalEntries[journalEntries.length - 1];
      
      // Should have at least 2 lines: Inventory (DR), Accounts Payable (CR)
      expect(journalEntry.lines.length).toBeGreaterThanOrEqual(2);
      
      const inventoryLine = journalEntry.lines.find(line => line.accountName === 'Inventory');
      const payableLine = journalEntry.lines.find(line => line.accountName === 'Accounts Payable');
      
      // Calculate expected values
      const totalInventoryValue = (60 * 20) + (120 * 10); // 2400
      
      // Verify inventory debit
      expect(inventoryLine?.debit).toBeGreaterThan(0);
      expect(inventoryLine?.credit).toBe(0);
      
      // Verify accounts payable credit
      expect(payableLine?.debit).toBe(0);
      expect(payableLine?.credit).toBe(totalInventoryValue);
    });

    it('should handle partial receipts correctly', () => {
      const store = useBusinessStore.getState();
      const receivedItems = [
        { productId: 'prod-1', receivedQuantity: 10 }, // Partial (ordered 20)
      ];
      
      store.receivePurchaseOrder(purchaseOrderId, receivedItems);
      
      const journalEntries = useBusinessStore.getState().journalEntries;
      const journalEntry = journalEntries[journalEntries.length - 1];
      
      const inventoryLine = journalEntry.lines.find(line => line.accountName === 'Inventory');
      
      // Should create entry only for received items
      expect(inventoryLine?.debit).toBeLessThan(2400); // Less than full PO value
    });

    it('should not create journal entry when no items received', () => {
      const store = useBusinessStore.getState();
      const initialJournalEntries = useBusinessStore.getState().journalEntries.length;
      
      const receivedItems = [
        { productId: 'prod-1', receivedQuantity: 0 },
        { productId: 'prod-2', receivedQuantity: 0 }
      ];
      
      store.receivePurchaseOrder(purchaseOrderId, receivedItems);
      
      const updatedJournalEntries = useBusinessStore.getState().journalEntries;
      expect(updatedJournalEntries.length).toBe(initialJournalEntries); // No new entry
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle missing accounts gracefully in sales integration', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Clear accounts to simulate missing accounts
      useBusinessStore.setState({ accounts: [] });
      
      const store = useBusinessStore.getState();
      store.createSale(mockSale);
      
      expect(consoleSpy).toHaveBeenCalledWith('Required accounts not found for journal entry creation');
      consoleSpy.mockRestore();
    });

    it('should handle missing accounts gracefully in purchase integration', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Clear accounts to simulate missing accounts
      useBusinessStore.setState({ accounts: [] });
      
      const store = useBusinessStore.getState();
      store.addPurchaseOrder(mockPurchaseOrder);
      const purchaseOrders = useBusinessStore.getState().purchaseOrders;
      const purchaseOrderId = purchaseOrders[purchaseOrders.length - 1].id;
      
      const receivedItems = [{ productId: 'prod-1', receivedQuantity: 10 }];
      store.receivePurchaseOrder(purchaseOrderId, receivedItems);
      
      expect(consoleSpy).toHaveBeenCalledWith('Required accounts not found for purchase journal entry creation');
      consoleSpy.mockRestore();
    });

    it('should handle missing products gracefully', () => {
      const saleWithInvalidProduct = {
        ...mockSale,
        items: [{
          id: 'item-1',
          productId: 'invalid-product-id',
          productName: 'Invalid Product',
          sku: 'INVALID',
          quantity: 1,
          price: 100,
          total: 100
        }]
      };
      
      const store = useBusinessStore.getState();
      // Should not throw error
      expect(() => store.createSale(saleWithInvalidProduct)).not.toThrow();
    });
  });

  describe('Double Entry Validation', () => {
    it('should maintain accounting equation balance in sales', () => {
      const store = useBusinessStore.getState();
      store.createSale(mockSale);
      
      const journalEntries = useBusinessStore.getState().journalEntries;
      expect(journalEntries.length).toBeGreaterThan(0);
      
      const journalEntry = journalEntries[journalEntries.length - 1];
      expect(journalEntry).toBeDefined();
      expect(journalEntry.lines).toBeDefined();
      
      const totalDebits = journalEntry.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = journalEntry.lines.reduce((sum, line) => sum + line.credit, 0);
      
      // Debits should equal credits
      expect(totalDebits).toBe(totalCredits);
    });

    it('should maintain accounting equation balance in purchases', () => {
      const store = useBusinessStore.getState();
      store.addPurchaseOrder(mockPurchaseOrder);
      const purchaseOrders = useBusinessStore.getState().purchaseOrders;
      const purchaseOrderId = purchaseOrders[purchaseOrders.length - 1].id;
      
      const receivedItems = [
        { productId: 'prod-1', receivedQuantity: 20 },
        { productId: 'prod-2', receivedQuantity: 10 }
      ];
      
      store.receivePurchaseOrder(purchaseOrderId, receivedItems);
      
      const journalEntries = useBusinessStore.getState().journalEntries;
      expect(journalEntries.length).toBeGreaterThan(0);
      
      const journalEntry = journalEntries[journalEntries.length - 1];
      expect(journalEntry).toBeDefined();
      expect(journalEntry.lines).toBeDefined();
      
      const totalDebits = journalEntry.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = journalEntry.lines.reduce((sum, line) => sum + line.credit, 0);
      
      // Debits should equal credits
      expect(totalDebits).toBe(totalCredits);
    });
  });
});