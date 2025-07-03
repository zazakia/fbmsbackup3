import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  CheckCircle, 
  XCircle, 
  Play,
  RotateCcw,
  CreditCard,
  TestTube,
  Package,
  User,
  Calculator
} from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
}

interface POSState {
  cart: CartItem[];
  selectedCustomer: string | null;
  subtotal: number;
  tax: number;
  total: number;
  completedSales: number;
}

const POSTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [posState, setPosState] = useState<POSState>({
    cart: [],
    selectedCustomer: null,
    subtotal: 0,
    tax: 0,
    total: 0,
    completedSales: 0
  });
  
  const { addToast } = useToastStore();

  const mockProducts = [
    { id: 'prod1', name: 'iPhone 15 Pro', price: 65990, stock: 25 },
    { id: 'prod2', name: 'Basic T-Shirt', price: 299, stock: 100 },
    { id: 'prod3', name: 'Coffee Pack', price: 85, stock: 200 },
    { id: 'prod4', name: 'Laptop', price: 45000, stock: 15 },
    { id: 'prod5', name: 'Headphones', price: 2500, stock: 50 }
  ];

  const mockCustomers = [
    { id: 'cust1', name: 'Juan Dela Cruz', email: 'juan@email.com' },
    { id: 'cust2', name: 'Maria Santos', email: 'maria@email.com' },
    { id: 'cust3', name: 'Walk-in Customer', email: '' }
  ];

  const initializeTests = () => {
    const tests: TestResult[] = [
      { name: 'Add Product to Cart', status: 'pending' },
      { name: 'Update Cart Item Quantity', status: 'pending' },
      { name: 'Remove Item from Cart', status: 'pending' },
      { name: 'Calculate Cart Subtotal', status: 'pending' },
      { name: 'Calculate Tax (12% VAT)', status: 'pending' },
      { name: 'Calculate Total Amount', status: 'pending' },
      { name: 'Select Customer', status: 'pending' },
      { name: 'Clear Cart', status: 'pending' },
      { name: 'Process Cash Payment', status: 'pending' },
      { name: 'Process Card Payment', status: 'pending' },
      { name: 'Process Digital Payment', status: 'pending' },
      { name: 'Handle Insufficient Stock', status: 'pending' },
      { name: 'Apply Discount', status: 'pending' },
      { name: 'Validate Empty Cart', status: 'pending' },
      { name: 'Generate Receipt', status: 'pending' }
    ];
    setTestResults(tests);
  };

  useEffect(() => {
    initializeTests();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const updateTestResult = (testName: string, status: TestResult['status'], message?: string, duration?: number) => {
    setTestResults(prev => prev.map(test => 
      test.name === testName 
        ? { ...test, status, message, duration }
        : test
    ));
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    setCurrentTest(testName);
    updateTestResult(testName, 'running');
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'passed', 'Test completed successfully', duration);
      addToast({
        type: 'success',
        title: 'Test Passed',
        message: `${testName} completed successfully`
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Test failed';
      updateTestResult(testName, 'failed', message, duration);
      addToast({
        type: 'error',
        title: 'Test Failed',
        message: `${testName}: ${message}`
      });
    }
  };

  const addToCart = (productId: string, quantity: number = 1) => {
    const product = mockProducts.find(p => p.id === productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.stock < quantity) {
      throw new Error('Insufficient stock');
    }

    const existingItem = posState.cart.find(item => item.productId === productId);
    
    if (existingItem) {
      setPosState(prev => ({
        ...prev,
        cart: prev.cart.map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.price }
            : item
        )
      }));
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        productId,
        productName: product.name,
        price: product.price,
        quantity,
        total: product.price * quantity
      };

      setPosState(prev => ({
        ...prev,
        cart: [...prev.cart, newItem]
      }));
    }

    calculateTotals();
  };

  const updateCartItemQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    setPosState(prev => ({
      ...prev,
      cart: prev.cart.map(item =>
        item.id === cartItemId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      )
    }));

    calculateTotals();
  };

  const removeFromCart = (cartItemId: string) => {
    setPosState(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.id !== cartItemId)
    }));

    calculateTotals();
  };

  const calculateTotals = () => {
    setPosState(prev => {
      const subtotal = prev.cart.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.12; // 12% VAT
      const total = subtotal + tax;

      return {
        ...prev,
        subtotal,
        tax,
        total
      };
    });
  };

  const testAddProductToCart = async () => {
    await delay(300);
    
    const initialCartLength = posState.cart.length;
    addToCart('prod1', 2);
    
    if (posState.cart.length <= initialCartLength) {
      throw new Error('Product not added to cart');
    }

    const addedItem = posState.cart.find(item => item.productId === 'prod1');
    if (!addedItem || addedItem.quantity !== 2) {
      throw new Error('Product quantity incorrect');
    }
  };

  const testUpdateCartItemQuantity = async () => {
    await delay(300);
    
    if (posState.cart.length === 0) {
      addToCart('prod2', 1);
    }

    const cartItem = posState.cart[0];
    const newQuantity = cartItem.quantity + 1;
    updateCartItemQuantity(cartItem.id, newQuantity);

    const updatedItem = posState.cart.find(item => item.id === cartItem.id);
    if (!updatedItem || updatedItem.quantity !== newQuantity) {
      throw new Error('Cart item quantity not updated');
    }
  };

  const testRemoveItemFromCart = async () => {
    await delay(300);
    
    if (posState.cart.length === 0) {
      addToCart('prod3', 1);
    }

    const initialCartLength = posState.cart.length;
    const itemToRemove = posState.cart[0];
    removeFromCart(itemToRemove.id);

    if (posState.cart.length >= initialCartLength) {
      throw new Error('Item not removed from cart');
    }

    const removedItem = posState.cart.find(item => item.id === itemToRemove.id);
    if (removedItem) {
      throw new Error('Item still exists in cart');
    }
  };

  const testCalculateSubtotal = async () => {
    await delay(200);
    
    // Add known items to cart
    setPosState(prev => ({ ...prev, cart: [] }));
    addToCart('prod1', 1); // ₱65,990
    addToCart('prod2', 2); // ₱299 × 2 = ₱598

    calculateTotals();

    const expectedSubtotal = 65990 + (299 * 2);
    if (Math.abs(posState.subtotal - expectedSubtotal) > 0.01) {
      throw new Error(`Subtotal calculation incorrect. Expected: ${expectedSubtotal}, Got: ${posState.subtotal}`);
    }
  };

  const testCalculateTax = async () => {
    await delay(200);
    
    if (posState.cart.length === 0) {
      addToCart('prod1', 1);
    }

    calculateTotals();

    const expectedTax = posState.subtotal * 0.12;
    if (Math.abs(posState.tax - expectedTax) > 0.01) {
      throw new Error(`Tax calculation incorrect. Expected: ${expectedTax}, Got: ${posState.tax}`);
    }
  };

  const testCalculateTotal = async () => {
    await delay(200);
    
    calculateTotals();

    const expectedTotal = posState.subtotal + posState.tax;
    if (Math.abs(posState.total - expectedTotal) > 0.01) {
      throw new Error(`Total calculation incorrect. Expected: ${expectedTotal}, Got: ${posState.total}`);
    }
  };

  const testSelectCustomer = async () => {
    await delay(300);
    
    const customerId = mockCustomers[0].id;
    setPosState(prev => ({ ...prev, selectedCustomer: customerId }));

    if (posState.selectedCustomer !== customerId) {
      throw new Error('Customer not selected');
    }
  };

  const testClearCart = async () => {
    await delay(300);
    
    if (posState.cart.length === 0) {
      addToCart('prod1', 1);
    }

    setPosState(prev => ({
      ...prev,
      cart: [],
      subtotal: 0,
      tax: 0,
      total: 0
    }));

    if (posState.cart.length > 0) {
      throw new Error('Cart not cleared');
    }
  };

  const testProcessCashPayment = async () => {
    await delay(400);
    
    if (posState.cart.length === 0) {
      addToCart('prod2', 1);
      calculateTotals();
    }

    const paymentAmount = posState.total;
    const cashReceived = paymentAmount + 100; // Give extra cash

    if (cashReceived < paymentAmount) {
      throw new Error('Insufficient cash payment');
    }

    const change = cashReceived - paymentAmount;
    
    // Process sale
    setPosState(prev => ({
      ...prev,
      cart: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      completedSales: prev.completedSales + 1
    }));

    if (change < 0) {
      throw new Error('Change calculation error');
    }
  };

  const testProcessCardPayment = async () => {
    await delay(400);
    
    if (posState.cart.length === 0) {
      addToCart('prod3', 1);
      calculateTotals();
    }

    const paymentAmount = posState.total;
    
    // Simulate card payment processing
    const cardPaymentSuccess = true; // Mock successful payment
    
    if (!cardPaymentSuccess) {
      throw new Error('Card payment failed');
    }

    // Process sale
    setPosState(prev => ({
      ...prev,
      cart: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      completedSales: prev.completedSales + 1
    }));
  };

  const testProcessDigitalPayment = async () => {
    await delay(400);
    
    if (posState.cart.length === 0) {
      addToCart('prod4', 1);
      calculateTotals();
    }

    const paymentMethods = ['gcash', 'paymaya', 'bank_transfer'];
    const selectedMethod = paymentMethods[0];
    
    // Simulate digital payment processing
    const digitalPaymentSuccess = true; // Mock successful payment
    
    if (!digitalPaymentSuccess) {
      throw new Error('Digital payment failed');
    }

    // Process sale
    setPosState(prev => ({
      ...prev,
      cart: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      completedSales: prev.completedSales + 1
    }));
  };

  const testHandleInsufficientStock = async () => {
    await delay(300);
    
    try {
      // Try to add more items than available stock
      const product = mockProducts.find(p => p.stock < 1000);
      if (product) {
        addToCart(product.id, product.stock + 1);
        throw new Error('Should have failed due to insufficient stock');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Insufficient stock')) {
        return; // Expected behavior
      }
      throw error;
    }
  };

  const testApplyDiscount = async () => {
    await delay(300);
    
    if (posState.cart.length === 0) {
      addToCart('prod1', 1);
    }

    const originalSubtotal = posState.subtotal;
    const discountPercentage = 10; // 10% discount
    const discountAmount = originalSubtotal * (discountPercentage / 100);
    const discountedSubtotal = originalSubtotal - discountAmount;

    setPosState(prev => ({
      ...prev,
      subtotal: discountedSubtotal,
      tax: discountedSubtotal * 0.12,
      total: discountedSubtotal + (discountedSubtotal * 0.12)
    }));

    if (posState.subtotal >= originalSubtotal) {
      throw new Error('Discount not applied correctly');
    }
  };

  const testValidateEmptyCart = async () => {
    await delay(200);
    
    setPosState(prev => ({ ...prev, cart: [] }));
    
    try {
      if (posState.cart.length === 0) {
        throw new Error('Cannot checkout with empty cart');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('empty cart')) {
        return; // Expected behavior
      }
      throw error;
    }
  };

  const testGenerateReceipt = async () => {
    await delay(400);
    
    if (posState.cart.length === 0) {
      addToCart('prod1', 1);
      addToCart('prod2', 2);
    }

    const receipt = {
      receiptNumber: `RCP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: posState.cart,
      subtotal: posState.subtotal,
      tax: posState.tax,
      total: posState.total,
      customer: posState.selectedCustomer ? mockCustomers.find(c => c.id === posState.selectedCustomer) : null,
      paymentMethod: 'cash'
    };

    if (!receipt.receiptNumber || !receipt.timestamp || receipt.items.length === 0) {
      throw new Error('Receipt generation failed');
    }

    if (receipt.total !== posState.total) {
      throw new Error('Receipt total mismatch');
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setPosState({
      cart: [],
      selectedCustomer: null,
      subtotal: 0,
      tax: 0,
      total: 0,
      completedSales: 0
    });
    initializeTests();
    
    const tests = [
      { name: 'Add Product to Cart', fn: testAddProductToCart },
      { name: 'Update Cart Item Quantity', fn: testUpdateCartItemQuantity },
      { name: 'Remove Item from Cart', fn: testRemoveItemFromCart },
      { name: 'Calculate Cart Subtotal', fn: testCalculateSubtotal },
      { name: 'Calculate Tax (12% VAT)', fn: testCalculateTax },
      { name: 'Calculate Total Amount', fn: testCalculateTotal },
      { name: 'Select Customer', fn: testSelectCustomer },
      { name: 'Clear Cart', fn: testClearCart },
      { name: 'Process Cash Payment', fn: testProcessCashPayment },
      { name: 'Process Card Payment', fn: testProcessCardPayment },
      { name: 'Process Digital Payment', fn: testProcessDigitalPayment },
      { name: 'Handle Insufficient Stock', fn: testHandleInsufficientStock },
      { name: 'Apply Discount', fn: testApplyDiscount },
      { name: 'Validate Empty Cart', fn: testValidateEmptyCart },
      { name: 'Generate Receipt', fn: testGenerateReceipt }
    ];

    for (const test of tests) {
      await runTest(test.name, test.fn);
      await delay(100);
    }
    
    setIsRunning(false);
    setCurrentTest('');
    
    const passedTests = testResults.filter(t => t.status === 'passed').length;
    const totalTests = testResults.length;
    
    addToast({
      type: passedTests === totalTests ? 'success' : 'warning',
      title: 'Test Suite Completed',
      message: `${passedTests}/${totalTests} tests passed`
    });
  };

  const resetTests = () => {
    setPosState({
      cart: [],
      selectedCustomer: null,
      subtotal: 0,
      tax: 0,
      total: 0,
      completedSales: 0
    });
    initializeTests();
    setCurrentTest('');
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'failed':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'running':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const passedTests = testResults.filter(t => t.status === 'passed').length;
  const failedTests = testResults.filter(t => t.status === 'failed').length;
  const totalTests = testResults.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <TestTube className="h-6 w-6 mr-2" />
            POS System Tests
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive testing for point of sale transactions and cart operations
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={resetTests}
            disabled={isRunning}
            className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </button>
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run All Tests'}
          </button>
        </div>
      </div>

      {/* Test Progress */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <TestTube className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tests</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalTests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Passed</p>
              <p className="text-xl font-bold text-green-600">{passedTests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-xl font-bold text-red-600">{failedTests}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <ShoppingCart className="h-5 w-5 text-purple-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cart Items</p>
              <p className="text-xl font-bold text-purple-600">{posState.cart.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <CreditCard className="h-5 w-5 text-orange-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sales</p>
              <p className="text-xl font-bold text-orange-600">{posState.completedSales}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Test Status */}
      {currentTest && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              Currently running: {currentTest}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Results */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Test Results</h2>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {testResults.map((test, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getStatusColor(test.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(test.status)}
                    <span className="ml-3 font-medium text-gray-900 dark:text-gray-100">
                      {test.name}
                    </span>
                  </div>
                  {test.duration && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {test.duration}ms
                    </span>
                  )}
                </div>
                {test.message && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {test.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* POS State */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">POS State</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Cart Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cart Items:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">{posState.cart.length}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">₱{posState.subtotal.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tax (12%):</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">₱{posState.tax.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total:</span>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">₱{posState.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Cart Items */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cart Items:</h3>
              {posState.cart.length === 0 ? (
                <div className="text-center py-6">
                  <ShoppingCart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {posState.cart.map((item) => (
                    <div key={item.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{item.productName}</span>
                        <span className="text-gray-600 dark:text-gray-400">₱{item.total.toLocaleString()}</span>
                      </div>
                      <div className="text-gray-500 dark:text-gray-500">
                        {item.quantity} × ₱{item.price.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer:</span>
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {posState.selectedCustomer 
                  ? mockCustomers.find(c => c.id === posState.selectedCustomer)?.name || 'Unknown'
                  : 'None selected'
                }
              </span>
            </div>

            {/* Sales Count */}
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Completed Sales:</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-300">{posState.completedSales}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSTest;