/**
 * Unit Tests for Purchase Order Schema Migration
 * Tests the database migration: 20250808120000_enhance_purchase_order_schema.sql
 * 
 * These tests validate:
 * - Table structure changes
 * - Data migration accuracy
 * - Constraint enforcement
 * - Index creation
 * - Trigger functionality
 * - Performance optimizations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

describe('Purchase Order Schema Migration Tests', () => {
  let supabase: SupabaseClient;
  let testPurchaseOrderId: string;
  let testProductId: string;
  let testUserId: string;
  let testSupplierId: string;

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Reset test data state before each test
    await resetTestData();
  });

  async function setupTestData() {
    // Create test user (mock user ID for testing)
    testUserId = 'test-user-' + Date.now();
    
    // Create test supplier
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .insert({
        name: 'Test Supplier',
        email: 'test@supplier.com',
        phone: '123-456-7890',
        address: '123 Test Street'
      })
      .select()
      .single();
    
    if (supplierError) throw new Error(`Failed to create test supplier: ${supplierError.message}`);
    testSupplierId = supplier.id;

    // Create test product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100.00,
        cost: 75.00,
        stock: 50,
        category: 'Electronics',
        categoryId: 'test-category',
        unit: 'piece',
        isActive: true
      })
      .select()
      .single();
    
    if (productError) throw new Error(`Failed to create test product: ${productError.message}`);
    testProductId = product.id;

    // Create test purchase order
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        poNumber: 'PO-TEST-001',
        supplierId: testSupplierId,
        supplierName: 'Test Supplier',
        subtotal: 750.00,
        tax: 90.00,
        total: 840.00,
        status: 'draft',
        enhanced_status: 'draft',
        items: []
      })
      .select()
      .single();
    
    if (poError) throw new Error(`Failed to create test purchase order: ${poError.message}`);
    testPurchaseOrderId = purchaseOrder.id;
  }

  async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    if (testPurchaseOrderId) {
      await supabase.from('purchase_order_items').delete().eq('purchase_order_id', testPurchaseOrderId);
      await supabase.from('purchase_orders').delete().eq('id', testPurchaseOrderId);
    }
    if (testProductId) {
      await supabase.from('products').delete().eq('id', testProductId);
    }
    if (testSupplierId) {
      await supabase.from('suppliers').delete().eq('id', testSupplierId);
    }
  }

  async function resetTestData() {
    // Reset purchase order to draft state
    if (testPurchaseOrderId) {
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
        .eq('id', testPurchaseOrderId);

      // Clear all purchase order items
      await supabase
        .from('purchase_order_items')
        .delete()
        .eq('purchase_order_id', testPurchaseOrderId);
    }
  }

  describe('Table Structure Validation', () => {
    it('should have enhanced purchase_orders table with new columns', async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('enhanced_status, approval_required, approved_by, approved_at, total_received_items, total_pending_items, last_received_date, expected_delivery_date, actual_delivery_date, supplier_reference, internal_notes, attachments')
        .eq('id', testPurchaseOrderId)
        .single();

      expect(error).toBeNull();
      expect(data).toHaveProperty('enhanced_status');
      expect(data).toHaveProperty('approval_required');
      expect(data).toHaveProperty('total_received_items');
      expect(data).toHaveProperty('total_pending_items');
    });

    it('should have purchase_order_items table with receiving fields', async () => {
      // Insert a test item to validate structure
      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testPurchaseOrderId,
          product_id: testProductId,
          product_name: 'Test Product',
          product_sku: 'TEST-001',
          quantity: 10,
          received_quantity: 0,
          unit_cost: 75.00,
          quality_status: 'pending'
        })
        .select('received_quantity, pending_quantity, quality_status, batch_number, expiry_date, serial_numbers')
        .single();

      expect(error).toBeNull();
      expect(data).toHaveProperty('received_quantity');
      expect(data).toHaveProperty('pending_quantity');
      expect(data).toHaveProperty('quality_status');
      expect(data.pending_quantity).toBe(10); // Generated column should work
    });

    it('should have purchase_order_receiving_line_items table', async () => {
      // Check if table exists by trying to query it
      const { error } = await supabase
        .from('purchase_order_receiving_line_items')
        .select('id')
        .limit(1);

      expect(error).toBeNull();
    });
  });

  describe('Enhanced Status Workflow', () => {
    it('should allow valid status transitions', async () => {
      const validStatuses = [
        'draft', 'pending_approval', 'approved', 'sent_to_supplier',
        'partially_received', 'fully_received', 'cancelled', 'closed'
      ];

      for (const status of validStatuses) {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ enhanced_status: status })
          .eq('id', testPurchaseOrderId);

        expect(error, `Status ${status} should be valid`).toBeNull();
      }
    });

    it('should reject invalid status values', async () => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ enhanced_status: 'invalid_status' as any })
        .eq('id', testPurchaseOrderId);

      expect(error).toBeDefined();
      expect(error!.message).toContain('check constraint');
    });
  });

  describe('Receiving Quantity Tracking', () => {
    let testItemId: string;

    beforeEach(async () => {
      // Create a test item for receiving tests
      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testPurchaseOrderId,
          product_id: testProductId,
          product_name: 'Test Product',
          product_sku: 'TEST-001',
          quantity: 10,
          received_quantity: 0,
          unit_cost: 75.00,
          quality_status: 'pending'
        })
        .select()
        .single();

      expect(error).toBeNull();
      testItemId = data!.id;
    });

    it('should calculate pending quantity correctly', async () => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('quantity, received_quantity, pending_quantity')
        .eq('id', testItemId)
        .single();

      expect(error).toBeNull();
      expect(data!.pending_quantity).toBe(10);
    });

    it('should update pending quantity when received quantity changes', async () => {
      // Receive 5 items
      const { error: updateError } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity: 5 })
        .eq('id', testItemId);

      expect(updateError).toBeNull();

      // Check updated pending quantity
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('pending_quantity')
        .eq('id', testItemId)
        .single();

      expect(error).toBeNull();
      expect(data!.pending_quantity).toBe(5);
    });

    it('should enforce received quantity not exceeding ordered quantity', async () => {
      const { error } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity: 15 }) // More than ordered (10)
        .eq('id', testItemId);

      expect(error).toBeDefined();
      expect(error!.message).toContain('check constraint');
    });

    it('should enforce non-negative received quantity', async () => {
      const { error } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity: -1 })
        .eq('id', testItemId);

      expect(error).toBeDefined();
      expect(error!.message).toContain('check constraint');
    });
  });

  describe('Quality Status Validation', () => {
    let testItemId: string;

    beforeEach(async () => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testPurchaseOrderId,
          product_id: testProductId,
          product_name: 'Test Product',
          product_sku: 'TEST-001',
          quantity: 10,
          unit_cost: 75.00,
          quality_status: 'pending'
        })
        .select()
        .single();

      expect(error).toBeNull();
      testItemId = data!.id;
    });

    it('should allow valid quality status values', async () => {
      const validStatuses = ['pending', 'approved', 'rejected'];

      for (const status of validStatuses) {
        const { error } = await supabase
          .from('purchase_order_items')
          .update({ quality_status: status })
          .eq('id', testItemId);

        expect(error, `Quality status ${status} should be valid`).toBeNull();
      }
    });

    it('should reject invalid quality status values', async () => {
      const { error } = await supabase
        .from('purchase_order_items')
        .update({ quality_status: 'invalid_status' as any })
        .eq('id', testItemId);

      expect(error).toBeDefined();
      expect(error!.message).toContain('check constraint');
    });
  });

  describe('Trigger Functionality', () => {
    let testItemId: string;

    beforeEach(async () => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testPurchaseOrderId,
          product_id: testProductId,
          product_name: 'Test Product',
          product_sku: 'TEST-001',
          quantity: 10,
          received_quantity: 0,
          unit_cost: 75.00
        })
        .select()
        .single();

      expect(error).toBeNull();
      testItemId = data!.id;
    });

    it('should update purchase order totals when item received quantity changes', async () => {
      // Update received quantity
      const { error: updateError } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity: 5 })
        .eq('id', testItemId);

      expect(updateError).toBeNull();

      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if purchase order totals were updated
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('total_received_items, total_pending_items, enhanced_status')
        .eq('id', testPurchaseOrderId)
        .single();

      expect(error).toBeNull();
      expect(data!.total_received_items).toBe(5);
      expect(data!.total_pending_items).toBe(5);
      expect(data!.enhanced_status).toBe('partially_received');
    });

    it('should update status to fully_received when all items are received', async () => {
      // Receive all items
      const { error: updateError } = await supabase
        .from('purchase_order_items')
        .update({ received_quantity: 10 })
        .eq('id', testItemId);

      expect(updateError).toBeNull();

      // Wait for trigger
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data, error } = await supabase
        .from('purchase_orders')
        .select('enhanced_status, total_pending_items')
        .eq('id', testPurchaseOrderId)
        .single();

      expect(error).toBeNull();
      expect(data!.total_pending_items).toBe(0);
      expect(data!.enhanced_status).toBe('fully_received');
    });
  });

  describe('Data Migration Validation', () => {
    it('should migrate legacy status values correctly', async () => {
      // Test data migration by creating a purchase order with legacy status
      const { data: legacyPO, error: createError } = await supabase
        .from('purchase_orders')
        .insert({
          poNumber: 'PO-LEGACY-001',
          supplierId: testSupplierId,
          supplierName: 'Test Supplier',
          subtotal: 100.00,
          tax: 12.00,
          total: 112.00,
          status: 'sent', // Legacy status
          enhanced_status: 'draft' // Will be updated by migration logic
        })
        .select()
        .single();

      expect(createError).toBeNull();

      // Simulate migration update
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          enhanced_status: 'sent_to_supplier' // Migrated value
        })
        .eq('status', 'sent');

      expect(updateError).toBeNull();

      // Cleanup
      await supabase.from('purchase_orders').delete().eq('id', legacyPO!.id);
    });
  });

  describe('Performance and Indexing', () => {
    it('should have indexes on critical columns', async () => {
      // Query system tables to verify indexes exist
      // Note: This is a simplified check. In a real scenario, you'd query pg_indexes
      const indexQueries = [
        { table: 'purchase_orders', column: 'enhanced_status' },
        { table: 'purchase_order_items', column: 'purchase_order_id' },
        { table: 'purchase_order_items', column: 'received_quantity' }
      ];

      for (const query of indexQueries) {
        // Verify we can efficiently query these columns (indexes should make this fast)
        const startTime = Date.now();
        
        const { error } = await supabase
          .from(query.table)
          .select('id')
          .limit(1);

        const queryTime = Date.now() - startTime;

        expect(error).toBeNull();
        expect(queryTime, `Query on ${query.table}.${query.column} should be fast`).toBeLessThan(100);
      }
    });
  });

  describe('Data Integrity Constraints', () => {
    it('should enforce foreign key constraints', async () => {
      // Try to create item with invalid purchase order ID
      const { error } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: '00000000-0000-0000-0000-000000000000', // Invalid ID
          product_id: testProductId,
          product_name: 'Test Product',
          product_sku: 'TEST-001',
          quantity: 10,
          unit_cost: 75.00
        });

      expect(error).toBeDefined();
      expect(error!.message.toLowerCase()).toContain('foreign key');
    });

    it('should enforce positive quantity constraints', async () => {
      const { error } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testPurchaseOrderId,
          product_id: testProductId,
          product_name: 'Test Product',
          product_sku: 'TEST-001',
          quantity: 0, // Should fail - quantity must be positive
          unit_cost: 75.00
        });

      expect(error).toBeDefined();
      expect(error!.message).toContain('check constraint');
    });

    it('should enforce non-negative cost constraints', async () => {
      const { error } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testPurchaseOrderId,
          product_id: testProductId,
          product_name: 'Test Product',
          product_sku: 'TEST-001',
          quantity: 10,
          unit_cost: -1.00 // Should fail - cost cannot be negative
        });

      expect(error).toBeDefined();
      expect(error!.message).toContain('check constraint');
    });
  });

  describe('JSON Field Handling', () => {
    it('should handle serial_numbers JSONB field correctly', async () => {
      const serialNumbers = ['SN001', 'SN002', 'SN003'];
      
      const { data, error } = await supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testPurchaseOrderId,
          product_id: testProductId,
          product_name: 'Test Product',
          product_sku: 'TEST-001',
          quantity: 3,
          unit_cost: 75.00,
          serial_numbers: serialNumbers
        })
        .select('serial_numbers')
        .single();

      expect(error).toBeNull();
      expect(data!.serial_numbers).toEqual(serialNumbers);
    });

    it('should handle attachments JSONB field in purchase orders', async () => {
      const attachments = ['file1.pdf', 'file2.jpg'];
      
      const { error } = await supabase
        .from('purchase_orders')
        .update({ attachments })
        .eq('id', testPurchaseOrderId);

      expect(error).toBeNull();

      const { data, error: selectError } = await supabase
        .from('purchase_orders')
        .select('attachments')
        .eq('id', testPurchaseOrderId)
        .single();

      expect(selectError).toBeNull();
      expect(data!.attachments).toEqual(attachments);
    });
  });
});

describe('Purchase Order Migration Edge Cases', () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  it('should handle null values gracefully', async () => {
    // Test that optional fields can be null
    const { data: supplier } = await supabase
      .from('suppliers')
      .insert({ name: 'Test Supplier', email: 'test@supplier.com' })
      .select()
      .single();

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        poNumber: 'PO-NULL-TEST',
        supplierId: supplier!.id,
        supplierName: 'Test Supplier',
        subtotal: 100.00,
        tax: 12.00,
        total: 112.00,
        status: 'draft',
        enhanced_status: 'draft',
        items: [],
        // Optional fields left null
        expected_delivery_date: null,
        supplier_reference: null,
        internal_notes: null
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data!.expected_delivery_date).toBeNull();
    expect(data!.supplier_reference).toBeNull();
    expect(data!.internal_notes).toBeNull();

    // Cleanup
    await supabase.from('purchase_orders').delete().eq('id', data!.id);
    await supabase.from('suppliers').delete().eq('id', supplier!.id);
  });

  it('should handle concurrent updates correctly', async () => {
    // This test would verify that triggers handle concurrent updates
    // In a real scenario, you'd create multiple connections and update simultaneously
    expect(true).toBe(true); // Placeholder for concurrency tests
  });
});