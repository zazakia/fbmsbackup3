import React, { useState } from 'react';
import { TestTube, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { createProduct } from '../../api/products';
import { supabase } from '../../utils/supabase';

const ProductCreationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'success' | 'error';
    message: string;
    details?: any;
  }>>([]);
  
  const { addProduct } = useBusinessStore();

  const addTestResult = (test: string, status: 'success' | 'error', message: string, details?: any) => {
    setTestResults(prev => [...prev, { test, status, message, details }]);
  };

  const runTests = async () => {
    setTestResults([]);
    console.log('🧪 Starting Product Creation Tests...');

    // Test 1: Check database connection
    try {
      addTestResult('Database Connection', 'pending', 'Testing...');
      
      const { data, error } = await supabase.from('products').select('count').limit(1);
      if (error) {
        addTestResult('Database Connection', 'error', error.message, error);
        return;
      }
      addTestResult('Database Connection', 'success', 'Database accessible');
    } catch (error: any) {
      addTestResult('Database Connection', 'error', error.message, error);
      return;
    }

    // Test 2: Check table permissions
    try {
      addTestResult('Table Permissions', 'pending', 'Testing...');
      
      // Try to insert a test product directly via API
      const testProduct = {
        name: 'Test Product ' + Date.now(),
        description: 'Test Description',
        sku: 'TEST-' + Date.now(),
        category: 'Electronics',
        price: 10.99,
        cost: 5.50,
        stock: 100,
        minStock: 10,
        unit: 'piece',
        isActive: true
      };

      const { data, error } = await createProduct(testProduct);
      
      if (error) {
        addTestResult('Table Permissions', 'error', 
          `Insert failed: ${error.message}`, 
          { error, testProduct }
        );
        return;
      }
      
      addTestResult('Table Permissions', 'success', 
        `Product created successfully with ID: ${data?.id}`, 
        { product: data }
      );

      // Clean up test product
      if (data?.id) {
        await supabase.from('products').delete().eq('id', data.id);
      }
    } catch (error: any) {
      addTestResult('Table Permissions', 'error', error.message, error);
      return;
    }

    // Test 3: Test via store
    try {
      addTestResult('Store Method', 'pending', 'Testing...');
      
      const storeTestProduct = {
        name: 'Store Test Product ' + Date.now(),
        description: 'Store Test Description',
        sku: 'STORE-TEST-' + Date.now(),
        category: 'Electronics',
        price: 15.99,
        cost: 8.50,
        stock: 50,
        minStock: 5,
        unit: 'piece',
        isActive: true
      };

      await addProduct(storeTestProduct);
      addTestResult('Store Method', 'success', 'Product created via store successfully');
      
    } catch (error: any) {
      addTestResult('Store Method', 'error', error.message, error);
    }

    // Test 4: Check categories exist
    try {
      addTestResult('Categories Check', 'pending', 'Testing...');
      
      const { data: categories, error } = await supabase.from('categories').select('*');
      if (error) {
        addTestResult('Categories Check', 'error', `Categories error: ${error.message}`, error);
      } else if (!categories || categories.length === 0) {
        addTestResult('Categories Check', 'error', 'No categories found - this may cause form issues');
        
        // Try to create a default category
        const { error: createError } = await supabase
          .from('categories')
          .insert([{ name: 'Electronics', description: 'Electronic products' }]);
          
        if (createError) {
          addTestResult('Categories Check', 'error', `Failed to create default category: ${createError.message}`);
        } else {
          addTestResult('Categories Check', 'success', 'Created default category');
        }
      } else {
        addTestResult('Categories Check', 'success', `Found ${categories.length} categories`);
      }
    } catch (error: any) {
      addTestResult('Categories Check', 'error', error.message, error);
    }

    console.log('🧪 Product Creation Tests Complete');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <TestTube className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TestTube className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Product Creation Diagnostics</h3>
        </div>
        <button
          onClick={runTests}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Run Tests</span>
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Test Results:</h4>
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start space-x-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{result.test}</span>
                    <span className={`text-sm ${
                      result.status === 'success' ? 'text-green-600' :
                      result.status === 'error' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">Show Details</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">Instructions:</h4>
        <ol className="text-sm text-yellow-700 space-y-1">
          <li>1. Click "Run Tests" to diagnose product creation issues</li>
          <li>2. Check the results for any errors or permission issues</li>
          <li>3. If database connection fails, check environment variables</li>
          <li>4. If permissions fail, check Supabase RLS policies</li>
          <li>5. Open browser console for detailed error messages</li>
        </ol>
      </div>
    </div>
  );
};

export default ProductCreationTest;