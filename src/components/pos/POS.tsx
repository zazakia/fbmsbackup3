import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Package,
  Plus,
  Minus,
  X,
  ChevronDown,
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { Product, Customer, CartItem } from '../../types/business';
import { formatCurrency } from '../../utils/formatters';
import { validateSaleData, sanitizeSaleData, getCurrentCashierId } from '../../utils/salesHelpers';

interface POSProps {
  onBack: () => void;
}

interface CustomerDetails {
  name: string;
  number: string;
  address: string;
  notes: string;
}

type POSScreenType = 'pos' | 'receipt' | 'payment';
type PaymentOptionType = 'pay-later' | 'multi-payment';

const POS: React.FC<POSProps> = ({ onBack }) => {
  // State management - following TinderaWebPedlerV0 pattern
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [posScreen, setPosScreen] = useState<POSScreenType>('pos');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    number: '',
    address: '',
    notes: '',
  });
  const [paymentOption, setPaymentOption] = useState<PaymentOptionType>('pay-later');
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Store integration
  const {
    products,
    categories,
    createSale,
    fetchProducts,
  } = useBusinessStore();

  // Cart management functions
  const updateQuantity = (productId: string, change: number) => {
    setCart((prev) => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + change);
      return { ...prev, [productId]: newQty };
    });
  };

  const addToCart = (productId: string) => {
    updateQuantity(productId, 1);
  };

  const removeFromCart = (productId: string) => {
    updateQuantity(productId, -1);
  };

  const removeItemFromCart = (productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: 0 }));
  };

  // Calculate totals
  const totalAmount = products.reduce((sum: number, product: Product) => {
    const quantity = cart[product.id] || 0;
    return sum + product.price * quantity;
  }, 0);

  const totalQuantity = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const totalItems = Object.values(cart).filter((qty) => qty > 0).length;

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Get cart items for transaction
  const getCartItems = () => {
    return products
      .filter((product: Product) => cart[product.id] > 0)
      .map((product: Product) => ({
        product_id: product.id,
        product_name: product.name,
        quantity: cart[product.id],
        unit_name: product.unit || 'piece',
        unit_price: product.price,
        subtotal: product.price * cart[product.id],
      }));
  };

  // Handle transaction processing
  const handleTransaction = async (paymentMethod: 'cash' | 'credit') => {
    if (totalItems === 0) {
      alert('Cart is empty. Please add items before processing payment.');
      return;
    }

    setIsProcessing(true);

    try {
      const cartItems = getCartItems();
      
      // Create transaction using fbmsbackup3's store with proper validation
      const transactionData = {
        items: cartItems.map(item => ({
          id: `item-${Date.now()}-${Math.random()}`,
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          price: item.unit_price,
          total: item.subtotal
        })),
        subtotal: totalAmount,
        tax: 0,
        discount: 0,
        total: totalAmount,
        paymentMethod,
        paymentStatus: 'paid',
        status: 'completed',
        cashierId: await getCurrentCashierId(), // Ensure cashier ID is set
        invoiceNumber: `INV-${Date.now()}`,
        notes: showCustomerDetails ? `Customer: ${customerDetails.name}` : undefined,
      };

      // Validate the sale data before submission
      const validation = validateSaleData(transactionData);
      if (!validation.isValid) {
        alert(`Transaction validation failed:\n${validation.errors.join('\n')}`);
        return;
      }

      // Sanitize the data
      const sanitizedData = await sanitizeSaleData(transactionData);
      
      await createSale(sanitizedData);

      // Clear cart after successful transaction
      setCart({});
      
      // Reset customer details
      setCustomerDetails({ name: '', number: '', address: '', notes: '' });
      setShowCustomerDetails(false);

      // Show success message
      alert(`Transaction completed successfully! ${paymentMethod === 'credit' ? 'Credit payment recorded.' : 'Cash payment processed.'}`);

      // Go to receipt view
      setPosScreen('receipt');
    } catch (error) {
      console.error('Transaction error:', error);
      alert(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Payment Screen Component
  if (posScreen === 'payment') {
    return (
      <div className="min-h-screen bg-gray-50 max-w-sm mx-auto">
        {/* Header */}
        <div className="bg-white px-4 py-4 border-b">
          <div className="flex items-center">
            <button 
              className="p-2 hover:bg-gray-100 rounded" 
              onClick={() => setPosScreen('pos')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Amount Payable Section */}
        <div className="text-center py-12 px-4 bg-white">
          <h1 className="text-xl font-bold text-gray-800 mb-6 tracking-wide">AMOUNT PAYABLE</h1>
          <div className="text-7xl font-bold text-pink-500 mb-4">
            ₱{formatCurrency(totalAmount)}
          </div>
        </div>

        {/* Payment Options */}
        <div className="px-6 py-8">
          <p className="text-center text-gray-400 mb-8 text-lg">Choose payment option</p>
          
          {/* Toggle Buttons */}
          <div className="flex gap-4 mb-12">
            <button 
              onClick={() => setPaymentOption('pay-later')}
              className={`flex-1 py-4 rounded-full font-medium text-lg transition-all ${
                paymentOption === 'pay-later' 
                  ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-lg' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              PAY LATER
            </button>
            <button 
              onClick={() => setPaymentOption('multi-payment')}
              className={`flex-1 py-4 rounded-full font-medium text-lg transition-all ${
                paymentOption === 'multi-payment' 
                  ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-lg' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              MULTI PAYMENT
            </button>
          </div>

          {/* Payment Method Buttons */}
          <div className="space-y-6">
            <button 
              onClick={() => handleTransaction('cash')}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-8 text-2xl font-bold rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
            >
              {isProcessing ? 'Processing...' : 'Cash'}
            </button>
            <button 
              onClick={() => handleTransaction('credit')}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-8 text-2xl font-bold rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
            >
              <div className="text-center">
                <div className="text-2xl">{isProcessing ? 'Processing...' : 'Credit'}</div>
                {!isProcessing && <div className="text-lg opacity-90 font-medium">UTANG</div>}
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Receipt Screen Component
  if (posScreen === 'receipt') {
    const cartItems = getCartItems();
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = currentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return (
      <div className="min-h-screen bg-gray-100 max-w-sm mx-auto">
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ArrowLeft className="w-6 h-6 cursor-pointer" onClick={() => setPosScreen('pos')} />
            <div>
              <h1 className="text-lg font-semibold">FBMS Business</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Receipt No.</p>
            <p className="text-lg font-semibold">{Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}</p>
          </div>
        </div>

        {/* Receipt Items */}
        <div className="bg-white mx-4 mt-4 rounded-lg overflow-hidden">
          {cartItems.map((item) => (
            <div key={item.product_id} className="flex items-center bg-gray-200 border-b border-gray-300 last:border-b-0">
              <div className="flex-1 p-3">
                <h3 className="font-medium text-sm">{item.product_name}</h3>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => updateQuantity(item.product_id, -1)}
                  className="w-8 h-8 bg-purple-600 text-white flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const newQty = parseFloat(e.target.value) || 0;
                    if (newQty >= 0) {
                      setCart(prev => ({
                        ...prev,
                        [item.product_id]: newQty
                      }));
                    }
                  }}
                  className="w-12 bg-white text-center py-2 text-sm font-semibold border-0 outline-none"
                  min="0"
                  step="0.1"
                />
                <button
                  onClick={() => updateQuantity(item.product_id, 1)}
                  className="w-8 h-8 bg-purple-600 text-white flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="w-16 text-center text-sm font-semibold py-2">{formatCurrency(item.unit_price)}</div>
              <div className="w-16 text-center text-sm font-semibold py-2">{formatCurrency(item.subtotal)}</div>
              <button
                onClick={() => removeItemFromCart(item.product_id)}
                className="w-8 h-8 bg-red-500 text-white flex items-center justify-center mr-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Date and Total */}
        <div className="px-4 mt-6">
          <p className="text-sm text-gray-600 mb-4">
            {formattedDate} | {formattedTime}
          </p>
          <div className="flex justify-between items-center border-t border-b border-gray-300 py-3">
            <span className="text-lg font-semibold">GRAND TOTAL:</span>
            <span className="text-xl font-bold">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Customer Details */}
        <div className="px-4 mt-6">
          <button
            onClick={() => setShowCustomerDetails(!showCustomerDetails)}
            className="w-full bg-purple-600 text-white p-4 rounded-lg flex items-center justify-between"
          >
            <span className="font-semibold">Customer's Details and Notes</span>
            <ChevronDown className={`w-5 h-5 transition-transform ${showCustomerDetails ? "rotate-180" : ""}`} />
          </button>

          {showCustomerDetails && (
            <div className="mt-4 space-y-4">
              <input
                placeholder="Customer's name"
                value={customerDetails.name}
                onChange={(e) => setCustomerDetails((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              />
              <input
                placeholder="Customer's number"
                value={customerDetails.number}
                onChange={(e) => setCustomerDetails((prev) => ({ ...prev, number: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              />
              <input
                placeholder="Customer's address"
                value={customerDetails.address}
                onChange={(e) => setCustomerDetails((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              />
              <textarea
                placeholder="Notes"
                value={customerDetails.notes}
                onChange={(e) => setCustomerDetails((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white resize-none h-24"
              />
            </div>
          )}
        </div>

        {/* Confirm Button */}
        <div className="px-4 mt-6 pb-6">
          <button 
            onClick={() => setPosScreen('payment')}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-4 text-lg font-semibold rounded-lg"
          >
            CONFIRM
          </button>
        </div>
      </div>
    );
  }

  // Main POS Screen
  return (
    <div className="min-h-screen bg-gray-100 max-w-sm mx-auto relative">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ArrowLeft className="w-6 h-6 cursor-pointer" onClick={onBack} />
          <h1 className="text-xl font-semibold">POS</h1>
        </div>
        <div className="flex gap-2">
          <button className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-4 py-2 text-sm">
            Product Filter
          </button>
          <button className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-4 py-2 text-sm">
            Product View
          </button>
          <div className="bg-pink-500 text-white rounded-full w-10 h-10 flex items-center justify-center">
            <span className="text-sm font-semibold">{totalItems}</span>
          </div>
        </div>
      </div>

      <div className="flex pb-32">
        {/* Sidebar */}
        <div className="w-32 bg-white">
          <div
            onClick={() => setActiveCategory('All')}
            className={`px-3 py-4 text-sm border-b cursor-pointer ${
              activeCategory === 'All' ? 'bg-pink-500 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            All
          </div>
          {categories.map((category: any) => (
            <div
              key={category.id}
              onClick={() => setActiveCategory(category.name)}
              className={`px-3 py-4 text-sm border-b cursor-pointer ${
                activeCategory === category.name ? 'bg-pink-500 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {category.name}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Product List */}
          <div className="space-y-1 p-2">
            {filteredProducts.map((product: Product) => {
              const quantity = cart[product.id] || 0;
              return (
                <div key={product.id} className="flex">
                  <div
                    className="flex-1 bg-slate-800 text-white rounded-l-lg p-2 flex items-center gap-2 cursor-pointer hover:bg-slate-700"
                    onClick={() => addToCart(product.id)}
                  >
                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                      <Package className="w-6 h-6 text-slate-800" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-xs">{product.name}</h3>
                      <p className="text-[10px] text-gray-300">{product.stock} Pcs (Stocks)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">₱ {formatCurrency(product.price)}</p>
                    </div>
                  </div>
                  <div className="w-12 bg-green-500 text-white rounded-r-lg flex flex-col items-center justify-center relative py-1">
                    {quantity > 0 && (
                      <>
                        <button
                          onClick={() => updateQuantity(product.id, 0.5)}
                          className="absolute top-0.5 right-0.5 w-3 h-3 bg-green-600 rounded-full flex items-center justify-center text-[8px] hover:bg-green-700"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-600 rounded-full flex items-center justify-center text-[8px] hover:bg-green-700"
                        >
                          -
                        </button>
                      </>
                    )}
                    <span className="text-sm font-bold">{quantity.toFixed(2)}</span>
                    <span className="text-[8px]">QTY</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No More Items */}
          <div className="mt-4 mx-2 mb-4">
            <div className="bg-gray-600 text-white text-center py-3 rounded">No more items to show</div>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="fixed bottom-44 left-0 right-0 mx-auto w-full max-w-sm px-2 z-10">
        <div
          className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-4 text-white shadow-lg cursor-pointer hover:opacity-90"
          onClick={() => setPosScreen('receipt')}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">REVIEW</span>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-xs opacity-80">TOTAL AMOUNT</p>
                <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs opacity-80">PRODUCT QTY</p>
                <p className="text-lg font-bold">{totalQuantity.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-sm bg-pink-500 p-4 z-20">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            placeholder="Search product"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-3 rounded-full bg-white"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <ShoppingCart className="w-5 h-5 text-pink-500" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <div className="flex-1 text-center cursor-pointer hover:opacity-80">
            <div className="bg-white rounded-lg p-3 mb-2">
              <ShoppingCart className="w-8 h-8 text-pink-500 mx-auto" />
            </div>
            <p className="text-white text-xs font-medium">SCAN PRODUCT</p>
          </div>
          <div className="flex-1 text-center cursor-pointer hover:opacity-80">
            <div className="bg-white rounded-lg p-3 mb-2">
              <Package className="w-8 h-8 text-pink-500 mx-auto" />
            </div>
            <p className="text-white text-xs font-medium">NON-INVENTORY PRODUCT</p>
          </div>
          <div className="flex-1 text-center cursor-pointer hover:opacity-80">
            <div className="bg-white rounded-lg p-3 mb-2">
              <Plus className="w-8 h-8 text-pink-500 mx-auto" />
            </div>
            <p className="text-white text-xs font-medium">ADD PRODUCT</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;