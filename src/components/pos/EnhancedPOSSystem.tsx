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
import { StockValidationError } from '../../utils/stockValidation';
import EnhancedPaymentModal from './EnhancedPaymentModal';
import CustomerSelector from './CustomerSelector';
import StockValidationAlert from './StockValidationAlert';

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
  try {
    console.info('[POS] EnhancedPOSSystem mount start');
  } catch (e) {}
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
  
  // Stock validation state (temporarily relaxed to any to unblock diagnostics)
  const [stockValidationErrors, setStockValidationErrors] = useState<any[]>([]);
  const [stockValidationWarnings, setStockValidationWarnings] = useState<any[]>([]);
  const [showStockValidation, setShowStockValidation] = useState(false);
  
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
    fetchCustomers,
    updateCustomer,
    validateSaleStock,
    validateProductStock
  } = useBusinessStore() as any;

  // Runtime guards for critical store methods
  useEffect(() => {
    try {
      console.info('[POS] Store snapshot', {
        productsCount: Array.isArray(products) ? products.length : 'n/a',
        categoriesCount: Array.isArray(categories) ? categories.length : 'n/a',
        cartCount: Array.isArray(cart) ? cart.length : 'n/a',
      });
      const guards = {
        addToCart: typeof addToCart === 'function',
        updateCartItem: typeof updateCartItem === 'function',
        removeFromCart: typeof removeFromCart === 'function',
        clearCart: typeof clearCart === 'function',
        getCartSubtotal: typeof getCartSubtotal === 'function',
        createSale: typeof createSale === 'function',
        fetchCustomers: typeof fetchCustomers === 'function',
        updateCustomer: typeof updateCustomer === 'function',
        validateSaleStock: typeof validateSaleStock === 'function',
        validateProductStock: typeof validateProductStock === 'function',
      };
      console.info('[POS] Method guards', guards);
      const missing = Object.entries(guards).filter(([, ok]) => !ok).map(([k]) => k);
      if (missing.length) {
        console.error('[POS] Missing required store methods:', missing);
      }
    } catch (e) {
      console.error('[POS] Error during guard checks:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Continuous cart validation
  useEffect(() => {
    if (cart.length > 0) {
      const validation = validateSaleStock(cart);

      // Targeted diagnostics for validation shape from store
      try {
        const firstErr = (validation as any)?.errors?.[0];
        const firstWarn = (validation as any)?.warnings?.[0];
         
        console.info('[POS][validateSaleStock] validation summary', {
          isValid: (validation as any)?.isValid,
          errorsType: Array.isArray((validation as any)?.errors) ? 'array' : typeof (validation as any)?.errors,
          warningsType: Array.isArray((validation as any)?.warnings) ? 'array' : typeof (validation as any)?.warnings,
          firstErrorType: firstErr ? typeof firstErr : 'none',
          firstErrorKeys: firstErr ? Object.keys(firstErr) : [],
          firstWarningType: firstWarn ? typeof firstWarn : 'none',
          firstWarningKeys: firstWarn ? Object.keys(firstWarn) : []
        });
      } catch (e) {
         
        console.error('[POS][validateSaleStock] diagnostics failed', e);
      }

      setStockValidationErrors(validation.errors as any);
      setStockValidationWarnings(validation.warnings as any);
      setShowStockValidation(validation.errors.length > 0 || validation.warnings.length > 0);
    } else {
      setStockValidationErrors([]);
      setStockValidationWarnings([]);
      setShowStockValidation(false);
    }
  }, [cart, validateSaleStock]);
  
  const { user } = useSupabaseAuthStore(); // UPDATED
  const { addToast } = useToastStore();
  const { addNotification } = useNotificationStore();

  // Load customers from Supabase on component mount
  useEffect(() => {
    try {
      console.info('[POS] Fetching customers on mount');
      fetchCustomers();
    } catch (e) {
      console.error('[POS] fetchCustomers threw:', e);
    }
  }, [fetchCustomers]);

  // Initialize quick products (top-selling items)
  useEffect(() => {
    const topProducts = (products as any[])
      .filter((p: any) => p.isActive && p.stock > 0)
      .slice(0, 12); // Top 12 quick access products
    setQuickProducts(topProducts);
  }, [products]);

  // Keyboard shortcuts
  useEffect(() => {
    console.info('[POS] Keyboard shortcuts active, cart length:', cart.length);
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
    const product = products.find((p: any) => p.barcode === barcode || p.sku === barcode);
    if (product && product.isActive) {
      // addToCart in store returns void; perform validation locally before calling it
      const validation = validateProductStock(product.id, 1, {
        preventNegative: true,
        validateBeforeUpdate: true
      } as any);

      if ((validation as any)?.isValid) {
        addToCart(product, 1);
        playSound('beep');
        addToast({
          type: 'success',
          title: 'Product Added',
          message: `${product.name} added to cart`
        });
        
        // Show warnings if any
        ((validation as any)?.warnings || []).forEach((warning: any) => {
          if (warning?.message) {
            addToast({
              type: 'warning',
              title: 'Stock Warning',
              message: warning.message,
              duration: 4000
            });
          }
        });
      } else {
        playSound('error');
        const errMsg = (validation as any)?.errors?.[0]?.message || 'Stock validation failed';
        addToast({
          type: 'error',
          title: 'Cannot Add Product',
          message: errMsg
        });
      }
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

  const filteredProducts = (products as any[]).filter((product: any) => {
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
    const existingItem = (cart as any[]).find((item: any) => item.product.id === product.id);
    if (existingItem) {
      // Validate before updating cart item
      const validation = validateProductStock(product.id, existingItem.quantity + 1, {
        preventNegative: true,
        validateBeforeUpdate: true
      });
      
      if (validation.isValid) {
        updateCartItem(product.id, existingItem.quantity + 1);
        playSound('beep');
        
        // Show warnings if any
        (validation as any).warnings.forEach((warning: any) => {
          addToast({
            type: 'warning',
            title: 'Stock Warning',
            message: warning.message,
            duration: 4000
          });
        });
      } else {
        playSound('error');
        addToast({
          type: 'error',
          title: 'Cannot Add Product',
          message: validation.errors[0]?.message || 'Stock validation failed'
        });
      }
    } else {
      const validation = addToCart(product, 1);
      if (validation.isValid) {
        playSound('beep');
      } else {
        playSound('error');
      }
    }
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    try {
      // Basic diagnostics for qty changes
       
      console.debug('[POS] handleQuantityChange', { productId, newQuantity });
    } catch {}
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      const product = (products as any[]).find((p: any) => p.id === productId);
      if (product) {
        const validation = validateProductStock(product.id, newQuantity, {
          preventNegative: true,
          validateBeforeUpdate: true
        });
        
        if ((validation as any)?.isValid) {
          updateCartItem(productId, newQuantity);
          
          // Show warnings if any
          ((validation as any)?.warnings || []).forEach((warning: any) => {
            if (warning?.message) {
              addToast({
                type: 'warning',
                title: 'Stock Warning',
                message: warning.message,
                duration: 4000
              });
            }
          });
        } else {
          addToast({
            type: 'error',
            title: 'Cannot Update Quantity',
            message: (validation as any)?.errors?.[0]?.message || 'Stock validation failed'
          });
        }
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

  const handleRedeemLoyaltyPoints = (pointsToRedeem: number) => {
    if (!selectedCustomer || selectedCustomer.loyaltyPoints < pointsToRedeem) {
      addToast({
        type: 'error',
        title: 'Insufficient Points',
        message: 'Customer does not have enough loyalty points'
      });
      return;
    }

    // Convert points to discount (1 point = ₱1 discount)
    const discountAmount = pointsToRedeem;
    const maxDiscount = getCartSubtotal();
    const actualDiscount = Math.min(discountAmount, maxDiscount);

    setDiscount({ 
      type: 'fixed', 
      value: actualDiscount, 
      reason: `Loyalty points redemption: ${pointsToRedeem} points` 
    });

    addToast({
      type: 'success',
      title: 'Points Redeemed',
      message: `${pointsToRedeem} loyalty points redeemed for ₱${actualDiscount.toFixed(2)} discount`
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

    // Enhanced stock validation using the new validation system
    const stockValidation = validateSaleStock(cart);
    
    if (!stockValidation.isValid) {
      // Show detailed error messages for each stock issue
      (stockValidation as any).errors.forEach((error: any) => {
        addToast({
          type: 'error',
          title: 'Stock Validation Error',
          message: error.message,
          duration: 8000 // Longer duration for stock errors
        });
      });

      // Show suggestions if available
      const suggestions = stockValidation.errors
        .flatMap((error: any) => error.suggestions || [])
        .filter((suggestion: any, index: number, arr: any[]) => arr.indexOf(suggestion) === index); // Remove duplicates

      if (suggestions.length > 0) {
        addToast({
          type: 'info',
          title: 'Suggestions',
          message: suggestions.slice(0, 3).join('. '), // Show up to 3 suggestions
          duration: 10000
        });
      }

      return;
    }

    // Show warnings if any (low stock, etc.)
    if (stockValidation.warnings.length > 0) {
      (stockValidation as any).warnings.forEach((warning: any) => {
        addToast({
          type: 'warning',
          title: 'Stock Warning',
          message: warning.message,
          duration: 6000
        });
      });
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
        items: (cart as any[]).map((item: any) => ({
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
        await createSale(saleData);
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

  try {
    console.info('[POS] EnhancedPOSSystem render');
  } catch (e) {}
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

          {/* Mobile Customer Selection */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowCustomerSelector(true)}
              className="w-full px-3 py-2 text-left border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
            >
              {selectedCustomer ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                    <div className="flex items-center space-x-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {selectedCustomer.customerType}
                      </span>
                      {selectedCustomer.discountPercentage > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {selectedCustomer.discountPercentage}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-600 dark:text-purple-400">⭐ {selectedCustomer.loyaltyPoints || 0}</span>
                      {selectedCustomer.currentBalance > 0 && (
                        <span className="text-orange-600 dark:text-orange-400">₱{selectedCustomer.currentBalance.toFixed(2)}</span>
                      )}
                    </div>
                    <span className="text-gray-400">Total: ₱{selectedCustomer.totalPurchases.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm py-2">
                  <User className="h-4 w-4 mr-2" />
                  Select Customer
                </div>
              )}
            </button>
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
                {(categories as any[]).map((category: any) => (
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
            {(filteredProducts as any[]).map((product: any) => {
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
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {selectedCustomer.customerType}
                        </span>
                        {selectedCustomer.discountPercentage > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {selectedCustomer.discountPercentage}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedCustomer.email && (
                        <div className="flex items-center space-x-1">
                          <span>📧</span>
                          <span>{selectedCustomer.email}</span>
                        </div>
                      )}
                      {selectedCustomer.phone && (
                        <div className="flex items-center space-x-1">
                          <span>📞</span>
                          <span>{selectedCustomer.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          ⭐ {selectedCustomer.loyaltyPoints || 0} points
                        </span>
                        {selectedCustomer.currentBalance > 0 && (
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            Balance: ₱{selectedCustomer.currentBalance.toFixed(2)}
                          </span>
                        )}
                        {selectedCustomer.creditLimit > 0 && (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            Credit: ₱{selectedCustomer.creditLimit.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400">
                        Total: ₱{selectedCustomer.totalPurchases.toFixed(2)}
                      </span>
                    </div>
                    {selectedCustomer.businessName && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        🏢 {selectedCustomer.businessName}
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        📍 {selectedCustomer.address}
                        {selectedCustomer.city && `, ${selectedCustomer.city}`}
                        {selectedCustomer.province && `, ${selectedCustomer.province}`}
                      </div>
                    )}
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
            
            {/* Loyalty Points Redemption */}
            {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                    <Star className="h-3 w-3 inline mr-1" />
                    Loyalty Points: {selectedCustomer.loyaltyPoints}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="1"
                    max={Math.min(selectedCustomer.loyaltyPoints, getCartSubtotal())}
                    placeholder="Points to redeem"
                    className="flex-1 px-2 py-1 text-xs border border-yellow-300 dark:border-yellow-700 rounded bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const points = parseInt((e.target as HTMLInputElement).value);
                        if (points > 0) {
                          handleRedeemLoyaltyPoints(points);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      const points = parseInt(input.value);
                      if (points > 0) {
                        handleRedeemLoyaltyPoints(points);
                        input.value = '';
                      }
                    }}
                    className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                  >
                    Redeem
                  </button>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  1 point = ₱1 discount
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Info Panel in Cart */}
        {selectedCustomer && (
          <div className="px-2 sm:px-4 py-2 border-b border-gray-200 dark:border-dark-700">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium text-sm text-blue-900 dark:text-blue-100">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {selectedCustomer.customerType}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Loyalty Points:</span>
                        <span className="font-medium text-purple-600 dark:text-purple-400">
                          ⭐ {selectedCustomer.loyaltyPoints || 0}
                        </span>
                      </div>
                      {selectedCustomer.discountPercentage > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Customer Discount:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {selectedCustomer.discountPercentage}%
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Purchases:</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          ₱{selectedCustomer.totalPurchases.toFixed(2)}
                        </span>
                      </div>
                      {selectedCustomer.currentBalance > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                          <span className="font-medium text-orange-600 dark:text-orange-400">
                            ₱{selectedCustomer.currentBalance.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {selectedCustomer.creditLimit > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Credit Limit:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            ₱{selectedCustomer.creditLimit.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {(selectedCustomer.email || selectedCustomer.phone) && (
                    <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                        {selectedCustomer.email && (
                          <span className="flex items-center">
                            📧 {selectedCustomer.email}
                          </span>
                        )}
                        {selectedCustomer.phone && (
                          <span className="flex items-center">
                            📞 {selectedCustomer.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock Validation Alert */}
        {showStockValidation && (
          <div className="px-2 sm:px-4 py-2 border-b border-gray-200 dark:border-dark-700">
            <StockValidationAlert
              errors={stockValidationErrors}
              warnings={stockValidationWarnings}
              onClose={() => setShowStockValidation(false)}
              className="text-xs"
            />
          </div>
        )}

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
              {(cart as any[]).map((item: any) => {
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
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={(e) => {
                            const raw = e.target.value;
                            // Allow empty input temporarily; don't update store until blur/enter
                            if (raw === '') return;
                            const parsed = Math.floor(Number(raw));
                            if (Number.isNaN(parsed)) return;
                            const clamped = Math.max(1, Math.min(parsed, item.product.stock));
                            if (clamped !== item.quantity) {
                              handleQuantityChange(item.product.id, clamped);
                            }
                          }}
                          onBlur={(e) => {
                            const raw = e.target.value;
                            const parsed = Math.floor(Number(raw));
                            const fallback = Math.max(1, Math.min(Number.isNaN(parsed) ? item.quantity : parsed, item.product.stock));
                            if (fallback !== item.quantity) {
                              handleQuantityChange(item.product.id, fallback);
                            } else {
                              // force input to reflect clamped value
                              e.currentTarget.value = String(item.quantity);
                            }
                          }}
                          className="w-12 text-center text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
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