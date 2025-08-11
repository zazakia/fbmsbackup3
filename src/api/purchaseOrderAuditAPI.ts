/**
 * Enhanced Purchase Order API with Comprehensive Audit Trail Integration
 * 
 * This module extends the base purchase order operations with audit logging,
 * ensuring every purchase order operation is properly tracked and logged.
 */

import {
  PurchaseOrder,
  PurchaseOrderItem,
  EnhancedPurchaseOrder,
  PartialReceiptItem,
  PurchaseOrderStatus,
  PurchaseOrderAuditAction,
  EnhancedPurchaseOrderStatus
} from '../types/business';
import { 
  auditService, 
  AuditContext
} from '../services/auditService';
import {
  createPurchaseOrder as basePOCreate,
  updatePurchaseOrder as basePOUpdate,
  deletePurchaseOrder as basePODelete,
  receivePurchaseOrder as basePOReceive,
  getPurchaseOrder as basePOGet
} from './purchases';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

/**
 * Get current user context for audit logging
 */
function getCurrentUserContext(additionalContext?: Partial<AuditContext>): AuditContext {
  const { user } = useSupabaseAuthStore.getState();
  
  return {
    performedBy: user?.id || 'anonymous',
    performedByName: user?.user_metadata?.full_name || user?.email || 'Unknown User',
    ipAddress: undefined, // IP address not available in browser environment
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    ...additionalContext
  };
}

/**
 * Enhanced create purchase order with audit logging
 */
export async function createPurchaseOrderWithAudit(
  purchaseOrder: Omit<PurchaseOrder, 'id' | 'createdAt'>,
  reason?: string
) {
  const context = getCurrentUserContext({ reason: reason || 'Purchase order created' });
  
  try {
    // Create the purchase order using base API
    const result = await basePOCreate(purchaseOrder);
    
    if (result.error || !result.data) {
      return result;
    }

    // Log creation audit
    const auditResult = await auditService.logPurchaseOrderAudit(
      result.data.id,
      result.data.poNumber,
      PurchaseOrderAuditAction.CREATED,
      context,
      {},
      {
        supplierId: result.data.supplierId,
        supplierName: result.data.supplierName,
        itemCount: result.data.items.length,
        total: result.data.total,
        status: result.data.status
      }
    );

    if (!auditResult.success) {
      console.warn('Failed to create audit log for PO creation:', auditResult.error);
    }

    return result;
  } catch (error) {
    console.error('Error in createPurchaseOrderWithAudit:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Enhanced update purchase order with audit logging
 */
export async function updatePurchaseOrderWithAudit(
  id: string,
  updates: Partial<Omit<PurchaseOrder, 'id' | 'createdAt'>>,
  reason?: string
) {
  const context = getCurrentUserContext({ reason: reason || 'Purchase order updated' });

  try {
    // Get current state for audit comparison
    const currentResult = await basePOGet(id);
    if (currentResult.error || !currentResult.data) {
      return { data: null, error: new Error('Purchase order not found') };
    }

    const oldValues = {
      status: currentResult.data.status,
      supplierId: currentResult.data.supplierId,
      supplierName: currentResult.data.supplierName,
      total: currentResult.data.total,
      expectedDate: currentResult.data.expectedDate,
      itemCount: currentResult.data.items.length
    };

    // Update the purchase order using base API
    const result = await basePOUpdate(id, updates);
    
    if (result.error || !result.data) {
      return result;
    }

    const newValues = {
      status: result.data.status,
      supplierId: result.data.supplierId,
      supplierName: result.data.supplierName,
      total: result.data.total,
      expectedDate: result.data.expectedDate,
      itemCount: result.data.items.length
    };

    // Determine audit action based on what changed
    let auditAction = PurchaseOrderAuditAction.UPDATED;
    if (oldValues.status !== newValues.status) {
      auditAction = PurchaseOrderAuditAction.STATUS_CHANGED;
    }

    // Log update audit
    const auditResult = await auditService.logPurchaseOrderAudit(
      result.data.id,
      result.data.poNumber,
      auditAction,
      context,
      oldValues,
      newValues
    );

    if (!auditResult.success) {
      console.warn('Failed to create audit log for PO update:', auditResult.error);
    }

    return result;
  } catch (error) {
    console.error('Error in updatePurchaseOrderWithAudit:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Enhanced purchase order status transition with audit logging
 */
export async function changePurchaseOrderStatus(
  id: string,
  newStatus: PurchaseOrderStatus | EnhancedPurchaseOrderStatus,
  reason?: string
) {
  const context = getCurrentUserContext({ reason: reason || `Status changed to ${newStatus}` });

  try {
    // Get current state
    const currentResult = await basePOGet(id);
    if (currentResult.error || !currentResult.data) {
      return { data: null, error: new Error('Purchase order not found') };
    }

    const oldStatus = currentResult.data.status;
    
    // Update status
    const result = await updatePurchaseOrderWithAudit(id, { status: newStatus }, reason);
    
    if (result.error || !result.data) {
      return result;
    }

    // Log specific status transition audit
    const auditResult = await auditService.logStatusTransition(
      result.data,
      oldStatus,
      newStatus,
      context
    );

    if (!auditResult.success) {
      console.warn('Failed to create status transition audit log:', auditResult.error);
    }

    return result;
  } catch (error) {
    console.error('Error in changePurchaseOrderStatus:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Enhanced receive purchase order with comprehensive audit logging
 */
export async function receivePurchaseOrderWithAudit(
  id: string,
  receivedItems?: PurchaseOrderItem[],
  receivingContext?: {
    receivedBy?: string;
    reason?: string;
    timestamp?: Date;
    notes?: string;
  }
) {
  const context = getCurrentUserContext({
    reason: receivingContext?.reason || 'Purchase order items received',
    metadata: {
      receivingTimestamp: (receivingContext?.timestamp || new Date()).toISOString(),
      notes: receivingContext?.notes
    }
  });

  try {
    // Get current state before receiving
    const currentResult = await basePOGet(id);
    if (currentResult.error || !currentResult.data) {
      return { data: null, error: new Error('Purchase order not found') };
    }

    const purchaseOrder = currentResult.data;

    // Convert received items to partial receipt format for audit logging
    const partialReceipts: PartialReceiptItem[] = [];
    
    if (receivedItems && Array.isArray(receivedItems)) {
      for (const receivedItem of receivedItems) {
        // Find the corresponding original item
        const originalItem = purchaseOrder.items.find(
          item => (item.productId || item.id) === (receivedItem.productId || receivedItem.id)
        );
        
        if (originalItem) {
          const previouslyReceived = (originalItem as any).receivedQuantity || 0;
          partialReceipts.push({
            productId: receivedItem.productId || receivedItem.id!,
            orderedQuantity: originalItem.quantity,
            receivedQuantity: receivedItem.quantity,
            previouslyReceived,
            totalReceived: previouslyReceived + receivedItem.quantity,
            condition: 'good' // Default condition, could be enhanced
          });
        }
      }
    } else {
      // Auto-receive mode - create partial receipts for all items
      for (const item of purchaseOrder.items) {
        const previouslyReceived = (item as any).receivedQuantity || 0;
        const remainingQuantity = item.quantity - previouslyReceived;
        
        if (remainingQuantity > 0) {
          partialReceipts.push({
            productId: item.productId || item.id!,
            orderedQuantity: item.quantity,
            receivedQuantity: remainingQuantity,
            previouslyReceived,
            totalReceived: item.quantity,
            condition: 'good'
          });
        }
      }
    }

    // Perform the receiving operation using base API
    const result = await basePOReceive(id, receivedItems, {
      receivedBy: context.performedBy,
      reason: context.reason,
      timestamp: receivingContext?.timestamp
    });

    if (result.error || !result.data) {
      return result;
    }

    // Log comprehensive receiving audit trail
    const auditResults = await auditService.logReceivingActivity(
      purchaseOrder,
      partialReceipts,
      context
    );

    // Check for audit logging failures
    const failedAudits = auditResults.filter(ar => !ar.success);
    if (failedAudits.length > 0) {
      console.warn('Some audit logs failed to create:', failedAudits.map(fa => fa.error));
    }

    return result;
  } catch (error) {
    console.error('Error in receivePurchaseOrderWithAudit:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Enhanced delete purchase order with audit logging
 */
export async function deletePurchaseOrderWithAudit(
  id: string,
  reason?: string
) {
  const context = getCurrentUserContext({ reason: reason || 'Purchase order deleted' });

  try {
    // Get current state for audit logging
    const currentResult = await basePOGet(id);
    if (currentResult.error || !currentResult.data) {
      return { data: null, error: new Error('Purchase order not found') };
    }

    const purchaseOrder = currentResult.data;

    // Log deletion audit before actually deleting
    const auditResult = await auditService.logPurchaseOrderAudit(
      purchaseOrder.id,
      purchaseOrder.poNumber,
      PurchaseOrderAuditAction.DELETED,
      context,
      {
        status: purchaseOrder.status,
        supplierId: purchaseOrder.supplierId,
        supplierName: purchaseOrder.supplierName,
        total: purchaseOrder.total,
        itemCount: purchaseOrder.items.length
      },
      { deleted: true }
    );

    if (!auditResult.success) {
      console.warn('Failed to create audit log for PO deletion:', auditResult.error);
    }

    // Perform the deletion using base API
    const result = await basePODelete(id);
    
    return result;
  } catch (error) {
    console.error('Error in deletePurchaseOrderWithAudit:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Approve purchase order with audit logging
 */
export async function approvePurchaseOrder(
  id: string,
  approvalNotes?: string
) {
  const context = getCurrentUserContext({ 
    reason: `Purchase order approved${approvalNotes ? ': ' + approvalNotes : ''}`,
    metadata: { approvalNotes }
  });

  try {
    // Get current state
    const currentResult = await basePOGet(id);
    if (currentResult.error || !currentResult.data) {
      return { data: null, error: new Error('Purchase order not found') };
    }

    const oldStatus = currentResult.data.status;

    // Update status to approved
    const result = await basePOUpdate(id, { status: 'sent' }); // Assuming 'sent' means approved
    
    if (result.error || !result.data) {
      return result;
    }

    // Log approval audit
    const auditResult = await auditService.logPurchaseOrderAudit(
      result.data.id,
      result.data.poNumber,
      PurchaseOrderAuditAction.APPROVED,
      context,
      { status: oldStatus },
      { status: 'sent', approvalTimestamp: new Date().toISOString() }
    );

    if (!auditResult.success) {
      console.warn('Failed to create audit log for PO approval:', auditResult.error);
    }

    return result;
  } catch (error) {
    console.error('Error in approvePurchaseOrder:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Cancel purchase order with audit logging
 */
export async function cancelPurchaseOrder(
  id: string,
  cancellationReason: string
) {
  const context = getCurrentUserContext({ 
    reason: `Purchase order cancelled: ${cancellationReason}`,
    metadata: { cancellationReason }
  });

  try {
    // Get current state
    const currentResult = await basePOGet(id);
    if (currentResult.error || !currentResult.data) {
      return { data: null, error: new Error('Purchase order not found') };
    }

    const oldStatus = currentResult.data.status;

    // Update status to cancelled
    const result = await basePOUpdate(id, { status: 'cancelled' });
    
    if (result.error || !result.data) {
      return result;
    }

    // Log cancellation audit
    const auditResult = await auditService.logPurchaseOrderAudit(
      result.data.id,
      result.data.poNumber,
      PurchaseOrderAuditAction.CANCELLED,
      context,
      { status: oldStatus },
      { 
        status: 'cancelled',
        cancellationTimestamp: new Date().toISOString(),
        cancellationReason
      }
    );

    if (!auditResult.success) {
      console.warn('Failed to create audit log for PO cancellation:', auditResult.error);
    }

    return result;
  } catch (error) {
    console.error('Error in cancelPurchaseOrder:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Get purchase order with audit history
 */
export async function getPurchaseOrderWithAuditHistory(id: string): Promise<{
  data: EnhancedPurchaseOrder | null;
  error: unknown;
}> {
  try {
    // Get base purchase order
    const poResult = await basePOGet(id);
    if (poResult.error || !poResult.data) {
      return { data: null, error: poResult.error || new Error('Purchase order not found') };
    }

    // Get audit history
    const auditResult = await auditService.getPurchaseOrderHistory(id);
    const auditHistory = auditResult.success ? auditResult.data || [] : [];

    // Create enhanced purchase order with audit data
    const enhancedPO: EnhancedPurchaseOrder = {
      ...poResult.data,
      statusHistory: auditHistory
        .filter(log => log.action === PurchaseOrderAuditAction.STATUS_CHANGED)
        .map(log => ({
          id: log.id,
          fromStatus: (log.oldValues?.status as PurchaseOrderStatus) || 'draft',
          toStatus: (log.newValues?.status as PurchaseOrderStatus) || 'draft',
          timestamp: log.timestamp,
          performedBy: log.performedBy,
          reason: log.reason
        })),
      receivingHistory: auditHistory
        .filter(log => [
          PurchaseOrderAuditAction.RECEIVED,
          PurchaseOrderAuditAction.PARTIALLY_RECEIVED
        ].includes(log.action))
        .map(log => ({
          id: log.id,
          receivedDate: log.timestamp,
          receivedBy: log.performedBy,
          items: (log.newValues?.receipts as PartialReceiptItem[]) || [],
          notes: log.reason
        })),
      validationErrors: [], // Would be populated by validation service
      approvalHistory: auditHistory
        .filter(log => [
          PurchaseOrderAuditAction.APPROVED,
          PurchaseOrderAuditAction.REJECTED
        ].includes(log.action))
        .map(log => ({
          id: log.id,
          approvalStatus: log.action === PurchaseOrderAuditAction.APPROVED ? 'approved' as const : 'rejected' as const,
          approvedBy: log.performedBy,
          approvedByName: log.performedByName,
          approvalDate: log.timestamp,
          notes: log.reason || '',
          metadata: log.metadata || {}
        })),
      totalReceived: poResult.data.items.reduce((total, item) => 
        total + ((item as any).receivedQuantity || 0), 0
      ),
      percentComplete: (poResult.data.items.reduce((total, item) => 
        total + ((item as any).receivedQuantity || 0), 0
      ) / poResult.data.items.reduce((total, item) => total + item.quantity, 0)) * 100
    };

    return { data: enhancedPO, error: null };
  } catch (error) {
    console.error('Error in getPurchaseOrderWithAuditHistory:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Get audit summary for a purchase order
 */
export async function getPurchaseOrderAuditSummary(id: string) {
  try {
    const auditResult = await auditService.getPurchaseOrderHistory(id);
    
    if (!auditResult.success || !auditResult.data) {
      return {
        success: false,
        error: auditResult.error || 'Failed to retrieve audit history'
      };
    }

    const logs = auditResult.data;
    
    return {
      success: true,
      data: {
        totalAuditEvents: logs.length,
        createdAt: logs.find(l => l.action === PurchaseOrderAuditAction.CREATED)?.timestamp,
        lastModified: logs[0]?.timestamp, // Most recent first
        statusChanges: logs.filter(l => l.action === PurchaseOrderAuditAction.STATUS_CHANGED).length,
        receivingEvents: logs.filter(l => [
          PurchaseOrderAuditAction.RECEIVED,
          PurchaseOrderAuditAction.PARTIALLY_RECEIVED
        ].includes(l.action)).length,
        approvalEvents: logs.filter(l => [
          PurchaseOrderAuditAction.APPROVED,
          PurchaseOrderAuditAction.REJECTED
        ].includes(l.action)).length,
        uniqueUsers: [...new Set(logs.map(l => l.performedBy))].length,
        recentActivity: logs.slice(0, 5) // Last 5 events
      }
    };
  } catch (error) {
    console.error('Error in getPurchaseOrderAuditSummary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}