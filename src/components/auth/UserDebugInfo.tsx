/**
 * User Debug Info Component
 * Shows current user authentication and role status for debugging
 */

import React, { useEffect, useState } from 'react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useSettingsStore } from '../../store/settingsStore';
import { canAccessModule, getUserAccessibleModules } from '../../utils/permissions';
import { User, Shield, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

const UserDebugInfo: React.FC = () => {
  const { user, isAuthenticated } = useSupabaseAuthStore();
  const { menuVisibility } = useSettingsStore();
  const [accessibleModules, setAccessibleModules] = useState<string[]>([]);

  useEffect(() => {
    if (user?.role) {
      const modules = getUserAccessibleModules(user.role);
      setAccessibleModules(modules);
    }
  }, [user?.role]);

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-700 font-medium">Not Authenticated</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg max-w-md">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">User Debug Info</span>
        </div>
        
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Email:</span> {user.email}
          </div>
          <div>
            <span className="font-medium">Role:</span> 
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
              user.role === 'admin' ? 'bg-red-100 text-red-800' :
              user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
              user.role === 'cashier' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {user.role}
            </span>
          </div>
          <div>
            <span className="font-medium">Authenticated:</span> {isAuthenticated ? '✅' : '❌'}
          </div>
          <div>
            <span className="font-medium">Active:</span> {user.isActive ? '✅' : '❌'}
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="font-medium text-sm mb-2">Accessible Modules:</div>
          <div className="flex flex-wrap gap-1">
            {accessibleModules.map(module => (
              <span key={module} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {module}
              </span>
            ))}
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="font-medium text-sm mb-2">Admin Access Check:</div>
          <div className="space-y-1 text-xs">
            <div>
              Admin Dashboard: {canAccessModule(user.role, 'admin-dashboard') ? '✅' : '❌'}
            </div>
            <div>
              Menu Visibility (adminDashboard): {menuVisibility.adminDashboard ? '✅' : '❌'}
            </div>
            <div>
              Role Check (admin): {user.role === 'admin' ? '✅' : '❌'}
            </div>
          </div>
        </div>

        <div className="border-t pt-3">
          <button
            onClick={() => {
              console.log('=== USER DEBUG INFO ===');
              console.log('User object:', user);
              console.log('Is authenticated:', isAuthenticated);
              console.log('Accessible modules:', accessibleModules);
              console.log('Menu visibility settings:', menuVisibility);
              console.log('Admin dashboard access:', canAccessModule(user.role, 'admin-dashboard'));
            }}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
          >
            Log Full Debug Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDebugInfo;