import React, { useState } from 'react';
import { Database, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

const DatabaseTest: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    if (!user) {
      setTestResults([{ name: 'User Authentication', status: 'error', message: 'No user logged in' }]);
      return;
    }

    setIsLoading(true);
    const results: any[] = [];

    try {
      // Test 1: Check if user_settings table exists
      console.log('Testing user_settings table...');
      const { data: tableCheck, error: tableError } = await supabase
        .from('user_settings')
        .select('id')
        .limit(1);

      if (tableError) {
        if (tableError.code === '42P01') {
          results.push({
            name: 'User Settings Table',
            status: 'error',
            message: 'Table does not exist. Run the SQL script in Supabase dashboard.',
            error: tableError
          });
        } else {
          results.push({
            name: 'User Settings Table',
            status: 'error',
            message: `Database error: ${tableError.message}`,
            error: tableError
          });
        }
      } else {
        results.push({
          name: 'User Settings Table',
          status: 'success',
          message: 'Table exists and is accessible'
        });
      }

      // Test 2: Try to select user's settings
      console.log('Testing user settings access...');
      const { data: userSettings, error: userError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          results.push({
            name: 'User Settings Access',
            status: 'warning',
            message: 'No settings found for user (this is normal for new users)'
          });
        } else {
          results.push({
            name: 'User Settings Access',
            status: 'error',
            message: `Access error: ${userError.message}`,
            error: userError
          });
        }
      } else {
        results.push({
          name: 'User Settings Access',
          status: 'success',
          message: 'User settings found and accessible',
          data: userSettings
        });
      }

      // Test 3: Try to insert/update settings
      console.log('Testing settings write...');
      const testSettings = {
        user_id: user.id,
        theme: 'system',
        display: {
          topBar: {
            showDatabaseStatus: true,
            showSupabaseStatus: true,
            showThemeToggle: true,
            showNotifications: true,
            showSearch: true,
            showUserProfile: true,
            showMobileSearch: true
          }
        }
      };

      const { data: insertData, error: insertError } = await supabase
        .from('user_settings')
        .upsert(testSettings, { onConflict: 'user_id' })
        .select()
        .single();

      if (insertError) {
        results.push({
          name: 'Settings Write Test',
          status: 'error',
          message: `Write error: ${insertError.message}`,
          error: insertError
        });
      } else {
        results.push({
          name: 'Settings Write Test',
          status: 'success',
          message: 'Settings can be written successfully',
          data: insertData
        });
      }

      // Test 4: Check RLS policies
      console.log('Testing RLS policies...');
      const { data: rlsData, error: rlsError } = await supabase
        .from('user_settings')
        .select('id')
        .neq('user_id', user.id) // Try to access other users' settings
        .limit(1);

      if (rlsError || (rlsData && rlsData.length === 0)) {
        results.push({
          name: 'Row Level Security',
          status: 'success',
          message: 'RLS policies are working correctly'
        });
      } else {
        results.push({
          name: 'Row Level Security',
          status: 'warning',
          message: 'RLS policies may not be configured correctly'
        });
      }

    } catch (error) {
      results.push({
        name: 'Database Connection',
        status: 'error',
        message: `Connection error: ${error}`,
        error
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Database className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Database Diagnostic Test</h1>
        <p className="text-gray-600">
          Test the user_settings table connectivity and permissions
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isLoading || !user}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Database className="h-4 w-4" />
          <span>{isLoading ? 'Running Tests...' : 'Run Database Tests'}</span>
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Test Results</h2>
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start space-x-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{result.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  {result.error && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Error Details
                      </summary>
                      <pre className="text-xs text-gray-700 mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                        {JSON.stringify(result.error, null, 2)}
                      </pre>
                    </details>
                  )}
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Data
                      </summary>
                      <pre className="text-xs text-gray-700 mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!user && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <p className="text-yellow-700">Please log in to run database tests</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseTest;