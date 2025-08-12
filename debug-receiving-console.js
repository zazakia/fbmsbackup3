// 🔍 Receiving List Debug Script
// Copy and paste this into your browser console on the Receiving page

console.log('🔍 Starting Receiving List Debug...\n');

// Function to debug receiving list
function debugReceivingList() {
  try {
    // Try multiple ways to access the store
    let store = null;
    
    // Method 1: Try global window access
    if (window.useBusinessStore?.getState) {
      store = window.useBusinessStore.getState();
    }
    
    // Method 2: Try React DevTools
    if (!store && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const renderers = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers;
      if (renderers.size > 0) {
        const renderer = Array.from(renderers.values())[0];
        const fiber = renderer.getCurrentFiber && renderer.getCurrentFiber();
        // Try to find store in React components
        console.log('🔍 Trying to access store via React DevTools...');
      }
    }
    
    // Method 3: Alternative approach - check if component is mounted
    if (!store) {
      console.log('⚠️ Cannot access store directly. Alternative debugging:');
      console.log('1. Open React DevTools');
      console.log('2. Find ReceivingList component');
      console.log('3. Check props and state');
      console.log('4. Or try the quick test method below');
      return;
    }

    console.log('📊 Business Store Debug:');
    console.log(`   - Total purchase orders: ${store.purchaseOrders?.length || 0}`);
    console.log(`   - refreshPurchaseOrders function exists: ${typeof store.refreshPurchaseOrders === 'function'}`);
    
    if (store.purchaseOrders?.length > 0) {
      console.log('\n📦 Purchase Orders:');
      store.purchaseOrders.forEach((po, index) => {
        console.log(`   ${index + 1}. ${po.poNumber || po.id}`);
        console.log(`      - Status: ${po.status}`);
        console.log(`      - Enhanced Status: ${po.enhancedStatus || 'none'}`);
        console.log(`      - Supplier: ${po.supplierName}`);
        console.log(`      - Total: ₱${po.total?.toLocaleString()}`);
        console.log(`      - Should appear in receiving: ${['approved', 'sent_to_supplier', 'partially_received'].includes(po.enhancedStatus || po.status) ? 'YES ✅' : 'NO ❌'}`);
      });
    } else {
      console.log('   ⚠️ No purchase orders found in store');
    }

    // Check receivable statuses
    const receivableStatuses = ['approved', 'sent_to_supplier', 'partially_received'];
    console.log(`\n🎯 Receivable Statuses: ${receivableStatuses.join(', ')}`);

    // Filter orders that should appear
    const shouldAppear = store.purchaseOrders?.filter(po => 
      receivableStatuses.includes(po.enhancedStatus || po.status)
    ) || [];

    console.log(`\n✅ Orders that should appear in receiving list: ${shouldAppear.length}`);
    shouldAppear.forEach(po => {
      console.log(`   - ${po.poNumber} (${po.enhancedStatus || po.status})`);
    });

    // Check for test data
    const testData = store.purchaseOrders?.filter(po => po.id?.startsWith('po-test-')) || [];
    console.log(`\n🧪 Test data orders: ${testData.length}`);

    if (shouldAppear.length === 0) {
      console.log('\n🚨 ISSUE FOUND: No orders should appear in receiving list');
      console.log('💡 Solutions:');
      console.log('   1. Click "🧪 Add Test Data" button');
      console.log('   2. Create new purchase orders with approved status');
      console.log('   3. Check if existing orders have correct enhanced_status');
    } else {
      console.log('\n✅ Orders exist that should appear in receiving list');
      console.log('💡 If they\'re not showing, check:');
      console.log('   1. Component rendering logic');
      console.log('   2. Real-time subscriptions');
      console.log('   3. State synchronization');
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug
debugReceivingList();

console.log('\n🔄 To refresh purchase orders:');
console.log('useBusinessStore.getState().refreshPurchaseOrders()');

console.log('\n🧪 To add test data:');
console.log('Click the "🧪 Add Test Data" button on the receiving page');