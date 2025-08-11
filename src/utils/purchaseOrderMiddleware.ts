import { UserRole } from '../types/auth';
import { PurchaseOrder } from '../types/business';
import { 
  hasPurchaseOrderPermission, 
  validatePurchaseOrderApproval,
  validatePurchaseOrderReceiving,
  validatePurchaseOrderCancellation,
  getPurchaseOrderPermissionDeniedMessage,
  PurchaseOrderAction
} from './purchaseOrderPermissions';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

// Permission check result interface
export interface PermissionCheckResult {
  allowed: boolean;
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

// User context for permission checks
export interface UserContext {
  userId: string;
  userRole: UserRole;
  email?: string;
  fullName?: string;
}

/**
 * Get current user context from auth store
 */
export function getCurrentUserContext(): UserContext | null {
  const { user, userRole } = useSupabaseAuthStore.getState();
  
  if (!user || !userRole) {
    return null;
  }

  return {
    userId: user.id,
    userRole: userRole as UserRole,
    email: (user as any).email || undefined,
    fullName: (user as any).user_metadata?.full_name || undefined
  };
}

/**
 * Middleware function to check purchase order permissions before API calls
 */
export function checkPurchaseOrderPermission(
  action: PurchaseOrderAction,
  purchaseOrder?: PurchaseOrder,
  amount?: number
): PermissionCheckResult {
  // Get current user context
  const userContext = getCurrentUserContext();
  
  if (!userContext) {
    return {
      allowed: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required to perform this action',
        statusCode: 401
      }
    };
  }

  // Check if user has the required permission
  const hasPermission = hasPurchaseOrderPermission(
    userContext.userRole,
    action,
    purchaseOrder,
    amount
  );

  if (!hasPermission) {
    const message = getPurchaseOrderPermissionDeniedMessage(
      userContext.userRole,
      action,
      purchaseOrder
    );

    return {
      allowed: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message,
        statusCode: 403
      }
    };
  }

  return { allowed: true };
}

/**
 * Specific middleware for purchase order approval
 */
export function checkPurchaseOrderApprovalPermission(
  purchaseOrder: PurchaseOrder
): PermissionCheckResult {
  const userContext = getCurrentUserContext();
  
  if (!userContext) {
    return {
      allowed: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required to approve purchase orders',
        statusCode: 401
      }
    };
  }

  // Validate approval permission with amount check
  const validation = validatePurchaseOrderApproval(
    userContext.userRole,
    purchaseOrder.total,
    purchaseOrder
  );

  if (!validation.isValid) {
    return {
      allowed: false,
      error: {
        code: 'APPROVAL_NOT_ALLOWED',
        message: validation.reason || 'Purchase order approval not allowed',
        statusCode: 403
      }
    };
  }

  return { allowed: true };
}

/**
 * Specific middleware for purchase order receiving
 */
export function checkPurchaseOrderReceivingPermission(
  purchaseOrder: PurchaseOrder
): PermissionCheckResult {
  const userContext = getCurrentUserContext();
  
  if (!userContext) {
    return {
      allowed: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required to receive purchase orders',
        statusCode: 401
      }
    };
  }

  // Validate receiving permission
  const validation = validatePurchaseOrderReceiving(
    userContext.userRole,
    purchaseOrder
  );

  if (!validation.isValid) {
    return {
      allowed: false,
      error: {
        code: 'RECEIVING_NOT_ALLOWED',
        message: validation.reason || 'Purchase order receiving not allowed',
        statusCode: 403
      }
    };
  }

  return { allowed: true };
}

/**
 * Specific middleware for purchase order cancellation
 */
export function checkPurchaseOrderCancellationPermission(
  purchaseOrder: PurchaseOrder
): PermissionCheckResult {
  const userContext = getCurrentUserContext();
  
  if (!userContext) {
    return {
      allowed: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required to cancel purchase orders',
        statusCode: 401
      }
    };
  }

  // Validate cancellation permission
  const validation = validatePurchaseOrderCancellation(
    userContext.userRole,
    purchaseOrder
  );

  if (!validation.isValid) {
    return {
      allowed: false,
      error: {
        code: 'CANCELLATION_NOT_ALLOWED',
        message: validation.reason || 'Purchase order cancellation not allowed',
        statusCode: 403
      }
    };
  }

  return { allowed: true };
}

/**
 * Generic wrapper for API functions with permission checking
 */
export async function withPurchaseOrderPermission<T>(
  action: PurchaseOrderAction,
  apiFunction: () => Promise<T>,
  purchaseOrder?: PurchaseOrder,
  amount?: number
): Promise<T> {
  const permissionCheck = checkPurchaseOrderPermission(action, purchaseOrder, amount);
  
  if (!permissionCheck.allowed) {
    const error = permissionCheck.error!;
    throw new Error(`${error.code}: ${error.message}`);
  }

  return await apiFunction();
}

/**
 * Wrapper for purchase order approval API calls
 */
export async function withApprovalPermission<T>(
  purchaseOrder: PurchaseOrder,
  apiFunction: () => Promise<T>
): Promise<T> {
  const permissionCheck = checkPurchaseOrderApprovalPermission(purchaseOrder);
  
  if (!permissionCheck.allowed) {
    const error = permissionCheck.error!;
    throw new Error(`${error.code}: ${error.message}`);
  }

  return await apiFunction();
}

/**
 * Wrapper for purchase order receiving API calls
 */
export async function withReceivingPermission<T>(
  purchaseOrder: PurchaseOrder,
  apiFunction: () => Promise<T>
): Promise<T> {
  const permissionCheck = checkPurchaseOrderReceivingPermission(purchaseOrder);
  
  if (!permissionCheck.allowed) {
    const error = permissionCheck.error!;
    throw new Error(`${error.code}: ${error.message}`);
  }

  return await apiFunction();
}

/**
 * Wrapper for purchase order cancellation API calls
 */
export async function withCancellationPermission<T>(
  purchaseOrder: PurchaseOrder,
  apiFunction: () => Promise<T>
): Promise<T> {
  const permissionCheck = checkPurchaseOrderCancellationPermission(purchaseOrder);
  
  if (!permissionCheck.allowed) {
    const error = permissionCheck.error!;
    throw new Error(`${error.code}: ${error.message}`);
  }

  return await apiFunction();
}

/**
 * Log permission check attempts for audit purposes
 */
export function logPermissionCheck(
  action: PurchaseOrderAction,
  allowed: boolean,
  userContext?: UserContext,
  purchaseOrder?: PurchaseOrder,
  reason?: string
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    action,
    allowed,
    userId: userContext?.userId || 'anonymous',
    userRole: userContext?.userRole || 'unknown',
    purchaseOrderId: purchaseOrder?.id,
    purchaseOrderNumber: purchaseOrder?.poNumber,
    reason: reason || (allowed ? 'Permission granted' : 'Permission denied'),
    ip: typeof window !== 'undefined' ? 
      (window.navigator as unknown as { connection?: { effectiveType?: string } })?.connection?.effectiveType : undefined
  };

  console.log('[PURCHASE_ORDER_PERMISSION_CHECK]', logData);
  
  // In production, you might want to send this to a logging service
  // logToAuditService(logData);
}

/**
 * Enhanced permission checker with logging
 */
export function checkPurchaseOrderPermissionWithLogging(
  action: PurchaseOrderAction,
  purchaseOrder?: PurchaseOrder,
  amount?: number
): PermissionCheckResult {
  const userContext = getCurrentUserContext();
  const result = checkPurchaseOrderPermission(action, purchaseOrder, amount);
  
  logPermissionCheck(
    action,
    result.allowed,
    userContext || undefined,
    purchaseOrder,
    result.error?.message
  );
  
  return result;
}