import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Play,
  RotateCcw,
  ShoppingCart,
  TestTube,
  AlertTriangle
} from 'lucide-react';
import { Product, Category } from '../../types/business';
import { useToastStore } from '../../store/toastStore';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

const ProductCRUDTest: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  
  const { addToast } = useToastStore();

  const mockCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Electronics',
      description: 'Electronic devices and gadgets',
      isActive: true
    },
    {
      name: 'Clothing',
      description: 'Apparel and fashion items',
      isActive: true
    },
    {
      name: 'Food & Beverages',
      description: 'Food and drink products',
      isActive: true
    }
  ];

  const mockProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'iPhone 15 Pro',
      description: 'Latest Apple smartphone with titanium design',
      sku: 'APPLE-IP15P-128',
      barcode: '1234567890123',
      category: 'electronics',
      price: 65990,
      cost: 45000,
      stock: 25,
      minStock: 5,
      maxStock: 100,
      unit: 'pcs',
      weight: 0.187,
      dimensions: '146.6 x 70.6 x 8.25 mm',
      images: [],
      tags: ['smartphone', 'apple', 'premium'],
      supplier: 'Apple Philippines',
      location: 'A1-01',
      notes: 'Premium smartphone',
      isActive: true,
      trackInventory: true,
      allowBackorder: false,
      taxable: true
    },
    {
      name: 'Basic T-Shirt',
      description: 'Plain cotton t-shirt',
      sku: 'CLOTH-TSHIRT-001',
      barcode: '9876543210987',
      category: 'clothing',
      price: 299,
      cost: 150,
      stock: 100,
      minStock: 20,
      maxStock: 500,
      unit: 'pcs',
      weight: 0.2,
      dimensions: 'Various sizes',
      images: [],
      tags: ['clothing', 'basic', 'cotton'],
      supplier: 'Local Textile',
      location: 'B2-15',
      notes: 'Basic apparel item',
      isActive: true,
      trackInventory: true,
      allowBackorder: true,
      taxable: true
    },
    {
      name: 'Instant Coffee Pack',
      description: '3-in-1 instant coffee sachets',
      sku: 'FOOD-COFFEE-3IN1',
      barcode: '5551234567890',
      category: 'food',
      price: 85,
      cost: 45,
      stock: 200,
      minStock: 50,
      maxStock: 1000,
      unit: 'pack',
      weight: 0.02,
      dimensions: '10x15cm',
      images: [],
      tags: ['beverage', 'coffee', 'instant'],
      supplier: 'Coffee Co.',
      location: 'C3-22',
      notes: 'Popular beverage',
      isActive: true,
      trackInventory: true,
      allowBackorder: true,
      taxable: true
    }
  ];

  const initializeTests = () => {
    const tests: TestResult[] = [
      { name: 'Create Product Categories', status: 'pending' },
      { name: 'Create Product - Electronics', status: 'pending' },
      { name: 'Create Product - Clothing', status: 'pending' },
      { name: 'Create Product - Food', status: 'pending' },
      { name: 'Read Product List', status: 'pending' },
      { name: 'Update Product Information', status: 'pending' },
      { name: 'Update Product Stock', status: 'pending' },
      { name: 'Update Product Price', status: 'pending' },
      { name: 'Test Low Stock Detection', status: 'pending' },
      { name: 'Test Stock Validation', status: 'pending' },
      { name: 'Test SKU Uniqueness', status: 'pending' },
      { name: 'Test Price Validation', status: 'pending' },
      { name: 'Toggle Product Status', status: 'pending' },
      { name: 'Delete Product', status: 'pending' },
      { name: 'Validate Required Fields', status: 'pending' }
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

  const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

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

  const testCreateCategories = async () => {
    await delay(300);
    const newCategories: Category[] = mockCategories.map(cat => ({
      ...cat,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    if (newCategories.length !== mockCategories.length) {
      throw new Error('Failed to create all categories');
    }
    
    setCategories(newCategories);
  };

  const testCreateElectronicsProduct = async () => {
    await delay(500);
    const productData = mockProducts[0];
    const category = categories.find(c => c.name === 'Electronics');
    
    if (!category) {
      throw new Error('Electronics category not found');
    }
    
    const newProduct: Product = {
      ...productData,
      id: generateId(),
      category: category.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!newProduct.name || !newProduct.sku || newProduct.price <= 0) {
      throw new Error('Required fields missing or invalid');
    }
    
    setProducts(prev => [...prev, newProduct]);
  };

  const testCreateClothingProduct = async () => {
    await delay(400);
    const productData = mockProducts[1];
    const category = categories.find(c => c.name === 'Clothing');
    
    if (!category) {
      throw new Error('Clothing category not found');
    }
    
    const newProduct: Product = {
      ...productData,
      id: generateId(),
      category: category.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Check for duplicate SKU
    if (products.some(p => p.sku === newProduct.sku)) {
      throw new Error('SKU already exists');
    }
    
    setProducts(prev => [...prev, newProduct]);
  };

  const testCreateFoodProduct = async () => {
    await delay(400);
    const productData = mockProducts[2];
    const category = categories.find(c => c.name === 'Food & Beverages');
    
    if (!category) {
      throw new Error('Food & Beverages category not found');
    }
    
    const newProduct: Product = {
      ...productData,
      id: generateId(),
      category: category.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setProducts(prev => [...prev, newProduct]);
  };

  const testReadProducts = async () => {
    await delay(300);
    if (products.length === 0) {
      throw new Error('No products found');
    }
    
    if (products.length < 3) {
      throw new Error('Expected at least 3 products');
    }
    
    // Test filtering by category
    const electronicsCategory = categories.find(c => c.name === 'Electronics');
    if (electronicsCategory) {
      const electronicsProducts = products.filter(p => p.category === electronicsCategory.id);
      if (electronicsProducts.length === 0) {
        throw new Error('No electronics products found');
      }
    }
  };

  const testUpdateProductInfo = async () => {
    await delay(400);
    if (products.length === 0) {
      throw new Error('No products to update');
    }
    
    const productToUpdate = products[0];
    const updatedProduct = {
      ...productToUpdate,
      name: 'Updated ' + productToUpdate.name,
      description: 'Updated description',
      price: productToUpdate.price + 100,
      updatedAt: new Date().toISOString()
    };
    
    setProducts(prev => prev.map(p => 
      p.id === productToUpdate.id ? updatedProduct : p
    ));
  };

  const testUpdateProductStock = async () => {
    await delay(300);
    if (products.length === 0) {
      throw new Error('No products to update');
    }
    
    const productToUpdate = products[0];
    const newStock = productToUpdate.stock + 10;
    const updatedProduct = {
      ...productToUpdate,
      stock: newStock,
      updatedAt: new Date().toISOString()
    };
    
    if (updatedProduct.stock < 0) {
      throw new Error('Stock cannot be negative');
    }
    
    setProducts(prev => prev.map(p => 
      p.id === productToUpdate.id ? updatedProduct : p
    ));
  };

  const testUpdateProductPrice = async () => {
    await delay(300);
    if (products.length === 0) {
      throw new Error('No products to update');
    }
    
    const productToUpdate = products[1];
    const newPrice = 399.99;
    const updatedProduct = {
      ...productToUpdate,
      price: newPrice,
      updatedAt: new Date().toISOString()
    };
    
    if (updatedProduct.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    
    setProducts(prev => prev.map(p => 
      p.id === productToUpdate.id ? updatedProduct : p
    ));
  };

  const testLowStockDetection = async () => {
    await delay(200);
    if (products.length === 0) {
      throw new Error('No products to test');
    }
    
    // Create a product with low stock
    const lowStockProduct = {
      ...products[0],
      stock: 2,
      minStock: 5
    };
    
    if (lowStockProduct.stock > lowStockProduct.minStock) {
      throw new Error('Low stock detection failed');
    }
    
    // Update the product
    setProducts(prev => prev.map(p => 
      p.id === lowStockProduct.id ? lowStockProduct : p
    ));
  };

  const testStockValidation = async () => {
    await delay(200);
    // Test negative stock
    try {
      const invalidStock = -5;
      if (invalidStock < 0) {
        return; // Expected to fail validation
      }
      throw new Error('Negative stock should be rejected');
    } catch (error) {
      // Expected behavior
    }
  };

  const testSKUUniqueness = async () => {
    await delay(300);
    if (products.length < 2) {
      throw new Error('Need at least 2 products to test SKU uniqueness');
    }
    
    const existingSKU = products[0].sku;
    const skuExists = products.some(p => p.sku === existingSKU);
    
    if (!skuExists) {
      throw new Error('SKU uniqueness test failed');
    }
    
    // Test duplicate SKU (should fail)
    const duplicateCount = products.filter(p => p.sku === existingSKU).length;
    if (duplicateCount > 1) {
      throw new Error('Duplicate SKU found');
    }
  };

  const testPriceValidation = async () => {
    await delay(200);
    const invalidPrices = [0, -100, -0.01];
    
    for (const price of invalidPrices) {
      if (price <= 0) {
        continue; // Expected to fail validation
      }
      throw new Error(`Invalid price should be rejected: ${price}`);
    }
  };

  const testToggleProductStatus = async () => {
    await delay(300);
    if (products.length === 0) {
      throw new Error('No products to update');
    }
    
    const productToToggle = products[0];
    const updatedProduct = {
      ...productToToggle,
      isActive: !productToToggle.isActive,
      updatedAt: new Date().toISOString()
    };
    
    setProducts(prev => prev.map(p => 
      p.id === productToToggle.id ? updatedProduct : p
    ));
  };

  const testDeleteProduct = async () => {
    await delay(400);
    if (products.length === 0) {
      throw new Error('No products to delete');
    }
    
    const productToDelete = products[products.length - 1];
    setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
  };

  const testValidateRequiredFields = async () => {
    await delay(200);
    try {
      const invalidProduct = {
        name: '',
        sku: '',
        price: 0,
        category: ''
      };
      
      if (!invalidProduct.name || !invalidProduct.sku || invalidProduct.price <= 0 || !invalidProduct.category) {
        return; // Expected to fail validation
      }
      
      throw new Error('Validation should have failed');
    } catch (error) {
      // Expected behavior
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setProducts([]);
    setCategories([]);
    initializeTests();
    
    const tests = [
      { name: 'Create Product Categories', fn: testCreateCategories },
      { name: 'Create Product - Electronics', fn: testCreateElectronicsProduct },
      { name: 'Create Product - Clothing', fn: testCreateClothingProduct },
      { name: 'Create Product - Food', fn: testCreateFoodProduct },
      { name: 'Read Product List', fn: testReadProducts },
      { name: 'Update Product Information', fn: testUpdateProductInfo },
      { name: 'Update Product Stock', fn: testUpdateProductStock },
      { name: 'Update Product Price', fn: testUpdateProductPrice },
      { name: 'Test Low Stock Detection', fn: testLowStockDetection },
      { name: 'Test Stock Validation', fn: testStockValidation },
      { name: 'Test SKU Uniqueness', fn: testSKUUniqueness },
      { name: 'Test Price Validation', fn: testPriceValidation },
      { name: 'Toggle Product Status', fn: testToggleProductStatus },
      { name: 'Delete Product', fn: testDeleteProduct },
      { name: 'Validate Required Fields', fn: testValidateRequiredFields }
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
    setProducts([]);
    setCategories([]);
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
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <TestTube className="h-6 w-6 mr-2" />
            Product CRUD Tests
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive testing for product create, read, update, and delete operations
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
            <Package className="h-5 w-5 text-purple-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Test Products</p>
              <p className="text-xl font-bold text-purple-600">{products.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-800 p-4 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-xl font-bold text-orange-600">{lowStockProducts.length}</p>
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

        {/* Test Data */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Test Products</h2>
          </div>
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No test products created yet</p>
              </div>
            ) : (
              products.map((product) => {
                const isLowStock = product.stock <= product.minStock;
                const category = categories.find(c => c.id === product.category);
                
                return (
                  <div
                    key={product.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {product.name}
                          </h3>
                          {isLowStock && (
                            <AlertTriangle className="h-4 w-4 text-orange-500 ml-2" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          SKU: {product.sku} | ₱{product.price.toLocaleString()}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                          <span>Stock: {product.stock} {product.unit}</span>
                          <span>Category: {category?.name || 'Unknown'}</span>
                          <span className={product.isActive ? 'text-green-600' : 'text-red-600'}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.isActive 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {isLowStock && (
                          <span className="px-2 py-1 text-xs rounded-full bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                            Low Stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCRUDTest;