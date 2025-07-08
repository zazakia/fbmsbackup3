/**
 * Admin Access Validation Component
 * Shows which modules and permissions are available to the current admin user
 */

import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { hasPermission, canAccessModule } from '../../utils/permissions';
import { runAdminAccessTest } from '../../utils/adminAccessTest';

interface AccessTest {
  module: string;
  canAccess: boolean;
  permissions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
}

const AdminAccessValidation: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const [accessTests, setAccessTests] = useState<AccessTest[]>([]);
  const [testResults, setTestResults] = useState<any>(null);

  const modules = [
    'dashboard',
    'pos', 
    'inventory',
    'customers',
    'suppliers',
    'purchases',
    'expenses',
    'accounting',
    'payroll',
    'reports',
    'branches',
    'users',
    'settings',
    'bir',
    'admin-dashboard',
    'system-monitoring',
    'security'
  ];

  useEffect(() => {
    if (user?.role) {
      runTests();
    }
  }, [user?.role]);

  const runTests = () => {
    if (!user?.role) return;

    const tests = modules.map(module => ({
      module,
      canAccess: canAccessModule(user.role, module),
      permissions: {
        view: hasPermission(user.role, module, 'view'),
        create: hasPermission(user.role, module, 'create'),
        edit: hasPermission(user.role, module, 'edit'),
        delete: hasPermission(user.role, module, 'delete')
      }
    }));

    setAccessTests(tests);

    // Run comprehensive test
    const results = runAdminAccessTest(user.role);
    setTestResults(results);
  };

  const getStatusIcon = (hasAccess: boolean) => {
    return hasAccess ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getOverallStatus = () => {
    if (!testResults) return 'unknown';
    
    if (user?.role === 'admin') {
      return testResults.successRate === 100 ? 'perfect' : 'issues';
    }
    
    return testResults.successRate > 0 ? 'partial' : 'none';
  };

  const getStatusColor = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'perfect': return 'text-green-700 bg-green-50 border-green-200';
      case 'issues': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'partial': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'none': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Please log in to validate access permissions.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              Admin Access Validation
            </h1>
            <p className="text-gray-600 mt-1">Verify admin permissions and module access</p>
          </div>
          <button
            onClick={runTests}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retest Access
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`border rounded-lg p-4 mb-6 ${getStatusColor()}`}>
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">
              Access Status for {user.firstName} {user.lastName} ({user.role})
            </h3>
            {testResults && (
              <p className="text-sm mt-1">
                {testResults.passed}/{testResults.total} permissions granted 
                ({testResults.successRate.toFixed(1)}% success rate)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Module Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accessTests.map((test) => (
          <div
            key={test.module}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              {getStatusIcon(test.canAccess)}
              <h3 className="font-medium capitalize">
                {test.module.replace('-', ' ')}
              </h3>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Module Access:</span>
                <span className={test.canAccess ? 'text-green-600' : 'text-red-600'}>
                  {test.canAccess ? 'Granted' : 'Denied'}
                </span>
              </div>
              
              <div className="space-y-1 mt-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between">
                  <span>View:</span>
                  {getStatusIcon(test.permissions.view)}
                </div>
                <div className="flex justify-between">
                  <span>Create:</span>
                  {getStatusIcon(test.permissions.create)}
                </div>
                <div className="flex justify-between">
                  <span>Edit:</span>
                  {getStatusIcon(test.permissions.edit)}
                </div>
                <div className="flex justify-between">
                  <span>Delete:</span>
                  {getStatusIcon(test.permissions.delete)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Console Test Button */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Developer Tools</h3>
        <p className="text-sm text-gray-600 mb-3">
          Run comprehensive access tests in the browser console:
        </p>
        <button
          onClick={() => {
            if (user?.role) {
              runAdminAccessTest(user.role);
            }
          }}
          className="text-sm bg-gray-700 text-white px-3 py-2 rounded hover:bg-gray-800"
        >
          Run Console Test
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Check browser console for detailed test results
        </p>
      </div>
    </div>
  );
};

export default AdminAccessValidation;