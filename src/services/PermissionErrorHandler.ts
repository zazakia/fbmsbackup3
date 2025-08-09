import {
  ModuleId,
  ModuleLoadingError,
  ModuleLoadingErrorType,
  ModuleConfig
} from '../types/moduleLoading';
import { UserRole } from '../types/auth';
import { hasPermission, canAccessModule, ROLE_PERMISSIONS } from '../utils/permissions';
import { useAuthStore } from '../store/supabaseAuthStore';

/**
 * Permission Error Handler Service
 * 
 * Provides comprehensive permission-aware error handling for module loading.
 * Features:
 * - Permission validation before module loading attempts
 * - Role-specific error messages with clear requirements
 * - Permission change detection during user sessions
 * - "Request access" functionality with admin contact options
 * - Real-time permission monitoring and session management
 */
export class PermissionErrorHandler {
  private permissionChangeListeners: ((error: ModuleLoadingError) => void)[] = [];
  private adminContactInfo = {
    email: 'admin@yourcompany.com',
    name: 'System Administrator',
    phone: '+63-XXX-XXX-XXXX'
  };

  /**
   * Validates user permissions before module loading
   */
  validatePermissions(moduleConfig: ModuleConfig, userRole: UserRole): ModuleLoadingError | null {
    // Check if module requires specific permissions
    if (moduleConfig.requiredPermissions.length > 0) {
      const hasAllPermissions = moduleConfig.requiredPermissions.every(permission => 
        hasPermission(userRole, moduleConfig.id, permission.split(':')[1] || 'read')
      );
      
      if (!hasAllPermissions) {
        return this.createPermissionError(
          ModuleLoadingErrorType.PERMISSION_DENIED,
          moduleConfig.id,
          userRole,
          'specific_permissions',
          moduleConfig.requiredPermissions
        );
      }
    }

    // Check if user role has access to module
    if (moduleConfig.requiredRoles.length > 0 && !moduleConfig.requiredRoles.includes(userRole)) {
      return this.createPermissionError(
        ModuleLoadingErrorType.ROLE_INSUFFICIENT,
        moduleConfig.id,
        userRole,
        'insufficient_role',
        moduleConfig.requiredRoles
      );
    }

    // Use existing permission system as final check
    if (!canAccessModule(userRole, moduleConfig.id)) {
      return this.createPermissionError(
        ModuleLoadingErrorType.PERMISSION_DENIED,
        moduleConfig.id,
        userRole,
        'module_access_denied'
      );
    }

    return null; // All permissions valid
  }

  /**
   * Creates role-specific error messages with clear requirements
   */
  private createPermissionError(
    errorType: ModuleLoadingErrorType,
    moduleId: ModuleId,
    userRole: UserRole,
    reason: string,
    requiredData?: string[]
  ): ModuleLoadingError {
    const moduleDisplayName = this.getModuleDisplayName(moduleId);
    const message = this.generateRoleSpecificMessage(errorType, moduleDisplayName, userRole, reason, requiredData);
    
    return {
      type: errorType,
      moduleId,
      message,
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      userRole,
      retryCount: 0,
      maxRetries: 0, // Permission errors are not retryable
      recoverable: false,
      fallbackSuggestions: this.getSuggestedAlternatives(moduleId, userRole),
      context: {
        reason,
        requiredPermissions: requiredData,
        currentRole: userRole,
        availableRoles: this.getAvailableRoles(moduleId),
        adminContact: this.adminContactInfo,
        requestAccessAvailable: true
      }
    };
  }

  /**
   * Generates role-specific error messages
   */
  private generateRoleSpecificMessage(
    errorType: ModuleLoadingErrorType,
    moduleDisplayName: string,
    userRole: UserRole,
    reason: string,
    requiredData?: string[]
  ): string {
    const roleDisplayName = this.getRoleDisplayName(userRole);
    
    switch (reason) {
      case 'specific_permissions':
        const permissions = requiredData?.map(p => p.split(':')[1] || p).join(', ') || 'access';
        return `Your ${roleDisplayName} role doesn't have ${permissions} permissions for ${moduleDisplayName}. Contact your administrator to request access.`;
      
      case 'insufficient_role':
        const requiredRoles = requiredData?.map(r => this.getRoleDisplayName(r as UserRole)).join(' or ') || 'higher privileges';
        return `${moduleDisplayName} requires ${requiredRoles} access. Your current ${roleDisplayName} role is insufficient. Please contact your administrator for role upgrade.`;
      
      case 'module_access_denied':
        return `Access to ${moduleDisplayName} is restricted for ${roleDisplayName} users. This module may not be included in your current subscription or role permissions.`;
      
      default:
        return `You don't have permission to access ${moduleDisplayName}. Contact your administrator if you believe this is an error.`;
    }
  }

  /**
   * Gets suggested alternative modules based on user role
   */
  private getSuggestedAlternatives(moduleId: ModuleId, userRole: UserRole): ModuleId[] {
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    const accessibleModules = userPermissions.map(p => p.module as ModuleId);
    
    // Define module relationship mapping for better suggestions
    const moduleRelationships: Partial<Record<ModuleId, ModuleId[]>> = {
      'expenses': ['accounting', 'dashboard'],
      'manager-operations': ['dashboard', 'reports'],
      'bir-forms': ['accounting', 'reports'],
      'payroll': ['accounting', 'dashboard'],
      'cloud-backup': ['settings'],
      'purchases': ['inventory', 'accounting'],
      'pos': ['sales', 'inventory'],
      'accounting': ['expenses', 'reports'],
      'reports': ['dashboard'],
      'marketing': ['customers', 'dashboard'],
      'loyalty': ['customers', 'marketing'],
      'branches': ['settings', 'dashboard']
    };

    const relatedModules = moduleRelationships[moduleId] || ['dashboard'];
    
    // Return only modules the user can actually access
    return relatedModules.filter(module => accessibleModules.includes(module));
  }

  /**
   * Gets available roles that can access the module
   */
  private getAvailableRoles(moduleId: ModuleId): UserRole[] {
    const roles: UserRole[] = [];
    
    Object.entries(ROLE_PERMISSIONS).forEach(([role, permissions]) => {
      const hasAccess = permissions.some(p => p.module === moduleId);
      if (hasAccess) {
        roles.push(role as UserRole);
      }
    });
    
    return roles;
  }

  /**
   * Detects permission changes during user session
   */
  startPermissionMonitoring(currentUserRole: UserRole): () => void {
    let lastKnownRole = currentUserRole;
    
    const checkPermissionChanges = () => {
      // Get current user role from auth store
      const currentRole = this.getCurrentUserRole();
      
      if (currentRole !== lastKnownRole) {
        console.log(`Permission change detected: ${lastKnownRole} → ${currentRole}`);
        
        // Notify listeners about permission change
        const permissionChangeError: ModuleLoadingError = {
          type: ModuleLoadingErrorType.PERMISSION_DENIED,
          moduleId: 'dashboard', // Generic module for permission changes
          message: `Your role has changed from ${this.getRoleDisplayName(lastKnownRole)} to ${this.getRoleDisplayName(currentRole)}. Some modules may no longer be accessible.`,
          timestamp: new Date(),
          userId: this.getCurrentUserId(),
          userRole: currentRole,
          retryCount: 0,
          maxRetries: 0,
          recoverable: false,
          context: {
            previousRole: lastKnownRole,
            newRole: currentRole,
            permissionChange: true
          }
        };
        
        this.notifyPermissionChange(permissionChangeError);
        lastKnownRole = currentRole;
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkPermissionChanges, 30000);
    
    // Return cleanup function
    return () => {
      clearInterval(interval);
    };
  }

  /**
   * Creates request access functionality
   */
  createAccessRequest(moduleId: ModuleId, userRole: UserRole, reason?: string): {
    requestData: any;
    contactMethods: Array<{
      type: 'email' | 'phone' | 'internal';
      label: string;
      action: string;
      data: string;
    }>;
  } {
    const moduleDisplayName = this.getModuleDisplayName(moduleId);
    const userDisplayName = this.getRoleDisplayName(userRole);
    const requiredRoles = this.getAvailableRoles(moduleId);
    
    const requestData = {
      moduleId,
      moduleName: moduleDisplayName,
      requestingUser: {
        id: this.getCurrentUserId(),
        role: userRole,
        roleDisplayName: userDisplayName,
        timestamp: new Date().toISOString()
      },
      requiredRoles: requiredRoles.map(role => ({
        role,
        displayName: this.getRoleDisplayName(role)
      })),
      reason: reason || `User requires access to ${moduleDisplayName} module`,
      urgency: 'normal',
      businessJustification: `Access needed for ${moduleDisplayName} to perform job duties effectively`
    };

    const contactMethods = [
      {
        type: 'email' as const,
        label: 'Email Administrator',
        action: `mailto:${this.adminContactInfo.email}?subject=Access Request: ${moduleDisplayName}&body=${encodeURIComponent(this.generateEmailTemplate(requestData))}`,
        data: this.adminContactInfo.email
      },
      {
        type: 'phone' as const,
        label: 'Call Administrator',
        action: `tel:${this.adminContactInfo.phone}`,
        data: this.adminContactInfo.phone
      },
      {
        type: 'internal' as const,
        label: 'Submit Internal Request',
        action: 'submit_internal_request',
        data: JSON.stringify(requestData)
      }
    ];

    return { requestData, contactMethods };
  }

  /**
   * Generates email template for access requests
   */
  private generateEmailTemplate(requestData: any): string {
    return `Hello ${this.adminContactInfo.name},

I am requesting access to the ${requestData.moduleName} module in the business management system.

Current Details:
- User ID: ${requestData.requestingUser.id}
- Current Role: ${requestData.requestingUser.roleDisplayName}
- Module Requested: ${requestData.moduleName}
- Required Roles: ${requestData.requiredRoles.map((r: any) => r.displayName).join(' or ')}

Business Justification:
${requestData.businessJustification}

Additional Details:
${requestData.reason}

Please let me know if you need any additional information to process this request.

Thank you,
[Your Name]

---
This request was generated automatically on ${new Date().toLocaleString()}`;
  }

  /**
   * Subscribe to permission change events
   */
  subscribeToPermissionChanges(callback: (error: ModuleLoadingError) => void): () => void {
    this.permissionChangeListeners.push(callback);
    
    return () => {
      const index = this.permissionChangeListeners.indexOf(callback);
      if (index > -1) {
        this.permissionChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Update admin contact information
   */
  updateAdminContact(contactInfo: Partial<typeof this.adminContactInfo>): void {
    this.adminContactInfo = { ...this.adminContactInfo, ...contactInfo };
  }

  // Private helper methods

  private notifyPermissionChange(error: ModuleLoadingError): void {
    this.permissionChangeListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in permission change listener:', err);
      }
    });
  }

  private getCurrentUserId(): string {
    // In a real implementation, this would get from auth store
    try {
      const authData = useAuthStore.getState();
      return authData.user?.id || 'unknown-user';
    } catch {
      return 'unknown-user';
    }
  }

  private getCurrentUserRole(): UserRole {
    try {
      const authData = useAuthStore.getState();
      return authData.user?.user_metadata?.role || 'employee';
    } catch {
      return 'employee';
    }
  }

  private getModuleDisplayName(moduleId: ModuleId): string {
    const displayNames: Record<ModuleId, string> = {
      dashboard: 'Dashboard',
      pos: 'Point of Sale',
      inventory: 'Inventory Management',
      accounting: 'Accounting',
      expenses: 'Expense Tracking',
      purchases: 'Purchase Management',
      payroll: 'Payroll Management',
      'bir-forms': 'BIR Forms',
      sales: 'Sales History',
      customers: 'Customer Management',
      'manager-operations': 'Manager Operations',
      marketing: 'Marketing Campaigns',
      loyalty: 'Loyalty Programs',
      gcash: 'GCash Integration',
      paymaya: 'PayMaya Integration',
      'cloud-backup': 'Cloud Backup',
      'electronic-receipts': 'Electronic Receipts',
      'product-history': 'Product History',
      branches: 'Branch Management',
      settings: 'Settings',
      help: 'Help & Support',
      reports: 'Reports & Analytics'
    };

    return displayNames[moduleId] || moduleId;
  }

  private getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      admin: 'Administrator',
      manager: 'Manager',
      cashier: 'Cashier',
      accountant: 'Accountant',
      employee: 'Employee'
    };

    return roleNames[role] || role;
  }
}

// Create and export singleton instance
export const permissionErrorHandler = new PermissionErrorHandler();
export default PermissionErrorHandler;