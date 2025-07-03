import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  User, 
  CreditCard, 
  Calculator, 
  Receipt,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  Package
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { Product, Customer, PaymentMethod, CartItem } from '../../types/business';
import { formatCurrency } from '../../utils/formatters';
import { hasPermission } from '../../utils/permissions';
import CustomerSelector from './CustomerSelector';

interface CashierTransaction {
  id: string;
  items: CartItem[];
  customer?: Customer;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  timestamp: Date;
}

const CashierPOS: React.FC = () => {
  const { user } = useAuthStore();
  const { products, customers, addSale } = useBusinessStore();
  const { addToast } = useToastStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.12; // 12% VAT
  const total = subtotal + tax;
  const change = amountPaid - total;

  // Check permissions
  if (!hasPermission(user?.role || 'cashier', 'pos', 'view')) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600">You don't have permission to access the POS system.</p>
      </div>
    );
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        price: product.sellingPrice,
        quantity: 1,
        sku: product.sku
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
    } else {
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setAmountPaid(0);
    setShowPayment(false);
  };

  const processPayment = async () => {
    if (!hasPermission(user?.role || 'cashier', 'pos', 'create')) {
      addToast('You don\'t have permission to process sales', 'error');
      return;
    }

    if (cart.length === 0) {
      addToast('Cart is empty', 'error');
      return;
    }

    if (paymentMethod === 'cash' && amountPaid < total) {
      addToast('Insufficient payment amount', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const transaction: CashierTransaction = {
        id: `TXN-${Date.now()}`,
        items: cart,
        customer: selectedCustomer || undefined,
        subtotal,
        tax,
        total,
        paymentMethod,
        amountPaid,
        change,
        timestamp: new Date()
      };

      // Add sale to store
      await addSale({
        id: transaction.id,
        customerId: selectedCustomer?.id || '',
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        date: new Date(),
        items: cart,
        subtotal,
        tax,
        total,
        paymentMethod,
        status: 'completed',
        employeeId: user?.id || '',
        employeeName: `${user?.firstName} ${user?.lastName}` || 'Cashier'
      });

      addToast('Sale processed successfully', 'success');
      clearCart();
    } catch (error) {
      addToast('Failed to process sale', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-50">
      <div className="flex" style={{ minHeight: '80vh' }}>
        {/* Product Selection */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Point of Sale</h1>
            <p className="text-gray-600">Select products to add to cart</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => addToCart(product)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-500">{product.sku}</span>
                </div>
                
                <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-blue-600">
                    {formatCurrency(product.sellingPrice)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Stock: {product.stock}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col" style={{ minHeight: '80vh' }}>
          {/* Cart Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Current Sale</h2>
              <ShoppingCart className="h-5 w-5 text-gray-600" />
            </div>
          </div>

          {/* Customer Selection */}
          <div className="p-4 border-b border-gray-200">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Customer</label>
              <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Walk-in Customer'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedCustomer?.email || 'No customer selected'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Change
                </button>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '60vh' }}>
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Cart is empty</p>
                <p className="text-sm text-gray-400">Add products to start a sale</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.productId} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.sku}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(item.price)} each
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 p-4">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT (12%)</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {!showPayment ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Proceed to Payment</span>
                  </button>
                  <button
                    onClick={clearCart}
                    className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                  >
                    Clear Cart
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="gcash">GCash</option>
                      <option value="paymaya">PayMaya</option>
                    </select>
                  </div>

                  {/* Amount Paid */}
                  {paymentMethod === 'cash' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount Paid
                      </label>
                      <input
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter amount"
                      />
                      {amountPaid >= total && (
                        <p className="text-sm text-green-600 mt-1">
                          Change: {formatCurrency(change)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Payment Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={processPayment}
                      disabled={isProcessing || (paymentMethod === 'cash' && amountPaid < total)}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Complete Sale</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowPayment(false)}
                      className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                    >
                      Back to Cart
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <CustomerSelector
          customers={customers}
          selectedCustomer={selectedCustomer}
          onCustomerSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerModal(false);
          }}
          showModal={true}
          onClose={() => setShowCustomerModal(false)}
        />
      )}
    </div>
  );
};

export default CashierPOS;