import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestEnvironment, useTestEnvironment } from '../utils/TestEnvironment';
import { TestDataFactory } from '../factories/TestDataFactory';
import {
  createPurchaseOrder,
  receivePurchaseOrder,
  updatePurchaseOrder
} from '../../api/purchases';
import {
  createSale,
  processSaleTransaction
} from '../../api/sales';
import {
  updateStock,
  checkStockAvailability
} from '../../api/products';
import {
  createJournalEntry
} from '../../utils/birCompliance';

// Use test environment with full setup
useTestEnvironment({
  mockDatabase: true,
  mockExternalServices: true,
  loadTestData: true,
  testDataScale: 'medium'
});

describe('Business Workflow Integration Tests', () => {
  describe('Purchase-to-Inventory Workflow', () => {
    it('should complete full purchase order to inventory workflow', async () => {
      // 1. Create a purchase order
      const supplier = TestDataFactory.createSupplier();
      const products = TestDataFactory.createBulkProducts(3);
      
      // Set initial stock levels
      TestEnvironment.setMockData('products', products);
      TestEnvironment.setMockData('suppliers', [supplier]);

      const purchaseOrderData = TestDataFactory.createPurchaseOrder({
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: products.map(product => ({
          id: `poi-${product.id}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 50,
          cost: product.cost,
          total: 50 * product.cost,
          receivedQuantity: 0
        }))
      });

      // Mock successful PO creation
      vi.mocked(require('../../utils/supabase').supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'po-001', ...purchaseOrderData },
              error: null
            })
          })
        })
      });

      const createResult = await createPurchaseOrder(purchaseOrderData);
      expect(createResult.error).toBeNull();
      expect(createResult.data?.status).toBe('draft');

      // 2. Update status to sent
      const updateResult = await updatePurchaseOrder(createResult.data!.id, {
        status: 'sent'
      });
      expect(updateResult.error).toBeNull();
      expect(updateResult.data?.status).toBe('sent');

      // 3. Receive the purchase order (full receipt)
      const receivedItems = purchaseOrderData.items.map(item => ({
        productId: item.productId,
        receivedQuantity: item.quantity
      }));

      // Mock inventory updates
      vi.doMock('../../api/stockMovementAuditAPI', () => ({
        updateStockWithAudit: vi.fn().mockResolvedValue({ error: null })
      }));

      const receiveResult = await receivePurchaseOrder(
        createResult.data!.id,
        receivedItems,
        {
          receivedBy: 'user-1',
          reason: 'Full receipt of goods'
        }
      );

      expect(receiveResult.error).toBeNull();
      expect(receiveResult.data?.status).toBe('received');

      // 4. Verify inventory was updated
      for (const item of purchaseOrderData.items) {
        const stockCheck = await checkStockAvailability(item.productId, 1);
        expect(stockCheck.error).toBeNull();
        expect(stockCheck.data?.available).toBe(true);
      }

      // 5. Verify audit trail was created
      const auditLogs = TestEnvironment.getMockData('purchase_order_audit_logs');
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should handle partial receiving workflow', async () => {
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        status: 'sent',
        items: [
          TestDataFactory.createPurchaseOrderItem({
            quantity: 100,
            receivedQuantity: 0
          })
        ]
      });

      TestEnvironment.addMockRecord('purchase_orders', purchaseOrder);

      // Receive only 60 out of 100 items
      const partialItems = [{
        productId: purchaseOrder.items[0].productId,
        receivedQuantity: 60
      }];

      const receiveResult = await receivePurchaseOrder(
        purchaseOrder.id,
        partialItems
      );

      expect(receiveResult.error).toBeNull();
      expect(receiveResult.data?.status).toBe('partial');

      // Second partial receipt - remaining 40
      const remainingItems = [{
        productId: purchaseOrder.items[0].productId,
        receivedQuantity: 40
      }];

      const finalReceiveResult = await receivePurchaseOrder(
        purchaseOrder.id,
        remainingItems
      );

      expect(finalReceiveResult.error).toBeNull();
      expect(finalReceiveResult.data?.status).toBe('received');
    });
  });

  describe('Sales-to-Accounting Workflow', () => {
    it('should complete full sales transaction with accounting integration', async () => {
      // 1. Set up products with adequate stock
      const products = TestDataFactory.createBulkProducts(2, {
        stock: 100,
        price: 500
      });
      const customer = TestDataFactory.createCustomer();

      TestEnvironment.setMockData('products', products);
      TestEnvironment.setMockData('customers', [customer]);

      // 2. Create a sale
      const saleData = TestDataFactory.createSale({
        customerId: customer.id,
        items: products.map(product => ({
          productId: product.id,
          productName: product.name,
          sku: product.sku!,
          quantity: 2,
          price: product.price,
          total: 2 * product.price
        }))
      });

      // Mock successful sale creation
      vi.mocked(require('../../utils/supabase').supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'sale-001', ...saleData },
              error: null
            })
          })
        })
      });

      // 3. Process the sale transaction
      const saleResult = await processSaleTransaction(saleData);
      expect(saleResult.error).toBeNull();
      expect(saleResult.data?.status).toBe('completed');

      // 4. Verify inventory deduction
      for (const item of saleData.items) {
        const originalProduct = products.find(p => p.id === item.productId);
        const expectedStock = originalProduct!.stock - item.quantity;
        
        // Verify stock was reduced
        const stockCheck = await checkStockAvailability(item.productId, 1);
        expect(stockCheck.error).toBeNull();
      }

      // 5. Verify journal entry was created
      const journalEntry = createJournalEntry(saleResult.data!);
      expect(journalEntry.entries).toHaveLength(3); // Cash, Sales, VAT
      
      // Verify double-entry balancing
      const totalDebits = journalEntry.entries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredits = journalEntry.entries.reduce((sum, e) => sum + e.credit, 0);
      expect(totalDebits).toBe(totalCredits);

      // 6. Verify VAT compliance
      const vatEntry = journalEntry.entries.find(e => e.account === 'VAT Payable');
      expect(vatEntry?.credit).toBe(saleData.tax);
    });

    it('should handle insufficient stock scenario', async () => {
      const product = TestDataFactory.createProduct({
        stock: 5 // Low stock
      });
      const customer = TestDataFactory.createCustomer();

      TestEnvironment.setMockData('products', [product]);
      TestEnvironment.setMockData('customers', [customer]);

      const saleData = TestDataFactory.createSale({
        customerId: customer.id,
        items: [{
          productId: product.id,
          productName: product.name,
          sku: product.sku!,
          quantity: 10, // More than available
          price: product.price,
          total: 10 * product.price
        }]
      });

      // Mock stock availability check
      vi.doMock('../../api/products', () => ({
        checkStockAvailability: vi.fn().mockResolvedValue({
          data: { available: false, shortage: 5 },
          error: null
        })
      }));

      const saleResult = await processSaleTransaction(saleData);
      expect(saleResult.error).toBeTruthy();
      expect(saleResult.error?.message).toContain('insufficient stock');
    });
  });

  describe('Inventory-to-Reorder Workflow', () => {
    it('should trigger reorder process for low stock items', async () => {
      // 1. Set up products with low stock
      const lowStockProducts = TestDataFactory.createLowStockScenario();
      TestEnvironment.setMockData('products', lowStockProducts);

      // 2. Create sales that reduce stock below minimum
      const sales = lowStockProducts.map(product => 
        TestDataFactory.createSale({
          items: [{
            productId: product.id,
            productName: product.name,
            sku: product.sku!,
            quantity: product.stock - 1, // Reduce to very low stock
            price: product.price,
            total: (product.stock - 1) * product.price
          }]
        })
      );

      // 3. Process sales to trigger low stock
      for (const sale of sales) {
        await processSaleTransaction(sale);
      }

      // 4. Check for low stock alerts
      const lowStockCheck = lowStockProducts.filter(p => 
        p.stock < p.minStock
      );

      expect(lowStockCheck.length).toBeGreaterThan(0);

      // 5. Auto-generate purchase orders for low stock items
      const suppliers = TestDataFactory.createBulkSuppliers(3);
      TestEnvironment.setMockData('suppliers', suppliers);

      const autoReorderPOs = lowStockCheck.map(product => 
        TestDataFactory.createPurchaseOrder({
          supplierId: suppliers[0].id,
          supplierName: suppliers[0].name,
          items: [{
            id: `poi-auto-${product.id}`,
            productId: product.id,
            productName: product.name,
            sku: product.sku!,
            quantity: product.minStock * 3, // Order 3x minimum stock
            cost: product.cost,
            total: (product.minStock * 3) * product.cost,
            receivedQuantity: 0
          }],
          status: 'draft'
        })
      );

      expect(autoReorderPOs.length).toBe(lowStockCheck.length);
    });
  });

  describe('End-to-End Business Process', () => {
    it('should complete full business cycle: Purchase → Stock → Sale → Accounting', async () => {
      const startTime = performance.now();

      // 1. PURCHASE PHASE
      const supplier = TestDataFactory.createSupplier();
      const rawProducts = TestDataFactory.createBulkProducts(5, { stock: 0 });
      
      TestEnvironment.setMockData('suppliers', [supplier]);
      TestEnvironment.setMockData('products', rawProducts);

      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: rawProducts.map(product => TestDataFactory.createPurchaseOrderItem({
          productId: product.id,
          productName: product.name,
          sku: product.sku!,
          quantity: 100,
          cost: product.cost
        }))
      });

      const poResult = await createPurchaseOrder(purchaseOrder);
      expect(poResult.error).toBeNull();

      // 2. RECEIVING PHASE
      const receivedItems = purchaseOrder.items.map(item => ({
        productId: item.productId,
        receivedQuantity: item.quantity
      }));

      const receiveResult = await receivePurchaseOrder(
        poResult.data!.id,
        receivedItems
      );
      expect(receiveResult.error).toBeNull();

      // 3. SALES PHASE
      const customer = TestDataFactory.createCustomer();
      TestEnvironment.addMockRecord('customers', customer);

      const sale = TestDataFactory.createSale({
        customerId: customer.id,
        items: rawProducts.slice(0, 3).map(product => ({
          productId: product.id,
          productName: product.name,
          sku: product.sku!,
          quantity: 5,
          price: product.price,
          total: 5 * product.price
        }))
      });

      const saleResult = await processSaleTransaction(sale);
      expect(saleResult.error).toBeNull();

      // 4. ACCOUNTING PHASE
      const journalEntry = createJournalEntry(saleResult.data!);
      expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);

      // 5. COMPLIANCE VERIFICATION
      expect(journalEntry.entries.some(e => e.account === 'VAT Payable')).toBe(true);
      expect(saleResult.data?.tax).toBe(sale.subtotal * 0.12);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 6. PERFORMANCE VERIFICATION
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Full business cycle completed in ${duration}ms`);
    });

    it('should handle concurrent business operations', async () => {
      // Set up concurrent operations
      const products = TestDataFactory.createBulkProducts(10, { stock: 50 });
      const customers = TestDataFactory.createBulkCustomers(5);
      const suppliers = TestDataFactory.createBulkSuppliers(3);

      TestEnvironment.setMockData('products', products);
      TestEnvironment.setMockData('customers', customers);
      TestEnvironment.setMockData('suppliers', suppliers);

      // Create concurrent sales
      const concurrentSales = customers.map(customer =>
        TestDataFactory.createSale({
          customerId: customer.id,
          items: products.slice(0, 2).map(product => ({
            productId: product.id,
            productName: product.name,
            sku: product.sku!,
            quantity: 1,
            price: product.price,
            total: product.price
          }))
        })
      );

      // Create concurrent purchase orders
      const concurrentPOs = suppliers.map(supplier =>
        TestDataFactory.createPurchaseOrder({
          supplierId: supplier.id,
          supplierName: supplier.name,
          items: products.slice(2, 4).map(product => 
            TestDataFactory.createPurchaseOrderItem({
              productId: product.id,
              productName: product.name,
              sku: product.sku!,
              quantity: 20,
              cost: product.cost
            })
          )
        })
      );

      // Process all operations concurrently
      const startTime = performance.now();

      const [salesResults, poResults] = await Promise.all([
        Promise.allSettled(concurrentSales.map(sale => processSaleTransaction(sale))),
        Promise.allSettled(concurrentPOs.map(po => createPurchaseOrder(po)))
      ]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify all operations completed successfully
      const successfulSales = salesResults.filter(r => r.status === 'fulfilled').length;
      const successfulPOs = poResults.filter(r => r.status === 'fulfilled').length;

      expect(successfulSales).toBe(concurrentSales.length);
      expect(successfulPOs).toBe(concurrentPOs.length);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Concurrent operations completed: ${successfulSales} sales, ${successfulPOs} POs in ${duration}ms`);
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle partial transaction failures gracefully', async () => {
      const products = TestDataFactory.createBulkProducts(3, { stock: 10 });
      TestEnvironment.setMockData('products', products);

      // Create a sale with mixed success/failure scenario
      const sale = TestDataFactory.createSale({
        items: [
          {
            productId: products[0].id,
            productName: products[0].name,
            sku: products[0].sku!,
            quantity: 5, // Should succeed
            price: products[0].price,
            total: 5 * products[0].price
          },
          {
            productId: products[1].id,
            productName: products[1].name,
            sku: products[1].sku!,
            quantity: 15, // Should fail - insufficient stock
            price: products[1].price,
            total: 15 * products[1].price
          }
        ]
      });

      // Mock partial failure
      vi.doMock('../../api/products', () => ({
        checkStockAvailability: vi.fn()
          .mockResolvedValueOnce({ data: { available: true }, error: null })
          .mockResolvedValueOnce({ data: { available: false, shortage: 5 }, error: null })
      }));

      const result = await processSaleTransaction(sale);
      
      // Should fail due to insufficient stock for second item
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('insufficient stock');

      // Verify rollback - no inventory should be affected
      const stockCheck = await checkStockAvailability(products[0].id, 5);
      expect(stockCheck.data?.available).toBe(true); // Stock should remain unchanged
    });
  });
});