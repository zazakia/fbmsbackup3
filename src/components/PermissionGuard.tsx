import React from 'react';
import { Shield, Lock } from 'lucide-react';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { hasPermission, canAccessModule } from '../utils/permissions';
import { UserRole } from '../types/auth';

interface PermissionGuardProps {
  module: string;
  action?: string;
  requiredRole?: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  action = 'view',
  requiredRole,
  children,
  fallback
}) => {
  const { user, isAuthenticated } = useSupabaseAuthStore();

  // Check if user is authenticated - ProtectedRoute should handle this, not PermissionGuard
  if (!user || !isAuthenticated) {
    // Return null to let ProtectedRoute handle authentication
    return null;
  }

  // Check specific role requirement
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">
            This feature requires {requiredRole} role or higher.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Your current role: <span className="font-medium">{user?.role}</span>
          </p>
        </div>
      </div>
    );
  }

  // Check module access permission
  if (!canAccessModule(user?.role, module)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to access the {module} module.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Your current role: <span className="font-medium">{user?.role}</span>
          </p>
        </div>
      </div>
    );
  }

  // Check specific action permission
  if (!hasPermission(user?.role, module, action)) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Insufficient Permissions</h3>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to {action} in the {module} module.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Your current role: <span className="font-medium">{user?.role}</span>
          </p>
        </div>
      </div>
    );
  }

  // Check if user account is active
  if (!user?.isActive) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Account Inactive</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your account has been deactivated. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  // User has required permissions, render children
  return <>{children}</>;
};

export default PermissionGuard;