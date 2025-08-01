import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  User, 
  CreditCard, 
  Calculator, 
  Scan,
  Receipt,
  Clock,
  Tag,
  Percent,
  Plus,
  Minus,
  X,
  Printer,
  Save,
  RotateCcw,
  Zap,
  Star,
  AlertCircle,
  Check,
  Package
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore'; // UPDATED
import { useToastStore } from '../../store/toastStore';
import { useNotificationStore, createSystemNotification } from '../../store/notificationStore';
import { Product, Customer, PaymentMethod, CartItem } from '../../types/business';
import { formatCurrency } from '../../utils/formatters';
import EnhancedPaymentModal from './EnhancedPaymentModal';
import CustomerSelector from './CustomerSelector';

interface POSMode {
  mode: 'retail' | 'wholesale' | 'quote';
}

interface DiscountType {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
}

interface POSTransaction {
  id: string;
  items: CartItem[];
  customer?: Customer;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  change?: number;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: Date;
  cashierId: string;
  receiptNumber: string;
}

const EnhancedPOSSystem: React.FC = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [posMode, setPosMode] = useState<POSMode['mode']>('retail');
  const [discount, setDiscount] = useState<DiscountType>({ type: 'percentage', value: 0 });
  const [quickProducts, setQuickProducts] = useState<Product[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<POSTransaction[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [currentHold, setCurrentHold] = useState<string | null>(null);
  const [savedCarts, setSavedCarts] = useState<Array<{ id: string; name: string; items: CartItem[]; customer?: Customer }>>([]);
  
  // Barcode scanner
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);
  
  // Sound effects for feedback
  const [enableSounds, setEnableSounds] = useState(true);

  const { 
    products, 
    categories, 
    cart, 
    customers,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartSubtotal, 
    getCartTax, 
    getCartTotal,
    createSale,
    updateStock,
    getCustomer,
    fetchCustomers,
    updateCustomer
  } = useBusinessStore();
  
  const { user } = useSupabaseAuthStore(); // UPDATED
  const { addToast } = useToastStore();
  const { addNotification } = useNotificationStore();

  // Load customers from Supabase on component mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Initialize quick products (top-selling items)
  useEffect(() => {
    const topProducts = products
      .filter(p => p.isActive && p.stock > 0)
      .slice(0, 12); // Top 12 quick access products
    setQuickProducts(topProducts);
  }, [products]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            setSearchTerm('');
            break;
          case 'p':
            e.preventDefault();
            if (cart.length > 0) setShowPaymentModal(true);
            break;
          case 'h':
            e.preventDefault();
            handleHoldTransaction();
            break;
          case 'r':
            e.preventDefault();
            handleClearCart();
            break;
        }
      }
      
      // Function keys
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          setPosMode('retail');
          break;
        case 'F2':
          e.preventDefault();
          setPosMode('wholesale');
          break;
        case 'F3':
          e.preventDefault();
          setPosMode('quote');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart.length]);

  // Barcode scanner functionality
  const handleBarcodeInput = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (product && product.isActive && product.stock > 0) {
      addToCart(product, 1);
      playSound('beep');
      addToast({
        type: 'success',
        title: 'Product Added',
        message: `${product.name} added to cart`
      });
    } else {
      playSound('error');
      addToast({
        type: 'error',
        title: 'Product Not Found',
        message: 'Invalid barcode or product out of stock'
      });
    }
    setBarcodeInput('');
  };

  const playSound = (type: 'beep' | 'success' | 'error') => {
    if (!enableSounds) return;
    
    // Create audio context for sound feedback
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const frequencies = { beep: 800, success: 1000, error: 300 };
    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.barcode && product.barcode.includes(searchTerm));
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && product.isActive && product.stock > 0;
  });

  const calculateDiscountedSubtotal = () => {
    const subtotal = getCartSubtotal();
    if (discount.type === 'percentage') {
      return subtotal - (subtotal * discount.value / 100);
    } else {
      return Math.max(0, subtotal - discount.value);
    }
  };

  const calculateFinalTotal = () => {
    const discountedSubtotal = calculateDiscountedSubtotal();
    const taxRate = 0.12; // 12% VAT for Philippines
    const tax = discountedSubtotal * taxRate;
    return discountedSubtotal + tax;
  };

  const getDiscountAmount = () => {
    const subtotal = getCartSubtotal();
    const discounted = calculateDiscountedSubtotal();
    return subtotal - discounted;
  };

  const handleProductSelect = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      updateCartItem(product.id, existingItem.quantity + 1);
    } else {
      addToCart(product, 1);
    }
    playSound('beep');
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      const product = products.find(p => p.id === productId);
      if (product && newQuantity <= product.stock) {
        updateCartItem(productId, newQuantity);
      } else {
        addToast({
          type: 'error',
          title: 'Insufficient Stock',
          message: `Only ${product?.stock} items available`
        });
      }
    }
  };

  const handleApplyDiscount = (type: 'percentage' | 'fixed', value: number, reason?: string) => {
    setDiscount({ type, value, reason });
    addToast({
      type: 'success',
      title: 'Discount Applied',
      message: `${type === 'percentage' ? value + '%' : '₱' + value} discount applied`
    });
  };

  const handleHoldTransaction = () => {
    if (cart.length === 0) return;
    
    const holdId = `hold-${Date.now()}`;
    const holdName = `Hold ${savedCarts.length + 1}`;
    
    setSavedCarts(prev => [...prev, {
      id: holdId,
      name: holdName,
      items: [...cart],
      customer: selectedCustomer || undefined
    }]);
    
    clearCart();
    setSelectedCustomer(null);
    setDiscount({ type: 'percentage', value: 0 });
    
    addToast({
      type: 'success',
      title: 'Transaction Held',
      message: `Transaction saved as "${holdName}"`
    });
  };

  const handleRecallHold = (holdId: string) => {
    const hold = savedCarts.find(h => h.id === holdId);
    if (!hold) return;
    
    // Clear current cart and load held items
    clearCart();
    hold.items.forEach(item => {
      addToCart(item.product, item.quantity);
    });
    
    if (hold.customer) {
      setSelectedCustomer(hold.customer);
    }
    
    // Remove from saved carts
    setSavedCarts(prev => prev.filter(h => h.id !== holdId));
    
    addToast({
      type: 'success',
      title: 'Transaction Recalled',
      message: `"${hold.name}" loaded to cart`
    });
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    
    clearCart();
    setSelectedCustomer(null);
    setDiscount({ type: 'percentage', value: 0 });
    
    addToast({
      type: 'info',
      title: 'Cart Cleared',
      message: 'All items removed from cart'
    });
  };

  const handleCompleteSale = async (paymentMethod: PaymentMethod, cashReceived?: number, splitPayments?: Array<{method: PaymentMethod; amount: number}>) => {
    if (cart.length === 0) {
      addToast({
        type: 'error',
        title: 'Empty Cart',
        message: 'Please add items to cart before completing sale'
      });
      return;
    }

    // Validate stock availability
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

    try {
      const subtotal = getCartSubtotal();
      const discountAmount = getDiscountAmount();
      const total = calculateFinalTotal();
      const tax = total - calculateDiscountedSubtotal();

      // Validate total amount
      if (total <= 0) {
        throw new Error('Invalid sale total amount');
      }
      
      // Create sale record
      const saleData = {
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
        subtotal: calculateDiscountedSubtotal(),
        tax: tax,
        discount: discountAmount,
        total: total,
        paymentMethod,
        paymentStatus: 'paid' as const,
        status: 'completed' as const,
        cashierId: user?.id || 'system',
        notes: discount.reason || undefined
      };

      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}`;

      // Create sale record (this will automatically update stock)
      try {
        createSale(saleData);
      } catch (error) {
        console.error('Error creating sale:', error);
        throw new Error('Failed to create sale record');
      }

      // Update customer purchase history if customer is selected
      if (selectedCustomer) {
        try {
          const updatedCustomer = {
            totalPurchases: selectedCustomer.totalPurchases + total,
            loyaltyPoints: selectedCustomer.loyaltyPoints + Math.floor(total / 100) // 1 point per ₱100 spent
          };
          await updateCustomer(selectedCustomer.id, updatedCustomer);
        } catch (error) {
          console.error('Error updating customer:', error);
        }
      }
      
      const transaction: POSTransaction = {
        id: `txn-${Date.now()}`,
        items: cart,
        customer: selectedCustomer || undefined,
        subtotal: subtotal,
        discount: discountAmount,
        tax: tax,
        total: total,
        paymentMethod,
        cashReceived,
        change: cashReceived ? cashReceived - total : undefined,
        status: 'completed',
        createdAt: new Date(),
        cashierId: user?.id || 'system',
        receiptNumber
      };

      setRecentTransactions(prev => [transaction, ...prev.slice(0, 9)]);

      // Play success sound
      playSound('success');

      // Clear cart and reset state
      clearCart();
      setSelectedCustomer(null);
      setDiscount({ type: 'percentage', value: 0 });
      setShowPaymentModal(false);

      // Show success notification
      const successMessage = selectedCustomer 
        ? `Receipt: ${receiptNumber} - Total: ₱${total.toFixed(2)} - Customer: ${selectedCustomer.firstName} ${selectedCustomer.lastName} - Loyalty Points: +${Math.floor(total / 100)}`
        : `Receipt: ${receiptNumber} - Total: ₱${total.toFixed(2)} - Walk-in Customer`;
        
      addToast({
        type: 'success',
        title: 'Sale Completed',
        message: successMessage
      });

      addNotification(createSystemNotification(
        'Sale Completed',
        `New sale of ₱${total.toFixed(2)} completed by ${user?.firstName || 'Cashier'}`,
        'success'
      ));

    } catch (error) {
      playSound('error');
      addToast({
        type: 'error',
        title: 'Sale Failed',
        message: 'Failed to complete the sale. Please try again.'
      });
    }
  };

  const getCurrentModeMultiplier = () => {
    switch (posMode) {
      case 'wholesale': return 0.85; // 15% wholesale discount
      case 'quote': return 1;
      default: return 1;
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-dark-950">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col order-2 lg:order-1">
        {/* Header Controls */}
        <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 p-2 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
              <span className="hidden sm:inline">Point of Sale - </span><span className="sm:hidden">POS - </span>{posMode.charAt(0).toUpperCase() + posMode.slice(1)}
            </h1>
            <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
              {/* Mode Selector */}
              <div className="flex bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
                {['retail', 'wholesale', 'quote'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPosMode(mode as POSMode['mode'])}
                    className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      posMode === mode
                        ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)} <span className="hidden sm:inline">{mode === 'retail' ? '(F1)' : mode === 'wholesale' ? '(F2)' : '(F3)'}</span>
                  </button>
                ))}
              </div>
              
              {/* Hold/Recall buttons */}
              <button
                onClick={handleHoldTransaction}
                disabled={cart.length === 0}
                className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <Save className="h-4 w-4 sm:mr-1 inline" />
                <span className="hidden sm:inline">Hold (Ctrl+H)</span>
              </button>
              
              {savedCarts.length > 0 && (
                <div className="relative">
                  <select
                    value=""
                    onChange={(e) => e.target.value && handleRecallHold(e.target.value)}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 min-w-0"
                  >
                    <option value="">Recall...</option>
                    {savedCarts.map(hold => (
                      <option key={hold.id} value={hold.id}>
                        {hold.name} ({hold.items.length})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Search and Barcode */}
          <div className="space-y-2 sm:space-y-0 sm:flex sm:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-2 sm:space-x-4">
              <div className="relative flex-1 sm:flex-none">
                <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleBarcodeInput(barcodeInput);
                    }
                  }}
                  placeholder="Scan barcode"
                  className="w-full sm:w-48 pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Access Products */}
        <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 p-2 sm:p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Access</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {quickProducts.slice(0, 12).map(product => (
              <button
                key={`quick-${product.id}`}
                onClick={() => handleProductSelect(product)}
                className="p-2 text-xs bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors text-center min-h-[60px] flex flex-col justify-center"
              >
                <div className="font-medium text-blue-900 dark:text-blue-100 truncate">{product.name}</div>
                <div className="text-blue-600 dark:text-blue-400">₱{product.price.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {filteredProducts.map(product => {
              const effectivePrice = product.price * getCurrentModeMultiplier();
              return (
                <button
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className="group bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg p-2 sm:p-3 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all text-left min-h-[120px] flex flex-col"
                >
                  <div className="aspect-square bg-gray-100 dark:bg-dark-700 rounded-lg mb-2 flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                  </div>
                  <div className="space-y-1 flex-1 flex flex-col justify-between">
                    <h3 className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">SKU: {product.sku}</p>
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                        ₱{effectivePrice.toFixed(2)}
                        {posMode === 'wholesale' && (
                          <span className="text-xs text-gray-500 line-through ml-1">₱{product.price.toFixed(2)}</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {product.stock}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full lg:w-96 bg-white dark:bg-dark-800 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-dark-700 flex flex-col order-1 lg:order-2 max-h-[50vh] lg:max-h-none">
        {/* Cart Header */}
        <div className="p-2 sm:p-4 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Cart ({cart.length})
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear Cart"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Customer Selection */}
          <div className="mb-2 sm:mb-4 lg:block hidden">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowCustomerSelector(true)}
                className="flex-1 px-3 py-2 text-left border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors min-h-[44px]"
              >
                {selectedCustomer ? (
                  <div>
                    <div className="font-medium text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{selectedCustomer.email}</div>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-sm">Select customer</div>
                )}
              </button>
              {selectedCustomer && (
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 min-h-[44px]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="p-4 sm:p-8 text-center text-gray-500 dark:text-gray-400">
              <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-sm sm:text-base">Cart is empty</p>
              <p className="text-xs sm:text-sm">Add products to start a sale</p>
            </div>
          ) : (
            <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
              {cart.map(item => {
                const effectivePrice = item.product.price * getCurrentModeMultiplier();
                const itemTotal = effectivePrice * item.quantity;
                
                return (
                  <div key={item.product.id} className="bg-gray-50 dark:bg-dark-700 rounded-lg p-2 sm:p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ₱{effectivePrice.toFixed(2)} each
                          {posMode === 'wholesale' && (
                            <span className="ml-1 line-through">₱{item.product.price.toFixed(2)}</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 min-h-[32px] min-w-[32px] flex items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <button
                          onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                          className="p-1 sm:p-2 rounded-md bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500 text-gray-700 dark:text-gray-300 min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="p-1 sm:p-2 rounded-md bg-gray-200 dark:bg-dark-600 hover:bg-gray-300 dark:hover:bg-dark-500 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[32px] min-w-[32px] flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                        ₱{itemTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 dark:border-dark-700 p-2 sm:p-4 space-y-2 sm:space-y-4">
            {/* Discount Controls - Hidden on mobile in collapsed mode */}
            <div className="lg:block hidden">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discount</label>
              <div className="flex space-x-2">
                <select
                  value={discount.type}
                  onChange={(e) => setDiscount(prev => ({ ...prev, type: e.target.value as 'percentage' | 'fixed' }))}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-dark-600 rounded bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">₱</option>
                </select>
                <input
                  type="number"
                  value={discount.value}
                  onChange={(e) => setDiscount(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  max={discount.type === 'percentage' ? 100 : 9999999}
                  step={discount.type === 'percentage' ? 1 : 0.01}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-dark-600 rounded bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal:</span>
                <span>₱{getCartSubtotal().toFixed(2)}</span>
              </div>
              
              {discount.value > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount:</span>
                  <span>-₱{getDiscountAmount().toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax (12%):</span>
                <span>₱{(calculateFinalTotal() - calculateDiscountedSubtotal()).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-dark-700">
                <span>Total:</span>
                <span>₱{calculateFinalTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Button */}
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center min-h-[48px] text-sm sm:text-base"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Process Payment (Ctrl+P)</span>
              <span className="sm:hidden">Pay Now</span>
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <EnhancedPaymentModal
          total={calculateFinalTotal()}
          onPayment={handleCompleteSale}
          onClose={() => setShowPaymentModal(false)}
          customer={selectedCustomer}
          items={cart}
          discount={getDiscountAmount()}
          tax={calculateFinalTotal() - calculateDiscountedSubtotal()}
        />
      )}

      {/* Customer Selector Modal */}
      {showCustomerSelector && (
        <CustomerSelector
          customers={customers}
          onCustomerSelect={(customer) => {
            setSelectedCustomer(customer || null);
            setShowCustomerSelector(false);
          }}
          onClose={() => setShowCustomerSelector(false)}
        />
      )}
    </div>
  );
};

export default EnhancedPOSSystem;