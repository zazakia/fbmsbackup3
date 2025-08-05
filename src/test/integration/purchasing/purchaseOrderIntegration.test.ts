import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestDataFactory } from '../../factories/testDataFactory';
import { mockServices } from '../../mocks/mockServices';
import { setupTestEnvironment, cleanupTestData } from '../../utils/testUtils';
import { Product, PurchaseOrder, PurchaseOrderItem, Supplier } from '../../../types/business';

describe('Purchase Order Integration Tests 📦🛒', () => {
  let testProducts: Product[];
  let testSuppliers: Supplier[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
    
    testSuppliers = [
      TestDataFactory.createSupplier({
        id: 'supplier-1',
        name: 'ABC Trading Corp',
        contactPerson: 'John Supplier',
        email: 'john@abctrading.com'
      })
    ];

    testProducts = [
      TestDataFactory.createProduct({
        id: 'prod-po-1',
        name: 'Purchase Test Product 1',
        stock: 10,
        minStock: 50,
        cost: 100,
        price: 150
      })
    ];

    mockServices.supabase.setMockData('suppliers', testSuppliers);
    mockServices.supabase.setMockData('products', testProducts);
    mockServices.supabase.setMockData('purchase_orders', []);
    mockServices.supabase.setMockData('stock_movements', []);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Inventory Increases from Purchase Receipts 📈', () => {
    it('should increase inventory levels when purchase order is received', async () => {
      const purchaseOrderItems: PurchaseOrderItem[] = [
        {
          id: 'po-item-1',
          productId: 'prod-po-1',
          productName: 'Purchase Test Product 1',
          sku: 'SKU-PO-1',
          quantity: 100,
          cost: 100,
          total: 10000
        }
      ];

      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        id: 'po-test-1',
        supplierId: 'supplier-1',
        supplierName: 'ABC Trading Corp',
        items: purchaseOrderItems,
        status: 'sent'
      });

      const createResult = await createPurchaseOrder(purchaseOrder);
      expect(createResult.success).toBe(true);

      const receiveResult = await receivePurchaseOrder(purchaseOrder.id, purchaseOrderItems);
      expect(receiveResult.success).toBe(true);
      expect(receiveResult.inventoryUpdated).toBe(true);

      const updatedProduct = await getProductById('prod-po-1');
      expect(updatedProduct.stock).toBe(110); // 10 + 100

      const movements = await getStockMovements(['prod-po-1']);
      expect(movements.length).toBe(1);
      expect(movements[0].type).toBe('stock_in');
    });
  });
});

// Helper functions
async function createPurchaseOrder(purchaseOrder: PurchaseOrder) {
  try {
    await mockServices.supabase.from('purchase_orders').insert(purchaseOrder);
    return { success: true, purchaseOrderId: purchaseOrder.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function receivePurchaseOrder(purchaseOrderId: string, items: PurchaseOrderItem[]) {
  try {
    for (const item of items) {
      const product = await getProductById(item.productId);
      const newStock = product.stock + item.quantity;

      await mockServices.supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.productId);

      await mockServices.supabase.from('stock_movements').insert({
        id: `mov-${Date.now()}-${Math.random()}`,
        product_id: item.productId,
        type: 'stock_in',
        quantity: item.quantity,
        reason: `Purchase receipt PO-${purchaseOrderId}`,
        performed_by: 'purchasing-system',
        reference_id: purchaseOrderId,
        cost: item.cost,
        created_at: new Date()
      });
    }

    await mockServices.supabase
      .from('purchase_orders')
      .update({ 
        status: 'received',
        receivedDate: new Date()
      })
      .eq('id', purchaseOrderId);

    return {
      success: true,
      inventoryUpdated: true,
      receiptId: `receipt-${Date.now()}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getProductById(productId: string): Promise<Product> {
  const result = await mockServices.supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  return result.data;
}

async function getStockMovements(productIds: string[]) {
  const result = await mockServices.supabase
    .from('stock_movements')
    .select('*')
    .in('product_id', productIds);
  return result.data || [];
}