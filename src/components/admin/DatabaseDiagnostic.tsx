import React, { useState } from 'react';
import { Database, CheckCircle, XCircle, AlertTriangle, Play, Plus, Copy } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  solution?: string;
  sql?: string;
}

const DatabaseDiagnostic: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const { addToast } = useToastStore();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostic = async () => {
    if (!user) {
      addToast({ type: 'error', title: 'Error', message: 'Please log in first' });
      return;
    }

    setIsRunning(true);
    setResults([]);
    const diagnostics: DiagnosticResult[] = [];

    try {
      addToast({ type: 'info', title: 'Running Diagnostics', message: 'Checking database structure...' });

      // Test 1: Check users table structure
      try {
        // First check if table exists with basic query
        const { data: basicData, error: basicError } = await supabase
          .from('users')
          .select('id, email')
          .limit(1);

        if (basicError) {
          if (basicError.code === '42P01') {
            diagnostics.push({
              test: 'Users Table Existence',
              status: 'error',
              message: 'Users table does not exist',
              solution: 'Create the users table',
              sql: `-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'employee', 'viewer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    department VARCHAR(100),
    full_name VARCHAR(255),
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`
            });
          } else {
            diagnostics.push({
              test: 'Users Table Access',
              status: 'error',
              message: basicError.message,
              solution: 'Check database permissions and table structure'
            });
          }
        } else {
          diagnostics.push({
            test: 'Users Table Existence',
            status: 'success',
            message: 'Users table exists and is accessible'
          });

          // Now check for specific columns individually
          const { data: roleData, error: roleError } = await supabase
            .from('users')
            .select('role')
            .limit(1);

          if (roleError && roleError.message.includes('column "role" does not exist')) {
            diagnostics.push({
              test: 'Users Table - Role Column',
              status: 'error',
              message: 'Role column is missing from users table',
              solution: 'Run the fix script to add missing columns',
              sql: `-- Add role column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'employee', 'viewer'));`
            });
          } else if (!roleError) {
            diagnostics.push({
              test: 'Users Table - Role Column',
              status: 'success',
              message: 'Role column exists'
            });
          }

          const { data: statusData, error: statusError } = await supabase
            .from('users')
            .select('status')
            .limit(1);

          if (statusError && statusError.message.includes('column "status" does not exist')) {
            diagnostics.push({
              test: 'Users Table - Status Column',
              status: 'error',
              message: 'Status column is missing from users table',
              solution: 'Run the fix script to add missing columns',
              sql: `-- Add status column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));`
            });
          } else if (!statusError) {
            diagnostics.push({
              test: 'Users Table - Status Column',
              status: 'success',
              message: 'Status column exists'
            });
          }

          // Check for other optional columns
          const { data: fullNameData, error: fullNameError } = await supabase
            .from('users')
            .select('full_name')
            .limit(1);

          if (fullNameError && fullNameError.message.includes('column "full_name" does not exist')) {
            diagnostics.push({
              test: 'Users Table - Full Name Column',
              status: 'warning',
              message: 'Full name column is missing (optional)',
              solution: 'Run the fix script to add missing columns',
              sql: `-- Add full_name column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`
            });
          }

          const { data: deptData, error: deptError } = await supabase
            .from('users')
            .select('department')
            .limit(1);

          if (deptError && deptError.message.includes('column "department" does not exist')) {
            diagnostics.push({
              test: 'Users Table - Department Column',
              status: 'warning',
              message: 'Department column is missing (optional)',
              solution: 'Run the fix script to add missing columns',
              sql: `-- Add department column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department VARCHAR(100);`
            });
          }
        }
      } catch (error) {
        diagnostics.push({
          test: 'Users Table Connection',
          status: 'error',
          message: `Connection error: ${error}`,
          solution: 'Check your database connection'
        });
      }

      // Test 2: Check suppliers table
      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id')
          .limit(1);

        if (error && error.code === '42P01') {
          diagnostics.push({
            test: 'Suppliers Table',
            status: 'error',
            message: 'Suppliers table does not exist',
            solution: 'Run the admin features script to create suppliers table'
          });
        } else if (error) {
          diagnostics.push({
            test: 'Suppliers Table',
            status: 'warning',
            message: `Suppliers table issue: ${error.message}`,
            solution: 'Check table permissions'
          });
        } else {
          diagnostics.push({
            test: 'Suppliers Table',
            status: 'success',
            message: 'Suppliers table exists and is accessible'
          });
        }
      } catch (error) {
        diagnostics.push({
          test: 'Suppliers Table',
          status: 'error',
          message: `Error checking suppliers table: ${error}`,
          solution: 'Check database connection'
        });
      }

      // Test 3: Check transactions table
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('id')
          .limit(1);

        if (error && error.code === '42P01') {
          diagnostics.push({
            test: 'Transactions Table',
            status: 'error',
            message: 'Transactions table does not exist',
            solution: 'Run the admin features script to create transactions table'
          });
        } else if (error) {
          diagnostics.push({
            test: 'Transactions Table',
            status: 'warning',
            message: `Transactions table issue: ${error.message}`,
            solution: 'Check table permissions'
          });
        } else {
          diagnostics.push({
            test: 'Transactions Table',
            status: 'success',
            message: 'Transactions table exists and is accessible'
          });
        }
      } catch (error) {
        diagnostics.push({
          test: 'Transactions Table',
          status: 'error',
          message: `Error checking transactions table: ${error}`,
          solution: 'Check database connection'
        });
      }

      // Test 4: Check audit_log table
      try {
        const { data, error } = await supabase
          .from('audit_log')
          .select('id')
          .limit(1);

        if (error && error.code === '42P01') {
          diagnostics.push({
            test: 'Audit Log Table',
            status: 'error',
            message: 'Audit log table does not exist',
            solution: 'Run the admin features script to create audit log table'
          });
        } else if (error) {
          diagnostics.push({
            test: 'Audit Log Table',
            status: 'warning',
            message: `Audit log table issue: ${error.message}`,
            solution: 'Check table permissions'
          });
        } else {
          diagnostics.push({
            test: 'Audit Log Table',
            status: 'success',
            message: 'Audit log table exists and is accessible'
          });
        }
      } catch (error) {
        diagnostics.push({
          test: 'Audit Log Table',
          status: 'error',
          message: `Error checking audit log table: ${error}`,
          solution: 'Check database connection'
        });
      }

      // Test 5: Check user_settings table
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('id')
          .limit(1);

        if (error && error.code === '42P01') {
          diagnostics.push({
            test: 'User Settings Table',
            status: 'error',
            message: 'User settings table does not exist',
            solution: 'Run the user settings script to create the table'
          });
        } else if (error) {
          diagnostics.push({
            test: 'User Settings Table',
            status: 'warning',
            message: `User settings table issue: ${error.message}`,
            solution: 'Check table permissions'
          });
        } else {
          diagnostics.push({
            test: 'User Settings Table',
            status: 'success',
            message: 'User settings table exists and is accessible'
          });
        }
      } catch (error) {
        diagnostics.push({
          test: 'User Settings Table',
          status: 'error',
          message: `Error checking user settings table: ${error}`,
          solution: 'Check database connection'
        });
      }

    } catch (error) {
      diagnostics.push({
        test: 'Overall Connection',
        status: 'error',
        message: `Database connection failed: ${error}`,
        solution: 'Check your Supabase configuration and internet connection'
      });
    }

    setResults(diagnostics);
    setIsRunning(false);

    // Show summary
    const errorCount = diagnostics.filter(d => d.status === 'error').length;
    const warningCount = diagnostics.filter(d => d.status === 'warning').length;
    
    if (errorCount === 0 && warningCount === 0) {
      addToast({ 
        type: 'success', 
        title: 'Diagnostics Complete', 
        message: 'All tests passed! Database structure is correct.' 
      });
    } else if (errorCount > 0) {
      addToast({ 
        type: 'error', 
        title: 'Issues Found', 
        message: `${errorCount} error(s) and ${warningCount} warning(s) found.` 
      });
    } else {
      addToast({ 
        type: 'warning', 
        title: 'Warnings Found', 
        message: `${warningCount} warning(s) found.` 
      });
    }
  };

  const copySQL = (sql: string) => {
    navigator.clipboard.writeText(sql).then(() => {
      addToast({
        type: 'success',
        title: 'Copied!',
        message: 'SQL script copied to clipboard'
      });
    }).catch(() => {
      addToast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Please copy the script manually'
      });
      console.log('SQL Script:', sql);
    });
  };

  const copyAllFixScripts = () => {
    const allSQL = results
      .filter(r => r.sql)
      .map(r => `-- ${r.test}\n${r.sql}`)
      .join('\n\n');

    if (allSQL) {
      copySQL(allSQL);
    } else {
      addToast({
        type: 'info',
        title: 'No Fixes Needed',
        message: 'No SQL fixes are required'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-t border-gray-200 dark:border-dark-700 pt-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          <Database className="h-5 w-5 inline mr-2" />
          Database Structure Diagnostic
        </h3>
        
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={runDiagnostic}
            disabled={isRunning || !user}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Running Diagnostics...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Run Diagnostic</span>
              </>
            )}
          </button>

          {results.some(r => r.sql) && (
            <button
              onClick={copyAllFixScripts}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Copy className="h-4 w-4" />
              <span>Copy All Fixes</span>
            </button>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">Diagnostic Results:</h4>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getStatusBg(result.status)}`}
              >
                <div className="flex items-start space-x-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{result.test}</p>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    {result.solution && (result.status === 'error' || result.status === 'warning') && (
                      <p className="text-sm text-blue-600 mt-2">
                        <strong>Solution:</strong> {result.solution}
                      </p>
                    )}
                    {result.sql && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700">SQL Fix:</span>
                          <button
                            onClick={() => copySQL(result.sql!)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {result.sql}
                        </pre>
                      </div>
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
              <p className="text-yellow-700">Please log in to run database diagnostics</p>
            </div>
          </div>
        )}

        {/* Quick Fix Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">Quick Fix Instructions:</h5>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Click "Run Diagnostic" to identify issues</li>
            <li>Click "Copy All Fixes" to get SQL scripts</li>
            <li>Open your <strong>Supabase Dashboard → SQL Editor</strong></li>
            <li>Paste and run the SQL scripts</li>
            <li>Re-run diagnostics to verify fixes</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DatabaseDiagnostic;