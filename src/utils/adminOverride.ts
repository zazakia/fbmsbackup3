/**
 * Admin Override Utilities
 * Ensures admin users always have full access regardless of other checks
 */

import React from 'react';
import { UserRole } from '../types/auth';

export const isAdmin = (userRole?: UserRole | null): boolean => {
  return userRole === 'admin';
};

export const hasAdminAccess = (userRole?: UserRole | null): boolean => {
  return isAdmin(userRole);
};

// Enhanced permission check that always allows admin
export const checkPermission = (
  userRole?: UserRole | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _module?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _action?: string
): boolean => {
  // Admin always has access
  if (isAdmin(userRole)) {
    return true;
  }
  
  // For non-admin users, use regular permission system
  // This is a fallback - the main permission system should handle this
  return false;
};

// Enhanced role check with admin override
export const checkRole = (
  userRole?: UserRole | null,
  requiredRole?: UserRole | UserRole[]
): boolean => {
  // Admin always has access
  if (isAdmin(userRole)) {
    return true;
  }
  
  if (!userRole || !requiredRole) {
    return false;
  }
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  
  return userRole === requiredRole;
};

// Debug helper to log permission checks
export const debugPermissionCheck = (
  component: string,
  userRole?: UserRole | null,
  module?: string,
  action?: string,
  result?: boolean
) => {
  if (import.meta.env.DEV) {
    console.log(`🔐 Permission Check [${component}]:`, {
      userRole,
      module,
      action,
      result,
      isAdmin: isAdmin(userRole)
    });
  }
};

// Component wrapper for admin access (remove JSX to fix build error)
export const withAdminOverride = <T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  requiredRole?: UserRole | UserRole[]
) => {
  return (props: T & { userRole?: UserRole }) => {
    const { userRole, ...rest } = props;
    
    // Allow admin access regardless of other checks
    if (isAdmin(userRole)) {
      return React.createElement(Component, rest as T);
    }
    
    // For non-admin, check required role
    if (requiredRole && !checkRole(userRole, requiredRole)) {
      return React.createElement('div', {
        className: "flex items-center justify-center min-h-[400px]"
      }, React.createElement('div', {
        className: "text-center"
      }, [
        React.createElement('div', { 
          key: 'icon',
          className: "text-gray-400 mb-4" 
        }, '🔒'),
        React.createElement('h3', {
          key: 'title',
          className: "text-lg font-medium text-gray-900 mb-2"
        }, 'Access Denied'),
        React.createElement('p', {
          key: 'message',
          className: "text-gray-600"
        }, `This feature requires ${Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole} role.`),
        React.createElement('p', {
          key: 'role',
          className: "text-sm text-gray-500 mt-2"
        }, [
          'Your current role: ',
          React.createElement('span', {
            key: 'role-value',
            className: "font-medium"
          }, userRole || 'none')
        ])
      ]));
    }
    
    return React.createElement(Component, rest as T);
  };
};