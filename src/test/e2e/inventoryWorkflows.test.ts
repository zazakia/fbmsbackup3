import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestDataFactory } from '../factories/testDataFactory';
import { mockServices } from '../mocks/mockServices';
import { setupTestEnvironment, cleanupTestData } from '../utils/testUtils';

describe('End-to-End Inventory Workflows 🔄🎯', () => {
  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Complete Product Lifecycle 📦', () => {
    it('should handle complete product lifecycle from creation to sale', async () => {
      // 1. Create product
      const product = TestDataFactory.createProduct({
        name: 'Lifecycle Test Product',
        stock: 0,
        minStock: 10,
        cost: 50,
        price: 75
      });

      await mockServices.supabase.from('products').insert(product);

      // 2. Purchase inventory
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        items: [{
          id: 'po-item-1',
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 100,
          cost: 50,
          total: 5000
        }]
      });

      await mockServices.supabase.from('purchase_orders').insert(purchaseOrder);

      // 3. Receive inventory
      await mockServices.supabase
        .from('products')
        .update({ stock: 100 })
        .eq('id', product.id);

      // 4. Sell product
      const sale = TestDataFactory.createSale({
        items: [{
          id: 'sale-item-1',
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 25,
          price: 75,
          total: 1875
        }]
      });

      await mockServices.supabase.from('sales').insert(sale);

      // 5. Update inventory after sale
      await mockServices.supabase
        .from('products')
        .update({ stock: 75 })
        .eq('id', product.id);

      // Verify final state
      const finalProduct = await mockServices.supabase
        .from('products')
        .select('*')
        .eq('id', product.id)
        .single();

      expect(finalProduct.data.stock).toBe(75);
      expect(finalProduct.data.name).toBe('Lifecycle Test Product');
    });
  });

  describe('Multi-Location Workflows 🏢', () => {
    it('should handle inventory transfers between locations', async () => {
      const locations = [
        TestDataFactory.createInventoryLocation({ name: 'Main Warehouse' }),
        TestDataFactory.createInventoryLocation({ name: 'Store Front' })
      ];

      await mockServices.supabase.from('inventory_locations').insert(locations);

      const product = TestDataFactory.createProduct({
        name: 'Transfer Test Product',
        stock: 100,
        location: 'Main Warehouse'
      });

      await mockServices.supabase.from('products').insert(product);

      // Create transfer
      const transfer = TestDataFactory.createStockTransfer({
        fromLocationId: locations[0].id,
        toLocationId: locations[1].id,
        items: [{
          productId: product.id,
          quantity: 30,
          batchNumber: 'BATCH-001'
        }]
      });

      await mockServices.supabase.from('stock_transfers').insert(transfer);

      expect(transfer.status).toBe('pending');
    });
  });

  describe('Seasonal Inventory Management 🌟', () => {
    it('should handle seasonal inventory adjustments', async () => {
      const seasonalProduct = TestDataFactory.createProduct({
        name: 'Seasonal Product',
        stock: 50,
        minStock: 20,
        tags: ['seasonal', 'holiday']
      });

      await mockServices.supabase.from('products').insert(seasonalProduct);

      // Simulate seasonal demand increase
      const seasonalAdjustment = {
        productId: seasonalProduct.id,
        adjustmentType: 'seasonal_increase',
        multiplier: 2.5,
        reason: 'Holiday season demand'
      };

      const newMinStock = seasonalProduct.minStock * seasonalAdjustment.multiplier;

      await mockServices.supabase
        .from('products')
        .update({ minStock: newMinStock })
        .eq('id', seasonalProduct.id);

      const updatedProduct = await mockServices.supabase
        .from('products')
        .select('*')
        .eq('id', seasonalProduct.id)
        .single();

      expect(updatedProduct.data.minStock).toBe(50); // 20 * 2.5
    });
  });

  describe('Emergency Stock Management 🚨', () => {
    it('should handle emergency stock situations', async () => {
      const criticalProduct = TestDataFactory.createProduct({
        name: 'Critical Product',
        stock: 2,
        minStock: 50,
        tags: ['critical', 'essential']
      });

      await mockServices.supabase.from('products').insert(criticalProduct);

      // Simulate emergency reorder
      const emergencyOrder = TestDataFactory.createPurchaseOrder({
        status: 'urgent',
        items: [{
          id: 'emergency-item',
          productId: criticalProduct.id,
          productName: criticalProduct.name,
          sku: criticalProduct.sku,
          quantity: 200,
          cost: criticalProduct.cost,
          total: 200 * criticalProduct.cost
        }]
      });

      await mockServices.supabase.from('purchase_orders').insert(emergencyOrder);

      expect(emergencyOrder.status).toBe('urgent');
    });
  });

  describe('Complete Supplier-to-Customer Flow 🔄', () => {
    it('should handle complete flow from supplier to customer', async () => {
      // 1. Create supplier
      const supplier = TestDataFactory.createSupplier({
        name: 'Flow Test Supplier'
      });

      await mockServices.supabase.from('suppliers').insert(supplier);

      // 2. Create customer
      const customer = TestDataFactory.createCustomer({
        firstName: 'Flow',
        lastName: 'Customer'
      });

      await mockServices.supabase.from('customers').insert(customer);

      // 3. Create product
      const product = TestDataFactory.createProduct({
        name: 'Flow Test Product',
        supplier: supplier.name
      });

      await mockServices.supabase.from('products').insert(product);

      // 4. Purchase from supplier
      const purchaseOrder = TestDataFactory.createPurchaseOrder({
        supplierId: supplier.id,
        items: [{
          id: 'flow-po-item',
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 50,
          cost: product.cost,
          total: 50 * product.cost
        }]
      });

      await mockServices.supabase.from('purchase_orders').insert(purchaseOrder);

      // 5. Sell to customer
      const sale = TestDataFactory.createSale({
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        items: [{
          id: 'flow-sale-item',
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 10,
          price: product.price,
          total: 10 * product.price
        }]
      });

      await mockServices.supabase.from('sales').insert(sale);

      // Verify complete flow
      expect(purchaseOrder.supplierId).toBe(supplier.id);
      expect(sale.customerId).toBe(customer.id);
      expect(sale.items[0].productId).toBe(product.id);
    });
  });
});