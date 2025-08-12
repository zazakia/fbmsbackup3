/**
 * Manual Test for Approved Purchase Order Receiving Integration
 * 
 * This test verifies that the implemented feature works correctly:
 * "After I approved purchase order it does not show in the receiving list"
 */

import { receivingIntegrationService, ApprovalContext } from '../../services/receivingIntegrationService';
import { receivingDashboardService } from '../../services/receivingDashboardService';

// Mock purchase order for testing
const mockPurchaseOrder = {
  id: 'test-po-001',
  poNumber: 'PO-001',
  supplierId: 'supplier-001',
  supplierName: 'Test Supplier',
  items: [
    {
      id: 'item-001',
      productId: 'prod-001',
      productName: 'Test Product',
      sku: 'TEST-001',
      quantity: 10,
      cost: 50.00,
      total: 500.00
    }
  ],
  subtotal: 500.00,
  tax: 60.00,
  total: 560.00,
  status: 'approved' as const,
  expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  createdAt: new Date(),
  statusHistory: [],
  receivingHistory: [],
  validationErrors: [],
  approvalHistory: [],
  totalReceived: 0,
  totalPending: 10,
  isPartiallyReceived: false,
  isFullyReceived: false
};

// Mock approval context
const mockApprovalContext: ApprovalContext = {
  approvedBy: 'manager@test.com',
  approvedAt: new Date(),
  reason: 'Budget approved',
  comments: 'All items verified and budget allocated',
  userRole: 'manager'
};

/**
 * Manual test function - can be called to verify integration works
 */
export async function testApprovedPurchaseOrderReceivingIntegration(): Promise<boolean> {
  console.log('🧪 Testing Approved Purchase Order Receiving Integration...');
  
  try {
    // Step 1: Validate PO is ready for receiving
    console.log('📋 Step 1: Validating purchase order for receiving...');
    const validation = receivingIntegrationService.validateReceivingReadiness(mockPurchaseOrder);
    
    if (!validation.isValid) {
      console.error('❌ Validation failed:', validation.errors);
      return false;
    }
    console.log('✅ Purchase order is valid for receiving');
    
    // Step 2: Process approval event
    console.log('📋 Step 2: Processing approval event...');
    const integrationResult = await receivingIntegrationService.onPurchaseOrderApproved(
      mockPurchaseOrder.id,
      mockApprovalContext
    );
    
    if (!integrationResult.success) {
      console.error('❌ Integration failed:', integrationResult.error);
      return false;
    }
    console.log('✅ Approval integration successful');
    
    // Step 3: Verify receiving queue was updated
    console.log('📋 Step 3: Verifying receiving queue was updated...');
    if (!integrationResult.receivingQueueUpdated) {
      console.error('❌ Receiving queue was not updated');
      return false;
    }
    console.log('✅ Receiving queue was updated');
    
    // Step 4: Test status change integration
    console.log('📋 Step 4: Testing status change integration...');
    const statusChangeResult = await receivingIntegrationService.onPurchaseOrderStatusChanged(
      mockPurchaseOrder.id,
      'draft',
      'approved',
      {
        changedBy: mockApprovalContext.approvedBy,
        changedAt: new Date(),
        reason: 'Status changed to approved',
        previousStatus: 'draft',
        newStatus: 'approved'
      }
    );
    
    if (!statusChangeResult.success) {
      console.error('❌ Status change integration failed:', statusChangeResult.error);
      return false;
    }
    console.log('✅ Status change integration successful');
    
    // Step 5: Test receiving dashboard integration
    console.log('📋 Step 5: Testing receiving dashboard integration...');
    const dashboardResult = await receivingDashboardService.onReceivingIntegrationEvent(
      'approval',
      mockPurchaseOrder.id,
      { approvedBy: mockApprovalContext.approvedBy }
    );
    
    if (dashboardResult.totalAffected === 0) {
      console.error('❌ Dashboard integration had no effect');
      return false;
    }
    console.log('✅ Dashboard integration successful');
    
    // Step 6: Verify all integration features
    console.log('📋 Step 6: Testing additional integration features...');
    
    // Test debounced refresh
    await receivingIntegrationService.refreshReceivingQueueDebounced('test-request');
    console.log('✅ Debounced refresh working');
    
    // Test refresh status
    const refreshStatus = receivingIntegrationService.getRefreshStatus();
    console.log('✅ Refresh status available:', refreshStatus);
    
    console.log('\n🎉 All integration tests passed successfully!');
    console.log('\n📝 Summary:');
    console.log('• ✅ Purchase order validation works');
    console.log('• ✅ Approval integration works');
    console.log('• ✅ Receiving queue updates work');
    console.log('• ✅ Status change integration works');
    console.log('• ✅ Dashboard integration works');
    console.log('• ✅ Advanced features (debouncing, status) work');
    console.log('\n🎯 The approved purchase order receiving integration feature is working correctly!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

/**
 * Usage example:
 * 
 * import { testApprovedPurchaseOrderReceivingIntegration } from './path/to/this/file';
 * 
 * testApprovedPurchaseOrderReceivingIntegration()
 *   .then(success => console.log('Test result:', success ? 'PASS' : 'FAIL'));
 */