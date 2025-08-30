import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, AlertCircle, RefreshCw, Wifi } from 'lucide-react';
import { supabase } from '../utils/supabase';

const DatabaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [details, setDetails] = useState<string>('');
  const [stats, setStats] = useState<{ products: number; customers: number; users: number }>({ 
    products: 0, customers: 0, users: 0 
  });
  const [databaseMode] = useState<'remote'>('remote'); // Always use remote in production

  const checkConnection = async () => {
    setStatus('checking');
    setDetails('Testing remote database connection...');

    try {
      // Use Promise.all to make all count requests in parallel
      const [productResult, customerResult, userResult] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true })
      ]);

      // Check for errors
      if (productResult.error) throw new Error(`Products: ${productResult.error.message}`);
      if (customerResult.error) throw new Error(`Customers: ${customerResult.error.message}`);
      if (userResult.error) throw new Error(`Users: ${userResult.error.message}`);

      setStats({
        products: productResult.count || 0,
        customers: customerResult.count || 0,
        users: userResult.count || 0
      });

      setStatus('connected');
      setDetails(`✅ Database connected successfully!`);

    } catch (error) {
      console.error('Database connection error:', error);
      setStatus('error');
      setDetails(error instanceof Error ? error.message : 'Connection failed');
      setStats({ products: 0, customers: 0, users: 0 });
    }
  };

  // Removed handleSwitchToRemote - always use remote in production

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'border-blue-200 bg-blue-50';
      case 'connected':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()} mb-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Database className="h-5 w-5 text-gray-600" />
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <h3 className="text-sm font-medium text-gray-900">
              Supabase Database ({databaseMode})
            </h3>
            {databaseMode === 'remote' && <Wifi className="h-3 w-3 text-blue-500" />}
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={checkConnection}
            disabled={status === 'checking'}
            className="text-xs px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Test Connection
          </button>
        </div>
      </div>
      
      <p className="text-xs text-gray-600 mb-3">{details}</p>
      
      {status === 'connected' && (
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="font-semibold text-blue-600">{stats.products}</div>
            <div className="text-gray-500">Products</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">{stats.customers}</div>
            <div className="text-gray-500">Customers</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-purple-600">{stats.users}</div>
            <div className="text-gray-500">Users</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseConnectionTest;