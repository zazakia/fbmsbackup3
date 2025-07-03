import React from 'react';
import { X, Shield, Check, Minus } from 'lucide-react';
import { UserRole } from '../../types/auth';
import { ROLE_PERMISSIONS } from '../../utils/permissions';

interface RolePermissionsProps {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onClose: () => void;
}

const RolePermissions: React.FC<RolePermissionsProps> = ({
  selectedRole,
  onRoleChange,
  onClose
}) => {
  const rolePermissions = ROLE_PERMISSIONS[selectedRole];
  
  const allModules = [
    'dashboard',
    'pos', 
    'inventory',
    'customers',
    'purchases',
    'expenses',
    'accounting',
    'payroll',
    'reports',
    'branches',
    'users',
    'settings',
    'bir'
  ];

  const allActions = ['view', 'create', 'edit', 'delete', 'export', 'transfer'];

  const hasModulePermission = (module: string, action: string) => {
    const modulePermission = rolePermissions.find(p => p.module === module);
    return modulePermission ? modulePermission.actions.includes(action) : false;
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cashier': return 'bg-green-100 text-green-800 border-green-200';
      case 'accountant': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getModuleDisplayName = (module: string) => {
    const names: Record<string, string> = {
      dashboard: 'Dashboard',
      pos: 'POS & Sales',
      inventory: 'Inventory',
      customers: 'Customers',
      purchases: 'Purchases',
      expenses: 'Expenses',
      accounting: 'Accounting',
      payroll: 'Payroll',
      reports: 'Reports',
      branches: 'Multi-Branch',
      users: 'User Management',
      settings: 'Settings',
      bir: 'BIR Forms'
    };
    return names[module] || module;
  };

  const getActionDisplayName = (action: string) => {
    const names: Record<string, string> = {
      view: 'View',
      create: 'Create',
      edit: 'Edit',
      delete: 'Delete',
      export: 'Export',
      transfer: 'Transfer'
    };
    return names[action] || action;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h2 className="text-lg font-medium text-gray-900">Role Permissions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Role Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Role to View Permissions
            </label>
            <div className="flex flex-wrap gap-2">
              {(['admin', 'manager', 'cashier', 'accountant'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => onRoleChange(role)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    selectedRole === role
                      ? getRoleBadgeColor(role)
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Current Role Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full border ${getRoleBadgeColor(selectedRole)}`}>
                {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
              </span>
              <span className="text-sm text-blue-700">
                has access to {rolePermissions.length} modules
              </span>
            </div>
            <p className="text-sm text-blue-700">
              Below are the detailed permissions for the {selectedRole} role. 
              {selectedRole === 'admin' ? ' Administrators have full system access.' : ''}
              {selectedRole === 'manager' ? ' Managers can oversee most operations but have limited administrative access.' : ''}
              {selectedRole === 'cashier' ? ' Cashiers have access to customer-facing operations and basic inventory viewing.' : ''}
              {selectedRole === 'accountant' ? ' Accountants focus on financial operations, reporting, and compliance.' : ''}
            </p>
          </div>

          {/* Permissions Matrix */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Module
                    </th>
                    {allActions.map((action) => (
                      <th key={action} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {getActionDisplayName(action)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allModules.map((module) => {
                    const hasAnyPermission = rolePermissions.some(p => p.module === module);
                    return (
                      <tr key={module} className={hasAnyPermission ? '' : 'opacity-40'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {getModuleDisplayName(module)}
                            </div>
                          </div>
                        </td>
                        {allActions.map((action) => {
                          const hasPermission = hasModulePermission(module, action);
                          return (
                            <td key={action} className="px-3 py-4 whitespace-nowrap text-center">
                              {hasAnyPermission ? (
                                hasPermission ? (
                                  <Check className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                  <Minus className="h-4 w-4 text-gray-300 mx-auto" />
                                )
                              ) : (
                                <Minus className="h-4 w-4 text-gray-300 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Permission granted</span>
            </div>
            <div className="flex items-center space-x-2">
              <Minus className="h-4 w-4 text-gray-300" />
              <span>Permission denied</span>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {rolePermissions.length}
              </div>
              <div className="text-sm text-gray-600">Accessible Modules</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {rolePermissions.reduce((total, perm) => total + perm.actions.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Permissions</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {rolePermissions.filter(p => p.actions.includes('create')).length}
              </div>
              <div className="text-sm text-gray-600">Create Permissions</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {rolePermissions.filter(p => p.actions.includes('delete')).length}
              </div>
              <div className="text-sm text-gray-600">Delete Permissions</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RolePermissions;