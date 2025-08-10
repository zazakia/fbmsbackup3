import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Database, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

const SupabaseConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<string>('');
  const [tableAccess, setTableAccess] = useState<string>('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setConnectionStatus('testing');
    setErrorMessage('');
    
    try {
      console.log('Testing Supabase connection...');
      console.log('URL:', supabase.supabaseUrl);
      
      // Test 1: Basic connection
      const { data: healthData, error: healthError } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (healthError) {
        throw new Error(`Table access failed: ${healthError.message}`);
      }
      
      setTableAccess(`✅ Tables accessible (${healthData || 0} users)`);
      
      // Test 2: Auth service
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        setAuthStatus(`⚠️ Auth service: ${authError.message}`);
      } else {
        setAuthStatus(authData.session ? 
          `✅ Auth: Logged in as ${authData.session.user.email}` : 
          '✅ Auth: Ready (no session)'
        );
      }
      
      // Test 3: Get configuration details
      const config = {
        url: supabase.supabaseUrl,
        authUrl: supabase.auth.url,
        restUrl: `${supabase.supabaseUrl}/rest/v1`,
        realtime: supabase.realtime?.isConnected() || 'Not connected'
      };
      
      setConnectionDetails(config);
      setConnectionStatus('connected');
      
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setErrorMessage(error.message || 'Unknown connection error');
      setConnectionStatus('failed');
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Database className="h-8 w-8 text-blue-500 animate-pulse" />;
      case 'connected':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing':
        return 'border-blue-200 bg-blue-50';
      case 'connected':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Supabase Connection Test</h2>
        <p className="text-gray-600">Testing remote database connectivity and services</p>
      </div>

      <div className={`border-2 rounded-lg p-6 ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-gray-900">
                {connectionStatus === 'testing' && 'Testing Connection...'}
                {connectionStatus === 'connected' && 'Connection Successful'}
                {connectionStatus === 'failed' && 'Connection Failed'}
              </h3>
              <p className="text-sm text-gray-600">
                {connectionStatus === 'testing' && 'Verifying database access...'}
                {connectionStatus === 'connected' && 'All services accessible'}
                {connectionStatus === 'failed' && 'Unable to connect to remote database'}
              </p>
            </div>
          </div>
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            disabled={connectionStatus === 'testing'}
          >
            Retest
          </button>
        </div>

        {connectionDetails && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">URL:</span>
                <p className="text-gray-600 break-all">{connectionDetails.url}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Auth URL:</span>
                <p className="text-gray-600 break-all">{connectionDetails.authUrl}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">REST API:</span>
                <p className="text-gray-600 break-all">{connectionDetails.restUrl}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Realtime:</span>
                <p className="text-gray-600">{connectionDetails.realtime}</p>
              </div>
            </div>
            
            <div className="pt-3 border-t border-gray-200 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm">{authStatus}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm">{tableAccess}</span>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Connection Error</h4>
                <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupabaseConnectionTest;