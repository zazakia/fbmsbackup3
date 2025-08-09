import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../types/business';
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
  receivePurchaseOrder
} from './purchases';
import {
  withPurchaseOrderPermission,
  withApprovalPermission,
  withReceivingPermission,
  withCancellationPermission,
  checkPurchaseOrderPermissionWithLogging
} from '../utils/purchaseOrderMiddleware';

// Interface for API responses with permission checking
interface PermissionAwareResponse<T> {
  data: T | null;
  error: Error | null;
  permissionError?: {
    code: string;
    message: string;
  };
}

/**
 * Create purchase order with permission validation
 */
export async function createPurchaseOrderWithPermission(
  purchaseOrder: Omit<PurchaseOrder, 'id' | 'createdAt'>
): Promise<PermissionAwareResponse<PurchaseOrder>> {
  try {
    const result = await withPurchaseOrderPermission(
      'create',
      () => createPurchaseOrder(purchaseOrder)
    );
    
    return {
      data: result.data,
      error: result.error
    };
  } catch (permissionError) {
    const errorMessage = permissionError instanceof Error ? permissionError.message : 'Permission denied';
    const [code, ...messageParts] = errorMessage.split(': ');
    
    return {
      data: null,
      error: null,
      permissionError: {
        code: code || 'PERMISSION_DENIED',
        message: messageParts.join(': ') || errorMessage
      }
    };
  }
}

/**
 * Update purchase order with permission validation
 */
export async function updatePurchaseOrderWithPermission(
  id: string,
  updates: Partial<Omit<PurchaseOrder, 'id' | 'createdAt'>>,
  requireApprovalPermission = false
): Promise<PermissionAwareResponse<PurchaseOrder>> {
  try {
    // Get current purchase order for permission validation
    const currentResult = await getPurchaseOrder(id);
    if (currentResult.error || !currentResult.data) {
      return {
        data: null,
        error: currentResult.error || new Error('Purchase order not found')
      };
    }

    const currentPO = currentResult.data;
    
    // Determine the appropriate action based on what's being updated
    let action: 'edit' | 'approve' | 'cancel' = 'edit';
    
    if (updates.status) {
      if (updates.status === 'approved' || requireApprovalPermission) {
        action = 'approve';
      } else if (updates.status === 'cancelled') {
        action = 'cancel';
      }
    }

    // Use specific permission wrappers for sensitive actions
    let result;
    if (action === 'approve') {
      result = await withApprovalPermission(currentPO, () => updatePurchaseOrder(id, updates));
    } else if (action === 'cancel') {
      result = await withCancellationPermission(currentPO, () => updatePurchaseOrder(id, updates));
    } else {
      result = await withPurchaseOrderPermission(
        'edit',
        () => updatePurchaseOrder(id, updates),
        currentPO
      );
    }
    
    return {
      data: result.data,
      error: result.error
    };
  } catch (permissionError) {
    const errorMessage = permissionError instanceof Error ? permissionError.message : 'Permission denied';
    const [code, ...messageParts] = errorMessage.split(': ');
    
    return {
      data: null,
      error: null,
      permissionError: {
        code: code || 'PERMISSION_DENIED',
        message: messageParts.join(': ') || errorMessage
      }
    };
  }
}

/**
 * Approve purchase order with permission validation and amount checking
 */
export async function approvePurchaseOrderWithPermission(
  id: string,
  approvalNotes?: string
): Promise<PermissionAwareResponse<PurchaseOrder>> {
  try {
    // Get current purchase order for permission validation
    const currentResult = await getPurchaseOrder(id);
    if (currentResult.error || !currentResult.data) {
      return {
        data: null,
        error: currentResult.error || new Error('Purchase order not found')
      };
    }

    const purchaseOrder = currentResult.data;
    
    // Validate status can be approved
    if (!['draft', 'pending'].includes(purchaseOrder.status)) {
      return {
        data: null,
        error: new Error(`Cannot approve purchase order in status: ${purchaseOrder.status}`)
      };
    }

    const result = await withApprovalPermission(
      purchaseOrder,
      () => updatePurchaseOrder(id, { 
        status: 'approved' as PurchaseOrderStatus,
        // Add approval notes if supported in future
      })
    );
    
    return {
      data: result.data,
      error: result.error
    };
  } catch (permissionError) {
    const errorMessage = permissionError instanceof Error ? permissionError.message : 'Permission denied';
    const [code, ...messageParts] = errorMessage.split(': ');
    
    return {
      data: null,
      error: null,
      permissionError: {
        code: code || 'APPROVAL_NOT_ALLOWED',
        message: messageParts.join(': ') || errorMessage
      }
    };
  }
}

/**
 * Receive purchase order with permission validation
 */
export async function receivePurchaseOrderWithPermission(
  id: string,
  receivedItems?: PurchaseOrderItem[],
  context?: {
    receivedBy?: string;
    reason?: string;
    timestamp?: Date;
  }
): Promise<PermissionAwareResponse<PurchaseOrder>> {
  try {
    // Get current purchase order for permission validation
    const currentResult = await getPurchaseOrder(id);
    if (currentResult.error || !currentResult.data) {
      return {
        data: null,
        error: currentResult.error || new Error('Purchase order not found')
      };
    }

    const purchaseOrder = currentResult.data;
    
    const result = await withReceivingPermission(
      purchaseOrder,
      () => receivePurchaseOrder(id, receivedItems, context)
    );
    
    return {
      data: result.data,
      error: result.error
    };
  } catch (permissionError) {
    const errorMessage = permissionError instanceof Error ? permissionError.message : 'Permission denied';
    const [code, ...messageParts] = errorMessage.split(': ');
    
    return {
      data: null,
      error: null,
      permissionError: {
        code: code || 'RECEIVING_NOT_ALLOWED',
        message: messageParts.join(': ') || errorMessage
      }
    };
  }
}

/**
 * Cancel purchase order with permission validation
 */
export async function cancelPurchaseOrderWithPermission(
  id: string,
  cancellationReason?: string
): Promise<PermissionAwareResponse<PurchaseOrder>> {
  try {
    // Get current purchase order for permission validation
    const currentResult = await getPurchaseOrder(id);
    if (currentResult.error || !currentResult.data) {
      return {
        data: null,
        error: currentResult.error || new Error('Purchase order not found')
      };
    }

    const purchaseOrder = currentResult.data;
    
    const result = await withCancellationPermission(
      purchaseOrder,
      () => updatePurchaseOrder(id, { 
        status: 'cancelled' as PurchaseOrderStatus,
        // Add cancellation reason if supported in future
      })
    );
    
    return {
      data: result.data,
      error: result.error
    };
  } catch (permissionError) {
    const errorMessage = permissionError instanceof Error ? permissionError.message : 'Permission denied';
    const [code, ...messageParts] = errorMessage.split(': ');
    
    return {
      data: null,
      error: null,
      permissionError: {
        code: code || 'CANCELLATION_NOT_ALLOWED',
        message: messageParts.join(': ') || errorMessage
      }
    };
  }
}

/**
 * Get purchase orders with view permission validation
 */
export async function getPurchaseOrdersWithPermission(
  limit?: number,
  offset?: number
): Promise<PermissionAwareResponse<PurchaseOrder[]>> {
  try {
    const result = await withPurchaseOrderPermission(
      'view',
      () => getPurchaseOrders(limit, offset)
    );
    
    return {
      data: result.data,
      error: result.error
    };
  } catch (permissionError) {
    const errorMessage = permissionError instanceof Error ? permissionError.message : 'Permission denied';
    const [code, ...messageParts] = errorMessage.split(': ');
    
    return {
      data: null,
      error: null,
      permissionError: {
        code: code || 'VIEW_NOT_ALLOWED',
        message: messageParts.join(': ') || errorMessage
      }
    };
  }
}

/**
 * Get single purchase order with view permission validation
 */
export async function getPurchaseOrderWithPermission(
  id: string
): Promise<PermissionAwareResponse<PurchaseOrder>> {
  try {
    const result = await withPurchaseOrderPermission(
      'view',
      () => getPurchaseOrder(id)
    );
    
    return {
      data: result.data,
      error: result.error
    };
  } catch (permissionError) {
    const errorMessage = permissionError instanceof Error ? permissionError.message : 'Permission denied';
    const [code, ...messageParts] = errorMessage.split(': ');
    
    return {
      data: null,
      error: null,
      permissionError: {
        code: code || 'VIEW_NOT_ALLOWED',
        message: messageParts.join(': ') || errorMessage
      }
    };
  }
}

/**
 * Check if user can perform a specific action on a purchase order
 */
export function canPerformPurchaseOrderAction(
  action: 'create' | 'view' | 'edit' | 'approve' | 'receive' | 'cancel',
  purchaseOrder?: PurchaseOrder,
  amount?: number
): { allowed: boolean; reason?: string } {
  const permissionCheck = checkPurchaseOrderPermissionWithLogging(
    action,
    purchaseOrder,
    amount
  );
  
  return {
    allowed: permissionCheck.allowed,
    reason: permissionCheck.error?.message
  };
}

/**
 * Get user's purchase order action permissions for a specific PO
 */
export function getUserPurchaseOrderActions(purchaseOrder: PurchaseOrder): {
  canView: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canReceive: boolean;
  canCancel: boolean;
  canViewHistory: boolean;
} {
  return {
    canView: canPerformPurchaseOrderAction('view', purchaseOrder).allowed,
    canEdit: canPerformPurchaseOrderAction('edit', purchaseOrder).allowed,
    canApprove: canPerformPurchaseOrderAction('approve', purchaseOrder, purchaseOrder.total).allowed,
    canReceive: canPerformPurchaseOrderAction('receive', purchaseOrder).allowed,
    canCancel: canPerformPurchaseOrderAction('cancel', purchaseOrder).allowed,
    canViewHistory: checkPurchaseOrderPermissionWithLogging('view_history', purchaseOrder).allowed
  };
}