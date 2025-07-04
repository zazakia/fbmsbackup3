import { UserRole } from '../types/auth';

export interface Permission {
  module: string;
  actions: string[];
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { module: 'dashboard', actions: ['view', 'edit'] },
    { module: 'pos', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'inventory', actions: ['view', 'create', 'edit', 'delete', 'transfer'] },
    { module: 'customers', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'purchases', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'expenses', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'accounting', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'payroll', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'reports', actions: ['view', 'export'] },
    { module: 'branches', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'users', actions: ['view', 'create', 'edit', 'delete'] },
    { module: 'settings', actions: ['view', 'edit'] },
    { module: 'bir', actions: ['view', 'create', 'edit'] },
    { module: 'admin-dashboard', actions: ['view', 'monitor', 'manage'] },
    { module: 'system-monitoring', actions: ['view', 'configure'] },
    { module: 'security', actions: ['view', 'manage'] }
  ],
  manager: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'pos', actions: ['view', 'create', 'edit'] },
    { module: 'inventory', actions: ['view', 'create', 'edit', 'transfer'] },
    { module: 'customers', actions: ['view', 'create', 'edit'] },
    { module: 'purchases', actions: ['view', 'create', 'edit'] },
    { module: 'expenses', actions: ['view', 'create', 'edit'] },
    { module: 'payroll', actions: ['view', 'create', 'edit'] },
    { module: 'reports', actions: ['view', 'export'] },
    { module: 'branches', actions: ['view'] },
    { module: 'users', actions: ['view'] },
    { module: 'bir', actions: ['view'] }
  ],
  cashier: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'pos', actions: ['view', 'create'] },
    { module: 'inventory', actions: ['view'] },
    { module: 'customers', actions: ['view', 'create', 'edit'] },
    { module: 'reports', actions: ['view'] }
  ],
  accountant: [
    { module: 'dashboard', actions: ['view'] },
    { module: 'accounting', actions: ['view', 'create', 'edit'] },
    { module: 'expenses', actions: ['view', 'create', 'edit'] },
    { module: 'payroll', actions: ['view', 'create', 'edit'] },
    { module: 'reports', actions: ['view', 'export'] },
    { module: 'bir', actions: ['view', 'create', 'edit'] },
    { module: 'purchases', actions: ['view'] },
    { module: 'customers', actions: ['view'] }
  ]
};

export function hasPermission(userRole: UserRole, module: string, action: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    console.warn(`No permissions found for role: ${userRole}`);
    return false;
  }
  const modulePermission = rolePermissions.find(p => p.module === module);
  return modulePermission ? modulePermission.actions.includes(action) : false;
}

export function canAccessModule(userRole: UserRole, module: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    console.warn(`No permissions found for role: ${userRole}`);
    return false;
  }
  return rolePermissions.some(p => p.module === module);
}

export function getModuleActions(userRole: UserRole, module: string): string[] {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    console.warn(`No permissions found for role: ${userRole}`);
    return [];
  }
  const modulePermission = rolePermissions.find(p => p.module === module);
  return modulePermission ? modulePermission.actions : [];
}

export function getUserAccessibleModules(userRole: UserRole): string[] {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    console.warn(`No permissions found for role: ${userRole}`);
    return [];
  }
  return rolePermissions.map(p => p.module);
}