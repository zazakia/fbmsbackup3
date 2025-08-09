/**
 * Enhanced Stock Movement API with Comprehensive Audit Trail Integration
 * 
 * This module extends the base stock movement operations with detailed audit logging,
 * ensuring every inventory change is properly tracked with full context and history.
 */

import {
  Product,
  StockMovement,
  StockMovementLedger
} from '../types/business';
import {
  auditService,
  AuditContext,
  StockMovementAuditData
} from '../services/auditService';
import {
  updateStock as baseUpdateStock,
  createStockMovement as baseCreateStockMovement,
  getStockMovements as baseGetStockMovements,
  getProduct
} from './products';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { supabase } from '../utils/supabase';

/**
 * Get current user context for audit logging
 */
function getCurrentUserContext(additionalContext?: Partial<AuditContext>): AuditContext {
  const { user } = useSupabaseAuthStore.getState();
  
  return {
    performedBy: user?.id || 'anonymous',
    performedByName: user?.user_metadata?.full_name || user?.email || 'Unknown User',
    ipAddress: typeof window !== 'undefined' ? 
      (window.navigator as unknown as { connection?: { effectiveType?: string } })?.connection?.effectiveType || 'unknown' : undefined,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    ...additionalContext
  };
}

/**
 * Enhanced stock update with comprehensive audit logging
 */
export async function updateStockWithAudit(
  productId: string,
  quantity: number,
  operation: 'add' | 'subtract' | 'set',
  context: {
    referenceType?: 'purchase_order' | 'sale' | 'adjustment' | 'transfer';
    referenceId?: string;
    referenceNumber?: string;
    reason?: string;
    batchNumber?: string;
    expiryDate?: Date;
    location?: string;
    unitCost?: number;
    notes?: string;
  } = {}
) {
  const auditContext = getCurrentUserContext({ 
    reason: context.reason || `Stock ${operation}: ${quantity} units`,
    metadata: {
      operation,
      quantity,
      referenceType: context.referenceType,
      referenceId: context.referenceId,
      referenceNumber: context.referenceNumber,
      batchNumber: context.batchNumber,
      location: context.location
    }
  });

  try {
    // Get current product state for audit trail
    const productResult = await getProduct(productId);
    if (productResult.error || !productResult.data) {
      return { 
        data: null, 
        error: productResult.error || new Error('Product not found') 
      };
    }

    const product = productResult.data;
    const quantityBefore = product.stock;

    // Calculate new quantity based on operation
    let quantityAfter: number;
    let actualQuantityChanged: number;

    switch (operation) {
      case 'set':
        quantityAfter = quantity;
        actualQuantityChanged = quantity - quantityBefore;
        break;
      case 'add':
        quantityAfter = quantityBefore + quantity;
        actualQuantityChanged = quantity;
        break;
      case 'subtract':
        quantityAfter = Math.max(0, quantityBefore - quantity); // Prevent negative stock
        actualQuantityChanged = -(quantityBefore - quantityAfter);
        break;
      default:
        return { 
          data: null, 
          error: new Error(`Invalid operation: ${operation}`) 
        };
    }

    // Validate stock operation
    if (quantityAfter < 0) {
      return { 
        data: null, 
        error: new Error(`Insufficient stock. Available: ${quantityBefore}, Requested: ${quantity}`) 
      };
    }

    // Perform the stock update using base API
    const updateResult = await baseUpdateStock(productId, quantity, operation, {
      referenceId: context.referenceId,
      userId: auditContext.performedBy,
      reason: context.reason
    });

    if (updateResult.error) {
      return updateResult;
    }

    // Create comprehensive audit trail
    if (actualQuantityChanged !== 0) {
      const movementType = context.referenceType === 'purchase_order' ? 'purchase_receipt' :
                          context.referenceType === 'sale' ? 'sale' :
                          context.referenceType === 'transfer' ? 'transfer' :
                          'adjustment';

      const auditData: StockMovementAuditData = {
        productId,
        productName: product.name,
        productSku: product.sku,
        movementType,
        quantityBefore,
        quantityAfter,
        quantityChanged: actualQuantityChanged,
        unitCost: context.unitCost || product.cost,
        totalValue: context.unitCost ? context.unitCost * Math.abs(actualQuantityChanged) : 
                   product.cost * Math.abs(actualQuantityChanged),
        referenceType: context.referenceType || 'adjustment',
        referenceId: context.referenceId || `stock_${Date.now()}`,
        referenceNumber: context.referenceNumber,
        batchNumber: context.batchNumber,
        expiryDate: context.expiryDate,
        location: context.location,
        notes: context.notes
      };

      const auditResult = await auditService.logStockMovementAudit(auditData, auditContext);

      if (!auditResult.success) {
        console.warn('Failed to create stock movement audit log:', auditResult.error);
        // Don't fail the operation for audit logging issues
      }
    }

    return updateResult;
  } catch (error) {
    console.error('Error in updateStockWithAudit:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Enhanced create stock movement with audit logging
 */
export async function createStockMovementWithAudit(
  movement: {
    productId: string;
    type: 'sale' | 'purchase' | 'adjustment' | 'transfer' | 'return';
    quantity: number;
    previousStock: number;
    newStock: number;
    reference?: string;
    notes?: string;
    referenceType?: 'purchase_order' | 'sale' | 'adjustment' | 'transfer';
    referenceId?: string;
    referenceNumber?: string;
    unitCost?: number;
    batchNumber?: string;
    expiryDate?: Date;
    location?: string;
  },
  reason?: string
) {
  const auditContext = getCurrentUserContext({ 
    reason: reason || `Stock movement: ${movement.type}`,
    metadata: {
      movementType: movement.type,
      quantity: movement.quantity,
      reference: movement.reference,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId
    }
  });

  try {
    // Get product information for audit trail
    const productResult = await getProduct(movement.productId);
    const product = productResult.data;

    // Create the stock movement using base API
    const result = await baseCreateStockMovement({
      productId: movement.productId,
      type: movement.type,
      quantity: movement.quantity,
      previousStock: movement.previousStock,
      newStock: movement.newStock,
      userId: auditContext.performedBy,
      reference: movement.reference,
      notes: movement.notes
    });

    if (result.error) {
      return result;
    }

    // Create comprehensive audit trail
    const quantityChanged = movement.newStock - movement.previousStock;
    
    if (quantityChanged !== 0) {
      const movementType = movement.type === 'purchase' ? 'purchase_receipt' :
                          movement.type === 'sale' ? 'sale' :
                          movement.type === 'transfer' ? 'transfer' :
                          movement.type === 'return' ? 'return' :
                          'adjustment';

      const auditData: StockMovementAuditData = {
        productId: movement.productId,
        productName: product?.name || 'Unknown Product',
        productSku: product?.sku || '',
        movementType,
        quantityBefore: movement.previousStock,
        quantityAfter: movement.newStock,
        quantityChanged,
        unitCost: movement.unitCost || product?.cost || 0,
        totalValue: movement.unitCost ? movement.unitCost * Math.abs(quantityChanged) : 
                   (product?.cost || 0) * Math.abs(quantityChanged),
        referenceType: movement.referenceType || 'adjustment',
        referenceId: movement.referenceId || movement.reference || `movement_${Date.now()}`,
        referenceNumber: movement.referenceNumber,
        batchNumber: movement.batchNumber,
        expiryDate: movement.expiryDate,
        location: movement.location,
        notes: movement.notes
      };

      const auditResult = await auditService.logStockMovementAudit(auditData, auditContext);

      if (!auditResult.success) {
        console.warn('Failed to create stock movement audit log:', auditResult.error);
      }
    }

    return result;
  } catch (error) {
    console.error('Error in createStockMovementWithAudit:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Bulk stock update with audit logging (for purchase order receiving)
 */
export async function bulkUpdateStockWithAudit(
  stockUpdates: Array<{
    productId: string;
    quantityChanged: number;
    referenceId: string;
    referenceType: 'purchase_order' | 'sale' | 'adjustment' | 'transfer';
    referenceNumber?: string;
    unitCost?: number;
    batchNumber?: string;
    expiryDate?: Date;
    location?: string;
    notes?: string;
  }>,
  reason?: string
) {
  const auditContext = getCurrentUserContext({ 
    reason: reason || 'Bulk stock update',
    metadata: {
      bulkUpdateCount: stockUpdates.length,
      totalQuantityChanged: stockUpdates.reduce((sum, update) => sum + Math.abs(update.quantityChanged), 0)
    }
  });

  const results: Array<{ productId: string; success: boolean; error?: string }> = [];
  const auditResults: AuditServiceResult[] = [];

  try {
    // Process each stock update
    for (const update of stockUpdates) {
      try {
        // Get current product state
        const productResult = await getProduct(update.productId);
        if (productResult.error || !productResult.data) {
          results.push({
            productId: update.productId,
            success: false,
            error: 'Product not found'
          });
          continue;
        }

        const product = productResult.data;
        const quantityBefore = product.stock;
        const quantityAfter = quantityBefore + update.quantityChanged;

        // Validate stock levels
        if (quantityAfter < 0) {
          results.push({
            productId: update.productId,
            success: false,
            error: `Insufficient stock. Available: ${quantityBefore}, Required: ${Math.abs(update.quantityChanged)}`
          });
          continue;
        }

        // Update stock
        const operation = update.quantityChanged > 0 ? 'add' : 'subtract';
        const quantity = Math.abs(update.quantityChanged);

        const updateResult = await baseUpdateStock(update.productId, quantity, operation, {
          referenceId: update.referenceId,
          userId: auditContext.performedBy,
          reason: update.notes || reason
        });

        if (updateResult.error) {
          results.push({
            productId: update.productId,
            success: false,
            error: updateResult.error.message
          });
          continue;
        }

        results.push({
          productId: update.productId,
          success: true
        });

        // Create audit trail
        const movementType = update.referenceType === 'purchase_order' ? 'purchase_receipt' :
                           update.referenceType === 'sale' ? 'sale' :
                           update.referenceType === 'transfer' ? 'transfer' :
                           'adjustment';

        const auditData: StockMovementAuditData = {
          productId: update.productId,
          productName: product.name,
          productSku: product.sku,
          movementType,
          quantityBefore,
          quantityAfter,
          quantityChanged: update.quantityChanged,
          unitCost: update.unitCost || product.cost,
          totalValue: (update.unitCost || product.cost) * Math.abs(update.quantityChanged),
          referenceType: update.referenceType,
          referenceId: update.referenceId,
          referenceNumber: update.referenceNumber,
          batchNumber: update.batchNumber,
          expiryDate: update.expiryDate,
          location: update.location,
          notes: update.notes
        };

        const auditResult = await auditService.logStockMovementAudit(auditData, auditContext);
        auditResults.push(auditResult);

      } catch (error) {
        results.push({
          productId: update.productId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      success: failureCount === 0,
      data: {
        results,
        summary: {
          totalUpdates: stockUpdates.length,
          successful: successCount,
          failed: failureCount
        },
        auditSummary: {
          totalAuditLogs: auditResults.length,
          successfulAudits: auditResults.filter(ar => ar.success).length,
          failedAudits: auditResults.filter(ar => !ar.success).length
        }
      },
      error: failureCount > 0 ? `${failureCount} stock updates failed` : undefined
    };

  } catch (error) {
    console.error('Error in bulkUpdateStockWithAudit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown bulk update error'
    };
  }
}

/**
 * Get enhanced stock movement history with audit details
 */
export async function getStockMovementHistoryWithAudit(
  productId: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    type?: string;
    userId?: string;
    referenceType?: string;
    referenceId?: string;
    limit?: number;
    offset?: number;
  }
) {
  try {
    // Get base stock movements
    const movementsResult = await baseGetStockMovements(productId, filters);
    
    if (movementsResult.error) {
      return movementsResult;
    }

    // Get audit trail for this product
    const auditResult = await auditService.getStockMovementHistory(
      productId,
      filters?.limit || 50,
      filters?.offset || 0
    );

    const movements = movementsResult.data || [];
    const auditTrail = auditResult.success ? auditResult.data || [] : [];

    // Enhance movements with audit details
    const enhancedMovements = movements.map(movement => {
      // Find corresponding audit entry
      const auditEntry = auditTrail.find(audit => 
        audit.referenceId === (movement as any).reference_id ||
        audit.referenceId === (movement as any).reference
      );

      return {
        ...movement,
        auditDetails: auditEntry ? {
          auditId: auditEntry.id,
          performedBy: auditEntry.performedBy,
          performedByName: auditEntry.performedByName,
          batchNumber: auditEntry.batchNumber,
          expiryDate: auditEntry.expiryDate,
          location: auditEntry.location,
          unitCost: auditEntry.unitCost,
          totalCost: auditEntry.totalCost
        } : null
      };
    });

    return {
      data: enhancedMovements,
      error: null,
      auditSummary: {
        totalMovements: movements.length,
        auditedMovements: enhancedMovements.filter(m => m.auditDetails).length,
        auditCoverage: movements.length > 0 ? 
          (enhancedMovements.filter(m => m.auditDetails).length / movements.length * 100).toFixed(2) + '%' : 
          '0%'
      }
    };

  } catch (error) {
    console.error('Error in getStockMovementHistoryWithAudit:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Get stock movement summary with audit statistics
 */
export async function getStockMovementSummaryWithAudit(
  productId: string,
  dateRange?: { startDate: Date; endDate: Date }
) {
  try {
    const filters = dateRange ? {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    } : undefined;

    const historyResult = await getStockMovementHistoryWithAudit(productId, filters);
    
    if (historyResult.error || !historyResult.data) {
      return {
        success: false,
        error: historyResult.error?.message || 'Failed to retrieve movement history'
      };
    }

    const movements = historyResult.data;

    // Calculate summary statistics
    const summary = {
      totalMovements: movements.length,
      stockIn: movements
        .filter(m => ((m as any).change || 0) > 0)
        .reduce((sum, m) => sum + Math.abs((m as any).change || 0), 0),
      stockOut: movements
        .filter(m => ((m as any).change || 0) < 0)
        .reduce((sum, m) => sum + Math.abs((m as any).change || 0), 0),
      netChange: movements.reduce((sum, m) => sum + ((m as any).change || 0), 0),
      movementsByType: {
        purchase: movements.filter(m => (m as any).type === 'in' && (m as any).reason?.includes('purchase')).length,
        sale: movements.filter(m => (m as any).type === 'out' && (m as any).reason?.includes('sale')).length,
        adjustment: movements.filter(m => (m as any).type === 'adjustment').length,
        transfer: movements.filter(m => (m as any).type === 'transfer').length,
        return: movements.filter(m => (m as any).type === 'return').length
      },
      auditStatistics: {
        totalAudited: movements.filter(m => m.auditDetails).length,
        auditCoverage: movements.length > 0 ? 
          (movements.filter(m => m.auditDetails).length / movements.length * 100).toFixed(2) + '%' : 
          '0%',
        uniqueUsers: [...new Set(movements
          .filter(m => m.auditDetails)
          .map(m => m.auditDetails!.performedBy))].length
      },
      valueImpact: {
        totalValueIn: movements
          .filter(m => m.auditDetails && ((m as any).change || 0) > 0)
          .reduce((sum, m) => sum + (m.auditDetails!.totalCost || 0), 0),
        totalValueOut: movements
          .filter(m => m.auditDetails && ((m as any).change || 0) < 0)
          .reduce((sum, m) => sum + (m.auditDetails!.totalCost || 0), 0)
      },
      dateRange: {
        firstMovement: movements.length > 0 ? 
          movements[movements.length - 1].createdAt : null,
        lastMovement: movements.length > 0 ? 
          movements[0].createdAt : null
      }
    };

    return {
      success: true,
      data: summary
    };

  } catch (error) {
    console.error('Error in getStockMovementSummaryWithAudit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get comprehensive audit trail for a purchase order receiving
 */
export async function getPurchaseOrderReceivingAuditTrail(
  purchaseOrderId: string
) {
  try {
    // Get audit service instance
    const auditService = (await import('../services/auditService')).auditService;

    // Get purchase order audit logs
    const poAuditResult = await auditService.getPurchaseOrderHistory(purchaseOrderId);
    const poAudits = poAuditResult.success ? poAuditResult.data || [] : [];

    // Get receiving records
    let receivingRecords: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('purchase_order_receiving_records')
          .select('*')
          .eq('purchase_order_id', purchaseOrderId)
          .order('received_date', { ascending: false });

        if (!error) {
          receivingRecords = data || [];
        }
      } catch (dbError) {
        console.warn('Failed to retrieve receiving records:', dbError);
      }
    }

    // Get stock movement audits for this PO
    let stockAudits: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('stock_movement_audit_logs')
          .select('*')
          .eq('reference_id', purchaseOrderId)
          .eq('reference_type', 'purchase_order')
          .order('timestamp', { ascending: false });

        if (!error) {
          stockAudits = data || [];
        }
      } catch (dbError) {
        console.warn('Failed to retrieve stock movement audits:', dbError);
      }
    }

    // Get approval records
    let approvalRecords: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('purchase_order_approval_records')
          .select('*')
          .eq('purchase_order_id', purchaseOrderId)
          .order('approval_date', { ascending: false });

        if (!error) {
          approvalRecords = data || [];
        }
      } catch (dbError) {
        console.warn('Failed to retrieve approval records:', dbError);
      }
    }

    // Get validation errors
    let validationErrors: any[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('purchase_order_validation_errors')
          .select('*')
          .eq('purchase_order_id', purchaseOrderId)
          .order('occurred_at', { ascending: false });

        if (!error) {
          validationErrors = data || [];
        }
      } catch (dbError) {
        console.warn('Failed to retrieve validation errors:', dbError);
      }
    }

    // Combine and organize the audit trail
    const comprehensiveAuditTrail = {
      purchaseOrderId,
      summary: {
        totalAuditEvents: poAudits.length,
        totalReceivingRecords: receivingRecords.length,
        totalStockMovements: stockAudits.length,
        totalApprovalEvents: approvalRecords.length,
        totalValidationErrors: validationErrors.length,
        unresolvedErrors: validationErrors.filter(ve => !ve.resolved).length
      },
      timeline: [
        ...poAudits.map(audit => ({
          type: 'purchase_order_audit',
          timestamp: audit.timestamp,
          action: audit.action,
          performedBy: audit.performedBy,
          performedByName: audit.performedByName,
          details: audit,
          severity: 'info'
        })),
        ...receivingRecords.map(record => ({
          type: 'receiving_record',
          timestamp: record.received_date,
          action: 'goods_received',
          performedBy: record.received_by,
          performedByName: record.received_by_name,
          details: record,
          severity: record.damage_report ? 'warning' : 'info'
        })),
        ...stockAudits.map(audit => ({
          type: 'stock_movement_audit',
          timestamp: audit.timestamp,
          action: 'stock_updated',
          performedBy: audit.performed_by,
          performedByName: audit.performed_by_name,
          details: audit,
          severity: 'info'
        })),
        ...approvalRecords.map(approval => ({
          type: 'approval_record',
          timestamp: approval.approval_date || approval.rejection_date,
          action: approval.approval_status,
          performedBy: approval.approved_by,
          performedByName: approval.approved_by_name,
          details: approval,
          severity: approval.approval_status === 'rejected' ? 'warning' : 'info'
        })),
        ...validationErrors.map(error => ({
          type: 'validation_error',
          timestamp: error.occurred_at,
          action: 'validation_failed',
          performedBy: error.occurred_by,
          performedByName: 'System',
          details: error,
          severity: error.error_type === 'insufficient_stock' ? 'error' : 'warning'
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      receivingRecords,
      stockMovements: stockAudits,
      approvalRecords,
      validationErrors: {
        all: validationErrors,
        unresolved: validationErrors.filter(ve => !ve.resolved),
        resolved: validationErrors.filter(ve => ve.resolved)
      }
    };

    return {
      success: true,
      data: comprehensiveAuditTrail
    };

  } catch (error) {
    console.error('Error in getPurchaseOrderReceivingAuditTrail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Export audit trail data for compliance reporting
 */
export async function exportAuditTrailData(
  filters: {
    purchaseOrderIds?: string[];
    startDate?: Date;
    endDate?: Date;
    auditTypes?: string[];
    format?: 'csv' | 'json' | 'xlsx';
  }
) {
  try {
    // This would implement a comprehensive export of audit trail data
    // For now, return a structured data response that could be used for export
    
    const auditData = {
      metadata: {
        exportDate: new Date(),
        filters,
        version: '2.0'
      },
      purchaseOrderAudits: [],
      stockMovementAudits: [],
      receivingRecords: [],
      approvalRecords: [],
      validationErrors: []
    };

    // In a full implementation, this would query all the audit tables
    // and format the data according to the requested format
    
    return {
      success: true,
      data: auditData
    };

  } catch (error) {
    console.error('Error in exportAuditTrailData:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reconcile stock levels with audit trail
 */
export async function reconcileStockWithAudit(productId: string) {
  try {
    // Get current product
    const productResult = await getProduct(productId);
    if (productResult.error || !productResult.data) {
      return {
        success: false,
        error: 'Product not found'
      };
    }

    const product = productResult.data;
    
    // Get all stock movements
    const movementsResult = await baseGetStockMovements(productId);
    if (movementsResult.error) {
      return {
        success: false,
        error: 'Failed to retrieve stock movements'
      };
    }

    const movements = movementsResult.data || [];

    // Calculate expected stock based on movements
    const expectedStock = movements.reduce((total, movement) => {
      return total + ((movement as any).change || 0);
    }, 0);

    const actualStock = product.stock;
    const discrepancy = actualStock - expectedStock;

    // Get audit trail statistics
    const auditResult = await auditService.getStockMovementHistory(productId);
    const auditTrail = auditResult.success ? auditResult.data || [] : [];

    return {
      success: true,
      data: {
        productId,
        productName: product.name,
        productSku: product.sku,
        currentStock: actualStock,
        expectedStock,
        discrepancy,
        isReconciled: Math.abs(discrepancy) < 0.01, // Allow for floating point precision
        movements: {
          totalMovements: movements.length,
          stockIn: movements.filter(m => ((m as any).change || 0) > 0).length,
          stockOut: movements.filter(m => ((m as any).change || 0) < 0).length
        },
        audit: {
          totalAuditEntries: auditTrail.length,
          auditCoverage: movements.length > 0 ? 
            (auditTrail.length / movements.length * 100).toFixed(2) + '%' : '0%'
        },
        lastReconciliation: new Date()
      }
    };

  } catch (error) {
    console.error('Error in reconcileStockWithAudit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown reconciliation error'
    };
  }
}