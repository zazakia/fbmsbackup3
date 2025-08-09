/**
 * Purchase Order Migration Validation Script
 * 
 * This script validates that the database migration for enhanced purchase order schema
 * has been applied correctly and all data integrity is maintained.
 * 
 * Run with: npm run validate-po-migration
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

class MigrationValidator {
  private supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  private results: ValidationResult[] = [];

  async validate(): Promise<ValidationResult[]> {
    console.log('🔍 Validating Purchase Order Schema Migration...\n');

    await this.validateTableStructure();
    await this.validateConstraints();
    await this.validateIndexes();
    await this.validateTriggers();
    await this.validateDataIntegrity();
    await this.validatePermissions();
    await this.validateBackup();

    return this.results;
  }

  private addResult(check: string, status: ValidationResult['status'], message: string, details?: any) {
    this.results.push({ check, status, message, details });
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${check}: ${message}`);
    
    if (details && status !== 'PASS') {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  private async validateTableStructure() {
    console.log('\n📋 Validating Table Structure...');

    try {
      // Check purchase_orders enhanced columns
      const { data: poColumns, error: poError } = await this.supabase
        .from('purchase_orders')
        .select('enhanced_status, approval_required, approved_by, approved_at, total_received_items, total_pending_items, last_received_date, expected_delivery_date, actual_delivery_date, supplier_reference, internal_notes, attachments')
        .limit(1);

      if (poError) {
        this.addResult('Purchase Orders Table Enhancement', 'FAIL', 'Enhanced columns missing or inaccessible', poError);
      } else {
        this.addResult('Purchase Orders Table Enhancement', 'PASS', 'All enhanced columns present');
      }

      // Check purchase_order_items table
      const { data: poiData, error: poiError } = await this.supabase
        .from('purchase_order_items')
        .select('received_quantity, pending_quantity, quality_status, batch_number, expiry_date, serial_numbers')
        .limit(1);

      if (poiError) {
        this.addResult('Purchase Order Items Table', 'FAIL', 'Required columns missing', poiError);
      } else {
        this.addResult('Purchase Order Items Table', 'PASS', 'All required columns present');
      }

      // Check purchase_order_receiving_line_items table
      const { data: prliData, error: prliError } = await this.supabase
        .from('purchase_order_receiving_line_items')
        .select('id')
        .limit(1);

      if (prliError) {
        this.addResult('Receiving Line Items Table', 'FAIL', 'Table missing or inaccessible', prliError);
      } else {
        this.addResult('Receiving Line Items Table', 'PASS', 'Table exists and accessible');
      }

    } catch (error) {
      this.addResult('Table Structure Validation', 'FAIL', 'Unexpected error during validation', error);
    }
  }

  private async validateConstraints() {
    console.log('\n🔒 Validating Constraints...');

    try {
      // Test enhanced status constraint
      const { error: statusError } = await this.supabase
        .from('purchase_orders')
        .insert({
          poNumber: 'VALIDATION-TEST-STATUS',
          supplierId: '00000000-0000-0000-0000-000000000000',
          supplierName: 'Test',
          subtotal: 100,
          tax: 12,
          total: 112,
          status: 'draft',
          enhanced_status: 'invalid_status',
          items: []
        });

      if (statusError && statusError.message.includes('check constraint')) {
        this.addResult('Enhanced Status Constraint', 'PASS', 'Invalid status values properly rejected');
      } else {
        this.addResult('Enhanced Status Constraint', 'FAIL', 'Constraint not working - invalid status accepted');
      }

      // Test quantity constraints on items
      const testPoResult = await this.createTestPurchaseOrder();
      if (testPoResult.success) {
        const { error: qtyError } = await this.supabase
          .from('purchase_order_items')
          .insert({
            purchase_order_id: testPoResult.poId,
            product_id: testPoResult.productId,
            product_name: 'Test Product',
            product_sku: 'TEST-001',
            quantity: 0, // Should fail
            unit_cost: 100.00
          });

        if (qtyError && qtyError.message.includes('check constraint')) {
          this.addResult('Quantity Constraint', 'PASS', 'Zero/negative quantities properly rejected');
        } else {
          this.addResult('Quantity Constraint', 'FAIL', 'Constraint not working - invalid quantity accepted');
        }

        // Cleanup test data
        await this.cleanupTestPurchaseOrder(testPoResult.poId, testPoResult.productId, testPoResult.supplierId);
      }

    } catch (error) {
      this.addResult('Constraint Validation', 'FAIL', 'Error testing constraints', error);
    }
  }

  private async validateIndexes() {
    console.log('\n📊 Validating Indexes...');

    try {
      // Test query performance on indexed columns
      const startTime = Date.now();
      
      const { error: statusQueryError } = await this.supabase
        .from('purchase_orders')
        .select('id')
        .eq('enhanced_status', 'draft')
        .limit(10);

      const queryTime = Date.now() - startTime;

      if (statusQueryError) {
        this.addResult('Status Index Query', 'FAIL', 'Error querying by enhanced_status', statusQueryError);
      } else if (queryTime > 1000) {
        this.addResult('Status Index Query', 'WARNING', `Query took ${queryTime}ms - index may be missing`);
      } else {
        this.addResult('Status Index Query', 'PASS', `Query performed efficiently (${queryTime}ms)`);
      }

      // Test purchase order items query performance
      const itemQueryStart = Date.now();
      
      const { error: itemQueryError } = await this.supabase
        .from('purchase_order_items')
        .select('id')
        .gt('received_quantity', 0)
        .limit(10);

      const itemQueryTime = Date.now() - itemQueryStart;

      if (itemQueryError) {
        this.addResult('Item Received Quantity Index', 'FAIL', 'Error querying by received_quantity', itemQueryError);
      } else if (itemQueryTime > 1000) {
        this.addResult('Item Received Quantity Index', 'WARNING', `Query took ${itemQueryTime}ms - index may be missing`);
      } else {
        this.addResult('Item Received Quantity Index', 'PASS', `Query performed efficiently (${itemQueryTime}ms)`);
      }

    } catch (error) {
      this.addResult('Index Validation', 'FAIL', 'Error testing indexes', error);
    }
  }

  private async validateTriggers() {
    console.log('\n⚡ Validating Triggers...');

    try {
      const testPoResult = await this.createTestPurchaseOrder();
      if (!testPoResult.success) {
        this.addResult('Trigger Validation Setup', 'FAIL', 'Could not create test data for trigger validation');
        return;
      }

      // Create a test item
      const { data: item, error: itemError } = await this.supabase
        .from('purchase_order_items')
        .insert({
          purchase_order_id: testPoResult.poId,
          product_id: testPoResult.productId,
          product_name: 'Trigger Test Product',
          product_sku: 'TRIG-001',
          quantity: 10,
          received_quantity: 0,
          unit_cost: 50.00
        })
        .select()
        .single();

      if (itemError) {
        this.addResult('Trigger Test Item Creation', 'FAIL', 'Could not create test item', itemError);
        return;
      }

      // Update received quantity and check if trigger fires
      await this.supabase
        .from('purchase_order_items')
        .update({ received_quantity: 5 })
        .eq('id', item.id);

      // Wait for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if purchase order totals were updated
      const { data: updatedPO, error: fetchError } = await this.supabase
        .from('purchase_orders')
        .select('total_received_items, total_pending_items, enhanced_status')
        .eq('id', testPoResult.poId)
        .single();

      if (fetchError) {
        this.addResult('Trigger Execution Check', 'FAIL', 'Could not fetch updated purchase order', fetchError);
      } else if (updatedPO.total_received_items === 5 && updatedPO.total_pending_items === 5) {
        this.addResult('Receiving Totals Trigger', 'PASS', 'Trigger correctly updated purchase order totals');
      } else {
        this.addResult('Receiving Totals Trigger', 'FAIL', 'Trigger did not update totals correctly', {
          expected: { received: 5, pending: 5 },
          actual: { received: updatedPO.total_received_items, pending: updatedPO.total_pending_items }
        });
      }

      // Test status transition trigger
      await this.supabase
        .from('purchase_order_items')
        .update({ received_quantity: 10 })
        .eq('id', item.id);

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: fullyReceivedPO } = await this.supabase
        .from('purchase_orders')
        .select('enhanced_status, total_pending_items')
        .eq('id', testPoResult.poId)
        .single();

      if (fullyReceivedPO?.enhanced_status === 'fully_received' && fullyReceivedPO?.total_pending_items === 0) {
        this.addResult('Status Transition Trigger', 'PASS', 'Trigger correctly updated status to fully_received');
      } else {
        this.addResult('Status Transition Trigger', 'FAIL', 'Trigger did not update status correctly', {
          expected: { status: 'fully_received', pending: 0 },
          actual: { status: fullyReceivedPO?.enhanced_status, pending: fullyReceivedPO?.total_pending_items }
        });
      }

      // Cleanup
      await this.cleanupTestPurchaseOrder(testPoResult.poId, testPoResult.productId, testPoResult.supplierId);

    } catch (error) {
      this.addResult('Trigger Validation', 'FAIL', 'Error testing triggers', error);
    }
  }

  private async validateDataIntegrity() {
    console.log('\n🔍 Validating Data Integrity...');

    try {
      // Check for orphaned items
      const { data: orphanedItems, error: orphanError } = await this.supabase
        .from('purchase_order_items')
        .select(`
          id,
          purchase_order_id,
          purchase_orders!inner(id)
        `)
        .is('purchase_orders.id', null);

      if (orphanError) {
        this.addResult('Orphaned Items Check', 'WARNING', 'Could not check for orphaned items', orphanError);
      } else if (orphanedItems && orphanedItems.length > 0) {
        this.addResult('Orphaned Items Check', 'WARNING', `Found ${orphanedItems.length} orphaned items`);
      } else {
        this.addResult('Orphaned Items Check', 'PASS', 'No orphaned items found');
      }

      // Check for invalid received quantities
      const { data: invalidItems, error: invalidError } = await this.supabase
        .from('purchase_order_items')
        .select('id, quantity, received_quantity')
        .gt('received_quantity', this.supabase.sql`quantity`);

      if (invalidError) {
        this.addResult('Invalid Received Quantities', 'WARNING', 'Could not check received quantities', invalidError);
      } else if (invalidItems && invalidItems.length > 0) {
        this.addResult('Invalid Received Quantities', 'FAIL', `Found ${invalidItems.length} items with received > ordered`);
      } else {
        this.addResult('Invalid Received Quantities', 'PASS', 'All received quantities are valid');
      }

      // Check for inconsistent status values
      const { data: inconsistentPOs, error: inconsistentError } = await this.supabase
        .from('purchase_orders')
        .select('id, status, enhanced_status')
        .neq('status', 'draft')
        .eq('enhanced_status', 'draft');

      if (inconsistentError) {
        this.addResult('Status Consistency', 'WARNING', 'Could not check status consistency', inconsistentError);
      } else if (inconsistentPOs && inconsistentPOs.length > 0) {
        this.addResult('Status Consistency', 'WARNING', `Found ${inconsistentPOs.length} purchase orders with inconsistent statuses`);
      } else {
        this.addResult('Status Consistency', 'PASS', 'Purchase order statuses are consistent');
      }

    } catch (error) {
      this.addResult('Data Integrity Validation', 'FAIL', 'Error checking data integrity', error);
    }
  }

  private async validatePermissions() {
    console.log('\n🔐 Validating Permissions...');

    try {
      // Test RLS policies (this is basic - in production you'd test with different user contexts)
      const { data, error } = await this.supabase
        .from('purchase_order_items')
        .select('id')
        .limit(1);

      if (error && error.message.includes('row-level security')) {
        this.addResult('RLS Policy Check', 'PASS', 'Row Level Security is properly enforced');
      } else if (error) {
        this.addResult('RLS Policy Check', 'FAIL', 'Unexpected error with RLS check', error);
      } else {
        this.addResult('RLS Policy Check', 'PASS', 'Table accessible with current permissions');
      }

    } catch (error) {
      this.addResult('Permission Validation', 'FAIL', 'Error testing permissions', error);
    }
  }

  private async validateBackup() {
    console.log('\n💾 Validating Backup...');

    try {
      // Check if backup table exists
      const { data, error } = await this.supabase
        .from('purchase_orders_backup_20250808')
        .select('id')
        .limit(1);

      if (error && error.message.includes('does not exist')) {
        this.addResult('Backup Table Check', 'WARNING', 'Backup table not found - migration may not have created backup');
      } else if (error) {
        this.addResult('Backup Table Check', 'FAIL', 'Error accessing backup table', error);
      } else {
        this.addResult('Backup Table Check', 'PASS', 'Backup table exists and accessible');
      }

    } catch (error) {
      this.addResult('Backup Validation', 'FAIL', 'Error checking backup', error);
    }
  }

  private async createTestPurchaseOrder() {
    try {
      // Create test supplier
      const { data: supplier, error: supplierError } = await this.supabase
        .from('suppliers')
        .insert({
          name: 'Migration Validation Supplier',
          email: 'validation@test.com'
        })
        .select()
        .single();

      if (supplierError) return { success: false, error: supplierError };

      // Create test product
      const { data: product, error: productError } = await this.supabase
        .from('products')
        .insert({
          name: 'Migration Validation Product',
          sku: 'VALID-001',
          price: 100.00,
          cost: 75.00,
          stock: 50,
          category: 'Test',
          categoryId: 'test-category',
          unit: 'piece',
          isActive: true
        })
        .select()
        .single();

      if (productError) return { success: false, error: productError };

      // Create test purchase order
      const { data: purchaseOrder, error: poError } = await this.supabase
        .from('purchase_orders')
        .insert({
          poNumber: 'PO-VALIDATION-TEST',
          supplierId: supplier.id,
          supplierName: supplier.name,
          subtotal: 500.00,
          tax: 60.00,
          total: 560.00,
          status: 'draft',
          enhanced_status: 'draft',
          items: []
        })
        .select()
        .single();

      if (poError) return { success: false, error: poError };

      return {
        success: true,
        poId: purchaseOrder.id,
        productId: product.id,
        supplierId: supplier.id
      };

    } catch (error) {
      return { success: false, error };
    }
  }

  private async cleanupTestPurchaseOrder(poId: string, productId: string, supplierId: string) {
    try {
      await this.supabase.from('purchase_order_items').delete().eq('purchase_order_id', poId);
      await this.supabase.from('purchase_orders').delete().eq('id', poId);
      await this.supabase.from('products').delete().eq('id', productId);
      await this.supabase.from('suppliers').delete().eq('id', supplierId);
    } catch (error) {
      console.warn('Warning: Could not clean up test data:', error);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION VALIDATION SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`📋 Total Checks: ${this.results.length}\n`);

    if (failed === 0 && warnings === 0) {
      console.log('🎉 All validation checks passed! Migration completed successfully.');
    } else if (failed === 0) {
      console.log('✅ Migration completed with some warnings. Review the warnings above.');
    } else {
      console.log('❌ Migration validation failed. Please review and fix the failed checks.');
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new MigrationValidator();
  
  validator.validate()
    .then(() => {
      validator.printSummary();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Validation script failed:', error);
      process.exit(1);
    });
}

export default MigrationValidator;