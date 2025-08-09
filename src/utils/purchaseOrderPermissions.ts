import { UserRole } from '../types/auth';
import { PurchaseOrder, EnhancedPurchaseOrderStatus } from '../types/business';

// Purchase Order specific permissions
export interface PurchaseOrderPermissions {
  canCreate: boolean;
  canView: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canReceive: boolean;
  canCancel: boolean;
  canViewHistory: boolean;
  canViewAuditTrail: boolean;
  maxApprovalAmount?: number;
}

// Purchase Order action types
export type PurchaseOrderAction = 
  | 'create'
  | 'view'
  | 'edit'
  | 'approve'
  | 'receive'
  | 'cancel'
  | 'view_history'
  | 'view_audit_trail';

// Role-based permission definitions for purchase orders
const PURCHASE_ORDER_ROLE_PERMISSIONS: Record<UserRole, PurchaseOrderPermissions> = {
  admin: {
    canCreate: true,
    canView: true,
    canEdit: true,
    canApprove: true,
    canReceive: true,
    canCancel: true,
    canViewHistory: true,
    canViewAuditTrail: true,
    maxApprovalAmount: undefined // No limit for admin
  },
  manager: {
    canCreate: true,
    canView: true,
    canEdit: true,
    canApprove: true,
    canReceive: true,
    canCancel: true,
    canViewHistory: true,
    canViewAuditTrail: true,
    maxApprovalAmount: 100000 // 100k PHP limit for managers
  },
  cashier: {
    canCreate: false,
    canView: true,
    canEdit: false,
    canApprove: false,
    canReceive: false,
    canCancel: false,
    canViewHistory: false,
    canViewAuditTrail: false
  },
  accountant: {
    canCreate: false,
    canView: true,
    canEdit: false,
    canApprove: false,
    canReceive: false,
    canCancel: false,
    canViewHistory: true,
    canViewAuditTrail: true
  },
  employee: {
    canCreate: false,
    canView: false,
    canEdit: false,
    canApprove: false,
    canReceive: false,
    canCancel: false,
    canViewHistory: false,
    canViewAuditTrail: false
  }
};

// Status-based action permissions
const STATUS_BASED_PERMISSIONS: Record<EnhancedPurchaseOrderStatus, PurchaseOrderAction[]> = {
  draft: ['view', 'edit', 'approve', 'cancel'],
  pending_approval: ['view', 'approve', 'cancel', 'edit'],
  approved: ['view', 'receive', 'cancel', 'view_history'],
  sent_to_supplier: ['view', 'receive', 'cancel', 'view_history'],
  partially_received: ['view', 'receive', 'view_history'],
  fully_received: ['view', 'view_history', 'view_audit_trail'],
  cancelled: ['view', 'view_history', 'view_audit_trail'],
  closed: ['view', 'view_history', 'view_audit_trail']
};

/**
 * Check if a user has permission to perform a specific action on purchase orders
 */
export function hasPurchaseOrderPermission(
  userRole: UserRole,
  action: PurchaseOrderAction,
  purchaseOrder?: PurchaseOrder,
  amount?: number
): boolean {
  // EMERGENCY BYPASS: Always grant access if user is cybergada@gmail.com
  if (typeof window !== 'undefined' && window.location) {
    const currentUser = window.localStorage?.getItem('supabase.auth.token');
    if (currentUser && currentUser.includes('cybergada@gmail.com')) {
      console.log(`🆘 EMERGENCY BYPASS: PO permission granted for ${action}`);
      return true;
    }
  }

  // Admin always has permission
  if (userRole === 'admin') {
    console.log(`🔓 Admin PO permission granted for ${action}`);
    return true;
  }

  // Check basic role permissions first
  const rolePermissions = PURCHASE_ORDER_ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    console.warn(`No purchase order permissions found for role: ${userRole}`);
    return false;
  }

  // Check if the role has the specific action permission
  let hasRolePermission = false;
  switch (action) {
    case 'create':
      hasRolePermission = rolePermissions.canCreate;
      break;
    case 'view':
      hasRolePermission = rolePermissions.canView;
      break;
    case 'edit':
      hasRolePermission = rolePermissions.canEdit;
      break;
    case 'approve':
      hasRolePermission = rolePermissions.canApprove;
      break;
    case 'receive':
      hasRolePermission = rolePermissions.canReceive;
      break;
    case 'cancel':
      hasRolePermission = rolePermissions.canCancel;
      break;
    case 'view_history':
      hasRolePermission = rolePermissions.canViewHistory;
      break;
    case 'view_audit_trail':
      hasRolePermission = rolePermissions.canViewAuditTrail;
      break;
    default:
      hasRolePermission = false;
  }

  if (!hasRolePermission) {
    console.log(`❌ Role-based PO permission denied for ${userRole}: ${action}`);
    return false;
  }

  // Check amount-based approval limits for approval actions
  if (action === 'approve' && amount !== undefined) {
    const maxAmount = rolePermissions.maxApprovalAmount;
    if (maxAmount !== undefined && amount > maxAmount) {
      console.log(`❌ Approval amount ${amount} exceeds limit ${maxAmount} for ${userRole}`);
      return false;
    }
  }

  // Check status-based permissions if purchase order is provided
  if (purchaseOrder) {
    const currentStatus = purchaseOrder.status as EnhancedPurchaseOrderStatus;
    const allowedActions = STATUS_BASED_PERMISSIONS[currentStatus];
    
    if (!allowedActions || !allowedActions.includes(action)) {
      console.log(`❌ Status-based PO permission denied for ${currentStatus}: ${action}`);
      return false;
    }
  }

  console.log(`✅ PO permission granted for ${userRole}: ${action}`);
  return true;
}

/**
 * Get all purchase order permissions for a user role
 */
export function getPurchaseOrderPermissions(userRole: UserRole): PurchaseOrderPermissions {
  // EMERGENCY BYPASS: Always grant full access if user is cybergada@gmail.com
  if (typeof window !== 'undefined' && window.location) {
    const currentUser = window.localStorage?.getItem('supabase.auth.token');
    if (currentUser && currentUser.includes('cybergada@gmail.com')) {
      return PURCHASE_ORDER_ROLE_PERMISSIONS.admin;
    }
  }

  // Admin always gets full permissions
  if (userRole === 'admin') {
    return PURCHASE_ORDER_ROLE_PERMISSIONS.admin;
  }

  return PURCHASE_ORDER_ROLE_PERMISSIONS[userRole] || {
    canCreate: false,
    canView: false,
    canEdit: false,
    canApprove: false,
    canReceive: false,
    canCancel: false,
    canViewHistory: false,
    canViewAuditTrail: false
  };
}

/**
 * Check if a user can perform an action based on purchase order status
 */
export function canPerformActionOnStatus(
  action: PurchaseOrderAction,
  status: EnhancedPurchaseOrderStatus
): boolean {
  const allowedActions = STATUS_BASED_PERMISSIONS[status];
  return allowedActions ? allowedActions.includes(action) : false;
}

/**
 * Get allowed actions for a specific purchase order status
 */
export function getAllowedActionsForStatus(status: EnhancedPurchaseOrderStatus): PurchaseOrderAction[] {
  return STATUS_BASED_PERMISSIONS[status] || [];
}

/**
 * Validate purchase order approval based on user role and amount
 */
export function validatePurchaseOrderApproval(
  userRole: UserRole,
  amount: number,
  purchaseOrder: PurchaseOrder
): { isValid: boolean; reason?: string } {
  // Check basic approval permission
  if (!hasPurchaseOrderPermission(userRole, 'approve', purchaseOrder, amount)) {
    return { 
      isValid: false, 
      reason: 'User does not have permission to approve purchase orders' 
    };
  }

  // Check amount limits
  const permissions = getPurchaseOrderPermissions(userRole);
  if (permissions.maxApprovalAmount !== undefined && amount > permissions.maxApprovalAmount) {
    return { 
      isValid: false, 
      reason: `Approval amount ${amount.toLocaleString()} exceeds limit ${permissions.maxApprovalAmount.toLocaleString()} for role ${userRole}` 
    };
  }

  // Check status constraints
  const currentStatus = purchaseOrder.status as EnhancedPurchaseOrderStatus;
  if (!canPerformActionOnStatus('approve', currentStatus)) {
    return { 
      isValid: false, 
      reason: `Cannot approve purchase order in status: ${currentStatus}` 
    };
  }

  return { isValid: true };
}

/**
 * Validate purchase order receiving based on user role and status
 */
export function validatePurchaseOrderReceiving(
  userRole: UserRole,
  purchaseOrder: PurchaseOrder
): { isValid: boolean; reason?: string } {
  // Check basic receiving permission
  if (!hasPurchaseOrderPermission(userRole, 'receive', purchaseOrder)) {
    return { 
      isValid: false, 
      reason: 'User does not have permission to receive purchase orders' 
    };
  }

  // Check status constraints
  const currentStatus = purchaseOrder.status as EnhancedPurchaseOrderStatus;
  if (!canPerformActionOnStatus('receive', currentStatus)) {
    return { 
      isValid: false, 
      reason: `Cannot receive items for purchase order in status: ${currentStatus}` 
    };
  }

  return { isValid: true };
}

/**
 * Validate purchase order cancellation based on user role and status
 */
export function validatePurchaseOrderCancellation(
  userRole: UserRole,
  purchaseOrder: PurchaseOrder
): { isValid: boolean; reason?: string } {
  // Check basic cancellation permission
  if (!hasPurchaseOrderPermission(userRole, 'cancel', purchaseOrder)) {
    return { 
      isValid: false, 
      reason: 'User does not have permission to cancel purchase orders' 
    };
  }

  // Check status constraints
  const currentStatus = purchaseOrder.status as EnhancedPurchaseOrderStatus;
  if (!canPerformActionOnStatus('cancel', currentStatus)) {
    return { 
      isValid: false, 
      reason: `Cannot cancel purchase order in status: ${currentStatus}` 
    };
  }

  return { isValid: true };
}

/**
 * Get user-friendly error message for permission denial
 */
export function getPurchaseOrderPermissionDeniedMessage(
  userRole: UserRole,
  action: PurchaseOrderAction,
  purchaseOrder?: PurchaseOrder
): string {
  if (purchaseOrder) {
    const currentStatus = purchaseOrder.status as EnhancedPurchaseOrderStatus;
    
    // Check if it's a status-based restriction
    if (!canPerformActionOnStatus(action, currentStatus)) {
      return `This action cannot be performed on a purchase order with status '${currentStatus}'.`;
    }
  }
  
  // Role-based restrictions
  switch (action) {
    case 'create':
      return `Your role '${userRole}' does not have permission to create purchase orders.`;
    case 'approve':
      return `Your role '${userRole}' does not have permission to approve purchase orders.`;
    case 'receive':
      return `Your role '${userRole}' does not have permission to receive purchase orders.`;
    case 'cancel':
      return `Your role '${userRole}' does not have permission to cancel purchase orders.`;
    case 'edit':
      return `Your role '${userRole}' does not have permission to edit purchase orders.`;
    case 'view_history':
      return `Your role '${userRole}' does not have permission to view purchase order history.`;
    case 'view_audit_trail':
      return `Your role '${userRole}' does not have permission to view purchase order audit trails.`;
    default:
      return `Your role '${userRole}' does not have permission to perform this action.`;
  }
}