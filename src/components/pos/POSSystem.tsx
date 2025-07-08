import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ShoppingCart, User, CreditCard, Calculator, Menu, X } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import ProductGrid from './ProductGrid';
import Cart from './Cart';
import CustomerSelector from './CustomerSelector';
import PaymentModal from './PaymentModal';
import { PaymentMethod, Customer } from '../../types/business';
import { getCustomers } from '../../api/customers';
import { useDebounce } from '../../hooks/useDebounce';

const POSSystem: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [realCustomers, setRealCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const { 
    products, 
    categories, 
    cart, 
    getCartSubtotal, 
    getCartTax, 
    getCartTotal,
    createSale,
    clearCart
  } = useBusinessStore();
  
  const { user } = useAuthStore();

  // Load real customers from API
  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const { data, error } = await getCustomers();
      if (data && !error) {
        setRealCustomers(data);
      } else {
        console.warn('Failed to load customers:', error);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCustomerSelect = useCallback((customer: Customer | null) => {
    setSelectedCustomer(customer);
    setShowCustomerSelector(false);
  }, []);

  const handleCloseCustomerSelector = useCallback(() => {
    setShowCustomerSelector(false);
  }, []);

  const filteredProducts = useMemo(() => 
    products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           product.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory && product.isActive && product.stock > 0;
    }), [products, debouncedSearchTerm, selectedCategory]);

  const handleCompleteSale = useCallback((paymentMethod: PaymentMethod) => {
    if (cart.length === 0) return;

    const subtotal = getCartSubtotal();
    const tax = getCartTax();
    const total = getCartTotal();

    createSale({
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Walk-in Customer',
      items: cart.map(item => ({
        id: item.product.id,
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
      paymentStatus: 'paid',
      status: 'completed',
      cashierId: user?.id || '1',
      notes: ''
    });

    setShowPaymentModal(false);
    setSelectedCustomer(null);
  }, [cart, selectedCustomer, getCartSubtotal, getCartTax, getCartTotal, createSale, user?.id]);

  // Use the selected customer directly

  return (
    <div className="h-full flex bg-gray-50 dark:bg-dark-950">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header with Cart Toggle */}
        <div className="lg:hidden bg-white dark:bg-dark-800 p-4 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Point of Sale</h1>
            <button
              onClick={() => setShowMobileCart(true)}
              className="relative p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Mobile Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mobile-search pl-10"
            />
          </div>
          
          {/* Mobile Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="mobile-input text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Search and Filters */}
        <div className="hidden lg:block bg-white dark:bg-dark-800 p-4 border-b border-gray-200 dark:border-dark-700">
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <ProductGrid products={filteredProducts} />
        </div>
      </div>

      {/* Desktop Right Panel - Cart */}
      <div className="hidden lg:flex w-96 bg-white dark:bg-dark-800 border-l border-gray-200 dark:border-dark-700 flex-col">
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

      {/* Mobile Cart Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-dark-800 transform transition-transform duration-300 ease-in-out ${
        showMobileCart ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Mobile Cart Header */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Current Sale
            </h2>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium px-2 py-1 rounded">
                {cart.length} items
              </span>
              <button
                onClick={() => setShowMobileCart(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Mobile Customer Selection */}
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
                      {selectedCustomer?.email || 'Tap to select customer'}
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

        {/* Mobile Cart Items */}
        <div className="flex-1 overflow-y-auto">
          <Cart />
        </div>

        {/* Mobile Cart Summary and Checkout */}
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
              className="mobile-btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Process Payment
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="mobile-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Cart Overlay */}
      {showMobileCart && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowMobileCart(false)}
        />
      )}

      {/* Customer Selector Modal */}
      {showCustomerSelector && (
        <CustomerSelector
          customers={realCustomers}
          selectedCustomer={selectedCustomer}
          onCustomerSelect={handleCustomerSelect}
          showModal={true}
          onClose={handleCloseCustomerSelector}
          loading={loadingCustomers}
          onRefreshCustomers={loadCustomers}
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
    </div>
    </div>
  );
};

export default POSSystem;