import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, XCircle, AlertCircle, RefreshCw, Settings, Wifi } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useSettingsStore } from '../store/settingsStore';

const DatabaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [details, setDetails] = useState<string>('');
  const [stats, setStats] = useState<{ products: number; customers: number; users: number }>({ 
    products: 0, customers: 0, users: 0 
  });
  const [databaseMode, setDatabaseModeLocal] = useState<'local' | 'remote'>('remote');
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const { setDatabaseMode } = useSettingsStore();

  const checkConnection = async () => {
    setStatus('checking');
    setDetails('Testing database connection...');
    
    // Check current database mode from localStorage
    try {
      const stored = localStorage.getItem('fbms-settings-store');
      if (stored) {
        const settings = JSON.parse(stored);
        const mode = settings?.state?.database?.mode || 'remote';
        setDatabaseModeLocal(mode);
        
        // If we're in local mode but local Supabase is down, show fix prompt
        if (mode === 'local') {
          try {
            const testLocal = await fetch('http://127.0.0.1:54321/rest/v1/', {
              headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE5NTcxMjkyMDB9.IotU_8FMxp8nZx4Pf0FJYCe9NdLOEBDw8oGOEQ4wHHw' },
              signal: AbortSignal.timeout(3000)
            });
            if (!testLocal.ok) throw new Error('Local Supabase not responding');
          } catch (error) {
            setShowFixPrompt(true);
            setStatus('error');
            setDetails('Local Supabase is not running. Click "Switch to Remote" to fix this.');
            return;
          }
        }
      }
    } catch (error) {
      console.warn('Error checking database mode:', error);
    }
    
    try {
      // Test products table
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .limit(1);
      
      if (productsError) throw new Error(`Products: ${productsError.message}`);
      
      // Test customers table
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);
      
      if (customersError) throw new Error(`Customers: ${customersError.message}`);
      
      // Test users table
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (usersError) throw new Error(`Users: ${usersError.message}`);
      
      // Get counts
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        products: productCount || 0,
        customers: customerCount || 0,
        users: userCount || 0
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

  const handleSwitchToRemote = () => {
    console.log('🔧 Switching to remote database mode...');
    setDatabaseMode('remote');
  };

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
          {showFixPrompt && (
            <button 
              onClick={handleSwitchToRemote}
              className="text-xs px-3 py-1 bg-red-600 text-white border border-red-700 rounded hover:bg-red-700 flex items-center space-x-1"
            >
              <Settings className="h-3 w-3" />
              <span>Switch to Remote</span>
            </button>
          )}
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