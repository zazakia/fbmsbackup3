import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { createProduct, getProducts } from '../../api/products';
import { CheckCircle, XCircle, Clock, AlertCircle, Database, Wifi, WifiOff } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

const EnhancedSupabaseConnectionTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Environment Variables', status: 'pending', message: 'Checking...' },
    { name: 'Supabase Connection', status: 'pending', message: 'Checking...' },
    { name: 'Authentication', status: 'pending', message: 'Checking...' },
    { name: 'Database Access', status: 'pending', message: 'Checking...' },
    { name: 'Products Table', status: 'pending', message: 'Checking...' },
    { name: 'Create Product', status: 'pending', message: 'Checking...' }
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (index: number, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, details } : test
    ));
  };

  const runTests = async () => {
    setIsRunning(true);

    // Test 1: Environment Variables
    const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      updateTest(0, 'error', 'Missing environment variables', { 
        url: !!supabaseUrl, 
        key: !!supabaseAnonKey,
        urlValue: supabaseUrl ? 'Set' : 'Missing',
        keyValue: supabaseAnonKey ? 'Set' : 'Missing'
      });
      setIsRunning(false);
      return;
    } else {
      updateTest(0, 'success', 'Environment variables loaded', {
        url: supabaseUrl,
        keyLength: supabaseAnonKey.length
      });
    }

    // Test 2: Supabase Connection
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        updateTest(1, 'error', 'Connection failed', { error: error.message });
        setIsRunning(false);
        return;
      }
      updateTest(1, 'success', 'Connection established', { hasSession: !!session });
    } catch (error) {
      updateTest(1, 'error', 'Connection error', { error: error.message });
      setIsRunning(false);
      return;
    }

    // Test 3: Authentication (optional)
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error && error.message !== 'JWT expired') {
        updateTest(2, 'error', 'Auth check failed', { error: error.message });
      } else {
        updateTest(2, 'success', user ? 'User authenticated' : 'No active session (OK)', { 
          hasUser: !!user,
          userId: user?.id 
        });
      }
    } catch (error) {
      updateTest(2, 'error', 'Auth error', { error: error.message });
    }

    // Test 4: Database Access
    try {
      const { data, error } = await supabase
        .from('products')
        .select('count')
        .limit(1);
      
      if (error) {
        updateTest(3, 'error', 'Database access failed', { 
          error: error.message,
          code: error.code,
          hint: error.hint
        });
        setIsRunning(false);
        return;
      }
      updateTest(3, 'success', 'Database accessible', { hasData: !!data });
    } catch (error) {
      updateTest(3, 'error', 'Database connection error', { error: error.message });
      setIsRunning(false);
      return;
    }

    // Test 5: Products Table
    try {
      const { data, error } = await getProducts(1, 0); // Get 1 product for testing
      if (error) {
        updateTest(4, 'error', 'Products table access failed', { 
          error: error.message,
          code: error.code
        });
      } else {
        updateTest(4, 'success', 'Products table accessible', { 
          productCount: data?.length || 0 
        });
      }
    } catch (error) {
      updateTest(4, 'error', 'Products API error', { error: error.message });
    }

    // Test 6: Create Product (Test product creation)
    try {
      const testProduct = {
        name: `Test Product ${Date.now()}`,
        description: 'Test product for connection validation',
        sku: `TEST-${Date.now()}`,
        category: 'Test Category',
        price: 10.00,
        cost: 5.00,
        stock: 1,
        minStock: 1,
        unit: 'piece',
        isActive: true
      };

      const { data, error } = await createProduct(testProduct);
      
      if (error) {
        updateTest(5, 'error', 'Product creation failed', { 
          error: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        });
      } else {
        updateTest(5, 'success', 'Product creation successful', { 
          productId: data?.id,
          productName: data?.name
        });

        // Clean up test product
        try {
          await supabase
            .from('products')
            .delete()
            .eq('id', data?.id);
          console.log('✅ Test product cleaned up');
        } catch (cleanupError) {
          console.warn('⚠️ Could not clean up test product:', cleanupError);
        }
      }
    } catch (error) {
      updateTest(5, 'error', 'Product creation error', { error: error.message });
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getOverallStatus = () => {
    const hasErrors = tests.some(test => test.status === 'error');
    const allComplete = tests.every(test => test.status !== 'pending');
    
    if (hasErrors) return { status: 'error', message: 'Connection issues detected' };
    if (allComplete) return { status: 'success', message: 'All tests passed' };
    return { status: 'pending', message: 'Running tests...' };
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {overallStatus.status === 'success' && <Wifi className="h-6 w-6 text-green-500" />}
            {overallStatus.status === 'error' && <WifiOff className="h-6 w-6 text-red-500" />}
            {overallStatus.status === 'pending' && <Database className="h-6 w-6 text-blue-500" />}
            <h2 className="text-2xl font-bold text-gray-900">Enhanced Supabase Connection Test</h2>
          </div>
          
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running Tests...' : 'Run Tests Again'}
          </button>
        </div>

        <div className={`p-4 rounded-lg mb-6 ${
          overallStatus.status === 'success' ? 'bg-green-50 border border-green-200' :
          overallStatus.status === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon(overallStatus.status)}
            <span className={`font-medium ${
              overallStatus.status === 'success' ? 'text-green-800' :
              overallStatus.status === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {overallStatus.message}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {tests.map((test, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.status)}
                  <span className="font-medium text-gray-900">{test.name}</span>
                </div>
                <span className={`text-sm ${
                  test.status === 'success' ? 'text-green-600' :
                  test.status === 'error' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {test.message}
                </span>
              </div>
              
              {test.details && (
                <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                  <pre className="text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(test.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Troubleshooting Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>If environment variables are missing, check your <code>.env.local</code> file</li>
                <li>If connection fails, verify your Supabase URL and anon key</li>
                <li>If database access fails, check your Supabase project settings</li>
                <li>If product creation fails, check your database schema and RLS policies</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSupabaseConnectionTest;
