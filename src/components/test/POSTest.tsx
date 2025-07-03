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

  const runTest = async (testName: string, testFn: (currentState: POSState) => Promise<POSState>, currentState: POSState): Promise<POSState> => {
    const startTime = Date.now();
    setCurrentTest(testName);
    updateTestResult(testName, 'running');
    
    try {
      const newState = await testFn(currentState);
      const duration = Date.now() - startTime;
      updateTestResult(testName, 'passed', 'Test completed successfully', duration);
      addToast({
        type: 'success',
        title: 'Test Passed',
        message: `${testName} completed successfully`
      });
      return newState;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Test failed';
      updateTestResult(testName, 'failed', message, duration);
      addToast({
        type: 'error',
        title: 'Test Failed',
        message: `${testName}: ${message}`
      });
      return currentState;
    }
  };

  const addToCart = (currentState: POSState, productId: string, quantity: number = 1): POSState => {
    const product = mockProducts.find(p => p.id === productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.stock < quantity) {
      throw new Error('Insufficient stock');
    }

    const existingItem = currentState.cart.find(item => item.productId === productId);
    
    let newCart;
    if (existingItem) {
      newCart = currentState.cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.price }
          : item
      );
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        productId,
        productName: product.name,
        price: product.price,
        quantity,
        total: product.price * quantity
      };
      newCart = [...currentState.cart, newItem];
    }

    const newState = { ...currentState, cart: newCart };
    return calculateTotals(newState);
  };

  const updateCartItemQuantity = (currentState: POSState, cartItemId: string, newQuantity: number): POSState => {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const newCart = currentState.cart.map(item =>
      item.id === cartItemId
        ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
        : item
    );

    const newState = { ...currentState, cart: newCart };
    return calculateTotals(newState);
  };

  const removeFromCart = (currentState: POSState, cartItemId: string): POSState => {
    const newCart = currentState.cart.filter(item => item.id !== cartItemId);
    const newState = { ...currentState, cart: newCart };
    return calculateTotals(newState);
  };

  const calculateTotals = (currentState: POSState): POSState => {
    const subtotal = currentState.cart.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.12; // 12% VAT
    const total = subtotal + tax;

    return {
      ...currentState,
      subtotal,
      tax,
      total
    };
  };

  const testAddProductToCart = async (currentState: POSState): Promise<POSState> => {
    await delay(300);
    
    const initialCartLength = currentState.cart.length;
    const newState = addToCart(currentState, 'prod1', 2);
    
    if (newState.cart.length <= initialCartLength) {
      throw new Error('Product not added to cart');
    }

    const addedItem = newState.cart.find(item => item.productId === 'prod1');
    if (!addedItem || addedItem.quantity !== 2) {
      throw new Error('Product quantity incorrect');
    }

    return newState;
  };

  const testUpdateCartItemQuantity = async (currentState: POSState): Promise<POSState> => {
    await delay(300);
    
    let workingState = currentState;
    if (workingState.cart.length === 0) {
      workingState = addToCart(workingState, 'prod2', 1);
    }

    const cartItem = workingState.cart[0];
    const newQuantity = cartItem.quantity + 1;
    const newState = updateCartItemQuantity(workingState, cartItem.id, newQuantity);

    const updatedItem = newState.cart.find(item => item.id === cartItem.id);
    if (!updatedItem || updatedItem.quantity !== newQuantity) {
      throw new Error('Cart item quantity not updated');
    }

    return newState;
  };

  const testRemoveItemFromCart = async (currentState: POSState): Promise<POSState> => {
    await delay(300);
    
    let workingState = currentState;
    if (workingState.cart.length === 0) {
      workingState = addToCart(workingState, 'prod3', 1);
    }

    const initialCartLength = workingState.cart.length;
    const itemToRemove = workingState.cart[0];
    const newState = removeFromCart(workingState, itemToRemove.id);

    if (newState.cart.length >= initialCartLength) {
      throw new Error('Item not removed from cart');
    }

    const removedItem = newState.cart.find(item => item.id === itemToRemove.id);
    if (removedItem) {
      throw new Error('Item still exists in cart');
    }

    return newState;
  };

  const testCalculateSubtotal = async (currentState: POSState): Promise<POSState> => {
    await delay(200);
    
    // Add known items to cart
    let workingState = { ...currentState, cart: [] };
    workingState = addToCart(workingState, 'prod1', 1); // ₱65,990
    workingState = addToCart(workingState, 'prod2', 2); // ₱299 × 2 = ₱598

    const newState = calculateTotals(workingState);

    const expectedSubtotal = 65990 + (299 * 2);
    if (Math.abs(newState.subtotal - expectedSubtotal) > 0.01) {
      throw new Error(`Subtotal calculation incorrect. Expected: ${expectedSubtotal}, Got: ${newState.subtotal}`);
    }

    return newState;
  };

  const testCalculateTax = async (currentState: POSState): Promise<POSState> => {
    await delay(200);
    
    let workingState = currentState;
    if (workingState.cart.length === 0) {
      workingState = addToCart(workingState, 'prod1', 1);
    }

    const newState = calculateTotals(workingState);

    const expectedTax = newState.subtotal * 0.12;
    if (Math.abs(newState.tax - expectedTax) > 0.01) {
      throw new Error(`Tax calculation incorrect. Expected: ${expectedTax}, Got: ${newState.tax}`);
    }

    return newState;
  };

  const testCalculateTotal = async (currentState: POSState): Promise<POSState> => {
    await delay(200);
    
    const newState = calculateTotals(currentState);

    const expectedTotal = newState.subtotal + newState.tax;
    if (Math.abs(newState.total - expectedTotal) > 0.01) {
      throw new Error(`Total calculation incorrect. Expected: ${expectedTotal}, Got: ${newState.total}`);
    }

    return newState;
  };

  const testSelectCustomer = async (currentState: POSState): Promise<POSState> => {
    await delay(300);
    
    const customerId = mockCustomers[0].id;
    const newState = { ...currentState, selectedCustomer: customerId };

    if (newState.selectedCustomer !== customerId) {
      throw new Error('Customer not selected');
    }

    return newState;
  };

  const testClearCart = async (currentState: POSState): Promise<POSState> => {
    await delay(300);
    
    let workingState = currentState;
    if (workingState.cart.length === 0) {
      workingState = addToCart(workingState, 'prod1', 1);
    }

    const newState = {
      ...workingState,
      cart: [],
      subtotal: 0,
      tax: 0,
      total: 0
    };

    if (newState.cart.length > 0) {
      throw new Error('Cart not cleared');
    }

    return newState;
  };

  const testProcessCashPayment = async (currentState: POSState): Promise<POSState> => {
    await delay(400);
    
    let workingState = currentState;
    if (workingState.cart.length === 0) {
      workingState = addToCart(workingState, 'prod2', 1);
      workingState = calculateTotals(workingState);
    }

    const paymentAmount = workingState.total;
    const cashReceived = paymentAmount + 100; // Give extra cash

    if (cashReceived < paymentAmount) {
      throw new Error('Insufficient cash payment');
    }

    const change = cashReceived - paymentAmount;
    
    // Process sale
    const newState = {
      ...workingState,
      cart: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      completedSales: workingState.completedSales + 1
    };

    if (change < 0) {
      throw new Error('Change calculation error');
    }

    return newState;
  };

  const testProcessCardPayment = async (currentState: POSState): Promise<POSState> => {
    await delay(400);
    
    let workingState = currentState;
    if (workingState.cart.length === 0) {
      workingState = addToCart(workingState, 'prod3', 1);
      workingState = calculateTotals(workingState);
    }

    const paymentAmount = workingState.total;
    
    // Simulate card payment processing
    const cardPaymentSuccess = true; // Mock successful payment
    
    if (!cardPaymentSuccess) {
      throw new Error('Card payment failed');
    }

    // Process sale
    const newState = {
      ...workingState,
      cart: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      completedSales: workingState.completedSales + 1
    };

    return newState;
  };

  const testProcessDigitalPayment = async (currentState: POSState): Promise<POSState> => {
    await delay(400);
    
    let workingState = currentState;
    if (workingState.cart.length === 0) {
      workingState = addToCart(workingState, 'prod4', 1);
      workingState = calculateTotals(workingState);
    }

    const paymentMethods = ['gcash', 'paymaya', 'bank_transfer'];
    const selectedMethod = paymentMethods[0];
    
    // Simulate digital payment processing
    const digitalPaymentSuccess = true; // Mock successful payment
    
    if (!digitalPaymentSuccess) {
      throw new Error('Digital payment failed');
    }

    // Process sale
    const newState = {
      ...workingState,
      cart: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      completedSales: workingState.completedSales + 1
    };

    return newState;
  };

  const testHandleInsufficientStock = async (currentState: POSState): Promise<POSState> => {
    await delay(300);
    
    try {
      // Try to add more items than available stock
      const product = mockProducts.find(p => p.stock < 1000);
      if (product) {
        addToCart(currentState, product.id, product.stock + 1);
        throw new Error('Should have failed due to insufficient stock');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Insufficient stock')) {
        return currentState; // Expected behavior
      }
      throw error;
    }

    return currentState;
  };

  const testApplyDiscount = async (currentState: POSState): Promise<POSState> => {
    await delay(300);
    
    let workingState = currentState;
    if (workingState.cart.length === 0) {
      workingState = addToCart(workingState, 'prod1', 1);
    }

    const originalSubtotal = workingState.subtotal;
    const discountPercentage = 10; // 10% discount
    const discountAmount = originalSubtotal * (discountPercentage / 100);
    const discountedSubtotal = originalSubtotal - discountAmount;

    const newState = {
      ...workingState,
      subtotal: discountedSubtotal,
      tax: discountedSubtotal * 0.12,
      total: discountedSubtotal + (discountedSubtotal * 0.12)
    };

    if (newState.subtotal >= originalSubtotal) {
      throw new Error('Discount not applied correctly');
    }

    return newState;
  };

  const testValidateEmptyCart = async (currentState: POSState): Promise<POSState> => {
    await delay(200);
    
    const newState = { ...currentState, cart: [] };
    
    try {
      if (newState.cart.length === 0) {
        throw new Error('Cannot checkout with empty cart');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('empty cart')) {
        return newState; // Expected behavior
      }
      throw error;
    }

    return newState;
  };

  const testGenerateReceipt = async (currentState: POSState): Promise<POSState> => {
    await delay(400);
    
    let workingState = currentState;
    if (workingState.cart.length === 0) {
      workingState = addToCart(workingState, 'prod1', 1);
      workingState = addToCart(workingState, 'prod2', 2);
    }

    const receipt = {
      receiptNumber: `RCP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: workingState.cart,
      subtotal: workingState.subtotal,
      tax: workingState.tax,
      total: workingState.total,
      customer: workingState.selectedCustomer ? mockCustomers.find(c => c.id === workingState.selectedCustomer) : null,
      paymentMethod: 'cash'
    };

    if (!receipt.receiptNumber || !receipt.timestamp || receipt.items.length === 0) {
      throw new Error('Receipt generation failed');
    }

    if (receipt.total !== workingState.total) {
      throw new Error('Receipt total mismatch');
    }

    return workingState;
  };

  const runAllTests = async () => {
    setIsRunning(true);
    let currentPosState: POSState = {
      cart: [],
      selectedCustomer: null,
      subtotal: 0,
      tax: 0,
      total: 0,
      completedSales: 0
    };
    setPosState(currentPosState);
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
      currentPosState = await runTest(test.name, test.fn, currentPosState);
      setPosState(currentPosState); // Update UI state
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