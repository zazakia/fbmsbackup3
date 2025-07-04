import React, { useState } from 'react';
import { Database, CheckCircle, XCircle, AlertTriangle, Play, Plus } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';
import { createUserSettingsTable } from '../../utils/createUserSettingsTable';
import { fixUserSettingsTable } from '../../utils/fixUserSettingsTable';
import DatabaseDiagnostic from '../admin/DatabaseDiagnostic';

const UserSettingsDiagnostic: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const { addToast } = useToastStore();
  const [isRunning, setIsRunning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [needsTableCreation, setNeedsTableCreation] = useState(false);

  const runDiagnostic = async () => {
    if (!user) {
      addToast({ type: 'error', title: 'Error', message: 'Please log in first' });
      return;
    }

    setIsRunning(true);
    setResults([]);
    const diagnostics: any[] = [];

    try {
      // Test 1: Check if user_settings table exists
      addToast({ type: 'info', title: 'Running Tests', message: 'Checking database connection...' });
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          setNeedsTableCreation(true);
          diagnostics.push({
            test: 'Table Existence',
            status: 'error',
            message: 'user_settings table does not exist',
            solution: 'Use the "Create Table" button below or run the SQL script manually'
          });
        } else {
          diagnostics.push({
            test: 'Table Access',
            status: 'error',
            message: error.message,
            solution: 'Check your database permissions'
          });
        }
      } else {
        diagnostics.push({
          test: 'Table Existence',
          status: 'success',
          message: 'user_settings table exists and is accessible'
        });

        // Test 2: Try to create/update a test record
        const testData = {
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

        const { error: upsertError } = await supabase
          .from('user_settings')
          .upsert(testData, { onConflict: 'user_id' });

        if (upsertError) {
          diagnostics.push({
            test: 'Write Permission',
            status: 'error',
            message: upsertError.message,
            solution: 'Check RLS policies and user permissions'
          });
        } else {
          diagnostics.push({
            test: 'Write Permission',
            status: 'success',
            message: 'Can successfully write to user_settings table'
          });
        }
      }

      // Test 3: Check if auth.users reference works
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        diagnostics.push({
          test: 'Authentication',
          status: 'error',
          message: authError.message,
          solution: 'Check authentication status'
        });
      } else {
        diagnostics.push({
          test: 'Authentication',
          status: 'success',
          message: `Authenticated as user: ${authData.user?.id}`
        });
      }

    } catch (error) {
      diagnostics.push({
        test: 'Connection',
        status: 'error',
        message: `Unexpected error: ${error}`,
        solution: 'Check your internet connection and Supabase configuration'
      });
    }

    setResults(diagnostics);
    setIsRunning(false);

    // Show summary
    const errorCount = diagnostics.filter(d => d.status === 'error').length;
    if (errorCount === 0) {
      addToast({ 
        type: 'success', 
        title: 'Diagnostics Complete', 
        message: 'All tests passed! Settings should save to Supabase.' 
      });
    } else {
      addToast({ 
        type: 'error', 
        title: 'Issues Found', 
        message: `${errorCount} issue(s) found. Check results below.` 
      });
    }
  };

  const handleCreateTable = async () => {
    setIsCreating(true);
    addToast({ type: 'info', title: 'Creating Table', message: 'Creating user_settings table...' });

    const result = await createUserSettingsTable();
    
    if (result.success) {
      addToast({ type: 'success', title: 'Success', message: result.message });
      setNeedsTableCreation(false);
      // Re-run diagnostics to verify
      setTimeout(() => runDiagnostic(), 1000);
    } else {
      addToast({ type: 'error', title: 'Failed', message: result.message });
    }
    
    setIsCreating(false);
  };

  const handleFixTable = async () => {
    setIsFixing(true);
    addToast({ type: 'info', title: 'Fixing Table', message: 'Adding missing columns to user_settings table...' });

    const result = await fixUserSettingsTable();
    
    if (result.success) {
      addToast({ type: 'success', title: 'Success', message: result.message });
      // Re-run diagnostics to verify
      setTimeout(() => runDiagnostic(), 1000);
    } else {
      addToast({ type: 'error', title: 'Failed', message: result.message });
    }
    
    setIsFixing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-t border-gray-200 dark:border-dark-700 pt-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Database Diagnostic
        </h3>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={runDiagnostic}
            disabled={isRunning || !user}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Running Tests...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Test Database Connection</span>
              </>
            )}
          </button>

          {needsTableCreation && (
            <button
              onClick={handleCreateTable}
              disabled={isCreating || !user}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Creating Table...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Table</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => {
              const sql = `-- Fix missing columns in user_settings table
DO $$ 
BEGIN
    -- Add currency column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'currency') THEN
        ALTER TABLE public.user_settings ADD COLUMN currency VARCHAR(10) DEFAULT 'PHP';
    END IF;

    -- Add language column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'language') THEN
        ALTER TABLE public.user_settings ADD COLUMN language VARCHAR(10) DEFAULT 'en';
    END IF;

    -- Add timezone column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'timezone') THEN
        ALTER TABLE public.user_settings ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Manila';
    END IF;
END $$;`;
              
              navigator.clipboard.writeText(sql).then(() => {
                addToast({
                  type: 'success',
                  title: 'Copied!',
                  message: 'SQL script copied to clipboard. Paste and run it in Supabase SQL Editor.'
                });
              }).catch(() => {
                addToast({
                  type: 'error',
                  title: 'Copy Failed',
                  message: 'Please copy the script manually from the console.'
                });
                console.log('SQL Script to fix missing columns:', sql);
              });
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Database className="h-4 w-4" />
            <span>Copy Fix SQL</span>
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Results:</h4>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getStatusBg(result.status)}`}
              >
                <div className="flex items-start space-x-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{result.test}</p>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    {result.solution && result.status === 'error' && (
                      <p className="text-sm text-blue-600 mt-2">
                        <strong>Solution:</strong> {result.solution}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!user && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <p className="text-yellow-700">Please log in to run diagnostics</p>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Database Diagnostic Section */}
      <DatabaseDiagnostic />
    </div>
  );
};

export default UserSettingsDiagnostic;