# 🔍 Debugging Receiving List Issues - Step by Step

## 1. Browser Console Debugging (Primary)

### Open DevTools Console (F12)
- Navigate to: Dashboard → Purchases → Receiving Tab
- Look for these specific log messages:

```
🔍 RECEIVING LIST: Fetching orders for receiving...
🔍 RECEIVING LIST: Total purchase orders: X
🔍 RECEIVING LIST: Receivable enhanced statuses: ['approved', 'sent_to_supplier', 'partially_received']
🔍 RECEIVING LIST: PO PO-XXX - status: XXX, enhanced: XXX, isReceivable: true/false
🔍 RECEIVING LIST: Orders ready for receiving: X
```

### What to Check:
1. **Total purchase orders**: Should be > 0
2. **Individual PO status mapping**: Each PO shows status and enhanced status
3. **isReceivable**: Should be `true` for approved/sent orders
4. **Final count**: Should match approved orders

## 2. Test Data Method (Quickest)

### Add Test Data Button:
1. Go to Receiving tab
2. Click "🧪 Add Test Data"
3. Should immediately show: "Orders Ready for Receiving (2)"
4. If not working, check console for errors

## 3. Database Investigation

### Check Purchase Orders in Database:
```sql
-- View all purchase orders with statuses
SELECT id, po_number, supplier_name, status, enhanced_status, created_at
FROM purchase_orders
ORDER BY created_at DESC
LIMIT 10;
```

### Look for:
- Are there any purchase orders at all?
- What statuses do they have?
- Do any have `enhanced_status = 'approved'`?

## 4. Component State Debugging

### React DevTools:
1. Install React Developer Tools extension
2. Navigate to Components tab
3. Find ReceivingList component
4. Check props:
   - `purchaseOrders` array length
   - Individual order statuses
   - `receivingOrders` state

## 5. Network Debugging

### Check API Calls:
1. Open Network tab in DevTools
2. Refresh the receiving list
3. Look for:
   - API calls to `/rest/v1/purchase_orders`
   - Response data
   - Any 404/500 errors

## 6. Step-by-Step Component Flow

### Manual Verification:
1. **Store Check**: 
   ```javascript
   // In console
   window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.get(1).getCurrentFiber().memoizedProps
   ```

2. **Status Mapping Check**:
   - Verify `isReceivableEnhancedStatus()` function
   - Check `getReceivableEnhancedStatuses()` returns correct array

3. **Real-time Updates**:
   - Check if `usePurchasesSubscriptions` is working
   - Verify Supabase real-time connection

## 7. Common Issues & Solutions

### Issue: "No orders ready for receiving" but orders exist
**Debug**: Check console logs for status mapping
**Solution**: Verify enhanced_status vs status field usage

### Issue: Orders added but not showing
**Debug**: Check if `refreshPurchaseOrders` is called
**Solution**: Verify business store function exists

### Issue: Real-time updates not working
**Debug**: Check Supabase connection and subscriptions
**Solution**: Verify `usePurchasesSubscriptions` hook

### Issue: Test data button not working
**Debug**: Check for JavaScript errors in console
**Solution**: Verify business store `addPurchaseOrder` function

## 8. Quick Debug Commands

### Browser Console Commands:
```javascript
// Check purchase orders in store
useBusinessStore.getState().purchaseOrders

// Check receiving orders filtering
const pos = useBusinessStore.getState().purchaseOrders;
const receivable = pos.filter(po => ['approved', 'sent_to_supplier', 'partially_received'].includes(po.enhancedStatus || po.status));
console.log('Receivable orders:', receivable);

// Force refresh purchase orders
useBusinessStore.getState().refreshPurchaseOrders();
```

## 9. Component-Level Debugging

### Add temporary console logs:
```typescript
// In ReceivingList component
console.log('DEBUG: purchaseOrders from store:', purchaseOrders);
console.log('DEBUG: receivingOrders filtered:', receivingOrders);
```

## 10. End-to-End Workflow Test

### Create → Approve → Receive Workflow:
1. Create new Purchase Order (Draft status)
2. Approve it (should change to approved status)
3. Check if it appears in Receiving tab
4. Trace each step in console logs

---

## 🎯 Recommended Debug Order:

1. **Start with Browser Console** (90% of issues show here)
2. **Use Test Data Button** (fastest verification)
3. **Check React DevTools** (component state)
4. **Investigate Database** (data persistence)
5. **Network Tab** (API issues)

## 🚨 Red Flags to Look For:

- ❌ `purchaseOrders` array is empty
- ❌ All orders have `enhanced_status: null`
- ❌ `refreshPurchaseOrders` function not found
- ❌ Supabase connection errors
- ❌ React key duplication warnings