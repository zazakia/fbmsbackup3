import React, { useState, useEffect, useCallback } from 'react';
import { Package, Calendar, User, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { isReceivableEnhancedStatus, getReceivableEnhancedStatuses } from '../../utils/statusMappings';
import { PurchaseOrder } from '../../types/purchase';
import { useBusinessStore } from '../../store/businessStore';
import { usePurchasesSubscriptions } from '../../hooks/usePurchasesSubscriptions';

interface ReceivingListProps {
  onReceiveOrder?: (orderId: string) => void;
  onMarkPartiallyReceived?: (orderId: string) => void;
}

const ReceivingList: React.FC<ReceivingListProps> = ({
  onReceiveOrder,
  onMarkPartiallyReceived
}) => {
  const [receivingOrders, setReceivingOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { purchaseOrders, refreshPurchaseOrders, addPurchaseOrder } = useBusinessStore();

  // Set up real-time subscriptions for purchase order changes
  usePurchasesSubscriptions({
    onDataChange: () => {
      console.log('🔄 RECEIVING LIST: Real-time update detected, refreshing...');
      fetchReceivingOrders();
    },
    enabled: true
  });

  const fetchReceivingOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 RECEIVING LIST: Fetching orders for receiving...');
      console.log('🔍 RECEIVING LIST: Total purchase orders:', purchaseOrders.length);
      
      // Filter orders that are ready for receiving
      const receivableStatuses = getReceivableEnhancedStatuses();
      console.log('🔍 RECEIVING LIST: Receivable enhanced statuses:', receivableStatuses);
      
      const ordersReadyForReceiving = purchaseOrders.filter(po => {
        const status = po.enhancedStatus || po.status;
        const isReceivable = isReceivableEnhancedStatus(status);
        
        console.log(`🔍 RECEIVING LIST: PO ${po.poNumber} - status: ${status}, enhanced: ${po.enhancedStatus}, isReceivable: ${isReceivable}`);
        
        return isReceivable;
      });
      
      console.log('🔍 RECEIVING LIST: Orders ready for receiving:', ordersReadyForReceiving.length);
      console.log('🔍 RECEIVING LIST: Orders:', ordersReadyForReceiving.map(po => ({
        id: po.id,
        poNumber: po.poNumber,
        status: po.status,
        enhancedStatus: po.enhancedStatus,
        supplierName: po.supplierName,
        total: po.total
      })));
      
      setReceivingOrders(ordersReadyForReceiving);
      
    } catch (err) {
      console.error('❌ RECEIVING LIST: Error fetching receiving orders:', err);
      setError('Failed to load receiving orders');
    } finally {
      setLoading(false);
    }
  }, [purchaseOrders]);

  useEffect(() => {
    fetchReceivingOrders();
  }, [fetchReceivingOrders]);

  const handleReceiveOrder = async (orderId: string) => {
    try {
      console.log('🔄 RECEIVING LIST: Receiving order:', orderId);
      
      if (onReceiveOrder) {
        await onReceiveOrder(orderId);
      }
      
      // Refresh the list after receiving
      await refreshPurchaseOrders();
      fetchReceivingOrders();
      
    } catch (err) {
      console.error('❌ RECEIVING LIST: Error receiving order:', err);
      setError('Failed to receive order');
    }
  };

  const handleMarkPartiallyReceived = async (orderId: string) => {
    try {
      console.log('🔄 RECEIVING LIST: Marking order as partially received:', orderId);
      
      if (onMarkPartiallyReceived) {
        await onMarkPartiallyReceived(orderId);
      }
      
      // Refresh the list after marking as partially received
      await refreshPurchaseOrders();
      fetchReceivingOrders();
      
    } catch (err) {
      console.error('❌ RECEIVING LIST: Error marking order as partially received:', err);
      setError('Failed to mark order as partially received');
    }
  };

  const addTestData = () => {
    // Check if test data already exists
    const existingTestOrder = purchaseOrders.find(po => po.id?.startsWith('po-test-'));
    if (existingTestOrder) {
      console.log('🚨 RECEIVING LIST: Test data already exists, skipping...');
      return;
    }

    console.log('🧪 RECEIVING LIST: Adding test purchase orders...');
    
    const timestamp = Date.now();
    const testPurchaseOrders = [
      {
        id: `po-test-approved-${timestamp}`,
        poNumber: `PO-TEST-APPROVED-${timestamp}`,
        supplierId: 'supplier-test-1',
        supplierName: 'Test Approved Supplier',
        items: [
          {
            id: 'item-test-1',
            productId: 'product-test-1',
            productName: 'Test Product A',
            sku: 'TEST-SKU-A',
            quantity: 10,
            cost: 100,
            total: 1000
          }
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'approved' as const,
        enhancedStatus: 'approved' as const,
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        approvedBy: 'test-manager@example.com',
        approvedAt: new Date().toISOString(),
        createdBy: 'test-user@example.com'
      },
      {
        id: `po-test-sent-${timestamp + 1}`,
        poNumber: `PO-TEST-SENT-${timestamp + 1}`,
        supplierId: 'supplier-test-2',
        supplierName: 'Test Sent Supplier',
        items: [
          {
            id: 'item-test-2',
            productId: 'product-test-2',
            productName: 'Test Product B',
            sku: 'TEST-SKU-B',
            quantity: 5,
            cost: 200,
            total: 1000
          }
        ],
        subtotal: 1000,
        tax: 120,
        total: 1120,
        status: 'sent' as const,
        enhancedStatus: 'sent_to_supplier' as const,
        expectedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'test-user@example.com'
      }
    ];

    testPurchaseOrders.forEach(po => {
      addPurchaseOrder(po);
      console.log(`✅ Added test PO: ${po.poNumber} (${po.enhancedStatus})`);
    });

    // Refresh the receiving orders after adding test data
    setTimeout(() => {
      fetchReceivingOrders();
    }, 100);
  };

  const clearTestData = () => {
    console.log('🗑️ RECEIVING LIST: Clearing test data...');
    // This would require a way to remove purchase orders from the store
    // For now, just refresh the page
    window.location.reload();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'sent_to_supplier':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'partially_received':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'sent_to_supplier':
        return 'Sent to Supplier';
      case 'partially_received':
        return 'Partially Received';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading receiving orders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </div>
        <button
          onClick={fetchReceivingOrders}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (receivingOrders.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No orders ready for receiving</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Purchase orders will appear here once they are approved and ready for receiving.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={fetchReceivingOrders}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/40"
          >
            Refresh List
          </button>
          {!purchaseOrders.some(po => po.id?.startsWith('po-test-')) ? (
            <button
              onClick={addTestData}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 hover:bg-green-200 dark:hover:bg-green-900/40"
            >
              🧪 Add Test Data
            </button>
          ) : (
            <button
              onClick={clearTestData}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40"
            >
              🗑️ Clear Test Data
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Orders Ready for Receiving ({receivingOrders.length})
        </h3>
        <button
          onClick={fetchReceivingOrders}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {receivingOrders.map(po => (
          <div
            key={po.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {po.poNumber}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {po.supplierName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(po.enhancedStatus || po.status)}`}>
                  {getStatusLabel(po.enhancedStatus || po.status)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <DollarSign className="h-4 w-4 mr-1" />
                <span>{formatCurrency(po.total)}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Package className="h-4 w-4 mr-1" />
                <span>{po.items.length} items</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formatDate(po.createdAt)}</span>
              </div>
              {po.expectedDate && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Due: {formatDate(po.expectedDate)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {po.approvedBy && (
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>Approved by: {po.approvedBy}</span>
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleMarkPartiallyReceived(po.id)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Partial Receive
                </button>
                <button
                  onClick={() => handleReceiveOrder(po.id)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Receive Order
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReceivingList;