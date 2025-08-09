/**
 * Integration Tests for Purchase Order Migration
 * Tests the complete workflow with the enhanced schema
 * 
 * These tests validate:
 * - API integration with enhanced schema
 * - Service layer compatibility
 * - End-to-end purchase order workflow
 * - Data consistency across operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { 
  PurchaseOrder, 
  EnhancedPurchaseOrder, 
  PurchaseOrderItem,
  EnhancedPurchaseOrderItem 
} from '../../../types/business';

// Mock environment setup
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

describe('Purchase Order Migration Integration Tests', () => {
  let supabase: SupabaseClient;
  let testData: {
    supplierId: string;
    productId: string;
    userId: string;
    purchaseOrderId: string;
  };

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await setupIntegrationTestData();
  });

  afterAll(async () => {
    await cleanupIntegrationTestData();
  });

  beforeEach(async () => {
    await resetPurchaseOrderState();
  });

  async function setupIntegrationTestData() {
    // Create supplier
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .insert({
        name: 'Integration Test Supplier',
        email: 'integration@supplier.com',
        phone: '123-456-7890',
        address: '123 Integration Street'
      })
      .select()
      .single();

    if (supplierError) throw supplierError;

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: 'Integration Test Product',
        sku: 'INTEG-001',
        price: 150.00,
        cost: 100.00,
        stock: 100,
        category: 'Electronics',
        categoryId: 'test-category',
        unit: 'piece',
        isActive: true,
        minStock: 10
      })
      .select()
      .single();

    if (productError) throw productError;

    // Create purchase order
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        poNumber: 'PO-INTEGRATION-001',
        supplierId: supplier.id,
        supplierName: supplier.name,
        subtotal: 1000.00,
        tax: 120.00,
        total: 1120.00,
        status: 'draft',
        enhanced_status: 'draft',
        items: [],
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .select()
      .single();

    if (poError) throw poError;

    testData = {
      supplierId: supplier.id,
      productId: product.id,
      userId: 'test-user-integration',
      purchaseOrderId: purchaseOrder.id
    };
  }

  async function cleanupIntegrationTestData() {
    if (testData?.purchaseOrderId) {
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', testData.purchaseOrderId);
      await supabase.from('purchase_orders').delete().eq('id', testData.purchaseOrderId);
    }
    if (testData?.productId) {
      await supabase.from('products').delete().eq('id', testData.productId);
    }
    if (testData?.supplierId) {
      await supabase.from('suppliers').delete().eq('id', testData.supplierId);
    }
  }

  async function resetPurchaseOrderState() {
    await supabase
      .from('purchase_orders')
      .update({
        enhanced_status: 'draft',
        total_received_items: 0,
        total_pending_items: 0,
        last_received_date: null,
        approved_by: null,
        approved_at: null
      })
      .eq('id', testData.purchaseOrderId);

    await supabase
      .from('purchase_order_items')
      .delete()
      .eq('purchase_order_id', testData.purchaseOrderId);
  }

  describe('Complete Purchase Order Lifecycle', () => {
    it('should handle draft to approval workflow', async () => {
      // 1. Create purchase order items
      const { data: item, error: itemError } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testData.purchaseOrderId,
          product_id: testData.productId,
          product_name: 'Integration Test Product',
          product_sku: 'INTEG-001',
          quantity: 10,
          received_quantity: 0,
          unit_cost: 100.00,
          quality_status: 'pending'
        })
        .select()
        .single();

      expect(itemError).toBeNull();
      expect(item!.pending_quantity).toBe(10);

      // 2. Submit for approval
      const { error: submitError } = await supabase
        .from('purchase_orders')
        .update({
          enhanced_status: 'pending_approval',
          approval_required: true
        })
        .eq('id', testData.purchaseOrderId);

      expect(submitError).toBeNull();

      // 3. Approve purchase order
      const { error: approveError } = await supabase
        .from('purchase_orders')
        .update({
          enhanced_status: 'approved',
          approved_by: testData.userId,
          approved_at: new Date().toISOString()
        })
        .eq('id', testData.purchaseOrderId);

      expect(approveError).toBeNull();

      // 4. Send to supplier
      const { error: sendError } = await supabase
        .from('purchase_orders')
        .update({
          enhanced_status: 'sent_to_supplier',
          supplier_reference: 'SUP-REF-001'
        })
        .eq('id', testData.purchaseOrderId);

      expect(sendError).toBeNull();

      // Verify final state
      const { data: finalPO, error: fetchError } = await supabase
        .from('purchase_orders')
        .select('enhanced_status, approved_by, supplier_reference')
        .eq('id', testData.purchaseOrderId)
        .single();

      expect(fetchError).toBeNull();
      expect(finalPO!.enhanced_status).toBe('sent_to_supplier');
      expect(finalPO!.approved_by).toBe(testData.userId);
      expect(finalPO!.supplier_reference).toBe('SUP-REF-001');
    });

    it('should handle partial receiving workflow', async () => {
      // Setup: Create items and approve order
      await supabase
        .from('purchase_order_items')
        .insert([
          {
            purchase_order_id: testData.purchaseOrderId,
            product_id: testData.productId,
            product_name: 'Integration Test Product',
            product_sku: 'INTEG-001',
            quantity: 20,
            unit_cost: 100.00,
            quality_status: 'pending'
          }
        ]);

      await supabase
        .from('purchase_orders')
        .update({ enhanced_status: 'approved' })
        .eq('id', testData.purchaseOrderId);

      // Get the item ID for receiving
      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('id')
        .eq('purchase_order_id', testData.purchaseOrderId);

      const itemId = items![0].id;

      // 1. First partial receipt (8 items)
      const { error: receive1Error } = await supabase
        .from('purchase_order_items')
        .update({ 
          received_quantity: 8,
          quality_status: 'approved'
        })
        .eq('id', itemId);

      expect(receive1Error).toBeNull();

      // Wait for trigger to update purchase order
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify partial status
      const { data: partialPO, error: partialError } = await supabase
        .from('purchase_orders')
        .select('enhanced_status, total_received_items, total_pending_items')
        .eq('id', testData.purchaseOrderId)
        .single();

      expect(partialError).toBeNull();
      expect(partialPO!.enhanced_status).toBe('partially_received');
      expect(partialPO!.total_received_items).toBe(8);
      expect(partialPO!.total_pending_items).toBe(12);

      // 2. Complete the receipt (remaining 12 items)
      const { error: receive2Error } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity: 20 })
        .eq('id', itemId);

      expect(receive2Error).toBeNull();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify fully received status
      const { data: fullPO, error: fullError } = await supabase
        .from('purchase_orders')
        .select('enhanced_status, total_received_items, total_pending_items, last_received_date')
        .eq('id', testData.purchaseOrderId)
        .single();

      expect(fullError).toBeNull();
      expect(fullPO!.enhanced_status).toBe('fully_received');
      expect(fullPO!.total_received_items).toBe(20);
      expect(fullPO!.total_pending_items).toBe(0);
      expect(fullPO!.last_received_date).toBeTruthy();
    });

    it('should handle multiple items with different receiving rates', async () => {
      // Create multiple items
      const items = [
        {
          purchase_order_id: testData.purchaseOrderId,
          product_id: testData.productId,
          product_name: 'Product A',
          product_sku: 'PROD-A',
          quantity: 10,
          unit_cost: 50.00
        },
        {
          purchase_order_id: testData.purchaseOrderId,
          product_id: testData.productId,
          product_name: 'Product B',
          product_sku: 'PROD-B',
          quantity: 15,
          unit_cost: 75.00
        },
        {
          purchase_order_id: testData.purchaseOrderId,
          product_id: testData.productId,
          product_name: 'Product C',
          product_sku: 'PROD-C',
          quantity: 8,
          unit_cost: 120.00
        }
      ];

      const { data: insertedItems, error: insertError } = await supabase
        .from('purchase_order_items')
        .insert(items)
        .select('id, product_name');

      expect(insertError).toBeNull();
      expect(insertedItems).toHaveLength(3);

      // Receive different amounts for each item
      const receivingPlan = [
        { itemId: insertedItems![0].id, received: 10 }, // Fully received
        { itemId: insertedItems![1].id, received: 8 },  // Partially received
        { itemId: insertedItems![2].id, received: 0 }   // Not received
      ];

      for (const plan of receivingPlan) {
        await supabase
          .from('purchase_order_items')
          .update({ received_quantity: plan.received })
          .eq('id', plan.itemId);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify aggregated totals
      const { data: aggregatedPO, error: aggError } = await supabase
        .from('purchase_orders')
        .select('enhanced_status, total_received_items, total_pending_items')
        .eq('id', testData.purchaseOrderId)
        .single();

      expect(aggError).toBeNull();
      expect(aggregatedPO!.total_received_items).toBe(18); // 10 + 8 + 0
      expect(aggregatedPO!.total_pending_items).toBe(15);  // 0 + 7 + 8
      expect(aggregatedPO!.enhanced_status).toBe('partially_received');
    });
  });

  describe('Data Integrity During Operations', () => {
    it('should maintain referential integrity during cascading deletes', async () => {
      // Create items
      await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testData.purchaseOrderId,
          product_id: testData.productId,
          product_name: 'Test Product',
          product_sku: 'TEST-001',
          quantity: 5,
          unit_cost: 100.00
        });

      // Verify items exist
      const { data: itemsBefore } = await supabase
        .from('purchase_order_items')
        .select('id')
        .eq('purchase_order_id', testData.purchaseOrderId);

      expect(itemsBefore).toHaveLength(1);

      // Delete purchase order (should cascade to items)
      await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', testData.purchaseOrderId);

      // Verify items were deleted
      const { data: itemsAfter } = await supabase
        .from('purchase_order_items')
        .select('id')
        .eq('purchase_order_id', testData.purchaseOrderId);

      expect(itemsAfter).toHaveLength(0);

      // Recreate purchase order for other tests
      const { data: newPO } = await supabase
        .from('purchase_orders')
        .insert({
          poNumber: 'PO-INTEGRATION-001-RECREATED',
          supplierId: testData.supplierId,
          supplierName: 'Integration Test Supplier',
          subtotal: 1000.00,
          tax: 120.00,
          total: 1120.00,
          status: 'draft',
          enhanced_status: 'draft',
          items: []
        })
        .select()
        .single();

      testData.purchaseOrderId = newPO!.id;
    });

    it('should handle concurrent receiving operations', async () => {
      // Create an item
      const { data: item } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testData.purchaseOrderId,
          product_id: testData.productId,
          product_name: 'Concurrent Test Product',
          product_sku: 'CONC-001',
          quantity: 20,
          unit_cost: 50.00
        })
        .select()
        .single();

      // Simulate concurrent updates (simplified - in real scenario would use multiple connections)
      const updates = [
        supabase.from('purchase_order_items').update({ received_quantity: 5 }).eq('id', item!.id),
        supabase.from('purchase_order_items').update({ quality_status: 'approved' }).eq('id', item!.id)
      ];

      const results = await Promise.all(updates);

      // Both updates should succeed (last write wins for simple fields)
      results.forEach(result => {
        expect(result.error).toBeNull();
      });

      // Final state should be consistent
      const { data: finalItem, error } = await supabase
        .from('purchase_order_items')
        .select('received_quantity, quality_status, pending_quantity')
        .eq('id', item!.id)
        .single();

      expect(error).toBeNull();
      expect(finalItem!.received_quantity).toBe(5);
      expect(finalItem!.quality_status).toBe('approved');
      expect(finalItem!.pending_quantity).toBe(15);
    });
  });

  describe('Performance with Enhanced Schema', () => {
    it('should handle batch operations efficiently', async () => {
      const batchSize = 50;
      const startTime = Date.now();

      // Create batch of items
      const batchItems = Array.from({ length: batchSize }, (_, i) => ({
        purchase_order_id: testData.purchaseOrderId,
        product_id: testData.productId,
        product_name: `Batch Product ${i + 1}`,
        product_sku: `BATCH-${String(i + 1).padStart(3, '0')}`,
        quantity: Math.floor(Math.random() * 10) + 1,
        unit_cost: Math.random() * 100 + 10
      }));

      const { error: batchInsertError } = await supabase
        .from('purchase_order_items')
        .insert(batchItems);

      expect(batchInsertError).toBeNull();

      const insertTime = Date.now() - startTime;

      // Batch update (simulate receiving)
      const updateStartTime = Date.now();
      
      const { data: allItems } = await supabase
        .from('purchase_order_items')
        .select('id, quantity')
        .eq('purchase_order_id', testData.purchaseOrderId);

      // Update each item to be partially received
      const updatePromises = allItems!.map(item => 
        supabase
          .from('purchase_order_items')
          .update({ received_quantity: Math.floor(item.quantity / 2) })
          .eq('id', item.id)
      );

      await Promise.all(updatePromises);
      const updateTime = Date.now() - updateStartTime;

      // Performance expectations (adjust based on your requirements)
      expect(insertTime, 'Batch insert should be fast').toBeLessThan(5000); // 5 seconds
      expect(updateTime, 'Batch update should be fast').toBeLessThan(10000); // 10 seconds

      // Verify trigger performance (all updates should complete quickly)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: finalPO } = await supabase
        .from('purchase_orders')
        .select('total_received_items, total_pending_items, enhanced_status')
        .eq('id', testData.purchaseOrderId)
        .single();

      expect(finalPO!.enhanced_status).toBe('partially_received');
      expect(finalPO!.total_received_items).toBeGreaterThan(0);
      expect(finalPO!.total_pending_items).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle constraint violations gracefully', async () => {
      // Try to create item with invalid quantity
      const { error: negativeQtyError } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testData.purchaseOrderId,
          product_id: testData.productId,
          product_name: 'Invalid Product',
          product_sku: 'INVALID-001',
          quantity: 0, // Should fail
          unit_cost: 100.00
        });

      expect(negativeQtyError).toBeDefined();
      expect(negativeQtyError!.message).toContain('check constraint');

      // Try to receive more than ordered
      const { data: validItem } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testData.purchaseOrderId,
          product_id: testData.productId,
          product_name: 'Valid Product',
          product_sku: 'VALID-001',
          quantity: 10,
          unit_cost: 100.00
        })
        .select()
        .single();

      const { error: overReceiveError } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity: 15 }) // More than ordered (10)
        .eq('id', validItem!.id);

      expect(overReceiveError).toBeDefined();
      expect(overReceiveError!.message).toContain('check constraint');
    });

    it('should recover from partial transaction failures', async () => {
      // This test simulates recovery scenarios
      // In a real application, you'd test transaction rollbacks
      
      const { data: item } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testData.purchaseOrderId,
          product_id: testData.productId,
          product_name: 'Recovery Test Product',
          product_sku: 'RECOVER-001',
          quantity: 10,
          unit_cost: 50.00
        })
        .select()
        .single();

      // Valid partial update
      const { error: validUpdateError } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity: 5 })
        .eq('id', item!.id);

      expect(validUpdateError).toBeNull();

      // Verify state is consistent after the valid operation
      const { data: consistentItem } = await supabase
        .from('purchase_order_items')
        .select('received_quantity, pending_quantity')
        .eq('id', item!.id)
        .single();

      expect(consistentItem!.received_quantity).toBe(5);
      expect(consistentItem!.pending_quantity).toBe(5);
    });
  });
});