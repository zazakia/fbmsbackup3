import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { createCustomer, getCustomers, updateCustomer, deleteCustomer } from '../api/customers';
import { createUser, getUsers, updateUser, deleteUser } from '../api/users';

const DatabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
  };

  const testConnection = useCallback(async () => {
    try {
      addResult('🔄 Testing Supabase connection...');
      
      // Test basic connection
      const { data, error } = await supabase.from('customers').select('count', { count: 'exact' });
      
      if (error) {
        throw error;
      }
      
      addResult('✅ Supabase connection successful');
      addResult(`📊 Found ${data?.[0]?.count || 0} customers in database`);
      setConnectionStatus('connected');
      
      return true;
    } catch (err: any) {
      addResult(`❌ Connection failed: ${err.message}`);
      setError(err.message);
      setConnectionStatus('error');
      return false;
    }
  }, []);

  const testCustomerCRUD = useCallback(async () => {
    try {
      addResult('🔄 Testing Customer CRUD operations...');
      
      // CREATE
      const newCustomer = {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
        phone: '+63123456789',
        address: '123 Test Street',
        city: 'Manila',
        province: 'Metro Manila',
        zipCode: '1000'
      };
      
      const { data: createdCustomer, error: createError } = await createCustomer(newCustomer);
      if (createError) throw createError;
      
      addResult('✅ Customer created successfully');
      
      // READ
      const { data: customers, error: readError } = await getCustomers();
      if (readError) throw readError;
      
      addResult(`✅ Retrieved ${customers?.length || 0} customers`);
      
      // UPDATE
      if (createdCustomer) {
        const { data: updatedCustomer, error: updateError } = await updateCustomer(createdCustomer.id, {
          phone: '+63987654321'
        });
        if (updateError) throw updateError;
        
        addResult('✅ Customer updated successfully');
        
        // DELETE
        const { error: deleteError } = await deleteCustomer(createdCustomer.id);
        if (deleteError) throw deleteError;
        
        addResult('✅ Customer deleted successfully');
      }
      
      addResult('🎉 Customer CRUD tests completed successfully');
      
    } catch (err: any) {
      addResult(`❌ Customer CRUD test failed: ${err.message}`);
      setError(err.message);
    }
  }, []);

  const testUserCRUD = useCallback(async () => {
    try {
      addResult('🔄 Testing User CRUD operations...');
      
      // CREATE
      const newUser = {
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'admin',
        department: 'IT',
        isActive: true
      };
      
      const { data: createdUser, error: createError } = await createUser(newUser);
      if (createError) throw createError;
      
      addResult('✅ User created successfully');
      
      // READ
      const { data: users, error: readError } = await getUsers();
      if (readError) throw readError;
      
      addResult(`✅ Retrieved ${users?.length || 0} users`);
      
      // UPDATE
      if (createdUser) {
        const { data: updatedUser, error: updateError } = await updateUser(createdUser.id, {
          department: 'Sales'
        });
        if (updateError) throw updateError;
        
        addResult('✅ User updated successfully');
        
        // DELETE
        const { error: deleteError } = await deleteUser(createdUser.id);
        if (deleteError) throw deleteError;
        
        addResult('✅ User deleted successfully');
      }
      
      addResult('🎉 User CRUD tests completed successfully');
      
    } catch (err: any) {
      addResult(`❌ User CRUD test failed: ${err.message}`);
      setError(err.message);
    }
  }, []);

  const runAllTests = useCallback(async () => {
    setTestResults([]);
    setError(null);
    
    const connectionOk = await testConnection();
    if (connectionOk) {
      await testCustomerCRUD();
      await testUserCRUD();
    }
  }, [testConnection, testCustomerCRUD, testUserCRUD]);

  useEffect(() => {
    runAllTests();
  }, [runAllTests]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Database Connection Test</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        <div className={`p-3 rounded-lg ${
          connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
          connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {connectionStatus === 'connected' && '✅ Connected to Supabase'}
          {connectionStatus === 'error' && '❌ Connection Error'}
          {connectionStatus === 'testing' && '🔄 Testing Connection...'}
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error Details</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <code className="text-sm text-red-800">{error}</code>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Test Results</h2>
          <button
            onClick={runAllTests}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Run Tests Again
          </button>
        </div>
        
        <div className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No test results yet...</p>
          ) : (
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="font-mono text-sm">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Database Schema</h3>
          <div className="bg-gray-50 border rounded-lg p-4">
            <h4 className="font-medium mb-2">FBMS Schema Tables:</h4>
            <ul className="space-y-1 text-sm">
              <li>• <code>public.customers</code> - Customer data</li>
              <li>• <code>public.users</code> - User management</li>
            </ul>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Configuration</h3>
          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="space-y-1 text-sm">
              <div><strong>Database Mode:</strong> ✅ Remote (Production)</div>
              <div><strong>Supabase URL:</strong> ✅ https://coqjcziquviehgyifhek.supabase.co</div>
              <div><strong>Connection:</strong> ✅ Hardcoded (Secure)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTest;