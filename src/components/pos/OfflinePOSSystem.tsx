import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  User, 
  CreditCard, 
  WifiOff, 
  Wifi, 
  CloudOff, 
  Cloud,
  AlertCircle,
  CheckCircle,
  Clock,
  Sync,
  X
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';
import { useOfflineStore } from '../../store/offlineStore';
import { PaymentMethod, Customer, Sale } from '../../types/business';
import { formatCurrency } from '../../utils/formatters';
import ProductGrid from './ProductGrid';
import Cart from './Cart';
import CustomerSelector from './CustomerSelector';
import PaymentModal from './PaymentModal';
import ReceiptModal from './ReceiptModal';

const OfflinePOSSystem: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);

  const { 
    products, 
    categories, 
    cart, 
    customers,
    getCartSubtotal, 
    getCartTax, 
    getCartTotal,
    clearCart,
    createSale,
    createOfflineSale
  } = useBusinessStore();
  
  const { user } = useSupabaseAuthStore();
  const { addToast } = useToastStore();
  
  const {
    isOnline,
    isOfflineMode,
    pendingTransactions,
    syncStatus,
    setOnlineStatus,
    toggleOfflineMode,
    addPendingTransaction,
    retryFailedTransactions,
    offlineData
  } = useOfflineStore();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      addToast({
        type: 'success',
        title: 'Connection Restored',
        message: 'You are back online. Syncing pending transactions...'
      });
    };

    const handleOffline = () => {
      setOnlineStatus(false);
      setShowOfflineIndicator(true);
      addToast({
        type: 'warning',
        title: 'Connection Lost',
        message: 'You are now offline. Transactions will be saved locally.'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status check
    setOnlineStatus(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, addToast]);

  // Auto-hide offline indicator after 5 seconds
  useEffect(() => {
    if (showOfflineIndicator) {
      const timer = setTimeout(() => {
        setShowOfflineIndicator(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showOfflineIndicator]);

  const filteredProducts = useMemo(() => 
    products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory && product.isActive && product.stock > 0;
    }), [products, searchTerm, selectedCategory]);

  const handleCompleteSale = useCallback(async (paymentMethod: PaymentMethod, cashReceived?: number) => {
    if (cart.length === 0) {
      addToast({
        type: 'error',
        title: 'Empty Cart',
        message: 'Please add items to cart before completing sale'
      });
      return;
    }

    // Validate stock availability before processing
    for (const item of cart) {
      if (item.product.stock < item.quantity) {
        addToast({
          type: 'error',
          title: 'Insufficient Stock',
          message: `Not enough stock for ${item.product.name}. Available: ${item.product.stock}, Required: ${item.quantity}`
        });
        return;
      }
    }

    const subtotal = getCartSubtotal();
    const tax = getCartTax();
    const total = getCartTotal();

    // Validate cash payment
    if (paymentMethod === 'cash' && cashReceived && cashReceived < total) {
      addToast({
        type: 'error',
        title: 'Insufficient Cash',
        message: `Cash received (₱${cashReceived.toFixed(2)}) is less than total (₱${total.toFixed(2)})`
      });
      return;
    }

    try {
      // Generate receipt number and offline ID
      const receiptNumber = `RCP-${Date.now()}`;
      const offlineId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create sale data
      const saleData = {
        offlineId, // Add offline ID for tracking
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Walk-in Customer',
        items: cart.map(item => ({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.product.price,
          total: item.total
        })),
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: user?.id || 'system',
        receiptNumber,
        cashReceived,
        change: cashReceived ? cashReceived - total : undefined,
        notes: isOnline ? '' : 'Created offline',
        createdAt: new Date()
      };

      // If offline or offline mode is enabled, create offline sale
      if (!isOnline || isOfflineMode) {
        // Create offline sale using business store
        const offlineSale = createOfflineSale(saleData);
        
        // Add to pending transactions for later sync
        addPendingTransaction({
          type: 'sale',
          data: saleData
        });

        addToast({
          type: 'success',
          title: 'Sale Saved Offline',
          message: `Sale saved locally. Will sync when connection is restored.`
        });
      } else {
        // Try to process online
        try {
          await createSale(saleData);
          
          addToast({
            type: 'success',
            title: 'Sale Completed',
            message: `Receipt: ${receiptNumber} - Total: ₱${total.toFixed(2)}`
          });
        } catch (error) {
          // If online processing fails, save offline
          const offlineSale = createOfflineSale(saleData);
          
          addPendingTransaction({
            type: 'sale',
            data: saleData
          });

          addToast({
            type: 'warning',
            title: 'Sale Saved Offline',
            message: 'Online processing failed. Sale saved locally for later sync.'
          });
        }
      }

      // Create sale object for receipt
      const saleForReceipt: Sale = {
        id: offlineId,
        ...saleData,
        invoiceNumber: `INV-${Date.now()}`
      };

      // Clear cart and show receipt
      clearCart();
      setShowPaymentModal(false);
      setCompletedSale(saleForReceipt);
      setShowReceiptModal(true);

    } catch (error) {
      console.error('Error processing sale:', error);
      addToast({
        type: 'error',
        title: 'Sale Failed',
        message: 'Failed to process the sale. Please try again.'
      });
    }
  }, [cart, selectedCustomer, getCartSubtotal, getCartTax, getCartTotal, clearCart, addToast, user?.id, isOnline, isOfflineMode, addPendingTransaction, products]);

  const handleSyncNow = useCallback(async () => {
    if (!isOnline) {
      addToast({
        type: 'error',
        title: 'No Connection',
        message: 'Cannot sync while offline'
      });
      return;
    }

    if (pendingTransactions.length === 0) {
      addToast({
        type: 'info',
        title: 'Nothing to Sync',
        message: 'No pending transactions to sync'
      });
      return;
    }

    try {
      await retryFailedTransactions();
      addToast({
        type: 'success',
        title: 'Sync Complete',
        message: 'All pending transactions have been synced'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to sync some transactions'
      });
    }
  }, [isOnline, pendingTransactions.length, retryFailedTransactions, addToast]);

  return (
    <div className="h-full flex bg-gray-50 dark:bg-dark-950 relative">
      {/* Offline/Online Status Indicator */}
      <div className="fixed top-4 right-4 z-50 flex items-center space-x-2">
        {/* Connection Status */}
        <div className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isOnline 
            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
            : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
        } ${showOfflineIndicator ? 'animate-pulse' : ''}`}>
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 mr-2" />
              Online
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 mr-2" />
              Offline
            </>
          )}
        </div>

        {/* Offline Mode Toggle */}
        <button
          onClick={toggleOfflineMode}
          className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            isOfflineMode
              ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
          }`}
          title={isOfflineMode ? 'Disable offline mode' : 'Enable offline mode'}
        >
          {isOfflineMode ? (
            <>
              <CloudOff className="h-4 w-4 mr-2" />
              Offline Mode
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4 mr-2" />
              Online Mode
            </>
          )}
        </button>

        {/* Pending Transactions Indicator */}
        {pendingTransactions.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-lg text-sm font-medium border border-yellow-200 dark:border-yellow-800">
              <Clock className="h-4 w-4 mr-2 inline" />
              {pendingTransactions.length} pending
            </div>
            
            {isOnline && (
              <button
                onClick={handleSyncNow}
                disabled={syncStatus === 'syncing'}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
              >
                <Sync className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col">
        {/* Search and Filters */}
        <div className="bg-white dark:bg-dark-800 p-4 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <ProductGrid products={filteredProducts} />
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 bg-white dark:bg-dark-800 border-l border-gray-200 dark:border-dark-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Current Sale
            </h2>
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium px-2 py-1 rounded">
              {cart.length} items
            </span>
          </div>

          {/* Customer Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCustomerSelector(true)}
                className="flex-1 flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-gray-900 dark:text-gray-100"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-dark-600 rounded-full flex items-center justify-center mr-3">
                    <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">
                      {selectedCustomer 
                        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                        : 'Walk-in Customer'
                      }
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedCustomer?.email || 'Click to select customer'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400">Change</span>
              </button>
              {selectedCustomer && (
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Clear customer selection"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          <Cart />
        </div>

        {/* Cart Summary and Checkout */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">₱{getCartSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">VAT (12%):</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">₱{getCartTax().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2 border-gray-200 dark:border-dark-700">
              <span className="text-gray-900 dark:text-gray-100">Total:</span>
              <span className="text-blue-600 dark:text-blue-400">₱{getCartTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Process Payment
              {(!isOnline || isOfflineMode) && (
                <span className="ml-2 text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded">
                  Offline
                </span>
              )}
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="w-full bg-gray-200 dark:bg-dark-700 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-dark-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>

      {/* Customer Selector Modal */}
      {showCustomerSelector && (
        <CustomerSelector
          customers={customers}
          selectedCustomer={selectedCustomer}
          onCustomerSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerSelector(false);
          }}
          showModal={true}
          onClose={() => setShowCustomerSelector(false)}
          loading={false}
          onRefreshCustomers={() => {}}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          total={getCartTotal()}
          onPayment={handleCompleteSale}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Receipt Modal */}
      {showReceiptModal && completedSale && (
        <ReceiptModal
          sale={completedSale}
          customer={selectedCustomer || undefined}
          onClose={() => {
            setShowReceiptModal(false);
            setCompletedSale(null);
            setSelectedCustomer(null);
          }}
        />
      )}
    </div>
  );
};

export default OfflinePOSSystem;