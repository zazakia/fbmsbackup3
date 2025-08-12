// Add this temporarily to ReceivingList component for debugging

const fetchReceivingOrders = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    
    // 🔍 DEBUG: Add comprehensive logging
    console.log('🔍 RECEIVING LIST: Fetching orders for receiving...');
    console.log('🔍 RECEIVING LIST: Total purchase orders:', purchaseOrders.length);
    console.log('🔍 RECEIVING LIST: Purchase orders:', purchaseOrders.map(po => ({
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      enhancedStatus: po.enhancedStatus,
      supplierName: po.supplierName
    })));
    
    // Filter orders that are ready for receiving
    const receivableStatuses = getReceivableEnhancedStatuses();
    console.log('🔍 RECEIVING LIST: Receivable enhanced statuses:', receivableStatuses);
    
    const ordersReadyForReceiving = purchaseOrders.filter(po => {
      const status = po.enhancedStatus || po.status;
      const isReceivable = isReceivableEnhancedStatus(status);
      
      console.log(`🔍 RECEIVING LIST: PO ${po.poNumber} - status: ${po.status}, enhanced: ${po.enhancedStatus}, used: ${status}, isReceivable: ${isReceivable}`);
      
      return isReceivable;
    });
    
    console.log('🔍 RECEIVING LIST: Orders ready for receiving:', ordersReadyForReceiving.length);
    console.log('🔍 RECEIVING LIST: Filtered orders:', ordersReadyForReceiving);
    
    setReceivingOrders(ordersReadyForReceiving);
    
  } catch (err) {
    console.error('❌ RECEIVING LIST: Error fetching receiving orders:', err);
    setError('Failed to load receiving orders');
  } finally {
    setLoading(false);
  }
}, [purchaseOrders]);